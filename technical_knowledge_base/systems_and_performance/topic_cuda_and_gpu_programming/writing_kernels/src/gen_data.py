"""Merge the recorded outputs into the page's data: out/data.json and parts/22_js_data.js (window.WKD).

M1 cases: median of the three runs' medians; lo/hi = min and max over every trial of the three runs.
Kernel sources: the Metal bodies from m1/k_*.py and the CUDA files from cuda/kernels/, verbatim.
Compiled: cuda/out/stats.json (from cuda/sass_stats.py). Published figures are typed in here with their source.
Run from src/: python3 gen_data.py"""
import json, os, re, glob, sys
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "m1"))
import k_reduce, k_scan, k_norm, k_fuse, k_gemv, k_attn  # noqa: E402  (plain string constants, no MLX import)


def key(c):
    g, s = c["group"], c["step"]
    if g == "fuse": return f"{s}@{c['K']}"
    if g == "attn": return f"{s}@{c['N']}"
    if g in ("decode", "camp"): return f"{s}@{c['L']}"
    return s


def merge(files):
    runs = [json.load(open(f)) for f in files]
    out = {}
    for cs in zip(*[r["cases"] for r in runs]):
        c0 = cs[0]
        assert all(key(c) == key(c0) for c in cs)
        meds = sorted(c["median_s"] for c in cs)
        e = {k: v for k, v in c0.items() if k not in ("median_s", "min_s", "max_s", "trials", "reps", "load", "peak_bytes", "err")}
        e.update(ms=round(meds[1] * 1e3, 4), lo=round(min(c["min_s"] for c in cs) * 1e3, 4), hi=round(max(c["max_s"] for c in cs) * 1e3, 4),
                 runs=[round(c["median_s"] * 1e3, 4) for c in cs], err=max((c["err"] or 0) for c in cs) if c0["err"] is not None else None,
                 load=[c["load"] for c in cs])
        out.setdefault(c0["group"], {})[key(c0)] = e
    return runs, out


runs, m1 = merge([os.path.join(HERE, f"m1/out/run_{i}.json") for i in (1, 2, 3)])
camp_runs, camp = merge([os.path.join(HERE, f"m1/out/camp_{i}.json") for i in (1, 2, 3)])
m1.update(camp)
loads = [c["load"] for r in runs + camp_runs for c in r["cases"]]
facts = runs[0]["facts"]
facts["reduce_accuracy"]["atomic_distinct_per_run"] = [r["facts"]["reduce_accuracy"]["atomic_distinct_bits"] for r in runs]
facts["reduce_accuracy"]["tree_distinct_per_run"] = [r["facts"]["reduce_accuracy"]["tree_distinct_bits"] for r in runs]
facts["reduce_accuracy"]["atomic_values_all"] = sorted(set(v for r in runs for v in r["facts"]["reduce_accuracy"]["atomic_values"]))

cuda = json.load(open(os.path.join(HERE, "cuda/out/stats.json")))
keep = {}
for fn, a in cuda["stats"].items():
    keep[fn] = {arch: {k: d.get(k) for k in ("regs", "smem", "spill_st", "instructions", "counts")} for arch, d in a.items()}


def src_of(path):
    return open(os.path.join(HERE, path)).read()


code = {
    "R1": k_reduce.R1_INTERLEAVED, "R2": k_reduce.R2_STRIDED, "R3": k_reduce.R3_SEQUENTIAL, "R4": k_reduce.R4_FIRSTADD,
    "R5": k_reduce.R5_SIMD_TAIL, "R6": k_reduce.R6_GRIDSTRIDE, "A1": k_reduce.A1_ATOMIC,
    "C1": k_scan.C1_STEP, "C2a": k_scan.C2_TILESUM, "C2b": k_scan.C2_SCANSUMS, "C2c": k_scan.C2_TILESCAN,
    "L_welford": k_norm.L_WELFORD, "L_naive": k_norm.L_NAIVE, "RMS_RESID": k_norm.RMS_RESID,
    "EPI": k_fuse._EPI_REG, "RMS_PRO": k_fuse._RMS_PRO,
    "Q2": k_gemv.Q2_SIMD, "Q1": k_gemv.Q1_THREAD, "FLASH": k_attn.FLASH, "L_two": k_norm.L_TWOPASS, "DEC": k_attn.DECODE_SPLIT, "DECC": k_attn.DECODE_COMBINE,
    "cuda_reduce": src_of("cuda/kernels/r_reduce_ladder.cu"), "cuda_matmul": src_of("cuda/kernels/m_ladder.cu"),
    "cuda_cub": src_of("cuda/kernels/r_cub.cu"), "cuda_gemv": src_of("cuda/kernels/g_dequant_gemv.cu"),
}
# the causal and grid switches, as excerpts of the attention kernel
fl = k_attn.FLASH.splitlines()
code["FLASH_SWITCH"] = "\n".join(l for l in fl if "SEQPAR" in l or "kend" in l or "CAUSAL" in l or "select(" in l)

pub = {
    "harris": {"src": "https://developer.download.nvidia.com/assets/cuda/files/reduction.pdf", "gpu": "G80 (GeForce 8800 GTX)",
               "peak_gbs": 86.4, "n": 4194304,
               "rows": [[1, "interleaved addressing, divergent branching", 8.054, 2.083], [2, "interleaved addressing, bank conflicts", 3.456, 4.854],
                        [3, "sequential addressing", 1.722, 9.741], [4, "first add during global load", 0.965, 17.377],
                        [5, "unroll last warp", 0.536, 31.289], [6, "completely unrolled", 0.381, 43.996],
                        [7, "multiple elements per thread", 0.268, 62.671]], "k7_32M_gbs": 73},
    "boehm": {"src": "https://siboehm.com/articles/22/CUDA-MMM", "gpu": "RTX A6000", "n": 4092,
              "rows": [[1, "naive", 309.0, 1.3], [2, "global memory coalescing", 1986.5, 8.5], [3, "shared memory blocking", 2980.3, 12.8],
                       [4, "1D blocktiling", 8474.7, 36.5], [5, "2D blocktiling", 15971.7, 68.7], [6, "vectorized mem access", 18237.3, 78.4],
                       [9, "autotuning", 19721.0, 84.8], [10, "warptiling", 21779.3, 93.7]], "cublas": 23249.6},
    "fa2": {"src": "https://arxiv.org/abs/2307.08691", "a100_mm": 312, "a100_nonmm": 19.5, "speedup": "about 2x", "util": "50-73%",
            "train": 225, "mfu": 72, "causal": "1.7-1.8x"},
    "fa3": {"src": "https://arxiv.org/abs/2407.08608", "h100_mm": 989, "h100_sfu": 3.9, "pingpong_from": 570, "pingpong_to": "620-640",
            "abl_full": 661, "abl_nopipe": 582, "abl_nows": 570, "fp16": 740, "fp16_util": 75, "fp8": "close to 1.2 PFLOPs/s", "fp8_err": 2.6},
    "fa4": {"src": "https://arxiv.org/abs/2603.05451", "b200": 1613, "util": 71, "vs_cudnn": 1.3, "vs_triton": 2.7},
    "fd": {"src": "https://crfm.stanford.edu/2023/10/12/flashdecoding.html", "speedup": 8, "sms": 108},
    "marlin": {"src": "https://arxiv.org/abs/2408.11743", "batch": "16-32", "speedup": 4, "vllm": 2.8},
    "decoupled": {"src": "https://research.nvidia.com/publication/2016-03_single-pass-parallel-prefix-scan-decoupled-look-back"},
    "tol": {"float32": [1.3e-6, 1e-5], "float16": [1e-3, 1e-5], "bfloat16": [0.016, 1e-5], "float64": [1e-7, 1e-7]},
    "root_overhead_us": 235,
}
meta = dict(runs[0]["meta"])
meta.update(runs=3, trials=7, load_min=min(loads), load_max=max(loads), camp_date=camp_runs[0]["meta"]["date"],
            end=runs[-1]["meta"]["date"], nvcc=cuda["nvcc"])
data = {"meta": meta, "m1": m1, "facts": facts, "cuda": keep, "excerpts": cuda["excerpts"], "code": code, "pub": pub}
os.makedirs(os.path.join(HERE, "out"), exist_ok=True)
json.dump(data, open(os.path.join(HERE, "out/data.json"), "w"), indent=1)
js = "// generated by src/gen_data.py from m1/out, cuda/out and published figures; do not edit\nwindow.WKD=" + json.dumps(data, separators=(",", ":")) + ";\n"
js = js.replace("{{", "{\\u007b")   # keep the build's {{text|url}} link syntax out of embedded CUDA source
open(os.path.join(HERE, "parts/22_js_data.js"), "w").write(js)
print("wrote out/data.json and parts/22_js_data.js,", len(js), "bytes")
