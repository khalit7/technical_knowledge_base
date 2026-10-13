"""Deterministic measurements for the Reading tab (no timing). torch 2.14.1, CPU (and MPS keysets).
Run: <venv python> -I measure.py > inputs/measure.json"""
import json, sys, numpy as np, torch
from torch.utils._python_dispatch import TorchDispatchMode
import torch.nn.functional as F
C = torch._C
out = {"torch": torch.__version__}

def ks(t): return str(C._dispatch_keys(t)).replace("DispatchKeySet(", "").rstrip(")").split(", ")

# 1. strides: views of a 3x4 tensor over storage 0..11
base = torch.arange(12.).reshape(3, 4)
views = {
  "base": base, "t": base.t(), "row1": base[1], "col2": base[:, 2], "every2": base[:, ::2],
  "view2x6": base.view(2, 6), "expand": torch.arange(4.).expand(3, 4), "t_contig": base.t().contiguous(),
}
st = {}
for k, v in views.items():
    same = v.untyped_storage().data_ptr() == (base.untyped_storage().data_ptr() if k != "expand" else v.untyped_storage().data_ptr())
    st[k] = dict(shape=list(v.shape), stride=list(v.stride()), offset=v.storage_offset(), contig=v.is_contiguous(),
                 shares=bool(v.untyped_storage().data_ptr() == base.untyped_storage().data_ptr()), values=v.flatten().tolist(),
                 storage_elems=v.untyped_storage().nbytes() // 4)
try:
    base.t().view(12); st["t_view_err"] = None
except RuntimeError as e:
    st["t_view_err"] = str(e).split("\n")[0][:160]
st["t_reshape_shares"] = bool(base.t().reshape(12).untyped_storage().data_ptr() == base.untyped_storage().data_ptr())
out["strides"] = st

# 2. dispatch: which ATen calls reach the bottom, and what autograd recorded, for mm(x, w) in five situations
class Rec(TorchDispatchMode):
    def __init__(s): super().__init__(); s.calls = []
    def __torch_dispatch__(s, func, types, args=(), kwargs=None):
        r = func(*args, **(kwargs or {}))
        s.calls.append(dict(op=str(func.overloadpacket.__name__) + ("" if func._overloadname == "default" else "." + func._overloadname),
                            dtype=str(r.dtype).replace("torch.", "") if isinstance(r, torch.Tensor) else ""))
        return r
def scen(name, fn):
    torch.manual_seed(0)
    x = torch.randn(8, 256); w = torch.randn(256, 256, requires_grad=True)
    rec = Rec()
    y, info = fn(x, w, rec)
    return dict(name=name, calls=rec.calls, grad_fn=type(y.grad_fn).__name__ if y.grad_fn is not None else None,
                requires_grad=y.requires_grad, dtype=str(y.dtype).replace("torch.", ""), x_keys=info.get("xk"), out_keys=ks(y),
                excluded_autograd=bool(C._dispatch_tls_is_dispatch_key_excluded(C.DispatchKey.AutogradCPU)), **{k: v for k, v in info.items() if k != "xk"})
def train(x, w, rec):
    with rec: y = torch.mm(x, w)
    return y, {"xk": ks(x)}
def nograd(x, w, rec):
    with torch.no_grad():
        with rec: y = torch.mm(x, w)
    return y, {"xk": ks(x)}
def infer(x, w, rec):
    with torch.inference_mode():
        x2 = torch.randn(8, 256); w2 = w.detach().clone()
        ex = bool(C._dispatch_tls_is_dispatch_key_excluded(C.DispatchKey.AutogradCPU))
        with rec: y = torch.mm(x2, w2)
        xk = ks(x2)
    return y, {"xk": xk, "autograd_excluded_inside": ex, "is_inference": y.is_inference()}
def autocast(x, w, rec):
    with torch.autocast("cpu", dtype=torch.bfloat16):
        with rec: y = torch.mm(x, w)
    return y, {"xk": ks(x)}
class Sub(torch.Tensor):
    pass
def subclass(x, w, rec):
    # a wrapper subclass that logs: proves the Python key is in the route
    seen = []
    class Logged(torch.Tensor):
        @staticmethod
        def __new__(cls, t): return torch.Tensor._make_wrapper_subclass(cls, t.shape, dtype=t.dtype, device=t.device, requires_grad=t.requires_grad)
        def __init__(self, t): self.t = t
        @classmethod
        def __torch_dispatch__(cls, func, types, args=(), kwargs=None):
            seen.append(str(func.overloadpacket.__name__))
            un = lambda a: a.t if isinstance(a, Logged) else a
            r = func(*[un(a) for a in args], **{k: un(v) for k, v in (kwargs or {}).items()})
            return Logged(r) if isinstance(r, torch.Tensor) else r
    lx = Logged(x)
    with rec: y = torch.mm(lx, w)
    return y, {"xk": ks(lx), "subclass_saw": seen}
out["dispatch"] = [scen("training", train), scen("no_grad", nograd), scen("inference_mode", infer), scen("autocast bf16", autocast), scen("tensor subclass", subclass)]
if torch.backends.mps.is_available():
    out["mps_keys"] = ks(torch.randn(2, device="mps"))
    out["mps_keys_rg"] = ks(torch.randn(2, device="mps", requires_grad=True))
out["cpu_keys_plain"] = ks(torch.randn(2)); out["cpu_keys_rg"] = ks(torch.randn(2, requires_grad=True))

# 3. a tiny autograd graph: h = gelu(x @ W1), loss = (h @ W2).pow(2).mean()
torch.manual_seed(0)
x = torch.randn(8, 16); W1 = torch.randn(16, 32, requires_grad=True); W2 = torch.randn(32, 4, requires_grad=True)
a = x @ W1; h = F.gelu(a); o = h @ W2; loss = o.pow(2).mean()
nodes = []; order = []
def walk(fn, seen):
    if fn is None or fn in seen: return
    seen.add(fn)
    saved = {}
    for attr in dir(fn):
        if attr.startswith("_saved_"):
            v = getattr(fn, attr)
            if isinstance(v, torch.Tensor): saved[attr[7:]] = [list(v.shape), v.numel() * v.element_size()]
    nodes.append(dict(name=type(fn).__name__, saved=saved, next=[type(n).__name__ for n, _ in fn.next_functions if n is not None]))
    for n, _ in fn.next_functions: walk(n, seen)
walk(loss.grad_fn, set())
hooks = []
def reg(fn, seen):
    if fn is None or fn in seen: return
    seen.add(fn); hooks.append(fn.register_prehook(lambda g, n=type(fn).__name__: order.append(n)))
    for n, _ in fn.next_functions: reg(n, seen)
reg(loss.grad_fn, set())
loss.backward()
out["tiny_graph"] = dict(nodes=nodes, backward_order=order, loss=round(loss.item(), 4),
                         shapes=dict(x=[8, 16], W1=[16, 32], W2=[32, 4]))

# 3b. the same tiny graph with the first layer checkpointed (non-reentrant): what is saved, what backward recomputes
from torch.utils.checkpoint import checkpoint
class Rec2(TorchDispatchMode):
    def __init__(s): super().__init__(); s.c = []
    def __torch_dispatch__(s, f, t, a=(), k=None): s.c.append(str(f.overloadpacket.__name__)); return f(*a, **(k or {}))
ck = {}
for use in [False, True]:
    torch.manual_seed(0)
    x = torch.randn(8, 16); W1 = torch.randn(16, 32, requires_grad=True); W2 = torch.randn(32, 4, requires_grad=True)
    packed = []
    def pack(t): packed.append([list(t.shape), t.numel() * t.element_size(), bool(t is W2)]); return t
    with torch.autograd.graph.saved_tensors_hooks(pack, lambda t: t):
        l1 = lambda x: F.gelu(x @ W1)
        h = checkpoint(l1, x, use_reentrant=False) if use else l1(x)
        o = h @ W2; loss = o.pow(2).mean()
    r = Rec2()
    with r: loss.backward()
    ck["checkpoint" if use else "plain"] = dict(saved=packed, backward_calls=r.c, grad_W1=W1.grad.abs().sum().item())
out["tiny_ckpt"] = ck

# 8. a graph break from leaving torch, then the same function as a torch.library custom op
import torch._dynamo as dynamo
def py_clip(t):  # leaves torch for plain Python values: Dynamo cannot keep this in the graph
    return torch.tensor([min(max(v, -1.0), 1.0) for v in t.tolist()])
def f_plain(x):
    y = torch.sin(x) * 2
    y = py_clip(y)
    return y.exp().sum()
@torch.library.custom_op("rd::clip", mutates_args=())
def clip_op(t: torch.Tensor) -> torch.Tensor:
    return torch.tensor([min(max(v, -1.0), 1.0) for v in t.tolist()])
@clip_op.register_fake
def _(t): return torch.empty_like(t)
def f_op(x):
    y = torch.sin(x) * 2
    y = clip_op(y)
    return y.exp().sum()
xx = torch.randn(64)
dynamo.reset(); e1 = dynamo.explain(f_plain)(xx)
dynamo.reset(); e2 = dynamo.explain(f_op)(xx)
def summ(e): return dict(graphs=e.graph_count, breaks=e.graph_break_count, ops=e.op_count,
                         reasons=[str(b.reason).split("\n")[0][:140] for b in e.break_reasons][:3])
out["custom_op"] = dict(plain=summ(e1), custom_op=summ(e2), same_result=bool(torch.allclose(f_plain(xx), f_op(xx))))
json.dump(out, sys.stdout, indent=1)
