"""accounting.py: parameters and FLOPs by hand, checked against the code (CPU).
1. Parameters of gpt_zero.GPT by component, from the formulas, against the module's own count, for the baseline
   and every ablation the page trains.
2. FLOPs of one forward over the running sequence by hand (2 x multiply-adds), against torch's FlopCounterMode on
   this file's explicit attention path; forward plus backward against 3x.
3. The same parameter formulas on real configs (src/data/configs), against the Hugging Face safetensors totals
   recorded in configs/manifest.json, with each residual explained; for the two cached models, against every
   tensor shape in the local safetensors header (no weights loaded).
Writes out/accounting.json (read by the Shape drill tab, whose JavaScript is checked against it).
"""
import json, os, struct, sys, glob
import torch
from torch.utils.flop_counter import FlopCounterMode

HERE = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.join(HERE, "..", "..", "..", "src", "data")
sys.path.insert(0, HERE)
import gpt_zero as gz

torch.set_num_threads(4)
OUT = {}

# ---------------------------------------------------------------- 1. parameters by hand
def by_hand(c):
    D, V, L, F_ = c.d, c.vocab, c.n_layer, c.f
    attn = 4 * D * D if c.attn else 0
    ffn = (3 if c.swiglu else 2) * D * F_ if c.ffn else 0
    norms = D * ((1 if c.attn else 0) + (1 if c.ffn else 0)) if c.norm else 0
    emb = V * D; pos = c.ctx * D if c.pos else 0; lnf = D if c.norm else 0
    return {"embedding (tied with lm_head)": emb, "positions": pos, "attention": L * attn, "ffn": L * ffn,
            "norms": L * norms + lnf, "per_block": attn + ffn + norms, "total": emb + pos + L * (attn + ffn + norms) + lnf}

variants = {"baseline": {}, "no residual": {"resid": False}, "no norm": {"norm": False}, "no position": {"pos": False},
            "one head": {"n_head": 1}, "no FFN": {"ffn": False}, "no attention": {"attn": False}, "SwiGLU": {"swiglu": True}}
OUT["params"] = {}
for name, kw in variants.items():
    c = gz.Config(**kw); h = by_hand(c); n = gz.n_params(gz.GPT(c))
    assert h["total"] == n, (name, h["total"], n)
    OUT["params"][name] = {**h, "code": n}
    print(f"{name:13s} by hand {h['total']:>10,}  code {n:>10,}")

# ---------------------------------------------------------------- 2. FLOPs by hand vs FlopCounterMode
c = gz.Config(); m = gz.GPT(c).eval()
run = json.load(open(os.path.join(DATA, "running_sequence.json")))
ids = torch.tensor([run["ids"]])
T, D, L, V, F_ = 256, c.d, c.n_layer, c.vocab, c.f
mm_params = L * (4 * D * D + 2 * D * F_) + V * D               # every weight a token is multiplied by (embedding lookup excluded)
weights = 2 * mm_params * T
attn_full = L * 2 * (2 * T * T * D)                            # q k^T and w v, all T x T pairs (the counter sees no mask)
attn_causal = L * 2 * (2 * D * T * (T + 1) // 2)              # only the pairs the mask keeps
with FlopCounterMode(display=False) as fc:
    with torch.no_grad():
        m(ids, manual=True)
fwd = fc.get_total_flops()
with FlopCounterMode(display=False) as fc2:
    _, loss, _, _ = m(ids[:, :-1], targets=ids[:, 1:], manual=True)
    loss.backward()
fb = fc2.get_total_flops()
with FlopCounterMode(display=False) as fc3:
    with torch.no_grad():
        m(ids[:, :-1], manual=True)
fwd255 = fc3.get_total_flops()
OUT["flops"] = {"T": T, "matmul_params": mm_params, "weights": weights, "attn_full": attn_full, "attn_causal": attn_causal,
                "by_hand": weights + attn_full, "counter_forward": fwd, "counter_fwd_bwd_T255": fb, "counter_forward_T255": fwd255,
                "ratio": round(fb / fwd255, 4), "per_token_2N": 2 * mm_params,
                "per_token_forward": (weights + attn_full) // T,
                "train_run": {"steps": 1500, "tokens": 1500 * 32 * 256}}
fl = OUT["flops"]
fl["train_run"]["flops"] = 3 * (2 * mm_params * 256 + L * 4 * 256 * 256 * D) * 1500 * 32   # 3 x forward FLOPs per sequence
print("forward by hand", weights + attn_full, "counter", fwd, "| fwd+bwd / fwd", fl["ratio"], "| run", f"{fl['train_run']['flops']:.3e}")
assert fwd == weights + attn_full

# ---------------------------------------------------------------- 3. real configs
man = {x["key"]: x for x in json.load(open(os.path.join(DATA, "configs", "manifest.json")))["models"]}


def real_params(k):
    j = json.load(open(os.path.join(DATA, "configs", k + ".json")))
    if j.get("model_type") == "gpt2":
        D, L, V, P = j["n_embd"], j["n_layer"], j["vocab_size"], j["n_positions"]
        H = j["n_head"]; F_ = 4 * D
        blk = {"attn": 3 * D * D + 3 * D + D * D + D, "ffn": D * F_ + F_ + F_ * D + D, "norms": 4 * D}
        parts = {"embedding": V * D, "positions": P * D, "blocks": L * sum(blk.values()), "final norm": 2 * D, "lm_head": 0}
        shape = dict(D=D, L=L, H=H, Hk=H, hd=D // H, F=F_, V=V, tied=True, glu=False, norm="LayerNorm (gain and bias)",
                     bias=True, pos="learned", qk_norm="none")
    else:
        D, L, V = j["hidden_size"], j["num_hidden_layers"], j["vocab_size"]
        H = j["num_attention_heads"]; Hk = j.get("num_key_value_heads", H); hd = j.get("head_dim") or D // H
        F_ = j["intermediate_size"]; tied = bool(j.get("tie_word_embeddings", False))
        qk = 0; qkn = "none"
        if j["model_type"] == "qwen3":
            qk = 2 * hd; qkn = "per head (hd)"
        if j["model_type"] == "olmo2":
            qk = H * hd + Hk * hd; qkn = "full width (H hd and Hk hd)"
        blk = {"attn": D * H * hd + 2 * D * Hk * hd + H * hd * D + qk, "ffn": 3 * D * F_, "norms": 2 * D}
        parts = {"embedding": V * D, "positions": 0, "blocks": L * sum(blk.values()), "final norm": D, "lm_head": 0 if tied else V * D}
        shape = dict(D=D, L=L, H=H, Hk=Hk, hd=hd, F=F_, V=V, tied=tied, glu=True, norm="RMSNorm (gain)", bias=False,
                     pos="RoPE", qk_norm=qkn)
    tot = sum(parts.values())
    return {"key": k, "config": man[k]["config_url"], "revision": man[k]["revision"], "shape": shape, "block": blk,
            "parts": parts, "total": tot, "hub": man[k]["safetensors_total"], "residual": man[k]["safetensors_total"] - tot}

why = {"gpt2": "the checkpoint stores each layer's causal-mask buffer attn.bias (1,024 x 1,024 x 12 = 12,582,912), not parameters",
       "qwen3-0.6b": "tied in the config, but the safetensors file stores lm_head.weight separately (151,936 x 1,024 = 155,582,464)",
       "llama-2-7b": "the checkpoint stores rotary inv_freq buffers (F32, 64 per layer x 32 = 2,048)"}
OUT["real"] = []
for k in ["smollm2-135m", "qwen3-0.6b", "gpt2", "llama-2-7b", "mistral-7b-v0.1", "llama-3.1-8b", "qwen3-8b", "olmo-2-7b", "llama-3.1-70b"]:
    r = real_params(k); r["why"] = why.get(k, "" if r["residual"] == 0 else "UNEXPLAINED")
    OUT["real"].append(r)
    print(f"{k:16s} formula {r['total']:>16,}  hub {r['hub']:>16,}  residual {r['residual']:>12,}  {r['why']}")
    assert r["why"] != "UNEXPLAINED", k

# local safetensors headers: every tensor shape, no weights loaded
def header(path):
    with open(path, "rb") as f:
        n = struct.unpack("<Q", f.read(8))[0]
        return json.loads(f.read(n))
hub = os.path.expanduser("~/.cache/huggingface/hub")
OUT["headers"] = {}
for k, repo, rev in [("smollm2-135m", "models--HuggingFaceTB--SmolLM2-135M", man["smollm2-135m"]["revision"]),
                     ("qwen3-0.6b", "models--Qwen--Qwen3-0.6B", man["qwen3-0.6b"]["revision"])]:
    files = glob.glob(os.path.join(hub, repo, "snapshots", rev, "*.safetensors"))
    h = {}
    for fpath in files:
        h.update({n: v["shape"] for n, v in header(fpath).items() if n != "__metadata__"})
    layer0 = {n.replace("model.layers.0.", ""): s for n, s in h.items() if n.startswith("model.layers.0.")}
    other = {n: s for n, s in h.items() if not n.startswith("model.layers.")}
    total = sum(int(torch.tensor(s).prod()) if s else 1 for s in h.values())
    OUT["headers"][k] = {"revision": rev, "layer0": layer0, "other": other, "n_tensors": len(h), "total": total}
    print(k, "header total", f"{total:,}", "tensors", len(h))
json.dump(OUT, open(os.path.join(HERE, "out", "accounting.json"), "w"), indent=1)
print("wrote out/accounting.json")
