"""Summarise the measured retry-storm runs into ../inputs/lab_measured.json.

Usage: python3 summarize.py <runs dir>
Per configuration and seed: per-second series (arrivals, successes, failures,
attempts sent, server queue at its largest in that second, server work done)
and totals (success share, attempts per request, wasted server work, recovery
time after the slowdown ends).
"""
import json, os, sys
from collections import defaultdict

RUNS = sys.argv[1]
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "inputs", "lab_measured.json")
CONFIGS = ["none", "naive", "backoff", "budget", "deadline", "shed"]
SECS = 46
SLOW_TO = 15


def read_att(path):
    reqs = defaultdict(list)
    cfg = None
    for line in open(path):
        if line.startswith("#"):
            cfg = line
            continue
        i, k, t1, t2, out = line.split()
        reqs[int(i)].append((int(k), float(t1), float(t2), out))
    return reqs, cfg


def read_srv(path):
    rows = []
    for line in open(path):
        if line.startswith("#"):
            continue
        rows.append([int(x) for x in line.split()])
    return rows


def one(name, seed):
    reqs, _ = read_att(os.path.join(RUNS, "%s_s%d_att.txt" % (name, seed)))
    srv = read_srv(os.path.join(RUNS, "%s_s%d_srv.txt" % (name, seed)))
    arr = [0] * SECS; ok = [0] * SECS; fail = [0] * SECS; att = [0] * SECS
    lat_ok = []
    n_att = 0
    for i, a in reqs.items():
        a.sort()
        first = a[0][1]
        arr[min(SECS - 1, int(first // 1000))] += 1
        for k, t1, t2, out in a:
            if out != "throttled":
                att[min(SECS - 1, int(t1 // 1000))] += 1
                n_att += 1
        last = a[-1]
        if last[3] == "ok":
            ok[min(SECS - 1, int(last[2] // 1000))] += 1
            lat_ok.append(last[2] - first)
        else:
            fail[min(SECS - 1, int(last[2] // 1000))] += 1
    q = [0] * SECS
    done_end = [0] * SECS
    for t, queued, busy, done, dropped, shed in srv:
        s = t // 1000
        if s < SECS:
            q[s] = max(q[s], queued)
            done_end[s] = done
    work = [done_end[0]] + [max(0, done_end[s] - done_end[s - 1]) for s in range(1, SECS)]
    n = len(reqs)
    n_ok = sum(ok)
    # recovery: first second s >= SLOW_TO from which every second up to 39 has
    # successes >= 90% of arrivals
    rec = None
    for s in range(SLOW_TO, 40):
        if all(arr[x] == 0 or ok[x] >= 0.9 * arr[x] for x in range(s, 40)):
            rec = s - SLOW_TO
            break
    lat_ok.sort()
    total_work = srv[-1][3]
    return {
        "series": {"arr": arr, "ok": ok, "fail": fail, "att": att, "q": q, "work": work},
        "requests": n, "success": round(n_ok / n, 4), "attempts_per_req": round(n_att / n, 3),
        "server_work": total_work, "useful_share": round(n_ok / total_work, 4) if total_work else None,
        "recovery_s": rec,
        "p50_ms": round(lat_ok[len(lat_ok) // 2], 1) if lat_ok else None,
        "p99_ms": round(lat_ok[int(len(lat_ok) * 0.99)], 1) if lat_ok else None,
        "max_queue": max(q),
    }


res = {}
for c in CONFIGS:
    res[c] = {}
    for seed in (1, 2, 3):
        p = os.path.join(RUNS, "%s_s%d_att.txt" % (c, seed))
        if os.path.exists(p) and os.path.exists(p.replace("_att", "_srv")):
            try:
                res[c][str(seed)] = one(c, seed)
            except Exception as e:
                print("skip", c, seed, e)
meta = {
    "what": "Measured on an Apple M1 Pro laptop, 2026-10-04: server.py (4 worker slots, dependency latency 25 ms, 100 ms from second 10 to 15) and loadgen.py (Poisson 100 requests/s for 40 s, client timeout 100 ms, at most 3 attempts) over a Unix socket; 3 seeds per configuration.",
    "configs": {
        "none": "timeouts only, no retries",
        "naive": "3 attempts, retry at once",
        "backoff": "3 attempts, exponential backoff with full jitter (base 100 ms, cap 2 s)",
        "budget": "backoff plus gRPC-style retry throttling (10 tokens, ratio 0.1)",
        "deadline": "retry at once, server skips work whose deadline has passed",
        "shed": "retry at once, server answers 503 when 8 requests are already queued",
    },
}
json.dump({"meta": meta, "runs": res}, open(OUT, "w"), separators=(",", ":"))
for c in CONFIGS:
    for s, r in res[c].items():
        print(c, s, "succ", r["success"], "att/req", r["attempts_per_req"], "rec", r["recovery_s"], "maxq", r["max_queue"], "useful", r["useful_share"], "p50", r["p50_ms"], "p99", r["p99_ms"])
