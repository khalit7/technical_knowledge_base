"""DCP beyond the root lab, on 4 CPU ranks with FSDP2: async_save (what blocks training and what does not),
loading the same checkpoint into a 2 x 2 HSDP layout, converting it to one torch.save file and back, and saving
as Hugging Face safetensors.

    sh run.sh 4 dcp_more.py         (timed parts under the bench lock)
"""
import os, shutil, time
from dptc import *
import torch.distributed.checkpoint as dcp
from torch.distributed.checkpoint.state_dict import get_state_dict, set_state_dict, get_model_state_dict
from torch.distributed.checkpoint.format_utils import dcp_to_torch_save, torch_save_to_dcp
from torch.distributed.fsdp import fully_shard
from torch.distributed.tensor import DTensor
from model import GPTConfig, make_model, get_batch, make_optimizer

rank, world = init(timeout_s=300)
cfg = GPTConfig()
D = os.path.join(SCRATCH, "dcp_more"); 
if rank == 0:
    shutil.rmtree(D, ignore_errors=True); os.makedirs(D)
dist.barrier()


def err(e):
    return type(e).__name__ + ": " + " ".join(str(e).split())[:400]


def full(p):
    return p.full_tensor() if isinstance(p, DTensor) else p.detach()


def build(mesh):
    m = make_model(cfg)
    for b in m.blocks: fully_shard(b, mesh=mesh)
    fully_shard(m, mesh=mesh)
    return m


mesh = cpu_mesh((world,), ("shard",))
model = build(mesh); opt = make_optimizer(model)
for s in range(2):
    x, y = get_batch(cfg, s * world + rank); _, l = model(x, y); l.backward(); opt.step(); opt.zero_grad(set_to_none=True)
msd, osd = get_state_dict(model, opt)
state = {"model": msd, "optim": osd}
out = {}

# 1. synchronous save vs async_save: time until control returns, and until the files are committed
dist.barrier(); t0 = time.perf_counter()
dcp.save(state, checkpoint_id=os.path.join(D, "sync"))
t_sync = time.perf_counter() - t0
dist.barrier(); t0 = time.perf_counter()
# its own gloo group, as torchtitan does (components/checkpointer/dcp.py L189): the save's collectives run on a
# background thread; on the default group they interleaved with training's and gloo aborted (inputs/dcp_async_samepg.json)
ckpt_pg = dist.new_group(backend="gloo")
fut = dcp.async_save(state, checkpoint_id=os.path.join(D, "async"), process_group=ckpt_pg)
t_return = time.perf_counter() - t0
# training can go on here; the staged copy is already in memory
x, y = get_batch(cfg, 99 + rank); _, l = model(x, y); l.backward(); opt.zero_grad(set_to_none=True)
t_step = time.perf_counter() - t0
res = fut.result() if hasattr(fut, "result") else fut.upload_completion.result()
t_done = time.perf_counter() - t0
out["async"] = {"sync_save_s": t_sync, "async_return_s": t_return, "async_after_one_fwd_bwd_s": t_step, "async_committed_s": t_done,
                "future_type": type(fut).__name__, "loadavg": os.getloadavg()}

# 2. load the 4-rank FSDP checkpoint into a 2 x 2 HSDP layout (Replicate on one axis, Shard on the other)
mesh2 = cpu_mesh((2, 2), ("replicate", "shard"))
m2 = build(mesh2); o2 = make_optimizer(m2)
msd2, osd2 = get_state_dict(m2, o2)
st2 = {"model": msd2, "optim": osd2}
dcp.load(st2, checkpoint_id=os.path.join(D, "sync"))
set_state_dict(m2, o2, model_state_dict=st2["model"], optim_state_dict=st2["optim"])
p1 = dict(model.named_parameters()); diffs = 0.0
for n, p in m2.named_parameters():
    diffs = max(diffs, (full(p) - full(p1[n])).abs().max().item())
pl = m2.blocks[0].mlp.fc.weight
out["reshard_to_hsdp"] = {"max_abs_param_diff": diffs, "non_dtensor_params_after_load": [n for n, p in m2.named_parameters() if not isinstance(p, DTensor)], "placements": [str(x_) for x_ in pl.placements],
                          "local_shape": list(pl.to_local().shape)}
# one more step on both layouts from the same state: the losses must agree
x, y = get_batch(cfg, 7 * world + rank)
la = model(x, y)[1].item(); lb = m2(x, y)[1].item()
out["reshard_to_hsdp"]["next_loss_fsdp4"] = la; out["reshard_to_hsdp"]["next_loss_hsdp"] = lb

# 3. convert to one torch.save file and back (rank 0, no process group needed)
dist.barrier()
if rank == 0:
    pt = os.path.join(D, "single.pt")
    dcp_to_torch_save(os.path.join(D, "sync"), pt)
    sd = torch.load(pt, weights_only=False)
    back = os.path.join(D, "back")
    torch_save_to_dcp(pt, back)
    files = lambda d: sorted((f, os.path.getsize(os.path.join(d, f))) for f in os.listdir(d))
    out["convert"] = {"pt_bytes": os.path.getsize(pt), "top_keys": sorted(sd.keys()), "n_model_keys": len(sd["model"]),
                      "tok_weight_shape": list(sd["model"]["tok.weight"].shape),
                      "dcp_files": files(os.path.join(D, "sync")), "back_files": files(back)}
dist.barrier()
# check the single file against the live sharded model
if rank == 0:
    sd = torch.load(os.path.join(D, "single.pt"), weights_only=False)["model"]
    mx = 0.0
p_full = {n: full(p) for n, p in model.named_parameters()}
non_dtensor = [n for n, p in model.named_parameters() if not isinstance(p, DTensor)]
if rank == 0:
    for n, t in p_full.items():
        mx = max(mx, (sd[n] - t).abs().max().item())
    out["convert"]["max_abs_diff_vs_live_model"] = mx

# 4. Hugging Face safetensors through DCP: with the tied pair, then without head.weight (as HF stores tied weights)
from torch.distributed.checkpoint import HuggingFaceStorageWriter
for variant in ("all 53 keys", "head.weight dropped"):
    msd_only = get_model_state_dict(model)
    if variant != "all 53 keys":
        msd_only.pop("head.weight")
    hf = os.path.join(D, "hf_" + str(len(msd_only)))
    try:
        dcp.save(msd_only, storage_writer=HuggingFaceStorageWriter(path=hf, save_distributed=True, enable_consolidation=True))
        dist.barrier()
        walk = []
        if rank == 0:
            for root, _, fs in os.walk(hf):
                for f in fs:
                    walk.append([os.path.relpath(os.path.join(root, f), hf), os.path.getsize(os.path.join(root, f))])
        out["hf " + variant] = {"ok": True, "files": sorted(walk)}
    except BaseException as e:      # DCP raises CheckpointException, a BaseException
        msg = " ".join(str(e).split())
        i = msg.find("Some tensors share memory")
        out["hf " + variant] = {"ok": False, "type": type(e).__name__, "error": msg[i:i + 200] if i >= 0 else msg[:300]}
        dist.barrier()
out["non_dtensor_params_fsdp4"] = non_dtensor
dump("dcp_more", rank, out)
merge("dcp_more", world)
dist.destroy_process_group()
