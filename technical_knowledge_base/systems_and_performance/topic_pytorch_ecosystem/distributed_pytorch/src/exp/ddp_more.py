"""DDP internals beyond the root lab, on CPU gloo ranks: communication hooks (bytes and gradient error),
no_sync for gradient accumulation, unused parameters (find_unused_parameters, static_graph), and uneven inputs (Join).

    sh run.sh 2 ddp_more.py hooks --tag hooks_w2     (and 4 ranks: hooks_w4)
    sh run.sh 2 ddp_more.py nosync
    sh run.sh 2 ddp_more.py unused
    sh run.sh 2 ddp_more.py join
"""
import argparse, os, time
from dptc import *
import torch.nn as nn
from torch.nn.parallel import DistributedDataParallel as DDP
from torch.distributed.algorithms.ddp_comm_hooks import default_hooks as dh, powerSGD_hook as ps
from model import GPTConfig, make_model, get_batch, make_optimizer

ap = argparse.ArgumentParser()
ap.add_argument("mode")
ap.add_argument("--tag")
ap.add_argument("--steps", type=int, default=30)
ap.add_argument("--variant", type=int, default=None, help="hooks: run only this variant (one clean process per hook)")
a = ap.parse_args()
rank, world = init(timeout_s=int(os.environ.get("DPT_TIMEOUT", "60")))
cfg = GPTConfig()


def err(e):
    s = str(e).replace("\n", " ")
    return type(e).__name__ + ": " + " ".join(s.split())[:600]


def hooks():
    """Each hook trains the running example for a.steps steps from the same weights on the same batches.
    Per step: bytes on the wire per rank (flight recorder), relative error of the hook's averaged gradient against
    the exact average of the same local gradients, and the loss."""
    if a.mode == "batched":   # breaks the reducer (see the page): run alone, results written without a final barrier
        variants = [("batched powerSGD rank 4", lambda st: ps.batched_powerSGD_hook, dict(matrix_approximation_rank=4))]
    else:
      variants = [("none (built-in all-reduce)", None, None),
                ("allreduce_hook", lambda st: dh.allreduce_hook, None),
                ("fp16_compress_hook", lambda st: dh.fp16_compress_hook, None),
                ("bf16_compress_hook", lambda st: dh.bf16_compress_hook, None),
                ("powerSGD rank 1", lambda st: ps.powerSGD_hook, dict(matrix_approximation_rank=1)),
                ("powerSGD rank 4", lambda st: ps.powerSGD_hook, dict(matrix_approximation_rank=4)),
                ("powerSGD rank 16", lambda st: ps.powerSGD_hook, dict(matrix_approximation_rank=16)),
                ("powerSGD rank 4, no error feedback", lambda st: ps.powerSGD_hook, dict(matrix_approximation_rank=4, use_error_feedback=False))]
    if a.variant is not None:
        variants = [variants[a.variant]]
    res = []
    ref_pg = dist.new_group(list(range(world)))
    ref_name = ref_pg.group_name   # reference all-reduces on their own group (see the page: on the default
                                                  # group, interleaving with PowerSGD's callback-issued all-reduces aborted gloo)
    for name, hk, kw in variants:
        print("variant", name, flush=True)
        model = make_model(cfg)
        ddp = DDP(model)
        state = None
        if hk is not None:
            if kw is not None:
                state = ps.PowerSGDState(process_group=None, start_powerSGD_iter=2, **kw)
            try:
                ddp.register_comm_hook(state, hk(state))
            except Exception as e:
                res.append({"hook": name, "kwargs": kw, "error": err(e)}); dist.barrier(); continue
        opt = make_optimizer(model)
        rows = []
        try:
          for s in range(a.steps):
            x, y = get_batch(cfg, s * world + rank)
            # exact reference: local gradient without communication, then a plain all-reduce average
            with ddp.no_sync():
                _, l0 = ddp(x, y); l0.backward()
            exact = [p.grad.detach().clone() for p in model.parameters()]
            for g in exact:
                dist.all_reduce(g, group=ref_pg); g.div_(world)
            opt.zero_grad(set_to_none=True)
            w = FRWindow().start()
            _, loss = ddp(x, y); loss.backward()
            ent = [e for e in w.stop() if e.get("process_group") != ref_name]
            num = sum(((p.grad - g) ** 2).sum().item() for p, g in zip(model.parameters(), exact))
            den = sum((g ** 2).sum().item() for g in exact)
            opt.step(); opt.zero_grad(set_to_none=True)
            rows.append({"step": s, "loss": round(loss.item(), 6), "rel_err": (num / den) ** 0.5,
                         "n_coll": len(ent), "bytes_in": sum(e["in_bytes"] for e in ent),
                         "ops": sorted({(e["profiling_name"] or "").replace("gloo:", "") for e in ent}),
                         "dtypes": sorted({d for e in ent for d in (e["input_dtypes"] or [])})})
        except Exception as e:
            res.append({"hook": name, "kwargs": kw, "error": err(e), "failed_at_step": len(rows), "steps": rows})
            if a.mode == "batched": break
            dist.barrier(); continue
        res.append({"hook": name, "kwargs": kw, "steps": rows})
        dist.barrier()
    if a.mode == "batched":
        return {"variants": res}
    return {"variants": res, "model_bytes_fp32": sum(p.numel() for p in make_model(cfg).parameters()) * 4}


def nosync():
    """Gradient accumulation over 4 micro-batches: all-reduce every micro-batch, against no_sync on the first 3."""
    out = {}
    for mode in ("sync every micro-batch", "no_sync for 3 of 4"):
        model = make_model(cfg); ddp = DDP(model)
        # warm step so buckets are rebuilt (step 0 uses one bucket)
        x, y = get_batch(cfg, 100 + rank); _, l = ddp(x, y); l.backward(); model.zero_grad(set_to_none=True)
        w = FRWindow().start()
        for m in range(4):
            x, y = get_batch(cfg, 10 * m + rank)
            if mode.startswith("no_sync") and m < 3:
                with ddp.no_sync():
                    _, l = ddp(x, y); (l / 4).backward()
            else:
                _, l = ddp(x, y); (l / 4).backward()
        ent = w.stop()
        out[mode] = {"n_coll": len(ent), "bytes_in": sum(e["in_bytes"] for e in ent),
                     "coll": [[(e["profiling_name"] or "").replace("gloo:", ""), e["in_bytes"]] for e in ent],
                     "grads": [p.grad.detach().clone() for p in model.parameters()]}
    g1, g2 = out["sync every micro-batch"].pop("grads"), out["no_sync for 3 of 4"].pop("grads")
    out["max_abs_grad_diff"] = max((a_ - b_).abs().max().item() for a_, b_ in zip(g1, g2))
    return out


class WithAux(nn.Module):
    """The running example plus one extra Linear that forward uses only when asked: an unused parameter."""
    def __init__(self):
        super().__init__()
        self.gpt = make_model(cfg)
        self.aux = nn.Linear(cfg.d_model, cfg.d_model)

    def forward(self, x, y, use_aux=False):
        logits, loss = self.gpt(x, y)
        if use_aux:
            loss = loss + 0.0 * self.aux(self.gpt.tok(x)).sum()
        return logits, loss


def unused():
    out = {}
    cases = [("default", {}, lambda s: False),
             ("find_unused_parameters=True", {"find_unused_parameters": True}, lambda s: False),
             ("static_graph=True", {"static_graph": True}, lambda s: False),
             ("aux used on rank 0 only, find_unused_parameters=True", {"find_unused_parameters": True}, lambda s: rank == 0)]
    for name, kw, use in cases:
        torch.manual_seed(0)
        m = WithAux(); ddp = DDP(m, **kw); opt = make_optimizer(m)
        rec = {"steps": []}
        try:
            for s in range(3):
                x, y = get_batch(cfg, s * world + rank)
                w = FRWindow().start()
                _, loss = ddp(x, y, use_aux=use(s)); loss.backward()
                ent = w.stop()
                rec["steps"].append({"step": s, "loss": round(loss.item(), 6), "n_coll": len(ent),
                                     "bytes_in": sum(e["in_bytes"] for e in ent), "aux_grad_none": m.aux.weight.grad is None,
                                     "coll": [[(e["profiling_name"] or "").replace("gloo:", ""), e["in_bytes"]] for e in ent]})
                opt.step(); opt.zero_grad(set_to_none=True)
            rec["ok"] = True
        except Exception as e:
            rec["ok"] = False; rec["error"] = err(e); rec["failed_at_step"] = len(rec["steps"])
        out[name] = rec
        dist.barrier()
    return out


def join():
    """Uneven inputs: rank 0 has 5 batches, rank 1 has 3. Without Join the extra all-reduces have no partner."""
    from torch.distributed.algorithms.join import Join
    out = {}
    nb = 5 if rank == 0 else 3
    model = make_model(cfg); ddp = DDP(model); opt = make_optimizer(model)
    w = FRWindow().start()
    t0 = time.time()
    with Join([ddp]):
        for s in range(nb):
            x, y = get_batch(cfg, s * world + rank)
            _, l = ddp(x, y); l.backward(); opt.step(); opt.zero_grad(set_to_none=True)
    ent = w.stop()
    out["with_join"] = {"batches": nb, "n_coll": len(ent), "ops": [(e["profiling_name"] or "").replace("gloo:", "") for e in ent],
                        "bytes": [e["in_bytes"] for e in ent]}
    dist.barrier()
    # without Join: the rank with more batches waits for a partner that has left the loop
    model = make_model(cfg); ddp = DDP(model); opt = make_optimizer(model)
    t0 = time.time()
    try:
        for s in range(nb):
            x, y = get_batch(cfg, s * world + rank)
            _, l = ddp(x, y); l.backward(); opt.step(); opt.zero_grad(set_to_none=True)
        dist.barrier()
        out["without_join"] = {"ok": True}
    except Exception as e:
        out["without_join"] = {"ok": False, "error": err(e), "seconds": round(time.time() - t0, 1)}
    return out


res = {"hooks": hooks, "batched": hooks, "nosync": nosync, "unused": unused, "join": join}[a.mode]()
tag = a.tag or a.mode
dump(tag, rank, {"mode": a.mode, "result": res})
if a.mode in ("join", "batched"):
    # ranks may be broken after the hang; write without the merge barrier
    os.replace(os.path.join(OUT, f"{tag}.rank{rank}.json"), os.path.join(OUT, f"{tag}.rank{rank}.json"))
    print("wrote per-rank", tag)
else:
    merge(tag, world)
    dist.destroy_process_group()
