"""FSDP2 beyond the root lab, on CPU gloo ranks: MixedPrecisionPolicy, CPU offload, reshard_after_forward as an
int, HSDP on a 2 x 2 mesh, explicit prefetching, gradient accumulation without sync, state dicts, and FSDP1.

    sh run.sh 2 fsdp_more.py mp        sh run.sh 4 fsdp_more.py hsdp       sh run.sh 4 fsdp_more.py raf2
    sh run.sh 4 fsdp_more.py fsdp4     sh run.sh 4 fsdp_more.py ddp4       sh run.sh 4 fsdp_more.py prefetch
    sh run.sh 2 fsdp_more.py offload   sh run.sh 2 fsdp_more.py accum      sh run.sh 2 fsdp_more.py fsdp1
Rank r trains on batch s*world + r at step s (HSDP: the same), so losses compare with the root lab's DDP and FSDP2.
"""
import argparse, os, time
from dptc import *
import torch.nn as nn
from torch.distributed.fsdp import fully_shard, MixedPrecisionPolicy, CPUOffloadPolicy
from torch.distributed.tensor import DTensor
from model import GPTConfig, make_model, get_batch, make_optimizer

ap = argparse.ArgumentParser()
ap.add_argument("mode")
ap.add_argument("--steps", type=int, default=3)
ap.add_argument("--tag")
a = ap.parse_args()
rank, world = init(timeout_s=120)
cfg = GPTConfig()


def err(e):
    return type(e).__name__ + ": " + " ".join(str(e).split())[:500]


def pg_names(meshes):
    """flight-recorder process-group description -> readable mesh-dimension name"""
    m = {}
    for mesh in meshes:
        for d in (mesh.mesh_dim_names or [f"dim{i}" for i in range(mesh.ndim)]):
            g = mesh.get_group(d)
            m[g.group_desc] = d
            m[g.group_name] = d
    m["default_pg"] = "world"
    return m


def coll(ent, names):
    out = []
    for e in ent:
        out.append({"op": (e["profiling_name"] or "").replace("gloo:", ""), "in": e["in_bytes"], "out": e["out_bytes"],
                    "dt": (e["input_dtypes"] or ["-"])[0], "pg": names.get(e.get("process_group"), e.get("process_group")), "t": e["time_created_ns"]})
    return out


def params_info(model):
    out = []
    for n, p in model.named_parameters():
        loc = p.to_local() if isinstance(p, DTensor) else p
        out.append({"name": n, "global": list(p.shape), "local": list(loc.shape), "dtype": str(loc.dtype).replace("torch.", ""),
                    "placements": [str(x) for x in p.placements] if isinstance(p, DTensor) else "plain", "local_bytes": loc.numel() * loc.element_size()})
    return out


def train(model, opt, names, marks=None, steps=None, extra=None):
    rows = []
    for s in range(steps or a.steps):
        x, y = get_batch(cfg, s * world + rank)
        if marks is not None: marks.clear()
        w = FRWindow().start()
        t0 = now(); _, loss = model(x, y); t1 = now(); loss.backward(); t2 = now()
        opt.step(); opt.zero_grad(set_to_none=True); t3 = now()
        r = {"step": s, "loss": round(loss.item(), 6), "coll": coll(w.stop(), names), "t": [t0, t1, t2, t3]}
        if marks is not None: r["marks"] = list(marks)
        rows.append(r)
    return rows


def mem_step(model, opt):
    x, y = get_batch(cfg, 50 * world + rank)
    def one():
        _, l = model(x, y); mark("fwd"); l.backward(); mark("bwd"); opt.step(); opt.zero_grad(set_to_none=True)
    _, m = profile_memory(one)
    st = {"params": live_bytes_of(list(model.parameters())),
          "opt_state": live_bytes_of([v for s_ in opt.state.values() for v in s_.values() if torch.is_tensor(v)])}
    return {"peak_delta": m["peak_delta"], "start_live": m["start_live"], "state": st}


def shard(model, mesh, **kw):
    for blk in model.blocks:
        fully_shard(blk, mesh=mesh, **kw)
    fully_shard(model, mesh=mesh, **kw)
    return model


out = {"mode": a.mode}
if a.mode in ("fsdp4", "ddp4", "hsdp", "raf2", "mp", "mp_bf16reduce"):
    if a.mode == "hsdp":
        mesh = cpu_mesh((2, 2), ("replicate", "shard"))
    else:
        mesh = cpu_mesh((world,), ("shard",))
    names = pg_names([mesh])
    model = make_model(cfg)
    w = FRWindow().start()
    if a.mode == "ddp4":
        from torch.nn.parallel import DistributedDataParallel as DDP
        model = DDP(model); names = {"default_pg": "world"}
    elif a.mode == "raf2":
        shard(model, mesh, reshard_after_forward=2)
    elif a.mode.startswith("mp"):
        mp = MixedPrecisionPolicy(param_dtype=torch.bfloat16,
                                  reduce_dtype=torch.bfloat16 if a.mode == "mp_bf16reduce" else torch.float32)
        shard(model, mesh, mp_policy=mp)
        out["mp_policy"] = str(mp)
    else:
        shard(model, mesh)
    out["init_coll"] = coll(w.stop(), names)
    inner = model.module if a.mode == "ddp4" else model
    out["params"] = params_info(inner)
    opt = make_optimizer(inner)
    marks = []
    for i, blk in enumerate(inner.blocks):
        blk.register_forward_pre_hook(lambda m, a_, i=i: marks.append(["fwd_start", i, now()]))
        blk.register_full_backward_hook(lambda m, gi, go, i=i: marks.append(["bwd_end", i, now()]))
    out["steps"] = train(model, opt, names, marks)
    out["mem"] = mem_step(model, opt)
    if a.mode == "raf2" or a.mode == "hsdp":
        # which ranks are in each group this rank talks to
        out["groups"] = {d: dist.get_process_group_ranks(mesh.get_group(d)) for d in mesh.mesh_dim_names}
        if a.mode == "raf2":
            # the post-forward mesh FSDP2 builds for reshard_after_forward=2 (an intra-node style group of 2)
            st = inner.blocks[0]._get_fsdp_state()
            pg = st._fsdp_param_group
            pfm = getattr(pg, "post_forward_mesh_info", None)
            out["post_forward_mesh"] = None if pfm is None else {"mesh": pfm.mesh.mesh.tolist(),
                                       "shard_group_ranks": dist.get_process_group_ranks(pfm.shard_process_group)}
            out["post_forward_group_names"] = None if pfm is None else pfm.shard_process_group.group_desc
elif a.mode == "prefetch":
    mesh = cpu_mesh((world,), ("shard",)); names = pg_names([mesh])
    res = {}
    for variant in ("implicit (default)", "explicit, 2 ahead"):
        model = shard(make_model(cfg), mesh)
        blocks = list(model.blocks)
        if variant.startswith("explicit"):
            for i, b in enumerate(blocks):
                b.set_modules_to_forward_prefetch(blocks[i + 1:i + 3])
                b.set_modules_to_backward_prefetch(list(reversed(blocks[max(0, i - 2):i])))
        opt = make_optimizer(model)
        marks = []
        for i, blk in enumerate(blocks):
            blk.register_forward_pre_hook(lambda m, a_, i=i: marks.append(["fwd_start", i, now()]))
            blk.register_forward_hook(lambda m, a_, o, i=i: marks.append(["fwd_end", i, now()]))
            blk.register_full_backward_pre_hook(lambda m, go, i=i: marks.append(["bwd_start", i, now()]))
            blk.register_full_backward_hook(lambda m, gi, go, i=i: marks.append(["bwd_end", i, now()]))
        rows = train(model, opt, names, marks)
        res[variant] = {"steps": rows, "mem": mem_step(model, opt)}
        dist.barrier()
    out["variants"] = res
elif a.mode == "offload":
    mesh = cpu_mesh((world,), ("shard",)); names = pg_names([mesh])
    model = make_model(cfg)
    try:
        shard(model, mesh, offload_policy=CPUOffloadPolicy())
        opt = make_optimizer(model)
        out["steps"] = train(model, opt, names)
        out["ok"] = True
    except Exception as e:
        out["ok"] = False; out["error"] = err(e)
elif a.mode == "accum":
    mesh = cpu_mesh((world,), ("shard",)); names = pg_names([mesh])
    res = {}
    for variant in ("sync every micro-batch", "set_requires_gradient_sync(False) for 3 of 4"):
        model = shard(make_model(cfg), mesh)
        w = FRWindow().start()
        for m_ in range(4):
            last = m_ == 3
            if variant.startswith("set_"):
                model.set_requires_gradient_sync(last)
            x, y = get_batch(cfg, 10 * m_ + rank)
            _, l = model(x, y); (l / 4).backward()
        ent = coll(w.stop(), names)
        g = [p.grad.to_local().detach().clone() for p in model.parameters()]
        res[variant] = {"n_coll": len(ent), "ops": {}, "bytes_in": sum(e["in"] for e in ent), "grads": g}
        for e in ent:
            res[variant]["ops"][e["op"]] = res[variant]["ops"].get(e["op"], 0) + 1
        dist.barrier()
    g1, g2 = [res[k].pop("grads") for k in res]
    out["variants"] = res
    out["max_abs_grad_diff"] = max((x_ - y_).abs().max().item() for x_, y_ in zip(g1, g2))
elif a.mode == "statedict":
    mesh = cpu_mesh((world,), ("shard",)); names = pg_names([mesh])
    model = shard(make_model(cfg), mesh)
    w = FRWindow().start()
    sd = model.state_dict()
    e1 = coll(w.stop(), names)
    from torch.distributed.checkpoint.state_dict import get_model_state_dict, StateDictOptions
    w = FRWindow().start()
    full = get_model_state_dict(model, options=StateDictOptions(full_state_dict=True, cpu_offload=True))
    e2 = coll(w.stop(), names)
    out["sharded_state_dict"] = {"n_coll": len(e1), "n_keys": len(sd), "types": sorted({type(v).__name__ for v in sd.values()})}
    out["full_state_dict"] = {"n_coll": len(e2), "ops": sorted({e["op"] for e in e2}), "bytes_out": sum(e["out"] for e in e2),
                              "n_keys": len(full), "rank_has_values": len(full) > 0}
elif a.mode == "fsdp1":
    import warnings
    from torch.distributed.fsdp import FullyShardedDataParallel as FSDP1
    from torch.distributed.fsdp.wrap import ModuleWrapPolicy
    from model import Block
    with warnings.catch_warnings(record=True) as wl:
        warnings.simplefilter("always")
        try:
            model = make_model(cfg)
            w = FRWindow().start()
            m1 = FSDP1(model, auto_wrap_policy=ModuleWrapPolicy({Block}), device_id=torch.device("cpu"), use_orig_params=False)
            out["init_coll"] = len(w.stop())
            flat = [{"name": n, "shape": list(p.shape)} for n, p in m1.named_parameters()]
            out["flat_params"] = flat
            opt = torch.optim.AdamW(m1.parameters(), lr=6e-4)
            out["steps"] = train(m1, opt, {"default_pg": "world"}, steps=2)
            out["ok"] = True
        except Exception as e:
            out["ok"] = False; out["error"] = err(e)
        # frozen and trainable parameters in one unit (LoRA-like): freeze every block's qkv
        frozen = {}
        for api in ("fsdp1 use_orig_params=False", "fsdp2"):
            try:
                mdl = make_model(cfg)
                for b in mdl.blocks:
                    b.attn.qkv.weight.requires_grad_(False)
                if api == "fsdp2":
                    shard(mdl, cpu_mesh((world,), ("shard",)))
                else:
                    mdl = FSDP1(mdl, auto_wrap_policy=ModuleWrapPolicy({Block}), device_id=torch.device("cpu"), use_orig_params=False)
                x, y = get_batch(cfg, rank)
                _, l = mdl(x, y); l.backward()
                frozen[api] = {"ok": True}
            except Exception as e:
                frozen[api] = {"ok": False, "error": err(e)}
        out["frozen_mixed"] = frozen
        out["warnings"] = sorted({str(x.message).split("\n")[0][:300] for x in wl if "FSDP" in str(x.message) or "deprecat" in str(x.message).lower()})
tag = a.tag or ("fsdpm_" + a.mode)
dump(tag, rank, out)
merge(tag, world)
dist.destroy_process_group()
