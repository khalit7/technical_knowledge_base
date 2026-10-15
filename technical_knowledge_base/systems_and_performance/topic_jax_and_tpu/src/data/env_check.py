"""Environment check for Topic: jax-and-tpu (CPU only). Writes env_check.json next to this file.

Run twice by setup (the second run with 8 simulated devices):
  JAX_PLATFORMS=cpu $JX_SCRATCH/venv/bin/python -I -B env_check.py
  JAX_PLATFORMS=cpu XLA_FLAGS=--xla_force_host_platform_device_count=8 $JX_SCRATCH/venv/bin/python -I -B env_check.py
Checks: versions, devices, a sharded matmul on a (2, 4) mesh and the collectives in its HLO,
shard_map + psum, Pallas pallas_call with interpret=True, the profiler trace.
"""
import importlib
import json
import os
import re
import sys
import tempfile
import traceback

os.environ.setdefault("JAX_PLATFORMS", "cpu")
import jax
import jax.numpy as jnp
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
R = {"xla_flags": os.environ.get("XLA_FLAGS", ""), "python": sys.version.split()[0]}


def ver(m):
    try:
        mod = importlib.import_module(m)
        return getattr(mod, "__version__", "imported (no __version__)")
    except Exception as e:  # noqa
        return f"FAIL {type(e).__name__}: {e}"[:200]


R["versions"] = {m: ver(m) for m in ("jax", "jaxlib", "flax", "optax", "orbax.checkpoint", "grain", "equinox",
                                     "chex", "numpy", "torch", "xprof", "tensorboard_plugin_profile")}
R["devices"] = [str(d) for d in jax.devices()]
R["device_count"] = jax.device_count()
R["default_backend"] = jax.default_backend()


def attempt(name, fn):
    try:
        R[name] = {"ok": True, **(fn() or {})}
    except Exception as e:  # noqa
        R[name] = {"ok": False, "error": f"{type(e).__name__}: {e}"[:400],
                   "where": traceback.format_exc().strip().splitlines()[-3][:200]}
    print(name, R[name])


def sharded():
    from jax.sharding import Mesh, NamedSharding, PartitionSpec as P
    n = jax.device_count()
    if n < 8:
        return {"skipped": f"{n} device(s)"}
    mesh = jax.make_mesh((2, 4), ("data", "model"))
    x = jax.device_put(jnp.ones((32, 128)), NamedSharding(mesh, P("data", None)))
    w = jax.device_put(jnp.ones((128, 512)), NamedSharding(mesh, P(None, "model")))
    f = jax.jit(lambda x, w: jnp.sum(jax.nn.gelu(x @ w)))
    hlo = f.lower(x, w).compile().as_text()
    colls = {c: len(re.findall(rf"\b{c}(-start)?\(", hlo)) for c in
             ("all-reduce", "all-gather", "reduce-scatter", "all-to-all", "collective-permute")}
    return {"value": float(f(x, w)), "expected": float(jnp.sum(jax.nn.gelu(jnp.ones((32, 128)) @ jnp.ones((128, 512))))),
            "x_shard_shape": list(x.addressable_shards[0].data.shape),
            "w_shard_shape": list(w.addressable_shards[0].data.shape), "collectives_in_hlo": colls}


def smap():
    from jax.sharding import PartitionSpec as P
    n = jax.device_count()
    mesh = jax.make_mesh((n,), ("i",))
    sm = getattr(jax, "shard_map", None)
    where = "jax.shard_map"
    if sm is None:
        from jax.experimental.shard_map import shard_map as sm
        where = "jax.experimental.shard_map.shard_map"
    f = jax.jit(sm(lambda a: jax.lax.psum(a.sum(), "i"), mesh=mesh, in_specs=P("i"), out_specs=P()))
    res = {"api": where}
    try:   # an unsharded input: in jax 0.11 shard_map refuses it instead of resharding silently
        f(jnp.arange(8.0 * n)); res["unsharded_input"] = "accepted"
    except Exception as e:  # noqa
        res["unsharded_input"] = f"{type(e).__name__}: {str(e)[:120]}"
    from jax.sharding import NamedSharding
    a = jax.device_put(jnp.arange(8.0 * n), NamedSharding(mesh, P("i")))
    res.update(value=float(f(a)), expected=float(np.arange(8.0 * n).sum()))
    return res


def pallas():
    from jax.experimental import pallas as pl

    def add_kernel(x_ref, y_ref, o_ref):
        o_ref[...] = x_ref[...] + y_ref[...]

    x = jnp.arange(256.0).reshape(16, 16)
    out = pl.pallas_call(add_kernel, out_shape=jax.ShapeDtypeStruct(x.shape, x.dtype), interpret=True)(x, x)

    def mm_kernel(a_ref, b_ref, o_ref):           # one (bm, bn) output block per grid step
        o_ref[...] = a_ref[...] @ b_ref[...]

    a = jax.random.normal(jax.random.key(0), (256, 128)); b = jax.random.normal(jax.random.key(1), (128, 256))
    mm = pl.pallas_call(mm_kernel, out_shape=jax.ShapeDtypeStruct((256, 256), jnp.float32), grid=(2, 2),
                        in_specs=[pl.BlockSpec((128, 128), lambda i, j: (i, 0)),
                                  pl.BlockSpec((128, 128), lambda i, j: (0, j))],
                        out_specs=pl.BlockSpec((128, 128), lambda i, j: (i, j)), interpret=True)(a, b)
    res = {"add_max_err": float(jnp.abs(out - 2 * x).max()),
           "tiled_matmul_max_err": float(jnp.abs(mm - a @ b).max())}
    try:   # compiled (not interpreted) pallas on CPU: expected to fail, there is no CPU lowering
        pl.pallas_call(add_kernel, out_shape=jax.ShapeDtypeStruct(x.shape, x.dtype))(x, x).block_until_ready()
        res["compiled_on_cpu"] = "ran"
    except Exception as e:  # noqa
        res["compiled_on_cpu"] = f"fails as expected: {type(e).__name__}: {str(e)[:160]}"
    try:
        from jax.experimental.pallas import tpu as pltpu  # noqa
        res["pallas_tpu_module_imports"] = True
    except Exception as e:  # noqa
        res["pallas_tpu_module_imports"] = f"{type(e).__name__}: {e}"[:160]
    return res


def profiler():
    d = tempfile.mkdtemp(prefix="jxprof_", dir=os.environ.get("JX_SCRATCH") or None)
    f = jax.jit(lambda x: jnp.tanh(x @ x).sum())
    x = jnp.ones((256, 256)); f(x).block_until_ready()
    with jax.profiler.trace(d):
        for _ in range(3):
            f(x).block_until_ready()
    files = [os.path.relpath(os.path.join(r, n), d) for r, _, ns in os.walk(d) for n in ns]
    return {"files": [re.sub(r"[^/]+\.(xplane\.pb|trace\.json\.gz)$", r"<host>.\1", p) for p in files],
            "sizes": [os.path.getsize(os.path.join(d, p)) for p in files]}


def compile_basics():
    f = jax.jit(lambda x: jnp.tanh(x @ x).sum())
    c = f.lower(jnp.ones((64, 64))).compile()
    ca = c.cost_analysis()
    ca = ca[0] if isinstance(ca, list) else ca
    ma = c.memory_analysis()
    return {"cost_flops": float(ca.get("flops", -1)) if ca else None,
            "memory_analysis_fields": sorted(a for a in dir(ma) if not a.startswith("_"))[:20] if ma else None}


attempt("compile_basics", compile_basics)
attempt("sharded_matmul_2x4", sharded)
attempt("shard_map_psum", smap)
attempt("pallas_interpret", pallas)
attempt("profiler_trace", profiler)
tag = "8dev" if jax.device_count() == 8 else f"{jax.device_count()}dev"
with open(os.path.join(HERE, f"env_check_{tag}.json"), "w") as fh:
    json.dump(R, fh, indent=1)
print(json.dumps(R["versions"]), R["devices"])
