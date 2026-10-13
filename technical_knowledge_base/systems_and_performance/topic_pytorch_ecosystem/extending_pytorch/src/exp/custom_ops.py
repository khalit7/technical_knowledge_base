"""Custom operators on the running example: what each registration step changes.

Deterministic (no timing): graph counts and break reasons from torch._dynamo.explain, eager
gradients against F.gelu, opcheck results test by test, and the Inductor wrapper code around the op.
Writes src/inputs/custom_ops.json. Run with the shared venv's python (torch 2.14.1), EXT_SCRATCH set
to a scratch folder, and the venv's bin on PATH (ninja, for the C++ build).

The op in every variant is the MLP's activation, exact GELU, so the loss must equal the plain model's.
"""
import contextlib, io, warnings
import torch
import torch.nn.functional as F
import torch._dynamo as dynamo
from common import clean, save, SCRATCH
import model as M
from model import GPTConfig, make_model, get_batch
from cpp_ext import load_ext

torch.set_num_threads(2)
cfg = GPTConfig()
x_ids, y_ids = get_batch(cfg, 0)
EXT, build_s = load_ext(SCRATCH + "/build_ops")

ACT = {"f": F.gelu}
M.MLP.forward = lambda self, x: self.proj(ACT["f"](self.fc(x)))

# reference gradients with F.gelu
ref = make_model(cfg)
_, ref_loss = ref(x_ids, y_ids)
ref_loss.backward()
REF = {n: p.grad.clone() for n, p in ref.named_parameters()}


def eager_check(fn):
    """Forward and backward of the running example with fn as the MLP activation."""
    ACT["f"] = fn
    m = make_model(cfg)
    out = {"loss": None, "error": None, "warnings": [], "fc_grad": None, "max_grad_diff": None}
    with warnings.catch_warnings(record=True) as w:
        warnings.simplefilter("always")
        try:
            _, loss = m(x_ids, y_ids)
            out["loss"] = round(loss.item(), 6)
            out["loss_diff"] = abs(loss.item() - ref_loss.item())
            loss.backward()
            g = m.blocks[0].mlp.fc.weight.grad
            out["fc_grad"] = None if g is None else "present"
            diffs = [(p.grad - REF[n]).abs().max().item() for n, p in m.named_parameters() if p.grad is not None]
            out["n_with_grad"] = sum(p.grad is not None for p in m.parameters())
            out["max_grad_diff"] = max(diffs) if diffs else None
        except Exception as e:
            out["error"] = clean(f"{type(e).__name__}: {e}", 500)
    out["warnings"] = sorted({clean(str(x.message), 300) for x in w if "Redirects" not in str(x.message)})
    out["n_params"] = sum(1 for _ in m.parameters())
    return out


def explain(fn):
    """Graphs, breaks and reasons Dynamo reports for the model's forward with fn as activation."""
    ACT["f"] = fn
    dynamo.reset()
    m = make_model(cfg)
    try:
        with contextlib.redirect_stderr(io.StringIO()), warnings.catch_warnings():
            warnings.simplefilter("ignore")
            e = dynamo.explain(m)(x_ids, y_ids)
        reasons = []
        for r in e.break_reasons:
            s = clean(r.reason, 260)
            if s not in reasons:
                reasons.append(s)
        ops = [str(n.target) for g in e.graphs for n in g.graph.nodes if n.op == "call_function"]
        return {"graphs": e.graph_count, "breaks": e.graph_break_count, "ops": e.op_count,
                "reasons": reasons, "custom_nodes": sorted({o for o in ops if "ext" in o})}
    except Exception as ex:
        return {"error": clean(f"{type(ex).__name__}: {ex}", 500)}


def compile_check(fn):
    """torch.compile(fullgraph=True) on forward and backward: does it work, and does the loss match?"""
    ACT["f"] = fn
    dynamo.reset()
    m = make_model(cfg)
    try:
        with contextlib.redirect_stderr(io.StringIO()), warnings.catch_warnings():
            warnings.simplefilter("ignore")
            cm = torch.compile(m, fullgraph=True)
            _, loss = cm(x_ids, y_ids)
            loss.backward()
        diffs = [(p.grad - REF[n]).abs().max().item() for n, p in m.named_parameters() if p.grad is not None]
        return {"ok": True, "loss": round(loss.item(), 6), "max_grad_diff": max(diffs) if diffs else None}
    except Exception as ex:
        return {"ok": False, "error": clean(f"{type(ex).__name__}: {ex}", 500)}


TESTS = ["test_schema", "test_autograd_registration", "test_faketensor", "test_aot_dispatch_dynamic"]


def opcheck(op):
    xin = 2 * torch.randn(4, 8, 32)   # wide enough that some values exceed 3
    res = {}
    for t in TESTS:
        try:
            with contextlib.redirect_stderr(io.StringIO()), warnings.catch_warnings():
                warnings.simplefilter("ignore")
                r = torch.library.opcheck(op, (xin.clone().detach().requires_grad_(True),), test_utils=(t,))
            res[t] = {"ok": r.get(t) == "SUCCESS", "msg": r.get(t)}
        except Exception as ex:
            res[t] = {"ok": False, "msg": clean(f"{type(ex).__name__}: {ex}", 420)}
    return res


V = {}

# v0: native F.gelu
V["native"] = dict(fn=F.gelu)
# v1: the C++ function called through pybind11, no dispatcher
V["pybind"] = dict(fn=EXT.raw_gelu)


# v2: custom_op around it, kernel only
@torch.library.custom_op("ext::gelu_k", mutates_args=())
def gelu_k(x: torch.Tensor) -> torch.Tensor:
    return EXT.raw_gelu(x)


V["kernel_only"] = dict(fn=gelu_k, op=gelu_k)


# v3: + register_fake
@torch.library.custom_op("ext::gelu_kf", mutates_args=())
def gelu_kf(x: torch.Tensor) -> torch.Tensor:
    return EXT.raw_gelu(x)


@gelu_kf.register_fake
def _(x):
    return torch.empty_like(x)


V["kernel_fake"] = dict(fn=gelu_kf, op=gelu_kf)


# v4: + register_autograd: the full op; its backward is itself a custom op with a fake
@torch.library.custom_op("ext::gelu_bwd", mutates_args=())
def gelu_bwd(grad: torch.Tensor, x: torch.Tensor) -> torch.Tensor:
    return EXT.raw_gelu_backward(grad, x)


@gelu_bwd.register_fake
def _(grad, x):
    return torch.empty_like(x)


@torch.library.custom_op("ext::gelu", mutates_args=())
def gelu(x: torch.Tensor) -> torch.Tensor:
    return EXT.raw_gelu(x)


@gelu.register_fake
def _(x):
    return torch.empty_like(x)


def setup_context(ctx, inputs, output):
    (x,) = inputs
    ctx.save_for_backward(x)


def backward(ctx, grad):
    (x,) = ctx.saved_tensors
    return gelu_bwd(grad, x)


gelu.register_autograd(backward, setup_context=setup_context)
V["full"] = dict(fn=gelu, op=gelu)


# v5: the full op, but its kernel clamps its input in place and the schema does not say so
@torch.library.custom_op("ext::gelu_mut", mutates_args=())
def gelu_mut(x: torch.Tensor) -> torch.Tensor:
    x.clamp_(-3.0, 3.0)            # the bug: an undeclared in-place write
    return EXT.raw_gelu(x)


@gelu_mut.register_fake
def _(x):
    return torch.empty_like(x)


gelu_mut.register_autograd(backward, setup_context=setup_context)
V["undeclared_mutation"] = dict(fn=gelu_mut, op=gelu_mut)


# v6: the full op, but the fake returns the wrong shape (a classic copy-paste slip)
@torch.library.custom_op("ext::gelu_badfake", mutates_args=())
def gelu_badfake(x: torch.Tensor) -> torch.Tensor:
    return EXT.raw_gelu(x)


@gelu_badfake.register_fake
def _(x):
    return x.new_empty(x.shape[:-1])


gelu_badfake.register_autograd(backward, setup_context=setup_context)
V["wrong_fake"] = dict(fn=gelu_badfake, op=gelu_badfake)

# v7: the C++ TORCH_LIBRARY op with no Python registrations (measured before v8 adds them)
V["cpp_bare"] = dict(fn=torch.ops.extc.gelu, op=torch.ops.extc.gelu.default)

import sys
FRESH = "--cpp-fresh" in sys.argv     # a second process: the C++ op with its Python registrations made before any use
ORDER = ["cpp_full"] if FRESH else ["native", "pybind", "kernel_only", "kernel_fake", "full", "undeclared_mutation", "wrong_fake", "cpp_bare", "cpp_late"]

out = {"torch": torch.__version__, "ref_loss": round(ref_loss.item(), 6), "variants": {}}
for k in ORDER:
    if k in ("cpp_full", "cpp_late"):
        # v8: add a fake and an autograd formula to the C++ op from Python, by name
        torch.library.register_fake("extc::gelu")(lambda x: torch.empty_like(x))
        torch.library.register_fake("extc::gelu_backward")(lambda g, x: torch.empty_like(x))

        def cpp_backward(ctx, grad):
            (x,) = ctx.saved_tensors
            return torch.ops.extc.gelu_backward(grad, x)

        torch.library.register_autograd("extc::gelu", cpp_backward, setup_context=setup_context)
        V[k] = dict(fn=torch.ops.extc.gelu, op=torch.ops.extc.gelu.default)
    v = V[k]
    r = {"eager": eager_check(v["fn"]), "explain": explain(v["fn"]), "compile": compile_check(v["fn"])}
    if "op" in v:
        r["opcheck"] = opcheck(v["op"])
        try:
            r["schema"] = str(v["op"]._opoverload._schema) if hasattr(v["op"], "_opoverload") else str(v["op"]._schema)
        except Exception as ex:
            r["schema"] = None
    out["variants"][k] = r
    print(k, {kk: (vv if kk != "opcheck" else {t: o["ok"] for t, o in vv.items()}) for kk, vv in r.items() if kk != "eager"},
          r["eager"]["loss"], r["eager"]["error"], r["eager"]["fc_grad"], r["eager"]["max_grad_diff"])

if FRESH:
    # the C++ op after its Python registrations: which dispatch keys hold a kernel, and from where
    import re
    dump = torch._C._dispatch_dump("extc::gelu")
    out["dispatch_dump_cpp"] = [re.sub(r"registered at \S*/(main\.cpp|library\.py|custom_ops\.py)", r"registered at \1", ln)
                                for ln in dump.splitlines() if ln.strip()]
    save("custom_ops_cpp_fresh.json", out)
else:
    # the late-registration trap: clearing the op's Python dispatch cache makes the same process pass
    torch.ops.extc.gelu.default._dispatch_cache.clear()
    out["cpp_late_after_cache_clear"] = opcheck(torch.ops.extc.gelu.default)
    save("custom_ops.json", out)
