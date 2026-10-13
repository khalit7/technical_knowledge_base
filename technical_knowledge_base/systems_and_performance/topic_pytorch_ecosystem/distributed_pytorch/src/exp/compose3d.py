"""PP x FSDP x TP on 8 CPU ranks (2 x 2 x 2), composed the way torchtitan 0.3.0 does it: build the mesh with tp
innermost, split the model into pipeline stages, then on each stage apply TP, then fully_shard over the dp axis,
then run a pipeline schedule. The tied embedding / head live on different stages: their gradients are summed over
the pp axis by hand. Checked against one process on the same 16 sequences.

    sh run.sh 8 compose3d.py
"""
import os
import torch.nn.functional as F
from dptc import *
from dpt_parts import split_qkv, Piece
from torch.distributed.tensor import DTensor, Shard, Replicate
from torch.distributed.tensor.parallel import parallelize_module, ColwiseParallel, RowwiseParallel, PrepareModuleInput
from torch.distributed.fsdp import fully_shard
from torch.distributed.pipelining import PipelineStage, Schedule1F1B
from model import GPTConfig, make_model, get_batch

rank, world = init(timeout_s=60)
assert world == 8
cfg = GPTConfig()
mesh = cpu_mesh((2, 2, 2), ("pp", "dp", "tp"))
pp, dp, tp = mesh.get_coordinate()
names = {}
for d in ("pp", "dp", "tp"):
    g = mesh.get_group(d); names[g.group_desc] = d; names[g.group_name] = d
names["default_pg"] = "world"

full = split_qkv(make_model(cfg))
stage_mod = Piece(full, 0, 2) if pp == 0 else Piece(full, 2, 4)
# 1. tensor parallel inside each block (tp axis)
for b in stage_mod.blocks:
    parallelize_module(b, mesh["tp"], {
        "attn": PrepareModuleInput(input_layouts=(Replicate(),), desired_input_layouts=(Replicate(),), use_local_output=False),
        "attn.q": ColwiseParallel(), "attn.k": ColwiseParallel(), "attn.v": ColwiseParallel(), "attn.proj": RowwiseParallel(),
        "mlp.fc": ColwiseParallel(), "mlp.proj": RowwiseParallel()})
# 2. FSDP2 over the dp axis: each block, then the stage
for b in stage_mod.blocks:
    fully_shard(b, mesh=mesh["dp"])
fully_shard(stage_mod, mesh=mesh["dp"])
# 3. pipeline over the pp axis
stage = PipelineStage(stage_mod, pp, 2, torch.device("cpu"), group=mesh.get_group("pp"))
loss_fn = lambda logits, y: F.cross_entropy(logits.reshape(-1, logits.size(-1)), y.reshape(-1))
sched = Schedule1F1B(stage, n_microbatches=4, loss_fn=loss_fn)

info = []
for n, p in stage_mod.named_parameters():
    if n.startswith("blocks.0.") or n in ("tok.weight", "head.weight", "ln_f.weight"):
        loc = p.to_local() if isinstance(p, DTensor) else p
        info.append({"name": n, "global": list(p.shape), "local": list(loc.shape),
                     "mesh": list(p.device_mesh.mesh_dim_names) if isinstance(p, DTensor) else None,
                     "placements": [str(x) for x in p.placements] if isinstance(p, DTensor) else "plain"})
x, y = get_batch(cfg, dp)                 # dp rank d trains on batch d; tp and pp ranks of one replica share it
w = FRWindow().start()
losses = []
if pp == 0:
    sched.step(x)
else:
    sched.step(target=y, losses=losses)
# tied weight: stage 0 has the embedding copy, stage 1 the head copy; sum over pp
tied = stage_mod.tok.weight if pp == 0 else stage_mod.head.weight   # FSDP2 registered new (DTensor) parameters on the stage's modules
g = tied.grad
if isinstance(g, DTensor):
    loc = g.to_local(); dist.all_reduce(loc, group=mesh.get_group("pp"))
ent = w.stop()
coll = [{"op": (e["profiling_name"] or "").replace("gloo:", ""), "in": e["in_bytes"], "pg": names.get(e.get("process_group"), e.get("process_group")),
         "p2p": bool(e["is_p2p"])} for e in ent]
# reference: one process, both dp batches (16 sequences)
ref = split_qkv(make_model(cfg))
xs, ys = zip(*[get_batch(cfg, d) for d in range(2)])
_, rl = ref(torch.cat(xs), torch.cat(ys)); rl.backward()
rp = dict(ref.named_parameters())
diff = 0.0
for n, p in stage_mod.named_parameters():
    if p.grad is None: continue
    gfull = p.grad.full_tensor() if isinstance(p.grad, DTensor) else p.grad
    if n.startswith("blocks."):
        i = int(n.split(".")[1]) + (0 if pp == 0 else 2); rn = f"blocks.{i}." + n.split(".", 2)[2]
    else:
        rn = "tok.weight" if n == "head.weight" else n
    diff = max(diff, (gfull - rp[rn].grad).abs().max().item())
local_param_bytes = sum((p.to_local() if isinstance(p, DTensor) else p).numel() * 4 for p in stage_mod.parameters())
dump("compose3d", rank, {"coord": {"pp": pp, "dp": dp, "tp": tp},
     "groups": {d: dist.get_process_group_ranks(mesh.get_group(d)) for d in ("pp", "dp", "tp")},
     "params": info, "coll": coll, "losses": [l.item() for l in losses], "ref_loss": rl.item(), "max_grad_diff": diff,
     "local_param_bytes": local_param_bytes, "full_param_bytes": sum(p.numel() for p in ref.parameters()) * 4})
merge("compose3d", world)
dist.destroy_process_group()
