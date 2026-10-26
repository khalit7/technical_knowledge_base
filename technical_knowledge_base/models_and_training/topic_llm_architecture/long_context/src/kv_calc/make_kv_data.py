"""Writes the data of the KV-cache calculator tab (parts/19_js_kc_0data.js, window.KCD) and its static tables
(parts/34_tab_kv_c.html), and out/recompute.json, which src/kv_calc/check_kv.mjs compares with the page's JavaScript.

Two kinds of preset:
  * 'cfg': a real config.json from the root's src/data/configs (read-only), normalised by the root's calc.py; the
    cache groups below are read off calc.py's layer list, and kv_check() proves they give calc.py's cache() byte for
    byte at 4K, 32K and 128K (so the defaults reproduce the root's Config calculator, by construction).
  * 'hand': models whose config the root calculator refuses or does not hold (DeepSeek-V4, GLM-5.x, Qwen3.5/3.8,
    Mistral Large 3 and Small 4, Kimi K3, the VLM decoders): per-layer numbers copied, with their sources, from the
    pages that computed them first (named in 'from'). Nothing is invented: when a page gave only bytes per token,
    the preset says so and the per-layer view is not offered.

Engine (same in JS): bytes per sequence at T tokens =
    keep x sum_groups n x (e x kvb x span(T, win) + idx x kvb x T)  +  stateNums x sb      (or tokB x T + fixB for
    presets whose bytes per token are fixed by a published layout, such as DeepSeek-V4's FP8/FP4 mix)
Run: python3 make_kv_data.py   (no network; a second or two)
"""
import html, json, math, os, sys
H = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.normpath(os.path.join(H, "../../../src"))
sys.path.insert(0, os.path.join(ROOT, "calc"))
import calc  # noqa: E402  (the root's reference calculator, read-only)

MAN = {m["key"]: m for m in json.load(open(os.path.join(ROOT, "data/configs/manifest.json")))["models"]}
PY = json.load(open(os.path.join(ROOT, "calc/out/py_results.json")))

# ---- presets from real configs (root calc.py) ----
CFG = [  # key, label, family
    ("llama-2-7b", "Llama 2 7B", "dense"), ("llama-3.1-8b", "Llama 3.1 8B", "dense"), ("llama-3.1-70b", "Llama 3.1 70B", "dense"),
    ("llama-3.1-405b", "Llama 3.1 405B", "dense"), ("qwen3-8b", "Qwen3 8B", "dense"), ("qwen3-32b", "Qwen3 32B", "dense"),
    ("qwen3-30b-a3b", "Qwen3-30B-A3B", "dense"), ("qwen3-235b-a22b", "Qwen3-235B-A22B", "dense"), ("mixtral-8x7b", "Mixtral 8x7B", "dense"),
    ("glm-4.5", "GLM-4.5", "dense"), ("smollm2-135m", "SmolLM2-135M", "dense"),
    ("mistral-7b-v0.1", "Mistral 7B v0.1", "window"), ("gemma-2-9b", "Gemma 2 9B", "window"), ("gemma-3-1b", "Gemma 3 1B", "window"),
    ("gemma-3-27b", "Gemma 3 27B", "window"), ("gpt-oss-120b", "gpt-oss-120b", "window"), ("llama-4-maverick", "Llama 4 Maverick", "window"),
    ("deepseek-v2", "DeepSeek-V2", "latent"), ("deepseek-v3", "DeepSeek-V3", "latent"), ("deepseek-v3.2", "DeepSeek-V3.2", "latent"),
    ("kimi-k2", "Kimi K2", "latent"),
    ("nemotron-h-8b", "Nemotron-H 8B", "hybrid"), ("qwen3-next-80b-a3b", "Qwen3-Next-80B-A3B", "hybrid"),
]
FAM = {"dense": "Every layer global (MHA or GQA)", "window": "Sliding-window layers", "latent": "Latent cache (MLA), sparse and compressed",
       "hybrid": "Hybrids with a fixed recurrent state", "vlm": "Vision-language decoders"}


def groups_of(spec):
    g = {}
    for lay in spec["layers"]:
        for key in ("mix", "mix2"):
            m = lay.get(key)
            if not m: continue
            if m["t"] == "attn": k = (2 * m["nkv"] * m["hd"], m["win"] or 0, 0, 0)
            elif m["t"] == "mla": k = (m["kvl"] + m["rope"], 0, m["ihd"] or 0, m["itop"] or 0)
            else: continue
            g[k] = g.get(k, 0) + 1
    return [{"n": n, "e": k[0], "win": k[1], "idx": k[2], "topk": k[3]} for k, n in sorted(g.items(), key=lambda x: -x[1])]


def shape_of(spec):
    for lay in spec["layers"]:
        m = lay.get("mix")
        if m and m["t"] == "attn": return {"L": len(spec["layers"]), "nq": m["nh"], "nkv": m["nkv"], "hd": m["hd"]}
        if m and m["t"] == "mla": return {"L": len(spec["layers"]), "nq": m["nh"], "nkv": m["nh"], "hd": m["v"]}
    return None


presets = []
for key, label, fam in CFG:
    mm = MAN[key]
    raw = json.load(open(os.path.join(ROOT, "data/configs", mm["file"])))
    spec = calc.normalise(raw)
    st = calc.cache(spec, 1, 2, 4)["state"] // 4  # numbers of fixed state (calc.py counts them in fp32)
    p = {"key": key, "label": label, "fam": fam, "kind": "cfg", "groups": groups_of(spec), "stateNums": st, "shape": shape_of(spec),
         "params": calc.params(spec)["total"], "paramsNote": "config, all experts", "maxCtx": (raw.get("text_config") or raw).get("max_position_embeddings") or (raw.get("text_config") or raw).get("max_seq_len"),
         "src": mm["config_url"], "rev": mm["revision"][:10], "from": "root Config calculator (src/data/configs, " + mm["fetched"] + ")"}
    p["ref"] = {c: PY[key]["cache"][c]["total"] for c in ("4096", "32768", "131072")}
    presets.append(p)

# ---- presets copied from other pages (sources as those pages give them) ----
def hand(**k):
    k.setdefault("kind", "hand"); k.setdefault("stateNums", 0); k.setdefault("shape", None); k.setdefault("params", None)
    k.setdefault("paramsNote", ""); k.setdefault("maxCtx", None); k.setdefault("rev", "main"); presets.append(k)

QW = "https://huggingface.co/Qwen/{}/blob/main/config.json"
hand(key="deepseek-llm-67b", label="DeepSeek LLM 67B", fam="dense", groups=[{"n": 95, "e": 2048, "win": 0, "idx": 0, "topk": 0}],
     params=67e9, paramsNote="name", src="https://huggingface.co/deepseek-ai/deepseek-llm-67b-base/blob/main/config.json",
     shape={"L": 95, "nq": 64, "nkv": 8, "hd": 128}, **{"from": "DeepSeek page, Cache across generations (2 x 8 KV heads x 128 x 95 layers)"})
hand(key="devstral-2", label="Mistral Medium 3.5 / Devstral 2", fam="dense", groups=[{"n": 88, "e": 2048, "win": 0, "idx": 0, "topk": 0}],
     shape={"L": 88, "nq": 96, "nkv": 8, "hd": 128}, maxCtx=262144, src="https://huggingface.co/mistralai",
     **{"from": "Mistral AI page, Weights and cache (GQA 96/8, 88 layers, config.json)"})
hand(key="mixtral-8x22b", label="Mixtral 8x22B", fam="dense", groups=[{"n": 56, "e": 2048, "win": 0, "idx": 0, "topk": 0}],
     shape={"L": 56, "nq": 48, "nkv": 8, "hd": 128}, maxCtx=65536, src="https://huggingface.co/mistralai/Mixtral-8x22B-v0.1/blob/main/config.json",
     **{"from": "Mistral AI page, Weights and cache (GQA 48/8; 229,376 bytes per token)"})
for nm, b in (("Ministral 3 3B", 106496), ("Ministral 3 8B", 139264), ("Ministral 3 14B", 163840)):
    hand(key=nm.lower().replace(" ", "-"), label=nm, fam="dense", tokOnly=True, groups=[{"n": 1, "e": b // 2, "win": 0, "idx": 0, "topk": 0}],
         maxCtx=262144, src="https://huggingface.co/mistralai", **{"from": "Mistral AI page, Weights and cache (bytes per token only)"})
hand(key="mistral-small-4", label="Mistral Small 4", fam="latent", groups=[{"n": 36, "e": 320, "win": 0, "idx": 0, "topk": 0}],
     params=119e9, paramsNote="name", maxCtx=262144, src="https://huggingface.co/mistralai/Mistral-Small-4-119B-2603/blob/main/params.json",
     **{"from": "Mistral AI page (MLA, latent 256 + 64; 23,040 bytes per token)"})
hand(key="mistral-large-3", label="Mistral Large 3", fam="latent", groups=[{"n": 61, "e": 576, "win": 0, "idx": 0, "topk": 0}],
     params=675e9, paramsNote="name", maxCtx=262144, src="https://huggingface.co/mistralai/Mistral-Large-3-675B-Instruct-2512/blob/main/params.json",
     **{"from": "Mistral AI page (MLA, latent 512 + 64; 70,272 bytes per token)"})
hand(key="glm-5", label="GLM-5 / 5.1", fam="latent", groups=[{"n": 78, "e": 576, "win": 0, "idx": 128, "topk": 2048}], maxCtx=202752,
     src="https://huggingface.co/zai-org/GLM-5/blob/main/config.json", **{"from": "Zhipu GLM page, Long-context cost (78 x 576 + 78 x 128 numbers)"})
hand(key="glm-5.3", label="GLM-5.2 / 5.3", fam="latent", groups=[{"n": 21, "e": 576, "win": 0, "idx": 128, "topk": 2048}, {"n": 57, "e": 576, "win": 0, "idx": 0, "topk": 2048}],
     maxCtx=1048576, src="https://huggingface.co/zai-org/GLM-5.3/blob/main/config.json", **{"from": "Zhipu GLM page (IndexShare: 78 x 576 + 21 x 128 numbers)"})
hand(key="glm-5.3-flash", label="GLM-5.3-Flash", fam="hybrid", groups=[{"n": 11, "e": 544, "win": 0, "idx": 0, "topk": 2048}],
     stateNums=34 * 64 * 128 * 128, maxCtx=1048576, src="https://huggingface.co/zai-org/GLM-5.3-Flash/blob/main/config.json",
     **{"from": "Zhipu GLM page (11 sparse layers x (512 + 128/4 IndexPool); 34 KDA layers of 64 x 128 x 128)"})
for nm, rp, lf, kv, ll, hv, par, mc in (("Qwen3.5-397B-A17B", "Qwen3.5-397B-A17B", 15, 2, 45, 64, 397e9, 262144),
                                        ("Qwen3.8-27B", "Qwen3.8-27B", 16, 4, 48, 48, 27e9, 262144),
                                        ("Qwen3.8-2.4T-A95B", "Qwen3.8-2.4T-A95B", 23, 4, 69, 128, 2.4e12, 262144),
                                        ("Qwen3.8-Flash-Next", "Qwen3.8-Flash-Next", 12, 2, 36, 48, None, 262144)):
    hand(key=nm.lower(), label=nm, fam="hybrid", groups=[{"n": lf, "e": 2 * kv * 256, "win": 0, "idx": 0, "topk": 0}], stateNums=ll * hv * 128 * 128,
         params=par, paramsNote="name" if par else "", maxCtx=mc, src=QW.format(rp),
         **{"from": "Qwen page, Configs and cache (" + str(lf) + " full layers x 2 x " + str(kv) + " x 256; " + str(ll) + " DeltaNet layers x " + str(hv) + " x 128 x 128)"})
hand(key="kimi-k3", label="Kimi K3", fam="hybrid", groups=[{"n": 24, "e": 576, "win": 0, "idx": 0, "topk": 0}], stateNums=round(414 * 2**20 / 4),
     src="https://huggingface.co/moonshotai", **{"from": "LLM architecture gallery (24 x (512 + 64) MLA layers; KDA state about 414 MiB in FP32, rounded)"})
MM = "https://huggingface.co/MiniMaxAI/{}/blob/main/config.json"
hand(key="minimax-text-01", label="MiniMax-Text-01", fam="hybrid", groups=[{"n": 10, "e": 2048, "win": 0, "idx": 0, "topk": 0}], stateNums=70 * 64 * 128 * 128,
     params=456089655296, paramsNote="Hugging Face safetensors total", maxCtx=10240000, src=MM.format("MiniMax-Text-01"), rev="a7351bf2be",
     **{"from": "MiniMax page and config.json (attn_type_list: 10 softmax layers of 80, GQA 64/8 x 128, 40 KiB per token; 70 lightning layers x 64 heads x 128 x 128 state, 140 MiB in BF16)"})
hand(key="minimax-m2", label="MiniMax-M2", fam="dense", groups=[{"n": 62, "e": 2048, "win": 0, "idx": 0, "topk": 0}], shape={"L": 62, "nq": 48, "nkv": 8, "hd": 128},
     params=228689764864, paramsNote="Hugging Face safetensors total", maxCtx=196608, src=MM.format("MiniMax-M2"), rev="757303d492",
     **{"from": "MiniMax page and config.json (62 full-attention layers, GQA 48/8 x 128: 248 KiB per token)"})
hand(key="minimax-m3", label="MiniMax-M3", fam="latent", groups=[{"n": 57, "e": 1024, "win": 0, "idx": 128, "topk": 2048}, {"n": 3, "e": 1024, "win": 0, "idx": 0, "topk": 0}],
     params=427040140160, paramsNote="Hugging Face safetensors total", maxCtx=1048576, src=MM.format("MiniMax-M3"), rev="f0e1c1e04d",
     **{"from": "MiniMax page and config.json (60 layers, GQA 64/4 x 128: 120 KiB per token; 57 MSA layers (sparse_attention_freq) with one 128-number index key per token, BF16 assumed: 14.25 KiB; top 16 blocks of 128)"})
hand(key="deepseek-v4-pro", label="DeepSeek-V4-Pro", fam="latent", tokB=4939.5, fixB=128 * 576 * 61, groups=[],
     src="https://arxiv.org/abs/2606.19348", **{"from": "DeepSeek page (30 CSA x 160 B + 31 HCA x 4.5 B per token; FP8 entries, FP4 indexer; 128-token windows of 576 B in 61 layers)"})
hand(key="deepseek-v4-flash", label="DeepSeek-V4-Flash", fam="latent", tokB=3450, fixB=128 * 576 * 43, groups=[], pubTokB=3514,
     src="https://huggingface.co/deepseek-ai", **{"from": "DeepSeek page (21 CSA x 160 + 20 HCA x 4.5 B per token, estimate; DeepSeek's chart gives 3,514)"})
hand(key="deepseek-v4.1-flash", label="DeepSeek-V4.1-Flash", fam="latent", tokB=890, fixB=0, groups=[],
     src="https://huggingface.co/deepseek-ai", **{"from": "DeepSeek page (890 bytes per token, reported on the model card)"})
hand(key="smolvlm-500m", label="SmolVLM-500M", fam="vlm", groups=[{"n": 32, "e": 640, "win": 0, "idx": 0, "topk": 0}], maxCtx=8192,
     src="https://huggingface.co/HuggingFaceTB/SmolVLM-500M-Instruct", **{"from": "Vision-language models page (2 x 32 x 5 x 64 x 2 = 40,960 bytes; measured slope equal)"})
hand(key="qwen3.5-0.8b", label="Qwen3.5-0.8B", fam="vlm", groups=[{"n": 6, "e": 1024, "win": 0, "idx": 0, "topk": 0}], stateNums=19759104 // 4,
     maxCtx=262144, src="https://huggingface.co/Qwen/Qwen3.5-0.8B", **{"from": "Vision-language models page (6 attention layers of 24; 19,759,104-byte FP32 state, measured)"})
hand(key="llava-1.5-7b", label="LLaVA-1.5-7B", fam="vlm", groups=[{"n": 32, "e": 8192, "win": 0, "idx": 0, "topk": 0}], maxCtx=4096,
     shape={"L": 32, "nq": 32, "nkv": 32, "hd": 128}, src="https://huggingface.co/llava-hf/llava-1.5-7b-hf", **{"from": "Vision-language models page (2 x 32 x 32 x 128 x 2 = 524,288 bytes)"})

# ---- the engine (mirrored in parts/19_js_kc_1core.js) ----
def span(T, w): return min(T, w) if w else T


def seq_bytes(p, T, kvb=2, sb=4, keep=1.0):
    if "tokB" in p: return p["tokB"] * T + p["fixB"]
    kv = sum(g["n"] * (g["e"] * kvb * span(T, g["win"]) + g["idx"] * kvb * T) for g in p["groups"])
    return kv * keep + p["stateNums"] * sb


def kv_check(p):
    for c, ref in p["ref"].items():
        got = seq_bytes(p, int(c))
        assert got == ref, (p["key"], c, got, ref)

for p in presets:
    if p["kind"] == "cfg": kv_check(p)

GIB, KIB = 2**30, 1024
def fm(x, d=2): return f"{x:,.{d}f}"
def by(p, T): return seq_bytes(p, T)

P = {p["key"]: p for p in presets}
checks = []
def chk(what, computed, published, how, src, verdict):
    checks.append({"what": what, "computed": computed, "published": published, "how": how, "src": src, "verdict": verdict})

l8 = P["llama-3.1-8b"]; l70 = P["llama-3.1-70b"]
chk("Llama 3.1 8B, one 131,072-token sequence, bf16", fm(by(l8, 131072) / GIB) + " GiB (" + fm(by(l8, 131072) / 1e9) + " GB)",
    "16 GiB (root Attention lab; Memory technology: 17.18 GB)", "2 x 32 x 8 x 128 x 2 = 131,072 B per token", "root calc.py", "by construction")
chk("Llama 3.1 70B, one 131,072-token sequence, bf16", fm(by(l70, 131072) / GIB) + " GiB", "40 GiB (root section 3)", "2 x 80 x 8 x 128 x 2 = 327,680 B per token", "root calc.py", "by construction")
m7 = P["mistral-7b-v0.1"]
chk("Mistral 7B: cache at 32,768 tokens, window against none", fm(seq_bytes({**m7, "groups": [{**g, "win": 0} for g in m7["groups"]]}, 32768) / by(m7, 32768), 1) + "x smaller",
    '"reduces the cache memory usage by 8x" (Mistral 7B paper)', "32,768 / 4,096 = 8", "https://arxiv.org/abs/2310.06825", "independently")
v2 = P["deepseek-v2"]; d67 = P["deepseek-llm-67b"]
r16 = 1 - by(v2, 1) / by(d67, 1); r6 = 1 - by(v2, 1) * 6 / 16 / by(d67, 1)
chk("DeepSeek-V2 against DeepSeek LLM 67B, cache per token", fm(100 * r16, 1) + "% smaller in bf16; " + fm(100 * r6, 1) + "% with the cache at about 6 bits",
    '"reduces the KV cache by 93.3%" (DeepSeek-V2 paper)', "69,120 against 389,120 B per token; V2 further quantised its cache to about 6 bits per element",
    "https://arxiv.org/abs/2405.04434", "reproduces only with the 6-bit cache")
v3 = P["deepseek-v3"]
chk("MLA per layer against MHA at DeepSeek-V3's shape", fm(2 * 128 * 128 / 576, 1) + " times fewer numbers; " + fm(576 / 256, 2) + " GQA groups",
    '"about 57 times fewer", "GQA with only 2.25 groups" (V2 paper, via the DeepSeek page)', "32,768 / 576; 576 / (2 x 128)", "https://arxiv.org/abs/2405.04434", "independently")
v4p = P["deepseek-v4-pro"]; v4f = P["deepseek-v4-flash"]; v41 = P["deepseek-v4.1-flash"]
gqa8 = {"tokB": 249856, "fixB": 0}
chk("DeepSeek-V4-Pro against a GQA-8 cache at V3's shape, 1,000,000 tokens", fm(100 * seq_bytes(v4p, 10**6) / seq_bytes(gqa8, 10**6), 2) + "%",
    '"about 2%" (DeepSeek V4 report)', "(4,939.5 x 10^6 + 4.5 MB of windows) / (249,856 x 10^6); rests on an FP4 indexer (FP8 gives 2.17%)",
    "https://arxiv.org/abs/2606.19348", "independently, with an assumed indexer precision")
v32fp8 = {"tokB": 48068, "fixB": 0}
chk("DeepSeek-V4-Pro and V4-Flash against V3.2's FP8 cache at 1,000,000 tokens", fm(100 * seq_bytes(v4p, 10**6) / seq_bytes(v32fp8, 10**6), 1) + "% and " + fm(100 * 3514 / 48068, 1) + "%",
    '"10% of the KV cache" (V4-Pro) and 7% (V4-Flash) (DeepSeek V4 report)', "V3.2 decodes from an FP8 cache of 48,068 B per token (FlashMLA, as the DeepSeek page reports); V4-Flash at the reported 3,514 B",
    "https://arxiv.org/abs/2606.19348", "consistent, approximately (our reconciliation)")
chk("DeepSeek LLM 67B against V4.1-Flash, cache per token", fm(by(d67, 1) / 890, 1) + "-fold", '"437-fold" (V4.1-Flash model card)', "389,120 / 890",
    "https://huggingface.co/deepseek-ai", "by construction (890 is the card's own figure)")
chk("V4-Flash per token", "3,450 B (estimate from the config's 21 CSA and 20 HCA layers)", "3,514 B (DeepSeek's chart)", "21 x 160 + 20 x 4.5", "DeepSeek page", "1.9% below the published figure")
g53 = P["glm-5.3"]; gfl = P["glm-5.3-flash"]
pl53 = (78 * 576 + 21 * 128) / 78; plfl = 11 * (512 + 32) / 45
chk("GLM-5.3-Flash against GLM-5.3, average cache per layer", fm(pl53 / plfl, 2) + "x (" + fm(pl53, 0) + " against " + fm(plfl, 0) + " numbers)",
    '"4.44 times smaller KV cache" per layer, BF16 (Z.ai docs)', "(78 x 576 + 21 x 128) / 78 against 11 x (512 + 128/4) / 45; whole model 47,616 / 5,984 = " + fm(47616 / 5984, 1) + "x",
    "https://docs.z.ai/guides/vlm/glm-5.3-flash", "about 3% above the published figure; no published detail explains the gap")
qn = P["qwen3-next-80b-a3b"]
chk("Qwen3-Next: DeltaNet state against the cache it replaces", fm(36 * 32 * 128 * 128 / (36 * 2 * 2 * 256), 0) + " tokens",
    "512 tokens (Qwen page)", "36 x 32 x 128 x 128 numbers / (36 x 2 x 2 x 256) per token", "Qwen page", "independently")
g27 = P["gemma-3-27b"]
glob = {**g27, "groups": [{**g, "win": 0} for g in g27["groups"]]}
W27 = g27["params"] * 2
chk("Gemma 3 27B, cache over bf16 weights at 32,768 tokens", "every layer global " + fm(100 * by(glob, 32768) / W27, 0) + "%; 5 local : 1 global " + fm(100 * by(g27, 32768) / W27, 1) + "%",
    '"a memory overhead of 60%" falling to "less than 15%" at 32K (Gemma 3 report, section 5.2)', "cache / (params x 2 bytes); the report's model size and precision for that figure are not given beside it",
    "https://arxiv.org/html/2503.19786", "does not reproduce at 27B in bf16; same direction (about 5x less)")

# ---- Reading-tab visual data ----
spec8 = calc.normalise(json.load(open(os.path.join(ROOT, "data/configs/llama-3.1-8b.json"))))
fl = []
for e in [x / 4 for x in range(40, 81)]:
    T = int(round(2**e)); f = calc.flops(spec8, T)
    fl.append([T, round(f["decode_attn"] / f["decode"], 4), round(f["prefill_attn"] / f["prefill"], 4)])
kc = json.load(open(os.path.join(H, "../kv/out/key_channels.json")))
vis = {"flops8b": fl, "kchan": [[r["k_ratio"], r["v_ratio"]] for r in kc["rows"]], "kmed": kc["k_median_ratio"], "vmed": kc["v_median_ratio"]}

GPUS = [["H100 SXM", 80, 3.35], ["H200", 141, 4.8], ["B200 (HGX)", 180, 8.0], ["B300", 288, 8.0], ["MI300X", 192, 5.3], ["MI355X", 288, 8.0],
        ["TPU7x (Ironwood)", 206.2, 7.38], ["RTX 5090", 32, 1.792], ["Apple M1 Pro", 16, 0.2]]
out = {"date": "2026-10-23", "fams": FAM, "presets": presets, "gpus": GPUS, "vis": vis}
s = "// written by src/kv_calc/make_kv_data.py (root configs via calc.py, plus presets copied from the pages named in each 'from'); do not edit by hand\nwindow.KCD=" + json.dumps(out, separators=(",", ":")) + ";\n"
open(os.path.join(H, "../parts/19_js_kc_0data.js"), "w").write(s)

# ---- static tables (visible text: the ledger's keys for absorbed units live here) ----
def a(t, u): return "{{" + t + "|" + u + "}}" if u.startswith("http") else html.escape(t)
rows = []
for c in checks:
    rows.append("<tr><td>" + html.escape(c["what"]) + "</td><td class=\"num\">" + html.escape(c["computed"]) + "</td><td>" + html.escape(c["published"]) +
                "</td><td>" + html.escape(c["how"]) + "</td><td>" + html.escape(c["verdict"]) + "</td></tr>")
T = 131072
prow = []
for p in sorted(presets, key=lambda p: (list(FAM).index(p["fam"]), p["label"])):
    tok = (p["tokB"] if "tokB" in p else sum(g["n"] * (g["e"] + g["idx"]) * 2 for g in p["groups"]))
    st = p["stateNums"] * 4
    prow.append("<tr><td>" + html.escape(p["label"]) + "</td><td class=\"num\">" + fm(tok / KIB, 1) + " KiB</td><td class=\"num\">" + fm(by(p, T) / GIB, 2) +
                " GiB</td><td class=\"num\">" + (fm(st / 2**20, 0) + " MiB" if st else "") + "</td><td class=\"small\">" + html.escape(p["from"]) + " " + a("source", p["src"]) + "</td></tr>")
tab = ("<details class=\"kc-more\"><summary>Published figures these defaults reproduce, and how (" + str(len(checks)) + " checks)</summary>\n"
       "<div class=\"tw\"><table class=\"small kc-chk\"><thead><tr><th>Figure</th><th>Computed here</th><th>Published</th><th>Arithmetic</th><th>Verdict</th></tr></thead><tbody>\n"
       + "\n".join(rows) + "\n</tbody></table></div></details>\n"
       "<details class=\"kc-more\"><summary>Every preset at 131,072 tokens, with its source (" + str(len(presets)) + " models)</summary>\n"
       "<p class=\"small\">Per token: bf16, every cache-growing layer at full cost (windows not credited; DSA indexer keys counted; DeepSeek-V4 in its published FP8/FP4 layout). "
       "At 131,072 tokens: windows credited, recurrent state included in FP32. Root-config presets equal the root's calc.py byte for byte at 4K, 32K and 128K (by construction).</p>\n"
       "<div class=\"tw\"><table class=\"small\"><thead><tr><th>Model</th><th>Per token</th><th>One sequence at 131,072</th><th>Fixed state (FP32)</th><th>Where the numbers come from</th></tr></thead><tbody>\n"
       + "\n".join(prow) + "\n</tbody></table></div></details>\n")
open(os.path.join(H, "../parts/34_tab_kv_c.html"), "w").write(tab + "</section>\n</div>\n")
json.dump({"presets": {p["key"]: {str(t): seq_bytes(p, t) for t in (1024, 4096, 32768, 131072, 1048576)} for p in presets}, "checks": checks},
          open(os.path.join(H, "out/recompute.json"), "w"), indent=1)
print(len(s), "bytes;", len(presets), "presets;", len(checks), "checks")
for c in checks: print(" ", c["what"], "|", c["computed"], "|", c["verdict"])
