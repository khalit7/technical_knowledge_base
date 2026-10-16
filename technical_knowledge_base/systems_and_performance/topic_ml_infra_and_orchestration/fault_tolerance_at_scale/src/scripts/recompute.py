#!/usr/bin/env python3
"""Every number the page states that is computed rather than read off a log or a source: writes src/recompute.json.
Part 1 needs torch (one-weight AdamW, CPU, one thread); the rest is stdlib.
usage: <venv>/bin/python scripts/recompute.py     (OMP_NUM_THREADS=1)
"""
import json, math, os, statistics as st

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.dirname(HERE)
out = {}

# ---- 1. AdamW and a huge gradient (the grad_hi run's mechanism, our reading, on one weight)
try:
    import torch
    torch.set_num_threads(1)
    p = torch.nn.Parameter(torch.tensor([0.1, 0.1]))
    o = torch.optim.AdamW([p], lr=3e-3)
    rows = {}
    for s in range(1, 201):
        g = torch.full((2,), 0.04 * (1 if s % 3 else -1))
        if s == 120:
            g[0] = 3.944e36           # the averaged gradient element of the grad_hi run (1.5775e37 / 4)
        p.grad = g; before = p.detach().clone(); o.step()
        if s in (119, 120, 121, 150, 200):
            stt = o.state[p]
            rows[s] = {"update_hit": float(p.detach()[0] - before[0]), "update_ok": float(p.detach()[1] - before[1]),
                       "v_hit": float(stt["exp_avg_sq"][0])}
    out["adamw_toy"] = {"torch": torch.__version__, "rows": rows,
                        "v_inf_after_120": all(math.isinf(rows[s]["v_hit"]) for s in (120, 121, 150, 200)),
                        "max_update_hit_after": max(abs(rows[s]["update_hit"]) for s in (120, 121, 150, 200)),
                        "update_before": abs(rows[119]["update_hit"])}
except ImportError:
    out["adamw_toy"] = "torch not available"

# ---- 2. straggler runs: medians quoted in the prose
def run(n):
    return json.load(open(os.path.join(SRC, "runs", n + ".json")))

S = {}
for n in ("strag_none", "strag_mix", "strag_mix2"):
    r = run(n); steps = r["steps"]
    def med(rank, f, a, b, every=1, first=None):
        xs = [r["ranks"][str(rank)][f][s - 1] for s in steps if a <= s <= b and (first is None or (s - first) % every == 0)]
        return round(st.median(xs), 2)
    S[n] = {"r2_compute_80_159": med(2, "compute_ms", 81, 159), "r0_compute_80_159": med(0, "compute_ms", 81, 159),
            "r2_comm_80_159": med(2, "comm_ms", 81, 159), "r0_comm_80_159": med(0, "comm_ms", 81, 159),
            "r3_compute_200_300": med(3, "compute_ms", 201, 300), "r1_compute_200_300": med(1, "compute_ms", 201, 300),
            "r0_compute_periodic": med(0, "compute_ms", 25, 300, 25, 25), "r1_compute_26_79": med(1, "compute_ms", 26, 79),
            "r0_compute_26_79": med(0, "compute_ms", 26, 79), "step_r0_26_79": med(0, "step_ms", 26, 79),
            "step_r0_80_159": med(0, "step_ms", 81, 159)}
out["strag"] = S

# ---- 3. Recovery designs: the root Failure lab's goodput model (same formula as the page's JS)
def goodput(tau, C, R, M):
    return tau / (M * math.exp(R / M) * math.expm1((tau + C) / M))

def best(C, R, M):
    a, b = math.log(1e-3), math.log(50 * M); g = (math.sqrt(5) - 1) / 2
    for _ in range(200):
        c, d = b - g * (b - a), a + g * (b - a)
        if goodput(math.exp(c), C, R, M) > goodput(math.exp(d), C, R, M): b = d
        else: a = c
    t = math.exp((a + b) / 2); return t, goodput(t, C, R, M)

rec = json.load(open(os.path.join(SRC, "inputs", "rec.json")))
rate = {r["k"]: r["per_gpu_s"] for r in rec["rates"]}
D = {}
for n in (2048, 16384, 131072):
    for k in ("l3", "rsc1"):
        M = 1 / (n * rate[k]); row = {"M_s": round(M, 1)}
        for d in rec["designs"]:
            R = sum(d["R"].values()) * (1 - d.get("keep", 0))
            if d.get("tau_s"): t, g = d["tau_s"], goodput(d["tau_s"], d["C_s"], R, M)
            else: t, g = best(d["C_s"], R, M)
            row[d["id"]] = {"g": round(g, 4), "tau_s": round(t, 1), "R_s": round(R, 1)}
        D[f"{k}_{n}"] = row
out["designs"] = D
# defaults reproduce: Meta's statements (Kokolis et al. Observation 10) in the same model, RSC-1 rate
r1 = rate["rsc1"]
def g_at(n, C, R):
    return round(best(C, R, 1 / (n * r1))[1], 3)
out["kokolis_check"] = {"2048_C300_R300": g_at(2048, 300, 300), "4096_C300_R300": g_at(4096, 300, 300),
                        "12000_C10_R300": g_at(12000, 10, 300), "12000_C10_R600": g_at(12000, 10, 600),
                        "12000_C300_R300": g_at(12000, 300, 300),
                        "mttf_16384_h": round(1 / (16384 * r1) / 3600, 2), "mttf_131072_h": round(1 / (131072 * r1) / 3600, 3)}

json.dump(out, open(os.path.join(SRC, "recompute.json"), "w"), indent=1)
print(json.dumps(out, indent=1))
