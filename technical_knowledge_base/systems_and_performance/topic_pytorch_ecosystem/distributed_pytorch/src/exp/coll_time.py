"""Time of one collective against message size on CPU gloo ranks over loopback (bench lock).

    sh run.sh 2 coll_time.py ; sh run.sh 4 coll_time.py
For each op and size S (bytes per rank's input), 3 warm-up calls then 15 timed calls (barrier before each; time of
the slowest rank), median kept. A fit t = alpha + S / beta_eff per op gives a latency and an effective bandwidth on
this laptop: what a cost model needs, measured, and nothing like NVLink or InfiniBand numbers.
"""
import os, statistics, time
from dptc import *

rank, world = init(timeout_s=300)
ops = {
    "all_reduce": lambda t: dist.all_reduce(t),
    "all_gather_into_tensor": lambda t: dist.all_gather_into_tensor(torch.empty(t.numel() * world), t),
    "reduce_scatter_tensor": lambda t: dist.reduce_scatter_tensor(torch.empty(t.numel() // world), t),
    "broadcast": lambda t: dist.broadcast(t, 0),
    "all_to_all_single": lambda t: dist.all_to_all_single(torch.empty_like(t), t),
}
# 4 KiB to 64 MiB (16 MiB on 4 ranks: a 64 MiB all_gather_into_tensor on 4 gloo ranks aborted every rank, SIGABRT, no message)
sizes = [4096 * 4 ** k for k in range(0, 8 if world == 2 else 7)]
res = {}
for name, fn in ops.items():
    rows = []
    for S in sizes:
        t = torch.ones(S // 4); print("op", name, S, flush=True) if rank == 0 else None
        for _ in range(3): fn(t)
        ts = []
        for _ in range(15):
            dist.barrier()
            t0 = time.perf_counter(); fn(t); t1 = time.perf_counter()
            d = torch.tensor([t1 - t0], dtype=torch.float64)
            dist.all_reduce(d, op=dist.ReduceOp.MAX)
            ts.append(d.item())
        rows.append({"bytes": S, "median_s": statistics.median(ts), "min_s": min(ts), "max_s": max(ts)})
    res[name] = rows
if rank == 0:
    save1(f"coll_time_w{world}", {"world": world, "env": env(), "loadavg_end": os.getloadavg(), "ops": res})
dist.barrier()
dist.destroy_process_group()
