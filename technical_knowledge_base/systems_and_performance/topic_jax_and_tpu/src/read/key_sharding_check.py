"""Check the Reading tab's claim: the same key gives the same random numbers whatever the device count or sharding.
Run: XLA_FLAGS=--xla_force_host_platform_device_count=8 JAX_PLATFORMS=cpu python -I key_sharding_check.py"""
import jax, jax.numpy as jnp, numpy as np
from jax.sharding import NamedSharding, PartitionSpec as P
print("jax", jax.__version__, "devices", len(jax.devices()), "threefry_partitionable", jax.config.jax_threefry_partitionable)
key = jax.random.key(0)
one = jax.jit(lambda k: jax.random.normal(k, (64, 128)))(key)
for shape in [(8,), (2, 4)]:
    mesh = jax.make_mesh(shape, ("a",) if len(shape) == 1 else ("a", "b"))
    spec = P("a") if len(shape) == 1 else P("a", "b")
    sharded = jax.jit(lambda k: jax.random.normal(k, (64, 128)), out_shardings=NamedSharding(mesh, spec))(key)
    print("mesh", shape, "shards", len(sharded.addressable_shards), "identical to one device:", bool(np.array_equal(np.asarray(one), np.asarray(sharded))))
