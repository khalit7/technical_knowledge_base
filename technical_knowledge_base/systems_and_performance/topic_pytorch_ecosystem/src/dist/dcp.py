"""Distributed checkpointing (torch.distributed.checkpoint): save an FSDP2 model and its AdamW state from 4 ranks,
then load it into 2 ranks (a different sharding) and into one plain process.

    sh run.sh 4 dcp.py save
    sh run.sh 2 dcp.py load
    python dcp.py single          # no process group

Checkpoint goes to $DST_SCRATCH/ckpt (outside the repo). Records the files, their sizes, the metadata's
chunks per tensor, and whether every loaded tensor equals the one saved.
"""
import sys, glob, shutil
from common import *
import torch.distributed.checkpoint as dcp
from torch.distributed.checkpoint.state_dict import get_state_dict, set_state_dict
from model import GPTConfig, make_model, get_batch, make_optimizer, train_step

mode = sys.argv[1]
CK = os.path.join(SCRATCH, "ckpt")
cfg = GPTConfig()


def reference():
    """The same 2 training steps in one process: the values every load must reproduce."""
    m = make_model(cfg, "cpu"); o = make_optimizer(m)
    for s in range(2):
        xs, ys = zip(*[get_batch(cfg, s * 4 + r) for r in range(4)])
        train_step(m, o, torch.cat(xs), torch.cat(ys))
    return m, o


def sharded(world):
    from torch.distributed.fsdp import fully_shard
    from torch.distributed.device_mesh import init_device_mesh
    mesh = init_device_mesh("cpu", (world,))
    m = make_model(cfg, "cpu")
    for b in m.blocks: fully_shard(b, mesh=mesh)
    fully_shard(m, mesh=mesh)
    return m, make_optimizer(m)


if mode == "save":
    rank, world = init()
    m, o = sharded(world)
    for s in range(2):
        train_step(m, o, *get_batch(cfg, s * world + rank))
    msd, osd = get_state_dict(m, o)
    full = {n: p.full_tensor() for n, p in m.named_parameters()}     # what a load must give back, exactly
    if rank == 0:
        torch.save(full, os.path.join(SCRATCH, "dcp_saved_params.pt"))
    if rank == 0 and os.path.exists(CK): shutil.rmtree(CK)
    dist.barrier()
    w = FRWindow().start(); t = now()
    dcp.save({"model": msd, "optim": osd}, checkpoint_id=CK)
    coll = w.stop()
    out = {"coll": coll, "save_ms": (now() - t) / 1e6}
    if rank == 0:
        out["files"] = sorted([[f, os.path.getsize(os.path.join(CK, f))] for f in os.listdir(CK)])
        md = dcp.FileSystemReader(CK).read_metadata()
        chunks = {}
        for k, v in md.state_dict_metadata.items():
            if hasattr(v, "chunks"):
                chunks[k] = {"size": list(v.size), "chunks": [[list(c.offsets), list(c.sizes)] for c in v.chunks]}
            else:
                chunks[k] = {"bytes_io": True}
        out["metadata"] = chunks
        files = {}
        for idx, item in md.storage_data.items():
            files.setdefault(item.relative_path, []).append([idx.fqn, list(idx.offset) if idx.offset is not None else None, item.length])
        out["storage"] = files
    dump("dcp_save", rank, out); merge("dcp_save", world); dist.destroy_process_group()
elif mode == "load":
    rank, world = init()
    m, o = sharded(world)
    msd, osd = get_state_dict(m, o)
    w = FRWindow().start()
    sd = {"model": msd, "optim": osd}
    dcp.load(sd, checkpoint_id=CK)
    set_state_dict(m, o, model_state_dict=sd["model"], optim_state_dict=sd["optim"])
    coll = w.stop()
    ref, ro = reference()
    saved = torch.load(os.path.join(SCRATCH, "dcp_saved_params.pt"))
    worst, exact = 0.0, True
    for (n, p), (_, q) in zip(m.named_parameters(), ref.named_parameters()):
        worst = max(worst, (p.full_tensor() - q).abs().max().item())
        exact = exact and torch.equal(p.full_tensor(), saved[n])
    st = o.state[next(iter(o.state))]
    loc = {n: list(p.to_local().shape) for n, p in list(m.named_parameters())[:2]}
    dump("dcp_load", rank, {"coll": coll, "max_param_diff_vs_single_process": worst, "equal_to_saved": exact, "local_shapes": loc})
    merge("dcp_load", world); dist.destroy_process_group()
else:
    from torch.distributed.checkpoint.format_utils import dcp_to_torch_save
    m = make_model(cfg, "cpu")
    sd = {"model": m.state_dict()}
    dcp.load(sd, checkpoint_id=CK, no_dist=True)       # no process group at all
    m.load_state_dict(sd["model"])
    ref, _ = reference()
    worst = max((p - q).abs().max().item() for p, q in zip(m.parameters(), ref.parameters()))
    saved = torch.load(os.path.join(SCRATCH, "dcp_saved_params.pt"))
    exact = all(torch.equal(p, saved[n]) for n, p in m.named_parameters())
    tied = m.head.weight.data_ptr() == m.tok.weight.data_ptr()
    keys = list(sd["model"].keys())
    json.dump({"env": env(), "max_param_diff_vs_single_process": worst, "tied_after_load": tied, "equal_to_saved": exact, "no_dist": True, "n_keys": len(keys),
               "has_head_key": "head.weight" in keys}, open(os.path.join(OUT, "dcp_single.json"), "w"), indent=1)
    print("wrote dcp_single", worst, tied)
