"""Parse MaxText configs on CPU with MaxText's own pyconfig (main 1a95d1e5), record what the merge produced.

Run: XLA_FLAGS=--xla_force_host_platform_device_count=8 JAX_PLATFORMS=cpu nice -n 15 \
     $JX_SCRATCH/venv/bin/python -I -B lc_cfg.py      -> ../out/cfg.json
"""
import sys, os, json, time, io, contextlib, logging
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import lc_env
logging.disable(logging.WARNING)
import jax
from maxtext.configs import pyconfig, types
from maxtext.utils import maxtext_utils

BASE = os.path.join(lc_env.MAXTEXT, "src", "maxtext", "configs", "base.yml")
OUTDIR = os.path.join(lc_env.JX, "lc", "mt_out")
COMMON = dict(run_name="lc_cfg", hardware="cpu", skip_jax_distributed_system=True,
              enable_checkpointing=False, base_output_directory=OUTDIR, jax_cache_dir="")
KEYS = ["model_name", "decoder_block", "emb_dim", "num_query_heads", "num_kv_heads", "head_dim", "mlp_dim",
        "num_decoder_layers", "vocab_size", "mlp_activations", "max_target_length", "per_device_batch_size",
        "global_batch_size_to_train_on", "global_batch_size_to_load", "dtype", "weight_dtype", "grad_dtype",
        "scan_layers", "param_scan_axis", "remat_policy", "attention", "attention_type", "logits_via_embedding",
        "normalization_layer_epsilon", "opt_type", "learning_rate", "adam_b1", "adam_b2", "adam_weight_decay",
        "gradient_clipping_threshold", "steps", "warmup_steps_fraction", "dataset_type", "shard_mode",
        "mesh_axes", "ici_fsdp_parallelism", "ici_data_parallelism", "ici_tensor_parallelism", "dcn_data_parallelism",
        "num_slices", "enable_dropout", "trainable_position_size", "use_iota_embed", "fused_qkv", "async_checkpointing",
        "checkpoint_period", "packing", "matmul_precision", "cast_logits_to_fp32", "hardware"]

def val(v):
    if hasattr(v, "value") and not isinstance(v, (int, float, str)): v = v.value
    if isinstance(v, (list, tuple)): return [val(x) for x in v]
    if isinstance(v, (int, float, str, bool)) or v is None: return v
    return str(v)

def parse(label, **kw):
    t0 = time.perf_counter(); c0 = time.process_time()
    buf = io.StringIO()
    rec = {"label": label, "overrides": {k: v for k, v in kw.items()}}
    try:
        with contextlib.redirect_stdout(buf):
            cfg = pyconfig.initialize([sys.argv[0], BASE], **COMMON, **kw)
        rec["ok"] = True
        rec["values"] = {k: val(getattr(cfg, k)) for k in KEYS if hasattr(cfg, k)}
        rules = cfg.logical_axis_rules
        rec["n_rules"] = len(rules)
        rec["rules_head"] = [[r[0], val(r[1])] for r in rules if r[0] in ("embed", "mlp", "heads", "kv_heads", "vocab", "norm", "layers", "activation_batch", "activation_length", "activation_embed")]
        rec["n_keys"] = len(cfg.get_keys())
        rec["rules_all"] = [[r[0], val(r[1])] for r in rules]
        try:   # MaxText resolves the -1 degrees when it builds the mesh, not when it parses
            with contextlib.redirect_stdout(io.StringIO()):
                mesh = maxtext_utils.get_mesh_from_config(cfg)
            rec["mesh"] = {k: int(v) for k, v in mesh.shape.items() if v > 1}
        except BaseException as e:  # noqa
            rec["mesh_error"] = (type(e).__name__ + ": " + lc_env.scrub(e))[:400]
    except BaseException as e:  # noqa
        rec["ok"] = False
        msg = lc_env.scrub(e)
        rec["error_type"] = type(e).__name__
        rec["error"] = msg[:1200]
    rec["wall_s"] = round(time.perf_counter() - t0, 2); rec["cpu_s"] = round(time.process_time() - c0, 2)
    print(label, rec.get("ok"), rec.get("error_type", ""), rec["wall_s"])
    return rec

out = {"maxtext_commit": "1a95d1e5371021aab8d0574c53d2cca425474318", "jax": jax.__version__,
       "devices": len(jax.devices()), "n_fields_pydantic": len(types.MaxTextConfig.model_fields),
       "load_1min": os.getloadavg()[0], "runs": []}
R = out["runs"]
R.append(parse("base.yml as shipped"))
R.append(parse("llama2-7b", model_name="llama2-7b"))
R.append(parse("llama3.1-8b, tiering run shape", model_name="llama3.1-8b", max_target_length=8192))
R.append(parse("deepseek3-671b", model_name="deepseek3-671b"))
R.append(parse("conflict: model file and CLI disagree", model_name="llama2-7b", base_emb_dim=128))
R.append(parse("override_model_config=True", model_name="llama2-7b", base_emb_dim=128, override_model_config=True))
R.append(parse("typo in a key", remat_polcy="full"))
R.append(parse("tensor=4 with fsdp=-1", ici_tensor_parallelism=4))
R.append(parse("impossible mesh: fsdp=3", ici_fsdp_parallelism=3))
# the running example (826,368 params: GPT-2 style, d 128, 4 layers, 4 heads, MLP 512, context 128, vocab 65) as a MaxText gpt3 config
RUNEX = dict(decoder_block="gpt3", base_emb_dim=128, base_num_query_heads=4, base_num_kv_heads=4, base_mlp_dim=512,
             base_num_decoder_layers=4, head_dim=32, vocab_size=65, max_target_length=128, trainable_position_size=128,
             mlp_activations=["gelu"], logits_via_embedding=False, fused_qkv=False, enable_dropout=False,
             dtype="float32", attention="dot_product", per_device_batch_size=4, normalization_layer_epsilon=1e-5)
R.append(parse("running example as gpt3", **RUNEX))
out["runex_overrides"] = RUNEX
os.makedirs(lc_env.OUT, exist_ok=True)
json.dump(out, open(os.path.join(lc_env.OUT, "cfg.json"), "w"), indent=1, default=str)
print("wrote cfg.json")
