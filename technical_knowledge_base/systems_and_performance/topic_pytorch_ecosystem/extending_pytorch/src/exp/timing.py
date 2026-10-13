"""Timed runs (hold the bench lock): what each extension point costs on this machine.
1. one call on a small and on an MLP-sized tensor: F.gelu, the C++ function through pybind11, the same C++
   as a TORCH_LIBRARY op, the Python custom_op around it (CPU); on MPS F.gelu, the Metal-shader op, the Helion op
2. the running example's training step with each activation, eager and compiled (CPU, 4 threads)
3. the int8 weight subclass: forward of the running example, eager and compiled
4. a cold build of the C++ extension
Medians of 3 repeats of torch.utils.benchmark blocks; load average recorded. Writes src/inputs/timing.json.
Run with PYTHONPATH including the unpacked Helion wheel and HELION_BACKEND=metal.
"""
import os, shutil, statistics, time, warnings, contextlib, io
import torch
import torch.nn.functional as F
import torch.utils.benchmark as tb
from common import save, SCRATCH
import model as M
from model import GPTConfig, make_model, get_batch, make_optimizer
from cpp_ext import load_ext

warnings.simplefilter("ignore")
torch.set_num_threads(4)
RES = {"torch": torch.__version__, "threads": 4, "load_before": os.getloadavg()}
EXT, _ = load_ext(SCRATCH + "/build_ops")


@torch.library.custom_op("ext::gelu", mutates_args=())
def gelu(x: torch.Tensor) -> torch.Tensor:
    return EXT.raw_gelu(x)


@gelu.register_fake
def _(x):
    return torch.empty_like(x)


@torch.library.custom_op("ext::gelu_bwd", mutates_args=())
def gelu_bwd(g: torch.Tensor, x: torch.Tensor) -> torch.Tensor:
    return EXT.raw_gelu_backward(g, x)


@gelu_bwd.register_fake
def _(g, x):
    return torch.empty_like(x)


def sc(ctx, inputs, output):
    ctx.save_for_backward(inputs[0])


def bw(ctx, g):
    (x,) = ctx.saved_tensors
    return gelu_bwd(g, x)


gelu.register_autograd(bw, setup_context=sc)
torch.library.register_fake("extc::gelu")(lambda x: torch.empty_like(x))
torch.library.register_fake("extc::gelu_backward")(lambda g, x: torch.empty_like(x))
torch.library.register_autograd("extc::gelu", lambda ctx, g: torch.ops.extc.gelu_backward(g, ctx.saved_tensors[0]),
                                setup_context=sc)


def med(stmt, glob, n=3, min_run=0.3):
    vals = []
    for _ in range(n):
        m = tb.Timer(stmt=stmt, globals=glob, num_threads=4).blocked_autorange(min_run_time=min_run)
        vals.append(m.median * 1e6)
    return {"median_us": round(statistics.median(vals), 3), "runs_us": [round(v, 3) for v in vals]}


# 1. per call
calls = {}
for label, shape in [("small (64)", (64,)), ("mlp (8,64,1024)", (8, 64, 1024))]:
    x = torch.randn(*shape)
    g = {"x": x, "F": F, "EXT": EXT, "gelu": gelu, "torch": torch}
    calls[label] = {
        "F.gelu": med("F.gelu(x)", g),
        "pybind C++": med("EXT.raw_gelu(x)", g),
        "TORCH_LIBRARY C++": med("torch.ops.extc.gelu(x)", g),
        "custom_op (Python) around C++": med("gelu(x)", g),
    }
RES["calls_cpu"] = calls

mps = {}
if torch.backends.mps.is_available():
    os.environ.setdefault("HELION_BACKEND", "metal")
    import helion, helion.language as hl

    @helion.kernel(autotune_effort="none", static_shapes=True)
    def hgelu(x: torch.Tensor) -> torch.Tensor:
        out = torch.empty_like(x)
        for tile in hl.tile(x.size()):
            v = x[tile]
            out[tile] = 0.5 * v * (1.0 + torch.tanh(0.7978845608028654 * (v + 0.044715 * v * v * v)))
        return out
    lib = torch.mps.compile_shader("""
    #include <metal_stdlib>
    using namespace metal;
    kernel void gelu_fwd(device float* out [[buffer(0)]], device const float* x [[buffer(1)]],
                         uint i [[thread_position_in_grid]]) {
        float v = x[i];
        out[i] = 0.5f * v * (1.0f + precise::tanh(0.7978845608f * (v + 0.044715f * v * v * v)));
    }""")

    def shader(x):
        y = torch.empty_like(x)
        lib.gelu_fwd(y, x)
        return y
    xm = torch.randn(8, 64, 1024, device="mps")
    hgelu(xm)
    torch.mps.synchronize()
    gm = {"x": xm, "F": F, "shader": shader, "hgelu": hgelu, "torch": torch}
    for k, stmt in [("F.gelu (tanh)", "F.gelu(x, approximate='tanh'); torch.mps.synchronize()"),
                    ("Metal shader via compile_shader", "shader(x); torch.mps.synchronize()"),
                    ("Helion kernel (metal backend)", "hgelu(x); torch.mps.synchronize()")]:
        mps[k] = med(stmt, gm)
RES["calls_mps"] = mps
print(RES["calls_cpu"], RES["calls_mps"])

# 2. the training step
cfg = GPTConfig()
x_ids, y_ids = get_batch(cfg, 1)
ACT = {"f": F.gelu}
M.MLP.forward = lambda self, x: self.proj(ACT["f"](self.fc(x)))
steps = {}
for label, fn, comp in [("F.gelu eager", F.gelu, False), ("custom_op eager", gelu, False),
                        ("TORCH_LIBRARY eager", torch.ops.extc.gelu, False),
                        ("F.gelu compiled", F.gelu, True), ("custom_op compiled", gelu, True)]:
    ACT["f"] = fn
    torch._dynamo.reset()
    m = make_model(cfg)
    opt = make_optimizer(m)
    mm = torch.compile(m) if comp else m

    def step():
        _, loss = mm(x_ids, y_ids)
        loss.backward()
        opt.step()
        opt.zero_grad(set_to_none=True)
    with contextlib.redirect_stderr(io.StringIO()):
        for _ in range(3):
            step()
    vals = []
    for _ in range(3):
        t = time.perf_counter()
        for _ in range(20):
            step()
        vals.append((time.perf_counter() - t) / 20 * 1e3)
    steps[label] = {"median_ms": round(statistics.median(vals), 2), "runs_ms": [round(v, 2) for v in vals]}
    print(label, steps[label])
RES["step_cpu"] = steps

# 3. int8 subclass forward
import subclasses_int8 as SQ
fw = {}
for label, quant, comp in [("float eager", False, False), ("int8 subclass eager", True, False),
                           ("float compiled", False, True), ("int8 subclass compiled", True, True)]:
    torch._dynamo.reset()
    M.MLP.forward = lambda self, x: self.proj(F.gelu(self.fc(x)))
    m = make_model(cfg)
    if quant:
        SQ.quantize_blocks(m)
    mm = torch.compile(m) if comp else m
    with torch.no_grad(), contextlib.redirect_stderr(io.StringIO()):
        for _ in range(3):
            mm(x_ids)
        fw[label] = med("mm(x_ids)", {"mm": mm, "x_ids": x_ids}, min_run=0.5)
    fw[label]["median_ms"] = round(fw[label].pop("median_us") / 1e3, 3)
    fw[label]["runs_ms"] = [round(v / 1e3, 3) for v in fw[label].pop("runs_us")]
    print(label, fw[label])
RES["int8_forward_cpu"] = fw

# 4. cold build of the C++ extension, each in a new process: a second library defining TORCH_LIBRARY(extc, ...)
# in the same process aborts it (SIGABRT, exit 134, no Python traceback)
import subprocess, sys
builds = []
for i in range(3):
    d = os.path.join(SCRATCH, f"build_cold_{i}")
    shutil.rmtree(d, ignore_errors=True)
    code = ("import sys; sys.path.insert(0, %r); from cpp_ext import load_ext; "
            "print('BUILD', load_ext(%r, name='ext_gelu_cold%d')[1])" % (os.path.dirname(os.path.abspath(__file__)), d, i))
    r = subprocess.run([sys.executable, "-c", code], capture_output=True, text=True)
    builds.append(round(float([l for l in r.stdout.splitlines() if l.startswith("BUILD")][-1].split()[1]), 2))
RES["build_cold_s"] = builds
RES["load_after"] = os.getloadavg()
print(builds, RES["load_before"], RES["load_after"])
save("timing.json", RES)
