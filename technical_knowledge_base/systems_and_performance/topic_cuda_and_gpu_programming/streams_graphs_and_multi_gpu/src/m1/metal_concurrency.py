"""Do independent queues overlap? Apple M1 Pro GPU through Metal (PyObjC).

K small kernels, each one threadgroup of 32 threads running a long dependent loop, so one kernel
fills one of the GPU's 16 cores and leaves the rest idle (the case where CUDA streams help).
  one_queue  : K kernels in one command buffer, serial dispatch (in order, like one CUDA stream)
  k_queues   : K command queues, one kernel each, committed together (like K CUDA streams)
  concurrent : one encoder with MTLDispatchTypeConcurrent (no ordering between the dispatches)
Wall time on the CPU clock from first commit to last completion; 7 trials, median. One JSON line per run.
"""
import json, os, statistics, sys, time
import Metal

SRC = """
#include <metal_stdlib>
using namespace metal;
kernel void spin(device float* out [[buffer(0)]], constant uint& iters [[buffer(1)]],
                 uint tid [[thread_position_in_grid]], uint g [[threadgroup_position_in_grid]]) {
  float a = float(tid) * 1e-3f, b = 1.0001f;
  for (uint i = 0; i < iters; ++i) { a = fma(a, b, 1e-7f); }
  out[g * 32 + tid % 32] = a;
}
"""
K, ITERS, TRIALS = 8, 400000, 7
dev = Metal.MTLCreateSystemDefaultDevice()
lib, err = dev.newLibraryWithSource_options_error_(SRC, None, None)
assert lib is not None, err
pso, err = dev.newComputePipelineStateWithFunction_error_(lib.newFunctionWithName_("spin"), None)
queues = [dev.newCommandQueue() for _ in range(K)]
outb = dev.newBufferWithLength_options_(K * 32 * 4, Metal.MTLResourceStorageModeShared)
itb = dev.newBufferWithBytes_length_options_(ITERS.to_bytes(4, "little"), 4, Metal.MTLResourceStorageModeShared)
one, tg = Metal.MTLSizeMake(1, 1, 1), Metal.MTLSizeMake(32, 1, 1)


def enc_one(e, k):
    e.setComputePipelineState_(pso); e.setBuffer_offset_atIndex_(outb, k * 32 * 4, 0)
    e.setBuffer_offset_atIndex_(itb, 0, 1); e.dispatchThreadgroups_threadsPerThreadgroup_(one, tg)


def one_queue(n=K):
    cb = queues[0].commandBuffer(); e = cb.computeCommandEncoder()
    for k in range(n):
        enc_one(e, k)
    e.endEncoding(); t = time.perf_counter(); cb.commit(); cb.waitUntilCompleted()
    return time.perf_counter() - t


def k_queues():
    cbs = []
    for k in range(K):
        cb = queues[k].commandBuffer(); e = cb.computeCommandEncoder(); enc_one(e, k); e.endEncoding(); cbs.append(cb)
    t = time.perf_counter()
    for cb in cbs:
        cb.commit()
    for cb in cbs:
        cb.waitUntilCompleted()
    return time.perf_counter() - t


def concurrent():
    cb = queues[0].commandBuffer(); e = cb.computeCommandEncoderWithDispatchType_(Metal.MTLDispatchTypeConcurrent)
    for k in range(K):
        enc_one(e, k)
    e.endEncoding(); t = time.perf_counter(); cb.commit(); cb.waitUntilCompleted()
    return time.perf_counter() - t


if __name__ == "__main__":
    run, outdir = int(sys.argv[1]), sys.argv[2]
    res = dict(run=run, device=dev.name(), k=K, iters=ITERS, trials=TRIALS)
    for f in (one_queue, k_queues, concurrent):
        f()
    res["single_ms"] = statistics.median([one_queue(1) * 1e3 for _ in range(TRIALS)])
    for f in (one_queue, k_queues, concurrent):
        ts = [f() * 1e3 for _ in range(TRIALS)]
        res[f.__name__] = dict(ms=statistics.median(ts), trials=ts)
    res["load"] = os.getloadavg()
    with open(os.path.join(outdir, "metal_concurrency.jsonl"), "a") as fh:
        fh.write(json.dumps(res) + "\n")
    print(res["single_ms"], {k: res[k]["ms"] for k in ("one_queue", "k_queues", "concurrent")}, res["load"])
