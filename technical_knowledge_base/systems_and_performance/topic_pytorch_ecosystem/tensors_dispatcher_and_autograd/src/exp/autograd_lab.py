"""Autograd behaviours reproduced (deterministic).  python autograd_lab.py > ../inputs/autograd.json

Version-counter cases (each snippet run for real: versions after every line, outcome, error text, gradients),
hooks firing order, retain_graph, create_graph and double backward, a custom autograd.Function (setup_context,
once_differentiable, gradcheck catching a wrong backward), anomaly mode, grad modes, checkpoint variants on the
running example (reentrant vs non-reentrant), and what the reentrant variant silently gets wrong.
"""
import json
import os
import sys
import warnings
import weakref

import torch
from torch.utils._python_dispatch import TorchDispatchMode
from torch.utils.checkpoint import checkpoint

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "..", "..", "..", "src", "model"))
from model import GPTConfig, make_model, get_batch  # noqa: E402

torch.set_num_threads(2)
out = {"torch": torch.__version__}


def msg(e, lines=1):
    s = str(e).strip().split("\n")
    return type(e).__name__ + ": " + " ".join(x.strip() for x in s[:lines] if x.strip())


# ---------- 1. version counter lab ----------
# Each case: list of lines (python statements). Executed one by one in a namespace; after each line the _version of
# the tracked names is recorded. The last line is the backward (or the failing line).
CASES = [
    {"id": "sigmoid", "title": "Overwrite an output that its own backward needs",
     "lines": ["x = torch.tensor([0.5, -1.0, 2.0], requires_grad=True)", "y = x.sigmoid()", "y.mul_(2)", "y.sum().backward()"],
     "track": ["y"], "why": "SigmoidBackward0 saves its output y (d sigmoid = y(1 - y)). mul_ bumped y's version to 1; at backward the saved y says it was saved at version 0."},
    {"id": "relu", "title": "nn.ReLU(inplace=True) after a sigmoid",
     "lines": ["x = torch.tensor([0.5, -1.0, 2.0], requires_grad=True)", "y = torch.sigmoid(x)", "z = torch.nn.ReLU(inplace=True)(y)", "z.sum().backward()"],
     "track": ["y"], "why": "The same error through a module: the in-place ReLU writes into the sigmoid's saved output."},
    {"id": "mulscalar", "title": "In-place on an output nobody saved",
     "lines": ["x = torch.tensor([0.5, -1.0, 2.0], requires_grad=True)", "y = x * 2", "y.add_(1)", "y.sum().backward()"],
     "track": ["y"], "why": "x * 2 saves only the scalar 2 (the gradient is grad * 2), so changing y in place is safe: the version check only runs on saved tensors."},
    {"id": "optstep", "title": "Update a weight between forward and backward",
     "lines": ["w = torch.tensor([1.0, 2.0, 3.0], requires_grad=True)", "loss = (w ** 2).sum()", "with torch.no_grad(): w.add_(0.1)", "loss.backward()"],
     "track": ["w"], "why": "PowBackward0 saved w itself. no_grad stops recording, not version counting: w is at version 1. This is the optimizer.step() before backward() bug, or an EMA update written in place."},
    {"id": "leaf", "title": "In-place on a leaf that requires grad",
     "lines": ["w = torch.tensor([1.0, 2.0, 3.0], requires_grad=True)", "w.add_(1)"],
     "track": ["w"], "why": "A leaf's .grad must be the gradient of the value it had; autograd refuses outright. Do parameter updates under torch.no_grad()."},
    {"id": "leafview", "title": "In-place on a view of such a leaf",
     "lines": ["w = torch.tensor([1.0, 2.0, 3.0], requires_grad=True)", "w[0].mul_(2)"],
     "track": ["w"], "why": "w[0] is a view; writing through it writes into the leaf."},
    {"id": "copyslices", "title": "In-place on a view of a non-leaf: allowed, rebased",
     "lines": ["x = torch.tensor([1.0, 2.0, 3.0], requires_grad=True)", "h = x * 1", "h[0] = 0", "h.sum().backward()"],
     "track": ["h"], "why": "Writing into a view of a non-leaf is legal. Autograd rewrites h's history with a CopySlices node, so the gradient of x[0] becomes 0."},
    {"id": "data", "title": "The .data trap: no error, wrong gradient",
     "lines": ["x = torch.tensor([0.5, -1.0, 2.0], requires_grad=True)", "y = x.sigmoid()", "y.data.mul_(2)", "y.sum().backward()"],
     "track": ["y"], "why": ".data gives a tensor with a fresh version counter, so the check cannot see the write. Backward uses the doubled y in y(1 - y) and returns a wrong gradient silently."},
    {"id": "detach", "title": "The same write through .detach(): caught",
     "lines": ["x = torch.tensor([0.5, -1.0, 2.0], requires_grad=True)", "y = x.sigmoid()", "y.detach().mul_(2)", "y.sum().backward()"],
     "track": ["y"], "why": ".detach() shares the version counter with y, so the write is seen and backward refuses. Prefer .detach() to .data."},
    {"id": "clone", "title": "Fix: write into a clone",
     "lines": ["x = torch.tensor([0.5, -1.0, 2.0], requires_grad=True)", "y = x.sigmoid()", "y2 = y.clone()", "y2.mul_(2)", "y2.sum().backward()"],
     "track": ["y", "y2"], "why": "The clone has its own storage and version counter; the saved y is untouched."},
    {"id": "hooks", "title": "Saved-tensor hooks switch the check off",
     "lines": ["x = torch.tensor([0.5, -1.0, 2.0], requires_grad=True)", "with torch.autograd.graph.saved_tensors_hooks(lambda t: t, lambda t: t): y = x.sigmoid()", "y.mul_(2)", "y.sum().backward()"],
     "track": ["y"], "why": "With pack/unpack hooks installed, SavedVariable skips the version check (saved_variable.cpp L165-166 at v2.14.1). An identity pack keeps a reference to y, so backward reads the doubled y: no error, wrong gradient, exactly like .data."},
    {"id": "hookscopy", "title": "A pack hook that copies is immune",
     "lines": ["x = torch.tensor([0.5, -1.0, 2.0], requires_grad=True)", "with torch.autograd.graph.saved_tensors_hooks(lambda t: t.clone(), lambda t: t): y = x.sigmoid()", "y.mul_(2)", "y.sum().backward()"],
     "track": ["y"], "why": "Packing a copy (what save_on_cpu does, to the CPU) freezes the value at save time, so the later write cannot reach it and the gradient is right."},
    {"id": "infsave", "title": "An inference tensor used in training",
     "lines": ["with torch.inference_mode(): c = torch.ones(3)", "x = torch.tensor([0.5, -1.0, 2.0], requires_grad=True)", "y = x * c", "y.sum().backward()"],
     "track": [], "why": "MulBackward0 must save c to compute x's gradient, and inference tensors have no version counter, so they cannot be saved. Clone it outside inference mode first."},
    {"id": "infinplace", "title": "Writing into an inference tensor outside inference mode",
     "lines": ["with torch.inference_mode(): c = torch.ones(3)", "c.add_(1)"],
     "track": [], "why": "Outside inference_mode, PyTorch cannot track the write (no version counter), so it refuses."},
]

lab = []
for case in CASES:
    ns = {"torch": torch}
    steps = []
    status = "ok"
    error = None
    with warnings.catch_warnings():
        warnings.simplefilter("ignore")
        for line in case["lines"]:
            try:
                exec(line, ns)  # noqa: S102
                vers = {}
                for t in case["track"]:
                    if t in ns and isinstance(ns[t], torch.Tensor):
                        try:
                            vers[t] = ns[t]._version
                        except Exception:  # noqa: BLE001
                            vers[t] = None
                gf = None
                for t in case["track"]:
                    if t in ns and isinstance(ns[t], torch.Tensor) and ns[t].grad_fn is not None:
                        gf = type(ns[t].grad_fn).__name__
                steps.append({"line": line, "versions": vers, "grad_fn": gf})
            except Exception as e:  # noqa: BLE001
                status = "error"
                full = str(e).strip().split("\n")
                error = {"type": type(e).__name__, "text": full[0], "hint": " ".join(full[1:]).strip()[:400]}
                steps.append({"line": line, "versions": None, "error": True})
                break
    res = {"id": case["id"], "title": case["title"], "why": case["why"], "status": status, "error": error, "steps": steps, "lines": case["lines"]}
    for n in ["x", "w"]:
        if n in ns and isinstance(ns[n], torch.Tensor) and ns[n].grad is not None:
            res["grad_" + n] = [round(float(v), 6) for v in ns[n].grad]
    lab.append(res)
# the correct gradient for the .data case, for comparison
x = torch.tensor([0.5, -1.0, 2.0], requires_grad=True)
torch.sigmoid(x).sum().backward()
out["data_case_correct_grad"] = [round(float(v), 6) for v in x.grad]
out["version_lab"] = lab

# ---------- 2. hooks firing order on one block ----------
cfg = GPTConfig()
m = make_model(cfg)
blk = m.blocks[0]
xb, yb = get_batch(cfg, 0)
with torch.no_grad():
    x0 = m.tok(xb) + m.pos(torch.arange(cfg.block_size))
x = x0.detach().requires_grad_()
fired = []
hs = []
hs.append(blk.mlp.register_full_backward_pre_hook(lambda mod, go: fired.append("module pre-hook: mlp (grad of its output arrives)")))
hs.append(blk.mlp.register_full_backward_hook(lambda mod, gi, go: fired.append("module hook: mlp (grad of its input computed)")))
hs.append(blk.mlp.fc.weight.register_hook(lambda g: fired.append("tensor hook: mlp.fc.weight (gradient before accumulation)")))
hs.append(blk.mlp.fc.weight.register_post_accumulate_grad_hook(lambda p: fired.append("post-accumulate-grad hook: mlp.fc.weight (.grad is set)")))
hs.append(blk.attn.qkv.weight.register_post_accumulate_grad_hook(lambda p: fired.append("post-accumulate-grad hook: attn.qkv.weight")))
hs.append(x.register_hook(lambda g: fired.append("tensor hook: input x")))
y = blk(x)
y.register_hook(lambda g: fired.append("tensor hook: block output y"))
y.grad_fn.register_prehook(lambda go: fired.append("node pre-hook: " + type(y.grad_fn).__name__ + " (y's grad_fn)"))
y.grad_fn.register_hook(lambda gi, go: fired.append("node hook: " + type(y.grad_fn).__name__ + " (y's grad_fn)"))
(y ** 2).mean().backward()
out["hooks_order"] = fired
for h in hs:
    h.remove()

# hook that changes the gradient: clip a tensor's gradient in a hook
w = torch.tensor([1.0, 2.0, 3.0], requires_grad=True)
w.register_hook(lambda g: g.clamp(-1, 1))
(w ** 3).sum().backward()
out["hook_modifies"] = {"code": "w.register_hook(lambda g: g.clamp(-1, 1)); (w ** 3).sum().backward()", "grad": [float(v) for v in w.grad], "unhooked": [3.0, 12.0, 27.0]}

# ---------- 3. retain_graph, create_graph ----------
rg = {}
w = torch.tensor([1.0, 2.0, 3.0], requires_grad=True)
loss = (w ** 2).sum()
loss.backward()
try:
    loss.backward()
except Exception as e:  # noqa: BLE001
    rg["second_backward"] = msg(e)
w = torch.tensor([1.0, 2.0, 3.0], requires_grad=True)
loss = (w ** 2).sum()
loss.backward(retain_graph=True)
g1 = w.grad.tolist()
loss.backward()
rg["retain"] = {"after_first": g1, "after_second": w.grad.tolist()}
x = torch.tensor([1.0, 2.0, 3.0], requires_grad=True)
y = (x ** 3).sum()
(g,) = torch.autograd.grad(y, x, create_graph=True)
rg["create_graph"] = {"g": g.tolist(), "g_grad_fn": type(g.grad_fn).__name__, "g_requires_grad": g.requires_grad}
(gg,) = torch.autograd.grad(g.sum(), x)
rg["create_graph"]["gg"] = gg.tolist()
(g2,) = torch.autograd.grad((x ** 3).sum(), x)
rg["without_create_graph"] = {"g_requires_grad": g2.requires_grad}
try:
    torch.autograd.grad(g2.sum(), x)
except Exception as e:  # noqa: BLE001
    rg["without_create_graph"]["second"] = msg(e)
# gradient penalty on a small MLP: ops in backward with and without create_graph


class Count(TorchDispatchMode):
    def __init__(self):
        super().__init__()
        self.n = 0

    def __torch_dispatch__(self, func, types, args=(), kwargs=None):
        self.n += 1
        return func(*args, **(kwargs or {}))


torch.manual_seed(0)
net = torch.nn.Sequential(torch.nn.Linear(16, 32), torch.nn.Tanh(), torch.nn.Linear(32, 1))
inp = torch.randn(8, 16, requires_grad=True)
c1 = Count()
with c1:
    o = net(inp).sum()
    gi, = torch.autograd.grad(o, inp)
c2 = Count()
with c2:
    o = net(inp).sum()
    gi, = torch.autograd.grad(o, inp, create_graph=True)
    pen = gi.pow(2).sum()
    pen.backward()
rg["penalty_ops"] = {"forward_plus_grad": c1.n, "forward_grad_create_graph_and_penalty_backward": c2.n}
out["retain_create"] = rg

# ---------- 4. custom autograd.Function ----------


class MyGelu(torch.autograd.Function):
    """tanh GELU with a hand-written backward; forward without ctx, setup_context separate (the 2.0+ style)."""

    @staticmethod
    def forward(x):
        return 0.5 * x * (1 + torch.tanh(0.7978845608 * (x + 0.044715 * x ** 3)))

    @staticmethod
    def setup_context(ctx, inputs, output):
        (x,) = inputs
        ctx.save_for_backward(x)

    @staticmethod
    def backward(ctx, g):
        (x,) = ctx.saved_tensors
        u = 0.7978845608 * (x + 0.044715 * x ** 3)
        t = torch.tanh(u)
        du = 0.7978845608 * (1 + 3 * 0.044715 * x ** 2)
        return g * (0.5 * (1 + t) + 0.5 * x * (1 - t ** 2) * du)


class BadGelu(MyGelu):
    @staticmethod
    def backward(ctx, g):
        (x,) = ctx.saved_tensors
        t = torch.tanh(0.7978845608 * (x + 0.044715 * x ** 3))
        return g * 0.5 * (1 + t)  # forgets the second term of the product rule


class OnceGelu(MyGelu):
    @staticmethod
    @torch.autograd.function.once_differentiable
    def backward(ctx, g):
        return MyGelu.backward(ctx, g)


cf = {}
xx = torch.randn(6, dtype=torch.float64, requires_grad=True, generator=torch.Generator().manual_seed(0))
cf["gradcheck_good"] = torch.autograd.gradcheck(MyGelu.apply, (xx,))
cf["gradgradcheck_good"] = torch.autograd.gradgradcheck(MyGelu.apply, (xx,))
try:
    torch.autograd.gradcheck(BadGelu.apply, (xx,))
    cf["gradcheck_bad"] = "passed"
except Exception as e:  # noqa: BLE001
    lines = [l for l in str(e).split("\n") if l.strip()]
    cf["gradcheck_bad"] = type(e).__name__ + ": " + lines[0]
    cf["gradcheck_bad_detail"] = lines[1:6]
yv = MyGelu.apply(xx)
cf["grad_fn"] = type(yv.grad_fn).__name__
cf["matches_builtin"] = float((torch.autograd.grad(yv.sum(), xx)[0] - torch.autograd.grad(torch.nn.functional.gelu(xx, approximate="tanh").sum(), xx)[0]).abs().max())
y1 = OnceGelu.apply(xx)
(g1,) = torch.autograd.grad(y1.sum(), xx, create_graph=True)
try:
    torch.autograd.grad(g1.sum(), xx)
    cf["once_double"] = "ok"
except Exception as e:  # noqa: BLE001
    cf["once_double"] = msg(e)
out["custom_function"] = cf

# ---------- 5. anomaly mode ----------
an = {}
x = torch.tensor([0.0, 1.0], requires_grad=True)
(x.sqrt() * torch.tensor([0.0, 1.0])).sum().backward()
an["without"] = [str(v) for v in x.grad.tolist()]
x = torch.tensor([0.0, 1.0], requires_grad=True)
with warnings.catch_warnings(record=True) as wl:
    warnings.simplefilter("always")
    try:
        with torch.autograd.detect_anomaly():
            (x.sqrt() * torch.tensor([0.0, 1.0])).sum().backward()
    except Exception as e:  # noqa: BLE001
        an["with"] = msg(e)
    ws = [str(w.message) for w in wl]
an["warnings"] = [w.split("\n")[0][:200] for w in ws]
tb = [w for w in ws if "Traceback of forward call" in w]
if tb:
    lines = [l for l in tb[0].split("\n") if l.strip()]
    an["forward_trace_last_lines"] = [l.strip() for l in lines[-2:]]
out["anomaly"] = an

# ---------- 6. grad modes ----------
gm = []
w = torch.ones(3, requires_grad=True)


def probe(name, f, code):
    try:
        r = f()
        d = {"ctx": name, "code": code, "requires_grad": r.requires_grad, "grad_fn": type(r.grad_fn).__name__ if r.grad_fn else None,
             "is_inference": r.is_inference()}
        try:
            (r * w).sum().backward()
            d["later_backward"] = "ok"
        except Exception as e:  # noqa: BLE001
            d["later_backward"] = msg(e)
    except Exception as e:  # noqa: BLE001
        d = {"ctx": name, "code": code, "error": msg(e)}
    gm.append(d)


def _a():
    return w * 2


def _b():
    with torch.no_grad():
        return w * 2


def _c():
    with torch.set_grad_enabled(False):
        return w * 2


def _d():
    with torch.no_grad():
        with torch.enable_grad():
            return w * 2


def _e():
    with torch.inference_mode():
        return w * 2


def _f():
    with torch.inference_mode():
        with torch.inference_mode(False):
            return w * 2


probe("grad mode on (default)", _a, "y = w * 2")
probe("torch.no_grad()", _b, "with torch.no_grad(): y = w * 2")
probe("torch.set_grad_enabled(False)", _c, "with torch.set_grad_enabled(False): y = w * 2")
probe("enable_grad inside no_grad", _d, "with torch.no_grad():\n    with torch.enable_grad(): y = w * 2")
probe("torch.inference_mode()", _e, "with torch.inference_mode(): y = w * 2")
probe("inference_mode(False) inside inference_mode", _f, "with torch.inference_mode():\n    with torch.inference_mode(False): y = w * 2")
out["grad_modes"] = gm

# ---------- 7. checkpoint variants on the running example ----------


class Live(TorchDispatchMode):
    def __init__(self):
        super().__init__()
        self.live = {}
        self.ops = []

    def __torch_dispatch__(self, func, types, args=(), kwargs=None):
        ins = {a.untyped_storage().data_ptr() for a in args if isinstance(a, torch.Tensor)}
        r = func(*args, **(kwargs or {}))
        self.ops.append(func.overloadpacket.__name__)
        for t in (r if isinstance(r, (tuple, list)) else [r]):
            if isinstance(t, torch.Tensor):
                s = t.untyped_storage()
                p = s.data_ptr()
                if p and p not in ins and p not in self.live:
                    self.live[p] = s.nbytes()
                    weakref.finalize(s, self.live.pop, p, None)
        return r


def run_ckpt(kind):
    torch.manual_seed(0)
    mm = make_model(cfg)
    xb, yb = get_batch(cfg, 0)
    lv = Live()
    with warnings.catch_warnings(record=True) as wl:
        warnings.simplefilter("always")
        with lv:
            h = mm.tok(xb) + mm.pos(torch.arange(cfg.block_size))
            for b in mm.blocks:
                if kind == "plain":
                    h = b(h)
                elif kind == "non-reentrant":
                    h = checkpoint(b, h, use_reentrant=False)
                elif kind == "reentrant":
                    h = checkpoint(b, h, use_reentrant=True)
                else:
                    h = checkpoint(b, h)
            logits = mm.head(mm.ln_f(h))
            loss = torch.nn.functional.cross_entropy(logits.view(-1, logits.size(-1)), yb.view(-1))
        live_fwd = sum(lv.live.values())
        nf = len(lv.ops)
        lv.ops = []
        with lv:
            loss.backward()
    from collections import Counter
    c = Counter(lv.ops)
    grads = {n: p.grad.clone() for n, p in mm.named_parameters()}
    return {"kind": kind, "live_after_forward": live_fwd, "forward_calls": nf, "backward_calls": len(lv.ops), "addmm_in_backward": c["addmm"],
            "loss": float(loss), "warnings": sorted({str(w.message)[:200] for w in wl if "use_reentrant" in str(w.message)})}, grads


ck = {}
base = None
for kind in ["plain", "non-reentrant", "reentrant", "unspecified"]:
    r, g = run_ckpt(kind)
    if base is None:
        base = g
    r["max_grad_diff"] = max(float((g[k] - base[k]).abs().max()) for k in g)
    ck[kind] = r
out["checkpoint_variants"] = ck

# reentrant gotchas: an input that does not require grad, and torch.autograd.grad
gt = {}
torch.manual_seed(0)
lin = torch.nn.Linear(4, 4)
inp = torch.randn(2, 4)
with warnings.catch_warnings(record=True) as wl:
    warnings.simplefilter("always")
    outr = checkpoint(lin, inp, use_reentrant=True)
    gt["reentrant_output_requires_grad"] = outr.requires_grad
    try:
        outr.sum().backward()
        gt["reentrant_backward"] = "ok"
    except Exception as e:  # noqa: BLE001
        gt["reentrant_backward"] = msg(e)
    gt["reentrant_weight_grad_is_none"] = lin.weight.grad is None
    gt["reentrant_warning"] = [str(w.message).split("\n")[0][:200] for w in wl if "requires_grad" in str(w.message)]
lin.weight.grad = None
outn = checkpoint(lin, inp, use_reentrant=False)
gt["nonreentrant_output_requires_grad"] = outn.requires_grad
outn.sum().backward()
gt["nonreentrant_weight_grad_is_none"] = lin.weight.grad is None
inp2 = torch.randn(2, 4, requires_grad=True)
try:
    torch.autograd.grad(checkpoint(lin, inp2, use_reentrant=True).sum(), inp2)
    gt["reentrant_autograd_grad"] = "ok"
except Exception as e:  # noqa: BLE001
    gt["reentrant_autograd_grad"] = msg(e)
try:
    torch.autograd.grad(checkpoint(lin, inp2, use_reentrant=False).sum(), inp2)
    gt["nonreentrant_autograd_grad"] = "ok"
except Exception as e:  # noqa: BLE001
    gt["nonreentrant_autograd_grad"] = msg(e)
out["reentrant_gotchas"] = gt

# ---------- 8. engine threads ----------
import threading  # noqa: E402

th = {}
for dev in ["cpu", "mps"]:
    if dev == "mps" and not torch.backends.mps.is_available():
        continue
    w = torch.ones(3, device=dev, requires_grad=True)
    ids = []
    w.register_hook(lambda g: ids.append(threading.get_ident()) or g)
    (w * 2).sum().backward()
    th[dev] = {"hook_thread_is_caller": ids[0] == threading.get_ident()}
out["engine_threads"] = th
print(json.dumps(out, indent=1))
