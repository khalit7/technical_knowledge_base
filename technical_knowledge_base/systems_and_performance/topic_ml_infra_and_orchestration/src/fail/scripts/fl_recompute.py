#!/usr/bin/env python3
"""Failure lab: every number the tab's prose states that is computed rather than read off a log.
Writes src/fail/fl_recompute.json (fl_make_data.py embeds its "replay" table; check_fl.mjs compares the rest
with what the page shows). Stdlib only. Run: python3 src/fail/scripts/fl_recompute.py
"""
import json, math, os, re

HERE = os.path.dirname(os.path.abspath(__file__))
FAIL = os.path.dirname(HERE)
RUNS = os.path.join(FAIL, "runs")
out = {}


def jl(path):
    xs = []
    for line in open(path):
        for part in line.replace("}{", "}\n{").splitlines():
            if part.strip().startswith("{"):
                xs.append(json.loads(part))
    return xs


# ---- published: Llama 3 Table 5 and OPT (inputs/ extracts)
txt = open(os.path.join(FAIL, "inputs", "llama3_sec3_3_4.txt")).read()
i, j = txt.find("Faulty GPU GPU"), txt.find("Table 5 :")
rows = [(n.strip(), c, int(k), float(p)) for n, c, k, p in
        re.findall(r"([A-Za-z0-9/+ ]+?) (GPU|Dependency|Network|Unplanned Maintenance|Host|Unknown) (\d+) ([0-9.]+)%", txt[i:j])]
assert len(rows) == 18
tot = sum(r[2] for r in rows)
by = {}
for n, c, k, p in rows:
    by.setdefault(c, [0, 0.0]); by[c][0] += k; by[c][1] += p
out["t5"] = {
    "sum_counts": tot,
    "sum_printed_pct": round(sum(r[3] for r in rows), 1),
    "mismatches": [[n, p, round(100 * k / 419, 1)] for n, c, k, p in rows if abs(round(100 * k / 419, 1) - p) > 0.05],
    "gpu_count": by["GPU"][0], "gpu_pct_by_count": round(100 * by["GPU"][0] / 419, 1), "gpu_pct_printed_sum": round(by["GPU"][1], 1),
    "hw_def_count": by["GPU"][0] + by["Host"][0] + by["Unplanned Maintenance"][0],
    "hw_def_pct": round(100 * (by["GPU"][0] + by["Host"][0] + by["Unplanned Maintenance"][0]) / 419, 1),
    "hw_plus_net_pct": round(100 * (by["GPU"][0] + by["Host"][0] + by["Unplanned Maintenance"][0] + by["Network"][0]) / 419, 1),
}
l3_rate = 419 / (16384 * 54)           # unexpected interruptions per GPU-day
opt_rate = (35 + 70) / (992 * 60)      # at least, per GPU-day ("2 months" taken as 60 days)
out["rates"] = {"l3_per_gpu_day": l3_rate, "opt_per_gpu_day": opt_rate, "ratio": round(opt_rate / l3_rate, 2),
                "l3_gpu_years": round(1 / l3_rate / 365.25, 2), "l3_job_mtbf_h": round(54 * 24 / 419, 3)}


# ---- goodput model (same formula as the page's JS)
def goodput(tau, C, R, M):
    return tau / (M * math.exp(R / M) * math.expm1((tau + C) / M))


def best(C, R, M):
    lo, hi = math.log(1e-3), math.log(50 * M)
    g = (math.sqrt(5) - 1) / 2
    a, b = lo, hi
    for _ in range(200):
        c, d = b - g * (b - a), a + g * (b - a)
        if goodput(math.exp(c), C, R, M) > goodput(math.exp(d), C, R, M):
            b = d
        else:
            a = c
    t = math.exp((a + b) / 2)
    return t, goodput(t, C, R, M)


M16 = 1 / (16384 * l3_rate) * 86400
t_opt, g_opt = best(60, 600, M16)
out["headline_16k"] = {"M_s": round(M16, 1), "young_min": round(math.sqrt(2 * 60 * M16) / 60, 2),
                       "opt_min": round(t_opt / 60, 2), "goodput_opt": round(g_opt, 4),
                       "goodput_opt_R60": round(best(60, 60, M16)[1], 4)}
M2k = 1 / (2048 * l3_rate) * 86400
out["interview_2048"] = {"M_h": round(M2k / 3600, 2), "young_s": round(math.sqrt(2 * 30 * M2k), 1),
                         "C_over_tau_pct": round(100 * 30 / math.sqrt(2 * 30 * M2k), 2),
                         "rework_pct": round(100 * math.sqrt(2 * 30 * M2k) / (2 * M2k), 2)}
out["mtbf_1000_h"] = round(1 / (1000 * l3_rate) * 24, 1)


# ---- replay of the measured Slurm runs: wall = uninterrupted wall + redone steps x step time + recovery
def r0(run):
    return sorted([e for e in jl(os.path.join(RUNS, run, "all.jsonl")) if e["rank"] == 0], key=lambda e: e["ts"])


base = r0("fl-base")
b0 = min(e["ts"] - e["t"] for e in base)
b_end = max(e["ts"] for e in base if e["ev"] == "end") - b0
st = {e["step"]: e["ts"] for e in base if e["ev"] == "step"}
step_s = (st[200] - st[10]) / 190
rep = []
for run, label in (("fl-crash", "crash at step 120, checkpoints every 50"), ("fl-nockpt", "crash at step 120, no checkpoints"),
                   ("fl-node", "node killed at step 120, requeued")):
    es = r0(run)
    allr = jl(os.path.join(RUNS, run, "all.jsonl"))
    t0 = min(e["ts"] - e["t"] for e in es)
    end = max(e["ts"] for e in es if e["ev"] == "end") - t0
    if run == "fl-node":
        fail_ts = float([x for x in open(os.path.join(RUNS, run, "kill_time.txt")).read().split() if re.match(r"^\d{10}\.\d+$", x)][0])
        fail_step = 120
    else:
        cr = [e for e in allr if e["ev"] == "crash"][0]
        fail_ts, fail_step = cr["ts"], cr["step"]
    starts = [e for e in es if e["ev"] == "start" and e["ts"] > fail_ts]
    resume_step = starts[0]["start_step"]
    first_after = starts[0]["ts"]
    redone = fail_step - resume_step
    R = first_after - fail_ts
    pred = b_end + redone * step_s + R
    rep.append({"run": run, "label": label, "measured_s": round(end, 1), "predicted_s": round(pred, 1),
                "redone": redone, "R_s": round(R, 1), "err_pct": round(100 * (pred - end) / end, 1)})
out["replay"] = {"base_s": round(b_end, 1), "step_ms": round(step_s * 1000, 1), "rows": rep}

json.dump(out, open(os.path.join(FAIL, "fl_recompute.json"), "w"), indent=1)
print(json.dumps(out, indent=1))
