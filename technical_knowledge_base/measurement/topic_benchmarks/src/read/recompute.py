"""Every number the Reading tab derives, recomputed. Run: python3 read/recompute.py
Writes read/recompute_out.json, which read/check_js.mjs compares with the page's JavaScript."""
import json, math, datetime as dt
D = lambda s: dt.date.fromisoformat(s)
out = {}

# 1. Lifecycle animation: frontier score against days since launch (published points, sources in 22_js_rd_life.js)
mmlu = [("2020-09-07", 43.9, "GPT-3 175B, few-shot"), ("2022-03-29", 67.5, "Chinchilla"),
        ("2023-03-14", 86.4, "GPT-4"), ("2024-09-12", 92.3, "o1")]
tbs = [("2026-08-27", 30.0, "Claude Opus 5"), ("2026-09-01", 52.6, "Claude Fable 5.1"),
       ("2026-09-22", 64.6, "GPT-6 Astra")]
def life(pts):
    t0 = D(pts[0][0]); rows = []
    for d, s, m in pts:
        days = (D(d) - t0).days
        gain = s - pts[0][1]
        rows.append(dict(date=d, days=days, score=s, model=m, headroom=round(100 - s, 1),
                         gain=round(gain, 1), per30=round(gain / days * 30, 2) if days else None))
    return rows
out["mmlu"] = life(mmlu); out["tbs"] = life(tbs)
# pace compared at the step the animation compares: MMLU to GPT-4 (918 days), TB-Science to day 26
m = out["mmlu"][2]; t = out["tbs"][2]
out["pace_ratio"] = round(t["per30"] / m["per30"], 1)

# 2. Error bars: binomial standard error of a score on n items at true rate p
def se(p, n): return math.sqrt(p * (1 - p) / n)
def wilson(k, n, z=1.959964):
    p = k / n; den = 1 + z*z/n; c = (p + z*z/(2*n)) / den
    h = z * math.sqrt(p*(1-p)/n + z*z/(4*n*n)) / den
    return (c - h, c + h)
z = 1.959964
cases = {"AIME (one year)": (30, 0.80), "GPQA Diamond": (198, 0.90),
         "SWE-bench Verified": (500, 0.70), "HLE": (2500, 0.40), "Vals Legal (validation)": (200, 0.54)}
out["err"] = {}
for k, (n, p) in cases.items():
    s = se(p, n) * 100
    out["err"][k] = dict(n=n, p=p, se_pts=round(s, 2), ci95_half=round(z*s, 2),
                         diff95_unpaired=round(z*math.sqrt(2)*s, 2), item_pts=round(100/n, 2),
                         wilson=[round(100*x, 1) for x in wilson(round(p*n), n)])
# Vals legal: is 54% against 38.7% (n = 200 each) outside noise?
a, b, n = 0.54, 0.387, 200
sd = math.sqrt(a*(1-a)/n + b*(1-b)/n) * 100
out["vals"] = dict(diff=round((a-b)*100, 1), se_diff=round(sd, 2), z=round((a-b)*100/sd, 2), rel=round(a/b - 1, 3))

# 3. Other derived numbers in the text
out["arc3"] = dict(gap=round(99.9-62.7, 1), cost_ratio=round(26098/18817, 3), cost_saving=round(1-18817/26098, 3))
out["hypertau"] = round(82.2/23.9, 2)
out["tbs_gain_5d"] = round(52.6-30.0, 1); out["tbs_gain_26d"] = round(64.6-30.0, 1)
out["tb_gap"] = dict(tb21=4.9, tb30=12.7, ratio=round(12.7/4.9, 2))
out["swepro_private_drop"] = round(22.7-17.8, 1)
# Real-SWE leaderboard read 2026-10-04 (Astra 46.25, Fable 5.1 45.00) against lab-reported Terminal-Bench 4.0
out["realswe_vs_tb4"] = {"Claude Fable 5.1": round(55.8-45.00, 2), "GPT-6 Astra": round(57.9-46.25, 2)}
out["arc3_equal_effort"] = dict(max_gap=round(98.6-62.7, 1), high_gap=round(99.9-54.8, 1))
out["physics_audit"] = dict(not_model=238, of=250, share=round(238/250*100, 1))
out["schrodinger"] = {"GPT-5.4-mini": round(46.8-35.6, 1), "GPT 5.1": round(44.6-36.2, 1), "DeepSeek-v4-Flash": round(72.8-66.8, 1)}
out["mole"] = round(28/39*100, 1)
out["aa_private"] = dict(v41=20, v42=40, v43=45)
out["arc_cheap_vs_astra"] = round(18817/0.67)
json.dump(out, open(__file__.replace("recompute.py", "recompute_out.json"), "w"), indent=1)
print(json.dumps(out, indent=1))
