"""Named presets of the tiny GPT. Each is the baseline with a few switches changed, so any two presets differ
only where their names say. Use: from configs import get; cfg = get("gqa2", n_layer=8)."""
from tiny_gpt import GPTConfig

BASELINE = dict()  # GPTConfig() defaults: MHA, LayerNorm pre-norm, learned positions, GELU 4x FFN, tied, 6 x 256, ctx 256

PRESETS = {
    "baseline": dict(),                                   # GPT-2 style
    # attention: what each token caches
    "gqa2": dict(attn="gqa", n_kv_head=2),                # 8 query heads share 2 KV heads (4x smaller cache)
    "gqa4": dict(attn="gqa", n_kv_head=4),
    "mqa": dict(attn="mqa"),                              # 1 KV head (8x smaller cache)
    "mla": dict(attn="mla", pos="rope", mla_kv_latent=64, mla_rope_dim=16),  # caches 64 + 16 numbers per token per layer
    "swa64": dict(window=64),                             # every layer sliding window 64
    "swa64_g3": dict(window=64, global_every=3),          # local:global 2:1 (layers 3 and 6 global)
    "sink": dict(attn_sink=True),                         # learned per-head sink logit
    # normalisation
    "postnorm": dict(norm_pos="post"),
    "rmsnorm": dict(norm="rmsnorm"),
    "sandwich": dict(norm="rmsnorm", norm_pos="sandwich"),
    "qknorm": dict(norm="rmsnorm", pos="rope", qk_norm=True),
    # position
    "sinusoidal": dict(pos="sinusoidal"),
    "rope": dict(pos="rope"),
    "alibi": dict(pos="alibi"),
    "nope": dict(pos="nope"),
    # feed-forward
    "swiglu": dict(ffn="swiglu"),                         # hidden 704 (8/3 x 256 rounded up to 32): about 2% more params than 4x GELU
    "moe8top2": dict(n_experts=8, top_k=2),               # 8 experts of hidden 512, 2 active: active FFN = dense FFN
    "moe8top2_bias": dict(n_experts=8, top_k=2, balance="bias", router="sigmoid"),
    "moe8top2_cap1": dict(n_experts=8, top_k=2, capacity_factor=1.0),
    # fine-grained (DeepSeekMoE): each 512 expert split in two, 3 routed + 1 shared active; same active FFN as moe8top2, total 6% larger (the shared expert)
    "moe16top3_shared": dict(n_experts=16, top_k=3, n_shared=1, moe_hidden=256),
    # sequence mixer
    "ssm": dict(layer_types="ssssss", pos="nope"),        # attention-free (Mamba-2 style mixer)
    "hybrid": dict(layer_types="ssasss", pos="nope"),     # 1 attention layer in 6 (Jamba / Nemotron-H flavour)
    "hybrid2": dict(layer_types="ssassa", pos="nope"),
    # the modern recipe in one preset (Llama / Qwen3 style)
    "modern": dict(attn="gqa", n_kv_head=2, norm="rmsnorm", pos="rope", ffn="swiglu", qk_norm=True),
}


def get(name="baseline", **overrides):
    if name not in PRESETS:
        raise KeyError(f"unknown preset {name}; choose from {sorted(PRESETS)}")
    return GPTConfig(**{**BASELINE, **PRESETS[name], **overrides})
