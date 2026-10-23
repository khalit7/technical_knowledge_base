"""KV cache against recurrent state for real configs: the Python reference for the "State vs KV cache" tab.

Uses the root Config calculator's calc.py (src/calc/calc.py, window.CC in the page) unchanged for every model type it
knows, and adds two it does not: kimi_linear (Kimi Delta Attention layers plus MLA layers) and qwen3_5 /
qwen3_5_moe_text (Gated DeltaNet plus gated attention, the Qwen3-Next layout). The page's JavaScript extension
(parts/33_js_mm_1core.js) ports the two additions; check_data.py compares JS and Python.

Conventions (the Config calculator's): KV cache in bf16 (2 bytes), recurrent state in fp32 (4 bytes; Qwen3.5's config
sets "mamba_ssm_dtype": "float32"), one sequence, windows credited. State = SSM or delta-rule matrix plus the short
convolution's last (kernel - 1) inputs.

Run: python3 src/mem/statecalc.py   -> out/statecalc.json
"""
import json, os, sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.normpath(os.path.join(HERE, "..", "..", "..", "src"))
sys.path.insert(0, os.path.join(ROOT, "calc")); sys.path.insert(0, os.path.join(ROOT, "data"))
import calc  # noqa: E402

CFG = os.path.join(ROOT, "data", "configs"); MAP = os.path.join(ROOT, "map", "inputs", "configs")
MODELS = [  # key, label, group, file
    ("llama-3.1-8b", "Llama 3.1 8B", "attention", f"{CFG}/llama-3.1-8b.json"),
    ("llama-3.1-70b", "Llama 3.1 70B", "attention", f"{CFG}/llama-3.1-70b.json"),
    ("gpt-oss-120b", "gpt-oss-120b", "attention", f"{CFG}/gpt-oss-120b.json"),
    ("deepseek-v3", "DeepSeek-V3", "attention", f"{CFG}/deepseek-v3.json"),
    ("mamba-2.8b", "Mamba 2.8B", "recurrent only", f"{CFG}/mamba-2.8b.json"),
    ("mamba2-2.7b", "Mamba-2 2.7B", "recurrent only", f"{CFG}/mamba2-2.7b.json"),
    ("jamba-v0.1", "Jamba v0.1", "hybrid", f"{CFG}/jamba-v0.1.json"),
    ("nemotron-h-8b", "Nemotron-H 8B", "hybrid", f"{CFG}/nemotron-h-8b.json"),
    ("granite-4.0-h-small", "Granite 4.0-H Small", "hybrid", f"{CFG}/granite-4.0-h-small.json"),
    ("falcon-h1-34b", "Falcon-H1 34B", "hybrid", f"{MAP}/tiiuae__Falcon-H1-34B-Base.json"),
    ("qwen3-next-80b-a3b", "Qwen3-Next 80B-A3B", "hybrid", f"{CFG}/qwen3-next-80b-a3b.json"),
    ("qwen3.5-397b-a17b", "Qwen3.5 397B-A17B", "hybrid", f"{MAP}/Qwen__Qwen3.5-397B-A17B.json"),
    ("kimi-linear-48b", "Kimi Linear 48B-A3B", "hybrid", f"{MAP}/moonshotai__Kimi-Linear-48B-A3B-Base.json"),
    ("kimi-k3", "Kimi K3", "hybrid", f"{MAP}/moonshotai__Kimi-K3.json"),
    ("nemotron-3-super", "Nemotron 3 Super 120B-A12B", "hybrid", f"{MAP}/nvidia__NVIDIA-Nemotron-3-Super-120B-A12B-BF16.json"),
]
CTXS = [1024, 8192, 32768, 131072, 262144, 1048576]


def cache_ext(cfg, ctx, kv_bytes=2, state_bytes=4):
    """KV and state for the model types calc.py does not normalise; None if calc.py handles the type."""
    c = cfg.get("text_config", cfg); mt = c.get("model_type", "")
    if mt == "kimi_linear":
        la = c["linear_attn_config"]; L = c["num_hidden_layers"]
        n_full = len([i for i in la["full_attn_layers"] if i <= L]); n_kda = L - n_full
        h, d, k = la["num_heads"], la["head_dim"], la["short_conv_kernel_size"]
        st = n_kda * (h * d * d + 3 * h * d * (k - 1)) * state_bytes          # q, k, v short convs
        kv = n_full * (c["kv_lora_rank"] + c["qk_rope_head_dim"]) * ctx * kv_bytes
        return {"kv": kv, "state": st, "total": kv + st, "mixers": {"kda": n_kda, "mla": n_full}}
    if mt in ("qwen3_5_text", "qwen3_5_moe_text"):
        lt = c["layer_types"]; nf = lt.count("full_attention"); nl = lt.count("linear_attention")
        nk, nv, dk, dv, k = (c["linear_num_key_heads"], c["linear_num_value_heads"], c["linear_key_head_dim"],
                             c["linear_value_head_dim"], c["linear_conv_kernel_dim"])
        st = nl * (nv * dk * dv + (2 * nk * dk + nv * dv) * (k - 1)) * state_bytes
        kv = nf * 2 * c["num_key_value_heads"] * c["head_dim"] * ctx * kv_bytes
        return {"kv": kv, "state": st, "total": kv + st, "mixers": {"gdn": nl, "attn": nf}}
    if mt == "nemotron_h" and "E" in (c.get("hybrid_override_pattern") or ""):
        # Nemotron 3's latent MoE layers: calc.py refuses these configs since 2026-10-19 (parameter counts); cache and
        # state need only the Mamba-2 ('M') and attention ('*') layers.
        pat = c["hybrid_override_pattern"]; nm, na = pat.count("M"), pat.count("*")
        di = c["mamba_num_heads"] * c["mamba_head_dim"]; ds, ng, k = c["ssm_state_size"], c["n_groups"], c["conv_kernel"]
        st = nm * (di * ds + (di + 2 * ng * ds) * (k - 1)) * state_bytes
        hd = c.get("head_dim") or c["hidden_size"] // c["num_attention_heads"]
        kv = na * 2 * c["num_key_value_heads"] * hd * ctx * kv_bytes
        return {"kv": kv, "state": st, "total": kv + st, "mixers": {"mamba2": nm, "attn": na}}
    return None


def one(cfg, ctx):
    e = cache_ext(cfg, ctx)
    if e: return e
    s = calc.normalise(cfg); r = calc.cache(s, ctx)
    kinds = {}
    for lay in s["layers"]:
        for key in ("mix", "mix2"):
            m = lay.get(key)
            if m is not None:
                kk = m["t"] + ("_win" if m["t"] == "attn" and m.get("win") else "")
                kinds[kk] = kinds.get(kk, 0) + 1
    return {"kv": r["kv"], "state": r["state"], "total": r["total"], "mixers": kinds}


def tiny():
    from tiny_gpt import GPTConfig, kv_cache_bytes_per_token, ssm_state_bytes
    from configs import get
    out = []
    for p in ("baseline", "ssm", "hybrid", "hybrid2"):
        c = get(p)
        out.append({"preset": p, "layer_types": c.layer_types, "kv_per_token_bf16": kv_cache_bytes_per_token(c, 2, 256),
                    "state_fp32": ssm_state_bytes(c, 4), "state_bf16": ssm_state_bytes(c, 2)})
    return out


def main():
    res = {"date": "2026-10-19", "kv_bytes": 2, "state_bytes": 4, "ctxs": CTXS, "models": [], "tiny": tiny()}
    for key, label, group, f in MODELS:
        cfg = json.load(open(f))
        rows = {str(n): one(cfg, n) for n in CTXS}
        r1 = one(cfg, 1)
        state, kv1 = r1["state"], r1["kv"]
        # context at which the KV cache reaches the size of the state (windows credited, so solve numerically)
        cross = None
        if state and kv1:
            lo, hi = 1, 1 << 24
            if one(cfg, hi)["kv"] >= state:
                while lo < hi:
                    mid = (lo + hi) // 2
                    if one(cfg, mid)["kv"] >= state: hi = mid
                    else: lo = mid + 1
                cross = lo
        res["models"].append({"key": key, "label": label, "group": group, "file": os.path.basename(f),
                              "mixers": r1["mixers"], "kv_per_token": kv1, "state": state,
                              "kv_equals_state_at": cross, "at": rows})
        print(f"{label:28s} kv/token {kv1:>9,} B  state {state/2**20:8.2f} MiB  cross {cross}  mixers {r1['mixers']}")
    os.makedirs(os.path.join(HERE, "out"), exist_ok=True)
    json.dump(res, open(os.path.join(HERE, "out", "statecalc.json"), "w"), indent=1)
    for t in res["tiny"]: print(t)


if __name__ == "__main__":
    main()
