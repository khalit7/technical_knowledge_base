"""Committed against uncommitted arrays on 8 simulated CPU devices, and vmap's spmd_axis_name.
Writes out/array8.json.

XLA_FLAGS=--xla_force_host_platform_device_count=8 JAX_PLATFORMS=cpu nice -n 15 $JX_SCRATCH/venv/bin/python -I -B run_array8.py
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import jccommon as J  # noqa: E402
import numpy as np  # noqa: E402
import jax  # noqa: E402
import jax.numpy as jnp  # noqa: E402
from jax.sharding import NamedSharding, PartitionSpec as P  # noqa: E402

devs = jax.devices()
R = {"versions": J.versions(), "n_devices": len(devs), "devices": [str(d) for d in devs[:3]] + ["..."]}

host = np.ones(4, np.float32)
a0 = jax.device_put(host, devs[0])          # committed to cpu:0
a3 = jax.device_put(host, devs[3])          # committed to cpu:3
u = jnp.ones(4)                             # uncommitted, on the default device cpu:0
R["placement"] = {
    "a0": {"devices": str(a0.devices()), "committed": bool(a0.committed)},
    "a3": {"devices": str(a3.devices()), "committed": bool(a3.committed)},
    "u": {"devices": str(u.devices()), "committed": bool(u.committed)},
}
r = u + a3
R["uncommitted_follows"] = {"expr": "u + a3", "devices": str(r.devices()), "committed": bool(r.committed)}
R["two_committed_error"] = J.err(lambda: a0 + a3, 6)
R["two_committed_jit_error"] = J.err(lambda: jax.jit(lambda p, q: p + q)(a0, a3), 6)
R["fix"] = {"expr": "jax.device_put(a0, devs[3]) + a3",
            "devices": str((jax.device_put(a0, devs[3]) + a3).devices())}

# ---------------------------------------------------------------- vmap with spmd_axis_name
mesh = jax.make_mesh((8,), ("data",), axis_types=(jax.sharding.AxisType.Auto,))


def per_model(w, x):          # one tiny linear "model": w [128,128], x [16,128]
    h = jnp.tanh(x @ w)
    # the per-model code pins its activation's layout (as model code with sharding annotations does);
    # under vmap this constraint gains a batch dimension, unsharded unless spmd_axis_name names a mesh axis
    h = jax.lax.with_sharding_constraint(h, NamedSharding(mesh, P(None, None)))
    return (h @ w).sum()


ws = jax.random.normal(jax.random.key(0), (8, 128, 128)) * 0.02
xs = jax.random.normal(jax.random.key(1), (8, 16, 128))
ws_s = jax.device_put(ws, NamedSharding(mesh, P("data")))
xs_s = jax.device_put(xs, NamedSharding(mesh, P("data")))
out = {}
R["per_model_src"] = """def per_model(w, x):          # w [128,128], x [16,128]
    h = jnp.tanh(x @ w)
    h = jax.lax.with_sharding_constraint(h, NamedSharding(mesh, P(None, None)))
    return (h @ w).sum()
f = jax.jit(jax.vmap(per_model))                          # or jax.vmap(per_model, spmd_axis_name="data")
y = f(ws, xs)    # ws [8,128,128], xs [8,16,128], both sharded P("data") on an 8-device mesh"""
for name, kw in [("plain vmap", {}), ("vmap spmd_axis_name='data'", {"spmd_axis_name": "data"})]:
    f = jax.jit(jax.vmap(per_model, **kw))
    with jax.set_mesh(mesh):
        y = f(ws_s, xs_s)
        hlo = f.lower(ws_s, xs_s).compile().as_text()
    out[name] = {
        "out_sharding": str(y.sharding.spec) if hasattr(y.sharding, "spec") else str(y.sharding),
        "out_shards": [list(s.data.shape) for s in y.addressable_shards][:2],
        "all_gather": hlo.count("all-gather("), "all_reduce": hlo.count("all-reduce("),
        "all_to_all": hlo.count("all-to-all("), "collective_permute": hlo.count("collective-permute("),
        "dynamic_slice": hlo.count("dynamic-slice("),
        "hlo_lines": len(hlo.splitlines()),
        "constraint_in_jaxpr": [ln.strip() for ln in str(jax.make_jaxpr(jax.vmap(per_model, **kw))(ws_s, xs_s)).splitlines()
                                if "sharding=" in ln or "unconstrained_dims" in ln],
        "max_diff_vs_unsharded": float(jnp.max(jnp.abs(y - jax.vmap(per_model)(ws, xs)))),
    }
R["spmd_axis_name"] = out
J.save("array8", R)
