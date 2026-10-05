"""Recompute every default, worked example and drill answer of the Performance calculator tab.
Writes recompute.json (cases the JS must reproduce) and prints the published-figure checks.
Run from anywhere: python3 recompute.py
"""
import json, os
from model import *

out = {"models": {}, "train": [], "decode": [], "prefill": [], "allreduce": [], "tp": [], "anim": {}, "cross": [], "checks": []}
for k, m in MODELS.items():
    out["models"][k] = {kk: m[kk] for kk in ("P", "Pact", "Pexp", "kv_el", "kv_full", "kv_slide", "window", "layer_params")}
    out["models"][k]["lora"] = lora_params(m)
    out["models"][k]["w_native_GB"] = weight_bytes(m, "native") / 1e9
    out["models"][k]["kv_tok_bf16"] = kv_per_token(m, 2)

TR = [
    dict(model="l8", chip="h100", recipe="adam16", gpus=1, tp=1, zero=0, seq=8192, mb=1, ckpt="flash", tokens=1e12, mfu=0.4),
    dict(model="l8", chip="h100", recipe="adam16", gpus=8, tp=1, zero=3, seq=8192, mb=1, ckpt="flash", tokens=1e12, mfu=0.4),
    dict(model="l70", chip="h100", recipe="adam16", gpus=64, tp=8, zero=1, seq=8192, mb=1, ckpt="full", tokens=1.4e12, mfu=0.4, attn=True),
    dict(model="l405", chip="h100", recipe="adam16", gpus=16384, tp=8, pp=16, zero=1, seq=8192, mb=1, ckpt="flash", tokens=15.6e12, mfu=0.41),
    dict(model="l8", chip="rtx5090", recipe="qlora", gpus=1, tp=1, zero=0, seq=4096, mb=1, ckpt="full", tokens=1e8, mfu=0.3),
    dict(model="l8", chip="rtx5090", recipe="lora", gpus=2, tp=1, zero=0, seq=4096, mb=1, ckpt="full", tokens=1e8, mfu=0.3),
    dict(model="dsv3", chip="h100", recipe="adam8bit", gpus=2048, tp=1, zero=3, seq=4096, mb=1, ckpt="full", tokens=14.8e12, mfu=0.35),
    dict(model="q32", chip="b200", recipe="bf16adam", gpus=16, tp=2, zero=3, seq=4096, mb=2, ckpt="none", tokens=1e11, mfu=0.45, attn=True),
    dict(model="oss120", chip="v7", recipe="adam16", gpus=64, tp=1, zero=3, seq=8192, mb=1, ckpt="flash", tokens=1e12, mfu=0.4),
]
for o in TR:
    out["train"].append({"in": o, "out": train(o)})

DE = [
    dict(model="l8", chip="h100", chips=1, fmt="bf16", prec="bf16", kvb=2, batch=1, ctx=4096, eff=1.0),
    dict(model="l8", chip="h100", chips=1, fmt="bf16", prec="bf16", kvb=2, batch=64, ctx=4096, eff=1.0),
    dict(model="l8", chip="h100", chips=1, fmt="bf16", prec="bf16", kvb=2, batch=64, ctx=512, eff=1.0),
    dict(model="l8", chip="rtx5090", chips=1, fmt="fp8", prec="fp8", kvb=2, batch=1, ctx=16, eff=1.0),
    dict(model="l8", chip="rtx5090", chips=1, fmt="fp8", prec="fp8", kvb=1, batch=1, ctx=65536, eff=1.0),
    dict(model="l70", chip="h100", chips=8, fmt="bf16", prec="bf16", kvb=2, batch=1, ctx=16, eff=1.0),
    dict(model="l70", chip="h100", chips=8, fmt="bf16", prec="bf16", kvb=2, batch=32, ctx=131072, eff=1.0),
    dict(model="dsv3", chip="h200", chips=8, fmt="native", prec="fp8", kvb=2, batch=1, ctx=4096, eff=1.0),
    dict(model="dsv3", chip="h200", chips=8, fmt="native", prec="fp8", kvb=2, batch=256, ctx=4096, eff=1.0),
    dict(model="oss120", chip="h100", chips=1, fmt="native", prec="bf16", kvb=2, batch=1, ctx=8192, eff=0.7),
    dict(model="oss120", chip="h100", chips=1, fmt="native", prec="bf16", kvb=2, batch=64, ctx=8192, eff=0.7),
    dict(model="q235", chip="b200", chips=4, fmt="nvfp4", prec="fp4", kvb=1, batch=16, ctx=32768, eff=0.8),
    dict(model="l70", chip="m1pro", chips=1, fmt="mxfp4", prec="bf16", kvb=2, batch=1, ctx=2048, eff=1.0),
    dict(model="l8", chip="m1pro", chips=1, fmt="mxfp4", prec="bf16", kvb=2, batch=1, ctx=2048, eff=1.0),
]
for o in DE:
    out["decode"].append({"in": o, "out": decode(o)})
for o in [DE[0], DE[2], dict(DE[0], ctx=16), DE[5], DE[7], DE[9]]:
    out["cross"].append({"in": o, "out": crossover(o)})
for o in [dict(model="l8", chip="h100", chips=1, prec="bf16", prompt=4096, eff=1.0), dict(model="l70", chip="h100", chips=8, prec="bf16", prompt=32768, eff=0.6)]:
    out["prefill"].append({"in": o, "out": prefill(o)})
for S, n, bw in [(16.06e9, 8, 450), (16.06e9, 64, 50), (16.06e9, 8, 50), (16.06e9, 72, 900), (1e9, 2, 63)]:
    out["allreduce"].append({"in": [S, n, bw], "out": allreduce(S, n, bw)})
for o in [dict(model="l70", chip="h100", tp=8, tokens=8192, link=450, mfu=0.4), dict(model="l70", chip="h100", tp=8, tokens=8192, link=50, mfu=0.4),
          dict(model="l8", chip="h100", tp=8, tokens=8192, link=450, mfu=0.4), dict(model="l405", chip="b200", tp=8, tokens=8192, link=900, mfu=0.4)]:
    out["tp"].append({"in": o, "out": tp_ratio(o)})
for mode in ("1", "8", "64f", "64h"):
    for ov in (False, True):
        out["anim"][mode + ("o" if ov else "")] = step_anim(mode, ov)


# ---------- checks against published figures ----------
def chk(what, ours, pub, src, note):
    out["checks"].append(dict(what=what, ours=ours, pub=pub, src=src, note=note))


h100 = CHIPS["h100"]["peak"]["bf16"] * 1e12
P405 = MODELS["l405"]["P"]
chk("Llama 3 405B training compute", 6 * P405 * 15.6e12, "3.8e25 FLOPs", "https://arxiv.org/html/2407.21783v3",
    "6ND with N from the config (405.85B) and D = 15.6T; independent")
chk("Chinchilla 70B on 1.4T tokens", 6 * 70e9 * 1.4e12, "5.76e23 FLOPs (same budget as Gopher)", "https://arxiv.org/html/2203.15556",
    "6ND is 2% above the paper's own detailed count")
chk("Gopher 280B on 300B tokens", 6 * 280e9 * 300e9, "5.76e23 FLOPs", "https://arxiv.org/html/2203.15556",
    "6ND is 12.5% below the paper's figure; the paper counts FLOPs in more detail (its Appendix F), so the two are not the same accounting")
chk("PaLM 540B MFU, no attention term", 238.3e3 * 6 * 540e9 / (275e12 * 6144), "45.7%", "https://arxiv.org/abs/2204.02311",
    "Appendix B arithmetic: 238.3K tokens/s, 6144 TPU v4 at 275 TFLOP/s; independent")
pal_att = 12 * 118 * 48 * 256 * 2048
chk("PaLM 540B MFU, with attention", 238.3e3 * (6 * 540.35e9 + pal_att) / (275e12 * 6144), "46.2%", "https://arxiv.org/abs/2204.02311",
    "adds 12 L H Q T = 12 x 118 x 48 x 256 x 2048 FLOPs per token (Table 1 shape); independent")
chk("MT-NLG 530B MFU, no attention", 65.43e3 * 6 * 530e9 / (312e12 * 2240), "29.7%", "https://arxiv.org/abs/2204.02311",
    "PaLM Appendix B's arithmetic for MT-NLG on 2240 A100s gives 29.77%, printed as 29.7% (truncated); independent")
for tf, pub in [(430, "43%"), (400, "41%"), (380, "38%")]:
    chk(f"Llama 3 Table 4: {tf} TFLOPs/GPU as MFU", tf * 1e12 / h100, pub, "https://arxiv.org/html/2407.21783v3",
        "TFLOPs per GPU over the 989.5 dense BF16 peak" + ("; 40.4% against the printed 41%: the paper's TFLOPs or its peak are rounded differently" if tf == 400 else "; matches"))
for k, gh, toks in [("l8", 1.46e6, 15e12), ("l70", 7.0e6, 15e12), ("l405", 30.84e6, 15.6e12)]:
    P = MODELS[k]["P"]
    chk(f"{MODELS[k]['name']}: average MFU implied by the model card's GPU hours", 6 * P * toks / (gh * 3600 * h100),
        f"{gh/1e6:g}M H100 GPU hours", "https://huggingface.co/meta-llama/Llama-3.1-8B",
        "derived: 6ND over (GPU hours x peak); the card's hours cover more than the main run's steady state and its token count is '~15T' for 8B and 70B")
Pa = MODELS["dsv3"]["Pact"]
chk("DeepSeek-V3 pre-training MFU against the BF16 peak", 6 * Pa * 14.8e12 / (2.664e6 * 3600 * h100), "2.664M H800 GPU hours", "https://arxiv.org/html/2412.19437v2",
    "derived; assumes H800 compute equals H100 SXM (989.5 BF16 dense), which DeepSeek does not state")
chk("DeepSeek-V3 pre-training MFU against the FP8 peak", 6 * Pa * 14.8e12 / (2.664e6 * 3600 * 2 * h100), "most GEMMs in FP8", "https://arxiv.org/html/2412.19437v2",
    "the same run measured against the FP8 peak: an MFU is only meaningful with its precision stated")
chk("DeepSeek-V3 total cost at $2 per GPU hour", 2.788e6 * 2, "$5.576M", "https://arxiv.org/html/2412.19437v2", "by construction (the paper's own rate)")
chk("Llama 3.1 405B GPU hours at Lambda's 8x H100 on-demand price", 30.84e6 * 3.99, "not published (Meta owns its clusters)", "https://lambda.ai/pricing",
    "illustration only: list price, 2026-10-05")
chk("Llama 3.1 8B KV cache per token, bf16", kv_per_token(MODELS["l8"], 2), "128 KB (old page)", "https://huggingface.co/unsloth/Meta-Llama-3.1-8B/blob/main/config.json",
    "2 x 32 layers x 8 KV heads x 128 x 2 bytes = 131,072 B = 128 KiB; independent")
chk("DeepSeek-V3 MLA cache per token (bf16)", kv_per_token(MODELS["dsv3"], 2), "(d_c + d_h^R) x l elements (DeepSeek-V2 Table 1)", "https://arxiv.org/abs/2405.04434",
    "(512 + 64) x 61 x 2 B = 70,272 B, 7.3x smaller than Llama 3.1 405B's 516,096 B")
chk("gpt-oss-120b total parameters", MODELS["oss120"]["P"], "116.83B (model card)", "https://huggingface.co/openai/gpt-oss-120b",
    "recount from config including biases and sinks; independent")
chk("gpt-oss-120b active parameters", MODELS["oss120"]["Pact"], "5.13B (model card)", "https://huggingface.co/openai/gpt-oss-120b",
    "our 5.71B counts both embedding matrices; minus the 0.58B input embedding (a lookup, not a matmul) it is 5.13B")
chk("gpt-oss-120b weights as released (MXFP4 experts)", weight_bytes(MODELS["oss120"], "native"), "fits a single 80 GB GPU (model card)", "https://huggingface.co/openai/gpt-oss-120b",
    "4.25 bits per expert weight (32-value blocks sharing an 8-bit scale), bf16 elsewhere")
chk("Old page: 8B on 1T tokens, 8 H100 at 40% MFU", 6 * 8e9 * 1e12 / (8 * h100 * 0.4) / 86400, "~176 days", "old Performance math page", "reproduces")
chk("Old page: 70B bf16 on 8 H100 TP8, batch-1 ceiling", 8 * 3350e9 / 140e9, "~190 tok/s", "old Performance math page", "reproduces with 140 GB; with the config's 141.1 GB it is 190")
chk("Old page: 5090, 8B in FP8, 64K context with FP8 KV", decode(DE[4])["tps"], "'roughly halves' the ~224 tok/s ceiling", "old Performance math page",
    "corrected: the KV read is 4.3 GB (64K x 128 KiB is 8.6 GB in bf16, halved by FP8; the old '/ 8' was a slip), so the ceiling falls about 35%, to 1,792 / (8.03 + 4.29) GB = 145 tok/s, not by half")

for nm, k, T in [("PaLM 540B", None, 2048), ("Llama 3.1 70B", "l70", 8192), ("Llama 3.1 70B", "l70", 32768)]:
    if k:
        m = MODELS[k]; r = 12 * m["L"] * m["nh"] * m["dqk"] * T / (6 * m["P"])
    else:
        r = 12 * 118 * 48 * 256 * 2048 / (6 * 540.35e9)
    chk(f"{nm}: attention FLOPs share at {T:,} tokens", r, "12 L H Q T over 6N (PaLM Appendix B formula)", "https://arxiv.org/abs/2204.02311", "derived")

json.dump(out, open(os.path.join(HERE, "recompute.json"), "w"), indent=1, default=float)
for c in out["checks"]:
    v = c["ours"]
    s = f"{v:.4g}" if abs(v) >= 1000 or abs(v) < 1e-3 else (f"{v*100:.2f}%" if v < 1 else f"{v:.4g}")
    print(f"{c['what']}: ours {s} | published {c['pub']}")
print("crossovers", [c["out"] for c in out["cross"]])
