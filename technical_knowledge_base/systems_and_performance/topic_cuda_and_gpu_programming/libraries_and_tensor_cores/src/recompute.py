"""Builds out/data.json and parts/23_js_data.js (window.LT) from the recorded outputs, and recomputes
every derived number the page shows (the page's JavaScript is checked against these by check_embed.py
and check/check_page.mjs). Inputs: m1/out/run_*.json, cuda/out/matrix.json, cuda/out/extra/*.txt,
cutlass_sass/out/cutlass_sass.json, cublas/out/cublas_inventory.json, cute/out/layouts.txt, cute_dsl/out/run.txt."""
import json, os, re, glob, math, statistics as st
H = os.path.dirname(os.path.abspath(__file__))
J = lambda *p: json.load(open(os.path.join(H, *p)))
D = {}
# ---- M1 measurements: median of three runs, with min and max ----
runs = [J("m1", "out", "run_%d.json" % i) for i in (1, 2, 3)]
D["m1"] = {"mlx": runs[0]["mlx"], "load": [round(min(r["load_before"] for r in runs), 1), round(max(max(r["load_before"], r["load_after"]) for r in runs), 1)], "shapes": [], "epi": []}
for i, s in enumerate(runs[0]["shapes"]):
    v = [r["shapes"][i] for r in runs]
    D["m1"]["shapes"].append({"M": s["M"], "N": s["N"], "K": s["K"], "ms": round(st.median(x["ms"] for x in v), 3),
        "ms_lo": round(min(x["ms"] for x in v), 3), "ms_hi": round(max(x["ms"] for x in v), 3),
        "tflops": round(st.median(x["tflops"] for x in v), 2), "gbs": round(st.median(x["gbs"] for x in v), 1)})
for i, e in enumerate(runs[0]["epilogue"]):
    v = [r["epilogue"][i] for r in runs]; row = {"K": e["K"], "M": e["M"], "N": e["N"]}
    for k in ("gemm_only_ms", "unfused_ms", "compiled_tail_ms", "addmm_compiled_ms"):
        row[k] = round(st.median(x[k] for x in v), 2); row[k + "_lo"] = round(min(x[k] for x in v), 2); row[k + "_hi"] = round(max(x[k] for x in v), 2)
    row["err"] = round(max(x["max_abs_err_addmm"] for x in v), 4)
    # bytes the epilogue round trip moves: write Y, read Y, write Z (fp16), for the compiled tail
    row["tail_mb"] = round(2 * 2 * e["M"] * e["N"] / 2**20)
    D["m1"]["epi"].append(row)
# ---- compile matrix ----
m = J("cuda", "out", "matrix.json")
for k, r in m["kernels"].items():
    for t, e in r["t"].items():
        e["key"] = [re.sub(r"^/\*[0-9a-f]+\*/ ", "", x) for x in e.get("key", [])][:4]
        e.pop("n_sass", None)
D["matrix"] = m
extra = {}
for f in sorted(glob.glob(os.path.join(H, "cuda", "out", "extra", "i*.txt"))):
    k, t = os.path.basename(f)[:-4].rsplit(".", 1)
    txt = open(f).read(); ok = "exit=0" in txt
    ops = re.findall(r"^\s+(\d+) (\S+)", txt, re.M)
    err = re.findall(r"error\s+:\s+(.*)", txt)
    extra.setdefault(k, {})[t] = {"ok": ok, "ops": {o: int(n) for n, o in ops}, "msg": err[:1]}
D["extra"] = extra
D["cutlass"] = J("cutlass_sass", "out", "cutlass_sass.json")
D["cublas"] = J("cublas", "out", "cublas_inventory.json")
# ---- CuTe layouts printed by CuTe (presets for the Layout lab) ----
lay = {}
for line in open(os.path.join(H, "cute", "out", "layouts.txt")):
    mm = re.match(r"^(CASE|TV|ATOM|SHAPE) ([^|\s]+)\|(.*)$", line.strip())
    if mm: lay[mm.group(2)] = {"kind": mm.group(1), "txt": mm.group(3).split("|")[0 if mm.group(1) in ("CASE", "ATOM", "SHAPE") else 1].replace("_", "")}
D["cute"] = lay
txt = open(os.path.join(H, "cute", "out", "layouts.txt")).read()
D["cute_tiled"] = re.search(r"ThrLayoutVMNK:\s*(\S+)", txt).group(1).replace("_", "")
dsl = [l.strip() for l in open(os.path.join(H, "cute_dsl", "out", "run.txt")) if l.startswith(("DSL ", "STEP ", "PTX ", "cutlass-dsl", "SASS_LINES"))]
D["dsl"] = dsl
D["layout_check"] = J("out", "layout_check.json")
D["host"] = {k: [l.rstrip() for l in open(os.path.join(H, "cuda", "out", "host", k + ".run.txt"))] for k in ("lt_gelu_bias", "tma_descriptor")}
# ---- derived: one 128x128 tile, K chunk 64, FP16 in, FP32 accumulate ----
BM, BN, BK = 128, 128, 64
gen = {}
gen["ampere"] = {"mma": (BM // 16) * (BN // 8) * (BK // 16), "issuers": 128, "acc_regs": BM * BN // 128,
                 "copy": (BM * BK + BN * BK) * 2 // 16, "ldsm": 4 * ((64 * 64) // 256) * 2}
gen["hopper"] = {"mma": (BM // 64) * (BN // 128) * (BK // 16), "issuers": 256, "acc_regs": BM * BN // 256, "copy": 2}
gen["blackwell"] = {"mma": (BM // 128) * (BN // 128) * (BK // 16), "issuers": 1, "acc_regs": 0, "copy": 2,
                    "tmem_cols": BN, "tmem_kb": BM * BN * 4 // 1024}
# cross-check against compiled Triton tiles from the CUDA root (128x128x32, 4 warps): per warp HMMA and HGMMA
gen["check_triton_sm80_hmma_per_warp"] = (128 // 16) * (128 // 8) * (32 // 16) // 4   # 64 in FACTS
gen["check_triton_sm90_hgmma"] = (128 // 64) * (128 // 128) * (32 // 16)            # 4 in FACTS
D["tile"] = gen
# ---- the running example: Y = GELU(X W + b), X 8192 x 4096, W 4096 x 14336 ----
M, K, N = 8192, 4096, 14336
ex = {"M": M, "K": K, "N": N, "gflop": round(2 * M * N * K / 1e9, 1)}
ex["tiles_128x256"] = math.ceil(M / 128) * math.ceil(N / 256)
for g, sms in (("A100", 108), ("H100", 132), ("B200", 148), ("RTX5090", 170)):
    t = ex["tiles_128x256"]; w = t / sms
    ex[g] = {"sms": sms, "waves": round(w, 2), "eff": round(w / math.ceil(w), 3)}
# bytes the GELU+bias epilogue saves when fused: Y written and read again, plus Z written then read
ex["unfused_extra_gb"] = round(2 * (2 * M * N) * 2 / 1e9, 2)    # write Y, read Y, write Z, read Z (bf16), minus Z write kept
# what that costs on an H100: GEMM at SemiAnalysis's measured ~720 TFLOP/s BF16 (independent), extra bytes at 3.35 TB/s (vendor)
ex["h100_gemm_ms"] = round(2 * M * N * K / 720e12 * 1e3, 2)
ex["h100_extra_ms"] = round(ex["unfused_extra_gb"] / 3.35e3 * 1e3, 2)
ex["h100_extra_pct"] = round(100 * ex["h100_extra_ms"] / ex["h100_gemm_ms"])
D["example"] = ex
# NVIDIA's wave-quantization example (Matrix Multiplication Background guide): A100, 256x128 tiles
nv = []
for (Mq, Nq) in ((2304, 1536), (2304, 1544)):
    t = math.ceil(Mq / 256) * math.ceil(Nq / 128); nv.append({"M": Mq, "N": Nq, "tiles": t, "waves": math.ceil(t / 108)})
D["nv_waves"] = nv
# shared-memory pipeline stages: 128x256 tile, K chunk 64, BF16 operands, 227 KB per block on H100
stage = (128 * 64 + 256 * 64) * 2
D["stages"] = {"stage_kb": stage // 1024, "max_stages_h100": (227 * 1024) // stage, "max_stages_rtx": (99 * 1024) // stage}

# ---- the GEMM scheduler model (mirrors window.GS.plan in parts/33_js_sched.js) ----
def sched_plan(M, N, K, bm, bn, P, sch):
    BK = 64; T = math.ceil(M / bm) * math.ceil(N / bn); I = math.ceil(K / BK)
    time = 0; extra = 0
    def put(start, ln):
        nonlocal time; time = max(time, start + ln)
    if sch == "dp":
        for t in range(T): put((t // P) * I, I)
    elif sch.startswith("sk"):
        s = min(int(sch[2:]), I); each = math.ceil(I / s)
        for u in range(T * s):
            part = u % s; ln = min(each, I - part * each)
            if ln > 0: put((u // P) * each, ln)
        extra = T * s * bm * bn * 8 if s > 1 else 0
    else:
        dpw = 0
        if sch == "hybrid":
            full = T // P; dpw = full if T % P == 0 else max(0, full - 1)
        for t in range(dpw * P): put((t // P) * I, I)
        t0 = dpw * P; W = (T - t0) * I; partial = 0
        if W > 0:
            per = math.ceil(W / P); base = dpw * I
            for sm in range(P):
                a = sm * per; b = min(W, a + per); clock = base
                while a < b:
                    off = a % I; ln = min(I - off, b - a); put(clock, ln)
                    if ln < I: partial += 1
                    clock += ln; a += ln
        extra = partial * bm * bn * 8
    return {"T": T, "I": I, "time": time, "util": round(T * I / (P * time), 6), "extra": extra}
PRE = [(2304, 1536, 4096, 256, 128, 108, "dp"), (2304, 1544, 4096, 256, 128, 108, "dp"), (8192, 14336, 4096, 128, 256, 132, "dp"),
       (1024, 1024, 16384, 128, 256, 132, "dp"), (1024, 1024, 16384, 128, 256, 132, "sk4"), (1024, 1024, 16384, 128, 256, 132, "stream"),
       (1536, 1536, 8192, 128, 128, 132, "dp"), (1536, 1536, 8192, 128, 128, 132, "stream"), (1536, 1536, 8192, 128, 128, 132, "hybrid"),
       (777, 5000, 3000, 64, 64, 170, "sk8"), (4096, 4096, 4096, 256, 128, 148, "hybrid")]
D["sched_check"] = [{"args": list(p), **sched_plan(*p)} for p in PRE]
out = os.path.join(H, "out", "data.json")
json.dump(D, open(out, "w"), separators=(",", ":"))
open(os.path.join(H, "parts", "23_js_data.js"), "w").write("// generated by recompute.py from the recorded outputs; do not edit\nwindow.LT=" + json.dumps(D, separators=(",", ":")) + ";\n")
print("data.json", os.path.getsize(out), "bytes")
print(json.dumps({k: D[k] for k in ("tile", "example", "nv_waves", "stages")}, indent=0))
print(json.dumps(D["m1"]["epi"], indent=0)[:1200])
