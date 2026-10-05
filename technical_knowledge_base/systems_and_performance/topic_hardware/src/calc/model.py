"""Performance calculator (hardware root, tab t-calc): the reference model.

Every function here is mirrored line for line in src/parts/32_js_calc_0core.js;
check_calc.mjs evaluates the JS on the cases in recompute.json and compares.
Pure Python, no dependencies. Run: python3 recompute.py
"""
import json, math, os

HERE = os.path.dirname(os.path.abspath(__file__))
INP = os.path.join(HERE, "inputs")


def cfg(name):
    with open(os.path.join(INP, name)) as f:
        return json.load(f)


# ---------- models from their Hugging Face config.json ----------
def dense_like(c, name, src, qk_norm=False):
    h, f, L = c["hidden_size"], c["intermediate_size"], c["num_hidden_layers"]
    nh, nkv = c["num_attention_heads"], c["num_key_value_heads"]
    hd = c.get("head_dim") or h // nh
    V = c["vocab_size"]
    attn = h * nh * hd + 2 * h * nkv * hd + nh * hd * h + (2 * hd if qk_norm else 0)
    mlp = 3 * h * f
    per = attn + mlp + 2 * h
    emb = V * h * (1 if c.get("tie_word_embeddings") else 2)
    P = emb + L * per + h
    return dict(name=name, src=src, L=L, h=h, nh=nh, nkv=nkv, hd=hd, V=V,
                P=P, Pact=P, Pexp=0, E=0, k=0, moeL=0,
                kv_full=L, kv_slide=0, window=0, kv_el=2 * nkv * hd,
                dqk=hd, dv=hd, layer_params=attn + mlp + 2 * h, fmt="bf16", fmt_note="bf16 as released")


def qwen3_moe(c, name, src):
    h, L = c["hidden_size"], c["num_hidden_layers"]
    nh, nkv, hd = c["num_attention_heads"], c["num_key_value_heads"], c["head_dim"]
    V, E, k, fm = c["vocab_size"], c["num_experts"], c["num_experts_per_tok"], c["moe_intermediate_size"]
    attn = h * nh * hd + 2 * h * nkv * hd + nh * hd * h + 2 * hd
    exp1 = 3 * h * fm
    router = h * E
    per_fixed = attn + router + 2 * h
    P = 2 * V * h + L * (per_fixed + E * exp1) + h
    Pexp = L * E * exp1
    Pact = P - Pexp + L * k * exp1
    return dict(name=name, src=src, L=L, h=h, nh=nh, nkv=nkv, hd=hd, V=V,
                P=P, Pact=Pact, Pexp=Pexp, E=E, k=k, moeL=L, exp1=exp1,
                kv_full=L, kv_slide=0, window=0, kv_el=2 * nkv * hd,
                dqk=hd, dv=hd, layer_params=attn + k * exp1 + 2 * h, fmt="bf16", fmt_note="bf16 as released")


def deepseek_v3(c, name, src):
    h, L = c["hidden_size"], c["num_hidden_layers"]
    nh, V = c["num_attention_heads"], c["vocab_size"]
    ql, kvl = c["q_lora_rank"], c["kv_lora_rank"]
    nope, rope, vd = c["qk_nope_head_dim"], c["qk_rope_head_dim"], c["v_head_dim"]
    E, k, ns, fm, f = c["n_routed_experts"], c["num_experts_per_tok"], c["n_shared_experts"], c["moe_intermediate_size"], c["intermediate_size"]
    dense_n = c["first_k_dense_replace"]
    attn = (h * ql + ql + ql * nh * (nope + rope) + h * (kvl + rope) + kvl
            + kvl * nh * (nope + vd) + nh * vd * h)
    exp1 = 3 * h * fm
    dense_layer = attn + 3 * h * f + 2 * h
    moe_fixed = attn + ns * exp1 + E * h + E + 2 * h  # router weight and its bias
    moeL = L - dense_n
    P = 2 * V * h + dense_n * dense_layer + moeL * (moe_fixed + E * exp1) + h
    Pexp = moeL * E * exp1
    Pact = P - Pexp + moeL * k * exp1
    return dict(name=name, src=src, L=L, h=h, nh=nh, nkv=nh, hd=nope + rope, V=V,
                P=P, Pact=Pact, Pexp=Pexp, E=E, k=k, moeL=moeL, exp1=exp1,
                kv_full=L, kv_slide=0, window=0, kv_el=kvl + rope,  # MLA caches the latent plus the shared rope key
                dqk=nope + rope, dv=vd, layer_params=moe_fixed + k * exp1, fmt="fp8", fmt_note="FP8 as released (block-scaled)")


def gpt_oss(c, name, src):
    h, L = c["hidden_size"], c["num_hidden_layers"]
    nh, nkv, hd, V = c["num_attention_heads"], c["num_key_value_heads"], c["head_dim"], c["vocab_size"]
    E, k, f = c["num_local_experts"], c["num_experts_per_tok"], c["intermediate_size"]
    attn = (h * nh * hd + nh * hd) + 2 * (h * nkv * hd + nkv * hd) + (nh * hd * h + h) + nh  # biases and sinks
    exp1 = h * 2 * f + 2 * f + f * h + h  # gate_up with bias, down with bias
    router = h * E + E
    per_fixed = attn + router + 2 * h
    P = 2 * V * h + L * (per_fixed + E * exp1) + h
    Pexp = L * E * exp1
    Pact = P - Pexp + L * k * exp1
    lt = c["layer_types"]
    return dict(name=name, src=src, L=L, h=h, nh=nh, nkv=nkv, hd=hd, V=V,
                P=P, Pact=Pact, Pexp=Pexp, E=E, k=k, moeL=L, exp1=exp1,
                kv_full=lt.count("full_attention"), kv_slide=lt.count("sliding_attention"), window=c["sliding_window"],
                kv_el=2 * nkv * hd, dqk=hd, dv=hd, layer_params=per_fixed + k * exp1,
                fmt="mxfp4x", fmt_note="experts MXFP4, the rest bf16, as released")


HF = "https://huggingface.co/"
MODELS = {
    "l8": dense_like(cfg("cfg_unsloth_Meta-Llama-3.1-8B.json"), "Llama 3.1 8B", HF + "unsloth/Meta-Llama-3.1-8B/blob/main/config.json"),
    "l70": dense_like(cfg("cfg_unsloth_Meta-Llama-3.1-70B.json"), "Llama 3.1 70B", HF + "unsloth/Meta-Llama-3.1-70B/blob/main/config.json"),
    "l405": dense_like(cfg("cfg_unsloth_Meta-Llama-3.1-405B-bnb-4bit.json"), "Llama 3.1 405B", HF + "unsloth/Meta-Llama-3.1-405B-bnb-4bit/blob/main/config.json"),
    "q32": dense_like(cfg("cfg_Qwen_Qwen3-32B.json"), "Qwen3 32B", HF + "Qwen/Qwen3-32B/blob/main/config.json", qk_norm=True),
    "q235": qwen3_moe(cfg("cfg_Qwen_Qwen3-235B-A22B.json"), "Qwen3 235B-A22B (MoE)", HF + "Qwen/Qwen3-235B-A22B/blob/main/config.json"),
    "dsv3": deepseek_v3(cfg("cfg_deepseek-ai_DeepSeek-V3.json"), "DeepSeek-V3 671B (MoE, MLA)", HF + "deepseek-ai/DeepSeek-V3/blob/main/config.json"),
    "oss120": gpt_oss(cfg("cfg_openai_gpt-oss-120b.json"), "gpt-oss-120b (MoE)", HF + "openai/gpt-oss-120b/blob/main/config.json"),
}

# ---------- chips (dense peaks in TFLOP/s, memory GB, bandwidth GB/s, links GB/s per direction, price $/chip-hour) ----------
# Every value is in the shared facts file used by the Chip atlas (vendor pages fetched 2026-10-05); links per direction are half the bidirectional figure.
CHIPS = {
    "h100": dict(name="H100 SXM", peak=dict(bf16=989.5, fp8=1979), mem=80, bw=3350, up=450, upN=8, out=50, price=3.99, price_src="Lambda 8x H100 SXM on demand"),
    "h200": dict(name="H200 SXM", peak=dict(bf16=989.5, fp8=1979), mem=141, bw=4800, up=450, upN=8, out=50, price=None, price_src=None),
    "b200": dict(name="B200 (HGX)", peak=dict(bf16=2250, fp8=4500, fp4=9000), mem=180, bw=8000, up=900, upN=8, out=50, price=6.69, price_src="Lambda 8x B200 SXM6 on demand"),
    "gb200": dict(name="GB200 NVL72 (per GPU)", peak=dict(bf16=2500, fp8=5000, fp4=10000), mem=186, bw=8000, up=900, upN=72, out=50, price=None, price_src=None),
    "mi300x": dict(name="MI300X", peak=dict(bf16=1307.4, fp8=2614.9), mem=192, bw=5300, up=448, upN=8, out=50, price=None, price_src=None),
    "rtx5090": dict(name="RTX 5090", peak=dict(bf16=209.5, fp8=419, fp4=1676), mem=32, bw=1792, up=63, upN=1, out=12.5, price=None, price_src=None),
    "v6e": dict(name="TPU v6e (Trillium)", peak=dict(bf16=918), mem=32, bw=1638, up=400, upN=256, out=None, price=2.70, price_src="Google Cloud on demand, us-east1"),
    "v7": dict(name="TPU7x (Ironwood)", peak=dict(bf16=2307, fp8=4614), mem=206.2, bw=7380, up=600, upN=9216, out=None, price=12.00, price_src="Google Cloud on demand, us-central1"),
    "m1pro": dict(name="Apple M1 Pro GPU (measured)", peak=dict(bf16=5.0), mem=16, bw=165, up=None, upN=1, out=None, price=None, price_src=None),
}

# ---------- training ----------
RECIPES = {  # bytes per parameter: weights, gradients, optimizer (master + moments)
    "adam16": dict(w=2, g=2, o=12, name="Mixed-precision Adam: bf16 weights and grads, fp32 master, m, v (16 B)"),
    "adam8bit": dict(w=2, g=2, o=6, name="8-bit Adam moments, fp32 master (10 B)"),
    "bf16adam": dict(w=2, g=2, o=4, name="Everything bf16, no fp32 master (8 B)"),
    "lora": dict(w=2, g=0, o=0, name="LoRA r=16 on every linear, bf16 base frozen"),
    "qlora": dict(w=0.516, g=0, o=0, name="QLoRA: NF4 base with double quantisation (4.127 bits), r=16"),
}


def lora_params(m, r=16):
    """Adapter parameters for rank r on q, k, v, o and the MLP projections (routed experts excluded for MoE)."""
    h, nh, nkv, hd = m["h"], m["nh"], m["nkv"], m["hd"]
    attn = r * (h + nh * hd) * 2 + r * (h + nkv * hd) * 2
    if m["E"]:
        mlp = 0
    else:
        f = (m["layer_params"] - 2 * h - (h * nh * hd + 2 * h * nkv * hd + nh * hd * h)) // (3 * h)
        mlp = 3 * r * (h + f)
    return m["L"] * (attn + mlp)


def act_bytes(m, s, b, ckpt, tp):
    """Korthikanti et al. 2022, GPT-style count, 16-bit activations, sequence parallel with TP."""
    h, a, L = m["h"], m["nh"], m["L"]
    if ckpt == "none":
        per = s * b * h * (34 + 5 * a * s / h)
        return L * per / tp
    if ckpt == "flash":
        return L * 34 * s * b * h / tp
    # full: layer inputs kept, one layer's working set recomputed at a time
    return (L * 2 * s * b * h + 34 * s * b * h) / tp


def train(o):
    m, ch, r = MODELS[o["model"]], CHIPS[o["chip"]], RECIPES[o["recipe"]]
    n, tp, pp, z = o["gpus"], o.get("tp", 1), o.get("pp", 1), o.get("zero", 0)
    dp = max(1, n // (tp * pp))
    mp = tp * pp  # each GPU holds 1/(tp*pp) of the model before any ZeRO sharding
    P = m["P"]
    if o["recipe"] in ("lora", "qlora"):
        A = lora_params(m)
        w = (r["w"] * P + 2 * A) / mp
        g = 2 * A / mp
        opt = 12 * A / mp
        if z >= 1: opt /= dp
        if z >= 2: g /= dp
        if z >= 3: w /= dp
        trainable = A
    else:
        w = r["w"] * P / mp / (dp if z >= 3 else 1)
        g = r["g"] * P / mp / (dp if z >= 2 else 1)
        opt = r["o"] * P / mp / (dp if z >= 1 else 1)
        trainable = P
    act = act_bytes(m, o["seq"], o["mb"], o["ckpt"], tp)  # with 1F1B pipelining the first stage holds pp micro-batches of L/pp layers: the same total
    total = w + g + opt + act
    fl_tok = 6 * m["Pact"] + (12 * m["L"] * m["nh"] * m["dqk"] * o["seq"] if o.get("attn") else 0)
    if o["recipe"] in ("lora", "qlora"):
        fl_tok = 4 * m["Pact"]  # forward 2N, backward for activations 2N, no weight gradients for the frozen base
    hw_tok = fl_tok + (2 * m["Pact"] if o["ckpt"] == "full" else 0)
    C = fl_tok * o["tokens"]
    peak = ch["peak"]["bf16"] * 1e12
    secs = C / (n * peak * o["mfu"])
    gpuh = n * secs / 3600
    return dict(w=w / 1e9, g=g / 1e9, opt=opt / 1e9, act=act / 1e9, total=total / 1e9, mem=ch["mem"], fits=total / 1e9 <= ch["mem"],
                trainable=trainable, flops=C, fl_tok=fl_tok, hfu_ratio=hw_tok / fl_tok, days=secs / 86400, gpuh=gpuh,
                cost=gpuh * ch["price"] if ch["price"] else None)


# ---------- inference ----------
FMT = {"bf16": 2.0, "fp8": 1.0, "mxfp4": 4.25 / 8, "nvfp4": 4.5 / 8}


def weight_bytes(m, fmt):
    if fmt == "native":
        fmt = m["fmt"]
    if fmt == "mxfp4x":  # gpt-oss as shipped: experts MXFP4, everything else bf16
        return m["Pexp"] * FMT["mxfp4"] + (m["P"] - m["Pexp"]) * 2
    return m["P"] * FMT[fmt]


def kv_per_token(m, kvb):
    return m["kv_el"] * (m["kv_full"] + m["kv_slide"]) * kvb


def kv_seq(m, ctx, kvb):
    """KV bytes held for one sequence of ctx tokens (sliding-window layers keep at most window tokens)."""
    full = m["kv_el"] * m["kv_full"] * ctx
    slide = m["kv_el"] * m["kv_slide"] * min(ctx, m["window"]) if m["kv_slide"] else 0
    return (full + slide) * kvb


def experts_touched(m, B):
    """Expected distinct routed experts per MoE layer for B tokens with uniform routing."""
    if not m["E"]:
        return 0
    return m["E"] * (1 - (1 - m["k"] / m["E"]) ** B)


def decode(o):
    m, ch = MODELS[o["model"]], CHIPS[o["chip"]]
    n, B, ctx, kvb = o["chips"], o["batch"], o["ctx"], o["kvb"]
    wb = weight_bytes(m, o["fmt"])
    bpp = wb / m["P"]
    if m["E"]:
        touched = experts_touched(m, B)
        wread = (m["P"] - m["Pexp"]) * bpp + m["moeL"] * touched * m["exp1"] * bpp
    else:
        wread = wb
    kvr = B * kv_seq(m, ctx, kvb)
    byts = wread + kvr
    att_ctx = m["kv_full"] * ctx + (m["kv_slide"] * min(ctx, m["window"]) if m["kv_slide"] else 0)
    fl = B * (2 * m["Pact"] + 2 * m["nh"] * (m["dqk"] + m["dv"]) * att_ctx)
    pk = ch["peak"][o["prec"]] * 1e12 * n * o["eff"]
    bw = ch["bw"] * 1e9 * n * o["eff"]
    t_mem, t_cmp = byts / bw, fl / pk
    t = max(t_mem, t_cmp)
    mem_need = wb + B * kv_seq(m, ctx, kvb)
    return dict(wbytes=wb / 1e9, kv_tok=kv_per_token(m, kvb), kv_seq=kv_seq(m, ctx, kvb) / 1e9, mem_need=mem_need / 1e9,
                mem_have=ch["mem"] * n, fits=mem_need / 1e9 <= ch["mem"] * n, wread=wread / 1e9, kvread=kvr / 1e9,
                t_ms=t * 1e3, t_mem_ms=t_mem * 1e3, t_cmp_ms=t_cmp * 1e3, bound="memory" if t_mem >= t_cmp else "compute",
                tps_seq=1 / t, tps=B / t, busy=t_cmp / t)


def crossover(o):
    """Smallest batch at which a decode step becomes compute-bound (None if not before 4096)."""
    for B in range(1, 4097):
        d = decode(dict(o, batch=B))
        if d["bound"] == "compute":
            return B
    return None


def prefill(o):
    m, ch = MODELS[o["model"]], CHIPS[o["chip"]]
    Pt = o["prompt"]
    att_ctx = m["kv_full"] * Pt + (m["kv_slide"] * min(Pt, m["window"]) if m["kv_slide"] else 0)
    fl = 2 * m["Pact"] * Pt + m["nh"] * (m["dqk"] + m["dv"]) * att_ctx * Pt  # causal: half of 2*(dqk+dv) per pair
    pk = ch["peak"][o["prec"]] * 1e12 * o["chips"] * o["eff"]
    return dict(flops=fl, t_ms=fl / pk * 1e3)


# ---------- communication ----------
def allreduce(S_bytes, n, bw_GBs, lat_us=0.0):
    """Ring all-reduce, NCCL-tests bus-bandwidth model: t = 2(n-1)/n * S / B (+ 2(n-1) latency hops)."""
    if n <= 1:
        return 0.0
    return 2 * (n - 1) / n * S_bytes / (bw_GBs * 1e9) + 2 * (n - 1) * lat_us * 1e-6


def tp_ratio(o):
    """Megatron tensor parallelism: 4 all-reduces of s*b*h bf16 activations per layer per micro-batch (2 forward, 2 backward)
    against that layer's matmul time at the given MFU. Tokens cancel."""
    m, ch = MODELS[o["model"]], CHIPS[o["chip"]]
    tp, T = o["tp"], o["tokens"]
    comm = 4 * 2 * (tp - 1) / tp * T * m["h"] * 2 / (o["link"] * 1e9)
    comp = 6 * m["layer_params"] * T / (tp * ch["peak"]["bf16"] * 1e12 * o["mfu"])
    return dict(comm_ms=comm * 1e3, comp_ms=comp * 1e3, ratio=comm / comp)


# ---------- the one-step training animation (Llama 3.1 8B, H100 SXM, 524,288 tokens per step) ----------
def step_anim(mode, overlap):
    m, ch = MODELS["l8"], CHIPS["h100"]
    P, seq, gb, mfu = m["P"], 8192, 64, 0.40
    n = {"1": 1, "8": 8, "64f": 64, "64h": 64}[mode]
    micro = gb // n
    t_cmp = 6 * P * seq / (ch["peak"]["bf16"] * 1e12 * mfu)
    act = act_bytes(m, seq, 1, "flash", 1)
    if n == 1:
        states = 16 * P
        ag = rs = cross = 0.0
        vol = 0.0
    elif mode == "8" or mode == "64f":
        states = 16 * P / n
        link = ch["up"] if n <= 8 else ch["out"]
        ag = (n - 1) / n * 2 * P / (link * 1e9)
        rs = ag
        cross = 0.0
        vol = 3 * (n - 1) / n * 2 * P
    else:  # HSDP: shard over the 8 GPUs of a node, replicate across 8 nodes
        states = 16 * P / 8
        ag = 7 / 8 * 2 * P / (ch["up"] * 1e9)
        rs = ag
        cross = allreduce(2 * P / 8, 8, ch["out"]) / micro  # once per step, spread over micro-batches for the per-micro view
        vol = 3 * 7 / 8 * 2 * P + 2 * 7 / 8 * 2 * P / 8 / micro
    comm = 2 * ag + rs + cross
    per_micro = t_cmp + (comm if not overlap else max(0.0, comm - t_cmp))
    opt = 28 * (P / (8 if mode == "64h" else n)) / (ch["bw"] * 1e9)
    step = micro * per_micro + opt
    tokens = gb * seq
    return dict(n=n, micro=micro, t_cmp=t_cmp, ag=ag, rs=rs, cross=cross, comm=comm, opt=opt, step=step,
                states=states / 1e9, act=act / 1e9, mem=(states + act) / 1e9, fits=(states + act) / 1e9 <= ch["mem"],
                tok_s=tokens / step, tok_s_gpu=tokens / step / n, mfu=6 * P * tokens / (step * n * ch["peak"]["bf16"] * 1e12),
                vol_gb=vol * micro / 1e9, net_busy=comm / t_cmp)
