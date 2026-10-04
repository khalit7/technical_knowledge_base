"""Recompute every number the page derives, and write recompute_out.json (read by check_ui.mjs,
which compares the Alert lab's JavaScript with the Python engine on every incident at every SLO).

Checks:
1. The SRE workbook's quoted figures (ch. 5) from its own formulas, including the one it gets wrong.
2. The Alert lab engine (alertlab.py) on all 7 incidents x 5 SLOs.
3. The demo-run figures the Reading tab quotes: exact percentiles, the histogram_quantile estimate
   against Prometheus's own answer, log sizing, sampling counts, cardinality defaults.
"""
import json, os, math
import alertlab as AL
S = os.path.dirname(os.path.abspath(__file__))
out = {"workbook": [], "lab": {}, "demo": {}}
ok = True


def check(name, got, want, tol, src):
    global ok
    good = abs(got - want) <= tol
    ok &= good
    out["workbook"].append({"check": name, "computed": got, "quoted": want, "ok": good, "source": src})
    print(("OK  " if good else "BAD ") + f"{name}: computed {got:.4g}, quoted {want}")


H, DAY = 3600, 86400
P = 30 * DAY
b = 0.001
check("approach 1: detection of a total outage, s (10 min x 0.001)", 600 * b, 0.6, 1e-9, "Table 5-1")
check("approach 1: 10 min at 0.1% spends this % of the budget", 100 * 600 / P, 0.02, 0.005, "Table 5-1")
check("approach 1: alerts per day possible", DAY / 600, 144, 0, "Table 5-1")
check("approach 2: detection of a total outage, s (36 h x 0.001)", 36 * H * b, 130, 0.5, "Table 5-2, '2 minutes and 10 seconds'")
check("approach 2: 36 h window = this % of the budget", 100 * 36 * H / P, 5, 1e-9, "text")
check("approach 3: 1 h total outage spends this % of the budget", 100 * 1000 * H / P, 140, 1.5, "Table 5-3, '140%'")
check("approach 3: one 5-min 100% spike spends this %", 100 * 1000 * 300 / P, 12, 0.5, "'almost 12%'")
check("approach 3: three spikes spend this %", 100 * 3 * 1000 * 300 / P, 35, 0.5, "'35% of the error budget'")
check("approach 4: burn rate for 5% in 1 h", 0.05 * P / H, 36, 1e-9, "text")
check("approach 4: reset after a total outage, min", (H - H * b * 36) / 60, 58, 0.5, "Table 5-5, '58 minutes'")
check("approach 4: 35x empties the budget in h", P / 35 / H, 20.5, 0.1, "Table 5-5, '20.5 hours'")
check("table 5-4: burn 1000 empties the budget in min", P / 1000 / 60, 43, 0.5, "Table 5-4, '43 minutes'")
check("approach 5: burn for 2% in 1 h", 0.02 * P / H, 14.4, 1e-9, "Table 5-6")
check("approach 5: burn for 5% in 6 h", 0.05 * P / (6 * H), 6, 1e-9, "Table 5-6")
check("approach 5: burn for 10% in 3 d", 0.10 * P / (3 * DAY), 1, 1e-9, "Table 5-6")
check("approach 6: 15% errors cross 14.4x over 1 h after, min", 60 * 14.4 * b / 0.15, 5, 1, "'after 5 minutes'")
check("low traffic: share of budget per failure at 10 req/h, %", 100 / (10 * 24 * 30 * b), 13.9, 0.05, "'13.9%'")
check("low traffic: failures allowed in 30 days", 10 * 24 * 30 * b, 7, 0.3, "'only seven failed requests'")
low_burn = 0.10 / b
out["workbook_correction"] = {"quoted_burn": 1000, "computed_burn": low_burn,
                              "note": "10% error ratio / 0.1% budget = 100x, not 1,000x"}
print(f"NOTE low traffic burn rate: computed {low_burn:.0f}x, the workbook prints 1,000x (correction shown on the page)")
check("extreme: 90% SLO, 1 h total outage spends %", 100 * H / (0.1 * P), 1.4, 0.05, "'1.4%'")
check("extreme: 99.999% budget for a total outage, s", P * 1e-5, 26, 0.5, "'26 seconds'")
check("extreme: 1% canary at 99.999%, min", P * 1e-5 / 0.01 / 60, 43, 0.5, "'43 minutes'")

# 2. alert lab
for scen in AL.SCEN:
    for slo in (0.99, 0.995, 0.999, 0.9995, 0.9999):
        r = AL.run(scen, slo)
        out["lab"][f"{scen}|{slo}"] = r
o = out["lab"]["outage|0.999"]["alerts"]
print("lab outage@99.9: A2 detect", o["A2"]["page"]["detect_s"], "A4 reset", o["A4"]["page"]["reset_s"], "A3 fires", o["A3"]["page"]["fires"])
f = out["lab"]["flap|0.999"]
print("lab flap@99.9: budget", round(f["budget_spent"], 4), "A3 fires", f["alerts"]["A3"]["page"]["fires"])
s = out["lab"]["steady35|0.999"]
print("lab steady35@99.9: budget", round(s["budget_spent"], 4), "A4 fires", s["alerts"]["A4"]["page"]["fires"])

# 3. demo numbers
d = json.load(open(os.path.join(S, "inputs", "demo_data.json")))
req = d["reqs"]
def pct(xs, p):
    xs = sorted(xs); i = max(0, min(len(xs) - 1, int(round(p * len(xs) + 0.5)) - 1)); return xs[i]
for ph, a, bb in (("normal", 28, 88), ("incident", 118, 178)):
    ms = [r[1] for r in req if a <= r[0] + r[1] / 1000 < bb]
    e = d["exact"][ph]
    got = {"n": len(ms), "avg": sum(ms) / len(ms), "p50": pct(ms, .5), "p99": pct(ms, .99)}
    agree = got["n"] == e["n"] and abs(got["p99"] - e["p99"] * 1000) < 1.0 and abs(got["avg"] - e["avg"] * 1000) < 1.0
    ok &= agree
    out["demo"][ph] = got
    print(("OK  " if agree else "BAD ") + f"{ph}: n={got['n']} avg={got['avg']:.1f} p50={got['p50']} p99={got['p99']} ms (analysis: {e})")
bk = [x for x in d["buckets_incident"] if math.isfinite(x[0])]
total = d["buckets_incident"][-1][1]
def hq(phi):
    rank = phi * total
    for i, (le, c) in enumerate(bk):
        if c >= rank:
            lo = 0 if i == 0 else bk[i - 1][0]; cp = 0 if i == 0 else bk[i - 1][1]
            return lo + (le - lo) * (rank - cp) / (c - cp)
    return bk[-1][0]
est = hq(0.99); prom = d["inst"]["incident"]["p99"]
agree = abs(est - prom) < 0.002; ok &= agree
print(("OK  " if agree else "BAD ") + f"histogram_quantile(0.99) by hand {est:.4f} s, Prometheus {prom} s")
out["demo"]["hq_p99"] = est
lb = d["log_bytes"]; N = 10e6
gbm = N * (lb["chat_api_avg_line"] + lb["retrieval_avg_line"]) / 1e9 * 30
out["demo"]["logs"] = {"gb_30d": gbm, "ingest_usd": gbm * 0.10, "lines_30d": 2 * N * 30, "index_usd": 2 * N * 30 / 1e6 * 1.70}
print("logs per 30 days:", out["demo"]["logs"])
sm = d["sampling"]
print("sampling:", sm, "tail share %.1f%%" % (100 * sm["tail_kept"] / sm["incident_traces"]))
out["demo"]["cardinality_default"] = (10 + 2) * 5 * 4 * 10
print("cardinality default:", out["demo"]["cardinality_default"])
bench = json.load(open(os.path.join(S, "inputs", "bench.json")))
out["demo"]["telemetry_cores_avg"] = bench["one_request_all_telemetry"] * 1e-6 * N / 86400
print("telemetry cores at 10M/day: %.4f" % out["demo"]["telemetry_cores_avg"])
json.dump(out, open(os.path.join(S, "recompute_out.json"), "w"), indent=0, default=float)
print("ALL OK" if ok else "SOME CHECKS FAILED")
