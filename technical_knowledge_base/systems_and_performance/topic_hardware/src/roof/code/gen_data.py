"""out/run_*.json (measured) + published specs -> ../parts/33_js_roof_0data.js (window.ROOFD).
The page shows nothing about measurements that is not in this file. Run from anywhere."""
import json, glob, os, statistics

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)  # src/roof
runs = [json.load(open(p)) for p in sorted(glob.glob(os.path.join(ROOT, "out", "run_*.json")))]
assert len(runs) == 3, len(runs)

cases = []
for i, c0 in enumerate(runs[0]["cases"]):
    cs = [r["cases"][i] for r in runs]
    assert all(c["name"] == c0["name"] for c in cs)
    med = statistics.median(c["median_s"] for c in cs)
    lo = min(c["min_s"] for c in cs); hi = max(c["max_s"] for c in cs)
    f, b = c0["flops"], c0["bytes"]
    cases.append({
        "name": c0["name"], "group": c0["group"], "flops": f, "bytes": b, "ai": c0["ai"],
        "batch": c0.get("batch"), "note": c0.get("note"), "rolled": c0.get("rolled", False),
        "s": med, "s_min": lo, "s_max": hi,
        "gf": f / med / 1e9, "gf_best": f / lo / 1e9, "gf_worst": f / hi / 1e9,
        "gbs": b / med / 1e9, "gbs_best": b / lo / 1e9, "gbs_worst": b / hi / 1e9,
        "run_medians_ms": [round(c["median_s"] * 1e3, 4) for c in cs],
        "load": [round(c["load"], 1) for c in cs],
    })

meta = runs[0]["meta"]
meta = {"date": meta["date"][:10], "mlx": meta["mlx"], "numpy": meta["numpy"], "python": meta["python"],
        "device": meta["device"], "arch": meta["arch"], "memory_gb": meta["memory_bytes"] / 2 ** 30,
        "trials": runs[0]["cases"][0]["trials"], "runs": len(runs),
        "load_range": [round(min(min(r["meta"]["load_start"][0], r["meta"]["load_end"][0]) for r in runs), 1),
                       round(max(max(r["meta"]["load_start"][0], r["meta"]["load_end"][0]) for r in runs), 1)]}

# M1 Pro CPU, measured on the C++ page (Part 2, roof.cpp, 3 runs; medians of the three)
cpu_runs = {"p8": [562.0, 493.8, 602.8], "bw8": [104.5, 79.6, 106.6], "p1": [97.5, 95.4, 98.7], "bw1": [49.3, 52.8, 45.4],
            "mv8": [51.2, 32.2, 49.8], "mm8": [82.0, 64.1, 101.0]}
cpu = {k: {"median": statistics.median(v), "min": min(v), "max": max(v)} for k, v in cpu_runs.items()}

S = {
 "h100": "https://www.nvidia.com/en-us/data-center/h100/",
 "hgx": "https://www.nvidia.com/en-us/data-center/hgx/",
 "dgxb200": "https://www.nvidia.com/en-us/data-center/dgx-b200/",
 "rtx": "https://images.nvidia.com/aem-dam/Solutions/geforce/blackwell/nvidia-rtx-blackwell-gpu-architecture.pdf",
 "mi300x": "https://www.amd.com/content/dam/amd/en/documents/instinct-tech-docs/data-sheets/amd-instinct-mi300x-data-sheet.pdf",
 "v6e": "https://docs.cloud.google.com/tpu/docs/v6e",
 "v7": "https://docs.cloud.google.com/tpu/docs/tpu7x",
 "apple": "https://www.apple.com/newsroom/2021/10/introducing-m1-pro-and-m1-max-the-most-powerful-chips-apple-has-ever-built/",
 "turner": "https://github.com/philipturner/metal-benchmarks",
 "llama3": "https://arxiv.org/html/2407.21783v3",
}
gpu_peak32 = next(c for c in cases if c["name"].startswith("peak FMA fp32"))["gf"]
gpu_peak16 = next(c for c in cases if c["name"].startswith("peak FMA fp16"))["gf"]
gpu_bw = next(c for c in cases if c["name"].startswith("stream copy"))["gbs"]
# chips: peak in TFLOP/s per precision (dense), bandwidth in GB/s. kind: measured | vendor
chips = [
 {"id": "m1g", "name": "Apple M1 Pro GPU (measured here)", "kind": "measured", "bw": gpu_bw, "mem_gb": 16,
  "peaks": {"fp32": gpu_peak32 / 1e3, "fp16": gpu_peak16 / 1e3, "bf16": gpu_peak16 / 1e3},
  "src": "measured", "pub": {"bw": 200, "fp32": 5.308},
  "note": "Measured: peak from the FMA kernel, bandwidth from the stream copy. No tensor cores: fp16 and bf16 run on the same ALUs at the fp32 rate (bf16 taken equal to fp16; MLX's bf16 matmul is slower, see the kernel table). Apple publishes 200 GB/s; 5.308 TFLOP/s fp32 is an independent derivation (16 cores x 128 ALUs x 2 x 1.296 GHz)."},
 {"id": "m1c", "name": "Apple M1 Pro CPU, 8 threads (measured, C++ page)", "kind": "measured", "bw": cpu["bw8"]["median"], "mem_gb": 16,
  "peaks": {"fp32": cpu["p8"]["median"] / 1e3}, "src": "cpp",
  "note": "From the C++ page, Part 2 (roof.cpp): NEON FMA on 8 threads and a read of a large array; medians of three runs."},
 {"id": "h100", "name": "NVIDIA H100 SXM", "kind": "vendor", "bw": 3350, "mem_gb": 80,
  "peaks": {"fp32": 67, "tf32": 494.5, "bf16": 989.5, "fp16": 989.5, "fp8": 1979}, "src": S["h100"],
  "note": "Vendor page lists tensor figures with sparsity (1,979 BF16); dense is half."},
 {"id": "b200", "name": "NVIDIA B200 (HGX, per GPU)", "kind": "vendor", "bw": 8000, "mem_gb": 180,
  "peaks": {"fp32": 75, "tf32": 1125, "bf16": 2250, "fp16": 2250, "fp8": 4500, "fp4": 9000}, "src": S["hgx"],
  "note": "HGX B200 page gives 8-GPU totals (BF16 36 PF, FP8 72 PF sparse, FP4 72 PF dense, FP32 600 TF); divided by 8, BF16 read as sparse like the FP8 row. Bandwidth and memory from DGX B200 (64 TB/s and 1,440 GB for 8)."},
 {"id": "rtx5090", "name": "NVIDIA RTX 5090", "kind": "vendor", "bw": 1792, "mem_gb": 32,
  "peaks": {"fp32": 104.8, "tf32": 104.8, "bf16": 209.5, "fp16": 209.5, "fp8": 419, "fp4": 1676}, "src": S["rtx"],
  "note": "Tensor figures with FP32 accumulate (what training uses); with FP16 accumulate FP16 is 419 and FP8 838. Whitepaper Appendix A, dense column."},
 {"id": "mi300x", "name": "AMD Instinct MI300X", "kind": "vendor", "bw": 5300, "mem_gb": 192,
  "peaks": {"fp32": 163.4, "tf32": 653.7, "bf16": 1307.4, "fp16": 1307.4, "fp8": 2614.9}, "src": S["mi300x"],
  "note": "Data sheet, dense column (sparsity doubles each)."},
 {"id": "v6e", "name": "Google TPU v6e (Trillium)", "kind": "vendor", "bw": 1638, "mem_gb": 32,
  "peaks": {"bf16": 918}, "src": S["v6e"], "note": "Google lists BF16 918 TFLOPs and INT8 1,836 TOPS; no FP8 or FP32 figure."},
 {"id": "v7", "name": "Google TPU7x (Ironwood)", "kind": "vendor", "bw": 7380, "mem_gb": 206,
  "peaks": {"bf16": 2307, "fp8": 4614}, "src": S["v7"], "note": "Google lists 192 GiB (206 GB) HBM, 7,380 GB/s."},
]
llama3 = {"rows": [{"gpus": 8192, "tflops": 430, "mfu": 43}, {"gpus": 16384, "tflops": 400, "mfu": 41},
                   {"gpus": 16384, "tflops": 380, "mfu": 38, "ctx": 131072}], "src": S["llama3"]}
D = {"meta": meta, "cases": cases, "cpu": cpu, "chips": chips, "llama3": llama3, "src": S}
out = os.path.join(ROOT, "..", "parts", "33_js_roof_0data.js")
with open(out, "w") as fh:
    fh.write("// generated by src/roof/code/gen_data.py from src/roof/out/run_*.json; do not edit\n")
    fh.write("window.ROOFD=" + json.dumps(D, separators=(",", ":")) + ";\n")
json.dump(D, open(os.path.join(ROOT, "out", "data.json"), "w"), indent=1)
print("wrote", out, os.path.getsize(out), "bytes;", len(cases), "cases")
