"""Build ../parts/31_js_sim_0data.js (the only data the GPU simulator tab embeds) from:
  out/run_{1,2,3}.json      measurements on the Apple M1 Pro GPU (measure_m1.py)
  ../compile/out/*.ptxas.txt real `ptxas -v` register and shared-memory counts (Compiler explorer tab, CUDA 13.4)
  published figures below (each with its source and the date it was read)."""
import glob, json, os, re, statistics

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
SRC = os.path.dirname(ROOT)

runs = [json.load(open(p)) for p in sorted(glob.glob(os.path.join(ROOT, "out", "run_*.json")))]
assert len(runs) == 3, len(runs)
meta = runs[0]["meta"]


def agg():
    by = {}
    for r in runs:
        for c in r["cases"]:
            if "median_s" not in c:
                continue
            by.setdefault((c["group"], c["name"]), []).append(c)
    out = {}
    for (g, n), cs in by.items():
        med = statistics.median(c["median_s"] for c in cs)
        e = {"name": n, "ms": round(med * 1e3, 4), "ms_min": round(min(c["min_s"] for c in cs) * 1e3, 4),
             "ms_max": round(max(c["max_s"] for c in cs) * 1e3, 4),
             "run_ms": [round(c["median_s"] * 1e3, 4) for c in cs], "load": [round(c["load"], 1) for c in cs]}
        for k in ("stride", "offset", "threads", "tile", "mode"):
            if k in cs[0]:
                e[k] = cs[0][k]
        b = cs[0].get("useful_bytes") or cs[0].get("bytes")
        if b:
            e["gbps"] = round(b / med / 1e9, 2)
        if "flops" in cs[0]:
            e["gflops"] = round(cs[0]["flops"] / med / 1e9, 1)
        if "reads" in cs[0]:
            e["greads"] = round(cs[0]["reads"] / med / 1e9, 1)
        out.setdefault(g, []).append(e)
    return out


meas = agg()
loads = [c["load"] for r in runs for c in r["cases"] if "load" in c]

# ptxas -v from the Compiler explorer's container build
PT = {}
for p in sorted(glob.glob(os.path.join(SRC, "compile", "out", "*.ptxas.txt"))):
    arch = re.search(r"\.(sm_\w+)\.ptxas\.txt$", p).group(1)
    fn = None
    for line in open(p):
        m = re.search(r"Compiling entry function '(\w+)'", line)
        if m:
            fn = m.group(1)
        m = re.search(r"Used (\d+) registers(?:, used (\d+) barriers)?(?:, (\d+) bytes smem)?", line)
        if m and fn:
            PT.setdefault(fn, {})[arch] = {"regs": int(m.group(1)), "bars": int(m.group(2) or 0), "smem": int(m.group(3) or 0)}
        m = re.search(r"(\d+) bytes spill stores", line)
        if m and fn:
            PT.setdefault(fn, {}).setdefault("_spill", {})[arch] = int(m.group(1))
BLOCK = {"vadd": 256, "matmul_naive": 256, "matmul_tiled": 1024, "reduce_sum": 256, "softmax_rows": 256,
         "acc16": 128, "acc32": 128, "acc64": 128, "acc128": 128, "acc192": 128, "acc256": 128}
presets = []
for fn, blk in BLOCK.items():
    if fn not in PT:
        continue
    e = {"fn": fn, "block": blk, "by_arch": {a: v for a, v in PT[fn].items() if a.startswith("sm_")},
         "spill": PT[fn].get("_spill", {})}
    presets.append(e)

# Published figures used by the tab (read 2026-10-05 unless stated)
PUB = {
    "luo_latency_cycles": {  # Luo et al., Benchmarking and Dissecting the Nvidia Hopper GPU Architecture, arXiv 2402.13499v1, Table IV
        "url": "https://arxiv.org/html/2402.13499v1",
        "A100": {"shared": 29.0, "L1": 37.9, "L2": 261.5, "global": 466.3},
        "H800": {"shared": 29.0, "L1": 40.7, "L2": 263.0, "global": 478.8},
        "RTX4090": {"shared": 30.1, "L1": 43.4, "L2": 273.0, "global": 541.5}},
    "chips": {  # peak and bandwidth for the tiling ridge points (vendor pages, read 2026-10-05; shared facts file)
        "H100 SXM": {"fp32": 67e12, "bf16": 989.5e12, "bw": 3.35e12, "url": "https://www.nvidia.com/en-us/data-center/h100/"},
        "B200 (HGX)": {"fp32": 75e12, "bf16": 2250e12, "bw": 8e12, "url": "https://www.nvidia.com/en-us/data-center/hgx/"},
        "RTX 5090": {"fp32": 104.8e12, "bf16": 209.5e12, "bw": 1.792e12,
                     "url": "https://images.nvidia.com/aem-dam/Solutions/geforce/blackwell/nvidia-rtx-blackwell-gpu-architecture.pdf"},
        "A100 SXM": {"fp32": 19.5e12, "bf16": 312e12, "bw": 2.039e12, "url": "https://www.nvidia.com/en-us/data-center/a100/"},
    },
    "m1": {"fp32_measured": 5008.2e9, "fp16_measured": 5063.6e9, "read_measured": 143.5e9, "copy_measured": 164.7e9,
           "note": "measured on Apple M1 Pro GPU by the Roofline lab on Topic: hardware (MLX 0.32.3, 2026-10-05)"},
}

# Cross-check: the Roofline lab on Topic: hardware timed the same two matmul kernels independently
ROOF = os.path.join(SRC, "..", "..", "topic_hardware", "src", "roof", "out", "data.json")
if os.path.exists(ROOF):
    rd = json.load(open(ROOF))
    PUB["roof_cross"] = {c["name"]: round(c["gf"], 1) for c in rd["cases"] if c["name"].startswith("matmul naive, custom") or c["name"].startswith("matmul tiled 16x16, custom")}
    for c in rd["cases"]:
        if c["name"].startswith("peak FMA fp32"): PUB["m1"]["fp32_measured"] = round(c["gf"], 1) * 1e9
        if c["name"].startswith("peak FMA fp16"): PUB["m1"]["fp16_measured"] = round(c["gf"], 1) * 1e9
        if c["name"].startswith("stream read"): PUB["m1"]["read_measured"] = round(c["gbs"], 1) * 1e9
        if c["name"].startswith("stream copy"): PUB["m1"]["copy_measured"] = round(c["gbs"], 1) * 1e9

data = {"meta": {"mlx": meta["mlx"], "numpy": meta["numpy"], "python": meta["python"],
                 "device": meta["device"].get("device_name", "Apple M1 Pro"), "arch": meta["device"].get("architecture", ""),
                 "date": meta["date"][:10], "simd_width": meta.get("simd_width"), "runs": len(runs), "trials": 7, "load_range": [round(min(loads), 1), round(max(loads), 1)]},
        "m": meas, "ptxas": presets, "pub": PUB}
js = "// GPU simulator tab data, generated by src/sim/code/gen_data.py from src/sim/out/run_*.json and ../compile/out. Do not edit.\nwindow.SIMD=" + json.dumps(data, separators=(",", ":")) + ";\n"
open(os.path.join(SRC, "parts", "31_js_sim_0data.js"), "w").write(js)
json.dump(data, open(os.path.join(ROOT, "out", "data.json"), "w"), indent=1)
print("wrote parts/31_js_sim_0data.js", len(js), "bytes;", {k: len(v) for k, v in meas.items()}, "presets", len(presets))
for g, cs in meas.items():
    for c in cs:
        print(f"  {g:9s} {c['name']:34s} {c['ms']:9.3f} ms  runs {c['run_ms']}  load {c['load']}  gbps {c.get('gbps')} gflops {c.get('gflops')} greads {c.get('greads')}")
