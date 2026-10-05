"""Write ref_out.json: the cases the page's JavaScript must reproduce exactly (checked by check_js.mjs)."""
import json, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from ref_common import rand_jobs, rand_refs, mulberry32
from ref_sched import schedule, mlfq
from ref_vm import translate_linear, tlb_trace, array_trace, replace
from ref_cow import copied
from ref_conc import run_x86, NOLOCK, TAS, ATOMIC, deadlock_count
from ref_crash import MODES, table

BOOK = [{"id": 0, "arrive": 0, "run": 100}, {"id": 1, "arrive": 10, "run": 10}, {"id": 2, "arrive": 10, "run": 10}]
# The page's default mix, one training node: a long CPU-bound job, two DataLoader-like workers that block on
# I/O, and a short interactive job (a shell); the CFS case gives the trainer nice 0 and the workers nice 5.
NODE = [{"id": 0, "arrive": 0, "run": 60, "io": 0, "nice": 0}, {"id": 1, "arrive": 4, "run": 24, "io": 4, "nice": 5},
        {"id": 2, "arrive": 8, "run": 24, "io": 4, "nice": 5}, {"id": 3, "arrive": 20, "run": 6, "io": 2, "nice": 0}]

out = {"sched": [], "mlfq": [], "tlb": [], "replace": [], "linear": [], "cow": [], "x86": [], "deadlock": {}, "crash": {}}
mixes = [("book", BOOK), ("node", NODE)] + [(f"seed{s}", rand_jobs(s, n=3 + s % 3, max_run=30, max_arrive=20, io=s % 2 == 1)) for s in range(16)]
for name, jobs in mixes:
    for pol, q in [("FIFO", 1), ("SJF", 1), ("STCF", 1), ("RR", 1), ("RR", 4), ("CFS", 1)]:
        for io_time in (3, 5):
            r = schedule(jobs, pol, q=q, io_time=io_time)
            out["sched"].append({"jobs": jobs, "policy": pol, "q": q, "io_time": io_time, "res": r})
    for quanta, allot, boost in [((10, 10, 10), (1, 1, 1), 0), ((2, 4, 8), (1, 1, 2), 0), ((2, 4, 8), (1, 1, 2), 40), ((5, 10), (2, 1), 30)]:
        out["mlfq"].append({"jobs": jobs, "quanta": quanta, "allot": allot, "boost": boost, "io_time": 3,
                            "res": mlfq(jobs, list(quanta), list(allot), boost, 3)})
for rows, cols, page, ent in [(8, 8, 64, 4), (16, 16, 64, 4), (16, 16, 128, 2), (32, 32, 4096, 4), (64, 64, 256, 8), (10, 1, 16, 16)]:
    for order in ("row", "col"):
        base = 100 if (rows, cols) == (10, 1) else 0
        tr = array_trace(rows, cols, order, base=base)
        r = tlb_trace(tr, page, ent)
        out["tlb"].append({"rows": rows, "cols": cols, "page": page, "entries": ent, "order": order, "base": base,
                           "hits": r["hits"], "misses": r["misses"], "seq": r["seq"]})
refsets = [[0, 1, 2, 0, 1, 3, 0, 3, 1, 2, 1], [1, 2, 3, 4, 1, 2, 5, 1, 2, 3, 4, 5]] + [rand_refs(s, 24, 3 + s % 7) for s in range(20)]
for refs in refsets:
    for frames in (3, 4):
        for pol in ("FIFO", "LRU", "OPT", "CLOCK"):
            r = replace(refs, frames, pol)
            out["replace"].append({"refs": refs, "frames": frames, "policy": pol, "hits": r["hits"],
                                   "evict": [s["evict"] for s in r["seq"]], "mem": [s["mem"] for s in r["seq"]]})
rnd = mulberry32(99)
pt = [((1 << 31) | int(rnd() * 32)) if rnd() < 0.6 else 0 for _ in range(16)]
for k in range(40):
    va = int(rnd() * 16384)
    out["linear"].append({"va": va, "page": 1024, "pt": pt, "res": translate_linear(va, 1024, pt)})
for n in (1000, 50000, 1000000):
    for kind, action in [("list", "len"), ("list", "iterate"), ("numpy", "sum"), ("numpy", "iterate")]:
        out["cow"].append({"n": n, "kind": kind, "action": action, "copied": copied(n, kind, action)})
for prog, src in [("nolock", NOLOCK), ("tas", TAS), ("atomic", ATOMIC)]:
    for loops in (1, 3, 10, 50):
        for interval in (1, 2, 3, 5, 7, 100):
            r = run_x86(src, loops, interval)
            out["x86"].append({"prog": prog, "loops": loops, "interval": interval, "seed": None, "count": r["count"], "steps": r["steps"], "trace": r["trace"] if loops <= 3 else None})
        for seed in (1, 2, 3):
            r = run_x86(src, loops, 6, rand_seed=seed)
            out["x86"].append({"prog": prog, "loops": loops, "interval": 6, "seed": seed, "count": r["count"], "steps": r["steps"], "trace": None})
out["deadlock"] = {"opposite": deadlock_count(False), "ordered": deadlock_count(True)}
out["crash"] = {m: table(m) for m in MODES}
path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "ref_out.json")
json.dump(out, open(path, "w"), separators=(",", ":"))
print("wrote", path, os.path.getsize(path), "bytes;", {k: len(v) for k, v in out.items()})
