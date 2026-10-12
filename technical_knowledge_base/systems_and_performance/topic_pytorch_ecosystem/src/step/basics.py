"""Teach-from-zero evidence for the Inside one step tab, all deterministic (no timing).

    python basics.py > inputs/basics.json

1. Storage, strides and views on a 3 x 4 tensor and on the model's own q/k/v views.
2. Dispatch tables (which keys have a kernel) for a few ops the step calls, read from
   torch._C._dispatch_dump_table on the installed wheel (macOS arm64: CUDA kernels are
   not compiled in, so the CUDA rows are not shown).
3. Gradients: a hand-derived gradient for blocks.0.mlp.fc (a Linear) and its GELU on the
   real step, compared with autograd; torch.autograd.gradcheck (float64, finite differences)
   on one Block of the same design at a small size.
"""
import json, math, os, re, sys
import torch
import torch.nn.functional as F

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "..", "model"))
from model import GPTConfig, make_model, get_batch, make_optimizer, train_step, Block  # noqa: E402

torch.set_num_threads(4)
out = {"torch": torch.__version__}


def desc(t, base_ptr):
    return {"shape": list(t.shape), "stride": list(t.stride()), "offset": t.storage_offset(),
            "contiguous": t.is_contiguous(), "same_storage": t.untyped_storage().data_ptr() == base_ptr,
            "storage_elems": t.untyped_storage().nbytes() // t.element_size(), "values": t.tolist()}


# 1. views
x = torch.arange(12.0).view(3, 4)
p = x.untyped_storage().data_ptr()
out["views"] = {
    "x": desc(x, p),
    "x.t()": desc(x.t(), p),
    "x[:, 1]": desc(x[:, 1], p),
    "x[1]": desc(x[1], p),
    "x.t().contiguous()": desc(x.t().contiguous(), p),
}
try:
    x.t().view(12)
    out["views"]["t_view_error"] = None
except RuntimeError as e:
    out["views"]["t_view_error"] = str(e).split("\n")[0]
v = x[0]
v[0] = 100.0
out["views"]["write_through"] = {"after v=x[0]; v[0]=100": x[0, 0].item(), "x._version": x._version}

# 2. dispatch tables
KEYS = ["CPU", "MPS", "Meta", "Python", "ADInplaceOrView", "AutogradCPU", "AutogradMPS", "AutocastCPU", "AutocastMPS", "Functionalize"]
tables = {}
for op in ["aten::addmm", "aten::linear", "aten::view", "aten::add_.Tensor", "aten::native_layer_norm",
           "aten::_scaled_dot_product_flash_attention_for_cpu", "aten::scaled_dot_product_attention", "aten::gelu"]:
    rows = {}
    for line in torch._C._dispatch_dump_table(op).splitlines():
        k = line.split(":")[0]
        if k in KEYS:
            rest = line[len(k) + 1:]
            kind = re.search(r"\[([^\]]+)\]\s*$", rest)
            kind = kind.group(1) if kind else ""
            if "fallthrough" in rest:
                kind = "fallthrough"
            rows[k] = kind
    tables[op[6:]] = rows
out["dispatch_tables"] = tables
out["dispatch_keys_of_param"] = str(torch._C._dispatch_keys(torch.zeros(2, requires_grad=True)))

# 3a. hand-derived gradient on the real step (step 1 after one warm-up step, as record_step.py)
cfg = GPTConfig()
m = make_model(cfg)
opt = make_optimizer(m)
x0, y0 = get_batch(cfg, 0)
train_step(m, opt, x0, y0)
xb, yb = get_batch(cfg, 1)
fc = m.blocks[0].mlp.fc
cap = {}
def fc_hook(mod, i, o):
    cap["X"], cap["H"] = i[0].detach(), o
    o.register_hook(lambda g: cap.__setitem__("G", g))


def proj_hook(mod, i, o):
    i[0].register_hook(lambda g: cap.__setitem__("GA", g))


h1 = fc.register_forward_hook(fc_hook)
# grad wrt the GELU input arrives at fc's output; grad wrt the GELU output we take from mlp.proj's input
proj = m.blocks[0].mlp.proj
h2 = proj.register_forward_hook(proj_hook)
_, loss = m(xb, yb)
loss.backward()
h1.remove(); h2.remove()
X = cap["X"].reshape(-1, cfg.d_model)                 # (512, 256)
G = cap["G"].reshape(-1, 4 * cfg.d_model)             # (512, 1024): dL/d(fc output)
dW = G.T @ X
db = G.sum(0)
H = cap["H"].detach().reshape(-1, 4 * cfg.d_model)
GA = cap["GA"].reshape(-1, 4 * cfg.d_model)           # dL/d(gelu output)
Phi = 0.5 * (1 + torch.erf(H / math.sqrt(2)))
phi = torch.exp(-0.5 * H * H) / math.sqrt(2 * math.pi)
G_hand = GA * (Phi + H * phi)                          # d gelu(h)/dh = Phi(h) + h phi(h)
rel = lambda a, b: ((a - b).abs().max() / b.abs().max()).item()
out["hand_grad"] = {
    "layer": "blocks.0.mlp.fc (Linear 256 to 1024) and its GELU, real step",
    "dW_max_abs_diff": (dW - fc.weight.grad).abs().max().item(), "dW_max_abs": fc.weight.grad.abs().max().item(),
    "dW_rel": rel(dW, fc.weight.grad),
    "db_max_abs_diff": (db - fc.bias.grad).abs().max().item(), "db_rel": rel(db, fc.bias.grad),
    "gelu_max_abs_diff": (G_hand - G).abs().max().item(), "gelu_rel": rel(G_hand, G),
    "loss": loss.item(),
}

# 3b. gradcheck in float64 on one Block at a small size
small = GPTConfig(d_model=16, n_head=2, block_size=5, batch_size=2)
torch.manual_seed(0)
blk = Block(small).double()
inp = torch.randn(2, 5, 16, dtype=torch.float64, requires_grad=True)
params = tuple(blk.parameters())
ok_in = torch.autograd.gradcheck(lambda t: blk(t), (inp,), eps=1e-6, atol=1e-5)
ok_ln = torch.autograd.gradcheck(lambda t: F.layer_norm(t, (16,)), (inp,), eps=1e-6, atol=1e-5)
ok_ce = torch.autograd.gradcheck(lambda t: F.cross_entropy(t.reshape(-1, 16), torch.arange(10) % 16),
                                 (inp,), eps=1e-6, atol=1e-5)
out["gradcheck"] = {"block_input": ok_in, "layer_norm": ok_ln, "cross_entropy": ok_ce,
                    "config": "Block(d_model=16, n_head=2), input (2, 5, 16) float64, eps 1e-6, atol 1e-5"}
# 3c. checkpointing changes memory, not the result: same step, gradients compared
grads = {}
for ck in (False, True):
    c = GPTConfig(checkpoint=ck)
    mm = make_model(c)
    oo = make_optimizer(mm)
    train_step(mm, oo, *get_batch(c, 0))
    _, l = mm(*get_batch(c, 1))
    l.backward()
    grads[ck] = (l.item(), {n: p.grad.clone() for n, p in mm.named_parameters()})
# 3d. the first step's optimizer also creates AdamW's state
from collections import Counter
from torch.utils._python_dispatch import TorchDispatchMode


class Count(TorchDispatchMode):
    def __init__(self):
        super().__init__()
        self.c = Counter()

    def __torch_dispatch__(self, func, types, args=(), kwargs=None):
        if func._schema.name.startswith("aten::"):
            self.c[func._schema.name[6:]] += 1
        return func(*args, **(kwargs or {}))


c0 = GPTConfig(); m0 = make_model(c0); o0 = make_optimizer(m0)
_, l0 = m0(*get_batch(c0, 0)); l0.backward()
with Count() as cnt:
    o0.step()
out["first_step_opt"] = dict(cnt.c)
out["ckpt_same"] = {"loss_plain": grads[False][0], "loss_ckpt": grads[True][0],
                    "max_abs_grad_diff": max((grads[False][1][n] - grads[True][1][n]).abs().max().item() for n in grads[False][1])}
print(json.dumps(out, indent=1))
