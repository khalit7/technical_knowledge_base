"""Capacity planner (Topic: inference-and-serving, tab t-plan): the reference model.

Builds on the hardware root's Performance calculator (topic_hardware/src/calc/model.py), imported
unchanged, so model shapes, KV bytes per token, expert routing and the decode and prefill FLOP counts
are the same functions on both pages. parts/33_js_plan_1core.js mirrors every function here line for
line; check/check_plan.mjs evaluates the JavaScript on the cases in out/plan_ref.json.
Pure Python, no dependencies.
"""
import json, math, os, sys

HERE = os.path.dirname(os.path.abspath(__file__))
INP = os.path.join(HERE, "inputs")
sys.path.insert(0, os.path.join(HERE, "..", "..", "..", "topic_hardware", "src", "calc"))
import model as HW  # noqa: E402  the parent's calculator, unchanged


def cfg(name):
    with open(os.path.join(INP, name)) as f:
        return json.load(f)


SRC = json.load(open(os.path.join(INP, "sources.json")))
HF = "https://huggingface.co/"

# ---------- models: the parent's seven plus the ones this page needs ----------
MODELS = {k: dict(v) for k, v in HW.MODELS.items()}
MODELS["q8"] = HW.dense_like(cfg("cfg_Qwen_Qwen3-8B.json"), "Qwen3 8B", HF + "Qwen/Qwen3-8B/blob/main/config.json", qk_norm=True)
MODELS["q4"] = HW.dense_like(cfg("cfg_Qwen_Qwen3-4B.json"), "Qwen3 4B", HF + "Qwen/Qwen3-4B/blob/main/config.json", qk_norm=True)
MODELS["q17"] = HW.dense_like(cfg("cfg_Qwen_Qwen3-1.7B.json"), "Qwen3 1.7B", HF + "Qwen/Qwen3-1.7B/blob/main/config.json", qk_norm=True)
MODELS["q06"] = HW.dense_like(cfg("cfg_Qwen_Qwen3-0.6B.json"), "Qwen3 0.6B", HF + "Qwen/Qwen3-0.6B/blob/main/config.json", qk_norm=True)
MODELS["q30"] = HW.qwen3_moe(cfg("cfg_Qwen_Qwen3-30B-A3B.json"), "Qwen3 30B-A3B (MoE)", HF + "Qwen/Qwen3-30B-A3B/blob/main/config.json")
MODELS["oss20"] = HW.gpt_oss(cfg("cfg_openai_gpt-oss-20b.json"), "gpt-oss-20b (MoE)", HF + "openai/gpt-oss-20b/blob/main/config.json")
MODELS["dsr1"] = HW.deepseek_v3(cfg("cfg_deepseek-ai_DeepSeek-R1.json"), "DeepSeek-R1 671B (MoE, MLA)", HF + "deepseek-ai/DeepSeek-R1/blob/main/config.json")

# extra fields this page needs: the active FFN width (activation estimate), tied embeddings, attention type
_CF = {"l8": "cfg_unsloth_Meta-Llama-3.1-8B.json", "l70": "cfg_unsloth_Meta-Llama-3.1-70B.json",
       "l405": "cfg_unsloth_Meta-Llama-3.1-405B-bnb-4bit.json", "q32": "cfg_Qwen_Qwen3-32B.json",
       "q235": "cfg_Qwen_Qwen3-235B-A22B.json", "dsv3": "cfg_deepseek-ai_DeepSeek-V3.json",
       "oss120": "cfg_openai_gpt-oss-120b.json", "q8": "cfg_Qwen_Qwen3-8B.json", "q4": "cfg_Qwen_Qwen3-4B.json",
       "q17": "cfg_Qwen_Qwen3-1.7B.json", "q06": "cfg_Qwen_Qwen3-0.6B.json", "q30": "cfg_Qwen_Qwen3-30B-A3B.json",
       "oss20": "cfg_openai_gpt-oss-20b.json", "dsr1": "cfg_deepseek-ai_DeepSeek-R1.json"}
for k, m in MODELS.items():
    c = cfg(_CF[k])
    if "n_routed_experts" in c:  # DeepSeek: routed k plus shared experts
        m["ffa"] = (c["num_experts_per_tok"] + c["n_shared_experts"]) * c["moe_intermediate_size"]
        m["mla"] = 1
    elif "num_experts" in c:  # Qwen3 MoE
        m["ffa"] = c["num_experts_per_tok"] * c["moe_intermediate_size"]
        m["mla"] = 0
    elif "num_local_experts" in c:  # gpt-oss
        m["ffa"] = c["num_experts_per_tok"] * c["intermediate_size"]
        m["mla"] = 0
    else:
        m["ffa"] = c["intermediate_size"]
        m["mla"] = 0
    m["emb"] = m["V"] * m["h"] * (1 if c.get("tie_word_embeddings") else 2)  # embedding + LM head parameters
    m["api"] = k

# ---------- chips: the parent's, plus the L40S; prices from sources.json ----------
CHIPS = {k: dict(HW.CHIPS[k]) for k in ("h100", "h200", "b200", "mi300x", "rtx5090", "m1pro")}
L = SRC["l40s"]
CHIPS["l40s"] = dict(name="L40S (PCIe)", peak=dict(bf16=L["bf16_dense_tflops"], fp8=L["fp8_dense_tflops"]), mem=L["mem_gb"],
                     bw=L["bw_gbs"], up=L["pcie_gbs_bidirectional"] / 2, upN=8, out=None, price=None, price_src=None)
CHIPS["rtx5090"]["upN"] = 8  # TP over PCIe in a multi-GPU workstation; the parent's upN=1 means no NVLink
NVL_HOP = SRC["nvlink_latency"]["value_us"]
for k, ch in CHIPS.items():
    p = SRC["gpu_prices_usd_per_gpu_hour"][k]
    ch["price"], ch["price_src"] = p["price"], p.get("what")
    ch["pcie"] = k in ("l40s", "rtx5090")
    # one-shot all-reduce of a small message: about two link hops (write, then flag); PCIe doubled (assumption)
    ch["lat"] = 2 * NVL_HOP * (2 if ch["pcie"] else 1)
    ch["tpmax"] = 1 if k == "m1pro" else 8
    # usable share of memory: vLLM's default 0.92; on the M1 Pro, Metal's recommended working set
    ch["util"] = SRC["m1pro_working_set"]["bytes"] / 1e9 / ch["mem"] if k == "m1pro" else SRC["vllm_defaults"]["gpu_memory_utilization"]["value"]

INT4_BITS = 4 + 16 / 128 + 4 / 128  # 4-bit weights, one 16-bit scale and one 4-bit zero per group of 128 (AWQ/GPTQ layout)
Q4KM_BITS = 390753280 * 8 / 596049920  # llama.cpp Q4_K_M as measured on Qwen3-0.6B (llama-bench model_size / model_n_params): 5.245 bits
BLOCK = SRC["vllm_defaults"]["block_size"]["value"]


# ---------- weights ----------
def weight_split(m, fmt):
    """(non-expert bytes, expert bytes). BF16 = the parent's count. FP8 and INT4 keep the embedding and LM head
    at 16 bits, as released FP8 and AWQ/GPTQ checkpoints do (RedHatAI Llama-3.1-8B-Instruct-FP8: 1.05B BF16 + 6.98B FP8)."""
    if fmt == "native":
        fmt = m["fmt"]
    P, Pe, emb = m["P"], m["Pexp"], m["emb"]
    if fmt == "mxfp4x":  # gpt-oss as shipped (the parent's weight_bytes): experts MXFP4, the rest BF16
        return (P - Pe) * 2, Pe * HW.FMT["mxfp4"]
    if fmt == "bf16":
        return (P - Pe) * 2, Pe * 2
    if fmt == "q4km":  # every tensor, embeddings included, at the measured average
        return (P - Pe) * Q4KM_BITS / 8, Pe * Q4KM_BITS / 8
    b = 1 if fmt == "fp8" else INT4_BITS / 8
    return (P - Pe - emb) * b + emb * 2, Pe * b


def compute_prec(m, ch, fmt):
    """FP8 weights run FP8 matmuls where the chip has FP8; weight-only INT4 and MXFP4 dequantise to 16-bit."""
    f = m["fmt"] if fmt == "native" else fmt
    return "fp8" if (f == "fp8" and "fp8" in ch["peak"]) else "bf16"


def att_ctx(m, x):
    """Layer-summed attended context for one token at position x (the parent's attCtx)."""
    return m["kv_full"] * x + (m["kv_slide"] * min(x, m["window"]) if m["kv_slide"] else 0)


# ---------- the deployment ----------
def setup(o):
    """Memory per GPU and the most sequences a replica can hold. o: model, chip, fmt, kvb, tp, pp, ep (0/1),
    tb (max tokens per step), seqs (max sequences), util, ovh (GB per GPU), P, O, share."""
    m, ch = MODELS[o["model"]], CHIPS[o["chip"]]
    tp, pp, ep = o["tp"], o["pp"], o["ep"] and m["E"] > 0
    G = tp * pp
    wn, we = weight_split(m, o["fmt"])
    if ep:  # attention replicated per GPU (data-parallel attention), experts spread over all G GPUs
        w_gpu = wn + we / G
        kvf = 1.0  # each GPU holds the whole cache of its own sequences
        tpa = 1
    else:
        w_gpu = (wn + we) / G
        kvf = (1.0 if m["mla"] else max(1 / tp, 1 / m["nkv"])) / pp  # MLA's latent is not split by heads; GQA heads replicate past nkv
        tpa = tp
    kv_tok = HW.kv_per_token(m, o["kvb"])  # bytes per token, all layers (the parent's function)
    tb = o["tb"]
    act = tb * 2 * (2 * m["h"] + 2 * m["ffa"] / tpa) + min(o["seqs"], tb) * m["V"] * 4 / tpa  # estimate of the profiling peak
    usable = ch["mem"] * 1e9 * o["util"]
    pool = usable - w_gpu - act - o["ovh"] * 1e9
    Pu = max(1.0, o["P"] * (1 - o["share"]))
    shared = o["P"] - Pu
    held = math.ceil((Pu + o["O"] / 2) / BLOCK) * BLOCK  # mean tokens a running sequence holds, rounded to blocks
    shared_b = math.ceil(shared / BLOCK) * BLOCK if shared > 0 else 0
    per_seq = kv_seq_gpu(m, held, o["kvb"], kvf)
    fixed = kv_seq_gpu(m, shared_b, o["kvb"], kvf) if shared_b else 0.0
    nkv_gpu = max(0.0, (pool - fixed) / per_seq) if pool > fixed else 0.0
    seqs_cap = math.floor(nkv_gpu) * (G if ep else 1)
    bmax = min(seqs_cap, o["seqs"] * (G if ep else 1))
    return dict(G=G, ep=1 if ep else 0, w_gpu=w_gpu, wn=wn, we=we, act=act, ovh=o["ovh"] * 1e9, usable=usable, pool=pool,
                kvf=kvf, kv_tok=kv_tok, kv_tok_gpu=kv_tok * kvf, held=held, per_seq=per_seq, fixed=fixed,
                seqs_kv=seqs_cap, bmax=bmax, fits=pool > fixed + per_seq, Pu=Pu, prec=compute_prec(m, ch, o["fmt"]))


def kv_seq_gpu(m, tokens, kvb, kvf):
    """Bytes of one sequence's cache on one GPU (the parent's kv_seq, which caps sliding-window layers)."""
    return HW.kv_seq(m, tokens, kvb) * kvf


def step(o, s, B, c):
    """One engine step with B decoding sequences and c prefill tokens, on one replica. Returns seconds and parts.
    Per GPU and per pipeline micro-batch: max(bytes / bandwidth, FLOPs / peak), plus communication; a token passes
    the pp stages in turn; plus a fixed per-step overhead (scheduling, sampling, launches)."""
    m, ch = MODELS[o["model"]], CHIPS[o["chip"]]
    tp, pp, G, ep = o["tp"], o["pp"], s["G"], s["ep"]
    T = B + c
    ctx_dec = o["P"] + o["O"] / 2  # mean context of a decoding sequence
    ctx_pre = (o["P"] - s["Pu"]) + s["Pu"] / 2  # mean position of a prefill token
    # weights read once per micro-batch: for a mixture of experts only the experts this step's tokens touch
    if m["E"]:
        frac = HW.experts_touched(m, max(T / pp if not ep else T, 1e-9)) / m["E"]
        wr = (s["wn"] / (1 if ep else G)) + s["we"] / G * frac
    else:
        wr = s["w_gpu"]
    kvr = (B / G if ep else B / pp) * kv_seq_gpu(m, ctx_dec, o["kvb"], s["kvf"])
    fl = T * 2 * m["Pact"] + B * 2 * m["nh"] * (m["dqk"] + m["dv"]) * att_ctx(m, ctx_dec) \
        + c * 2 * m["nh"] * (m["dqk"] + m["dv"]) * att_ctx(m, ctx_pre)
    fl_gpu = fl / G if ep else fl / (tp * pp * pp)  # per GPU per micro-batch: T/pp tokens through L/pp layers over tp GPUs
    pk = ch["peak"][s["prec"]] * 1e12 * o["eff_c"]
    bw = ch["bw"] * 1e9 * o["eff_m"]
    t_mem, t_cmp = (wr + kvr) / bw, fl_gpu / pk
    # communication per micro-batch
    link = ch["up"] if (ch["up"] and G <= ch["upN"]) else (ch["out"] or ch["up"] or 1)
    lat = ch["lat"] * 1e-6 * o["latx"]
    if ep and G > 1:
        tg = T / G
        a2a = tg * m["k"] * m["h"] * 3 * (G - 1) / G / (link * 1e9) + 2 * lat  # FP8 dispatch + BF16 combine
        t_comm = m["moeL"] * a2a
    elif tp > 1:
        S = T / pp * m["h"] * 2
        ar = 2 * (tp - 1) / tp * S / (link * 1e9) + lat
        t_comm = (m["L"] / pp) * 2 * ar  # two all-reduces per layer (after attention, after the MLP)
    else:
        t_comm = 0.0
    work = max(t_mem, t_cmp)
    t_mb = max(work, t_comm) if o["overlap"] else work + t_comm
    t = pp * t_mb + o["tovh"] * 1e-3 + o["tseq"] * 1e-3 * (B / G if ep else B)  # tseq: extra cost per decoding sequence (0 for the GPU engines)
    return dict(t=t, t_mem=t_mem * pp, t_cmp=t_cmp * pp, t_comm=t_comm * pp, wr=wr, kvr=kvr, fl=fl,
                bound="memory" if t_mem >= t_cmp else "compute")


# ---------- the fluid limit: average behaviour at an arrival rate ----------
GRID = [1e-4 * (60 / 1e-4) ** (i / 199) for i in range(200)]


def fluid(o, s, lam):
    """Mean step time T at lam requests/s on one replica when every step carries the prefill that arrived during
    the previous one: T = step(B = lam*O*T, c = lam*Pu*T) (Little's law). The smallest T that satisfies it, or None
    when there is none, or the sequences exceed what the cache holds, or the step exceeds the token budget."""
    O, Pu, tb = o["O"], s["Pu"], o["tb"]
    if lam <= 0:
        t0 = step(o, s, 1, 0)["t"]
        return dict(t=t0, B=0.0, c=0.0)
    f = lambda T: step(o, s, lam * O * T, lam * Pu * T)["t"] <= T
    hi = -1
    for i, T in enumerate(GRID):
        if f(T):
            hi = i
            break
    if hi < 0:
        return None
    a, b = (GRID[hi - 1] if hi > 0 else 0.0), GRID[hi]
    for _ in range(60):
        mid = (a + b) / 2
        if f(mid):
            b = mid
        else:
            a = mid
    B, c = lam * O * b, lam * Pu * b
    if B > s["bmax"] or B + c > tb:
        return None
    return dict(t=b, B=B, c=c)


def max_fluid(o, s):
    """Highest arrival rate the fluid limit sustains: the offline throughput ceiling of one replica."""
    ok = lambda lam: fluid(o, s, lam) is not None
    hi = 1e-3
    if not ok(hi):
        return 0.0
    while ok(hi * 2) and hi < 1e7:
        hi *= 2
    lo, hi = hi, hi * 2
    for _ in range(50):
        mid = (lo + hi) / 2
        if ok(mid):
            lo = mid
        else:
            hi = mid
    return lo


# ---------- the scheduler, simulated step by step ----------
def rng(seed):
    """mulberry32: the same stream of uniforms in Python and JavaScript."""
    st = [seed & 0xFFFFFFFF]

    def nxt():
        st[0] = (st[0] + 0x6D2B79F5) & 0xFFFFFFFF
        z = st[0]
        z = ((z ^ (z >> 15)) * (z | 1)) & 0xFFFFFFFF
        z ^= (z + (((z ^ (z >> 7)) * (z | 61)) & 0xFFFFFFFF)) & 0xFFFFFFFF
        return ((z ^ (z >> 14)) & 0xFFFFFFFF) / 4294967296
    return nxt


def simulate(o, s, lam, n=3000, seed=7, warm=0.15):
    """vLLM-style continuous batching with chunked prefill: Poisson arrivals (the same uniforms at every rate),
    every running sequence decodes one token per step, the token budget left after the decodes goes to waiting
    prompts first come first served in chunks, a new sequence starts only while the cache has room, a prompt's
    first token comes at the end of the step that finishes its prefill, and each step lasts step(B, c)."""
    u = rng(seed)
    arr, t = [], 0.0
    for _ in range(n):
        t += -math.log(1 - u()) / lam
        arr.append(t)
    Pu = max(1, int(math.floor(s["Pu"] + 0.5)))
    O, tb, bmax = o["O"], o["tb"], int(s["bmax"])
    now, i, ndone, steps = 0.0, 0, 0, 0
    wid, wleft = [], []          # waiting prompts: id, prefill tokens left (FIFO)
    run = []                     # running sequences: tokens still to generate
    first = [0.0] * n
    done = [0.0] * n
    runid = []
    tB, tT = 0.0, 0.0
    backlog = 0
    while ndone < n:
        while i < n and arr[i] <= now:
            wid.append(i); wleft.append(Pu); i += 1
        if i == n and backlog == 0:
            backlog = len(wid) + 1
        if not wid and not run:
            now = arr[i]
            continue
        B = len(run)
        budget = tb - B
        c, adm, fin, j = 0, B, [], 0
        while j < len(wid) and budget > 0:
            if wleft[j] == Pu:
                if adm >= bmax:
                    break
                adm += 1
            take = min(wleft[j], budget)
            wleft[j] -= take
            budget -= take
            c += take
            if wleft[j] == 0:
                fin.append(wid[j])
            j += 1
        dt = step(o, s, B, c)["t"]
        now += dt
        steps += 1
        if arr[min(n - 1, int(n * warm))] <= now:
            tB += B * dt
            tT += dt
        nr, ni = [], []
        for x, rid in zip(run, runid):
            if x - 1 == 0:
                done[rid] = now
                ndone += 1
            else:
                nr.append(x - 1)
                ni.append(rid)
        run, runid = nr, ni
        k = 0
        while k < len(wid) and wleft[k] == 0:
            k += 1
        wid, wleft = wid[k:], wleft[k:]
        for rid in fin:
            first[rid] = now
            if O > 1:
                run.append(O - 1)
                runid.append(rid)
            else:
                done[rid] = now
                ndone += 1
        if steps > 400000:
            return None
    ids = range(int(n * warm), n)
    tt = sorted(first[r] - arr[r] for r in ids)
    tp = [(done[r] - first[r]) / (O - 1) for r in ids]
    q = lambda xs, p: xs[min(len(xs) - 1, int(p * len(xs)))]
    stable = backlog - 1 <= 0.05 * n
    return dict(ttft_p50=q(tt, 0.5), ttft_p99=q(tt, 0.99), ttft_mean=sum(tt) / len(tt), tpot=sum(tp) / len(tp),
                B=tB / tT if tT > 0 else 0.0, steps=steps, stable=stable)


def at_rate(o, s, lam):
    fl = fluid(o, s, lam)
    if not fl:
        return None
    sm = simulate(o, s, lam)
    if not sm or not sm["stable"]:
        return None
    return dict(fl=fl, B=sm["B"], c=fl["c"], tpot=sm["tpot"], ttft=dict(p50=sm["ttft_p50"], p99=sm["ttft_p99"], mean=sm["ttft_mean"]),
                out_tps=lam * o["O"], in_tps=lam * o["P"])


def max_rate(o, s, lam_off):
    """Largest arrival rate per replica whose simulated p99 TTFT and mean TPOT meet the targets."""
    def ok(lam):
        r = at_rate(o, s, lam)
        return bool(r) and r["ttft"]["p99"] <= o["slo_ttft"] and r["tpot"] <= o["slo_tpot"]
    lo, hi = 0.0, lam_off * 0.999
    if hi <= 0:
        return 0.0
    if ok(hi):
        return hi
    for _ in range(18):
        mid = (lo + hi) / 2
        if ok(mid):
            lo = mid
        else:
            hi = mid
    return lo


def plan(o):
    """The whole planner output for one set of inputs."""
    m = MODELS[o["model"]]
    s = setup(o)
    res = dict(setup=s, fits=s["fits"] and s["bmax"] >= 1)
    if not res["fits"]:
        return res
    one = step(o, s, 1, 0)
    res["single"] = dict(t=one["t"], tps=1 / one["t"], bound=one["bound"])
    lam_off = max_fluid(o, s)
    res["lam_off"] = lam_off
    res["off"] = fluid(o, s, lam_off * 0.999) if lam_off > 0 else None
    lam_slo = max_rate(o, s, lam_off)
    res["lam_slo"] = lam_slo
    if lam_slo <= 0:
        return res
    reps = max(1, math.ceil(o["lam"] / lam_slo - 1e-9))
    gpus = reps * s["G"]
    op = at_rate(o, s, o["lam"] / reps)
    res.update(reps=reps, gpus=gpus, op=op)
    price = o["price"]
    if price and price > 0 and op:
        cost_h = gpus * price
        lam_avg = o["lam"] * o["avg"]
        in_h, out_h = lam_avg * o["P"] * 3600, lam_avg * o["O"] * 3600
        fl = op["fl"]
        a = step(o, s, 0, fl["c"])["t"] - o["tovh"] * 1e-3
        b = step(o, s, fl["B"], 0)["t"] - o["tovh"] * 1e-3
        share_pre = a / (a + b) if a + b > 0 else 0.5
        res["cost"] = dict(cost_h=cost_h, in_h=in_h, out_h=out_h, share_pre=share_pre,
                           usd_in=cost_h * share_pre / in_h * 1e6 if in_h else None,
                           usd_out=cost_h * (1 - share_pre) / out_h * 1e6 if out_h else None,
                           usd_blend=cost_h / (in_h + out_h) * 1e6 if in_h + out_h else None)
        api = SRC["api_prices_usd_per_million"].get(m["api"])
        if api and api.get("min"):
            pin, pout = (api["min"][0], api["min"][1]) if o["api"] == "min" else (api["median"][0], api["median"][1])
            api_h = lam_avg * 3600 * (o["P"] * pin + o["O"] * pout) / 1e6
            per_req = (o["P"] * pin + o["O"] * pout) / 1e6
            res["api"] = dict(pin=pin, pout=pout, api_h=api_h, breakeven=cost_h / 3600 / per_req)
    return res


DEFAULT = dict(model="l70", chip="h200", fmt="fp8", kvb=2, tp=1, pp=1, ep=0, tb=8192, seqs=1024, util=0.92, ovh=1.5,
               P=2000, O=300, share=0.5, lam=20.0, avg=0.5, slo_ttft=2.0, slo_tpot=0.05,
               eff_c=0.345, eff_m=0.8, tovh=2.5, tseq=0.0, latx=1.0, overlap=0, price=4.47, api="min")

if __name__ == "__main__":
    r = plan(DEFAULT)
    s = r["setup"]
    print("fits", r["fits"], "w_gpu", s["w_gpu"] / 1e9, "pool", s["pool"] / 1e9, "bmax", s["bmax"])
    print("single", r["single"], "lam_off", r["lam_off"], "lam_slo", r["lam_slo"])
    print("op", r.get("op"), r.get("reps"), r.get("gpus"))
    print("cost", r.get("cost"), r.get("api"))
