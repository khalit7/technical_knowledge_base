"""Sharding annotations on NNX parameters, on 8 simulated CPU devices (training_stack page, section 2.7).

The running example with logical axis names on every Linear kernel and embedding (nnx.with_partitioning),
a (2, 4) mesh ('data', 'model'), rules mapping logical names to mesh axes (nnx.logical_axis_rules),
eager sharding at creation, the optimizer state's sharding, and the collectives XLA inserts into one train step.
Run: XLA_FLAGS=--xla_force_host_platform_device_count=8 JAX_PLATFORMS=cpu nice -n 15 python -I -B ts_nnx_shard.py
Output: out/nnx_shard.json
"""
import collections
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import ts_common as T  # noqa: E402

import jax  # noqa: E402
import jax.numpy as jnp  # noqa: E402
import numpy as np  # noqa: E402
import optax  # noqa: E402
from flax import nnx  # noqa: E402
from jax.sharding import PartitionSpec as P  # noqa: E402

import model_nnx as MN  # noqa: E402

C = T.C
CFG = C.CFG
assert len(jax.devices()) == 8, "needs XLA_FLAGS=--xla_force_host_platform_device_count=8"
from ts_sharded_model import RULES, ShardedLM  # noqa: E402

mesh = jax.make_mesh((2, 4), ("data", "model"), axis_types=(jax.sharding.AxisType.Auto,) * 2)
R = {"versions": T.versions(), "mesh": {"shape": [2, 4], "axes": ["data", "model"]}, "rules": [list(r) for r in RULES],
     "eager_sharding_default": bool(nnx.using_eager_sharding())}


def pstr(path):
    return ".".join(str(getattr(k, "key", getattr(k, "idx", k))) for k in path)


with jax.set_mesh(mesh), nnx.logical_axis_rules(RULES):
    model = ShardedLM(CFG, rngs=nnx.Rngs(0))
    rows = []
    for path, v in nnx.to_flat_state(nnx.state(model, nnx.Param)):
        arr = v[...]
        meta = v.get_metadata() if hasattr(v, "get_metadata") else {}
        names = meta.get("sharding_names", meta.get("out_sharding", meta.get("sharding")))
        shard = arr.addressable_shards[0].data.shape
        rows.append({"path": pstr(path), "shape": list(arr.shape), "logical": list(names) if names else None,
                     "spec": str(arr.sharding.spec), "shard": list(shard),
                     "devices_holding_copy": int(sum(1 for s in arr.addressable_shards if s.index == arr.addressable_shards[0].index))})
    R["params"] = rows
    R["metadata_keys_example"] = sorted(model.blocks[0].mlp.fc1.kernel.get_metadata().keys())
    pspec = nnx.get_partition_spec(nnx.state(model, nnx.Param))
    _k = pspec["blocks"][0]["mlp"]["fc1"]["kernel"]
    R["get_partition_spec_fc1"] = str(_k.get_value() if hasattr(_k, "get_value") else _k)

    opt = nnx.Optimizer(model, optax.adamw(1e-3), wrt=nnx.Param)
    orow = []
    for path, v in nnx.to_flat_state(nnx.state(opt)):
        p = pstr(path)
        if "blocks.0.mlp.fc1.kernel" in p or p.endswith("count"):
            a = v[...]
            orow.append({"path": p, "shape": list(a.shape), "spec": str(getattr(a.sharding, "spec", a.sharding)),
                         "shard": list(a.addressable_shards[0].data.shape)})
    R["opt_rows"] = orow

    @nnx.jit
    def train_step(model, opt, x, y):
        def loss_fn(m):
            return optax.softmax_cross_entropy_with_integer_labels(m(x), y).mean()
        loss, g = nnx.value_and_grad(loss_fn)(model)
        opt.update(model, g)
        return loss

    xb, yb = C.batch(0)
    ds = jax.sharding.NamedSharding(mesh, P("data", None))
    xb, yb = jax.device_put(jnp.asarray(xb), ds), jax.device_put(jnp.asarray(yb), ds)
    loss = float(train_step(model, opt, xb, yb))
    R["loss_step0"] = loss
    gd, st = nnx.split((model, opt))

    def pure(st, x, y):
        m, o = nnx.merge(gd, st)
        l = train_step(m, o, x, y)
        return l, nnx.state((m, o))

    hlo = jax.jit(pure).lower(st, xb, yb).compile().as_text()
    ops = collections.Counter(re.findall(r"= \S+ (all-reduce|all-gather|reduce-scatter|all-to-all|collective-permute)(?:-start)?\(", hlo))
    R["collectives"] = dict(ops)
    R["fc1_after_step_spec"] = str(model.blocks[0].mlp.fc1.kernel[...].sharding.spec)

# the same model created without a mesh: annotations stay as metadata, arrays on one device
R["no_mesh_error"] = T.err_text(lambda: ShardedLM(CFG, rngs=nnx.Rngs(0)))
with nnx.use_eager_sharding(False):
    m1 = ShardedLM(CFG, rngs=nnx.Rngs(0))
    R["no_mesh_eager_off"] = {"fc1_sharding": str(m1.blocks[0].mlp.fc1.kernel[...].sharding), "metadata": {k: str(v) for k, v in m1.blocks[0].mlp.fc1.kernel.get_metadata().items()}}
T.save("nnx_shard", R)
print({k: R[k] for k in ("collectives", "loss_step0", "eager_sharding_default", "no_mesh_error", "no_mesh_eager_off", "metadata_keys_example")})
for r in rows[:12]:
    print(r)
print(orow)
