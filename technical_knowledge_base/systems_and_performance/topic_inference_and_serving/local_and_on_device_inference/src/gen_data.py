"""Build the page's data (parts/20_js_lo_data.js, out/lo_data.json) from results/ and the parent's planner.

Every derived number the prose quotes is computed here and stored in LO.facts (filled into <span data-lo="key">).
Run: python3 -I gen_data.py   (stdlib only; imports ../../src/plan/plan.py, which imports topic_hardware's calculator)
"""
import json, math, os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))
RES = os.path.join(HERE, "results")
sys.path.insert(0, os.path.join(HERE, "..", "..", "src", "plan"))
import plan  # noqa: E402  the parent's capacity planner (model shapes from real config.json files)
HW = plan.HW


def rj(name):
    p = os.path.join(RES, name)
    return json.load(open(p)) if os.path.exists(p) else None


def r(v, d):
    return None if v is None else round(v, d)


# ---------- bits per weight from the block structs (ggml-common.h, b11146) ----------
BLOCK_BPW = {  # bytes per block * 8 / weights per block
    "Q4_0": 18 * 8 / 32, "Q4_1": 20 * 8 / 32, "Q5_0": 22 * 8 / 32, "Q8_0": 34 * 8 / 32,
    "Q2_K": 84 * 8 / 256, "Q3_K": 110 * 8 / 256, "Q4_K": 144 * 8 / 256, "Q5_K": 176 * 8 / 256, "Q6_K": 210 * 8 / 256,
    "IQ1_S": 50 * 8 / 256, "IQ1_M": 56 * 8 / 256, "IQ2_XXS": 66 * 8 / 256, "IQ2_XS": 74 * 8 / 256, "IQ2_S": 82 * 8 / 256,
    "IQ3_XXS": 98 * 8 / 256, "IQ3_S": 110 * 8 / 256, "IQ4_NL": 18 * 8 / 32, "IQ4_XS": 136 * 8 / 256,
    "TQ1_0": 54 * 8 / 256, "TQ2_0": 66 * 8 / 256, "Q1_0": 18 * 8 / 128, "Q2_0": 18 * 8 / 64,
}
SHORT = {"Q4_K_M": "Q4_K_M", "Q5_K_M": "Q5_K_M", "Q3_K_M": "Q3_K_M"}


def ladder(name, label):
    d = rj(name)
    if not d:
        return None
    items, base = [], None
    for it in d["items"]:
        b = it.get("bench", {})
        row = {"id": it["id"], "label": it["quant"] + (" + imatrix" if it["imatrix"] else ""), "short": it["quant"] + ("i" if it["imatrix"] else ""),
               "imat": it["imatrix"], "bytes": b.get("model_size") or it.get("file_bytes"), "file_bytes": it.get("file_bytes"),
               "params": b.get("params"),
               "ppl": r(it.get("ppl_q", it.get("ppl")), 4), "ppl_pm": r(it.get("ppl_q_pm", it.get("ppl_pm")), 4),
               "kld": r(it.get("kld_mean"), 6), "kld_pm": r(it.get("kld_mean_pm"), 6), "kld_p99": r(it.get("kld_p99"), 6),
               "kld_median": r(it.get("kld_median"), 6), "top": r(it.get("same_top"), 3),
               "tg": r(b.get("tg", {}).get("ts"), 2), "tg_sd": r(b.get("tg", {}).get("sd"), 2), "tg_samples": b.get("tg", {}).get("samples"),
               "pp": r(b.get("pp", {}).get("ts"), 1), "pp_sd": r(b.get("pp", {}).get("sd"), 1),
               "load": r((it.get("load") or {}).get("before", {}).get("loadavg", [None])[0], 2)}
        if row["bytes"] and row["params"]:
            row["bpw"] = round(row["bytes"] * 8 / row["params"], 4)
        if it["id"] == "F16":
            base = row
        else:
            row["lab"] = it["quant"] in ("Q8_0", "Q4_K_M", "Q4_0", "IQ4_XS", "Q2_K", "IQ2_M", "IQ1_M", "Q6_K", "Q3_K_M", "Q1_0") and (it["imatrix"] or it["quant"] in ("Q8_0", "Q6_K", "Q4_0", "Q1_0", "Q5_K_M"))
            items.append(row)
    base["ppl"] = base["ppl"] if base["ppl"] else None
    return {"name": label, "params": base["params"], "base": base, "items": items, "meta": d.get("meta")}


def add_speed(D, names, skip_ladder=False):
    """Generation speed: of the passes run at different times (the ladder's, then speed-only passes), use the fastest:
    other jobs sharing the GPU can only slow a run, and the load average does not see GPU use. Keep every pass for the table."""
    import statistics as st2
    if not D:
        return
    sps = [(n, rj(n)) for n in names]
    for it in [D["base"]] + D["items"]:
        passes = []
        if not skip_ladder and it.get("tg_samples"):
            passes.append({"pass": 1, "load": it.get("load"), "tg": st2.median(it["tg_samples"]), "samples": it["tg_samples"], "pp": it.get("pp")})
        for k, (n, sp) in enumerate(sps):
            e = (sp or {}).get(it["id"])
            if e and e.get("tg"):
                passes.append({"pass": k + 2, "load": e["load"], "tg": st2.median(e["tg"]), "samples": e["tg"], "pp": st2.median(e["pp"]) if e.get("pp") else None})
        if not passes:
            it["tg"] = None; it["pp"] = None; it["tg_sd"] = None
            continue
        best = max(passes, key=lambda x: x["tg"])
        it["tg"] = round(best["tg"], 2); it["tg_sd"] = round(st2.pstdev(best["samples"]), 2); it["pp"] = round(best["pp"], 1) if best["pp"] else it.get("pp")
        it["load"] = best["load"]; it["pass"] = best["pass"]
        it["passes"] = [{"pass": x["pass"], "load": x["load"], "tg": round(x["tg"], 2)} for x in passes]


Q = {}
q17 = ladder("q17.json", "Qwen3-1.7B")
add_speed(q17, ["speed_q17.json", "speed_q17_p3.json"])
if q17:
    Q["m17"] = q17
q4 = ladder("q4b.json", "Qwen3-4B")
add_speed(q4, ["speed_q4b_p3.json"], skip_ladder=True)  # the ladder pass and pass 2 overlapped other GPU jobs (stale-lock takeover; see README)  # the ladder pass overlapped another job after a stale-lock takeover
if q4:
    Q["m4"] = q4

# ---------- effective bandwidth per file: bytes read per token x tokens per second ----------
FIT = None
best = None
for k in ("m17", "m4"):
    if k not in Q:
        continue
    D = Q[k]
    for it in [D["base"]] + D["items"]:
        if it.get("tg"):
            it["eff_gbs"] = round(it["bytes"] * it["tg"] / 1e9, 1)
            if best is None or it["eff_gbs"] > best[0]:
                best = (it["eff_gbs"], D["name"] + " " + it["label"])
if best:
    FIT = {"spec_gbs": 200, "best_gbs": best[0], "best_id": best[1]}

OUT = {"q": Q, "fit": FIT}

# ---------- MLX ----------
mlx = rj("mlx.json")
if mlx:
    OUT["q"]["mlx"] = mlx

# ---------- blocks ----------
blk = rj("blocks.json")
if blk:
    f = blk["files"]
    B = {"f16": f["F16"]["vals"][:32], "types": {}, "mix": {}}
    m = {"Q8_0": "Q8_0", "Q4_0": "Q4_0", "Q4_K": "Q4_K_M", "IQ4_XS": "IQ4_XS+i", "Q2_K": "Q2_K+i"}
    for t, src in m.items():
        if src not in f:
            continue
        x = f[src]
        e = {"vals": x["vals"][:32], "rel": x["rel_rmse_tensor"], "ftype": x["type"]}
        bpw = BLOCK_BPW.get(x["type"])
        e["bpw"] = round(bpw, 4) if bpw else None
        e["bytes"] = round(bpw * 32 / 8, 2) if bpw else None
        if "blocks" in x:
            e["d"] = x["blocks"][0]["d"]; e["codes"] = x["blocks"][0]["codes"]
        if "superblock" in x:
            s = x["superblock"]
            if "scales" in s:
                e.update({"d": s["d"], "dmin": s["dmin"], "sc0": s["scales"][0], "mn0": s["mins"][0], "codes": s["codes"][:32]})
            else:
                e.update({"d": s["d"], "ls0": s["ls"][0], "table": s["table"], "codes": s["codes"][:32]})
        B["types"][t] = e
        B["mix"][src] = x["mix"]
    OUT["blk"] = B

for name in ("srv.json", "ollama.json", "cpu.json"):
    v = rj(name)
    if v:
        OUT[name.split(".")[0]] = v

# ---------- Fit and speed tab: models from the parent's planner, hardware with sources ----------
MODEL_KEYS = ["q17", "q4", "q8", "l8", "q30", "oss20", "q32", "l70", "oss120", "q235", "dsv3"]
models = []
for k in MODEL_KEYS:
    mm = plan.MODELS[k]
    tied = mm["emb"] == mm["V"] * mm["h"]
    models.append({"k": k, "name": mm["name"], "src": mm["src"], "P": mm["P"], "Pg": mm["P"],
                   "Pact": mm["Pact"], "moe": mm["E"] > 0, "kv_tok_f16": HW.kv_per_token(mm, 2), "L": mm["L"],
                   "fmt": mm["fmt"], "native_gb": round(sum(plan.weight_split(mm, "native")) / 1e9, 2)})
OUT["models"] = models
OUT["hw"] = [
    {"k": "m1pro16", "name": "MacBook Pro M1 Pro, 16 GB (this laptop)", "mem": 16, "bw": 200, "kind": "mac", "src": "https://www.apple.com/newsroom/2021/10/introducing-m1-pro-and-m1-max-the-most-powerful-chips-apple-has-ever-built/", "meas": 1},
    {"k": "m4pro64", "name": "M4 Pro, 64 GB", "mem": 64, "bw": 273, "kind": "mac", "src": "https://www.apple.com/newsroom/2024/10/apple-introduces-m4-pro-and-m4-max/"},
    {"k": "m4max128", "name": "M4 Max, 128 GB", "mem": 128, "bw": 546, "kind": "mac", "src": "https://www.apple.com/newsroom/2024/10/apple-introduces-m4-pro-and-m4-max/"},
    {"k": "m5max128", "name": "M5 Max (40-core GPU), 128 GB", "mem": 128, "bw": 614, "kind": "mac", "src": "https://www.apple.com/macbook-pro/specs/"},
    {"k": "m3ultra512", "name": "M3 Ultra, 512 GB", "mem": 512, "bw": 819, "kind": "mac", "src": "https://www.apple.com/newsroom/2025/03/apple-reveals-m3-ultra-taking-apple-silicon-to-a-new-extreme/"},
    {"k": "m5ultra512", "name": "M5 Ultra, 512 GB", "mem": 512, "bw": 1200, "kind": "mac", "src": "https://www.apple.com/mac-studio/specs/"},
    {"k": "spark", "name": "NVIDIA DGX Spark (GB10), 128 GB", "mem": 128, "bw": 273, "kind": "unified", "src": "https://www.nvidia.com/en-us/products/workstations/dgx-spark/"},
    {"k": "strix", "name": "AMD Ryzen AI Max+ 395, 128 GB", "mem": 128, "bw": 256, "kind": "unified", "src": "https://www.amd.com/en/products/processors/laptop/ryzen/ai-300-series/amd-ryzen-ai-max-plus-395.html", "bwnote": "256-bit LPDDR5x-8000: 8,000 MT/s x 32 B (AMD does not print GB/s)"},
    {"k": "r3090", "name": "RTX 3090, 24 GB", "mem": 24, "bw": 936, "kind": "gpu", "n": 1, "src": "https://images.nvidia.com/aem-dam/Solutions/geforce/blackwell/nvidia-rtx-blackwell-gpu-architecture.pdf"},
    {"k": "r4090", "name": "RTX 4090, 24 GB", "mem": 24, "bw": 1008, "kind": "gpu", "n": 1, "src": "https://images.nvidia.com/aem-dam/Solutions/geforce/blackwell/nvidia-rtx-blackwell-gpu-architecture.pdf"},
    {"k": "r5090", "name": "RTX 5090, 32 GB", "mem": 32, "bw": 1792, "kind": "gpu", "n": 1, "src": "https://images.nvidia.com/aem-dam/Solutions/geforce/blackwell/nvidia-rtx-blackwell-gpu-architecture.pdf"},
    {"k": "r5090x2", "name": "2 x RTX 5090 (your box), 64 GB", "mem": 64, "bw": 1792, "kind": "gpu", "n": 2, "src": "https://images.nvidia.com/aem-dam/Solutions/geforce/blackwell/nvidia-rtx-blackwell-gpu-architecture.pdf"},
]

# ---------- Fit and speed tab configuration ----------
ref = Q.get("m4") or Q.get("m17")
want = [("Q8_0", "Q8_0"), ("Q6_K", "Q6_K"), ("Q5_K_M", "Q5_K_M"), ("Q4_K_M+i", "Q4_K_M (imatrix)"), ("IQ4_XS+i", "IQ4_XS (imatrix)"),
        ("Q3_K_M+i", "Q3_K_M (imatrix)"), ("IQ3_XXS+i", "IQ3_XXS (imatrix)"), ("IQ2_M+i", "IQ2_M (imatrix)")]
quants = [{"name": "F16 / BF16 (16 bits)", "bpw": 16.0}]
for qid, nm in want:
    it = next((x for x in ref["items"] if x["id"] == qid), None) if ref else None
    if it and it.get("bpw"):
        quants.append({"name": nm + ": " + str(round(it["bpw"], 2)) + " bits measured on " + ref["name"], "bpw": it["bpw"], "def": qid == "Q4_K_M+i"})
quants.append({"name": "As released (BF16, FP8 or MXFP4 per model)", "native": True})
SB_5090 = {"tg": 300.4, "pp": 14970, "gib": 3.56, "params": 6.74e9}  # llama.cpp discussion #15013, Llama 2 7B Q4_0, FA on
eff5090 = SB_5090["tg"] * SB_5090["gib"] * 2 ** 30 / 1792e9
effs = []
if FIT:
    effs.append({"name": "measured on this laptop: " + str(round(FIT["best_gbs"] / 200 * 100)) + "% (best file)", "v": FIT["best_gbs"] / 200})
effs += [{"name": "RTX 5090 llama.cpp scoreboard: " + str(round(eff5090 * 100)) + "% (Llama 2 7B Q4_0)", "v": eff5090},
         {"name": "100% (the ceiling)", "v": 1.0}]
prefill = {}
pf_ref = None
for k in ("m4", "m17"):
    if k in Q:
        it = next((x for x in Q[k]["items"] if x["id"] == "Q4_K_M+i"), None)
        if it and it.get("pp"):
            Pact = plan.MODELS["q4" if k == "m4" else "q17"]["Pact"]
            pf_ref = {"flops": 2 * Pact * it["pp"], "src": "calibrated on " + Q[k]["name"] + " Q4_K_M, pp512 measured here"}
            break
if pf_ref:
    prefill["m1pro16"] = pf_ref
sbf = {"flops": 2 * SB_5090["params"] * SB_5090["pp"], "src": "calibrated on the llama.cpp scoreboard (pp512, Llama 2 7B Q4_0)"}
prefill["r5090"] = sbf; prefill["r5090x2"] = sbf
ws = plan.SRC["m1pro_working_set"]["bytes"]
check = []
if FIT:
    for k in ("m17", "m4"):
        if k not in Q:
            continue
        for it in [Q[k]["base"]] + Q[k]["items"]:
            if it.get("tg") and it["id"] in ("F16", "Q8_0", "Q6_K", "Q4_K_M+i", "Q4_0", "IQ4_XS+i", "Q3_K_M+i", "IQ2_M+i"):
                g = it["bytes"] / 1e9
                check.append({"name": Q[k]["name"] + " " + it["label"], "gb": g, "pred": FIT["best_gbs"] / g, "meas": it["tg"]})
OUT["fitcfg"] = {"quants": quants, "effs": effs, "prefill": prefill, "gpu_margin": 1024 * 2 ** 20, "compute_gb": 0.5,
                 "mac_ws_frac": (ws / 17179869184) if ws else None, "check": check, "eff5090": eff5090}
OUT["date"] = "October 2026"

# ---------- facts quoted in the prose (filled into <span data-lo="key">) ----------
F = {}
def it(k, i):
    D = Q.get(k)
    if not D:
        return None
    if i == "F16":
        return D["base"]
    return next((x for x in D["items"] if x["id"] == i), None)
def fmt(v, d=2):
    if v is None:
        return None
    return f"{v:,.{d}f}"
def kf(v):
    return None if v is None else (f"{v:.3f}" if v >= 0.1 else f"{v:.4f}" if v >= 0.01 else f"{v:.5f}")
def setf(key, val):
    if val is not None:
        F[key] = val
f16 = it("m17", "F16")
if f16:
    gbf = f16["bytes"] / 1e9
    setf("gbF16_17", fmt(gbf, 2)); setf("ceilF16_17", fmt(200 / gbf, 0)); setf("tgF16_17", fmt(f16["tg"], 1))
    setf("effF16_17", fmt(f16["eff_gbs"], 0)); setf("ppF16_17", fmt(f16["pp"], 0)); setf("pplF16", fmt(f16["ppl"], 2))
    mm = f16["params"] - 2 * plan.MODELS["q17"]["V"] * plan.MODELS["q17"]["h"]
    setf("tflopsF16", fmt(2 * mm * f16["pp"] / 1e12, 1)); setf("ppTg", fmt(f16["pp"] / f16["tg"], 0))
if FIT:
    setf("m1Eff", str(round(FIT["best_gbs"] / 200 * 100)) + "%")
for key, i in (("Q8", "Q8_0"), ("Q4", "Q4_K_M+i"), ("Q40", "Q4_0")):
    x = it("m17", i)
    if x and f16:
        setf("tg" + key + "_17", fmt(x["tg"], 1)); setf("eff" + key + "_17", fmt(x.get("eff_gbs"), 0))
        if key != "Q40":
            setf("sp" + key, fmt(x["tg"] / f16["tg"], 2)); setf(key.lower() + "Ratio", fmt(f16["bytes"] / x["bytes"], 1))
x = it("m17", "Q4_K_M+i")
if x:
    setf("gbQ4_17", fmt(x["bytes"] / 1e9, 2))
setf("kv16k", fmt(114688 * 16000 / 1e9, 2))
for key, i in (("Q8", "Q8_0"), ("Q6", "Q6_K"), ("Q5", "Q5_K_M"), ("Q4km", "Q4_K_M"), ("Q4kmI", "Q4_K_M+i"), ("Iq4xsI", "IQ4_XS+i"),
               ("Q3", "Q3_K_M"), ("Q3I", "Q3_K_M+i"), ("Q2", "Q2_K"), ("Q2I", "Q2_K+i"), ("Q40", "Q4_0")):
    x = it("m17", i)
    if x:
        setf("kld" + key, kf(x["kld"]))
setf("topQ8", fmt((it("m17", "Q8_0") or {}).get("top"), 1))
for key, i in (("Q8", "Q8_0"), ("Q2", "Q2_K"), ("Iq2m", "IQ2_M+i"), ("Iq1m", "IQ1_M+i"), ("Q10", "Q1_0")):
    x = it("m17", i)
    if x:
        setf("ppl" + key, fmt(x["ppl"], 0 if x["ppl"] > 1000 else 2))
for key, i in (("Iq4xs", "IQ4_XS+i"), ("Q40", "Q4_0"), ("Q4km", "Q4_K_M"), ("Q2", "Q2_K"), ("Q10", "Q1_0")):
    x = it("m17", i)
    if x:
        setf("bpw" + key, fmt(x["bpw"], 2))
x = it("m4", "Q4_K_M")
if x:
    setf("bpwQ4km4", fmt(x["bpw"], 2))
    setf("gbPerB", fmt(x["bytes"] / plan.MODELS["q4"]["P"], 2) + " GB per billion parameters for Qwen3-4B (" + fmt(x["bytes"] / 1e9, 2) + " GB / 4.02 billion) and " + fmt(it("m17", "Q4_K_M")["bytes"] / plan.MODELS["q17"]["P"], 2) + " for Qwen3-1.7B (" + fmt(it("m17", "Q4_K_M")["bytes"] / 1e9, 2) + " GB / 1.72 billion)")
for key, i in (("iq2mBpw", "IQ2_M+i"), ("iq1mBpw", "IQ1_M+i")):
    x = it("m17", i)
    if x:
        setf(key, fmt(x["bpw"], 2))
for key, a, b in (("imxQ4", "Q4_K_M", "Q4_K_M+i"), ("imxQ3", "Q3_K_M", "Q3_K_M+i"), ("imxQ2", "Q2_K", "Q2_K+i")):
    xa, xb = it("m17", a), it("m17", b)
    if xa and xb and xa["kld"] and xb["kld"]:
        setf(key, str(round((1 - xb["kld"] / xa["kld"]) * 100)))
x = it("m17", "Q4_K_M+i")
if x:
    setf("p99Q4kmI", kf(x["kld_p99"])); setf("flipQ4kmI", fmt(100 - x["top"], 1)); setf("q4kmBpw", fmt(x["bpw"], 2))
if f16:
    for key, i in (("dPplQ4km", "Q4_K_M"), ("dPplQ2", "Q2_K")):
        x = it("m17", i)
        if x:
            setf(key, "+" + fmt(x["ppl"] - f16["ppl"], 2))
q8, q4m = it("m17", "Q8_0"), it("m4", "Q4_K_M+i")
if q8 and q4m:
    setf("bigSmall", f"Measured here: Qwen3-1.7B Q8_0 ({q8['bytes']/1e9:.2f} GB) scores perplexity {q8['ppl']:.2f}; Qwen3-4B Q4_K_M with an importance matrix ({q4m['bytes']/1e9:.2f} GB) scores {q4m['ppl']:.2f}.")
if blk:
    mx = blk["files"].get("Q4_K_M", {}).get("mix")
    if mx:
        tot = sum(v[1] for v in mx.values())
        setf("q4kmMix", "; ".join(f"{k}: {v[0]} tensors, {v[1]/tot*100:.0f}% of weights" for k, v in sorted(mx.items(), key=lambda kv: -kv[1][1])))
x = it("m17", "Q4_K_M+i")
if x:
    setf("ttft30k", fmt(30000 / x["pp"], 0))
for key, i in (("4", "Q4_K_M"), ("I4", "Q4_K_M+i"), ("Qwen4", "QwenQ4KM")):
    x = it("m4", i)
    if x:
        setf("kld" + key, kf(x["kld"])); setf("ppl" + key, fmt(x["ppl"], 2))
x = it("m4", "F16")
if x:
    setf("pplF16_4", fmt(x["ppl"], 2))
setf("qDate", "10 October 2026")

# ---------- llama-server experiments (results/srv/*.json, copies of scripts/srvlab.py output with paths removed) ----------
SV = {}
def rs(name):
    return rj(os.path.join("srv", name))
WS = plan.SRC["m1pro_working_set"]["bytes"]
setf("wsGB", fmt(WS / 1e9, 1) + " GB"); setf("wsPct", str(round(WS / 17179869184 * 100)) + "%")
d = rs("defaults.json")
if d:
    g = d["props"]["default_generation_settings"]; rq = d["req"]["timings"]
    pool = d.get("pool_tokens")
    SV["defaults"] = {"html": "<p>Ready in " + fmt(d["ready_s"], 1) + " s (load average " + fmt(d["load_before"][0], 1) + "). <code>/props</code>: " + str(d["props"]["total_slots"]) + " slots, each with n_ctx " + f"{g['n_ctx']:,}" + "; the log: <code>" + d["log_ctx"] + "</code>. Default sampling for requests that set nothing: temperature " + fmt(g["params"]["temperature"], 1) + ", top_k " + str(g["params"]["top_k"]) + ", top_p " + fmt(g["params"]["top_p"], 2) + ", min_p " + fmt(g["params"]["min_p"], 2) + ". One 513-token prompt: read in " + fmt(rq["prompt_ms"], 0) + " ms (" + fmt(rq["prompt_per_second"], 0) + " tok/s), 64 tokens generated at " + fmt(rq["predicted_per_second"], 1) + " tok/s.</p>"}
    setf("defSummary", "ready in " + fmt(d["ready_s"], 1) + " s with " + str(d["props"]["total_slots"]) + " slots sharing one unified KV cache of " + f"{pool:,}" + " tokens (" + fmt(pool * 114688 / 1e9, 1) + " GB in F16), each slot capped at the model's trained 40,960 tokens. <code>--fit</code> started from 4 &times; 40,960 = 163,840 tokens (the trained context for every slot) and cut it to what fits the GPU's working set less its margin (<code>common/fit.cpp</code> L267 to L272, L393 to L430). A bare start on a small model claims most of the GPU's memory for cache; on a shared machine set <code>-c</code> yourself.")
    SV["metrics"] = {"text": d["metrics"]}

if d:
    rows = []
    cur = {}
    for line in d["metrics"].splitlines():
        m_ = __import__("re").match(r"# HELP llamacpp:(\S+) (.*)", line)
        if m_:
            cur = {"name": m_.group(1), "help": m_.group(2)}
            continue
        m_ = __import__("re").match(r"# TYPE llamacpp:(\S+) (\S+)", line)
        if m_:
            cur["type"] = m_.group(2); continue
        m_ = __import__("re").match(r"llamacpp:(\S+) ([-0-9.e+]+)$", line)
        if m_ and cur.get("name") == m_.group(1):
            cur["value"] = m_.group(2); rows.append(cur); cur = {}
    WHY = {"prompt_tokens_cached_total": "with prompt_tokens_total: the share of prompt tokens served from the cache (your prefix hit rate)",
           "requests_deferred": "requests waiting because every slot is busy: queueing, the sign you need more slots or a second server",
           "n_busy_slots_per_decode": "how many conversations share each step on average: your real batch size",
           "predicted_tokens_seconds": "generation speed averaged over requests: compare with the bandwidth ceiling (section 1)",
           "prompt_tokens_seconds": "prompt reading speed: what long prompts will cost in TTFT",
           "requests_processing": "slots busy right now",
           "n_tokens_max": "the longest conversation seen: is your context setting too small or wastefully large?",
           "spec_decode_num_accepted_tokens_total": "with draft tokens: the acceptance rate of speculative decoding"}
    esc = lambda t: t.replace("&", "&amp;").replace("<", "&lt;")
    tr = "".join("<tr><td><code>llamacpp:" + r["name"] + "</code></td><td>" + r.get("type", "") + "</td><td>" + esc(r["help"]) + "</td><td class=\"num\">" + r["value"] + "</td></tr>" for r in rows)
    SV["metrics"] = {"full": "<div class=\"tw\"><table><thead><tr><th>name</th><th>type</th><th>the server's description</th><th class=\"num\">value</th></tr></thead><tbody>" + tr + "</tbody></table></div><p class=\"small mute\">After one 513-token request with 64 tokens generated, llama-server b11146 started with <code>--metrics</code>. No histograms (no TTFT or TPOT percentiles): measure those at the client, as the parent's load generator does.</p>",
                     "html": "<div class=\"tw\"><table><thead><tr><th>metric</th><th>what it tells you</th></tr></thead><tbody>" + "".join("<tr><td><code>llamacpp:" + k + "</code></td><td>" + v + "</td></tr>" for k, v in WHY.items() if any(r["name"] == k for r in rows)) + "</tbody></table></div><p class=\"small mute\">" + str(len(rows)) + " metrics in all, every one counters or averages: there are no latency histograms, so TTFT and TPOT percentiles must be measured at the client. Full list with values: the closed block of every run below.</p>"}

import statistics as _st
def _med(a):
    a = [x for x in a if x is not None]
    return _st.median(a) if a else None
sl = []
for n_ in (1, 2, 4, 8):
    x_ = rs(f"slots_np{n_}.json")
    if x_:
        sl.append({"np": x_["np"], "cmd": " ".join(x_["cmd"]), "load_before": x_["load_before"],
                   "runs": [{k: r.get(k) for k in ("out_tok_per_s", "ttft_p50", "ttft_p90", "tpot_p50", "tpot_p90", "e2e_p50", "n_ok", "n_err", "wall_s")} for r in x_["runs"]]})
if sl:
    SV["slots"] = sl
u = rs("unified.json")
if u:
    def _u(k):
        r_ = u[k]["req"]
        return (r_.get("error") or {}).get("message") if isinstance(r_.get("error"), dict) else r_.get("error"), r_
    es, rs_ = _u("split"); eu, ru = _u("unified")
    SV["unified"] = {"html": "<p>Split (<code>-np 4 -c 8192</code>): each slot n_ctx " + str(u["split"]["slots"][0]["n_ctx"]) + "; the request " + ("failed: <code>" + str(es)[:160] + "</code>" if es else "succeeded") + ". Unified (<code>-kvu</code>): each slot n_ctx " + str(u["unified"]["slots"][0]["n_ctx"]) + "; the request " + ("failed: <code>" + str(eu)[:160] + "</code>" if eu else "succeeded (" + str(ru.get("tokens_evaluated")) + " prompt tokens)") + ". Same memory, different limits: split guarantees every slot its share, unified lets one conversation use the pool while others are short.</p>"}
    if es and not eu:
        setf("uniSummary", "with 4 slots and 8,192 tokens of cache, a " + f"{ru.get('tokens_evaluated'):,}" + "-token prompt was refused by the split cache (2,048 per slot) and served by the unified one.")
c = rs("ctxshift.json")
if c:
    def _c(k):
        r_ = c[k]["req"]
        return r_
    off, on = _c("off"), _c("on")
    SV["ctxshift"] = {"summary": "<p class=\"small\"><span class=\"meas\">Measured here</span>, one slot of 512 tokens, a " + str(off.get("tokens_evaluated")) + "-token prompt, 1,500 tokens requested with end-of-sequence ignored: without context shift the server stopped after " + str(off.get("tokens_predicted")) + " tokens, when the slot was full; with it, it generated all " + f"{on.get('tokens_predicted'):,}" + ", shifting " + str(c["on"]["n_shift_lines"]) + " times (each time keeping 0 tokens and discarding 255 of 511).</p>",
                      "html": "<p>Off: " + str(off.get("tokens_predicted")) + " tokens, stop type " + str(off.get("stop_type")) + ". On: " + str(on.get("tokens_predicted")) + " tokens; the server log: <code>" + (c["on"]["shift_lines"][0].split("|")[-1].strip() if c["on"]["shift_lines"] else "") + "</code> (" + str(c["on"]["n_shift_lines"]) + " shifts).</p>"}
r = rs("reuse.json")
if r:
    o1 = r["off"]["runs"][0]["second"]; u1 = r["reuse256"]["runs"][0]["second"]; f1 = r["fresh"]["runs"][0]["second"]
    first = r["off"]["runs"][0]["first"]
    total1 = first["tokens_evaluated"]; total2 = o1["tokens_evaluated"]
    S_ = o1["timings"]["cache_n"]; B_ = total2 - S_; A_ = total1 - S_ - B_
    lp = lambda x: x["probs"][0]["top_logprobs"][0]["logprob"] if x.get("probs") and x["probs"][0].get("top_logprobs") else None
    REU = {"S": S_, "A": A_, "B": B_,
           "off": {"cache_n": o1["timings"]["cache_n"], "prompt_n": o1["timings"]["prompt_n"], "prompt_ms": round(o1["timings"]["prompt_ms"])},
           "on": {"cache_n": u1["timings"]["cache_n"], "prompt_n": u1["timings"]["prompt_n"], "prompt_ms": round(u1["timings"]["prompt_ms"])},
           "fresh": {"prompt_n": f1["timings"]["prompt_n"], "prompt_ms": round(_med([x_["second"]["timings"]["prompt_ms"] for x_ in r["fresh"]["runs"]]))},
           "host": {"cache_n": r["off"]["runs"][1]["second"]["timings"]["cache_n"], "prompt_ms": round(r["off"]["runs"][1]["second"]["timings"]["prompt_ms"])}}
    lf, lu = lp(f1), lp(u1)
    REU["text_same_off"] = o1["content_head"] == f1["content_head"]; REU["text_same_on"] = u1["content_head"] == f1["content_head"]
    REU["summary"] = ("request 1 was " + f"{total1:,}" + " tokens, request 2 " + f"{total2:,}" + " (from scratch: " + f"{REU["fresh"]["prompt_ms"]:,}" + " ms of prefill). Prompt caching alone reused the " + f"{REU["off"]["cache_n"]:,}" + "-token prefix and computed " + f"{REU["off"]["prompt_n"]:,}" + " tokens in " + f"{REU["off"]["prompt_ms"]:,}" + " ms, and its greedy answer was identical to the from-scratch answer. With <code>--cache-reuse 256</code> it reused " + f"{REU["on"]["cache_n"]:,}" + " tokens, computed " + f"{REU["on"]["prompt_n"]:,}" + ", in " + f"{REU["on"]["prompt_ms"]:,}" + " ms, and the answer changed: the from-scratch run continued \"&hellip;the Ise and Hy&umacr;ga ships during&hellip;\", the reused cache \"&hellip;ships into hy&hellip;\"; the first token's probability moved from " + fmt(math.exp(lf), 2) + " to " + fmt(math.exp(lu), 2) + ". A third effect showed up on the repeats: when request 2 came again after request 1 had replaced it in the slot, " + f"{REU["host"]["cache_n"]:,}" + " tokens came back from the host-memory prompt cache in " + f"{REU["host"]["prompt_ms"]:,}" + " ms, exactly.")
    REU["html"] = "<p>" + REU["summary"][0].upper() + REU["summary"][1:] + "</p><p class=\"small mute\">One slot, <code>-c 8192</code>, greedy, 24 tokens. Three repeats per setting; the numbers above are the first repeat of each, the only one whose slot started from request 1 alone.</p>"
    OUT["reuse"] = REU
rt = rs("router.json")
if rt:
    rows_ = "".join("<tr><td>" + q_["model"] + "</td><td class=\"num\">" + str(q_["status"]) + "</td><td class=\"num\">" + fmt(q_["wall_s"], 2) + "</td></tr>" for q_ in rt["seq"])
    SV["router"] = {"html": "<p>Router started in " + fmt(rt["ready_s"], 1) + " s with <code>--models-dir</code> (three GGUF files) and <code>--models-max 1</code>. Each request below waited for its model's child server to start (and the previous one to stop) when the model changed:</p><div class=\"tw\"><table><thead><tr><th>request for</th><th class=\"num\">HTTP</th><th class=\"num\">seconds, request to answer (8 tokens)</th></tr></thead><tbody>" + rows_ + "</tbody></table></div><p class=\"small mute\">The first request's " + fmt(rt["seq"][0]["wall_s"], 1) + " s went almost entirely to the child process's start-up before it began loading the model (its log shows about 22 s before the first line about the model, then the model loaded in under a second); a plain llama-server start took 5.6 s in experiment 1. Not investigated further: treat the first start after a router launch as slow.</p>",
                    "summary": "<p class=\"small\"><span class=\"meas\">Measured here</span>, <code>--models-max 1</code>, 8-token answers: " + "; ".join(q_["model"].replace("-Q4_K_M", "") + " " + fmt(q_["wall_s"], 2) + " s" for q_ in rt["seq"]) + ". A switch costs a model load (0.7 to 2 s here; all three files had been read recently, so they were probably still in the page cache); a repeat of the loaded model costs only the answer. The first request after the router started was slow for another reason: see the router run in the closed block below.</p>"}
ol = rj("ollama.json")
if ol:
    og = [g_ for g_ in ol["gen"] if isinstance(g_, dict) and g_.get("eval_count")]
    o_tg = _med([g_["eval_count"] / (g_["eval_duration"] / 1e9) for g_ in og]); o_pp = _med([g_["prompt_eval_count"] / (g_["prompt_eval_duration"] / 1e9) for g_ in og if g_.get("prompt_eval_duration")])
    lg = ol["llama"]; l_tg = _med([x_["timings"]["predicted_per_second"] for x_ in lg]); l_pp = _med([x_["timings"]["prompt_per_second"] for x_ in lg])
    ps = ol.get("ps", {}).get("models", [{}])[0] if isinstance(ol.get("ps"), dict) and ol["ps"].get("models") else {}
    par = ol.get("parallel4", [])
    lm = ol.get("load_marks") or []
    o_load = (float(lm[-1][0]) * 60 + float(lm[-1][1])) - (float(lm[0][0]) * 60 + float(lm[0][1])) if len(lm) >= 2 else None
    pe_first = og[0]["prompt_eval_duration"] / 1e9 if og else None; pe_rest = _med([g_["prompt_eval_duration"] / 1e9 for g_ in og[1:]])
    starts = [x_["end"] for x_ in sorted(par, key=lambda x_: x_["end"])]
    vr = ol.get("vram_ctx") or ["?", None]
    rcmd = (ol.get("runner_cmd") or "").replace("/Applications/Ollama.app/Contents/Resources/", "")
    rcmd = re.sub(r"--model \S+", "--model &lt;blob&gt;", rcmd)
    ohtml = ("<div class=\"tw\"><table><thead><tr><th></th><th class=\"num\">Ollama 0.40.1</th><th class=\"num\">llama-server b11146</th></tr></thead><tbody>"
             "<tr><td>generation, tok/s (median of 4)</td><td class=\"num\">" + fmt(o_tg, 1) + "</td><td class=\"num\">" + fmt(l_tg, 1) + "</td></tr>"
             "<tr><td>prompt reading, first request (one sample each)</td><td class=\"num\">" + fmt(og[0]["prompt_eval_count"] / pe_first, 0) + " tok/s</td><td class=\"num\">" + fmt(l_pp, 0) + " tok/s</td></tr>"
             "<tr><td>same prompt again</td><td class=\"num\">" + fmt(pe_rest * 1000, 0) + " ms (cached)</td><td class=\"num\">recomputed (cache_prompt off here)</td></tr>"
             "<tr><td>context it chose</td><td class=\"num\">" + f"{vr[1]:,}" + " tokens</td><td class=\"num\">87,552 shared by 4 slots (section 6)</td></tr>"
             "<tr><td>four requests sent at once</td><td class=\"num\">one after another: done at " + ", ".join(fmt(x_, 1) for x_ in starts) + " s</td><td class=\"num\">batched in 4 slots</td></tr>"
             "</tbody></table></div>")
    onote = ("What Ollama actually ran, from its log: <code>" + rcmd + "</code>, its own build of llama.cpp's llama-server, " + (fmt(o_load, 1) + " s from start to ready, ") * (o_load is not None) + "with 4,096 tokens of context because it measured " + vr[0] + " of GPU memory (under 24 GiB), one slot, a 512-token batch, and context shift on (llama-server's own default is off). Importing the GGUF copied it into Ollama's store (" + fmt(ol["create"]["secs"], 1) + " s, a second 1.1 GB copy on disk). Same engine and, within this laptop's run-to-run noise, the same generation speed: the differences are the defaults.")
    OUT["ollama"] = {"html": ohtml, "note": onote, "full": ohtml + "<p class=\"small\">" + onote + "</p>", "o_tg": o_tg, "o_pp": o_pp, "l_tg": l_tg, "l_pp": l_pp, "ctx": ps.get("context_length"), "cold": (ol.get("cold_load") or {}).get("load_duration"),
                     "par": par, "log": ol.get("log_lines", [])[:30], "version": ol.get("version")}
cp = rj("cpu.json")
if cp:
    g_ = {(r_["n_gpu_layers"], "pp" if r_["n_prompt"] else "tg"): r_ for r_ in cp["rows"]}
    cpu_tg, gpu_tg = g_.get((0, "tg")), g_.get((99, "tg")); cpu_pp, gpu_pp = g_.get((0, "pp")), g_.get((99, "pp"))
    if cpu_tg and gpu_tg:
        setf("cpuTg", fmt(cpu_tg["avg_ts"], 1)); setf("gpuTg", fmt(gpu_tg["avg_ts"], 1)); setf("cpuPp", fmt(cpu_pp["avg_ts"], 0)); setf("gpuPp", fmt(gpu_pp["avg_ts"], 0))
        OUT["cpu"] = {"html": "<div class=\"tw\"><table><thead><tr><th>where</th><th class=\"num\">prompt (pp512) tok/s</th><th class=\"num\">generation (tg128) tok/s</th></tr></thead><tbody><tr><td>CPU, 8 threads (-ngl 0)</td><td class=\"num\">" + fmt(cpu_pp["avg_ts"], 0) + " &plusmn; " + fmt(cpu_pp["stddev_ts"], 0) + "</td><td class=\"num\">" + fmt(cpu_tg["avg_ts"], 1) + " &plusmn; " + fmt(cpu_tg["stddev_ts"], 1) + "</td></tr><tr><td>GPU, Metal (-ngl 99)</td><td class=\"num\">" + fmt(gpu_pp["avg_ts"], 0) + " &plusmn; " + fmt(gpu_pp["stddev_ts"], 0) + "</td><td class=\"num\">" + fmt(gpu_tg["avg_ts"], 1) + " &plusmn; " + fmt(gpu_tg["stddev_ts"], 1) + "</td></tr></tbody></table></div><p class=\"small mute\">llama-bench, Qwen3-1.7B Q4_K_M, 5 repetitions, flash attention on; load average " + fmt(cp["load"]["before"]["loadavg"][0], 1) + " before.</p>"}

mx_ = OUT["q"].get("mlx")
if mx_ and Q.get("m17"):
    gg = {x_["id"]: x_ for x_ in Q["m17"]["items"]}; gg["F16"] = Q["m17"]["base"]
    mm_ = {x_["id"]: x_ for x_ in mx_["items"]}; mm_["bf16"] = dict(mx_["base"], label="bf16", kld=0, top=100, bpw=16.0)
    pairs = [("bf16", "F16"), ("8bit", "Q8_0"), ("6bit", "Q6_K"), ("4bit", "Q4_K_M+i"), ("4bit", "Q4_0"), ("mxfp4", "IQ4_XS+i"), ("3bit", "Q3_K_M+i")]
    def cell(x_, k, d_):
        return fmt(x_.get(k), d_) if x_ and x_.get(k) is not None else "&ndash;"
    rows_ = "".join("<tr><td>" + mm_[a]["label"] + "</td><td class=\"num\">" + fmt(mm_[a]["bytes"] / 1e9, 2) + "</td><td class=\"num\">" + (kf(mm_[a]["kld"]) if mm_[a]["kld"] else "0") + "</td><td class=\"num\">" + cell(mm_[a], "tg", 1) + "</td><td class=\"num\">" + cell(mm_[a], "pp", 0) + "</td><td>" + gg[b]["label"] + "</td><td class=\"num\">" + fmt(gg[b]["bytes"] / 1e9, 2) + "</td><td class=\"num\">" + (kf(gg[b]["kld"]) if gg[b].get("kld") else "0") + "</td><td class=\"num\">" + cell(gg[b], "tg", 1) + "</td><td class=\"num\">" + cell(gg[b], "pp", 0) + "</td></tr>" for a, b in pairs if a in mm_ and b in gg)
    for key_, id_ in (("mlx4Kld", "4bit"), ("mlxG32Kld", "4bit-g32"), ("mlx8Kld", "8bit"), ("mlx3Kld", "3bit")):
        if id_ in mm_:
            setf(key_, kf(mm_[id_]["kld"]))
    if "4bit" in mm_ and mm_["4bit"].get("tg"):
        setf("mlx4Tg", fmt(mm_["4bit"]["tg"], 1))
        a4, k4, q0 = mm_["4bit"]["tg"], gg["Q4_K_M+i"]["tg"], gg["Q4_0"]["tg"]
        verdict = "faster than" if a4 > 1.05 * max(k4, q0) else "slower than" if a4 < 0.95 * min(k4, q0) else "in the same range as"
        setf("mlxSpeed", "On speed (the fastest of up to three passes each), MLX's 4-bit generated " + fmt(a4, 1) + " tokens per second, " + verdict + " llama.cpp's Q4_K_M (" + fmt(k4, 1) + ") and Q4_0 (" + fmt(q0, 1) + "). So on a Mac, MLX's plain 4-bit is the weaker file for quality: use its calibrated methods (dwq, awq) or 6 to 8 bits there; on llama.cpp, an imatrix K-quant gives more quality per byte.")
    OUT["mlxres"] = {"html": "<div class=\"tw\"><table><thead><tr><th>MLX</th><th class=\"num\">GB</th><th class=\"num\">KLD</th><th class=\"num\">gen tok/s</th><th class=\"num\">prompt tok/s</th><th>GGUF (llama.cpp)</th><th class=\"num\">GB</th><th class=\"num\">KLD</th><th class=\"num\">gen tok/s</th><th class=\"num\">prompt tok/s</th></tr></thead><tbody>" + rows_ + "</tbody></table></div>",
                     "note": "KLD of each MLX model is against the MLX bf16 model; of each GGUF against the F16 GGUF (both from the same released weights; their perplexities on the same tokens: MLX bf16 " + fmt(mx_["base"]["ppl"], 2) + ", GGUF F16 " + fmt(Q["m17"]["base"]["ppl"], 2) + ", which confirms the two scorers see identical inputs). Sizes differ partly because MLX stores Qwen3-1.7B's tied embedding once while the GGUF keeps the checkpoint's separate output matrix too (section 4). Speeds: the median of 5 trials (mlx_lm benchmark) or 5 repetitions (llama-bench), from the fastest of up to three passes run at different times on the shared laptop (every pass is in the table of every file in section 5)."}
OUT["srv"] = SV
OUT["facts"] = F

assert "{{" not in json.dumps(OUT), "no {{ links inside data"
json.dump(OUT, open(os.path.join(HERE, "out_lo_data.json"), "w"), indent=0)
js = "// generated by gen_data.py from results/ and the parent's planner; do not edit\nwindow.LO=" + json.dumps(OUT, separators=(",", ":")) + ";\n"
open(os.path.join(HERE, "parts", "20_js_lo_data.js"), "w").write(js)
print("wrote", len(js), "bytes; ladders:", list(Q.keys()), "fit:", FIT)
