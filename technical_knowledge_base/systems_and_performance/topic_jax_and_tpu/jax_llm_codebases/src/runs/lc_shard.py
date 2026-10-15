"""Build MaxText's abstract model (no weights allocated) on 8 simulated CPU devices and record, for every
parameter, its shape, logical axis names, the PartitionSpec MaxText's rules give it, and bytes per device.

Run: XLA_FLAGS=--xla_force_host_platform_device_count=8 JAX_PLATFORMS=cpu nice -n 15 \
     $JX_SCRATCH/venv/bin/python -I -B lc_shard.py     -> ../out/shard.json
"""
import sys, os, json, time, io, contextlib, logging, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import lc_env
logging.disable(logging.WARNING)
import jax, numpy as np
from flax import nnx
from maxtext.configs import pyconfig
from maxtext.utils import maxtext_utils, model_creation_utils

BASE = os.path.join(lc_env.MAXTEXT, "src", "maxtext", "configs", "base.yml")
COMMON = dict(run_name="lc_shard", hardware="cpu", skip_jax_distributed_system=True, enable_checkpointing=False,
              base_output_directory=os.path.join(lc_env.JX, "lc", "mt_out"), jax_cache_dir="")
RUNEX = dict(decoder_block="gpt3", base_emb_dim=128, base_num_query_heads=4, base_num_kv_heads=4, base_mlp_dim=512,
             base_num_decoder_layers=4, head_dim=32, vocab_size=65, max_target_length=128, trainable_position_size=128,
             mlp_activations=["gelu"], logits_via_embedding=False, fused_qkv=False, enable_dropout=False,
             dtype="float32", attention="dot_product", per_device_batch_size=4, normalization_layer_epsilon=1e-5)
CASES = [
  ("llama2-7b, FSDP over 8", dict(model_name="llama2-7b")),
  ("llama2-7b, FSDP 2 x tensor 4", dict(model_name="llama2-7b", ici_tensor_parallelism=4)),
  ("llama2-7b, FSDP 8, scan_layers=False", dict(model_name="llama2-7b", scan_layers=False)),
  ("running example as gpt3, FSDP over 8", RUNEX),
  ("running example as gpt3, FSDP 2 x tensor 4", dict(RUNEX, ici_tensor_parallelism=4)),
]

def spec_str(s):
    return "P(" + ", ".join("None" if a is None else (repr(a) if isinstance(a, str) else "(" + ", ".join(repr(x) for x in a) + ")") for a in s) + ")"

out = {"maxtext_commit": "1a95d1e5", "jax": jax.__version__, "devices": len(jax.devices()), "cases": []}
for label, kw in CASES:
    t0 = time.perf_counter(); c0 = time.process_time()
    buf = io.StringIO()
    with contextlib.redirect_stdout(buf):
        cfg = pyconfig.initialize([sys.argv[0], BASE], **COMMON, **kw)
        mesh = maxtext_utils.get_mesh_from_config(cfg)
        _, abs_model = model_creation_utils.create_nnx_abstract_model(cfg, mesh)
    gd, state = nnx.split(abs_model)
    rows = []
    tot = 0; dev_bytes = 0
    for path, var in jax.tree_util.tree_leaves_with_path(state, is_leaf=lambda x: isinstance(x, nnx.Variable)):
        v = var.get_value() if hasattr(var, "get_value") else var.value
        if not hasattr(v, "shape"): continue
        meta = var.get_metadata() if hasattr(var, "get_metadata") else {}
        logical = meta.get("sharding") or meta.get("out_sharding") or meta.get("sharding_names")
        sh = v.sharding
        spec = sh.spec if hasattr(sh, "spec") else None
        n = int(np.prod(v.shape)) if v.shape else 1
        try: itemsize = np.dtype(v.dtype).itemsize
        except TypeError: itemsize = 8  # PRNG key arrays (key<fry>): two uint32
        err = None
        try:
            shard_shape = sh.shard_shape(v.shape) if sh is not None else v.shape
        except Exception as e:  # IndivisibleError: recorded, the page shows it
            err = lc_env.scrub(e).split(" (full shape")[0][-160:]; shard_shape = v.shape
        per_dev = int(np.prod(shard_shape)) * itemsize if shard_shape else itemsize
        name = ".".join(str(getattr(p, "key", getattr(p, "name", getattr(p, "idx", p)))) for p in path)
        rows.append({"name": name, "type": type(var).__name__, "shape": list(v.shape), "dtype": str(v.dtype),
                     "logical": [None if a is None else str(a) for a in logical] if logical else None,
                     "spec": spec_str(spec) if spec is not None else None,
                     "shard_shape": list(shard_shape), "params": n, "bytes": n * itemsize, "bytes_per_device": per_dev, "error": err})
        if type(var).__name__ == "Param":
            tot += n; dev_bytes += per_dev
    rec = {"label": label, "overrides": kw, "mesh_shape": {k: int(v) for k, v in mesh.shape.items()},
           "mesh_nontrivial": {k: int(v) for k, v in mesh.shape.items() if v > 1},
           "n_param_arrays": sum(1 for r in rows if r["type"] == "Param"), "total_params": tot,
           "param_bytes_total": sum(r["bytes"] for r in rows if r["type"] == "Param"),
           "param_bytes_per_device": dev_bytes, "rows": rows,
           "wall_s": round(time.perf_counter() - t0, 2), "cpu_s": round(time.process_time() - c0, 2)}
    out["cases"].append(rec)
    print(label, rec["mesh_nontrivial"], rec["n_param_arrays"], tot, dev_bytes, rec["wall_s"])
out["load_1min"] = os.getloadavg()[0]
json.dump(out, open(os.path.join(lc_env.OUT, "shard.json"), "w"), indent=1, default=str)
