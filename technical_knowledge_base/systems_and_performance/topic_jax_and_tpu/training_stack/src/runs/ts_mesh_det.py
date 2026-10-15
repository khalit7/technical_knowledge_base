"""Determinism probe for ts_ckpt_mesh.py: the same 20 steps on the same mesh, twice in one process and
once more after re-building everything; are the results bitwise equal? Output: out/mesh_det.json.

Original docstring follows. Save sharded on one mesh, restore onto other meshes, keep training (training_stack Resume lab, part 2).

8 simulated CPU devices. The running example with logical sharding annotations (ts_sharded_model.py), the
running example's optimizer, training batches split over 'data'. Mesh A is (data 2, model 4).
  1. Train 40 steps on A without stopping (reference).
  2. Train 20 steps on A, save {model, optimizer} with orbax.
  3. For each target layout (A again; (8, 1); (1, 8); one device): build the model there, restore into its
     shardings, check every restored array equals what was saved (bit for bit), train steps 20..39,
     compare with the reference.
Run: XLA_FLAGS=--xla_force_host_platform_device_count=8 JAX_PLATFORMS=cpu nice -n 15 python -I -B ts_ckpt_mesh.py
Output: out/ckpt_mesh.json
"""
import os
import shutil
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import ts_common as T  # noqa: E402

import jax  # noqa: E402
import jax.numpy as jnp  # noqa: E402
import numpy as np  # noqa: E402
import orbax.checkpoint as ocp  # noqa: E402
from flax import nnx  # noqa: E402
from jax.sharding import NamedSharding, PartitionSpec as P  # noqa: E402

import model_nnx as MN  # noqa: E402
from ts_sharded_model import RULES, ShardedLM  # noqa: E402

C = T.C
CFG = C.CFG
assert len(jax.devices()) == 8
TOTAL, SAVE_AT = 40, 20
CK = T.scratch("ckpt_mesh")
AUTO = jax.sharding.AxisType.Auto
LAYOUTS = {"A (2 x 4)": (2, 4), "(8 x 1)": (8, 1), "(1 x 8)": (1, 8), "one device": None}
init_sd = dict(np.load(C.path("data", "init_torch.npz")))
plain = MN.from_torch(MN.make_model(CFG), init_sd)
INIT = jax.device_get(nnx.state(plain, nnx.Param))


def mesh_for(shape):
    if shape is None:
        return jax.make_mesh((1, 1), ("data", "model"), axis_types=(AUTO, AUTO), devices=jax.devices()[:1])
    return jax.make_mesh(shape, ("data", "model"), axis_types=(AUTO, AUTO))


def build(mesh):
    with jax.set_mesh(mesh), nnx.logical_axis_rules(RULES):
        m = ShardedLM(CFG, rngs=nnx.Rngs(0))
        st = nnx.state(m, nnx.Param)
        leaves, treedef = jax.tree.flatten(st)          # same paths, different metadata: match leaf by leaf
        init_leaves = jax.tree.leaves(INIT)
        assert [l.shape for l in leaves] == [l.shape for l in init_leaves]
        placed = jax.tree.unflatten(treedef, [jax.device_put(a, v.sharding) for a, v in zip(init_leaves, leaves)])
        nnx.update(m, placed)
        opt = MN.make_optimizer(m, CFG)

        @nnx.jit
        def step(m, o, x, y):
            loss, g = nnx.value_and_grad(MN.loss_fn)(m, x, y)
            o.update(m, g)
            return loss
    return m, opt, step


def train(mesh, m, opt, step, a, b):
    ds = NamedSharding(mesh, P("data", None))
    out = []
    with jax.set_mesh(mesh):
        for i in range(a, b):
            x, y = C.batch(i)
            out.append(float(step(m, opt, jax.device_put(jnp.asarray(x), ds), jax.device_put(jnp.asarray(y), ds))))
    return out


def flat(m, opt):
    return [np.asarray(a) for a in jax.tree.leaves(nnx.state(m, nnx.Param))] + \
           [np.asarray(a) for a in jax.tree.leaves(nnx.state(opt, nnx.Not(nnx.Param)))]



R = {}
mesh = mesh_for((2, 4))
m, o, s = build(mesh)
fresh = [(str(getattr(x.sharding, "spec", x.sharding))) for x in jax.tree.leaves(nnx.state(m, nnx.Param))] + [str(getattr(x.sharding, "spec", x.sharding)) for x in jax.tree.leaves(nnx.state(o, nnx.Not(nnx.Param)))]
train(mesh, m, o, s, 0, 3)
after = [(str(getattr(x.sharding, "spec", x.sharding))) for x in jax.tree.leaves(nnx.state(m, nnx.Param))] + [str(getattr(x.sharding, "spec", x.sharding)) for x in jax.tree.leaves(nnx.state(o, nnx.Not(nnx.Param)))]
paths = [".".join(str(getattr(k, "key", k)) for k in p) for p, _ in jax.tree_util.tree_flatten_with_path(nnx.state(m, nnx.Param))[0]] + ["opt." + ".".join(str(getattr(k, "key", k)) for k in p) for p, _ in jax.tree_util.tree_flatten_with_path(nnx.state(o, nnx.Not(nnx.Param)))[0]]
diff = [[p, a, b] for p, a, b in zip(paths, fresh, after) if a != b]
R["sharding_changed_by_training"] = {"n_leaves": len(paths), "n_changed": len(diff), "examples": diff[:12]}
print(R["sharding_changed_by_training"], flush=True)
for name, shape in (("A (2 x 4)", (2, 4)), ("one device", None)):
    mesh = mesh_for(shape)
    runs = []
    for rep in range(3):
        m, o, s = build(mesh)
        l = train(mesh, m, o, s, 0, 20)
        runs.append((l, flat(m, o)))
    R[name] = {"losses_equal_01": runs[0][0] == runs[1][0], "losses_equal_02": runs[0][0] == runs[2][0],
               "params_bitwise_01": all(np.array_equal(a, b) for a, b in zip(runs[0][1], runs[1][1])),
               "params_bitwise_02": all(np.array_equal(a, b) for a, b in zip(runs[0][1], runs[2][1])),
               "param_maxdiff_01": float(max(np.abs(a.astype(np.float64) - b.astype(np.float64)).max() for a, b in zip(runs[0][1][:69], runs[1][1][:69])))}
    print(name, R[name], flush=True)
T.save("mesh_det", R)
