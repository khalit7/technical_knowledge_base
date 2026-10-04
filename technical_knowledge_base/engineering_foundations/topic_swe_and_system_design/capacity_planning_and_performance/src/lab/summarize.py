"""Reduce the raw per-request files of run_all.py to ../inputs/measured.json.

    python3 summarize.py <scratch dir with the raw files>

Percentiles are nearest-rank on the sorted latencies. The first 2 seconds of
every run are dropped as warm-up (queues start empty). Utilisation is computed
from the measured service times the server logged (arrival rate x mean measured
service time / slots), so the asyncio.sleep overshoot is counted.
"""
import glob, json, math, os, sys

D = sys.argv[1]
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "inputs", "measured.json")
WARM = 2.0


def pct(xs, q):
    if not xs:
        return None
    xs = sorted(xs)
    k = max(0, min(len(xs) - 1, int(math.ceil(q * len(xs))) - 1))
    return xs[k]


def ms(x):
    return None if x is None else round(1000 * x, 2)


def load(tag):
    cli = json.load(open(os.path.join(D, tag + "cli.json")))
    srv = [json.load(open(f)) for f in sorted(glob.glob(os.path.join(D, tag + "_srv*.json")))]
    return cli, srv


res = {"note": "Measured on an Apple M1 Pro laptop (10 cores), macOS, Python 3.12, 2026-10-04. Server and load generator are lab/server.py and lab/loadgen.py; the work is a timed wait. Latencies in ms; nearest-rank percentiles; first 2 s dropped.",
       "hockey": [], "co": {}, "lb": []}

for f in sorted(glob.glob(os.path.join(D, "h??_cli.json"))):
    tag = os.path.basename(f)[:-8]
    cli, srv = load(tag)
    rows = [r for r in cli["rows"] if r[0] >= WARM]
    lat = [r[2] - r[0] for r in rows]
    S = srv[0]["mean_service_s"]
    rate = cli["config"]["rate"]
    dur = cli["config"]["duration"]
    res["hockey"].append({"target_util": int(tag[1:3]) / 100, "rate": rate, "duration_s": dur, "n": len(rows),
                          "mean_service_ms": round(1000 * S, 3), "util": round(rate * S, 4),
                          "achieved_rate": round(len(rows) / (dur - WARM), 2),
                          "p50": ms(pct(lat, .5)), "p90": ms(pct(lat, .9)), "p99": ms(pct(lat, .99)),
                          "mean": ms(sum(lat) / len(lat)),
                          "late_send_p99": ms(pct([r[1] - r[0] for r in rows], .99))})

for mode in ["closed", "open"]:
    tag = "co_%s_" % mode
    if not os.path.exists(os.path.join(D, tag + "cli.json")):
        continue
    cli, srv = load(tag)
    rows = [r for r in cli["rows"] if r[0] >= WARM]
    from_sent = [r[2] - r[1] for r in rows]
    from_sched = [r[2] - r[0] for r in rows]
    e = {"n": len(rows), "duration_s": cli["config"]["duration"], "rate": cli["config"]["rate"],
         "users": cli["config"]["users"] if mode == "closed" else None,
         "measured_from_send": {q: ms(pct(from_sent, v)) for q, v in [("p50", .5), ("p90", .9), ("p99", .99), ("p999", .999), ("max", 1.0)]},
         "measured_from_schedule": {q: ms(pct(from_sched, v)) for q, v in [("p50", .5), ("p90", .9), ("p99", .99), ("p999", .999), ("max", 1.0)]},
         # scatter for the chart: time of send, latency from send, latency from schedule (every request, thinned)
         "points": [[round(r[1], 3), round(1000 * (r[2] - r[1]), 1), round(1000 * (r[2] - r[0]), 1)] for r in rows][::2]}
    res["co"][mode] = e

for f in sorted(glob.glob(os.path.join(D, "lb*_cli.json"))):
    tag = os.path.basename(f)[:-8]
    cli, srv = load(tag)
    rows = [r for r in cli["rows"] if r[0] >= WARM]
    lat = [r[2] - r[0] for r in rows]
    share = [0] * len(srv)
    for r in rows:
        share[r[3]] += 1
    res["lb"].append({"tag": tag.rstrip("_"), "policy": cli["config"]["policy"], "rate": cli["config"]["rate"],
                      "slow_server": "slow" in tag, "target_util": int(tag[2:4]) / 100, "n": len(rows),
                      "mean_service_ms": [round(1000 * s["mean_service_s"], 2) for s in srv],
                      "p50": ms(pct(lat, .5)), "p90": ms(pct(lat, .9)), "p99": ms(pct(lat, .99)),
                      "p999": ms(pct(lat, .999)), "mean": ms(sum(lat) / len(lat)),
                      "share_slowest": round(share[0] / len(rows), 4),
                      # real utilisation: offered rate / total service capacity from the measured service times
                      "util": round(cli["config"]["rate"] / sum(1.0 / s["mean_service_s"] for s in srv), 4),
                      "typical_service_ms": round(1000 * sorted(s["mean_service_s"] for s in srv)[len(srv) // 2], 3)})

json.dump(res, open(OUT, "w"), indent=1)
for h in res["hockey"]:
    print("hockey", h["target_util"], h["util"], h["p50"], h["p99"], h["mean"])
for k, v in res["co"].items():
    print("co", k, v["measured_from_send"], v["measured_from_schedule"])
for x in res["lb"]:
    print("lb", x["tag"], x["p50"], x["p99"], x["p999"], x["share_slowest"])
