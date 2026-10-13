"""Tensor subclasses on the running example, deterministic.

A. The same forward and backward watched by a __torch_function__ subclass and by a __torch_dispatch__
   wrapper subclass, each set as block 0's MLP fc.weight: which calls each level sees, in order.
B. A small int8 weight-only wrapper subclass (qdata int8 + one float32 scale per row) for every Linear
   weight in the blocks: eager and compiled losses, bytes, which aten ops reached it, what
   AOTAutograd's graph looks like once the subclass is desugared (__tensor_flatten__/__tensor_unflatten__).
Writes src/inputs/subclasses.json.
"""
import contextlib, io, re, warnings
import torch
import torch.nn as nn
import torch.nn.functional as F
from torch.utils._pytree import tree_map
from common import clean, save, SCRATCH
from model import GPTConfig, make_model, get_batch

warnings.simplefilter("ignore")
torch.set_num_threads(2)
cfg = GPTConfig()
xi, yi = get_batch(cfg, 0)
out = {"torch": torch.__version__}
PHASE = {"p": "forward"}
LOG = []


def name(func):
    s = str(func)
    return s.replace("aten.", "").replace(".default", "")


# ---------- A. two levels ----------
class TFLog(torch.Tensor):
    """A plain subclass that only overrides __torch_function__ (the Python API level)."""
    @classmethod
    def __torch_function__(cls, func, types, args=(), kwargs=None):
        kwargs = kwargs or {}
        fn = getattr(func, "__name__", str(func))
        LOG.append({"level": "function", "phase": PHASE["p"], "op": fn,
                    "sub": [i for i, a in enumerate(args) if isinstance(a, TFLog)]})
        return super().__torch_function__(func, types, args, kwargs)


class TDLog(torch.Tensor):
    """A wrapper subclass: holds a plain tensor `elem`; every ATen call on it reaches __torch_dispatch__."""
    @staticmethod
    def __new__(cls, elem):
        return torch.Tensor._make_wrapper_subclass(cls, elem.shape, strides=elem.stride(),
                                                   storage_offset=elem.storage_offset(), dtype=elem.dtype,
                                                   device=elem.device, requires_grad=elem.requires_grad)

    def __init__(self, elem):
        self.elem = elem

    __torch_function__ = torch._C._disabled_torch_function_impl

    @classmethod
    def __torch_dispatch__(cls, func, types, args=(), kwargs=None):
        kwargs = kwargs or {}
        sub = [i for i, a in enumerate(args) if isinstance(a, TDLog)]
        unwrap = lambda t: t.elem if isinstance(t, TDLog) else t
        r = func(*tree_map(unwrap, args), **tree_map(unwrap, kwargs))
        shp = None
        if isinstance(r, torch.Tensor):
            shp = list(r.shape)
        LOG.append({"level": "dispatch", "phase": PHASE["p"], "op": name(func), "sub": sub, "shape": shp})
        if WRAP_OUT["on"] or (func is torch.ops.aten.detach.default and not WRAP_OUT.get("raw")):
            return tree_map(lambda t: TDLog(t) if isinstance(t, torch.Tensor) else t, r)
        return r


WRAP_OUT = {"on": True}


def trace(kind, contagious=True):
    """Forward and backward of the running example with block 0's fc.weight replaced by a subclass."""
    LOG.clear()
    WRAP_OUT["on"] = contagious
    m = make_model(cfg)
    w = m.blocks[0].mlp.fc.weight
    PHASE["p"] = "setup"
    if kind == "function":
        m.blocks[0].mlp.fc.weight = nn.Parameter(w.detach().as_subclass(TFLog))
    else:
        m.blocks[0].mlp.fc.weight = nn.Parameter(TDLog(w.detach()))
    PHASE["p"] = "forward"
    _, loss = m(xi, yi)
    PHASE["p"] = "backward"
    loss.backward()
    PHASE["p"] = "after"
    g = m.blocks[0].mlp.fc.weight.grad
    ev = list(LOG)
    return {"events": ev, "n_setup": sum(e["phase"] == "setup" for e in ev), "n_forward": sum(e["phase"] == "forward" for e in ev),
            "n_backward": sum(e["phase"] == "backward" for e in ev),
            "loss": round(float(loss.detach().elem if isinstance(loss, TDLog) else loss.detach()), 6),
            "loss_type": type(loss).__name__, "grad_type": type(g).__name__ if g is not None else None}


# the Parameter rule: detach() must return the subclass, or nn.Parameter refuses it
WRAP_OUT.update(on=False, raw=True)
try:
    nn.Parameter(TDLog(torch.randn(2, 2)))
except Exception as e:
    out["parameter_detach_error"] = clean(f"{type(e).__name__}: {e}", 300)
WRAP_OUT.update(raw=False)
LOG.clear()
ref = make_model(cfg)
_, ref_loss = ref(xi, yi)
out["ref_loss"] = round(ref_loss.item(), 6)
A = {"function": trace("function"), "dispatch": trace("dispatch", True), "dispatch_unwrap": trace("dispatch", False)}
# keep the full event lists short enough to ship: the first 400 events of each
for k, v in A.items():
    v["n_events"] = len(v["events"])
    v["ops_hist"] = {}
    for e in v["events"]:
        key = e["phase"] + ":" + e["op"]
        v["ops_hist"][key] = v["ops_hist"].get(key, 0) + 1
    v["events"] = v["events"][:400]
out["levels"] = A
print({k: (v["n_forward"], v["n_backward"], v["loss"], v["loss_type"], v["grad_type"]) for k, v in A.items()})


# ---------- B. int8 weight-only subclass ----------
from subclasses_int8 import SEEN, Int8Weight, quantize_blocks


B = {}
m = make_model(cfg)
float_bytes = sum(b.attn.qkv.weight.numel() + b.attn.proj.weight.numel() + b.mlp.fc.weight.numel()
                  + b.mlp.proj.weight.numel() for b in m.blocks) * 4
B["n_quantized"] = quantize_blocks(m)
B["bytes_float"] = float_bytes
B["bytes_int8"] = sum(b.attn.qkv.weight.qdata.numel() + 4 * b.attn.qkv.weight.scale.numel()
                      + b.attn.proj.weight.qdata.numel() + 4 * b.attn.proj.weight.scale.numel()
                      + b.mlp.fc.weight.qdata.numel() + 4 * b.mlp.fc.weight.scale.numel()
                      + b.mlp.proj.weight.qdata.numel() + 4 * b.mlp.proj.weight.scale.numel() for b in m.blocks)
SEEN.clear()
_, loss = m(xi, yi)
B["eager_forward_ops"] = dict(SEEN)
SEEN.clear()
loss.backward()
B["eager_backward_ops"] = dict(SEEN)
B["eager_loss"] = round(loss.item(), 6)
B["trainable_with_grad"] = sum(p.grad is not None for p in m.parameters() if p.requires_grad)
B["trainable"] = sum(1 for p in m.parameters() if p.requires_grad)
B["frozen_int8"] = sum(1 for p in m.parameters() if isinstance(p, Int8Weight))
with torch.no_grad():
    lq, _ = m(xi)
    lr, _ = ref(xi)
B["max_logit_diff_vs_float"] = (lq - lr).abs().max().item()

# compiled: does Dynamo trace through the subclass, and what does AOTAutograd's forward graph hold?
torch._dynamo.reset()
graphs = {}


def aot_backend(gm, example_inputs):
    from torch._functorch.aot_autograd import aot_module_simplified

    def fw(g, inps):
        graphs["fw"] = g
        graphs["fw_inputs"] = len(inps)
        return g.forward

    def bw(g, inps):
        graphs["bw"] = g
        return g.forward
    graphs["dynamo_inputs"] = len(example_inputs)
    graphs["dynamo_n"] = graphs.get("dynamo_n", 0) + 1
    return aot_module_simplified(gm, example_inputs, fw_compiler=fw, bw_compiler=bw)


m2 = make_model(cfg)
quantize_blocks(m2)
with contextlib.redirect_stderr(io.StringIO()):
    e = torch._dynamo.explain(m2)(xi, yi)
B["explain"] = {"graphs": e.graph_count, "breaks": e.graph_break_count,
                "reasons": [clean(r.reason, 200) for r in e.break_reasons][:3]}
torch._dynamo.reset()
_, lc = torch.compile(m2, backend=aot_backend, fullgraph=True)(xi, yi)
lc.backward()
B["compiled_loss_aot"] = round(lc.item(), 6)
fwops = [str(n.target) for n in graphs["fw"].graph.nodes if n.op == "call_function"]
B["aot_fw_ops"] = len(fwops)
B["aot_fw_inputs"] = graphs["fw_inputs"]
B["dynamo_graph_inputs"] = graphs["dynamo_inputs"]
B["aot_fw_has_int8"] = sum("_to_copy" in o or "convert_element_type" in o for o in fwops)
# one block's qkv path in the AOT forward graph, as readable code
code = graphs["fw"].print_readable(print_output=False)
code = re.sub(r"#.*", "", code)
lines = [ln.strip() for ln in code.splitlines() if ln.strip()]
B["aot_fw_head"] = lines[:2] + [ln for ln in lines[2:] if re.search(r"convert_element_type|mm|mul|addmm|_to_copy", ln)][:10]
torch._dynamo.reset()
m3 = make_model(cfg)
quantize_blocks(m3)
_, li = torch.compile(m3, fullgraph=True)(xi, yi)
B["compiled_loss_inductor"] = round(li.item(), 6)
out["int8"] = B
print({k: v for k, v in B.items() if k not in ("aot_fw_head",)})
print("\n".join(B["aot_fw_head"]))
save("subclasses.json", out)
