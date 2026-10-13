"""Custom-op details, deterministic: schema inference, Inductor's code around an opaque op,
a data-dependent output shape, and one op with a CPU kernel (C++) and an MPS kernel (Metal).
Writes src/inputs/op_extras.json.
"""
import contextlib, io, re, warnings
from typing import Optional, Sequence
import torch
import torch.nn as nn
import torch.nn.functional as F
from torch import Tensor
from common import clean, save, SCRATCH
from cpp_ext import load_ext

warnings.simplefilter("ignore")
torch.set_num_threads(2)
EXT, _ = load_ext(SCRATCH + "/build_ops")
out = {"torch": torch.__version__}

# 1. Schema inference: Python type hints -> dispatcher schema
SIGS = []


def show(fn, mutates=()):
    s = torch.library.infer_schema(fn, mutates_args=mutates)
    import inspect
    SIGS.append({"python": "def " + fn.__name__ + str(inspect.signature(fn)).replace("torch.", ""),
                 "mutates_args": list(mutates), "schema": fn.__name__ + s})


def scale(x: Tensor, alpha: float) -> Tensor: ...
def scale_(x: Tensor, alpha: float) -> None: ...
def topk_mask(x: Tensor, k: int, dims: Sequence[int], bias: Optional[Tensor] = None) -> tuple[Tensor, Tensor]: ...
def cat_all(xs: list[Tensor], dim: int = 0) -> Tensor: ...
def fill_out(x: Tensor, out: Tensor) -> None: ...
def with_device(n: int, device: torch.device, dtype: torch.dtype) -> Tensor: ...


show(scale)
show(scale_, mutates=("x",))
show(topk_mask)
show(cat_all)
show(fill_out, mutates=("out",))
show(with_device)
try:
    def bad(x: Tensor, opts: dict) -> Tensor: ...
    torch.library.infer_schema(bad, mutates_args=())
except Exception as e:
    SIGS.append({"python": "def bad(x: Tensor, opts: dict) -> Tensor", "mutates_args": [], "schema": None,
                 "error": clean(f"{type(e).__name__}: {e}", 260)})
try:
    @torch.library.custom_op("ext::alias", mutates_args=())
    def alias(x: Tensor) -> Tensor:
        return x
    alias(torch.randn(3))
except Exception as e:
    out["alias_error"] = clean(f"{type(e).__name__}: {e}", 300)
out["schemas"] = SIGS

# 2. Inductor around an opaque op: the MLP of the running example, forward, compiled
@torch.library.custom_op("ext::gelu", mutates_args=())
def gelu(x: Tensor) -> Tensor:
    return EXT.raw_gelu(x)


@gelu.register_fake
def _(x):
    return torch.empty_like(x)


class MLP(nn.Module):
    def __init__(self, act):
        super().__init__()
        torch.manual_seed(0)
        self.fc, self.proj, self.act = nn.Linear(256, 1024), nn.Linear(1024, 256), act

    def forward(self, x):
        return self.proj(self.act(self.fc(x)))


from torch._inductor.utils import run_and_get_code
CODE = {}
for name, act in [("native", F.gelu), ("custom_op", gelu)]:
    torch._dynamo.reset()
    m = MLP(act)
    x = torch.randn(8, 64, 256)
    with torch.no_grad():
        _, codes = run_and_get_code(torch.compile(m), x)
    src = codes[0]
    # the wrapper's call(): the list of kernels and extern calls, in order
    body = src[src.index("def call("):]
    body = body[:body.index("\n\n\n") if "\n\n\n" in body else len(body)]
    lines = [ln.strip() for ln in body.splitlines()]
    calls = [ln for ln in lines if re.search(r"(cpp_fused|extern_kernels|torch\.ops|aten\.)", ln) and not ln.startswith("#")]
    kernels = re.findall(r"^cpp_fused_\w+ = ", src, flags=re.M)
    CODE[name] = {"calls": [re.sub(r"\s+", " ", c)[:160] for c in calls], "n_generated_kernels": len(kernels),
                  "generated_kernel_names": [k.split(" ")[0] for k in kernels]}
    # one generated kernel's C++ loop, abbreviated, for the native case
    if name == "native" and kernels:
        k0 = src.index(kernels[0])
        snippet = src[k0:k0 + 2400]
        CODE[name]["kernel_head"] = "\n".join(snippet.splitlines()[:40])
out["inductor"] = CODE

# 3. A data-dependent output shape: the fake cannot know the size, so it asks for a fresh symbol
@torch.library.custom_op("ext::positive_values", mutates_args=())
def positive_values(x: Tensor) -> Tensor:
    return x[x > 0].clone()


@positive_values.register_fake
def _(x):
    ctx = torch.library.get_ctx()
    n = ctx.new_dynamic_size()          # an unbacked symbol: some size >= 0 known only at run time
    return x.new_empty(n)


def f(x):
    v = positive_values(x)
    return v.sum() / v.numel()


torch._dynamo.reset()
gm_text = {}


def backend(gm, inputs):
    gm_text["code"] = gm.print_readable(print_output=False)
    return gm.forward


x = torch.randn(1000)
r = torch.compile(f, backend=backend, fullgraph=True)(x)
code = gm_text["code"]
code = re.sub(r"#.*", "", code)
out["data_dependent"] = {"graph": "\n".join(ln.rstrip() for ln in code.splitlines() if ln.strip())[:1400],
                         "result": round(r.item(), 6), "eager": round(f(x).item(), 6)}

# 4. One op, two devices: the C++ kernel on CPU, a Metal kernel on MPS
mps = {"available": torch.backends.mps.is_available()}
if mps["available"]:
    SHADER = """
    #include <metal_stdlib>
    using namespace metal;
    kernel void gelu_fwd(device float* out [[buffer(0)]], device const float* x [[buffer(1)]],
                         uint i [[thread_position_in_grid]]) {
        float v = x[i];
        out[i] = 0.5f * v * (1.0f + precise::erf(v * 0.70710678f));
    }
    """
    try:
        lib = torch.mps.compile_shader(SHADER)
        mps["compiled"] = True
    except Exception as e:
        # Metal has no erf in some SDKs: fall back to the tanh form and say so
        mps["erf_error"] = clean(e, 200)
        SHADER = SHADER.replace("0.5f * v * (1.0f + precise::erf(v * 0.70710678f))",
                                "0.5f * v * (1.0f + precise::tanh(0.7978845608f * (v + 0.044715f * v * v * v)))")
        lib = torch.mps.compile_shader(SHADER)
        mps["compiled"] = True
        mps["form"] = "tanh"

    @torch.library.custom_op("ext::gelu2", mutates_args=(), device_types="cpu")
    def gelu2(x: Tensor) -> Tensor:
        return EXT.raw_gelu(x)

    @gelu2.register_kernel("mps")
    def _(x):
        xc = x.contiguous()
        y = torch.empty_like(xc)
        lib.gelu_fwd(y, xc)
        return y

    @gelu2.register_fake
    def _(x):
        return torch.empty_like(x)

    xc = torch.randn(8, 64, 1024)
    ym = gelu2(xc.to("mps")).cpu()
    yc = gelu2(xc)
    mps["max_diff_mps_vs_cpu"] = (ym - yc).abs().max().item()
    mps["max_diff_mps_vs_F_gelu_exact"] = (ym - F.gelu(xc)).abs().max().item()
    mps["max_diff_mps_vs_F_gelu_tanh"] = (ym - F.gelu(xc, approximate="tanh")).abs().max().item()
    mps["shader"] = SHADER.strip()
    dump = torch._C._dispatch_dump("ext::gelu2")
    mps["dispatch_lines"] = [re.sub(r"registered at \S+", "registered at <file>", ln) for ln in dump.splitlines() if ln.strip()]
out["mps"] = mps

# 5. two builds of the same TORCH_LIBRARY namespace in one process
import os, subprocess, sys
code = ("import sys; sys.path.insert(0, %r); from cpp_ext import load_ext; load_ext(%r); "
        "load_ext(%r, name='ext_gelu_second'); print('survived')"
        % (os.path.dirname(os.path.abspath(__file__)), SCRATCH + "/build_ops", SCRATCH + "/build_second"))
r = subprocess.run([sys.executable, "-c", code], capture_output=True, text=True)
out["duplicate_torch_library"] = {"returncode": r.returncode, "survived": "survived" in r.stdout,
                                  "stderr_tail": clean(r.stderr.replace("Redirects are currently not supported in MacOs.", "")[-200:], 200)}
save("op_extras.json", out)
print({k: (v if k != "inductor" else {n: c["calls"] for n, c in v.items()}) for k, v in out.items() if k not in ("schemas",)})
for s in SIGS:
    print(s)
