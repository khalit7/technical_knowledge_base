"""Free-threading measurements on one interpreter. Usage: python ft_bench.py DATA.jsonl OUT.json
Writes: single-thread time, thread scaling 1/2/4/8 (median of REPS), a per-chunk trace of 4 threads, lost updates."""
import json, os, statistics, sys, sysconfig, threading, time
from collections import Counter
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from tokwork import count_slice, count_into, parse, tokens

REPS = 5
data, out_path = sys.argv[1], sys.argv[2]
lines = open(data, encoding="utf-8").read().splitlines(keepends=True)
expected = count_slice(lines)
EXP_TOTAL = sum(expected.values())


def split(n):
    k = len(lines) // n
    return [lines[i * k:(i + 1) * k if i < n - 1 else len(lines)] for i in range(n)]


def run_threads(n):
    parts, results = split(n), [None] * n
    bar = threading.Barrier(n + 1)
    def w(i):
        bar.wait(); results[i] = count_slice(parts[i])
    ts = [threading.Thread(target=w, args=(i,)) for i in range(n)]
    for t in ts: t.start()
    bar.wait(); t0 = time.perf_counter()
    for t in ts: t.join()
    dt = time.perf_counter() - t0
    total = Counter()
    for r in results: total.update(r)
    assert total == expected
    return dt


def trace(n, chunk=1000):
    parts = split(n); ev = [[] for _ in range(n)]
    bar = threading.Barrier(n + 1)
    def w(i):
        bar.wait(); p = parts[i]
        for j in range(0, len(p), chunk):
            a = time.perf_counter(); count_slice(p[j:j + chunk]); ev[i].append((a, time.perf_counter()))
    ts = [threading.Thread(target=w, args=(i,)) for i in range(n)]
    for t in ts: t.start()
    bar.wait(); t0 = time.perf_counter()
    for t in ts: t.join()
    return [[(round((a - t0) * 1000, 2), round((b - t0) * 1000, 2)) for a, b in e] for e in ev]


def race(n, use_lock):
    shared, lock = {}, (threading.Lock() if use_lock else None)
    parts = split(n); bar = threading.Barrier(n)
    def w(i):
        bar.wait(); count_into(shared, parts[i], lock)
    ts = [threading.Thread(target=w, args=(i,)) for i in range(n)]
    for t in ts: t.start()
    for t in ts: t.join()
    return sum(shared.values())


res = {"python": sys.version.split()[0], "free_threaded": bool(sysconfig.get_config_var("Py_GIL_DISABLED")),
       "gil_enabled": getattr(sys, "_is_gil_enabled", lambda: True)(), "lines": len(lines),
       "expected_tokens": EXP_TOTAL, "switch_interval_s": sys.getswitchinterval(),
       "loadavg_start": os.getloadavg()}
run_threads(1)  # warm-up
res["scale"] = {}
for n in (1, 2, 4, 8):
    xs = [run_threads(n) for _ in range(REPS)]
    res["scale"][n] = {"median_s": round(statistics.median(xs), 4), "all_s": [round(x, 4) for x in xs]}
res["trace4"] = trace(4)
res["race_nolock"] = [race(4, False) for _ in range(5)]
res["race_lock"] = [race(4, True) for _ in range(3)]
res["loadavg_end"] = os.getloadavg()
json.dump(res, open(out_path, "w"), indent=1)
print(res["python"], "ft" if res["free_threaded"] else "gil", {k: v["median_s"] for k, v in res["scale"].items()},
      "race:", [EXP_TOTAL - x for x in res["race_nolock"]], "lock:", [EXP_TOTAL - x for x in res["race_lock"]])
