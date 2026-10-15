"""The running example inside MaxText: build MaxText's gpt3 decoder at the running example's shape on CPU,
copy the running example's initial weights into it, and compare logits and loss with the root's plain-JAX model.

Run: JAX_PLATFORMS=cpu nice -n 15 $JX_SCRATCH/venv/bin/python -I -B lc_fwd.py   -> ../out/fwd.json
"""
import sys, os, json, time, io, contextlib, logging
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import lc_env
ROOT_DATA = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "..", "src", "data")
sys.path.insert(0, os.path.abspath(ROOT_DATA))
logging.disable(logging.WARNING)
import numpy as np, jax, jax.numpy as jnp
from flax import nnx
from flax.core.spmd import logical_axis_rules
import common as C, model_jax as MJ
from maxtext.configs import pyconfig
from maxtext.utils import maxtext_utils, model_creation_utils
from maxtext.common.common_types import MODEL_MODE_TRAIN

BASE = os.path.join(lc_env.MAXTEXT, "src", "maxtext", "configs", "base.yml")
COMMON = dict(run_name="lc_fwd", hardware="cpu", skip_jax_distributed_system=True, enable_checkpointing=False,
              base_output_directory=os.path.join(lc_env.JX, "lc", "mt_out"), jax_cache_dir="")
RUNEX = dict(decoder_block="gpt3", base_emb_dim=128, base_num_query_heads=4, base_num_kv_heads=4, base_mlp_dim=512,
             base_num_decoder_layers=4, head_dim=32, vocab_size=65, max_target_length=128, trainable_position_size=128,
             mlp_activations=["gelu"], logits_via_embedding=False, fused_qkv=False, enable_dropout=False,
             dtype="float32", attention="dot_product", per_device_batch_size=32, normalization_layer_epsilon=1e-5,
             matmul_precision="highest")
cfgd = C.CFG; L, H, D, F = cfgd["n_layers"], cfgd["n_heads"], cfgd["d_model"], cfgd["d_ff"]; dh = D // H

t0 = time.perf_counter(); c0 = time.process_time()
with contextlib.redirect_stdout(io.StringIO()):
    cfg = pyconfig.initialize([sys.argv[0], BASE], **COMMON, **RUNEX)
mesh = maxtext_utils.get_mesh_from_config(cfg)
with logical_axis_rules(cfg.logical_axis_rules):
    create, _ = model_creation_utils.create_nnx_abstract_model(cfg, mesh)
    model = create()
t_build = time.perf_counter() - t0

sd = dict(np.load(C.path("data", "init_torch.npz")))
st = nnx.state(model, nnx.Param)
flat = {".".join(str(getattr(k, "key", k)) for k in path): v for path, v in jax.tree_util.tree_leaves_with_path(st, is_leaf=lambda x: isinstance(x, nnx.Variable))}
shapes_before = {k: list(v.get_value().shape) for k, v in flat.items()}

def stack(fn):  # layers stacked on axis 1 (param_scan_axis: 1)
    return np.stack([fn(i) for i in range(L)], axis=1)
T = lambda a: np.ascontiguousarray(a.T)
M = {
 "token_embedder.embedding": sd["tok_emb.weight"],
 "decoder.position_embedder.embedding": sd["pos_emb.weight"],
 "decoder.decoder_norm.scale": sd["ln_f.weight"] - 1.0,     # Gpt3LayerNorm multiplies by (scale + 1)
 "decoder.decoder_norm.bias": sd["ln_f.bias"],
 "decoder.logits_dense.kernel": T(sd["head.weight"]),
 "decoder.layers.pre_self_attention_norm.scale": stack(lambda i: sd[f"blocks.{i}.ln1.weight"] - 1.0),
 "decoder.layers.pre_self_attention_norm.bias": stack(lambda i: sd[f"blocks.{i}.ln1.bias"]),
 "decoder.layers.mlp.mlp_layer_norm.scale": stack(lambda i: sd[f"blocks.{i}.ln2.weight"] - 1.0),
 "decoder.layers.mlp.mlp_layer_norm.bias": stack(lambda i: sd[f"blocks.{i}.ln2.bias"]),
 "decoder.layers.mlp.wi.kernel": stack(lambda i: T(sd[f"blocks.{i}.mlp.fc1.weight"])),
 "decoder.layers.mlp.wi.bias": stack(lambda i: sd[f"blocks.{i}.mlp.fc1.bias"]),
 "decoder.layers.mlp.wo.kernel": stack(lambda i: T(sd[f"blocks.{i}.mlp.fc2.weight"])),
 "decoder.layers.mlp.wo.bias": stack(lambda i: sd[f"blocks.{i}.mlp.fc2.bias"]),
}
for nm, key in (("query", "wq"), ("key", "wk"), ("value", "wv")):
    M[f"decoder.layers.self_attention.{nm}.kernel"] = stack(lambda i: T(sd[f"blocks.{i}.attn.{key}.weight"]).reshape(D, H, dh))
    M[f"decoder.layers.self_attention.{nm}.bias"] = stack(lambda i: sd[f"blocks.{i}.attn.{key}.bias"].reshape(H, dh))
M["decoder.layers.self_attention.out.kernel"] = stack(lambda i: T(sd[f"blocks.{i}.attn.wo.weight"]).reshape(H, dh, D))
M["decoder.layers.self_attention.out.bias"] = stack(lambda i: sd[f"blocks.{i}.attn.wo.bias"])
missing = sorted(set(flat) - set(M)); extra = sorted(set(M) - set(flat))
assert not missing and not extra, (missing, extra)
for k, v in flat.items():
    assert list(M[k].shape) == list(v.get_value().shape), (k, M[k].shape, v.get_value().shape)
    v.set_value(jnp.asarray(M[k], jnp.float32))
n_params = int(sum(np.prod(v.shape) for v in M.values()))

x, y = C.batch(0)
B, Tn = x.shape
pos = jnp.broadcast_to(jnp.arange(Tn, dtype=jnp.int32), (B, Tn)); seg = jnp.ones((B, Tn), jnp.int32)

@nnx.jit
def mt_logits(model, x):
    return model(decoder_input_tokens=x, decoder_positions=pos, decoder_segment_ids=seg, enable_dropout=False, model_mode=MODEL_MODE_TRAIN)
with logical_axis_rules(cfg.logical_axis_rules), jax.default_matmul_precision("highest"):
    lm = np.asarray(mt_logits(model, jnp.asarray(x)))

params = MJ.from_torch(sd, cfgd)
with jax.default_matmul_precision("highest"):
    lj_exact = np.asarray(jax.jit(lambda p, x: MJ.apply(p, x, cfgd))(params, jnp.asarray(x)))
    orig = jax.nn.gelu
    jax.nn.gelu = lambda v, approximate=True: orig(v, approximate=True)   # the running example with tanh GELU
    try:
        lj_tanh = np.asarray(jax.jit(lambda p, x: MJ.apply(p, x, cfgd))(params, jnp.asarray(x)))
    finally:
        jax.nn.gelu = orig

def xent(lg):
    lg = lg.astype(np.float64); m = lg.max(-1, keepdims=True)
    lse = np.log(np.exp(lg - m).sum(-1)) + m[..., 0]
    return float(np.mean(lse - np.take_along_axis(lg, y[..., None], -1)[..., 0]))

res = {
 "maxtext_commit": "1a95d1e5", "jax": jax.__version__, "devices": len(jax.devices()),
 "n_params_maxtext": n_params, "param_shapes_maxtext": shapes_before,
 "batch_shape": [int(B), int(Tn)],
 "max_abs_logit_diff_vs_tanh_gelu_twin": float(np.max(np.abs(lm - lj_tanh))),
 "max_abs_logit_diff_vs_running_example_exact_gelu": float(np.max(np.abs(lm - lj_exact))),
 "max_abs_logit_diff_tanh_vs_exact_twin": float(np.max(np.abs(lj_tanh - lj_exact))),
 "loss_maxtext": xent(lm), "loss_running_example": xent(lj_exact), "loss_running_example_tanh": xent(lj_tanh),
 "build_wall_s": round(t_build, 2), "total_wall_s": round(time.perf_counter() - t0, 2), "cpu_s": round(time.process_time() - c0, 2),
 "load_1min": os.getloadavg()[0], "matmul_precision": "highest",
}
json.dump(res, open(os.path.join(lc_env.OUT, "fwd.json"), "w"), indent=1)
print({k: v for k, v in res.items() if k != "param_shapes_maxtext"})
