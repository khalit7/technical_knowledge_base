"""Pure functions, immutable arrays, PRNG keys, pytrees and the common footguns, each run for real
(JAX next to PyTorch where there is a counterpart). Output: out/basics.json"""
import contextlib
import io
import re
import os
import sys
import time
import warnings

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import xfcommon as X  # noqa: E402

import jax  # noqa: E402
import jax.numpy as jnp  # noqa: E402
import numpy as np  # noqa: E402
import torch  # noqa: E402

import common as C  # noqa: E402
import model_jax as MJ  # noqa: E402
import model_nnx as MN  # noqa: E402

torch.set_num_threads(4)
cfg = C.CFG
out = {"versions": X.versions(), "torch": torch.__version__}
L = lambda a: np.asarray(a).round(4).tolist()  # noqa: E731

# ------------------------------------------------------------ side effects run once, at trace time
log = []
count = [0]


@jax.jit
def f_side(x):
    count[0] += 1                 # a Python side effect
    log.append(x)                 # keeps a reference to a tracer
    jax.debug.print("debug.print sees x[0] = {v}", v=x[0])
    return x * 2


buf = io.StringIO()
with contextlib.redirect_stdout(buf):
    for i in range(3):
        f_side(jnp.full(4, float(i))).block_until_ready()
    jax.effects_barrier()
out["side"] = {"calls": 3, "count": count[0], "log_len": len(log), "log0": X.scrub(repr(log[0])),
               "debug_print": buf.getvalue().strip().splitlines(),
               "leak": X.first_lines(X.err(lambda: (log[0] + 1)), 3)}


@jax.jit
def f_rand(x):
    return x + np.random.rand()   # NumPy's generator runs once, while tracing


np.random.seed(0)
out["np_random_in_jit"] = [round(float(f_rand(jnp.zeros(()))), 6) for _ in range(3)]


@jax.jit
def f_time(x):
    return x + time.time()        # read once, baked in as a constant


a = float(f_time(jnp.zeros((), jnp.float32)))
time.sleep(0.05)
b = float(f_time(jnp.zeros((), jnp.float32)))
out["time_in_jit_same"] = a == b

# ------------------------------------------------------------ immutable arrays
x = jnp.arange(5.0)
out["immut"] = {
    "setitem": X.first_lines(X.err(lambda: x.__setitem__(0, 9.0)), 2),
    "set": L(x.at[0].set(9.0)), "x_after": L(x),
    "add": L(x.at[1:3].add(10.0)), "mul": L(x.at[-1].multiply(2.0)), "max": L(x.at[0].max(3.0)),
    "dup_add": L(x.at[jnp.array([0, 0, 0])].add(1.0)),
    "get_fill": L(x.at[jnp.array([1, 7])].get(mode="fill", fill_value=-1.0)),
}
tx = torch.arange(5.0)
tx[0] = 9.0
tdup = torch.arange(5.0)
tdup[torch.tensor([0, 0, 0])] += 1.0          # buffered: the repeated index is NOT accumulated
tacc = torch.arange(5.0).index_put((torch.tensor([0, 0, 0]),), torch.tensor(1.0), accumulate=True)
out["immut_torch"] = {"setitem": L(tx.numpy()), "dup_iadd": L(tdup.numpy()), "index_put_accumulate": L(tacc.numpy())}

# out-of-bounds: JAX clamps gathers and drops scatters, PyTorch raises
out["oob"] = {"jax_get": float(x[10]), "jax_get_neg": float(x[-10]), "jax_set": L(x.at[10].set(99.0)),
              "jax_get_jit": float(jax.jit(lambda v, i: v[i])(x, 10)),
              "torch_get": X.first_lines(X.err(lambda: torch.arange(5.0)[10]), 1)}

# ------------------------------------------------------------ randomness: a global generator against keys
torch.manual_seed(0)
t1, t2 = torch.randn(3), torch.randn(3)
k = jax.random.key(0)
j1, j2 = jax.random.normal(k, (3,)), jax.random.normal(k, (3,))
k1, k2 = jax.random.split(k)
ks = jax.random.split(k, 4)
out["prng"] = {
    "torch_two_calls": [L(t1), L(t2)], "jax_same_key_twice": [L(j1), L(j2)],
    "key_repr": X.scrub(repr(k)), "key_typeof": str(jax.typeof(k)),
    "legacy_repr": X.scrub(repr(jax.random.PRNGKey(0))),
    "key_data": jax.random.key_data(k).tolist(),
    "split": [jax.random.key_data(k1).tolist(), jax.random.key_data(k2).tolist()],
    "split_normals": [L(jax.random.normal(k1, (3,))), L(jax.random.normal(k2, (3,)))],
    "split4_shape": list(ks.shape),
    "fold_in": [L(jax.random.normal(jax.random.fold_in(k, s), (3,))) for s in (0, 1, 2)],
    "partitionable_default": bool(jax.config.jax_threefry_partitionable),
}
# key reuse: dropout masks for two layers drawn from the same key are identical
m1 = jax.random.bernoulli(k, 0.9, (4096,))
m2 = jax.random.bernoulli(k, 0.9, (4096,))
m3 = jax.random.bernoulli(k2, 0.9, (4096,))
out["prng"]["reuse_same_mask_frac"] = float((m1 == m2).mean())
out["prng"]["split_same_mask_frac"] = float((m1 == m3).mean())

# ------------------------------------------------------------ pytrees: the running example's parameters
sd = dict(np.load(C.path("data", "init_torch.npz")))
params = MJ.from_torch(sd, cfg)
flat, treedef = jax.tree_util.tree_flatten_with_path(params)
leaves = [{"path": jax.tree_util.keystr(p), "shape": list(v.shape), "dtype": str(v.dtype), "size": int(v.size)}
          for p, v in flat]
out["pytree"] = {"n_leaves": len(leaves), "n_params": sum(l["size"] for l in leaves), "leaves": leaves,
                 "treedef_head": str(treedef)[:300], "n_torch_tensors": len(sd),
                 "torch_names_first": list(sd)[:6]}
# NNX: the same model as a module; nnx.split gives (graphdef, state) and state is a pytree
from flax import nnx  # noqa: E402

model = MN.from_torch(MN.make_model(cfg), sd)
gdef, state = nnx.split(model)
nflat = jax.tree_util.tree_flatten_with_path(state)[0]
out["pytree"]["nnx_n_leaves"] = len(nflat)
out["pytree"]["nnx_paths_first"] = [jax.tree_util.keystr(p) for p, _ in nflat[:6]]
out["pytree"]["nnx_n_params"] = int(sum(v.size for _, v in nflat))

# what counts as a leaf
class Opaque:
    def __init__(self):
        self.w = jnp.ones(2)


from dataclasses import dataclass  # noqa: E402


@jax.tree_util.register_dataclass
@dataclass
class Pair:
    w: jax.Array
    b: jax.Array


obj = {"tuple": (1.0, 2.0), "none": None, "str": "adam", "opaque": Opaque(), "pair": Pair(jnp.ones(2), jnp.zeros(2)),
       "list": [jnp.ones(3)], "empty": {}}
lv = jax.tree_util.tree_flatten_with_path(obj)[0]
out["leafdemo"] = [{"path": jax.tree_util.keystr(p), "leaf": re.sub(r" at 0x[0-9a-f]+", "", X.scrub(type(v).__name__ + (": " + repr(v) if not hasattr(v, "shape") else " " + str(jax.typeof(v)))))} for p, v in lv]
out["leafdemo_n"] = len(lv)
sgd = jax.tree.map(lambda p: p - 0.1 * p, params)
out["tree_map_sgd_same_structure"] = jax.tree.structure(sgd) == jax.tree.structure(params)
out["tree_map_mismatch"] = X.first_lines(X.err(lambda: jax.tree.map(lambda a, b: a + b, params, dict(params, extra=1.0))), 7)
out["param_bytes"] = int(sum(v.size * v.dtype.itemsize for _, v in flat))
group = {}
for l in leaves:
    g = l["path"].split("]")[0] + "]"
    if l["path"].startswith("['blocks']"):
        g = "['blocks'][i]"
    group[g] = group.get(g, 0) + l["size"]
out["pytree"]["groups"] = group

# ------------------------------------------------------------ footguns with real messages
def where_sqrt(v):
    return jnp.where(v > 0, jnp.sqrt(v), 0.0)


def where_sqrt_safe(v):
    safe = jnp.where(v > 0, v, 1.0)               # the double-where trick
    return jnp.where(v > 0, jnp.sqrt(safe), 0.0)


tv = torch.tensor(0.0, requires_grad=True)
torch.where(tv > 0, torch.sqrt(tv), torch.tensor(0.0)).backward()
with warnings.catch_warnings(record=True) as w:
    warnings.simplefilter("always")
    a64 = jnp.array(1.0, dtype=jnp.float64)
    wmsg = X.scrub(str(w[0].message)) if w else None
out["footguns"] = {
    "where_nan_jax": float(jax.grad(where_sqrt)(0.0)), "where_nan_torch": float(tv.grad),
    "where_safe_jax": float(jax.grad(where_sqrt_safe)(0.0)),
    "nonscalar_grad": X.first_lines(X.err(lambda: jax.grad(lambda v: v * 2)(jnp.ones(3))), 2),
    "int_grad": X.first_lines(X.err(lambda: jax.grad(lambda v: v * 2)(3)), 2),
    "unhashable_static": X.first_lines(X.err(lambda: jax.jit(lambda v, s: v * len(s), static_argnums=1)(jnp.ones(2), [1, 2])), 2),
    "f64_dtype": str(a64.dtype), "f64_warning": X.first_lines(wmsg, 2),
}

# asynchronous dispatch: timing without block_until_ready measures only the dispatch
mm = jax.jit(lambda a: a @ a)
A = jnp.ones((1024, 1024))
mm(A).block_until_ready()
ta, tb = [], []
for _ in range(9):
    t0 = time.perf_counter(); r = mm(A); ta.append(time.perf_counter() - t0); r.block_until_ready()
    t0 = time.perf_counter(); mm(A).block_until_ready(); tb.append(time.perf_counter() - t0)
out["async"] = {"no_block_ms": round(1e3 * X.median(ta), 3), "block_ms": round(1e3 * X.median(tb), 2),
                "label": "measured on Apple M1 Pro (CPU), shared machine, 4 threads, low priority; median of 9; 1024x1024 float32 matmul"}
X.save("basics", out)
print({k: v for k, v in out.items() if k not in ("pytree",)})
