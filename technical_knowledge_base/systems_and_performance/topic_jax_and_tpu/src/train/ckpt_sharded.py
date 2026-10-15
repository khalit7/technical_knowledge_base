"""A sharded checkpoint on 8 simulated CPU devices: save the running example's parameters sharded over a
(2, 4) mesh, restore them onto a different layout (an 8-way split of the other axis, and a single device),
and check every value survives. Orbax writes each shard from the device that holds it and reshards on restore
when the target sharding differs.
Run: XLA_FLAGS=--xla_force_host_platform_device_count=8 JAX_PLATFORMS=cpu nice -n 15 \
     $JX_SCRATCH/venv/bin/python -I -B ckpt_sharded.py
"""
import json
import os
import shutil
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "..", "data"))
os.environ.setdefault("JAX_PLATFORMS", "cpu")
import numpy as np
import jax
import orbax.checkpoint as ocp
from jax.sharding import NamedSharding, PartitionSpec as P

import common as C
import model_jax as MJ

assert len(jax.devices()) == 8, "needs XLA_FLAGS=--xla_force_host_platform_device_count=8"
params = MJ.from_torch(dict(np.load(C.path("data", "final_torch_500.npz"))), C.CFG)
mesh = jax.make_mesh((2, 4), ("data", "model"))


def spec(x):        # 2-D weights split over both axes when divisible; everything else replicated
    if x.ndim == 2 and x.shape[0] % 2 == 0 and x.shape[1] % 4 == 0:
        return P("data", "model")
    return P()


saved = jax.tree.map(lambda x: jax.device_put(x, NamedSharding(mesh, spec(x))), params)
w = saved["blocks"][0]["mlp"]["fc1"]["w"]
out = {"mesh": dict(mesh.shape), "example": "blocks[0].mlp.fc1.w", "global_shape": list(w.shape),
       "saved_shard_shapes": sorted({str(tuple(s.data.shape)) for s in w.addressable_shards}),
       "saved_spec": str(w.sharding.spec),
       "head_w_spec": str(saved["head"]["w"].sharding.spec), "head_w_shape": list(saved["head"]["w"].shape)}

CK = C.path("train", "ckpt_sharded")
shutil.rmtree(CK, ignore_errors=True)
ckptr = ocp.StandardCheckpointer()
ckptr.save(os.path.join(CK, "p"), saved)
ckptr.wait_until_finished()

# restore 1: an 8-way split of the second axis on a 1-D mesh of all 8 devices
mesh8 = jax.make_mesh((8,), ("x",))
tgt8 = jax.tree.map(lambda x: jax.ShapeDtypeStruct(x.shape, x.dtype, sharding=NamedSharding(
    mesh8, P(None, "x") if (x.ndim == 2 and x.shape[1] % 8 == 0) else P())), params)
r8 = ckptr.restore(os.path.join(CK, "p"), tgt8)
w8 = r8["blocks"][0]["mlp"]["fc1"]["w"]
out["restored_8way_spec"] = str(w8.sharding.spec)
out["restored_8way_shard_shapes"] = sorted({str(tuple(s.data.shape)) for s in w8.addressable_shards})
# restore 2: everything on one device
d0 = jax.sharding.SingleDeviceSharding(jax.devices()[0])
tgt1 = jax.tree.map(lambda x: jax.ShapeDtypeStruct(x.shape, x.dtype, sharding=d0), params)
r1 = ckptr.restore(os.path.join(CK, "p"), tgt1)
eq = lambda a, b: all(np.array_equal(np.asarray(x), np.asarray(y)) for x, y in zip(jax.tree.leaves(a), jax.tree.leaves(b)))
out["equal_after_8way_restore"] = eq(params, r8)
out["equal_after_1device_restore"] = eq(params, r1)
out["n_leaves"] = len(jax.tree.leaves(params))
out["devices"] = [str(d) for d in jax.devices()]
size = sum(os.path.getsize(os.path.join(r, f)) for r, _, fs in os.walk(CK) for f in fs)
out["checkpoint_bytes"] = size
out["param_bytes"] = int(sum(x.size * 4 for x in jax.tree.leaves(params)))
json.dump(out, open(os.path.join(HERE, "out", "ckpt_sharded.json"), "w"), indent=1)
print(json.dumps(out, indent=1))
shutil.rmtree(CK, ignore_errors=True)
