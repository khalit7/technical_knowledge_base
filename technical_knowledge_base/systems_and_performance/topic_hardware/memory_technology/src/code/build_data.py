"""Builds everything the page embeds, and the reference values its JavaScript is checked against.

Inputs: ../out/run_{1,2,3}.json (mem_gpu.py on the M1 Pro GPU), ../out/ssd.json (ssd_read.py),
../inputs/configs/*.json (Hugging Face config.json files), ../inputs/safetensors_total_size.json,
vendor figures typed below with their URLs (all fetched 2026-10-05; the same values as the shared
facts file used by the hardware root's Chip atlas).
Outputs: ../out/data.json (embedded verbatim as window.MEMD by ../parts/22_js_data.js) and
../out/expected.json (test vectors for check/check_js.mjs and numbers for check/check_embed.py).
Pure Python, no dependencies. Run: python3 build_data.py
"""
import json, os, statistics as st

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.dirname(HERE)
OUT = os.path.join(SRC, "out")
INP = os.path.join(SRC, "inputs")


def rnd(x, n=4):
    return float(f"{x:.{n}g}")


# ------------------------------------------------------------------ measured (M1 Pro GPU, SSD)
def measured():
    runs = [json.load(open(os.path.join(OUT, f"run_{i}.json"))) for i in (1, 2, 3)]
    meta = runs[0]["meta"]
    loads = [r["meta"]["load_start"] for r in runs] + [r["meta"]["load_end"] for r in runs]

    def agg(key, xkey, ykey):
        rows = []
        for j, e in enumerate(runs[0][key]):
            ys = [r[key][j][ykey] for r in runs]
            rows.append({"x": e[xkey], "y": rnd(st.median(ys)), "lo": rnd(min(ys)), "hi": rnd(max(ys))})
        return rows

    ws = agg("ws", "bytes_ws", "gbs")
    chase = agg("chase", "bytes_ws", "ns")
    gather = agg("gather", "block_bytes", "gbs")
    kv = []
    for j, e in enumerate(runs[0]["kvdec"]):
        ys = [r["kvdec"][j]["us"] for r in runs]
        kv.append({"attn": e["attn"], "kvh": e["kv_heads"], "L": e["tokens"], "bytes": e["kv_bytes"],
                   "us": rnd(st.median(ys)), "lo": rnd(min(ys)), "hi": rnd(max(ys))})
    # straight-line fit time = a + bytes / BW on the large GQA and MHA points (64 MiB and up)
    fits = {}
    for a in ("GQA", "MHA"):
        pts = [(k["bytes"], k["us"]) for k in kv if k["attn"] == a and k["bytes"] >= 64 << 20]
        n = len(pts); mx_ = sum(p[0] for p in pts) / n; my = sum(p[1] for p in pts) / n
        sl = sum((p[0] - mx_) * (p[1] - my) for p in pts) / sum((p[0] - mx_) ** 2 for p in pts)
        fits[a] = {"gbs": rnd(1e-3 / sl, 3), "us0": rnd(my - sl * mx_, 3), "n": n}
    ssd = json.load(open(os.path.join(OUT, "ssd.json")))
    sr = ssd["runs"]
    ssdm = {k: rnd(st.median([r[k] for r in sr])) for k in sr[0] if k != "load"}
    ssdm["lo_seq"] = rnd(min(r["seq_GBs"] for r in sr)); ssdm["hi_seq"] = rnd(max(r["seq_GBs"] for r in sr))
    ssdm["load"] = [round(r["load"], 1) for r in sr]
    big = [r[key2][j]["ns"] for key2 in ("chase",) for r in runs for j, e in enumerate(runs[0][key2]) if e["bytes_ws"] >= 1 << 27]
    dram = {"y": rnd(st.median(big)), "lo": rnd(min(big)), "hi": rnd(max(big)), "n": len(big)}
    return {"dram_lat": dram, "meta": {"date": meta["date"], "mlx": meta["mlx"], "python": meta["python"], "device": meta["device"],
                     "arch": meta["arch"], "trials": meta["trials"], "runs": 3,
                     "load": [round(min(loads), 1), round(max(loads), 1)]},
            "ws": ws, "chase": chase, "gather": gather, "kv": kv, "kvfit": fits, "ssd": ssdm}


# ------------------------------------------------------------------ vendor figures (dense BF16 TFLOP/s, GB, TB/s)
U = {
    "a100": "https://www.nvidia.com/en-us/data-center/a100/",
    "h100": "https://www.nvidia.com/en-us/data-center/h100/",
    "h200": "https://www.nvidia.com/en-us/data-center/h200/",
    "hgx": "https://www.nvidia.com/en-us/data-center/hgx/",
    "bu": "https://developer.nvidia.com/blog/inside-nvidia-blackwell-ultra-the-chip-powering-the-ai-factory-era/",
    "rubin": "https://developer.nvidia.com/blog/inside-nvidia-rubin-gpu-architecture-powering-the-era-of-agentic-ai/",
    "mi300x": "https://www.amd.com/content/dam/amd/en/documents/instinct-tech-docs/data-sheets/amd-instinct-mi300x-data-sheet.pdf",
    "mi355x": "https://www.amd.com/content/dam/amd/en/documents/instinct-tech-docs/product-briefs/amd-instinct-mi355x-gpu-brochure.pdf",
    "rtx": "https://images.nvidia.com/aem-dam/Solutions/geforce/blackwell/nvidia-rtx-blackwell-gpu-architecture.pdf",
    "tpu7": "https://docs.cloud.google.com/tpu/docs/tpu7x",
    "apple": "https://www.apple.com/newsroom/2021/10/introducing-m1-pro-and-m1-max-the-most-powerful-chips-apple-has-ever-built/",
    "dgxb200": "https://www.nvidia.com/en-us/data-center/dgx-b200/",
}
# NVIDIA datacenter generations: year of announcement, dense BF16, HBM capacity, HBM bandwidth
GENS = [
    {"id": "a100", "name": "A100 80GB", "year": 2020, "bf16": 312, "gb": 80, "tbs": 2.039, "mem": "HBM2e", "src": U["a100"]},
    {"id": "h100", "name": "H100 SXM", "year": 2022, "bf16": 989.5, "gb": 80, "tbs": 3.35, "mem": "HBM3", "src": U["h100"]},
    {"id": "h200", "name": "H200 SXM", "year": 2023, "bf16": 989.5, "gb": 141, "tbs": 4.8, "mem": "HBM3e", "src": U["h200"]},
    {"id": "b200", "name": "B200 (HGX)", "year": 2024, "bf16": 2250, "gb": 180, "tbs": 8.0, "mem": "HBM3e", "src": U["hgx"]},
    {"id": "b300", "name": "B300 (HGX)", "year": 2025, "bf16": 2250, "gb": 288, "tbs": 8.0, "mem": "HBM3e", "src": U["bu"]},
    {"id": "rubin", "name": "Rubin", "year": 2026, "bf16": 4000, "gb": 288, "tbs": 22.0, "mem": "HBM4", "src": U["rubin"]},
]
for g in GENS:
    g["ridge"] = rnd(g["bf16"] / g["tbs"], 3)          # FLOPs per byte of HBM traffic at the ridge
    g["reads"] = rnd(g["tbs"] * 1000 / g["gb"], 3)      # full-memory reads per second
# chips for the KV planner: memory GB, bandwidth TB/s
CHIPS = [
    {"id": "h100", "name": "H100 SXM", "gb": 80, "tbs": 3.35, "src": U["h100"]},
    {"id": "h200", "name": "H200 SXM", "gb": 141, "tbs": 4.8, "src": U["h200"]},
    {"id": "b200", "name": "B200 (HGX)", "gb": 180, "tbs": 8.0, "src": U["dgxb200"]},
    {"id": "b300", "name": "B300 (HGX)", "gb": 288, "tbs": 8.0, "src": U["bu"]},
    {"id": "rubin", "name": "Rubin (announced)", "gb": 288, "tbs": 22.0, "src": U["rubin"]},
    {"id": "mi300x", "name": "MI300X", "gb": 192, "tbs": 5.3, "src": U["mi300x"]},
    {"id": "mi355x", "name": "MI355X", "gb": 288, "tbs": 8.0, "src": U["mi355x"]},
    {"id": "tpu7", "name": "TPU7x (Ironwood)", "gb": 206.2, "tbs": 7.38, "src": U["tpu7"]},
    {"id": "rtx5090", "name": "RTX 5090", "gb": 32, "tbs": 1.792, "src": U["rtx"]},
    {"id": "m1pro", "name": "M1 Pro (this laptop)", "gb": 16, "tbs": 0.2, "src": U["apple"]},
]


# ------------------------------------------------------------------ models: KV cache from config.json
def cfg(name):
    c = json.load(open(os.path.join(INP, "configs", name)))
    return c.get("text_config", c)


SIZES = json.load(open(os.path.join(INP, "safetensors_total_size.json")))["total_size"]
HF = "https://huggingface.co/"


def model(mid, name, repo, file, kind, wbytes=None, wfmt="bf16", note=""):
    c = cfg(file)
    L, nh = c["num_hidden_layers"], c["num_attention_heads"]
    nkv = c.get("num_key_value_heads", nh)
    hd = c.get("head_dim") or c["hidden_size"] // nh
    full, slide, window, fixed = L, 0, 0, 0
    el = 2 * nkv * hd                                   # K and V values per token per layer
    if kind == "mla":                                   # DeepSeek MLA: the compressed latent plus the shared RoPE key
        el = c["kv_lora_rank"] + c["qk_rope_head_dim"]
    elif kind == "swa_all":                             # Mistral 7B v0.1: every layer a 4,096-token window
        full, slide, window = 0, L, c["sliding_window"]
    elif kind == "alt":                                 # gpt-oss: layer_types alternate sliding and full
        lt = c["layer_types"]; full, slide, window = lt.count("full_attention"), lt.count("sliding_attention"), c["sliding_window"]
    elif kind == "gemma3":                              # every 6th layer global (HF: (i + 1) % pattern == 0), the rest a 1,024 window
        p = c["sliding_window_pattern"]; full = sum(1 for i in range(L) if (i + 1) % p == 0); slide, window = L - full, c["sliding_window"]
    elif kind == "qnext":                               # every 4th layer full attention, the rest Gated DeltaNet with a fixed state
        iv = c["full_attention_interval"]; full = sum(1 for i in range(L) if (i + 1) % iv == 0)
        lin = L - full
        fixed = lin * c["linear_num_value_heads"] * c["linear_key_head_dim"] * c["linear_value_head_dim"] * 2  # assumed 2 bytes per state value
    wb = wbytes if wbytes is not None else SIZES[repo]
    return {"id": mid, "name": name, "src": HF + repo + "/blob/main/config.json", "kind": kind, "L": L, "nkv": nkv, "hd": hd,
            "el": el, "full": full, "slide": slide, "window": window, "fixed": fixed, "wbytes": wb, "wfmt": wfmt,
            "ctx": c.get("max_position_embeddings"), "note": note}


MODELS = [
    model("l2", "Llama 2 7B", "NousResearch/Llama-2-7b-hf", "cfg_NousResearch_Llama-2-7b-hf.json", "mha", wfmt="fp16", note="MHA: 32 KV heads, one per query head"),
    model("mis", "Mistral 7B v0.1", "mistralai/Mistral-7B-v0.1", "cfg_mistralai_Mistral-7B-v0.1.json", "swa_all", note="GQA, every layer a 4,096-token sliding window"),
    model("l8", "Llama 3.1 8B", "unsloth/Meta-Llama-3.1-8B", "cfg_unsloth_Meta-Llama-3.1-8B.json", "gqa", note="GQA: 8 KV heads for 32 query heads"),
    model("q8", "Qwen3 8B", "Qwen/Qwen3-8B", "cfg_Qwen_Qwen3-8B.json", "gqa", note="GQA: 8 KV heads"),
    model("g27", "Gemma 3 27B", "unsloth/gemma-3-27b-it", "cfg_unsloth_gemma-3-27b-it.json", "gemma3", note="5 local (1,024 window) : 1 global layers"),
    model("q32", "Qwen3 32B", "Qwen/Qwen3-32B", "cfg_Qwen_Qwen3-32B.json", "gqa", note="GQA: 8 KV heads"),
    model("l70", "Llama 3.1 70B", "unsloth/Meta-Llama-3.1-70B", "cfg_unsloth_Meta-Llama-3.1-70B.json", "gqa", note="GQA: 8 KV heads for 64 query heads"),
    model("oss", "gpt-oss-120b", "openai/gpt-oss-120b", "cfg_openai_gpt-oss-120b.json", "alt", wbytes=65190340224, wfmt="MXFP4 experts", note="MoE; layers alternate 128-token window and full"),
    model("qn", "Qwen3-Next 80B-A3B", "Qwen/Qwen3-Next-80B-A3B-Instruct", "cfg_Qwen_Qwen3-Next-80B-A3B-Instruct.json", "qnext", note="MoE; 3 linear-attention layers per full-attention layer"),
    model("q235", "Qwen3 235B-A22B", "Qwen/Qwen3-235B-A22B", "cfg_Qwen_Qwen3-235B-A22B.json", "gqa", note="MoE; GQA with 4 KV heads"),
    model("l405", "Llama 3.1 405B", "unsloth/Meta-Llama-3.1-405B", "cfg_unsloth_Meta-Llama-3.1-405B-bnb-4bit.json", "gqa", wbytes=811706777600, note="GQA: 8 KV heads for 128 query heads"),
    model("ds3", "DeepSeek-V3 671B", "deepseek-ai/DeepSeek-V3", "cfg_deepseek-ai_DeepSeek-V3.json", "mla", wbytes=671026419200, wfmt="fp8", note="MoE; MLA caches a 512 latent + 64 RoPE values per layer"),
    model("k2", "Kimi K2 1T", "moonshotai/Kimi-K2-Instruct", "cfg_moonshotai_Kimi-K2-Instruct.json", "mla", wfmt="fp8", note="MoE; MLA like DeepSeek-V3"),
]
# The 405B config is read from the unsloth bnb-4bit mirror (the architecture fields match Meta's); its weight bytes and
# DeepSeek-V3's are the hardware root's parameter counts (calc/model.py) at 2 and 1 bytes, because DeepSeek-V3's index
# lists total_size 1.369e12, twice its FP8 parameter count (an anomaly of that file, noted on the page's sources).


def kv_seq(m, ctx, kvb):
    """KV bytes held for one sequence of ctx tokens; kvb = bytes per cached value."""
    return kvb * (m["el"] * m["full"] * ctx + m["el"] * m["slide"] * min(ctx, m["window"])) + m["fixed"]


def kv_tok(m, kvb):
    """Bytes added per new token once windows are full (the marginal cost)."""
    return kvb * m["el"] * m["full"]


def plan(m, chip, n, util, ctx, kvb, wscale):
    """How many sequences of ctx tokens fit on n chips, and the decode step at that batch.
    Assumes every weight byte and every cached byte is read once per decode step (a ceiling)."""
    mem = chip["gb"] * 1e9 * n * util
    w = m["wbytes"] * wscale
    s = kv_seq(m, ctx, kvb)
    fit = int((mem - w) // s) if mem > w else 0
    b = max(fit, 1)
    t1 = (w + s) / (chip["tbs"] * 1e12 * n)
    tb = (w + b * s) / (chip["tbs"] * 1e12 * n)
    return {"fit": fit, "w": w, "s": s, "free": mem - w, "t1_ms": t1 * 1e3, "tb_ms": tb * 1e3, "user_tps": 1 / tb, "agg_tps": b / tb}


# ------------------------------------------------------------------ the DRAM bank animation (illustrative timings)
BANK = {"tRCD": 14, "tCL": 14, "tRP": 14, "tBURST": 2, "tRRD": 4, "row": 1024, "req": 64, "n": 16,
        "note": "illustrative DDR-class timings in ns, not a specific part; row size 1 KB as in HBM2 (O'Connor et al. 2017)"}


def bank_sim(mode, P=BANK):
    """Events for 16 reads of 64 B. seq: one row of one bank; rand1: a new row of one bank each time;
    randB: a new row in a different bank each time (bank-level parallelism, one shared data bus)."""
    ev, t_bus = [], 0.0
    open_row = {}
    t_free = 0.0  # when the single bank is free again (rand1 / seq)
    for i in range(P["n"]):
        if mode == "seq":
            bank, row, col = 0, 0, i
        elif mode == "rand1":
            bank, row, col = 0, (i * 7 + 3) % 61 + 1, (i * 5) % 16
        else:
            bank, row, col = i, (i * 7 + 3) % 61 + 1, (i * 5) % 16
        e = {"i": i, "bank": bank, "row": row, "col": col, "hit": open_row.get(bank) == row}
        if mode == "randB":
            act = i * P["tRRD"]
            e["pre"] = None; e["act"] = [act, act + P["tRCD"]]
            rd = act + P["tRCD"]
        elif e["hit"]:
            e["pre"] = None; e["act"] = None
            rd = max(P["tRCD"], t_bus - P["tCL"])
        else:
            t = t_free
            if bank in open_row:
                e["pre"] = [t, t + P["tRP"]]; t += P["tRP"]
            else:
                e["pre"] = None
            e["act"] = [t, t + P["tRCD"]]
            rd = t + P["tRCD"]
        d0 = max(rd + P["tCL"], t_bus)
        e["rd"] = [rd, rd + P["tCL"]]; e["data"] = [d0, d0 + P["tBURST"]]
        t_bus = d0 + P["tBURST"]; t_free = t_bus
        open_row[bank] = row
        ev.append(e)
    end = ev[-1]["data"][1]
    rows_opened = sum(1 for e in ev if e["act"])
    return {"ev": ev, "end": end, "acts": rows_opened, "opened": rows_opened * P["row"],
            "used": P["n"] * P["req"], "gbs": P["n"] * P["req"] / end}


# ------------------------------------------------------------------ the bandwidth ladder (each figure as published)
LADDER = [
    {"name": "Cerebras WSE-3 on-wafer SRAM", "gbs": 21e6, "cap": "44 GB", "k": "vend", "src": "https://www.cerebras.ai/press-release/cerebras-announces-third-generation-wafer-scale-engine"},
    {"name": "Groq 3 LPX rack SRAM (announced)", "gbs": 40e6, "cap": "128 GB per rack", "k": "vend", "src": "https://groq.com/lpu-architecture"},
    {"name": "Rubin HBM4 (announced)", "gbs": 22000, "cap": "288 GB", "k": "vend", "src": U["rubin"]},
    {"name": "B200 HBM3e", "gbs": 8000, "cap": "180 GB", "k": "vend", "src": U["dgxb200"]},
    {"name": "H100 SXM HBM3", "gbs": 3350, "cap": "80 GB", "k": "vend", "src": U["h100"]},
    {"name": "NVLink 5, GPU to GPU (both directions)", "gbs": 1800, "cap": "other GPUs' memory", "k": "vend", "src": U["hgx"]},
    {"name": "RTX 5090 GDDR7", "gbs": 1792, "cap": "32 GB", "k": "vend", "src": U["rtx"]},
    {"name": "GH200 NVLink-C2C, CPU to GPU (coherent)", "gbs": 900, "cap": "up to 624 GB CPU + GPU", "k": "vend", "src": "https://www.nvidia.com/en-us/data-center/grace-hopper-superchip/"},
    {"name": "M1 Pro LPDDR5 (Apple)", "gbs": 200, "cap": "16 GB here", "k": "vend", "src": U["apple"]},
    {"name": "PCIe Gen5 x16 host link (both directions)", "gbs": 128, "cap": "host DRAM", "k": "vend", "src": U["h100"]},
    {"name": "InfiniBand / RoCE NIC, 400 Gb/s", "gbs": 50, "cap": "other nodes", "k": "vend", "src": "https://arxiv.org/html/2407.21783v3"},
]


# ------------------------------------------------------------------ main
def main():
    meas = measured()
    models = MODELS
    for m in models:
        m["kv_tok_bf16"] = kv_tok(m, 2)
        m["kv_tok0_bf16"] = 2 * m["el"] * (m["full"] + m["slide"])  # per token while every window is still filling
        m["kv"] = {str(c): kv_seq(m, c, 2) for c in (1024, 8192, 32768, 131072)}
    banks = {k: bank_sim(k) for k in ("seq", "rand1", "randB")}
    g = {x["id"]: x for x in GENS}
    l8 = next(m for m in models if m["id"] == "l8"); l70 = next(m for m in models if m["id"] == "l70")
    ws = {r["x"]: r for r in meas["ws"]}; ch = {r["x"]: r for r in meas["chase"]}
    nums = {
        "h100_reg_mb": 132 * 256 * 1024 / 1e6, "h100_l1_mb": 132 * 256 * 1024 / 1e6, "h100_l2_mb": 50,
        "h100_onchip_mb": 2 * 132 * 256 * 1024 / 1e6 + 50,
        "h100_onchip_share_pct": (2 * 132 * 256 * 1024 / 1e6 + 50) / 80e3 * 100,
        "horowitz_dram_over_fmul": 640 / 3.7, "horowitz_dram_over_sram": 640 / 5,
        "hbm2_pj": 3.92, "gddr5_pj": 14.0,
        "h100_hbm_w": 3.35e12 * 8 * 3.92e-12, "rubin_hbm_w": 22e12 * 8 * 3.92e-12,
        "l8_token_j": l8["wbytes"] * 8 * 3.92e-12,
        "h100_pin_gbps": 3350e9 * 8 / 5120 / 1e9, "mi300x_pin_gbps": 5300e9 * 8 / 8192 / 1e9,
        "rtx5090_gbs": 512 * 28 / 8, "rubin_stacks_at_jedec": 22e12 / 2048e9,
        "gen_bf16_x": g["rubin"]["bf16"] / g["a100"]["bf16"], "gen_bw_x": g["rubin"]["tbs"] / g["a100"]["tbs"],
        "gen_gb_x": g["rubin"]["gb"] / g["a100"]["gb"],
        "opt_l8_gb": 12 * 8030261248 / 1e9,
        "opt_pcie_s": 12 * 8030261248 / 64e9, "opt_c2c_s": 12 * 8030261248 / 450e9,
        "opt_ssd_s": 12 * 8030261248 / (meas["ssd"]["seq_GBs"] * 1e9),
        "l70_kv32k_gb": kv_seq(l70, 32768, 2) / 1e9, "l70_kv32k_pcie_ms": kv_seq(l70, 32768, 2) / 64e9 * 1e3,
        "l70_prefill32k_s": 2 * 70553706496 * 32768 / (989.5e12 * 0.5),
        "m1_dram_lat_ns": meas["dram_lat"]["y"], "m1_dram_ws_gbs": ws[1 << 30]["y"],
        "m1_inflight_kb": ws[1 << 30]["y"] * meas["dram_lat"]["y"] / 1e3,
        "m1_l1_gbs": ws[1 << 17]["y"], "m1_slc_gbs": ws[1 << 25]["y"], "m1_l2_gbs": ws[1 << 20]["y"],
    }
    data = {"meas": meas, "gens": GENS, "chips": CHIPS, "models": models, "bank": BANK, "banks": banks,
            "ladder": LADDER, "nums": {k: rnd(v) for k, v in nums.items()}}
    json.dump(data, open(os.path.join(OUT, "data.json"), "w"), indent=1)
    # test vectors for the planner
    tv = []
    for m in models:
        for c in CHIPS:
            for ctx in (4096, 32768, 131072):
                for n, kvb, ws_ in ((1, 2, 1), (8, 1, 1), (2, 2, 0.5)):
                    p = plan(m, c, n, 0.92, ctx, kvb, ws_)
                    tv.append({"m": m["id"], "c": c["id"], "n": n, "ctx": ctx, "kvb": kvb, "ws": ws_, **{k: rnd(v, 9) for k, v in p.items()}})
    kvv = [{"m": m["id"], "ctx": c, "kvb": b, "v": kv_seq(m, c, b)} for m in models for c in (1, 100, 1024, 5000, 65536, 262144) for b in (1, 2)]
    json.dump({"plan": tv, "kv": kvv, "banks": banks}, open(os.path.join(OUT, "expected.json"), "w"))
    js = "// generated by code/build_data.py from out/data.json; do not edit\nwindow.MEMD=" + json.dumps(data, separators=(",", ":")) + ";\n"
    open(os.path.join(SRC, "parts", "22_js_data.js"), "w").write(js)
    for m in models:
        print(f"{m['name']:22s} el {m['el']:5d} full {m['full']:3d} slide {m['slide']:3d} win {m['window']:5d} fixed {m['fixed']:>9d} "
              f"kv/tok {m['kv_tok_bf16']/1024:8.1f} KiB  32K {m['kv']['32768']/1e9:7.2f} GB  w {m['wbytes']/1e9:8.1f} GB")
    for k, b in banks.items():
        print(k, b["end"], b["acts"], round(b["gbs"], 2))
    print(json.dumps(data["nums"], indent=0)[:3000])
    print("data.json", os.path.getsize(os.path.join(OUT, "data.json")), "bytes; plan vectors", len(tv))


if __name__ == "__main__":
    main()
