"""Pytrees in depth: registering classes three ways, treedefs and key paths, static (aux) data and the jit
cache, None and empty containers, is_leaf, transpose, and the cost of flattening the running example.
Writes out/pytree.json.

JAX_PLATFORMS=cpu OMP_NUM_THREADS=4 nice -n 15 $JX_SCRATCH/venv/bin/python -I -B run_pytree.py
"""
import dataclasses
import os
import sys
import time
from typing import NamedTuple

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import jccommon as J  # noqa: E402
import numpy as np  # noqa: E402
import jax  # noqa: E402
import jax.numpy as jnp  # noqa: E402
from jax import tree_util as tu  # noqa: E402

import common as C  # noqa: E402
import model_jax as MJ  # noqa: E402

R = {"versions": J.versions()}
cfg = C.CFG
params = MJ.from_torch(dict(np.load(C.path("data", "init_torch.npz"))), cfg)


# ---------------------------------------------------------------- 1. three ways to register a class
class Linear:                                       # (a) register_pytree_node: flatten and unflatten by hand
    def __init__(self, w, b, name):
        self.w, self.b, self.name = w, b, name


tu.register_pytree_node(Linear,
                        lambda m: ((m.w, m.b), m.name),                        # children, aux data
                        lambda name, ch: Linear(ch[0], ch[1], name))


@jax.tree_util.register_dataclass                    # (b) a dataclass: data fields are children, meta fields are aux
@dataclasses.dataclass
class LayerNorm:
    scale: jax.Array
    bias: jax.Array
    eps: float = dataclasses.field(metadata=dict(static=True), default=1e-5)


class Adam(NamedTuple):                              # (c) NamedTuples are pytrees already
    mu: dict
    nu: dict
    count: jax.Array


lin = Linear(jnp.ones((2, 3)), jnp.zeros(3), "fc1")
ln = LayerNorm(jnp.ones(3), jnp.zeros(3))
st = Adam({"w": jnp.zeros(2)}, {"w": jnp.zeros(2)}, jnp.int32(0))
R["register"] = {}
for nm, obj in [("Linear (register_pytree_node)", lin), ("LayerNorm (register_dataclass)", ln), ("Adam (NamedTuple)", st)]:
    leaves, td = tu.tree_flatten(obj)
    R["register"][nm] = {"treedef": str(td), "n_leaves": len(leaves),
                         "paths": [tu.keystr(p) for p, _ in tu.tree_flatten_with_path(obj)[0]]}

# ---------------------------------------------------------------- 2. static (aux) data is part of the jit cache key
traces = [0]


@jax.jit
def apply_ln(m, x):
    traces[0] += 1
    mu = x.mean(-1, keepdims=True)
    var = ((x - mu) ** 2).mean(-1, keepdims=True)
    return (x - mu) / jnp.sqrt(var + m.eps) * m.scale + m.bias


x = jnp.ones((4, 3))
apply_ln(ln, x)
apply_ln(LayerNorm(jnp.ones(3) * 2, jnp.zeros(3)), x)          # new array values: same treedef, no retrace
n1 = traces[0]
apply_ln(LayerNorm(jnp.ones(3), jnp.zeros(3), eps=1e-6), x)    # new static eps: new treedef, retrace
n2 = traces[0]
R["static"] = {"traces_after_new_values": n1, "traces_after_new_eps": n2,
               "code": "apply_ln(LayerNorm(ones, zeros), x)             # trace 1\napply_ln(LayerNorm(2 * ones, zeros), x)         # new values: cache hit\napply_ln(LayerNorm(ones, zeros, eps=1e-6), x)   # eps is aux data: new treedef, trace 2"}


class BadAux:                                         # aux data that is a NumPy array: not hashable
    def __init__(self, w, table):
        self.w, self.table = w, table


tu.register_pytree_node(BadAux, lambda m: ((m.w,), m.table), lambda t, ch: BadAux(ch[0], t))
f_bad = jax.jit(lambda m: m.w * 2)
R["static"]["unhashable_aux_first_call"] = J.err(lambda: f_bad(BadAux(jnp.ones(2), np.arange(3)))) or "ok"
R["static"]["unhashable_aux_second_call"] = J.err(lambda: f_bad(BadAux(jnp.ones(2), np.arange(3))), 3)


class Plain:                                          # not registered: one opaque leaf
    def __init__(self, w):
        self.w = w


R["unregistered"] = {
    "leaves": [type(v).__name__ for v in jax.tree.leaves({"m": Plain(jnp.ones(2))})],
    "jit_error": J.err(lambda: jax.jit(lambda m: m.w * 2)(Plain(jnp.ones(2))), 2),
    "grad_error": J.err(lambda: jax.grad(lambda m: (m.w ** 2).sum())(Plain(jnp.ones(2))), 2),
}

# ---------------------------------------------------------------- 3. None, empty containers, is_leaf
t = {"a": None, "b": (), "c": [jnp.ones(1), None], "d": {"e": jnp.zeros(1)}}
R["none"] = {
    "leaves": len(jax.tree.leaves(t)),
    "treedef": str(jax.tree.structure(t)),
    "map_keeps_none": str(jax.tree.map(lambda v: v + 1, t)),
    "leaves_with_none_as_leaf": len(jax.tree.leaves(t, is_leaf=lambda v: v is None)),
}
pairs = [(jnp.ones(2), jnp.zeros(2)), (jnp.ones(3), jnp.zeros(3))]
R["is_leaf"] = {
    "default_leaves": len(jax.tree.leaves(pairs)),
    "tuples_as_leaves": len(jax.tree.leaves(pairs, is_leaf=lambda v: isinstance(v, tuple))),
}
# transpose: a list of per-step pytrees into a pytree of lists
steps = [{"loss": 1.0, "acc": 0.1}, {"loss": 0.8, "acc": 0.2}, {"loss": 0.7, "acc": 0.3}]
R["transpose"] = {"in": str(steps), "out": str(jax.tree.transpose(jax.tree.structure([0, 0, 0]), jax.tree.structure(steps[0]), steps))}
R["reduce"] = {"n_params": int(jax.tree.reduce(lambda a, b: a + b, jax.tree.map(lambda v: v.size, params))),
               "code": "jax.tree.reduce(lambda a, b: a + b, jax.tree.map(lambda v: v.size, params))"}
R["map_with_path"] = {"code": "jax.tree_util.tree_map_with_path(lambda path, v: jax.tree_util.keystr(path).endswith(\"['w']\"), params)",
                      "n_true": int(sum(jax.tree.leaves(tu.tree_map_with_path(lambda pth, v: tu.keystr(pth).endswith("['w']"), params))))}

# ---------------------------------------------------------------- 4. the running example's tree and the cost of flattening it
leaves, td = tu.tree_flatten(params)
reps = 2000
t0 = time.perf_counter()
for _ in range(reps):
    tu.tree_flatten(params)
t_flat = (time.perf_counter() - t0) / reps
t0 = time.perf_counter()
for _ in range(reps):
    tu.tree_unflatten(td, leaves)
t_unflat = (time.perf_counter() - t0) / reps
t0 = time.perf_counter()
for _ in range(reps):
    jax.tree.map(lambda v: v, params)
t_map = (time.perf_counter() - t0) / reps
R["running_example"] = {"n_leaves": len(leaves), "treedef_head": str(td)[:300], "num_nodes": td.num_nodes,
                        "flatten_us": t_flat * 1e6, "unflatten_us": t_unflat * 1e6, "identity_map_us": t_map * 1e6,
                        "label": J.LABEL, "load": J.load1()}
# jit dispatch with the whole pytree (C++ fast path flattens on every call)
f = jax.jit(lambda p: p["head"]["w"][0, 0])
f(params).block_until_ready()
ts = []
for _ in range(200):
    t0 = time.perf_counter()
    f(params)
    ts.append(time.perf_counter() - t0)
R["running_example"]["jit_call_with_69_leaves_us"] = J.median(ts) * 1e6
g = jax.jit(lambda w: w[0, 0])
w = params["head"]["w"]
g(w).block_until_ready()
ts = []
for _ in range(200):
    t0 = time.perf_counter()
    g(w)
    ts.append(time.perf_counter() - t0)
R["running_example"]["jit_call_with_1_leaf_us"] = J.median(ts) * 1e6

# ---------------------------------------------------------------- 5. mismatched structures and flatten_util
from jax.flatten_util import ravel_pytree  # noqa: E402
flat, unravel = ravel_pytree(params)
R["ravel"] = {"shape": list(flat.shape), "roundtrip_equal": bool(all(jnp.array_equal(a, b) for a, b in zip(jax.tree.leaves(unravel(flat)), leaves)))}
R["mismatch"] = J.err(lambda: jax.tree.map(lambda a, b: a + b, {"w": 1.0, "b": 2.0}, {"w": 1.0}), 4)
R["list_vs_tuple"] = J.err(lambda: jax.tree.map(lambda a, b: a + b, [1.0, 2.0], (1.0, 2.0)), 4)
J.save("pytree", R)
