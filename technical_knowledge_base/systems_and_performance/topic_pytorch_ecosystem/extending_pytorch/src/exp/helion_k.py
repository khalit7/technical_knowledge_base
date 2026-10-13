"""Helion 1.4.0 on this Mac: its experimental Metal backend compiles kernels for MPS.
Deterministic: generated Metal source, configs and the tunable space, correctness against PyTorch, ref mode on
the CPU, and a Helion kernel registered as an MPS kernel of a torch.library custom op.
Helion is not installed in the shared venv: run with PYTHONPATH=<scratch>/helion (the unpacked 1.4.0 wheel).
Writes src/inputs/helion.json.
"""
import os
os.environ.setdefault("HELION_BACKEND", "metal")
import contextlib, io, re, warnings
import torch
import torch.nn.functional as F
from common import clean, save

warnings.simplefilter("ignore")
import helion
import helion.language as hl

RES = {"torch": torch.__version__, "helion": getattr(helion, "__version__", "1.4.0"), "backend": os.environ["HELION_BACKEND"]}  # not named `out`: Helion reads module globals a kernel names
dev = "mps"


@helion.kernel(autotune_effort="none", static_shapes=True)
def gelu_erf(x: torch.Tensor) -> torch.Tensor:
    out = torch.empty_like(x)
    for tile in hl.tile(x.size()):
        v = x[tile]
        out[tile] = 0.5 * v * (1.0 + torch.erf(v * 0.7071067811865476))
    return out


@helion.kernel(autotune_effort="none", static_shapes=True)
def gelu(x: torch.Tensor) -> torch.Tensor:
    out = torch.empty_like(x)
    for tile in hl.tile(x.size()):
        v = x[tile]
        out[tile] = 0.5 * v * (1.0 + torch.tanh(0.7978845608028654 * (v + 0.044715 * v * v * v)))
    return out


@helion.kernel(autotune_effort="none", static_shapes=True)
def softmax_rows(x: torch.Tensor) -> torch.Tensor:
    n, m = x.size()
    out = torch.empty_like(x)
    for tile_n in hl.tile(n):
        row = x[tile_n, :]
        mx = torch.amax(row, dim=1, keepdim=True)
        e = torch.exp(row - mx)
        out[tile_n, :] = e / torch.sum(e, dim=1, keepdim=True)
    return out


K = {}
for name, kern, args, ref in [
        ("gelu_erf", gelu_erf, (torch.randn(8, 64, 1024, device=dev),), lambda a: F.gelu(a)),
        ("gelu", gelu, (torch.randn(8, 64, 1024, device=dev),), lambda a: F.gelu(a, approximate="tanh")),
        ("softmax_rows", softmax_rows, (torch.randn(512, 64, device=dev),), lambda a: torch.softmax(a, dim=1))]:
    rec = {}
    try:
        with contextlib.redirect_stderr(io.StringIO()) as er:
            r = kern(*args)
        rec["max_abs_err"] = (r - ref(*args)).abs().max().item()
        bound = kern.bind(args)
        cfg = bound._implicit_config() if hasattr(bound, "_implicit_config") else None
        rec["config"] = str(cfg) if cfg is not None else None
        try:
            rec["default_config"] = str(bound.config_spec.default_config())
        except Exception as e:
            rec["default_config_error"] = clean(e, 200)
        code = bound.to_code(cfg) if cfg is not None else bound.to_code(bound.config_spec.default_config())
        rec["code"] = code
        rec["code_lines"] = len(code.splitlines())
        rec["stderr"] = clean(er.getvalue(), 300)
    except Exception as e:
        msg = str(e)
        rec["error"] = clean(f"{type(e).__name__}: " + (msg.split("While executing")[0][-300:] if "While executing" in msg else msg), 400)
        rec["error_node"] = clean(msg.split("While executing")[1].split("Original")[0], 200) if "While executing" in msg else None
    K[name] = rec
    print(name, {k: v for k, v in rec.items() if k != "code"})
RES["kernels"] = K


# a Helion kernel as the MPS kernel of a custom op (the CPU kernel is plain PyTorch)
@torch.library.custom_op("ext::hgelu", mutates_args=(), device_types="cpu")
def hgelu(x: torch.Tensor) -> torch.Tensor:
    return F.gelu(x, approximate="tanh")


@hgelu.register_kernel("mps")
def _(x):
    return gelu(x.contiguous())


@hgelu.register_fake
def _(x):
    return torch.empty_like(x)


x = torch.randn(8, 64, 1024)
op = {"cpu_vs_mps": (hgelu(x) - hgelu(x.to(dev)).cpu()).abs().max().item()}
try:
    with contextlib.redirect_stderr(io.StringIO()):
        op["opcheck_mps"] = torch.library.opcheck(hgelu, (x.to(dev),),
                                                  test_utils=("test_schema", "test_faketensor"))
except Exception as e:
    op["opcheck_mps"] = clean(f"{type(e).__name__}: {e}", 300)
# inside torch.compile on MPS: the custom op is one opaque node
try:
    torch._dynamo.reset()

    def f(t):
        return hgelu(t * 2.0).sum()
    with contextlib.redirect_stderr(io.StringIO()):
        e = torch._dynamo.explain(f)(x.to(dev))
    op["explain"] = {"graphs": e.graph_count, "breaks": e.graph_break_count}
    with contextlib.redirect_stderr(io.StringIO()):
        rc = torch.compile(f)(x.to(dev))
    ev = f(x.to(dev)).item()
    op["compiled_vs_eager_rel"] = abs(rc.item() - ev) / abs(ev)
except Exception as e:
    op["compile_error"] = clean(f"{type(e).__name__}: {e}", 400)
# a Helion kernel called directly inside torch.compile (no custom op)
try:
    torch._dynamo.reset()

    def g(t):
        return gelu(t * 2.0).sum()
    with contextlib.redirect_stderr(io.StringIO()):
        e = torch._dynamo.explain(g)(x.to(dev))
    op["direct_explain"] = {"graphs": e.graph_count, "breaks": e.graph_break_count,
                            "reasons": [clean(r.reason, 200) for r in e.break_reasons][:2]}
except Exception as e:
    op["direct_error"] = clean(f"{type(e).__name__}: {e}", 400)
RES["as_custom_op"] = op
print(op)
import json, subprocess, sys
env = dict(os.environ, HELION_INTERPRET="1", HELION_BACKEND="triton")
r = subprocess.run([sys.executable, os.path.join(os.path.dirname(os.path.abspath(__file__)), "helion_ref.py")],
                   env=env, capture_output=True, text=True)
RES["ref_mode_cpu"] = json.loads([l for l in r.stdout.splitlines() if l.startswith("{")][-1])
print(RES["ref_mode_cpu"])
save("helion.json", RES)
