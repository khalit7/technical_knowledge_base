"""Tensor parallel on the running example's MLPs (fc ColwiseParallel, proj RowwiseParallel), and what goes wrong
if the same plan is applied to its fused qkv projection.

    sh run.sh 2 tp.py          # TP of 2 on the MLPs; every rank sees the same batch
    sh run.sh 4 tp.py --2d     # 2-D: FSDP2 over dp=2, TP over tp=2 (the torchtitan layout)
"""
import argparse
from common import *
from torch.distributed.device_mesh import init_device_mesh
from torch.distributed.tensor import DTensor
from torch.distributed.tensor.parallel import parallelize_module, ColwiseParallel, RowwiseParallel
from torch.distributed.tensor.debug import CommDebugMode
from model import GPTConfig, make_model, get_batch, make_optimizer

ap = argparse.ArgumentParser(); ap.add_argument("--2d", dest="two_d", action="store_true"); a = ap.parse_args()
rank, world = init()
cfg = GPTConfig()
out = {}
if not a.two_d:
    mesh = init_device_mesh("cpu", (world,), mesh_dim_names=("tp",))
    ref = make_model(cfg, "cpu")
    model = make_model(cfg, "cpu")
    for blk in model.blocks:
        parallelize_module(blk.mlp, mesh, {"fc": ColwiseParallel(), "proj": RowwiseParallel()})
    x, y = get_batch(cfg, 0)                     # the same batch on every TP rank
    w = FRWindow().start()
    with CommDebugMode() as cm:
        _, loss = model(x, y); mark("fwd"); f_n = len(fr_entries()[0])
        loss.backward()
    coll = w.stop()
    _, rl = ref(x, y); rl.backward()
    diffs = {}
    for (n, p), (_, q) in zip(model.named_parameters(), ref.named_parameters()):
        g = p.grad
        if isinstance(g, DTensor):
            g = g.full_tensor()
        diffs[n] = (g - q.grad).abs().max().item()
    locs = {n: {"global": list(p.shape), "local": list((p.to_local() if isinstance(p, DTensor) else p).shape),
                "placements": str(p.placements) if isinstance(p, DTensor) else "plain"}
            for n, p in model.named_parameters() if "blocks.0.mlp" in n}
    out["mlp_tp"] = {"loss": loss.item(), "ref_loss": rl.item(), "max_grad_diff": max(diffs.values()),
                     "coll": coll, "n_fwd": f_n - w.n0, "logical": {str(k).split(".")[-1]: v for k, v in cm.get_comm_counts().items()},
                     "params_block0": locs}
    # the same plan on the fused qkv projection
    m2 = make_model(cfg, "cpu")
    try:
        parallelize_module(m2.blocks[0].attn, mesh, {"qkv": ColwiseParallel(), "proj": RowwiseParallel()})
        loc = m2.blocks[0].attn.qkv.weight.to_local()
        out["qkv_tp_local_rows"] = [rank * loc.shape[0], (rank + 1) * loc.shape[0]]
        m2(x, y)
        out["qkv_tp"] = {"ok": True}
    except Exception as e:
        out["qkv_tp"] = {"ok": False, "error": (type(e).__name__ + ": " + str(e).strip().splitlines()[0])[:300]}
    tag = f"tp_w{world}"
else:
    from torch.distributed.fsdp import fully_shard
    mesh = init_device_mesh("cpu", (2, world // 2), mesh_dim_names=("dp", "tp"))
    model = make_model(cfg, "cpu")
    for blk in model.blocks:
        parallelize_module(blk.mlp, mesh["tp"], {"fc": ColwiseParallel(), "proj": RowwiseParallel()})
        fully_shard(blk, mesh=mesh["dp"])
    fully_shard(model, mesh=mesh["dp"])
    opt = make_optimizer(model)
    dp = mesh["dp"].get_local_rank()
    x, y = get_batch(cfg, dp)                    # one batch per data-parallel group, shared by its TP ranks
    w = FRWindow().start()
    _, loss = model(x, y); loss.backward(); opt.step()
    coll = w.stop()
    _, pgs = fr_entries()
    p = model.blocks[0].mlp.fc.weight
    out["fsdp_tp"] = {"loss": loss.item(), "coord": mesh.get_coordinate(), "coll": coll, "pg_config": pgs,
                      "fc_weight": {"global": list(p.shape), "local": list(p.to_local().shape), "placements": str(p.placements),
                                    "mesh_dims": list(p.device_mesh.mesh_dim_names)}}
    tag = f"tp2d_w{world}"
dump(tag, rank, out)
merge(tag, world)
dist.destroy_process_group()
