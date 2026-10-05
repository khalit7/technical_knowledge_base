"""Every derived number on the page, recomputed. Writes out/recompute.json.

check_embed.py then confirms that the page shows these numbers (and the simulator's
recorded outputs) exactly. Sources for every input are in viz_ideas.md and on the page.
Run from src/: python3 recompute.py
"""
import json, math, os

R = {}

# ---- 1. TPU peak = cores x MXUs x (side^2 MACs) x 2 FLOPs x clock -----------------------
# (generation, cores, MXUs per core, side, clock GHz or None, published peak TFLOPS, source tag)
gens = [
    ("v1", 1, 1, 256, 0.700, 92, "CACM 2020 Table 1 (8-bit TOPS)"),
    ("v2", 2, 1, 128, 0.700, 46, "CACM 2020 Table 1"),
    ("v3", 2, 2, 128, 0.940, 123, "CACM 2020 Table 1; TPU v4 paper Table 4"),
    ("v4", 2, 4, 128, 1.050, 275, "TPU v4 paper (2 TCs x 4 MXUs, 1,050 MHz)"),
    ("v5e", 1, 4, 128, 1.5, 197, "Cloud docs (1 TC, 4 MXUs); scaling book (1.5 GHz)"),
    ("v5p", 2, 4, 128, None, 459, "Cloud docs; MXUs per core from scaling book; clock not published"),
    ("v6e", 1, 2, 256, None, 918, "Cloud docs (1 TC, 2 MXUs); scaling book (256x256); clock not published"),
]
rows = []
for g, c, m, s, f, pub, src in gens:
    per_cycle = c * m * s * s * 2           # FLOPs per clock
    if f:
        peak = per_cycle * f * 1e9 / 1e12
        rows.append({"gen": g, "flops_per_cycle": per_cycle, "clock_ghz": f, "peak_tf": round(peak, 1),
                     "published": pub, "ratio": round(peak / pub, 3), "src": src})
    else:
        need = pub * 1e12 / per_cycle / 1e9
        rows.append({"gen": g, "flops_per_cycle": per_cycle, "clock_needed_ghz": round(need, 2),
                     "published": pub, "src": src})
R["tpu_peaks"] = rows

# ---- 2. Running example: Llama 3.1 8B gate projection for one 8,192-token sequence -------
M, K, N = 8192, 4096, 14336
R["ex_flops"] = 2 * M * K * N                       # 9.62e11
R["ex_tiles_128"] = math.ceil(K / 128) * math.ceil(N / 128)
R["ex_tiles_256"] = math.ceil(K / 256) * math.ceil(N / 256)
R["ex_reuse_w"] = M          # each weight is used once per row of X
R["ex_reuse_x"] = N          # each activation is used once per output column
for name, tf in [("v5e", 197), ("v6e", 918), ("tpu7x", 2307)]:
    R["ex_ms_" + name] = round(R["ex_flops"] / (tf * 1e12) * 1e3, 2)

# ---- 3. Small animation example (5 x 4 times 4 x 4 on a 4 x 4 array) ----------------------
m, k, n = 5, 4, 4
R["anim"] = {"macs": m * k * n, "systolic_cycles": m + k + n - 2, "weight_load": k,
             "systolic_total_cycles": k + m + k + n - 2,
             "lane_cycles": math.ceil(m * n / 16) * k, "lane_operand_reads": 2 * m * k * n,
             "sys_edge_reads": m * k, "sys_weight_reads": k * n, "out": m * n,
             "lanes_needed": m * n}

R["anim"]["sys_reads"] = R["anim"]["sys_edge_reads"] + R["anim"]["sys_weight_reads"]
R["anim"]["sys_util_pct"] = round(100 * m * k * n / (16 * R["anim"]["systolic_total_cycles"]))
R["anim"]["lane_util_pct"] = math.floor(0.5 + 100 * m * k * n / (16 * R["anim"]["lane_cycles"]))
# reads per multiply-add for the running example on a 128 array: X once per 128 output columns, W once
R["ex_reads_per_mac"] = round(1 / 128 + 1 / 8192, 4)
R["ex_reads_ratio"] = round(2 / (1 / 128 + 1 / 8192))
R["pad_130_util"] = round(130 * 130 / (256 * 256), 3)

# Horowitz 2014, 45 nm: 16-bit FP mult 1.1 pJ, 32-bit FP add 0.9 pJ, register file access 6 pJ
R["e_mac_pj"] = 1.1 + 0.9
R["e_lane_rf_pj"] = 3 * 6          # two operand reads + accumulator write
R["e_ratio"] = round(R["e_lane_rf_pj"] / R["e_mac_pj"], 1)

# ---- 4. Pods ------------------------------------------------------------------------------
R["v4_ocs"] = 6 * 16 // 2                   # 48 OCSes: 6 faces x 16 links, opposite faces share
R["v4_cubes"] = 4096 // 64
R["ironwood_pod_ef_fp8"] = round(9216 * 4614 / 1e6, 1)     # 42.5
R["ironwood_pod_hbm_pb"] = round(9216 * 192 / 1e6, 2)       # 1.77 (decimal GB)
R["ironwood_pod_bf16_ef"] = round(9216 * 2307 / 1e6, 1)
R["v5p_ici_6links"] = 6 * 180                               # scaling book per-link bidi 1.8e11
# scaling-book worked example: AllGather of 34 MB over one v5e axis of 4 chips
R["sb_ag_us"] = round(34e6 / 9e10 * 1e6)                     # 377 us with wraparound
R["sb_ag_nowrap_us"] = round(3 * 8.4e6 / 4.5e10 * 1e6)       # 560 us without
# 8B bf16 gradients (16.06 GB) all-reduced over one axis of 16 v5p chips (with wraparound):
grad = 8030261248 * 2
R["grad_gb"] = round(grad / 1e9, 2)
R["ar_v5p_axis_s"] = round(2 * grad / 1.8e11, 3)            # AllReduce = 2 x AllGather, V / W_bidi
R["ar_v5p_3axes_s"] = round(2 * grad / (1.8e11 * 3), 3)
R["ar_v5p_nowrap_s"] = round(2 * 2 * grad / 1.8e11, 3)

# ---- 5. Precision mismatch in the El Capitan comparison ----------------------------------
# Trainium2: 128 x 128 PEs x 2 x 2.4 GHz per NeuronCore, 8 cores
R["trn2_core_tf"] = round(128 * 128 * 2 * 2.4e9 / 1e12, 1)
R["trn2_chip_tf"] = round(8 * 128 * 128 * 2 * 2.4e9 / 1e12)
# AMD peaks from CUs x FLOPs per clock per CU x clock
R["mi300x_bf16"] = round(304 * 2048 * 2.1e9 / 1e12, 1)
R["mi355x_bf16"] = round(256 * 4096 * 2.4e9 / 1e12, 1)
R["mi300x_if"] = 7 * 128
R["mi355x_if"] = round(7 * 153.6, 1)
# Weights-only fit (decimal GB) and Cerebras "70B on four systems"
P = {"8B": 8030261248, "70B": 70553706496, "405B": 405853388800}
mem = {"groq_tsp": 220 * 2**20, "groq3": 128e9 / 256, "wse3": 44e9, "h100": 80e9, "b200": 180e9, "mi355x": 288e9, "tpu7x": 192 * 2**30}
R["fit_bf16"] = {k: {c: math.ceil(v * 2 / b) for c, b in mem.items()} for k, v in P.items()}
R["w70_gb"] = round(P["70B"] * 2 / 1e9, 1)
R["wse3_per_core_kb"] = round(44e9 / 900000 / 1e3, 1)
R["groq_mib_in_mb"] = round(220 * 2**20 / 1e6, 1)
R["v7x_cubes"] = 9216 // 64

R["elcap_ratio_claimed"] = round(42.5 / 1.7, 1)             # Google: "more than 24x"
R["ironwood_bf16_over_elcap"] = round(R["ironwood_pod_bf16_ef"] / 1.809, 1)

here = os.path.dirname(os.path.abspath(__file__))
os.makedirs(os.path.join(here, "out"), exist_ok=True)
with open(os.path.join(here, "out", "recompute.json"), "w") as fh:
    json.dump(R, fh, indent=1)
for k_, v in R.items():
    print(k_, v)
