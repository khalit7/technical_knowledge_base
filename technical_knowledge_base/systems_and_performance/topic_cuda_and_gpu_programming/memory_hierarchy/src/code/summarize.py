"""Summarise the recorded outputs into the page data (run from src/: python3 code/summarize.py).

Inputs : out/run_{1,2,3}.json (M1 measurements), out/cc/*.ptxas.txt and *.sass.txt (real CUDA 13.4.2 compiles).
Outputs: out/data.json (everything the page embeds) and parts/22_js_data.js (window.MHD = the same object).
Per case: the median over the three runs of each run's median time, and the lowest and highest run median (spread).
"""
import json, re, statistics as st, os

R = [json.load(open(f"out/run_{i}.json")) for i in (1, 2, 3)]
D = {"meta": {"mlx": R[0]["meta"]["mlx"], "device": R[0]["meta"]["device"].get("device_name", "Apple M1 Pro"),
              "dates": [r["meta"]["date"] for r in R],
              "load": [round(min(r["meta"]["load_start"], r["meta"]["load_end"]), 1) for r in R] + [round(max(r["meta"]["load_start"], r["meta"]["load_end"]), 1) for r in R]},
     "m1": {}}
D["meta"]["load"] = [min(D["meta"]["load"]), max(D["meta"]["load"])]
RATE = {"widths": "gbps", "aos": "gbps_moved", "tgwide": "gbytes_per_s", "local": "gupdates_per_s", "roof": "gflops"}
for j, c in enumerate(R[0]["cases"]):
    g = c["group"]
    meds = [r["cases"][j]["median_s"] for r in R]
    assert all(r["cases"][j]["name"] == c["name"] for r in R)
    m = st.median(meds)
    work = c["median_s"] * c[RATE[g]]  # work units per call (bytes, updates or FLOPs, in 1e9)
    row = {"name": c["name"], "ms": round(m * 1e3, 3), "ms_lo": round(min(meds) * 1e3, 3), "ms_hi": round(max(meds) * 1e3, 3),
           "rate": round(work / m, 1), "rate_lo": round(work / max(meds), 1), "rate_hi": round(work / min(meds), 1), "unit": RATE[g]}
    for k in ("bytes_per_access", "stride", "F", "ai", "dynamic", "useful_bytes", "footprint_bytes", "moved_bytes", "bytes", "flops"):
        if k in c:
            row[k] = round(c[k], 3) if isinstance(c[k], float) else c[k]
    if g == "roof":
        row["gbps"] = round(c["bytes"] / m / 1e9, 1)
    D["m1"].setdefault(g, []).append(row)

# ---- compiles ----
CC = "out/cc"
D["nvcc"] = open(f"{CC}/nvcc_version.txt").read().strip().splitlines()[-2:]


def ptxas(path):
    """{kernel: {regs, stack, spill_st, spill_ld, smem}} from a ptxas -v report."""
    out, cur = {}, None
    for line in open(path):
        m = re.search(r"Compiling entry function '(\w+)'", line)
        if m:
            cur = m.group(1); out[cur] = {"regs": None, "stack": 0, "spill_st": 0, "spill_ld": 0, "smem": 0}; continue
        if cur is None:
            continue
        m = re.search(r"(\d+) bytes stack frame, (\d+) bytes spill stores, (\d+) bytes spill loads", line)
        if m:
            out[cur].update(stack=int(m.group(1)), spill_st=int(m.group(2)), spill_ld=int(m.group(3)))
        m = re.search(r"Used (\d+) registers", line)
        if m:
            out[cur]["regs"] = int(m.group(1))
            s = re.search(r"(\d+) bytes smem", line)
            out[cur]["smem"] = int(s.group(1)) if s else 0
    return out


ARCHS = ["sm_80", "sm_90a", "sm_120"]
D["ptxas"] = {}
for f in sorted(os.listdir(CC)):
    m = re.match(r"(m\d_\w+)\.(sm_\w+)\.ptxas\.txt$", f)
    if m:
        D["ptxas"].setdefault(m.group(1), {})[m.group(2)] = ptxas(f"{CC}/{f}")
D["regcap"] = []
for cap in (32, 64, 96, 128, 160, 192, 224, 255):
    row = {"cap": cap}
    for a in ARCHS:
        row[a] = ptxas(f"{CC}/regcap_{cap}.{a}.ptxas.txt")["acc128"]
    D["regcap"].append(row)
D["regcap_default"] = {a: D["ptxas"]["m3_regcap"][a]["acc128"] for a in ARCHS}


def sass(file, fn):
    """The instructions of one function, as 'OPCODE operands' strings (no addresses, no encodings)."""
    lines, on = [], False
    for line in open(f"{CC}/{file}"):
        if "Function :" in line:
            on = line.split("Function :")[1].strip() == fn; continue
        if on:
            m = re.search(r"/\*[0-9a-f]{4}\*/\s+(.*?)\s*;", line)
            if m:
                lines.append(re.sub(r"\s+", " ", m.group(1)))
    return lines


def pick(file, fn, pat, n=8):
    return [s for s in sass(file, fn) if re.search(pat, re.sub(r"^@!?\w+ ", "", s))][:n]


MEM = r"^(@\S+ )?(LDG|STG|LDS|STS|LDL|STL|LDGSTS|LDGDEPBAR|DEPBAR|BAR|LDC|ULDC|FFMA|FMUL)"
S = {}
for k in ("copy_f1", "copy_f2", "copy_f4", "field_aos", "field_soa"):
    S[k] = {a: pick(f"m1_widths.{a}.sass.txt", k, r"^(LDG|STG)") for a in ARCHS}
for k in ("ld_plain", "ld_restrict", "ld_ldg", "ld_ldcg", "ld_ldcs", "ld_ldlu", "ld_ldcv", "st_stcs", "st_stwt"):
    S[k] = {a: pick(f"m2_cacheops.{a}.sass.txt", k, r"^(LDG|STG)") for a in ARCHS}
S["hist_dynamic"] = {a: pick(f"m4_dynidx.{a}.sass.txt", "hist_dynamic", r"^(LDL|STL)", 12) for a in ARCHS}
S["hist_select"] = {a: pick(f"m4_dynidx.{a}.sass.txt", "hist_select", r"^(LDL|STL|LDG|FADD)", 6) for a in ARCHS}
for k in ("const_fixed", "const_uniform", "const_perlane", "param_struct"):
    S[k] = {a: pick(f"m5_const.{a}.sass.txt", k, r"c\[0x[03]\]\[0x(2[0-9a-f]{2}|1[0-9a-f]{2}|[0-9a-f]{1,2})\]|c\[0x3\]|FFMA|FMUL", 8) for a in ARCHS}
for k in ("smem_static", "smem_swizzle", "smem_dynamic"):
    S[k] = {a: pick(f"m6_shared.{a}.sass.txt", k, r"^(LDS|STS|BAR|LDG|STG)", 8) for a in ARCHS}
for k in ("tile_sync", "tile_async2"):
    S[k] = {a: pick(f"m7_async.{a}.sass.txt", k, r"^(LDG|STS|LDS\.128|LDGSTS|LDGDEPBAR|DEPBAR|BAR)", 16) for a in ARCHS}
D["sass"] = S
D["src"] = {f[:-3]: open("kernels/" + f).read() for f in sorted(os.listdir("kernels")) if f.endswith(".cu")}

# ---- quoted from the parent's Kernel lab (../../src/lab/out/data.json), to place real kernels on the M1 roofline ----
LAB = json.load(open("../../src/lab/out/data.json"))
want = {"S6 row held in registers (1 pass)": "softmax_fused", "eager: 5 separate kernels": "softmax_eager",
        "MLX library A @ B": "mm_mlx", "M2 naive, coalesced": "mm_naive", "M5 4x4 outputs per thread (registers)": "mm_reg"}
D["lab"] = {}
for c in LAB["cases"]:
    if c["name"] in want:
        k = want[c["name"]]
        if k.startswith("softmax"):
            n = c["R"] * c["C"]; byts, flops = 2 * 4 * n, 5 * n      # read once, write once; about 5 FLOPs per element
        else:
            N = c["n"]; byts, flops = 3 * 4 * N * N, 2 * N ** 3     # A, B read once and C written once; 2N^3 FLOPs
        D["lab"][k] = {"name": c["name"], "ms": round(c["ms"], 3), "bytes": byts, "flops": flops}

with open("out/data.json", "w") as fh:
    json.dump(D, fh, indent=1, sort_keys=True)
with open("parts/22_js_data.js", "w") as fh:
    fh.write("// Generated by code/summarize.py from out/run_*.json and out/cc/ (do not edit by hand)\n")
    fh.write("window.MHD=" + json.dumps(D, sort_keys=True, separators=(",", ":")) + ";\n")
print("ok", os.path.getsize("parts/22_js_data.js"), "bytes")
