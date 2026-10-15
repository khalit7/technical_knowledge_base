"""MaxText's own FLOP formula (maxtext_utils.calculate_tflops_training_per_device at 1a95d1e5) applied to the
models in MaxText's tiering table, to check whether each row's MFU and tokens/s agree with each other.

implied MFU = tokens/s/chip x (training FLOPs per token, MaxText's count) / peak bf16 FLOP/s per chip.
Run: JAX_PLATFORMS=cpu nice -n 15 $JX_SCRATCH/venv/bin/python -I -B lc_mfu.py   -> ../out/mfu.json
"""
import sys, os, json, io, contextlib, logging
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import lc_env
logging.disable(logging.WARNING)
import jax
from maxtext.configs import pyconfig
from maxtext.utils import maxtext_utils

BASE = os.path.join(lc_env.MAXTEXT, "src", "maxtext", "configs", "base.yml")
COMMON = dict(run_name="lc_mfu", hardware="cpu", skip_jax_distributed_system=True, enable_checkpointing=False,
              base_output_directory=os.path.join(lc_env.JX, "lc", "mt_out"), jax_cache_dir="", per_device_batch_size=1)
# Peak bf16 dense FLOP/s per chip, Cloud TPU docs (FACTS.md "tpu", pages last updated 2026-10-13)
PEAK = {"v6e": 918e12, "v5p": 459e12}
# MaxText docs/reference/models/tiering.md at 1a95d1e5: (model config, chip, seq len, published MFU %, published tokens/s/device, tier)
ROWS = [("llama2-70b", "v6e", 4096, 43.8, 900, "Gold"), ("llama3.1-8b", "v6e", 8192, 45.46, 7207, "Gold"),
        ("llama3.1-70b", "v6e", 8192, 50.33, 960, "Gold"), ("llama3.1-405b", "v6e", 8192, 38.55, 123, "Silver"),
        ("mixtral-8x7b", "v6e", 4096, 35.23, 3899, "Silver"), ("mixtral-8x22b", "v6e", 4096, 36.2, 1326, "Silver"),
        ("llama2-70b", "v5p", 4096, 65.4, 692, "Gold"), ("mixtral-8x7b", "v5p", 4096, 52.56, 2909, "Silver")]
out = {"maxtext_commit": "1a95d1e5", "peak_flops": PEAK, "rows": []}
for model, chip, sl, mfu, tps, tier in ROWS:
    with contextlib.redirect_stdout(io.StringIO()):
        cfg = pyconfig.initialize([sys.argv[0], BASE], **COMMON, model_name=model, max_target_length=sl)
        tot, learn, attn = maxtext_utils.calculate_tflops_training_per_device(cfg, log=False)
    tokens = cfg.per_device_batch_size * cfg.max_target_length
    f_tok = tot * 1e12 / tokens
    implied = tps * f_tok / PEAK[chip] * 100
    # the pre-July-2025 count (non-causal attention, PR #1988) for comparison
    f_tok_old = (learn + 2 * attn) * 1e12 / tokens
    implied_old = tps * f_tok_old / PEAK[chip] * 100
    r = {"model": model, "chip": chip, "seq": sl, "tier": tier, "published_mfu_pct": mfu, "published_tokens_per_s": tps,
         "tflop_per_token_x1e6": round(f_tok / 1e6, 4), "attention_share_pct": round(100 * attn / tot, 2),
         "implied_mfu_pct": round(implied, 2), "implied_mfu_noncausal_pct": round(implied_old, 2),
         "params_from_formula_6N_check": None}
    out["rows"].append(r); print(r)
# the running example, MaxText's count against XLA's cost analysis of the same step (root FACTS jc: value_and_grad 23.69 GFLOP)
RUNEX = dict(decoder_block="gpt3", base_emb_dim=128, base_num_query_heads=4, base_num_kv_heads=4, base_mlp_dim=512,
             base_num_decoder_layers=4, head_dim=32, vocab_size=65, max_target_length=128, trainable_position_size=128,
             mlp_activations=["gelu"], logits_via_embedding=False, fused_qkv=False, attention="dot_product")
with contextlib.redirect_stdout(io.StringIO()):
    c = pyconfig.initialize([sys.argv[0], BASE], **dict(COMMON, per_device_batch_size=32), **RUNEX)
    tot, learn, attn = maxtext_utils.calculate_tflops_training_per_device(c, log=False)
out["running_example"] = {"batch": 32, "seq": 128, "maxtext_gflop_per_step": round(tot * 1e3, 3),
                          "learnable_gflop": round(learn * 1e3, 3), "attention_gflop": round(attn * 1e3, 3),
                          "xla_cost_analysis_value_and_grad_gflop": 23.69, "xla_source": "root FACTS.md jc (jax_core child), measured 2026-10-15"}
print(out["running_example"])
json.dump(out, open(os.path.join(lc_env.OUT, "mfu.json"), "w"), indent=1)
