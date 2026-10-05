"""Forward against backward: FLOPs (FlopCounterMode), wall-clock time and memory, with and without
activation checkpointing, on a small GPT-style stack on CPU (2 threads).
usage: python cost.py flops | time <mode> | mem <mode>      mode: none, ckpt1 (every block), ckpt2 (every other block)
Each 'mem' run is a fresh process; memory is the process's resident set size (psutil) and its high-water mark."""
import json, os, sys, time, gc, resource, statistics
import torch
from blk import make_params, model_loss

torch.set_num_threads(2)
CFG = dict(B=2, T=512, d=512, h=8, f=2048, V=8192, L=8)


def setup(seed=0):
    P = make_params(CFG["d"], CFG["h"], CFG["f"], CFG["V"], L=CFG["L"], seed=seed)
    g = torch.Generator().manual_seed(1)
    tokens = torch.randint(0, CFG["V"], (CFG["B"], CFG["T"] + 1), generator=g)
    return P, tokens


def params_of(P):
    ps = [P["emb"], P["lnf_w"], P["lnf_b"]]
    for lp in P["layers"]:
        ps += list(lp.values())
    return ps


def ck(mode):
    return {"none": 0, "ckpt1": 1, "ckpt2": 2}[mode]


def flops():
    from torch.utils.flop_counter import FlopCounterMode
    P, tok = setup()
    fc = FlopCounterMode(display=False)
    with fc:
        loss = model_loss(tok, P)
    fwd = fc.get_total_flops()
    fwd_by = {str(k): v for k, v in fc.get_flop_counts()["Global"].items()}
    fc2 = FlopCounterMode(display=False)
    with fc2:
        loss.backward()
    bwd = fc2.get_total_flops()
    bwd_by = {str(k): v for k, v in fc2.get_flop_counts()["Global"].items()}
    n = sum(p.numel() for p in params_of(P))
    n_nonemb = n - P["emb"].numel()
    # same with checkpointing: the forward is run again inside backward
    P2, tok2 = setup()
    fc3 = FlopCounterMode(display=False)
    with fc3:
        l2 = model_loss(tok2, P2, ckpt_every=1)
        l2.backward()
    return dict(cfg=CFG, params=n, params_nonemb=n_nonemb, tokens=CFG["B"] * CFG["T"], fwd=fwd, bwd=bwd,
                ratio=bwd / fwd, fwd_by=fwd_by, bwd_by=bwd_by, ckpt1_total=fc3.get_total_flops(),
                kaplan_6N=6 * n_nonemb * CFG["B"] * CFG["T"])


def timing(mode, reps=5):
    P, tok = setup()
    ts_f, ts_b, ts_inf = [], [], []
    for r in range(reps + 1):
        for p in params_of(P):
            p.grad = None
        t0 = time.perf_counter()
        loss = model_loss(tok, P, ckpt_every=ck(mode))
        t1 = time.perf_counter()
        loss.backward()
        t2 = time.perf_counter()
        with torch.no_grad():
            t3 = time.perf_counter()
            model_loss(tok, P)
            t4 = time.perf_counter()
        if r:
            ts_f.append(t1 - t0); ts_b.append(t2 - t1); ts_inf.append(t4 - t3)
    return dict(mode=mode, fwd=statistics.median(ts_f), bwd=statistics.median(ts_b), nograd=statistics.median(ts_inf),
                fwd_all=ts_f, bwd_all=ts_b, nograd_all=ts_inf)


def mem(mode):
    import psutil
    pr = psutil.Process()
    P, tok = setup()
    # warm the allocator and kernels on a tiny batch so the measurement sees only this step
    model_loss(tok[:, :9], P).backward()
    for p in params_of(P):
        p.grad = None
    gc.collect()
    r0 = pr.memory_info().rss
    hw0 = resource.getrusage(resource.RUSAGE_SELF).ru_maxrss  # bytes on macOS
    if mode == "nograd":
        with torch.no_grad():
            loss = model_loss(tok, P)
        r1 = pr.memory_info().rss
        hw1 = resource.getrusage(resource.RUSAGE_SELF).ru_maxrss
        return dict(mode=mode, rss0=r0, held_after_fwd=r1 - r0, peak_over_base=max(hw1, r1) - r0, hw0=hw0)
    loss = model_loss(tok, P, ckpt_every=ck(mode))
    r1 = pr.memory_info().rss
    loss.backward()
    hw2 = resource.getrusage(resource.RUSAGE_SELF).ru_maxrss
    grads = sum(p.grad.numel() * 4 for p in params_of(P))
    return dict(mode=mode, rss0=r0, held_after_fwd=r1 - r0, peak_over_base=hw2 - r0, hw0=hw0, grad_bytes=grads)


if __name__ == "__main__":
    os.makedirs("out", exist_ok=True)
    what = sys.argv[1]
    if what == "flops":
        res = flops()
    elif what == "time":
        res = timing(sys.argv[2])
    else:
        res = mem(sys.argv[2])
    fn = "out/cost_%s%s.json" % (what, "_" + sys.argv[2] if len(sys.argv) > 2 else "")
    json.dump(res, open(fn, "w"), indent=1)
    print(fn, {k: v for k, v in res.items() if not isinstance(v, (dict, list))})
