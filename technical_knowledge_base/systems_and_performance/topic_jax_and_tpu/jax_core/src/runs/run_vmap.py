"""vmap in depth: in_axes and out_axes as pytrees, axis_size, axis_name with collectives inside vmap,
vmap of random keys, nested vmap as an outer product, the batching rules counted, errors.
Writes out/vmap.json.

JAX_PLATFORMS=cpu OMP_NUM_THREADS=4 nice -n 15 $JX_SCRATCH/venv/bin/python -I -B run_vmap.py
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import jccommon as J  # noqa: E402
import numpy as np  # noqa: E402
import jax  # noqa: E402
import jax.numpy as jnp  # noqa: E402
from jax import lax  # noqa: E402
from jax._src.interpreters import ad, batching, mlir  # noqa: E402

import common as C  # noqa: E402
import model_jax as MJ  # noqa: E402

R = {"versions": J.versions()}
cfg = C.CFG
params = MJ.from_torch(dict(np.load(C.path("data", "init_torch.npz"))), cfg)
p_mlp = params["blocks"][0]["mlp"]

# ---------------------------------------------------------------- 1. in_axes as a pytree: an ensemble of 3 MLPs on one batch
ens = jax.tree.map(lambda a: jnp.stack([a, a * 1.1, a * 0.9]), p_mlp)          # 3 MLPs stacked on axis 0
x = jnp.asarray(np.random.default_rng(0).standard_normal((8, 128)), jnp.float32)
y = jax.vmap(MJ.mlp, in_axes=(0, None))(ens, x)
y_bias_only = jax.vmap(MJ.mlp, in_axes=({"fc1": {"w": None, "b": 0}, "fc2": {"w": None, "b": None}}, None))(
    {"fc1": {"w": p_mlp["fc1"]["w"], "b": ens["fc1"]["b"]}, "fc2": p_mlp["fc2"]}, x)
R["in_axes"] = {
    "code": "ens = jax.tree.map(lambda a: jnp.stack([a, a * 1.1, a * 0.9]), p)   # 3 MLPs, every leaf gets a leading axis of 3\njax.vmap(mlp, in_axes=(0, None))(ens, x)          # x f32[8,128] shared by all three\n\n# in_axes can be a pytree prefix: batch only fc1's bias\njax.vmap(mlp, in_axes=({\"fc1\": {\"w\": None, \"b\": 0}, \"fc2\": {\"w\": None, \"b\": None}}, None))(p_mixed, x)",
    "out_shape": list(y.shape), "out_shape_bias_only": list(y_bias_only.shape),
    "matches_loop": float(jnp.max(jnp.abs(y - jnp.stack([MJ.mlp(jax.tree.map(lambda a: a[i], ens), x) for i in range(3)])))),
}
# out_axes
f = lambda v: jnp.outer(v, v)  # noqa: E731
R["out_axes"] = {
    "out_axes=0": list(jax.vmap(f)(jnp.ones((5, 3))).shape),
    "out_axes=2": list(jax.vmap(f, out_axes=2)(jnp.ones((5, 3))).shape),
    "out_axes=None error": J.err(lambda: jax.vmap(f, out_axes=None)(jnp.ones((5, 3))), 2),
    "out_axes=None ok (output does not depend on the batch)": list(jax.vmap(lambda v: jnp.ones(3), out_axes=None)(jnp.ones((5, 3))).shape),
}
# axis_size with no batched input; mismatched sizes
R["axis_size"] = {
    "code": "jax.vmap(lambda: jnp.zeros(3), axis_size=4)()",
    "shape": list(jax.vmap(lambda: jnp.zeros(3), axis_size=4)().shape),
    "mismatch_error": J.err(lambda: jax.vmap(lambda a, b: a + b)(jnp.ones((4, 3)), jnp.ones((5, 3))), 6),
}

# ---------------------------------------------------------------- 2. axis_name: collectives inside vmap
def normalize(v):
    return v / lax.psum(v.sum(), axis_name="b")         # divide by the sum over the whole batch


xs = jnp.arange(1.0, 5.0).reshape(4, 1) * jnp.ones((4, 3))
R["axis_name"] = {
    "code": "def normalize(v):                               # written for one example\n    return v / lax.psum(v.sum(), axis_name=\"b\")   # ...but sums over the whole batch\n\njax.vmap(normalize, axis_name=\"b\")(xs)          # xs: rows 1, 2, 3, 4 (3 columns each)",
    "out_first_col": [float(v) for v in jax.vmap(normalize, axis_name="b")(xs)[:, 0]],
    "jaxpr": str(jax.make_jaxpr(jax.vmap(normalize, axis_name="b"))(xs)),
    "unbound_error": J.err(lambda: normalize(xs[0]), 2),
    "axis_index": [int(v) for v in jax.vmap(lambda v: lax.axis_index("b"), axis_name="b")(xs)],
}

# ---------------------------------------------------------------- 3. random keys under vmap
k = jax.random.key(0)
same = jax.vmap(lambda _: jax.random.normal(k, (2,)))(jnp.arange(3))
diff = jax.vmap(lambda kk: jax.random.normal(kk, (2,)))(jax.random.split(k, 3))
R["random"] = {
    "same_key_rows_equal": bool(jnp.all(same == same[0])),
    "split_keys_rows_equal": bool(jnp.all(diff == diff[0])),
    "split_keys_values": [[round(float(v), 4) for v in r] for r in diff],
    "code": "jax.vmap(lambda _: jax.random.normal(k, (2,)))(jnp.arange(3))        # one key closed over: 3 equal rows\njax.vmap(lambda kk: jax.random.normal(kk, (2,)))(jax.random.split(k, 3))   # one key per example",
}

# ---------------------------------------------------------------- 4. nested vmap: all pairs
dot = lambda a, b: a @ b  # noqa: E731
q = jnp.ones((6, 32))
kk = jnp.ones((7, 32))
nested = jax.vmap(jax.vmap(dot, in_axes=(None, 0)), in_axes=(0, None))(q, kk)
R["nested"] = {"shape": list(nested.shape), "jaxpr": str(jax.make_jaxpr(jax.vmap(jax.vmap(dot, in_axes=(None, 0)), in_axes=(0, None)))(q, kk)),
               "code": "jax.vmap(jax.vmap(dot, in_axes=(None, 0)), in_axes=(0, None))(q, k)   # q [6,32], k [7,32] -> [6,7]"}

# ---------------------------------------------------------------- 5. the rule tables
R["rule_tables"] = {
    "batching.fancy_primitive_batchers": len(batching.fancy_primitive_batchers),
    "ad.primitive_jvps": len(ad.primitive_jvps),
    "ad.primitive_transposes": len(ad.primitive_transposes),
    "ad.primitive_linearizations": len(getattr(ad, "primitive_linearizations", {})),
    "mlir lowerings (platform independent)": len(mlir._lowerings),
    "mlir lowerings (cpu)": len(mlir._platform_specific_lowerings.get("cpu", {})),
    "mlir lowerings (tpu)": len(mlir._platform_specific_lowerings.get("tpu", {})),
    "mlir lowerings (cuda)": len(mlir._platform_specific_lowerings.get("cuda", {})),
}
R["rule_tables"]["note"] = "sizes of the rule dictionaries after `import jax` and running this script (rules register as modules import)"
dg = batching.fancy_primitive_batchers.get(lax.dot_general_p)
R["dot_general_batcher"] = getattr(getattr(dg, "func", dg), "__name__", str(dg))
R["has_rules"] = {p.name: {"batch": p in batching.fancy_primitive_batchers, "jvp": p in ad.primitive_jvps,
                           "transpose": p in ad.primitive_transposes, "lowering": p in mlir._lowerings}
                  for p in (lax.sin_p, lax.dot_general_p, lax.add_p, lax.mul_p, lax.while_p, lax.cond_p, lax.scan_p)}

# what the batched jaxpr of the MLP looks like when the batch is on a different axis
R["batch_axis1"] = {"code": "jax.vmap(mlp, in_axes=(None, 1), out_axes=1)(p, x_t)   # x_t: f32[128, 8], the batch on axis 1",
                    "jaxpr_head": "\n".join(str(jax.make_jaxpr(jax.vmap(MJ.mlp, in_axes=(None, 1), out_axes=1))(p_mlp, x.T)).splitlines()[:12])}
J.save("vmap", R)
