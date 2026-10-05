"""Timing pitfalls measured on the Apple M1 Pro GPU through PyTorch's MPS backend.

Each experiment reproduces one rule of honest GPU timing with the same tools you would use
on CUDA (torch.mps.synchronize and torch.mps.Event play the parts of torch.cuda.synchronize
and torch.cuda.Event). Nothing here runs on an NVIDIA GPU.

Usage (outside the repo's project): uv run --no-project --with torch --with numpy \
    python code/measure_timing.py out/timing_run_1.json
"""
import json, os, sys, time, platform, statistics, subprocess

import torch

D = "mps"
torch.set_num_threads(2)


def sync():
    torch.mps.synchronize()


def ev():
    return torch.mps.Event(enable_timing=True)


def loadavg():
    try:
        return [round(x, 2) for x in os.getloadavg()]
    except OSError:
        return None


def q(xs, p):
    s = sorted(xs)
    k = (len(s) - 1) * p
    lo, hi = int(k), min(int(k) + 1, len(s) - 1)
    return s[lo] + (s[hi] - s[lo]) * (k - lo)


FAILS = {"count": 0}


def el(s, e):
    """elapsed_time, or None when MPS refuses the pair (it raises 'End event was not recorded after
    start event' when both events land in one command buffer); failures are counted and reported."""
    try:
        return s.elapsed_time(e)
    except RuntimeError:
        FAILS["count"] += 1
        return None


def summary(xs):
    xs = [x for x in xs if x is not None]
    if not xs:
        return None
    return {"n": len(xs), "min": min(xs), "p10": q(xs, .1), "median": statistics.median(xs),
            "mean": statistics.fmean(xs), "p90": q(xs, .9), "max": max(xs),
            "stdev": statistics.pstdev(xs)}


def exp_async():
    """A 2048 x 2048 fp32 matmul timed five ways."""
    n = 2048
    a = torch.randn(n, n, device=D)
    b = torch.randn(n, n, device=D)
    for _ in range(5):
        c = a @ b
    sync()
    R = {"host_nosync_ms": [], "host_sync_ms": [], "event_ms": [], "host_queued_ms": []}
    for _ in range(25):
        sync()
        t0 = time.perf_counter(); c = a @ b; t1 = time.perf_counter()
        R["host_nosync_ms"].append((t1 - t0) * 1e3)
        sync()
        t0 = time.perf_counter(); c = a @ b; sync(); t1 = time.perf_counter()
        R["host_sync_ms"].append((t1 - t0) * 1e3)
        s, e = ev(), ev()
        sync()
        s.record(); c = a @ b; e.record(); sync()
        R["event_ms"].append(el(s, e))
        # forgot to synchronise BEFORE starting the clock: 4 earlier matmuls are still queued
        for _ in range(4):
            c = a @ b
        t0 = time.perf_counter(); c = a @ b; sync(); t1 = time.perf_counter()
        R["host_queued_ms"].append((t1 - t0) * 1e3)
    flops = 2 * n ** 3
    return {"n": n, "flops": flops, **{k: summary(v) for k, v in R.items()},
            "raw": {k: [None if x is None else round(x, 4) for x in v] for k, v in R.items()}}


def exp_tiny():
    """Launch-bound regime: a tiny elementwise op, per-op sync against one sync after 200 ops."""
    x = torch.randn(4096, device=D)
    one = torch.ones(1, device=D)
    for _ in range(20):
        y = x * one
    sync()
    per = []
    for _ in range(200):
        t0 = time.perf_counter(); y = x * one; sync(); per.append((time.perf_counter() - t0) * 1e3)
    batch = []
    for _ in range(5):
        sync(); t0 = time.perf_counter()
        for _ in range(200):
            y = x * one
        sync(); batch.append((time.perf_counter() - t0) * 1e3 / 200)
    evs = []
    for _ in range(50):
        s, e = ev(), ev(); sync(); s.record(); y = x * one; e.record(); sync(); evs.append(el(s, e))
    return {"elements": 4096, "per_op_sync_ms": summary(per), "batched_ms_per_op": summary(batch),
            "event_ms": summary(evs)}


def exp_cache():
    """Hot cache against cold. x.sum() timed in batches of 32 back-to-back calls (host timer, one
    synchronise per batch, so the ~0.1 ms per-sync overhead is amortised): 'hot' re-reads one buffer,
    'cold' rotates through distinct buffers totalling at least 512 MB, so no read finds its data in
    the M1 Pro's caches. Median of 7 batches."""
    out = {}
    K = 32
    for mb in (1, 2, 4, 8, 16, 32, 64, 128):
        nel = mb * 1024 * 1024 // 4
        nbuf = max(K, 512 // mb)
        bufs = [torch.randn(nel, device=D) for _ in range(nbuf)]
        sync()
        for bb in bufs[:4]:
            bb.sum()
        sync()
        hot, cold = [], []
        j = 0
        for _ in range(7):
            sync(); t0 = time.perf_counter()
            for _ in range(K):
                bufs[0].sum()
            sync(); hot.append((time.perf_counter() - t0) * 1e3 / K)
            sync(); t0 = time.perf_counter()
            for _ in range(K):
                j = j % (nbuf - 1) + 1
                bufs[j].sum()
            sync(); cold.append((time.perf_counter() - t0) * 1e3 / K)
        out[str(mb)] = {"bytes": nel * 4, "buffers": nbuf, "hot_ms": summary(hot), "cold_ms": summary(cold)}
        del bufs
        torch.mps.empty_cache()
    return out


def exp_distribution():
    """300 event timings of the same 1024 fp32 matmul, in one run."""
    n = 1024
    a = torch.randn(n, n, device=D); b = torch.randn(n, n, device=D)
    for _ in range(10):
        a @ b
    sync()
    xs = []
    for _ in range(300):
        s, e = ev(), ev(); s.record(); a @ b; e.record(); sync(); xs.append(el(s, e))
    return {"n": n, "summary": summary(xs), "raw": [None if x is None else round(x, 4) for x in xs]}


def do_bench_mps(fn, warmup=25, rep=100, flush=True):
    """triton.testing.do_bench (Triton 3.8.0, read in inputs/triton_do_bench.txt), ported line by line
    to torch.mps: estimate from 5 runs, warm up for `warmup` ms, then time `rep` ms of runs, each
    preceded by zeroing a 256 MB buffer, one event pair per run."""
    fn(); sync()
    cache = torch.empty(256 * 1024 * 1024 // 4, dtype=torch.int32, device=D)
    s, e = ev(), ev()
    s.record()
    for _ in range(5):
        if flush:
            cache.zero_()
        fn()
    e.record(); sync()
    est = s.elapsed_time(e) / 5
    n_warmup = max(1, int(warmup / est)); n_repeat = max(1, int(rep / est))
    ss = [ev() for _ in range(n_repeat)]; ee = [ev() for _ in range(n_repeat)]
    for _ in range(n_warmup):
        fn()
    for i in range(n_repeat):
        if flush:
            cache.zero_()
        sync()  # MPS only: without it, MPS often refuses the event pair (see el()); CUDA's do_bench has no sync here
        ss[i].record(); fn(); ee[i].record()
    sync()
    f0 = FAILS["count"]
    t = [el(x, y) for x, y in zip(ss, ee)]
    return {"failed_pairs": FAILS["count"] - f0, "estimate_ms": est, "n_warmup": n_warmup, "n_repeat": n_repeat, **summary(t)}


def exp_dobench():
    out = {}
    x = torch.randn(4 * 1024 * 1024, device=D)  # 16 MB, fits the M1 Pro's 24 MB system-level cache
    out["sum16MB_flush"] = do_bench_mps(lambda: x.sum(), flush=True)
    out["sum16MB_noflush"] = do_bench_mps(lambda: x.sum(), flush=False)
    n = 2048
    a = torch.randn(n, n, device=D); b = torch.randn(n, n, device=D)
    out["mm2048_flush"] = do_bench_mps(lambda: a @ b, flush=True)
    # the naive loop many people write: no warmup, host timer, one sync at the end, mean
    sync(); t0 = time.perf_counter()
    for _ in range(10):
        a @ b
    sync(); out["mm2048_naive_loop_ms"] = (time.perf_counter() - t0) * 1e3 / 10
    return out


def main():
    path = sys.argv[1]
    res = {"started": time.strftime("%Y-%m-%d %H:%M:%S"), "load_before": loadavg(),
           "torch": torch.__version__, "python": platform.python_version(), "machine": platform.machine(),
           "device": "Apple M1 Pro GPU via torch MPS"}
    for name, f in (("async", exp_async), ("tiny", exp_tiny), ("cache", exp_cache),
                    ("distribution", exp_distribution), ("dobench", exp_dobench)):
        t0 = time.time()
        res[name] = f()
        res[name]["seconds"] = round(time.time() - t0, 1)
        res[name]["load"] = loadavg()
        print(name, "done", res[name]["seconds"], "s", flush=True)
    res["load_after"] = loadavg()
    res["event_pairs_refused"] = FAILS["count"]
    json.dump(res, open(path, "w"), indent=1)


if __name__ == "__main__":
    main()
