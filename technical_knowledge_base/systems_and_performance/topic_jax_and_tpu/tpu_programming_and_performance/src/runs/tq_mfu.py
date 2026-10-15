"""MFU from published numbers (calculated; no TPU used).

MaxText's model-FLOP count (calculate_tflops_training_per_device, default dense/MoE path) ported line by
line, read at the pinned main 1a95d1e5; model shapes from its configs/models/*.yml. Published rows from
its docs/reference/models/tiering.md (MFU and approximate tokens/s per device). For each row:
  implied FLOPs per token = MFU x peak / (tokens/s per device)       (what MaxText must have counted)
  our FLOPs per token     = the ported formula / (per-device tokens per step)
  MFU recomputed           = our FLOPs per token x tokens/s / peak
  implied step time        = per-device batch x sequence / tokens/s  (when the recipe's batch is known)
Plus a GPU row from the Llama 3 paper (Table 4) and cost per million training tokens at list prices.
"""
import os, sys; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import re
import tq_common as T

MT = "maxtext"
CFGDIR = "src/maxtext/configs/models"


def yml(name):
    out = {}
    for l in open(T.src_file(MT, f"{CFGDIR}/{name}.yml")):
        m = re.match(r"^(\w+):\s*(.+?)\s*(#.*)?$", l)
        if m:
            k, v = m.group(1), m.group(2)
            out[k.replace("base_", "")] = v
    c = {k: int(out[k].replace("_", "")) for k in ("emb_dim", "num_query_heads", "num_kv_heads", "mlp_dim", "num_decoder_layers", "head_dim", "vocab_size")}
    c["n_act"] = len(re.findall(r'"\w+"', out["mlp_activations"]))
    c["num_experts"] = int(out.get("num_experts", 1)); c["k"] = int(out.get("num_experts_per_tok", 1))
    c["moe_mlp_dim"] = int(out.get("moe_mlp_dim", out["mlp_dim"]).replace("_", ""))
    return c


def maxtext_flops_per_token(c, seq):
    """Training FLOPs per token, MaxText's default path (per token: divide by batch x seq)."""
    BS = seq                                   # per_device_batch_size = 1 sequence; divided out below
    def ffn(mlp):
        return 2 * BS * mlp * c["emb_dim"] * c["n_act"] + 2 * BS * mlp * c["emb_dim"]
    if c["num_experts"] > 1:
        gate = 2 * BS * c["emb_dim"] * c["num_experts"]
        ffn_l = gate + ffn(c["moe_mlp_dim"]) * c["k"]
    else:
        ffn_l = ffn(c["mlp_dim"])
    qkv = 2 * BS * c["emb_dim"] * (c["num_query_heads"] + 2 * c["num_kv_heads"]) * c["head_dim"]
    noncausal = 4 * BS * seq * c["num_query_heads"] * c["head_dim"]
    proj = 2 * BS * c["emb_dim"] * c["num_query_heads"] * c["head_dim"]
    emb = 2 * BS * c["emb_dim"] * c["vocab_size"]
    L = c["num_decoder_layers"]
    weights = (ffn_l * L + (qkv + proj) * L + emb) * 3
    attn_causal = noncausal / 2 * L * 3
    return {"weights": weights / BS, "attn": attn_causal / BS, "attn_noncausal": noncausal * L * 3 / BS,
            "total": (weights + attn_causal) / BS}


def params_count(c):
    D, L = c["emb_dim"], c["num_decoder_layers"]
    att = D * (c["num_query_heads"] + 2 * c["num_kv_heads"]) * c["head_dim"] + c["num_query_heads"] * c["head_dim"] * D
    mlp = (c["n_act"] + 1) * D * (c["moe_mlp_dim"] if c["num_experts"] > 1 else c["mlp_dim"])
    if c["num_experts"] > 1:
        tot = mlp * c["num_experts"] + D * c["num_experts"]; act = mlp * c["k"] + D * c["num_experts"]
    else:
        tot = act = mlp
    norms = 2 * D
    total = L * (att + tot + norms) + 2 * c["vocab_size"] * D + D
    active = L * (att + act + norms) + 2 * c["vocab_size"] * D + D
    return total, active


PEAK = {"v6e": 918e12, "v5p": 459e12}
TIER_URL = "https://github.com/AI-Hypercomputer/maxtext/blob/1a95d1e5371021aab8d0574c53d2cca425474318/docs/reference/models/tiering.md"
# rows read from tiering.md (Gold and Silver); recipe batch from benchmarks/*_model_configs.py where the linked config is in the pinned clone
ROWS = [
    dict(model="Llama 2 70B", cfg="llama2-70b", gen="v6e", chips=256, seq=4096, mfu=0.438, tok=900, tier="Gold", pdbs=4,
         recipe="benchmarks/maxtext_trillium_model_configs.py", recipe_pat=r'model_name="llama2-70b-4096",'),
    dict(model="Llama 3.1 8B", cfg="llama3.1-8b", gen="v6e", chips=256, seq=8192, mfu=0.4546, tok=7207, tier="Gold", pdbs=None),
    dict(model="Llama 3.1 70B", cfg="llama3.1-70b", gen="v6e", chips=256, seq=8192, mfu=0.5033, tok=960, tier="Gold", pdbs=None),
    dict(model="Llama 3.1 405B", cfg="llama3.1-405b", gen="v6e", chips=256, seq=8192, mfu=0.3855, tok=123, tier="Silver", pdbs=None),
    dict(model="Mixtral 8x7B", cfg="mixtral-8x7b", gen="v6e", chips=256, seq=4096, mfu=0.3523, tok=3899, tier="Silver", pdbs=None),
    dict(model="Mixtral 8x22B", cfg="mixtral-8x22b", gen="v6e", chips=256, seq=4096, mfu=0.362, tok=1326, tier="Silver", pdbs=None),
    dict(model="Llama 2 70B", cfg="llama2-70b", gen="v5p", chips=512, seq=4096, mfu=0.654, tok=692, tier="Gold", pdbs=None),
    dict(model="Mixtral 8x7B", cfg="mixtral-8x7b", gen="v5p", chips=256, seq=4096, mfu=0.5256, tok=2909, tier="Silver", pdbs=None),
]
PRICE = {"v6e": 2.70, "v5p": 4.20, "v5e": 1.20, "7x": 12.00}
rows = []
for r in ROWS:
    c = yml(r["cfg"])
    f = maxtext_flops_per_token(c, r["seq"])
    tot, act = params_count(c)
    peak = PEAK[r["gen"]]
    implied = r["mfu"] * peak / r["tok"]
    out = dict(r)
    out.pop("recipe_pat", None)
    out.update(params=tot, active=act, flops_tok=f["total"], flops_tok_weights=f["weights"], flops_tok_attn=f["attn"],
               flops_tok_noncausal=f["weights"] + f["attn_noncausal"], six_n=6 * act,
               implied_flops_tok=implied, mfu_recomputed=f["total"] * r["tok"] / peak,
               mfu_noncausal=(f["weights"] + f["attn_noncausal"]) * r["tok"] / peak,
               ratio=implied / f["total"], price=PRICE[r["gen"]],
               usd_per_mtok=PRICE[r["gen"]] / (r["tok"] * 3600) * 1e6,
               cfg_line=1)
    if r.get("recipe"):
        out["recipe_line"] = T.src_line(MT, r["recipe"], r["recipe_pat"])
        out["step_s"] = r["pdbs"] * r["seq"] / r["tok"]
    rows.append(out)
    print(f'{r["model"]:15s} {r["gen"]} pub {r["mfu"]:.4f} recomputed {out["mfu_recomputed"]:.4f} noncausal {out["mfu_noncausal"]:.4f} implied/ours {out["ratio"]:.4f} $/Mtok {out["usd_per_mtok"]:.3f}')

# GPU comparison row: Llama 3 405B, Table 4 (arXiv 2407.21783): 8,192 H100, seq 8,192, 430 TFLOPs/GPU, 43% MFU
l405 = yml("llama3.1-405b")
f405 = maxtext_flops_per_token(l405, 8192)
gpu = dict(model="Llama 3 405B (Meta, H100)", chips=8192, seq=8192, tflops_gpu=430, mfu=0.43, peak=989.5e12,
           src="https://arxiv.org/abs/2407.21783 Table 4", tok_s_gpu=430e12 / f405["total"],
           price=3.99, price_src="Lambda 8x H100 SXM on demand, read 2026-10-15 (https://lambda.ai/pricing)")
gpu["usd_per_mtok"] = gpu["price"] / (gpu["tok_s_gpu"] * 3600) * 1e6
gpu["mfu_check"] = 430e12 / 989.5e12
print("gpu", gpu)
fn = T.src_line(MT, "src/maxtext/utils/maxtext_utils.py", r"^def calculate_tflops_training_per_device")
causal = T.src_line_after(MT, "src/maxtext/utils/maxtext_utils.py", r"causal_attention_flops = noncausal_attention_flops / 2", fn)
CFGS = {n: yml(n) for n in ("llama2-7b", "llama2-70b", "llama3.1-8b", "llama3.1-70b", "llama3.1-405b", "mixtral-8x7b", "mixtral-8x22b")}
# the running example (root src/data/common.py CFG): GELU MLP (one activation), untied head
CFGS["running example"] = dict(emb_dim=128, num_query_heads=4, num_kv_heads=4, mlp_dim=512, num_decoder_layers=4, head_dim=32, vocab_size=65, n_act=1, num_experts=1, k=1, moe_mlp_dim=512)
for n, c in CFGS.items():
    c["flops_tok_4096"] = maxtext_flops_per_token(c, 4096)["total"]
T.save("mfu.json", {"rows": rows, "cfgs": CFGS, "gpu": gpu, "peak": PEAK, "price": PRICE, "tier_url": TIER_URL,
                    "src": {"fn": fn, "causal": causal, "file": "src/maxtext/utils/maxtext_utils.py", "commit": "1a95d1e5"},
                    "price_src": "https://cloud.google.com/tpu/pricing (on demand, per chip-hour, read 2026-10-15)"})
