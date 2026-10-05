"""Four Python threads, each calling Rust on a quarter of the 200k-line log.
GIL held during the Rust work (tally_bytes) against GIL released (tally_bytes_detached).
Records each thread's start and end so the page can draw the real timeline. Usage: c7_gil.py out.json"""
import json
import statistics
import sys
import threading
import time

import tokrs

from common import CHAT

data = open(CHAT, "rb").read()
K = 4
cuts = [0]
for k in range(1, K):
    c = len(data) * k // K
    c = data.index(b"\n", c) + 1
    cuts.append(c)
cuts.append(len(data))
parts = [data[cuts[i]:cuts[i + 1]] for i in range(K)]


def run(fn, threads):
    spans = [None] * K
    t0 = time.perf_counter()

    def work(i):
        a = time.perf_counter()
        fn(parts[i])
        spans[i] = (round((a - t0) * 1e3, 2), round((time.perf_counter() - t0) * 1e3, 2))

    if threads:
        ts = [threading.Thread(target=work, args=(i,)) for i in range(K)]
        for t in ts:
            t.start()
        for t in ts:
            t.join()
    else:
        for i in range(K):
            work(i)
    return round((time.perf_counter() - t0) * 1e3, 2), spans


gil = sys._is_gil_enabled() if hasattr(sys, "_is_gil_enabled") else True
out = {"python": sys.version.split()[0], "gil_enabled": gil, "bytes": len(data), "threads": K, "runs": 7}
modes = {"serial": (tokrs.tally_bytes, False), "held": (tokrs.tally_bytes, True),
         "detached": (tokrs.tally_bytes_detached, True)}
for name, (fn, thr) in modes.items():
    run(fn, thr)  # warm-up
    rs = sorted((run(fn, thr) for _ in range(7)), key=lambda r: r[0])
    med = rs[len(rs) // 2]
    out[name] = {"wall_ms": med[0], "min_ms": rs[0][0], "max_ms": rs[-1][0], "spans": med[1]}
ts = []
for _ in range(7):
    a = time.perf_counter(); tokrs.tally_bytes_parallel(data, 4); ts.append((time.perf_counter() - a) * 1e3)
out["rayon4"] = {"wall_ms": round(statistics.median(ts), 2), "min_ms": round(min(ts), 2), "max_ms": round(max(ts), 2)}
json.dump(out, open(sys.argv[1], "w"), indent=1)
print(f"Python {out['python']}, GIL enabled: {gil}; 4 quarters of {len(data):,} bytes, median of 7")
for name in ["serial", "held", "detached", "rayon4"]:
    v = out[name]
    print(f"{name:<9}{v['wall_ms']:>8.1f} ms   ({v['min_ms']:.1f} to {v['max_ms']:.1f})")
