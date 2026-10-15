"""PRNG in depth: typed keys against raw uint32 keys, the six implementations in jax 0.11.2 (key shapes,
streams, speed on CPU), what split and normal trace to, prefix stability across shapes, fold_in,
and the key-reuse checker. Writes out/prng.json.

JAX_PLATFORMS=cpu OMP_NUM_THREADS=4 nice -n 15 $JX_SCRATCH/venv/bin/python -I -B run_prng.py
"""
import os
import sys
import time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import jccommon as J  # noqa: E402
import numpy as np  # noqa: E402
import jax  # noqa: E402
import jax.numpy as jnp  # noqa: E402
from jax._src.random import prng as P  # noqa: E402
from jaxpr_export import count_eqns, prim_counts  # noqa: E402

R = {"versions": J.versions(), "label": J.LABEL}

# ---------------------------------------------------------------- 1. typed and raw keys
k = jax.random.key(0)
kr = jax.random.PRNGKey(0)
R["keys"] = {
    "key(0)": {"repr": repr(k), "dtype": str(k.dtype), "shape": list(k.shape), "typeof": str(jax.typeof(k)),
               "key_data": [int(v) for v in jax.random.key_data(k)]},
    "PRNGKey(0)": {"repr": repr(kr), "dtype": str(kr.dtype), "shape": list(kr.shape), "typeof": str(jax.typeof(kr))},
    "same_stream": bool(jnp.array_equal(jax.random.normal(k, (4,)), jax.random.normal(kr, (4,)))),
    "wrap_roundtrip": bool(jnp.array_equal(jax.random.normal(jax.random.wrap_key_data(jax.random.key_data(k)), (4,)), jax.random.normal(k, (4,)))),
    "add_to_typed_key": J.err(lambda: k + 1, 2),
    "add_to_raw_key": str(kr + 1),
    "split_shapes": {"typed": list(jax.random.split(k, 3).shape), "raw": list(jax.random.split(kr, 3).shape)},
}

# ---------------------------------------------------------------- 2. the implementations
impls = {}
for name in sorted(P.prngs):
    impl = P.prngs[name]
    kk = jax.random.key(0, impl=name)
    f = jax.jit(lambda key: jax.random.normal(key, (1 << 22,)))
    with J.Timer() as tc:
        f(kk).block_until_ready()
    ts = []
    for _ in range(5):
        t0 = time.perf_counter()
        f(kk).block_until_ready()
        ts.append(time.perf_counter() - t0)
    cj = jax.make_jaxpr(lambda key: jax.random.normal(key, (8,)))(kk)
    impls[name] = {"key_shape": list(impl.key_shape), "tag": impl.tag, "dtype": str(kk.dtype),
                   "first3": [round(float(v), 4) for v in jax.random.normal(kk, (3,))],
                   "ms_4M_normals": J.median(ts) * 1e3, "first_call_s": tc.wall,
                   "normal_jaxpr_eqns": count_eqns(cj), "prims": prim_counts(cj)}
    keys8 = jax.random.split(kk, 8)
    vm = jax.vmap(lambda q: jax.random.normal(q, ()))(keys8)
    loop = jnp.stack([jax.random.normal(keys8[i], ()) for i in range(8)])
    impls[name]["vmap_equals_loop"] = bool(jnp.allclose(vm, loop))
    impls[name]["vmap_equals_first_key_batch"] = bool(jnp.allclose(vm, jax.random.normal(keys8[0], (8,))))
R["impls"] = impls
R["impls_load"] = J.load1()
R["default_impl"] = str(jax.config.jax_default_prng_impl)

# ---------------------------------------------------------------- 3. what random.normal traces to
R["normal_jaxpr"] = str(jax.make_jaxpr(lambda key: jax.random.normal(key, (3,)))(k))
R["split_jaxpr"] = str(jax.make_jaxpr(lambda key: jax.random.split(key, 2))(k))
lowered = jax.jit(lambda key: jax.random.bits(key, (3,))).lower(k).as_text()
R["threefry_in_stablehlo"] = {"threefry_calls": lowered.count("threefry2x32"), "lines": len(lowered.splitlines()),
                              "shift_ops": lowered.count("stablehlo.shift_left"), "xor_ops": lowered.count("stablehlo.xor"),
                              "add_ops": lowered.count("stablehlo.add")}

# ---------------------------------------------------------------- 4. prefix stability: is normal(key, (4,))[:3] == normal(key, (3,))?
pref = {}
for part in (True, False):
    jax.config.update("jax_threefry_partitionable", part)
    a = jax.random.normal(k, (3,))
    b = jax.random.normal(k, (4,))[:3]
    c = jax.random.normal(k, (2, 3))[0]
    pref["partitionable=" + str(part)] = {"(4,)[:3] equals (3,)": bool(jnp.array_equal(a, b)),
                                          "(2,3)[0] equals (3,)": bool(jnp.array_equal(a, c))}
jax.config.update("jax_threefry_partitionable", True)
R["prefix"] = pref

# ---------------------------------------------------------------- 5. fold_in and split
s3 = jax.random.split(k, 3)
R["fold_in"] = {
    "fold_in(key, 7) data": [int(v) for v in jax.random.key_data(jax.random.fold_in(k, 7))],
    "split(key, 3) data": [[int(v) for v in jax.random.key_data(s)] for s in s3],
    "fold_in(key, i) == split(key, 3)[i]": [bool(jnp.array_equal(jax.random.key_data(jax.random.fold_in(k, i)), jax.random.key_data(s3[i]))) for i in range(3)],
}

# ---------------------------------------------------------------- 6. key reuse checker
jax.config.update("jax_debug_key_reuse", True)


def reuse(key):
    a = jax.random.normal(key, (2,))
    b = jax.random.uniform(key, (2,))             # same key again
    return a + b


R["key_reuse"] = {"code": "jax.config.update(\"jax_debug_key_reuse\", True)\n\ndef reuse(key):\n    a = jax.random.normal(key, (2,))\n    b = jax.random.uniform(key, (2,))      # the same key twice\n    return a + b\n\njax.jit(reuse)(jax.random.key(0))",
                  "jit_error": J.err(lambda: jax.jit(reuse)(jax.random.key(0)), 2),
                  "eager_error": J.err(lambda: reuse(jax.random.key(0)), 2),
                  "raw_key_checked": J.err(lambda: reuse(jax.random.PRNGKey(0)), 2) or "no error (raw uint32 keys are not tracked)"}
jax.config.update("jax_debug_key_reuse", False)
J.save("prng", R)
