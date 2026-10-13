"""FSDP2 (fully_shard) on the running example: per-parameter DTensor shards, all-gather before each block's
forward and backward, reduce-scatter of its gradients, and what reshard_after_forward changes.

    sh run.sh 2 fsdp.py --tag fsdp_w2              # reshard_after_forward=None, the default: True for blocks, False for the root
    sh run.sh 2 fsdp.py --no-reshard --tag fsdp_w2_nr
    sh run.sh 4 fsdp.py --tag fsdp_w4

fully_shard is applied to each Block, then to the root (embeddings, ln_f, tied head), the torchtitan pattern.
Rank r trains on batch s*world + r at step s, the same batches as ddp.py, so losses must match DDP's.
"""
import argparse
from common import *
from torch.distributed.fsdp import fully_shard
from torch.distributed.tensor import DTensor
from model import GPTConfig, make_model, get_batch, make_optimizer

ap = argparse.ArgumentParser()
ap.add_argument("--no-reshard", action="store_true")
ap.add_argument("--tag", required=True)
ap.add_argument("--steps", type=int, default=3)
ap.add_argument("--layers", type=int, default=4)
ap.add_argument("--d", type=int, default=256)
a = ap.parse_args()

rank, world = init()
cfg = GPTConfig(n_layer=a.layers, d_model=a.d)
model = make_model(cfg, "cpu")
full_bytes = live_bytes_of(list(model.parameters()))
w = FRWindow().start()
# an explicit CPU mesh: without it, fully_shard builds a default mesh on the "current accelerator", which on a
# Mac is MPS, and fails (torch.mps has no is_initialized at 2.14.1); see README
from torch.distributed.device_mesh import init_device_mesh
mesh = init_device_mesh("cpu", (world,))
for blk in model.blocks:
    fully_shard(blk, mesh=mesh, reshard_after_forward=(False if a.no_reshard else None))
fully_shard(model, mesh=mesh, reshard_after_forward=(False if a.no_reshard else None))
init_coll = w.stop()
opt = make_optimizer(model)
params = []
for n, p in model.named_parameters():
    loc = p.to_local() if isinstance(p, DTensor) else p
    params.append({"name": n, "global": list(p.shape), "local": list(loc.shape),
                   "placements": str(p.placements) if isinstance(p, DTensor) else "plain", "local_bytes": loc.numel() * 4})

marks = []
for i, blk in enumerate(model.blocks):
    blk.register_forward_pre_hook(lambda m, a_, i=i: marks.append(["fwd_start", i, now()]))
    blk.register_forward_hook(lambda m, a_, o, i=i: marks.append(["fwd_end", i, now()]))

steps = []
for s in range(a.steps):
    x, y = get_batch(cfg, s * world + rank)
    marks.clear()
    w = FRWindow().start()
    t0 = now(); _, loss = model(x, y); t1 = now(); loss.backward(); t2 = now()
    opt.step(); opt.zero_grad(set_to_none=True); t3 = now()
    steps.append({"step": s, "loss": loss.item(), "coll": w.stop(), "marks": list(marks),
                  "t": {"fwd0": t0, "fwd1": t1, "bwd1": t2, "opt1": t3}})

x, y = get_batch(cfg, a.steps * world + rank)
fwd_only = {}
def fwd():
    return model(x, y)[1]
l, fwd_only = profile_memory(fwd)
del l
for m_ in model.modules():
    if hasattr(m_, "reshard"): m_.reshard()   # no-reshard mode leaves the forward's gathered parameters in place; start the profiled step sharded
def one():
    _, l = model(x, y); mark("fwd"); l.backward(); mark("bwd"); opt.step(); opt.zero_grad(set_to_none=True)
_, mem = profile_memory(one)
state = {"params": live_bytes_of(list(model.parameters())), "full_params_one_process": full_bytes,
         "opt_state": live_bytes_of([v for st in opt.state.values() for v in st.values() if torch.is_tensor(v)])}
dump(a.tag, rank, {"args": vars(a), "init_coll": init_coll, "steps": steps, "params": params,
                   "mem": mem, "mem_fwd": fwd_only, "state": state})
merge(a.tag, world)
dist.destroy_process_group()
