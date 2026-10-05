"""Exact memory timeline of one training step on the Apple GPU (MPS allocator's own count of allocated bytes),
sampled after every aten operation of the forward and backward pass, with and without activation checkpointing.
usage: python memtl.py <mode>    mode: nograd, none, ckpt2, ckpt1"""
import json, os, sys, torch
from torch.utils._python_dispatch import TorchDispatchMode
from blk import model_loss
import cost

mode = sys.argv[1]
dev = "mps"
P, tok = cost.setup()
def move(x):
    return x.detach().to(dev).requires_grad_() if x.requires_grad else x
P = dict(layers=[{k: move(v) for k, v in lp.items()} for lp in P["layers"]], emb=move(P["emb"]),
         lnf_w=move(P["lnf_w"]), lnf_b=move(P["lnf_b"]), h=P["h"])
tok = tok.to(dev)
torch.mps.synchronize()

samples = []
phase = ["fwd"]
class Probe(TorchDispatchMode):
    def __torch_dispatch__(self, func, types, args=(), kwargs=None):
        out = func(*args, **(kwargs or {}))
        samples.append((phase[0], str(func.overloadpacket.__name__), torch.mps.current_allocated_memory()))
        return out

# warm up kernels once on a short sequence
model_loss(tok[:, :9], P).backward()
for t in cost.params_of(P):
    t.grad = None
torch.mps.synchronize(); torch.mps.empty_cache()
base = torch.mps.current_allocated_memory()
if mode == "nograd":
    with torch.no_grad(), Probe():
        loss = model_loss(tok, P)
    held = torch.mps.current_allocated_memory() - base
else:
    with Probe():
        loss = model_loss(tok, P, ckpt_every=cost.ck(mode))
        held = torch.mps.current_allocated_memory() - base
        phase[0] = "bwd"
        loss.backward()
torch.mps.synchronize()
peak = max(s[2] for s in samples) - base
res = dict(mode=mode, device=dev, base=base, held_after_fwd=held, peak_over_base=peak,
           n_ops=dict(fwd=sum(1 for s in samples if s[0] == "fwd"), bwd=sum(1 for s in samples if s[0] == "bwd")),
           timeline=[(s[0][0], s[1], s[2] - base) for s in samples], loss=float(loss))
os.makedirs("out", exist_ok=True)
json.dump(res, open("out/memtl_%s.json" % mode, "w"))
print(mode, "held MB", round(held / 2**20, 1), "peak MB", round(peak / 2**20, 1), res["n_ops"], "loss", round(res["loss"], 4))
