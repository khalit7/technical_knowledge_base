"""Tensor parallel with and without sequence parallel on the running example's blocks, 2 CPU ranks (gloo).

The model's attention computes q, k, v with one fused Linear; column-splitting it blindly fails (root lab). Here
each block's attention is swapped at run time for an equivalent module with separate q, k and v Linears built from
the same weights (what torchtitan's models have), whose forward uses as many heads as its local shard holds. The
model file itself is imported unchanged.

    sh run.sh 2 tp_sp.py tp       # ColwiseParallel q, k, v, fc; RowwiseParallel proj (attention and MLP)
    sh run.sh 2 tp_sp.py tp1      # tp, plus the attention input wrapped once as a Replicate DTensor
    sh run.sh 2 tp_sp.py tpsp     # + SequenceParallel LayerNorms, residual stream sharded on the sequence dim
Records collectives per step, losses and gradients against one process, saved-activation bytes per rank, and the
placement and local shape of the activations at each module boundary.
"""
import argparse, math
from dptc import *
import torch.nn as nn
import torch.nn.functional as F
from torch.distributed.tensor import DTensor, Shard, Replicate
from torch.distributed.tensor.parallel import (parallelize_module, ColwiseParallel, RowwiseParallel,
                                               SequenceParallel, PrepareModuleInput)
from torch.distributed.tensor.debug import CommDebugMode
from model import GPTConfig, make_model, get_batch, make_optimizer

ap = argparse.ArgumentParser(); ap.add_argument("mode"); ap.add_argument("--steps", type=int, default=3)
a = ap.parse_args()
rank, world = init()
cfg = GPTConfig()
hd = cfg.d_model // cfg.n_head


class SplitQKVAttention(nn.Module):
    """The same attention as model.CausalSelfAttention, with q, k, v as separate Linears (weights copied)."""
    def __init__(self, src):
        super().__init__()
        C = src.qkv.in_features
        self.q, self.k, self.v = (nn.Linear(C, C) for _ in range(3))
        with torch.no_grad():
            for i, lin in enumerate((self.q, self.k, self.v)):
                lin.weight.copy_(src.qkv.weight[i * C:(i + 1) * C]); lin.bias.copy_(src.qkv.bias[i * C:(i + 1) * C])
        self.proj = src.proj

    def forward(self, x):
        B, T, _ = x.shape
        q, k, v = self.q(x), self.k(x), self.v(x)          # local width = (heads on this rank) x hd
        h = q.shape[-1] // hd
        q, k, v = (t.view(B, T, h, hd).transpose(1, 2) for t in (q, k, v))
        y = F.scaled_dot_product_attention(q, k, v, is_causal=True)
        return self.proj(y.transpose(1, 2).contiguous().view(B, T, h * hd))


def build():
    m = make_model(cfg)
    for b in m.blocks:
        b.attn = SplitQKVAttention(b.attn)
    return m


mesh = cpu_mesh((world,), ("tp",))
ref = build()                              # one process, same weights, same batch
model = build()
sp = a.mode == "tpsp"
for i, b in enumerate(model.blocks):
    plan = {"attn.q": ColwiseParallel(), "attn.k": ColwiseParallel(), "attn.v": ColwiseParallel(),
            "mlp.fc": ColwiseParallel()}
    if sp:
        plan.update({"ln1": SequenceParallel(), "ln2": SequenceParallel(),
                     "attn": PrepareModuleInput(input_layouts=(Shard(1),), desired_input_layouts=(Replicate(),)),
                     "mlp": PrepareModuleInput(input_layouts=(Shard(1),), desired_input_layouts=(Replicate(),)),
                     "attn.proj": RowwiseParallel(output_layouts=Shard(1), use_local_output=False),
                     "mlp.proj": RowwiseParallel(output_layouts=Shard(1), use_local_output=False)})
    else:
        plan.update({"attn.proj": RowwiseParallel(), "mlp.proj": RowwiseParallel()})
        if a.mode == "tp1":   # wrap the attention input once, so q, k and v share one DTensor input
            plan["attn"] = PrepareModuleInput(input_layouts=(Replicate(),), desired_input_layouts=(Replicate(),), use_local_output=False)
    parallelize_module(b, mesh, plan)
if sp:
    parallelize_module(model, mesh, {
        "blocks.0": PrepareModuleInput(input_layouts=(Replicate(),), desired_input_layouts=(Shard(1),), use_local_output=False),
        "ln_f": PrepareModuleInput(input_layouts=(Shard(1),), desired_input_layouts=(Replicate(),), use_local_output=True)})

# activation placement and local shape at each module boundary of block 0 (forward)
bounds = []
def desc(t):
    if isinstance(t, tuple): t = t[0]
    if isinstance(t, DTensor):
        return {"placement": str(t.placements[0]), "local": list(t.to_local().shape)}
    return {"placement": "plain tensor", "local": list(t.shape)}
for nm in ("ln1", "attn", "ln2", "mlp"):
    mod = model.blocks[0].get_submodule(nm)
    mod.register_forward_hook(lambda m, i, o, nm=nm: bounds.append({"module": nm, "in": desc(i), "out": desc(o)}) if len(bounds) < 4 else None)

params_info = []
for n, p in model.named_parameters():
    if n.startswith("blocks.0."):
        loc = p.to_local() if isinstance(p, DTensor) else p
        params_info.append({"name": n[9:], "global": list(p.shape), "local": list(loc.shape),
                            "placement": str(p.placements[0]) if isinstance(p, DTensor) else "plain"})


def saved_bytes(fn):
    seen = {}
    def pack(t):
        u = t._local_tensor if isinstance(t, DTensor) else t
        try:
            seen[u.untyped_storage().data_ptr()] = u.untyped_storage().nbytes()
        except Exception:
            pass
        return t
    with torch.autograd.graph.saved_tensors_hooks(pack, lambda t: t):
        out = fn()
    params = {(p.to_local() if isinstance(p, DTensor) else p).untyped_storage().data_ptr() for p in model.parameters()}
    return out, sum(v for k, v in seen.items() if k not in params)


opt = make_optimizer(model); ropt = make_optimizer(ref)
steps = []
for s in range(a.steps):
    x, y = get_batch(cfg, s)               # every TP rank sees the same batch
    w = FRWindow().start()
    with CommDebugMode() as cm:
        (_, loss), sb = saved_bytes(lambda: model(x, y))
        nfwd = {str(k).split(".")[-1]: v for k, v in cm.get_comm_counts().items()}
        loss.backward()
    ent = w.stop()
    _, rl = ref(x, y); rl.backward()
    # gradients against one process (q, k, v slices compared with the full model's fused rows)
    gd = 0.0
    for (n, p), (rn, rp) in zip(model.named_parameters(), ref.named_parameters()):
        g = p.grad.full_tensor() if isinstance(p.grad, DTensor) else p.grad
        gd = max(gd, (g - rp.grad).abs().max().item())
    opt.step(); opt.zero_grad(set_to_none=True); ropt.step(); ropt.zero_grad(set_to_none=True)
    steps.append({"step": s, "loss": round(loss.item(), 6), "ref_loss": round(rl.item(), 6), "max_grad_diff": gd,
                  "saved_activation_bytes": sb, "comm_debug_total": {str(k).split(".")[-1]: v for k, v in cm.get_comm_counts().items()},
                  "comm_debug_forward": nfwd,
                  "coll": [{"op": (e["profiling_name"] or "").replace("gloo:", ""), "in": e["in_bytes"], "out": e["out_bytes"]} for e in ent]})
# the same forward in one process, for the per-rank comparison
_, sb_ref = saved_bytes(lambda: ref(*get_batch(cfg, 0)))
dump("tp_" + a.mode, rank, {"mode": a.mode, "bounds": bounds, "params_block0": params_info, "steps": steps,
                            "saved_activation_bytes_one_process": sb_ref})
merge("tp_" + a.mode, world)
dist.destroy_process_group()
