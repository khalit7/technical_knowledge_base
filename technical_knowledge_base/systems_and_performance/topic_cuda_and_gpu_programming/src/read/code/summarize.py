"""Reading tab data: summarise the three M1 runs (read/out/run_*.json), pull the GPU simulator's M1 runs
(sim/out/data.json) and the compiler explorer's ptxas reports (compile/out/*.ptxas.txt), compute every
derived number the prose quotes, and write read/out/summary.json and parts/22_js_rd_data.js.
Run from src/:  python3 read/code/summarize.py"""
import json, re, statistics as st, os
R = 'read/out'
runs = [json.load(open(f'{R}/run_{i}.json')) for i in (1, 2, 3)]
med = lambda xs: st.median(xs)
S = {"meta": {"device": "Apple M1 Pro GPU (16 cores)", "mlx": runs[0]["meta"]["mlx"], "date": "2026-10-05",
              "runs": 3, "trials": 7, "load": [round(r["meta"]["load"], 1) for r in runs]}}
ov = [r["cases"]["overhead"]["us"] for r in runs]
S["overhead_us"] = {"median": round(med(ov)), "runs": [round(x) for x in ov]}
sm = [r["cases"]["softmax"] for r in runs]
S["softmax"] = {"rows": 8192, "cols": 8192, "bytes": sm[0]["bytes"], "ms_runs": [round(x["ms"], 2) for x in sm],
                "gbps_runs": [round(x["gbps"], 1) for x in sm], "gbps_median": round(med([x["gbps"] for x in sm]), 1),
                "max_abs_err": max(x["max_abs_err"] for x in sm)}
att = []
for j in range(3):
    a = [r["cases"]["attention"][j] for r in runs]
    att.append({"N": a[0]["N"], "H": a[0]["H"], "D": a[0]["D"],
                "unfused_ms": round(med([x["unfused"]["ms"] for x in a]), 2), "fused_ms": round(med([x["fused"]["ms"] for x in a]), 2),
                "unfused_runs": [round(x["unfused"]["ms"], 2) for x in a], "fused_runs": [round(x["fused"]["ms"], 2) for x in a],
                "max_abs_diff": max(x["max_abs_diff"] for x in a)})
for a in att:
    a["speedup"] = round(a["unfused_ms"] / a["fused_ms"], 2)
    a["fused_tflops"] = round(4 * a["H"] * a["N"] ** 2 * a["D"] / (a["fused_ms"] * 1e-3) / 1e12, 2)
S["attention"] = att
# GPU simulator tab's measurements (same laptop, same day), quoted not re-measured
sim = json.load(open('sim/out/data.json'))["m"]
g = lambda k, n: next(x for x in sim[k] if x["name"] == n)
S["sim"] = {"div_uniform_ms": g("diverge", "per SIMD-group: 32 lanes agree")["ms"], "div_alt_ms": g("diverge", "divergent: alternate lanes")["ms"],
            "coal": [{"stride": x["stride"], "gbps": x["gbps"]} for x in sim["coalesce"] if x["offset"] == 0 and x["stride"] > 0],
            "gather_gbps": g("coalesce", "random gather")["gbps"],
            "mm_naive": g("tiling", "naive (no tiles)")["gflops"], "mm_t8": g("tiling", "tile 8x8")["gflops"],
            "mm_t16": g("tiling", "tile 16x16")["gflops"], "mm_t32": g("tiling", "tile 32x32")["gflops"],
            "bank1": g("banks", "lane stride 1")["greads"], "bank32": g("banks", "lane stride 32")["greads"], "bank33": g("banks", "lane stride 33")["greads"]}
S["sim"]["div_ratio"] = round(S["sim"]["div_alt_ms"] / S["sim"]["div_uniform_ms"], 2)
S["sim"]["coal32_ratio"] = round(S["sim"]["coal"][0]["gbps"] / next(c["gbps"] for c in S["sim"]["coal"] if c["stride"] == 32), 1)
# compiler explorer's ptxas reports (sm_90a)
def ptx(k):
    t = open(f'compile/out/{k}.sm_90a.ptxas.txt').read()
    m = re.search(r'Used (\d+) registers', t); s = re.search(r'(\d+) bytes smem', t)
    return {"regs": int(m.group(1)), "smem": int(s.group(1)) if s else 0}
S["ptxas"] = {k: ptx(k) for k in ("k1_vadd", "k2_matmul_naive", "k3_matmul_tiled", "k5_softmax")}
# vendor and published constants (FACTS.md; Boehm worklog; CUDA Graphs blog)
H100 = {"bf16_dense_tflops": 989.5, "hbm_tbs": 3.35, "l2_mb": 50, "sms": 132}
S["h100"] = H100
S["h100"]["ridge"] = round(H100["bf16_dense_tflops"] / H100["hbm_tbs"])
S["m1_ridge"] = round(5.0e12 / 165e9)
# fused against unfused attention, default sizes (illustrative inputs; formulas in the page)
BH, N, d, b = 32, 4096, 128, 2
unf = 4 * BH * N * N * b + 4 * BH * N * d * b
fus = 4 * BH * N * d * b
fl = 4 * BH * N * N * d
S["fusion_default"] = {"BH": BH, "N": N, "d": d, "bytes": b, "unfused_GB": round(unf / 1e9, 2), "fused_GB": round(fus / 1e9, 3),
    "unfused_ms_mem": round(unf / 3.35e12 * 1e3, 3), "fused_ms_mem": round(fus / 3.35e12 * 1e3, 3), "ms_compute": round(fl / 989.5e12 * 1e3, 3),
    "ratio_bytes": round(unf / fus)}
f = S["fusion_default"]; f["bound_speedup"] = round(max(f["unfused_ms_mem"], f["ms_compute"]) / max(f["fused_ms_mem"], f["ms_compute"]), 1)
# the M1 case in the same model
a = att[2]; u = 4 * a["H"] * a["N"] ** 2 * 2 + 4 * a["H"] * a["N"] * a["D"] * 2
S["m1_model"] = {"unfused_GB": round(u / 1e9, 2), "ms_mem_at_165": round(u / 165e9 * 1e3, 1), "ms_compute_at_5T": round(4 * a["H"] * a["N"] ** 2 * a["D"] / 5.0e12 * 1e3, 1)}
S["boehm"] = [["1 Naive", 309.0, 1.3], ["2 Coalesced global loads", 1986.5, 8.5], ["3 Shared-memory tiles", 2980.3, 12.8], ["4 1D thread tiles", 8474.7, 36.5],
              ["5 2D thread tiles", 15971.7, 68.7], ["6 Vectorised loads", 18237.3, 78.4], ["9 Autotuned", 19721.0, 84.8], ["10 Warp tiles", 21779.3, 93.7], ["cuBLAS", 23249.6, 100.0]]

# Kernel lab's M1 ladders (same laptop, same day), quoted not re-measured
lab = json.load(open('lab/out/data.json'))["cases"]
L = lambda g, st: next(x for x in lab if x["group"] == g and x["step"] == st)
S["lab"] = {"softmax": [[L("softmax", k)["name"], L("softmax", k)["ms"]] for k in ("E", "S1", "S2", "S3", "S4", "S5", "S6", "L")],
            "matmul": [[L("matmul", k)["name"], L("matmul", k)["ms"]] for k in ("M1", "M2", "M3", "M4", "M5", "M6", "M7", "L")],
            "att4096": {x["step"]: x["ms"] for x in lab if x["group"] == "attention" and "(N=4096)" in x["name"]},
            "att8192": {x["step"]: [x["ms"], x.get("peak_mib")] for x in lab if x["group"] == "attention" and "(N=8192)" in x["name"]},
            "fsm8192": {x["step"]: [x["ms"], x.get("peak_mib")] for x in lab if x["group"] == "fused" and "(N=8192)" in x["name"]}}
json.dump(S, open(f'{R}/summary.json', 'w'), indent=1)
open('parts/22_js_rd_data.js', 'w').write('// ---- Reading tab data, generated by src/read/code/summarize.py from read/out, sim/out and compile/out; do not edit ----\nwindow.RDC=' + json.dumps(S, separators=(",", ":")) + ';\n')
print(json.dumps(S, indent=1)[:3000])

# ---- every number quoted in the Reading prose, by key; fill_spans() writes them into the parts ----
lat = {x["threads"]: x["gbps"] for x in json.load(open('sim/out/data.json'))["m"]["latency"]}
big = [v for k, v in lat.items() if k >= 8192]
c = {x["stride"]: x["gbps"] for x in S["sim"]["coal"]}
f0 = lambda x: f'{x:,.0f}'
V = {"att_diff": f'{att[2]["max_abs_diff"]:.5f}'.rstrip('0'), "bank1": f0(S["sim"]["bank1"]), "bank32": f0(S["sim"]["bank32"]), "bank33": f0(S["sim"]["bank33"]),
     "coal1g": f0(c[1]), "coal32": f'{S["sim"]["coal32_ratio"]:.1f}', "coal32g": f0(c[32]), "gather": f'{S["sim"]["gather_gbps"]:.1f}',
     "div_alt": f'{S["sim"]["div_alt_ms"]:.2f}', "div_uni": f'{S["sim"]["div_uniform_ms"]:.2f}', "div_ratio": f'{S["sim"]["div_ratio"]:.2f}',
     "fu_ratio": f'{S["fusion_default"]["unfused_ms_mem"] / S["fusion_default"]["ms_compute"]:.1f}',
     "lat256g": f0(lat[256]), "latlo": f0(min(big)), "lathi": f0(max(big)),
     "m1_cmp": f'{S["m1_model"]["ms_compute_at_5T"]:.1f}', "m1_gb": f'{S["m1_model"]["unfused_GB"]:.2f}', "m1_mem": f'{S["m1_model"]["ms_mem_at_165"]:.1f}',
     "m1_ridge": str(S["m1_ridge"]), "ridge": str(S["h100"]["ridge"]), "ridge_b": str(S["h100"]["ridge"]),
     "mm_naive": f0(S["sim"]["mm_naive"]), "mm_t8": f0(S["sim"]["mm_t8"]), "mm_t32": f0(S["sim"]["mm_t32"]),
     "ovh_us": f0(S["overhead_us"]["median"]), "ovh_runs": ", ".join(f0(x) for x in S["overhead_us"]["runs"]),
     "sm_gbps": f0(S["softmax"]["gbps_median"]), "sm_gbps_b": f0(S["softmax"]["gbps_median"]), "sm_gbps1": f0(S["softmax"]["gbps_runs"][0]),
     "lab_m1": f'{S["lab"]["matmul"][0][1]:.0f}', "lab_m2": f'{S["lab"]["matmul"][1][1]:.1f}', "lab_coal": f'{S["lab"]["matmul"][0][1]/S["lab"]["matmul"][1][1]:.1f}', "lab_s1": f'{S["lab"]["softmax"][1][1]:.0f}', "lab_s2": f'{S["lab"]["softmax"][2][1]:.2f}', "lab_an": f'{S["lab"]["att4096"]["naive"]:.1f}', "lab_af": f'{S["lab"]["att4096"]["flash"]:.1f}', "lab_as": f'{S["lab"]["att4096"]["sdpa"]:.1f}', "sm_runs": ", ".join(f'{x:.2f}' for x in S["softmax"]["ms_runs"]), "sm_load1": f'{S["meta"]["load"][0]:.1f}', "att_diff_b": f'{att[2]["max_abs_diff"]:.5f}'.rstrip("0"), "sm_err": f'{S["softmax"]["max_abs_err"]:.1e}', "lab_a8n": f'{S["lab"]["att8192"]["naive"][0]:.1f}', "lab_a8nm": f'{S["lab"]["att8192"]["naive"][1]:,.0f}', "lab_a8f": f'{S["lab"]["att8192"]["flash"][0]:.1f}', "lab_a8fm": f'{S["lab"]["att8192"]["flash"][1]:,.0f}', "lab_fu": f'{S["lab"]["fsm8192"]["U_lib"][0]:.2f}', "lab_fum": f'{S["lab"]["fsm8192"]["U_lib"][1]:,.0f}', "lab_f1": f'{S["lab"]["fsm8192"]["F1"][0]:.2f}', "lab_f1m": f'{S["lab"]["fsm8192"]["F1"][1]:,.0f}', "lab_eag": f'{S["lab"]["softmax"][0][1]:.1f}', "lab_eagx": f'{S["lab"]["softmax"][0][1]/S["lab"]["softmax"][6][1]:.1f}', "sm_ms": f'{sorted(S["softmax"]["ms_runs"])[1]:.1f}', "vadd_regs": str(S["ptxas"]["k1_vadd"]["regs"])}
json.dump(V, open(f'{R}/prose_values.json', 'w'), indent=1)
import glob
for p in sorted(glob.glob('parts/20_read*.html')):
    t = open(p).read()
    t2 = re.sub(r'data-rdv="(\w+)">[^<]*<', lambda m: f'data-rdv="{m.group(1)}">{V[m.group(1)]}<', t)
    if t2 != t: open(p, 'w').write(t2); print('filled', p)
