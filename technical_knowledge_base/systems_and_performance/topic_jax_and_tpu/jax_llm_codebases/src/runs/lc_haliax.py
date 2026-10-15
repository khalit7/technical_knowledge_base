"""Named tensors (Haliax, the library under Levanter) on the running example, CPU, 8 simulated devices.

1. Block 0's attention written with named axes, on the running example's real initial weights and batch 0,
   against the root's plain-JAX attention: same numbers.
2. What a named axis buys: a contraction over the wrong name fails at trace time with a readable error.
3. Levanter's default axis mapping (lib/levanter/src/levanter/utils/mesh.py) turned into PartitionSpecs for
   the MLP weights, next to what MaxText's logical_axis_rules give the same weights (shard.json).

Run: XLA_FLAGS=--xla_force_host_platform_device_count=8 JAX_PLATFORMS=cpu nice -n 15 \
     $JX_SCRATCH/venv/bin/python -I -B lc_haliax.py   -> ../out/haliax.json
"""
import sys, os, json, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import lc_env
ROOT_DATA = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "..", "src", "data"))
sys.path.insert(0, ROOT_DATA)
import numpy as np, jax, jax.numpy as jnp
import haliax as hax
from haliax import Axis
import common as C, model_jax as MJ

cfg = C.CFG; D, H = cfg["d_model"], cfg["n_heads"]; dh = D // H
sd = dict(np.load(C.path("data", "init_torch.npz")))
x_ids, _ = C.batch(0)
params = MJ.from_torch(sd, cfg)

# hidden state entering block 0's attention, from the plain-JAX twin (embeddings + ln1)
xe = params["tok_emb"][x_ids] + params["pos_emb"][: x_ids.shape[1]]
b0 = params["blocks"][0]
h = MJ.layer_norm(b0["ln1"], xe, cfg["ln_eps"])

Batch, Pos, KPos, Embed, Heads, HeadSize = Axis("batch", 32), Axis("position", 128), Axis("key_position", 128), Axis("embed", D), Axis("heads", H), Axis("head_size", dh)
def W(name):   # running example weights are [in, out]; name the axes instead of remembering the layout
    w = np.asarray(sd[f"blocks.0.attn.{name}.weight"]).T.reshape(D, H, dh)
    return hax.named(jnp.asarray(w), (Embed, Heads, HeadSize))
def Bv(name):
    return hax.named(jnp.asarray(np.asarray(sd[f"blocks.0.attn.{name}.bias"]).reshape(H, dh)), (Heads, HeadSize))
hn = hax.named(h, (Batch, Pos, Embed))
q = hax.dot(hn, W("wq"), axis=Embed) + Bv("wq")
k = (hax.dot(hn, W("wk"), axis=Embed) + Bv("wk")).rename({"position": "key_position"})
v = (hax.dot(hn, W("wv"), axis=Embed) + Bv("wv")).rename({"position": "key_position"})
scores = hax.dot(q, k, axis=HeadSize) / math.sqrt(dh)                        # [batch, position, heads, key_position]
causal = hax.named(jnp.tril(jnp.ones((128, 128), bool)), (Pos, KPos))
scores = hax.where(causal, scores, -jnp.inf)
probs = hax.nn.softmax(scores, axis=KPos)
ctx = hax.dot(probs, v, axis=KPos)                                            # [batch, position, heads, head_size]
wo = hax.named(jnp.asarray(np.asarray(sd["blocks.0.attn.wo.weight"]).T.reshape(H, dh, D)), (Heads, HeadSize, Embed))
out_named = hax.dot(ctx, wo, axis=(Heads, HeadSize)) + hax.named(jnp.asarray(sd["blocks.0.attn.wo.bias"]), (Embed,))
out_named = out_named.rearrange((Batch, Pos, Embed)).array

# the root's plain-JAX attention for the same block (model_jax.attention if present, else written out)
ref = MJ.attention(b0["attn"], MJ.layer_norm(b0["ln1"], xe, cfg["ln_eps"]), H)
diff = float(jnp.max(jnp.abs(out_named - ref)))

# 2. the wrong axis name
try:
    hax.dot(q, k, axis="embed")
    err = None
except Exception as e:  # noqa
    err = f"{type(e).__name__}: {lc_env.scrub(e)}"[:400]

# 3. Levanter's default mapping -> PartitionSpecs on a (data 2, model 4) mesh
from haliax.partitioning import pspec_for_axis
DEFAULT_SHARED = {"mlp": "model", "heads": "model"}        # levanter/utils/mesh.py DEFAULT_SHARED_MAPPING
PARAM = dict(DEFAULT_SHARED, embed="data")                  # MeshConfig.param_mapping default {"embed": "data"}
specs = {name: str(pspec_for_axis(axes, PARAM)) for name, axes in
         {"mlp c_fc [embed, mlp]": ("embed", "mlp"), "mlp c_proj [mlp, embed]": ("mlp", "embed"),
          "attn c_attn [embed, qkv, heads, head_size]": ("embed", "qkv", "heads", "head_size"),
          "attn c_proj [heads, head_size, embed]": ("heads", "head_size", "embed"),
          "token embedding [vocab, embed]": ("vocab", "embed")}.items()}
res = {"haliax": "marin-haliax 0.2.180.dev38754195437 (PyPI, 2026-10-15)", "jax": jax.__version__,
       "max_abs_diff_named_vs_plain_attention": diff, "shape": list(out_named.shape),
       "wrong_axis_error": err, "levanter_param_specs": specs,
       "levanter_defaults": {"DEFAULT_SHARED_MAPPING": DEFAULT_SHARED, "param_mapping": {"embed": "data"},
                             "DEFAULT_ICI_AXIS_SPEC": {"data": -1, "replica": 1, "model": 1}}}
json.dump(res, open(os.path.join(lc_env.OUT, "haliax.json"), "w"), indent=1)
print(res)
