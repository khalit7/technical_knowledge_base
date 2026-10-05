"""Every derived number on the GPU architecture page, and the page's data file.

Inputs: m1/out/run_{1,2,3}.json (M1 Pro GPU microbenchmarks, gpu_micro.py) and vendor or paper figures
typed below with their source (all fetched 2026-10-05). Stdlib only.
Writes out/expected.json and parts/22_js_ga_data.js (window.GA).
Usage: python3 recompute.py
"""
import json, os, statistics as st

HERE = os.path.dirname(os.path.abspath(__file__))
os.makedirs(os.path.join(HERE, "out"), exist_ok=True)
runs = [json.load(open(os.path.join(HERE, "m1", "out", f"run_{i}.json"))) for i in (1, 2, 3)]

SRC = {
    "ampere": "https://developer.nvidia.com/blog/nvidia-ampere-architecture-in-depth/",
    "hopper": "https://developer.nvidia.com/blog/nvidia-hopper-architecture-in-depth/",
    "bwu": "https://developer.nvidia.com/blog/inside-nvidia-blackwell-ultra-the-chip-powering-the-ai-factory-era/",
    "rubin": "https://developer.nvidia.com/blog/inside-nvidia-rubin-gpu-architecture-powering-the-era-of-agentic-ai/",
    "rtxbw": "https://images.nvidia.com/aem-dam/Solutions/geforce/blackwell/nvidia-rtx-blackwell-gpu-architecture.pdf",
    "luo": "https://arxiv.org/html/2402.13499v1",
    "jarmusch": "https://arxiv.org/html/2512.02189",
    "cc": "https://docs.nvidia.com/cuda/cuda-programming-guide/05-appendices/compute-capabilities.html",
    "ptx": "https://docs.nvidia.com/cuda/parallel-thread-execution/index.html",
    "h100": "https://www.nvidia.com/en-us/data-center/h100/",
    "a100": "https://www.nvidia.com/en-us/data-center/a100/",
    "hgx": "https://www.nvidia.com/en-us/data-center/hgx/",
    "gb200": "https://www.nvidia.com/en-us/data-center/gb200-nvl72/",
    "mb": "https://github.com/philipturner/metal-benchmarks",
}


def med3(vals):
    return st.median(vals), min(vals), max(vals)


def series(key, xkey, ykey, scale=1.0):
    out = []
    for j in range(len(runs[0][key])):
        ys = [r[key][j][ykey] * scale for r in runs]
        m, lo, hi = med3(ys)
        out.append([runs[0][key][j][xkey], round(m, 3), round(lo, 3), round(hi, 3)])
    return out


chase = series("chase", "bytes", "ns_per_hop")
little = series("little", "threads", "hops_per_s", 1e-6)      # millions of hops per second
stream = series("stream", "threads", "gbps")
smem = series("smem", "smem_kb", "gbps")
div = []
for j in range(len(runs[0]["diverge"])):
    K = runs[0]["diverge"][j]["K"]
    ln = med3([r["diverge"][j]["lanes"]["ms"] for r in runs]); sg = med3([r["diverge"][j]["simdgroups"]["ms"] for r in runs])
    div.append([K, round(ln[0], 3), round(ln[1], 3), round(ln[2], 3), round(sg[0], 3), round(sg[1], 3), round(sg[2], 3)])
loads = []
for r in runs:
    for k in ("chase", "little", "stream", "smem", "diverge"):
        loads += [c["load"] for c in r[k]]

# ---- M1 levels (median of the points on each plateau) ----
def plateau(lo, hi):
    return st.median([p[1] for p in chase if lo <= p[0] <= hi])

M1_CLOCK_GHZ = 1.296  # metal-benchmarks (independent), M1 family GPU clock
lv = {"l1_ns": plateau(8 << 10, 16 << 10), "l2_ns": plateau(32 << 10, 1 << 20),
      "slc_ns": plateau(4 << 20, 32 << 20), "dram_ns": chase[-1][1]}
lv_cyc = {k.replace("_ns", "_cyc"): v * M1_CLOCK_GHZ for k, v in lv.items()}

# ---- NVIDIA latencies, Luo et al. Table IV (cycles) and their clocks (Table I) ----
LUO = {"A100": {"clk": 1.410, "l1": 37.9, "smem": 29.0, "l2": 261.5, "glob": 466.3},
       "H800": {"clk": 1.755, "l1": 40.7, "smem": 29.0, "l2": 263.0, "glob": 478.8},
       "RTX4090": {"clk": 2.520, "l1": 43.4, "smem": 30.1, "l2": 273.0, "glob": 541.5}}
luo_ns = {g: {k: round(v / d["clk"], 1) for k, v in d.items() if k != "clk"} for g, d in LUO.items()}

# ---- Little's law ----
stream_peak = max(p[1] for p in stream)
m1_bytes_in_flight = stream_peak * 1e9 * lv["dram_ns"] * 1e-9        # bytes
m1_per_core = m1_bytes_in_flight / 16
one_warp = stream[0][1]
h100_bw = 3.35e12; h100_lat_s = LUO["H800"]["glob"] / (LUO["H800"]["clk"] * 1e9)
h100_inflight = h100_bw * h100_lat_s
h100_per_sm = h100_inflight / 132
h100_threads_4b = h100_per_sm / 4
h100_threads_16b = h100_per_sm / 16
little_sat = max(p[1] for p in little)
little_one = little[0][1]

# ---- occupancy cliff: groups per core if a core has 64 KB of threadgroup memory (inferred) ----
smem_groups = [[p[0], min(32, int(64 // p[0])) if p[0] >= 1 else None] for p in smem]

# ---- one tile through three generations of tensor-core instruction (PTX ISA shapes) ----
TM, TN, TK = 128, 128, 64
fmas = TM * TN * TK
tile = {
    "M": TM, "N": TN, "K": TK, "fmas": fmas,
    "ampere_instr": (TM // 16) * (TN // 8) * (TK // 16),      # mma.sync m16n8k16, one warp each
    "hopper_instr": (TM // 64) * (TN // 128) * (TK // 16),    # wgmma m64n128k16, one warpgroup each
    "blackwell_instr": (TM // 128) * (TN // 128) * (TK // 16),  # tcgen05.mma 128x128x16, one thread issues
    "acc_bytes": TM * TN * 4,
    "ab_bytes": (TM * TK + TK * TN) * 2,
    "cpasync_16B": (TM * TK + TK * TN) * 2 // 16,
    "tma_instr": 2,
    "a100_fma_clk_sm": 1024,          # Ampere blog: 256 FP16 FMA per clock per tensor core, 4 per SM
    "h100_fma_clk_sm": 2048,          # Hopper blog: 2x the A100 SM on equivalent types
}
tile["acc_regs_per_thread_128"] = tile["acc_bytes"] // 4 // 128
tile["tmem_cols"] = TN                      # fp32 accumulator: one 32-bit column per N
tile["tmem_frac"] = TN / 512
tile["a100_clk"] = fmas // tile["a100_fma_clk_sm"]
tile["h100_clk"] = fmas // tile["h100_fma_clk_sm"]
h100_clock = 989.5e12 / (132 * 2048 * 2) / 1e9


# ---- latency hiding: one sub-partition scheduler (illustrative program, A100 global latency from Luo et al.) ----
def hide_sim(W, nload, C, lat=466, T=2000, S=1000):
    """Each warp loops: issue nload independent loads (1 cycle each), wait for all of them, then C
    independent arithmetic instructions (1 cycle each). One issue per cycle. Scheduler: greedy then
    oldest (keep issuing from the current warp until it stalls, then the lowest-numbered ready warp),
    a policy from the research literature; NVIDIA does not publish its own."""
    pc = [0] * W; ready_at = [0] * W; cur = 0; issued = 0; arith = 0; loads = 0; steady = 0
    prog = ["L"] * nload + ["C"] * C
    for t in range(T):
        if ready_at[cur] > t:
            cands = [w for w in range(W) if ready_at[w] <= t]
            if not cands:
                continue
            cur = min(cands)
        w = cur; op = prog[pc[w]]; issued += 1
        if t >= S:
            steady += 1
        if op == "L":
            loads += 1
            ready_at[w] = t + lat if pc[w] == nload - 1 else t + 1   # the arithmetic needs every load's data
        else:
            arith += 1; ready_at[w] = t + 1
        pc[w] = (pc[w] + 1) % len(prog)
    return {"W": W, "nload": nload, "C": C, "lat": lat, "T": T, "issued": issued, "util": round(issued / T, 4), "steady_from": S,
            "util_steady": round(steady / (T - S), 4), "arith": arith, "loads": loads,
            "bound": round(min(1.0, W * (nload + C) / (nload + C + lat - 1)), 4)}

HIDE = [hide_sim(2, 1, 8), hide_sim(16, 1, 8), hide_sim(16, 4, 32)]


# ---- occupancy of the running tile's kernel on H100 (cuda_occupancy.h rules, as in the facts file) ----
def occ(regs, threads, smem_kb, max_warps=64, max_blocks=32, smem_sm_kb=228, reserve_kb=1):
    wpb = -(-threads // 32)
    rpw = -(-regs * 32 // 256) * 256
    by_regs = (16384 // rpw) * 4 // wpb
    by_smem = int(smem_sm_kb // (smem_kb + reserve_kb))
    by_warps = max_warps // wpb
    blocks = min(by_regs, by_smem, by_warps, max_blocks)
    return {"regs": regs, "threads": threads, "smem_kb": smem_kb, "by_regs": by_regs, "by_smem": by_smem, "by_warps": by_warps,
            "blocks": blocks, "warps": blocks * wpb, "occ": round(blocks * wpb / max_warps, 4)}
OCC_TILE = occ(168, 128, 64)
OCC_SMALL = occ(32, 256, 0)

# ---- chips: counts for the floorplan tab (vendor unless said) ----
CHIPS = [
 {"id": "a100", "name": "A100 SXM", "arch": "Ampere GA100", "cc": "8.0", "year": 2020, "dies": 1, "gpc_full": 8, "gpc_on": 7, "sm_full": 128, "sm_on": 108,
  "tc_sm": 4, "fp32_sm": 64, "l1_kb": 192, "smem_kb": 164, "rf_kb": 256, "l2_mb": 40, "mem": "HBM2e", "stacks_full": 6, "stacks_on": 5, "mc": "10 of 12 x 512-bit",
  "gb": 80, "tbs": 2.039, "node": "TSMC N7", "xtors": 54.2, "area": 826, "src": ["ampere", "a100", "cc"]},
 {"id": "h100", "name": "H100 SXM", "arch": "Hopper GH100", "cc": "9.0", "year": 2022, "dies": 1, "gpc_full": 8, "gpc_on": 8, "sm_full": 144, "sm_on": 132,
  "tc_sm": 4, "fp32_sm": 128, "l1_kb": 256, "smem_kb": 228, "rf_kb": 256, "l2_mb": 50, "mem": "HBM3", "stacks_full": 6, "stacks_on": 5, "mc": "10 of 12 x 512-bit",
  "gb": 80, "tbs": 3.35, "node": "TSMC 4N", "xtors": 80, "area": 814, "src": ["hopper", "h100", "cc"]},
 {"id": "b200", "name": "B200", "arch": "Blackwell (2 dies)", "cc": "10.0", "year": 2024, "dies": 2, "gpc_full": None, "gpc_on": 8, "sm_full": None, "sm_on": 148,
  "tc_sm": 4, "fp32_sm": 128, "l1_kb": 256, "smem_kb": 228, "rf_kb": 256, "l2_mb": None, "mem": "HBM3e", "stacks_full": 8, "stacks_on": 8, "mc": "not stated",
  "gb": 180, "tbs": 8.0, "node": "TSMC 4NP", "xtors": 208, "area": None, "src": ["jarmusch", "hgx", "cc"], "note": "148 SMs and 8 GPCs from Jarmusch and Chandrasekaran (independent paper); NVIDIA's fetched pages do not state them"},
 {"id": "b300", "name": "B300 (Blackwell Ultra)", "arch": "Blackwell Ultra (2 dies)", "cc": "10.3", "year": 2025, "dies": 2, "gpc_full": 8, "gpc_on": None, "sm_full": 160, "sm_on": None,
  "tc_sm": 4, "fp32_sm": 128, "l1_kb": 256, "smem_kb": 228, "rf_kb": 256, "l2_mb": None, "mem": "HBM3e 12-Hi", "stacks_full": 8, "stacks_on": 8, "mc": "16 x 512-bit",
  "gb": 288, "tbs": 8.0, "node": "TSMC 4NP", "xtors": 208, "area": None, "src": ["bwu", "cc"], "note": "NVIDIA describes the GPU as 160 SMs in 8 GPCs; how many a shipping product enables is not stated"},
 {"id": "rubin", "name": "Rubin", "arch": "Rubin (2 dies)", "cc": None, "year": 2026, "dies": 2, "gpc_full": None, "gpc_on": None, "sm_full": None, "sm_on": 224,
  "tc_sm": 4, "fp32_sm": None, "l1_kb": None, "smem_kb": None, "rf_kb": None, "l2_mb": None, "mem": "HBM4 12-Hi", "stacks_full": None, "stacks_on": None, "mc": "not stated",
  "gb": 288, "tbs": 22, "node": "not stated", "xtors": 336, "area": None, "src": ["rubin"], "note": "224 SMs and 896 tensor cores (4 per SM derived); stack count, GPCs and L2 not stated"},
 {"id": "rtx5090", "name": "RTX 5090", "arch": "Blackwell GB202", "cc": "12.0", "year": 2025, "dies": 1, "gpc_full": 12, "gpc_on": 11, "sm_full": 192, "sm_on": 170,
  "tc_sm": 4, "fp32_sm": 128, "l1_kb": 128, "smem_kb": 100, "rf_kb": 256, "l2_mb": 96, "mem": "GDDR7", "stacks_full": None, "stacks_on": None, "mc": "16 x 32-bit (512-bit)",
  "gb": 32, "tbs": 1.792, "node": "TSMC 4N", "xtors": 92.2, "area": 750, "src": ["rtxbw", "cc"]},
]

# ---- dense tensor peaks per format, TFLOPS (FACTS file, vendor pages); None = no tensor-core path ----
PEAK = {  # None = no tensor-core path for the format; "ns" = not stated on the fetched source. TF32, FP16/BF16, FP8, FP6, FP4, FP64 (tensor), INT8 TOPS
 "A100":   {"tf32": 156, "bf16": 312, "fp8": None, "fp6": None, "fp4": None, "fp64": 19.5, "int8": 624, "src": "a100"},
 "RTX 4090": {"tf32": 82.6, "bf16": 165.2, "fp8": 330.3, "fp6": None, "fp4": None, "fp64": "ns", "int8": "ns", "src": "rtxbw"},
 "H100 SXM": {"tf32": 494.5, "bf16": 989.5, "fp8": 1979, "fp6": None, "fp4": None, "fp64": 67, "int8": 1979, "src": "h100"},
 "B200 (HGX)": {"tf32": 1125, "bf16": 2250, "fp8": 4500, "fp6": 4500, "fp4": 9000, "fp64": 37, "int8": "ns", "src": "hgx"},
 "B300 (HGX)": {"tf32": "ns", "bf16": 2250, "fp8": 4500, "fp6": 4500, "fp4": 13500, "fp64": 1.25, "int8": 187.5, "src": "hgx"},
 "RTX 5090": {"tf32": 104.8, "bf16": 209.5, "fp8": 419, "fp6": "ns", "fp4": 1676, "fp64": "ns", "int8": "ns", "src": "rtxbw"},
 "Rubin": {"tf32": 2000, "bf16": 4000, "fp8": 17500, "fp6": 17500, "fp4": 35000, "fp64": 33, "int8": "ns", "src": "rubin"},
}
ratios = {k: {f: (round(v[f] / v["bf16"], 3) if isinstance(v[f], (int, float)) else v[f]) for f in ("tf32", "fp8", "fp6", "fp4")} for k, v in PEAK.items()}

gens = {
  "a100_to_h100_sm": 2.0, "h100_bf16_over_a100": round(989.5 / 312, 2), "b200_over_h100": round(2250 / 989.5, 2),
  "rubin_over_b200": round(4000 / 2250, 2), "rubin_fp8_over_bf16": round(17500 / 4000, 3), "b300_fp4_over_fp8": 3.0,
  "rtx5090_over_h100_bf16": round(209.5 / 989.5, 3),
  "h100_rf_total_mb": round(132 * 256 / 1024, 1), "h100_smem_total_mb": round(132 * 228 / 1024, 1),
  "b300_tmem_total_mb": round(160 * 256 / 1024, 1),
  "a100_sm_enabled_frac": round(108 / 128, 3), "h100_sm_enabled_frac": round(132 / 144, 3), "rtx5090_sm_enabled_frac": round(170 / 192, 3),
  "rubin_tc_per_sm": 896 / 224,
  "luo_mma_frac": 62.9, "luo_wgmma_fp16": 729.3, "luo_wgmma_fp16_peak": 756.5, "luo_wgmma_frac": round(729.3 / 756.5 * 100, 1),
  "dsmem_cyc": 180, "dsmem_tbs": 3.27,
}

data = {
  "m1": {"chase": chase, "little": little, "stream": stream, "smem": smem, "div": div,
         "levels_ns": {k: round(v, 1) for k, v in lv.items()}, "levels_cyc": {k: round(v) for k, v in lv_cyc.items()},
         "load_min": round(min(loads), 1), "load_max": round(max(loads), 1),
         "versions": open(os.path.join(HERE, "m1", "out", "versions.txt")).read().strip(),
         "dates": [r["meta"]["started"][:10] for r in runs],
         "smem_groups_64k": smem_groups},
  "little": {"stream_peak": round(stream_peak, 1), "one_warp": round(one_warp, 2), "ratio": round(stream_peak / one_warp),
             "m1_inflight_kb": round(m1_bytes_in_flight / 1024, 1), "m1_per_core_kb": round(m1_per_core / 1024, 2),
             "h100_lat_ns": round(h100_lat_s * 1e9), "h100_inflight_mb": round(h100_inflight / 1e6, 2),
             "h100_per_sm_kb": round(h100_per_sm / 1024, 2), "h100_per_sm_bytes": round(h100_per_sm, -2), "h100_threads_4b": round(h100_threads_4b), "h100_threads_16b": round(h100_threads_16b),
             "chase_sat": round(little_sat, 1), "chase_one": round(little_one, 2), "chase_ratio": round(little_sat / little_one)},
  "hide": HIDE, "occ_tile": OCC_TILE, "occ_small": OCC_SMALL, "luo_ns": luo_ns, "luo": LUO, "tile": tile, "h100_clock": round(h100_clock, 3), "chips": CHIPS, "peak": PEAK, "ratios": ratios,
  "gens": gens, "src": SRC, "m1_clock": M1_CLOCK_GHZ,
  "div_ratio32": round(div[-1][1] / div[0][1], 1), "div_ratio2": round(div[1][1] / div[0][1], 2), "div_sg32": round(div[-1][4] / div[0][4], 2),
}
json.dump(data, open(os.path.join(HERE, "out", "expected.json"), "w"), indent=1)
with open(os.path.join(HERE, "parts", "22_js_ga_data.js"), "w") as f:
    f.write("// Generated by src/recompute.py from m1/out/run_*.json and typed vendor figures. Do not edit.\nwindow.GA=")
    f.write(json.dumps(data, separators=(",", ":")))
    f.write(";\n")
print(json.dumps({"occ": [OCC_TILE, OCC_SMALL], "hide": HIDE, "occ_tile": OCC_TILE, "occ_small": OCC_SMALL, "levels_ns": data["m1"]["levels_ns"], "levels_cyc": data["m1"]["levels_cyc"], "little": data["little"],
                  "tile": tile, "h100_clock": data["h100_clock"], "div": [data["div_ratio2"], data["div_ratio32"], data["div_sg32"]],
                  "load": [data["m1"]["load_min"], data["m1"]["load_max"]], "hide": HIDE, "occ_tile": OCC_TILE, "occ_small": OCC_SMALL, "luo_ns": luo_ns, "ratios": ratios}, indent=1))
