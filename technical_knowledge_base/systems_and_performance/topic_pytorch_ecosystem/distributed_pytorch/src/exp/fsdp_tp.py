"""FSDP2 x TP on 4 CPU ranks (dp 2 x tp 2), the 2-D layout of torchtitan without pipelining: TP inside each block
(q, k, v split so a column split keeps whole heads, attention input wrapped once), then fully_shard over dp.
Same recording format as fsdp_more.py (collectives of step 1 with their mesh dimension, memory, placements).

    sh run.sh 4 fsdp_tp.py
"""
from dptc import *
from dpt_parts import split_qkv
from torch.distributed.tensor import DTensor, Replicate
from torch.distributed.tensor.parallel import parallelize_module, ColwiseParallel, RowwiseParallel, PrepareModuleInput
from torch.distributed.fsdp import fully_shard
from model import GPTConfig, make_model, get_batch, make_optimizer

rank, world = init(timeout_s=120)
cfg = GPTConfig()
mesh = cpu_mesh((2, 2), ("dp", "tp"))
dp, tp = mesh.get_coordinate()
names = {"default_pg": "world"}
for d in ("dp", "tp"):
    g = mesh.get_group(d); names[g.group_desc] = d; names[g.group_name] = d
model = split_qkv(make_model(cfg))
for b in model.blocks:
    parallelize_module(b, mesh["tp"], {
        "attn": PrepareModuleInput(input_layouts=(Replicate(),), desired_input_layouts=(Replicate(),), use_local_output=False),
        "attn.q": ColwiseParallel(), "attn.k": ColwiseParallel(), "attn.v": ColwiseParallel(), "attn.proj": RowwiseParallel(),
        "mlp.fc": ColwiseParallel(), "mlp.proj": RowwiseParallel()})
for b in model.blocks:
    fully_shard(b, mesh=mesh["dp"])
fully_shard(model, mesh=mesh["dp"])
opt = make_optimizer(model)
params = []
for n, p in model.named_parameters():
    loc = p.to_local() if isinstance(p, DTensor) else p
    params.append({"name": n, "global": list(p.shape), "local": list(loc.shape),
                   "placements": [str(x) for x in p.placements] if isinstance(p, DTensor) else "plain"})
steps = []
for s in range(3):
    x, y = get_batch(cfg, s * 2 + dp)        # data differs along dp only; both tp ranks of a replica share it
    w = FRWindow().start()
    _, loss = model(x, y); loss.backward(); opt.step(); opt.zero_grad(set_to_none=True)
    steps.append({"step": s, "loss": round(loss.item(), 6),
                  "coll": [{"op": (e["profiling_name"] or "").replace("gloo:", ""), "in": e["in_bytes"], "out": e["out_bytes"],
                            "dt": (e["input_dtypes"] or ["-"])[0], "pg": names.get(e.get("process_group"), e.get("process_group")), "t": e["time_created_ns"]} for e in w.stop()]})
x, y = get_batch(cfg, 50 * 2 + dp)
def one():
    _, l = model(x, y); l.backward(); opt.step(); opt.zero_grad(set_to_none=True)
_, m = profile_memory(one)
mem = {"peak_delta": m["peak_delta"], "start_live": m["start_live"],
       "state": {"params": live_bytes_of(list(model.parameters())),
                 "opt_state": live_bytes_of([v for s_ in opt.state.values() for v in s_.values() if torch.is_tensor(v)])}}
dump("fsdpm_fsdp_tp", rank, {"mode": "fsdp_tp", "params": params, "steps": steps, "mem": mem,
                             "groups": {d: dist.get_process_group_ranks(mesh.get_group(d)) for d in ("dp", "tp")}})
merge("fsdpm_fsdp_tp", world)
dist.destroy_process_group()
