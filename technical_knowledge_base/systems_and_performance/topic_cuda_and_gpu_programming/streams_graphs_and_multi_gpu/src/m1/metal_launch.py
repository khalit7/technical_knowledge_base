"""Launch overhead on the Apple M1 Pro GPU through Metal directly (PyObjC), four ways to run the same
N dependent tiny kernels. Metal's equivalents of the CUDA ideas, labelled on the page as contrasts:

  wait_each  : one command buffer per kernel, commit, wait for it       ~ launch + cudaStreamSynchronize each time
  queue      : one command buffer per kernel, commit all, wait for last  ~ async launches on one stream
  one_cb     : one command buffer, one encoder, N dispatches             ~ one submission for many kernels
  icb_replay : N dispatches recorded once in an indirect command buffer,
               replayed with one executeCommandsInBuffer per iteration   ~ instantiate once, cudaGraphLaunch

Per trial: wall time per kernel on the CPU clock around the whole sequence, and for one_cb and
icb_replay the GPU's own start/end timestamps of the command buffer. Writes one JSON line per run.
"""
import json, os, statistics, sys, time
import Metal

SRC = """
#include <metal_stdlib>
using namespace metal;
kernel void k(device float* x [[buffer(0)]], uint i [[thread_position_in_grid]]) {
  x[i] = x[i] * 1.0001f + 0.5f;
}
"""
N, THREADS, TG, TRIALS = 200, 1024, 256, 7

dev = Metal.MTLCreateSystemDefaultDevice()
lib, err = dev.newLibraryWithSource_options_error_(SRC, None, None)
assert lib is not None, err
fn = lib.newFunctionWithName_("k")
pd = Metal.MTLComputePipelineDescriptor.alloc().init()
pd.setComputeFunction_(fn)
pd.setSupportIndirectCommandBuffers_(True)
pso, err = dev.newComputePipelineStateWithDescriptor_options_reflection_error_(pd, 0, None, None)
assert pso is not None, err
q = dev.newCommandQueue()
buf = dev.newBufferWithLength_options_(THREADS * 4, Metal.MTLResourceStorageModeShared)
grid, tgs = Metal.MTLSizeMake(THREADS // TG, 1, 1), Metal.MTLSizeMake(TG, 1, 1)


def encode(enc):
    enc.setComputePipelineState_(pso)
    enc.setBuffer_offset_atIndex_(buf, 0, 0)
    enc.dispatchThreadgroups_threadsPerThreadgroup_(grid, tgs)


def wait_each():
    for _ in range(N):
        cb = q.commandBuffer(); e = cb.computeCommandEncoder(); encode(e); e.endEncoding()
        cb.commit(); cb.waitUntilCompleted()
    return None


def queue():
    cb = None
    for _ in range(N):
        cb = q.commandBuffer(); e = cb.computeCommandEncoder(); encode(e); e.endEncoding(); cb.commit()
    cb.waitUntilCompleted()
    return None


def one_cb():
    t = time.perf_counter()
    cb = q.commandBuffer(); e = cb.computeCommandEncoder()
    for _ in range(N):
        encode(e)
    e.endEncoding(); cb.commit(); enc = time.perf_counter() - t; cb.waitUntilCompleted()
    return cb.GPUEndTime() - cb.GPUStartTime(), enc


def record_icb():
    d = Metal.MTLIndirectCommandBufferDescriptor.alloc().init()
    d.setCommandTypes_(Metal.MTLIndirectCommandTypeConcurrentDispatch)
    d.setInheritBuffers_(False); d.setInheritPipelineState_(False); d.setMaxKernelBufferBindCount_(1)
    icb = dev.newIndirectCommandBufferWithDescriptor_maxCommandCount_options_(d, N, 0)
    for i in range(N):
        c = icb.indirectComputeCommandAtIndex_(i)
        c.setComputePipelineState_(pso)
        c.setKernelBuffer_offset_atIndex_(buf, 0, 0)
        c.concurrentDispatchThreadgroups_threadsPerThreadgroup_(grid, tgs)
        c.setBarrier()                         # each kernel reads the previous one's output
    return icb


def icb_replay(icb):
    t = time.perf_counter()
    cb = q.commandBuffer(); e = cb.computeCommandEncoder()
    e.useResource_usage_(buf, Metal.MTLResourceUsageRead | Metal.MTLResourceUsageWrite)
    e.executeCommandsInBuffer_withRange_(icb, Metal.NSMakeRange(0, N))
    e.endEncoding(); cb.commit(); enc = time.perf_counter() - t; cb.waitUntilCompleted()
    return cb.GPUEndTime() - cb.GPUStartTime(), enc


def timed(f, *a):   # (wall us per kernel, GPU us per kernel or None, CPU encode+commit us for the whole sequence or None)
    t = time.perf_counter(); r = f(*a); w = (time.perf_counter() - t) / N * 1e6
    return (w, r[0] / N * 1e6, r[1] * 1e6) if r else (w, None, None)


def check():                                 # all four modes compute the same thing
    def reset():
        mv = buf.contents().as_buffer(THREADS * 4); mv[:] = bytes(THREADS * 4)
    def val():
        import struct; return struct.unpack("f", bytes(buf.contents().as_buffer(THREADS * 4)[:4]))[0]
    out = {}
    for name, f in [("wait_each", wait_each), ("queue", queue), ("one_cb", one_cb)]:
        reset(); f(); out[name] = val()
    icb = record_icb(); reset(); icb_replay(icb); out["icb_replay"] = val()
    return out


if __name__ == "__main__":
    run = int(sys.argv[1]); outdir = sys.argv[2]
    res = dict(run=run, device=dev.name(), n_kernels=N, threads=THREADS, trials=TRIALS, check=check())
    for f in (wait_each, queue, one_cb):
        f()                                   # warm-up
    t = time.perf_counter(); icb = record_icb(); res["icb_record_us_total"] = (time.perf_counter() - t) * 1e6
    icb_replay(icb)
    for name, f, a in [("wait_each", wait_each, ()), ("queue", queue, ()), ("one_cb", one_cb, ()), ("icb_replay", icb_replay, (icb,))]:
        wall, gpu, enc = [], [], []
        for _ in range(TRIALS):
            w, g, c = timed(f, *a); wall.append(w)
            if g is not None:
                gpu.append(g); enc.append(c)
        res[name] = dict(us_per_kernel=statistics.median(wall), trials=wall,
                         gpu_us_per_kernel=statistics.median(gpu) if gpu else None,
                         encode_commit_us_total=statistics.median(enc) if enc else None)
    res["load"] = os.getloadavg()
    with open(os.path.join(outdir, "metal_launch.jsonl"), "a") as fh:
        fh.write(json.dumps(res) + "\n")
    print(json.dumps({k: (v["us_per_kernel"], v["gpu_us_per_kernel"], v["encode_commit_us_total"]) for k, v in res.items() if isinstance(v, dict) and "us_per_kernel" in v}), res["check"], res["load"])
