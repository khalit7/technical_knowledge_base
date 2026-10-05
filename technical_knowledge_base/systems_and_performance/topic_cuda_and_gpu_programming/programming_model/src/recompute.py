"""Everything the page shows, recomputed from raw outputs (stdlib only; run from src/).
Inputs: cuda/out/ (real nvcc/ptxas/cuobjdump output, CUDA 13.4.2, no GPU), m1/out/run_{1,2,3}.json
(Apple M1 Pro GPU), py/out/ (Numba, CuPy, PyTorch extension attempts), cuda/out/occ_nvidia.jsonl
(NVIDIA's cuda_occupancy.h). Writes cuda/out/occ_cases.txt (input for the header check),
out/data.json and parts/22_js_pm_data.js (window.PM)."""
import glob, json, os, re, statistics as st
from occ import ARCH, blocks_per_sm, suggest

D = {}
ARCHS = ["sm_80", "sm_90a", "sm_100a", "sm_120"]
GPUS = [  # name, arch, SMs, source
    ("A100 SXM", "sm_80", 108, "NVIDIA Ampere architecture blog: A100 has 108 SMs"),
    ("H100 SXM", "sm_90a", 132, "NVIDIA Hopper architecture blog: H100 SXM5 has 132 SMs"),
    ("B200", "sm_100a", 148, "Jarmusch and Chandrasekaran, arXiv 2512.02189 (independent): 148 SMs"),
    ("RTX 5090", "sm_120", 170, "NVIDIA RTX Blackwell whitepaper, Appendix A: 170 SMs"),
]
D["gpus"] = [dict(name=n, arch=a, sms=s, src=r) for n, a, s, r in GPUS]

# ---- ptxas reports ---------------------------------------------------------------------------
LB = {"heavy_lb1024": 1024, "heavy_lb256x8": 256}
ptx = {}
for f in sorted(glob.glob("cuda/out/p[1-5]_*.ptxas.txt")):
    base = os.path.basename(f)[:-len(".ptxas.txt")]
    src, arch = base.split(".")
    t = open(f).read()
    ptx.setdefault(src, {})[arch] = {"exit": int(re.search(r"exit=(\d+)", t).group(1)),
                                     "errors": re.findall(r"error: (.*)", t),
                                     "warnings": re.findall(r"ptxas warning : (.*)", t)}
    for m in re.finditer(r"Compiling entry function '(\w+)' for '\w+'\n(?:ptxas info\s+: Function properties for \w+\n)?(?:\s+(\d+) bytes stack frame, (\d+) bytes spill stores, (\d+) bytes spill loads\n)?ptxas info\s+: Used (\d+) registers, used (\d+) barriers(?:, (\d+) bytes cumulative stack size)?(?:, (\d+) bytes smem)?", t):
        k = m.group(1)
        ptx[src][arch].setdefault("kernels", {})[k] = {
            "regs": int(m.group(5)), "bars": int(m.group(6)), "smem": int(m.group(8) or 0),
            "stack": int(m.group(2) or 0), "spill_st": int(m.group(3) or 0), "spill_ld": int(m.group(4) or 0),
            "maxT": LB.get(k, 1024)}
D["ptxas"] = ptx
D["nvcc"] = open("cuda/out/nvcc_version.txt").read().strip().splitlines()[0]

# ---- kernel-argument limit --------------------------------------------------------------------
D["params"] = {}
for n in (4096, 32756, 32760):
    t = open(f"cuda/out/p6_params.{n}.txt").read()
    D["params"][str(n)] = {"exit": int(re.search(r"exit=(\d+)", t).group(1)),
                           "msg": (re.findall(r"Error: (.*)", t) or [""])[0]}

# ---- SASS excerpts ----------------------------------------------------------------------------
def sass(file, fn):
    t = open(file).read()
    parts = re.split(r"\n\s*Function : ", t)
    for p in parts[1:]:
        if p.split("\n")[0].strip() == fn:
            out = []
            for l in p.split("\n"):
                m = re.match(r"\s+/\*([0-9a-f]{4})\*/\s+(.*?)\s*;?\s*(?:/\*.*)?$", l)
                if m:
                    ins = m.group(2).strip().rstrip(";").strip()
                    if ins.startswith("BRA") and out and ins.endswith(m.group(1)):  # trailing self-loop
                        break
                    out.append(ins)
            while out and (out[-1] == "NOP" or out[-1].startswith("BRA")):
                out.pop()   # padding after the last EXIT: NOPs and a branch-to-self
            return out
    return []

def ops(lst):
    c = {}
    for i in lst:
        i2 = re.sub(r"^@!?U?P\w+\s+", "", i)
        k = i2.split()[0].split(".")[0]
        c[k] = c.get(k, 0) + 1
    return c

S = {}
S["scale_1d"] = sass("cuda/out/p1_index.sm_90a.sass.txt", "scale_1d")
S["count_naive"] = sass("cuda/out/p2_sync.sm_90a.sass.txt", "count_positive_naive")
S["count_ballot"] = sass("cuda/out/p2_sync.sm_90a.sass.txt", "count_positive")
S["two_phase"] = sass("cuda/out/p3_coop.sm_90a.sass.txt", "two_phase")
S["cluster_90"] = sass("cuda/out/p4_cluster.sm_90a.sass.txt", "cluster_exchange")
S["warp_sum"] = sass("cuda/out/p2_sync.sm_90a.sass.txt", "warp_sum")
bs = sass("cuda/out/p2_sync.sm_90a.sass.txt", "block_sum")
br = sass("cuda/out/p2_sync.sm_90a.sass.txt", "block_sum_racy")
S["count_redux"] = sass("cuda/out/p2_sync.sm_90a.sass.txt", "count_redux")
S["cg_tile_sum"] = sass("cuda/out/p3_coop.sm_90a.sass.txt", "cg_tile_sum")
D["sass"] = S
D["sass_count"] = {k: ops(v) for k, v in S.items()}
D["race_sass"] = {"block_sum": {k: ops(bs).get(k, 0) for k in ("LDS", "STS", "BAR")},
                  "block_sum_racy": {k: ops(br).get(k, 0) for k in ("LDS", "STS", "BAR")},
                  "n_bs": len(bs), "n_br": len(br)}
D["grid_sync_ops"] = [i for i in S["two_phase"] if re.search(r"BAR|MEMBAR|ATOM|LD\.E\.STRONG|YIELD|CCTL|ERRBAR", i)]

# ---- errors (host program run without a GPU) --------------------------------------------------
t = open("cuda/out/errors.txt").read()
D["errors"] = {"calls": [l for l in t.splitlines() if " failed: " in l],
               "codes": [l.split("\t")[1:] for l in t.splitlines() if l.startswith("ERR\t")],
               "runtime": re.search(r"runtime version: (\d+)", t).group(1)}
D["driver_types"] = open("cuda/out/driver_types_excerpt.txt").read()
dc = {}
for m in re.finditer(r"/\*\*(.*?)\*/\s*(cudaError\w+)\s*=", D["driver_types"], re.S):
    dc[m.group(2)] = " ".join(l.strip().lstrip("*").strip() for l in m.group(1).splitlines()).strip().replace("::", "")
D["driver_comments"] = dc
fp = open("cuda/out/first_program.txt").read()
D["first_program"] = {"compile_exit": int(re.search(r"compile_exit=(\d+)", fp).group(1)),
                      "run_exit": int(re.search(r"run_exit=(\d+)", fp).group(1)),
                      "msg": [l for l in fp.splitlines() if l.startswith("host/")]}

# ---- occupancy: the page's kernels on four GPUs; checked against cuda_occupancy.h ------------
OCC_K = [("p1_index", "scale_1d"), ("p1_index", "scale_stride"), ("p2_sync", "block_sum"),
         ("p2_sync", "hist_shared"), ("p3_coop", "two_phase"), ("p4_cluster", "cluster_exchange"),
         ("p5_bounds", "heavy_plain"), ("p5_bounds", "heavy_lb1024"), ("p5_bounds", "heavy_lb256x8")]
occ = {}
cases = []
for name, arch, sms, _ in GPUS:
    a = ARCH[arch]
    for src, k in OCC_K:
        r = ptx[src].get(arch, {}).get("kernels", {}).get(k)
        if not r:
            continue
        row = [blocks_per_sm(arch, r["regs"], r["smem"], b, r["bars"], r["maxT"]) for b in range(32, 1025, 32)]
        sg = suggest(arch, r["regs"], r["smem"], r["bars"], r["maxT"], sms)
        occ.setdefault(arch, {})[k] = {**r, "blocks": row, "suggest": sg}
        cases.append(f"{k} {arch} {a['cc'][0]} {a['cc'][1]} {a['maxW']} {a['maxB']} {a['smemSM']} {a['smemBlock']} "
                     f"{sms} {r['regs']} {r['smem']} {r['maxT']} {r['bars']}")
open("cuda/out/occ_cases.txt", "w").write("\n".join(cases) + "\n")
D["occ"] = occ
D["occ_check"] = None
if os.path.exists("cuda/out/occ_nvidia.jsonl"):
    nv = [json.loads(l) for l in open("cuda/out/occ_nvidia.jsonl") if l.strip()]
    mism, tot = 0, 0
    for o in nv:
        mine = occ[o["arch"]][o["name"]]
        for x, y in zip(mine["blocks"], o["blocks"]):
            tot += 1
            mism += x != y
        tot += 1
        mism += (mine["suggest"]["block"], mine["suggest"]["minGrid"]) != (o["suggest"]["block"], o["suggest"]["minGrid"])
    D["occ_check"] = {"cases": tot, "mismatches": mism, "kernels": len(nv)}

# ---- Apple M1 Pro measurements ------------------------------------------------------------------
runs = [json.load(open(f"m1/out/run_{i}.json")) for i in (1, 2, 3)]
med = lambda xs: st.median(xs)
m1 = {"meta": [r["meta"] for r in runs]}
W = len(runs[0]["cases"]["waves"]["rows"])
wv = [med([r["cases"]["waves"]["rows"][g]["ms"] for r in runs]) for g in range(W)]
m1["waves_ms"] = [round(x, 3) for x in wv]
m1["waves_runs"] = [[round(r["cases"]["waves"]["rows"][g]["ms"], 3) for g in range(W)] for r in runs]
steps = [g + 1 for g in range(1, W) if wv[g] - wv[g - 1] > 0.5 * (wv[16] - wv[15] if W > 16 else 1)]
m1["wave_steps_at"] = steps
plate = []
lo = 1
for s_ in steps + [W + 1]:
    seg = wv[lo - 1:s_ - 1]
    plate.append({"from": lo, "to": s_ - 1, "ms": round(med(seg), 3)})
    lo = s_
m1["plateaus"] = plate
m1["per_wave_ms"] = round(med([plate[i + 1]["ms"] - plate[i]["ms"] for i in range(len(plate) - 1)]), 3)
m1["block_gbps"] = {str(b["tg"]): round(med([r["cases"]["block"]["rows"][i]["gbps"] for r in runs]), 1)
                    for i, b in enumerate(runs[0]["cases"]["block"]["rows"])}
L = [r["cases"]["launch"] for r in runs]
m1["launch"] = {"us_wait_each": round(med([l["us_wait_each"] for l in L]), 1),
                "us_wait_each_runs": [round(l["us_wait_each"], 1) for l in L],
                "us_per_queued": round(med([l["us_per_queued"] for l in L]), 1),
                "us_per_queued_runs": [round(l["us_per_queued"], 1) for l in L], "chain": L[0]["chain"]}
m1["launch"]["ratio"] = round(m1["launch"]["us_wait_each"] / m1["launch"]["us_per_queued"], 0)
A = {}
for i, row in enumerate(runs[0]["cases"]["atomics"]["rows"]):
    v = row["variant"]
    A[v] = {"ms": round(med([r["cases"]["atomics"]["rows"][i]["ms"] for r in runs]), 3),
            "ms_runs": [round(r["cases"]["atomics"]["rows"][i]["ms"], 3) for r in runs],
            "atomics": row["atomics"], "correct": all(r["cases"]["atomics"]["rows"][i]["correct"] for r in runs)}
m1["atomics"] = A
m1["atomics_n"] = runs[0]["cases"]["atomics"]["n"]
rc = [r["cases"]["race"] for r in runs]
G = rc[0][0]["groups"]
wr_bar = [w for r in rc for w in r[0]["wrong_per_rep"]]
wr_no = [w for r in rc for w in r[1]["wrong_per_rep"]]
m1["race"] = {"groups": G, "wrong_with_barrier": sum(wr_bar), "reps": len(wr_no),
              "wrong_without": wr_no, "pct_min": round(100 * min(wr_no) / G, 1),
              "pct_max": round(100 * max(wr_no) / G, 1), "pct_median": round(100 * med(wr_no) / G, 1),
              "example": rc[0][1]["example"]}
m1["loads"] = [round(r["meta"]["load"], 1) for r in runs] + [round(r["meta"]["load_end"], 1) for r in runs]
m1["loadmin"] = min(m1["loads"]); m1["loadmax"] = max(m1["loads"])
D["m1"] = m1

# ---- wave quantization: NVIDIA's own example (A100, 256 x 128 tiles, M = 2304, K = 4096) --------
def waves(M, N, tm, tn, sms, per_sm=1):
    tiles = -(-M // tm) * -(-N // tn)
    w = -(-tiles // (sms * per_sm))
    return {"M": M, "N": N, "tiles": tiles, "waves": w, "util": round(tiles / (w * sms * per_sm), 4),
            "last_wave_tiles": tiles - (w - 1) * sms * per_sm}
D["wq"] = {"before": waves(2304, 1536, 256, 128, 108), "after": waves(2304, 1544, 256, 128, 108),
           "src": "https://docs.nvidia.com/deeplearning/performance/dl-performance-matrix-multiplication/index.html"}
D["wq"]["work_ratio"] = round(1544 / 1536, 4)

# ---- derived numbers quoted in the prose ---------------------------------------------------------
h = occ["sm_90a"]
D["coop_h100"] = h["two_phase"]["blocks"][7] * 132
rs_per_wave = h["block_sum"]["blocks"][7] * 132
D["rowsum"] = {"rows": 4096, "per_wave": rs_per_wave, "waves": -(-4096 // rs_per_wave),
               "last_fill_pct": round(100 * (4096 - (-(-4096 // rs_per_wave) - 1) * rs_per_wave) / rs_per_wave, 1)}
D["occ32_h100_pct"] = round(100 * h["scale_1d"]["blocks"][0] * 1 / 64, 1)
D["occ_heavy"] = {a: {k: round(100 * occ[a][k]["blocks"][7] * 8 / ARCH[a]["maxW"], 1)
                      for k in ("heavy_plain", "heavy_lb1024", "heavy_lb256x8")} for a in ARCHS}

# ---- the toy race of section 4 (reference for the animation): 16 values, two warps of 8 ----------
X = [3, 1, 4, 1, 5, 9, 2, 6, 5, 3, 5, 8, 9, 7, 9, 3]
D["toy_race"] = {"bar": sum(X), "nobar": sum(X[:8]), "stale": 8}

# ---- Python-side runs -----------------------------------------------------------------------------
def jl(p):
    try:
        return json.load(open(p))
    except Exception as e:
        return {"missing": str(e)[:80]}
D["py"] = {k: jl(f"py/out/{k}.json") for k in ("versions", "numba_sim", "numba_ptx", "cupy_raw", "torch_ext")}
D["py"]["torch_cuda_home"] = open("py/out/torch_cuda_home.txt").read().strip()
if "body" in D["py"]["numba_ptx"]:
    D["py"]["numba_ptx"]["body"] = [re.sub(r"\[_Z\w+?_param_(\d+)\]", r"[scale_param_\1]", l.replace("\t", " ").strip())
                                    for l in D["py"]["numba_ptx"]["body"]]
    D["py"]["numba_ptx"]["n_params"] = 1 + max(int(x) for x in re.findall(r"scale_param_(\d+)", " ".join(D["py"]["numba_ptx"]["body"])))

os.makedirs("out", exist_ok=True)
json.dump(D, open("out/data.json", "w"), indent=1, sort_keys=True)
open("parts/22_js_pm_data.js", "w").write("window.PM=" + json.dumps(D, sort_keys=True, separators=(",", ":")) + ";\n")
print("ok", D["occ_check"], m1["wave_steps_at"], m1["per_wave_ms"], m1["launch"], m1["race"]["pct_min"], m1["race"]["pct_max"])
