"""Same key, same numbers, on any number of devices? Run with 8 simulated CPU devices:
XLA_FLAGS=--xla_force_host_platform_device_count=8 JAX_PLATFORMS=cpu ... run_prng8.py
Draws jax.random.normal(key, (8, 4096)) on one device and inside jit with the output sharded over
8 devices (rows) and over a (2, 4) mesh, under jax_threefry_partitionable True (the default) and False.
Output: out/prng8.json"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import xfcommon as X  # noqa: E402

import jax  # noqa: E402
import numpy as np  # noqa: E402
from jax.sharding import NamedSharding, PartitionSpec as P  # noqa: E402

assert jax.device_count() == 8, jax.devices()
res = {"versions": X.versions(), "devices": jax.device_count()}
for part in (True, False):
    jax.config.update("jax_threefry_partitionable", part)
    key = jax.random.key(42)
    one = np.asarray(jax.jit(lambda k: jax.random.normal(k, (8, 4096)))(key))
    m1 = jax.make_mesh((8,), ("d",))
    rows = jax.jit(lambda k: jax.random.normal(k, (8, 4096)), out_shardings=NamedSharding(m1, P("d", None)))(key)
    m2 = jax.make_mesh((2, 4), ("a", "b"))
    grid = jax.jit(lambda k: jax.random.normal(k, (8, 4096)), out_shardings=NamedSharding(m2, P("a", "b")))(key)
    res[f"partitionable={part}"] = {
        "rows_shards": len(rows.addressable_shards), "grid_shard_shape": list(grid.addressable_shards[0].data.shape),
        "max_diff_rows_vs_one": float(np.abs(np.asarray(rows) - one).max()),
        "max_diff_grid_vs_one": float(np.abs(np.asarray(grid) - one).max()),
        "first3": one[0, :3].round(4).tolist(),
    }
    res[f"one_{part}"] = one
same_alg = float(np.abs(res.pop("one_True") - res.pop("one_False")).max())
res["max_diff_between_modes"] = same_alg
print(res)
X.save("prng8", res)
