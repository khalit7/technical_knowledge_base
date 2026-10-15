"""Sharding lab, collectives by hand: jax.shard_map on 8 simulated CPU devices. Each collective
(psum, all_gather, psum_scatter, all_to_all, ppermute) applied to the same small array, with the per-device
input and output and the HLO op it compiles to; then a ring all-reduce written by hand with ppermute
(reduce-scatter phase + all-gather phase, 2(n-1) steps), checked against psum. Also: what shard_map does with an
input sharded differently from in_specs, on an Auto mesh and on an Explicit mesh (the default of jax.make_mesh).

    XLA_FLAGS=--xla_force_host_platform_device_count=8 JAX_PLATFORMS=cpu nice -n 15 \
        $JX_SCRATCH/venv/bin/python -I -B sh_collectives.py
Writes out/collectives.json.
"""
import os
import sys
from functools import partial

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import sh_common as H  # noqa: E402

import jax  # noqa: E402
import jax.numpy as jnp  # noqa: E402
import numpy as np  # noqa: E402
from jax.sharding import AxisType, NamedSharding, PartitionSpec as P  # noqa: E402

N = 8
assert len(jax.devices()) == N
mesh = jax.make_mesh((N,), ("i",), axis_types=(AxisType.Auto,))
res = {"what": "jax.shard_map on 8 simulated CPU devices, jax " + jax.__version__}

# the same input for every collective: device d holds the row [10d, 10d+1, ..., 10d+7]
x_np = (10 * np.arange(N)[:, None] + np.arange(N)[None, :]).astype(np.float32)   # [8, 8], one row per device
x = jax.device_put(x_np, NamedSharding(mesh, P("i", None)))


def smap(fn, out_specs):
    return jax.jit(jax.shard_map(fn, mesh=mesh, in_specs=P("i", None), out_specs=out_specs))


cases = {
    "psum": (lambda b: jax.lax.psum(b, "i"), P(None, None)),
    # out_specs P("i") although every device ends with the same [8, 8]: with P(None, None) shard_map refuses
    # (all_gather's result is typed as varying over "i"; recorded below as "all_gather_replicated_out_specs")
    "all_gather": (lambda b: jax.lax.all_gather(b, "i", axis=0, tiled=True), P("i", None)),
    "psum_scatter": (lambda b: jax.lax.psum_scatter(b, "i", scatter_dimension=1, tiled=True), P("i", None)),
    "all_to_all": (lambda b: jax.lax.all_to_all(b, "i", split_axis=1, concat_axis=0, tiled=True), P("i", None)),
    "ppermute": (lambda b: jax.lax.ppermute(b, "i", perm=[(j, (j + 1) % N) for j in range(N)]), P("i", None)),
}
res["input_per_device"] = x_np.tolist()
res["cases"] = {}
for name, (fn, osp) in cases.items():
    f = smap(fn, osp)
    comp = f.lower(x).compile()
    out = f(x)
    per_dev = {s.device.id: np.asarray(s.data).tolist() for s in out.addressable_shards}
    colls = H.collectives(comp.as_text(), N)
    res["cases"][name] = {"hlo_ops": [[c["kind"], c["bytes"], c["group"]] for c in colls],
                          "out_global_shape": list(out.shape),
                          "out_dev0": per_dev[0], "out_dev1": per_dev[1]}
    print(name, out.shape, [c["kind"] for c in colls], "dev0:", per_dev[0])

try:
    smap(lambda b: jax.lax.all_gather(b, "i", axis=0, tiled=True), P(None, None)).lower(x)
    res["all_gather_replicated_out_specs"] = {"ok": True}
except Exception as e:  # noqa: BLE001
    res["all_gather_replicated_out_specs"] = {"ok": False, "error": H.scrub(f"{type(e).__name__}: {e}")[:700]}
print("all_gather with P(None, None):", res["all_gather_replicated_out_specs"]["ok"])

# ring all-reduce by hand: reduce-scatter then all-gather, each n-1 ppermute steps over chunks of size 1/n


def ring_allreduce(b):                       # b: this device's block [1, N*k]; chunks of k
    me = jax.lax.axis_index("i")
    chunks = b.reshape(N, -1)                # N chunks
    right = [(j, (j + 1) % N) for j in range(N)]
    # phase 1, reduce-scatter: at step s, send chunk (me - s) mod N to the right; add what arrives to chunk (me - s - 1)
    acc = chunks
    for s in range(N - 1):
        send = acc[(me - s) % N]
        recv = jax.lax.ppermute(send, "i", perm=right)
        acc = acc.at[(me - s - 1) % N].add(recv)
    # now chunk (me + 1) mod N holds the full sum on this device
    # phase 2, all-gather: pass the finished chunks round the ring
    for s in range(N - 1):
        send = acc[(me + 1 - s) % N]
        recv = jax.lax.ppermute(send, "i", perm=right)
        acc = acc.at[(me - s) % N].set(recv)
    return acc.reshape(1, -1)


K = 4
big_np = np.random.default_rng(0).standard_normal((N, N * K)).astype(np.float32)
big = jax.device_put(big_np, NamedSharding(mesh, P("i", None)))
f_ring = jax.jit(jax.shard_map(ring_allreduce, mesh=mesh, in_specs=P("i", None), out_specs=P("i", None)))
f_psum = jax.jit(jax.shard_map(lambda b: jax.lax.psum(b, "i"), mesh=mesh, in_specs=P("i", None), out_specs=P("i", None)))
r_ring, r_psum = np.asarray(f_ring(big)), np.asarray(f_psum(big))
c_ring = H.collectives(f_ring.lower(big).compile().as_text(), N)
res["ring"] = {"n": N, "chunk_floats": K, "steps": 2 * (N - 1),
               "max_abs_diff_vs_psum": float(np.abs(r_ring - r_psum).max()),
               "max_abs_diff_vs_numpy": float(np.abs(r_ring - np.tile(big_np.sum(0), (N, 1))).max()),
               "hlo_ops": sorted({c["kind"] for c in c_ring}), "n_permutes": len(c_ring),
               "bytes_per_permute": c_ring[0]["bytes"] if c_ring else None,
               "sent_per_device_bytes": len(c_ring) * (c_ring[0]["bytes"] if c_ring else 0),
               "array_bytes": int(big_np[0].nbytes)}
print("ring", res["ring"])

# shard_map with an input laid out differently from in_specs
x_rep = jax.device_put(x_np, NamedSharding(mesh, P()))
f = jax.jit(jax.shard_map(lambda b: jax.lax.psum(b, "i"), mesh=mesh, in_specs=P("i", None), out_specs=P(None, None)))
try:
    out = f(x_rep)
    c = H.collectives(f.lower(x_rep).compile().as_text(), N)
    res["mismatch_auto"] = {"ok": True, "result_equal": bool(np.allclose(np.asarray(out), x_np.sum(0, keepdims=True))),
                            "hlo_ops": [k["kind"] for k in c]}
except Exception as e:  # noqa: BLE001
    res["mismatch_auto"] = {"ok": False, "error": H.scrub(f"{type(e).__name__}: {e}")[:600]}
print("mismatch auto", res["mismatch_auto"])

mesh_e = jax.make_mesh((N,), ("i",))                    # default axis_types: Explicit in jax 0.11.2
res["make_mesh_default_axis_types"] = [str(t) for t in mesh_e.axis_types]
xe = jax.device_put(x_np, NamedSharding(mesh_e, P()))
fe = jax.jit(jax.shard_map(lambda b: jax.lax.psum(b, "i"), mesh=mesh_e, in_specs=P("i", None), out_specs=P(None, None)))
try:
    fe(xe)
    res["mismatch_explicit"] = {"ok": True}
except Exception as e:  # noqa: BLE001
    res["mismatch_explicit"] = {"ok": False, "error": H.scrub(f"{type(e).__name__}: {e}")[:600]}
with jax.set_mesh(mesh_e):
    xe2 = jax.reshard(xe, P("i", None))
    res["after_reshard_ok"] = bool(np.allclose(np.asarray(fe(xe2)), x_np.sum(0, keepdims=True)))
print("mismatch explicit", res["mismatch_explicit"], res["make_mesh_default_axis_types"], res["after_reshard_ok"])

# pmap still exists (maintenance mode since 0.8.0; implemented over jit(shard_map) since 0.10.0)
import warnings  # noqa: E402
with warnings.catch_warnings(record=True) as w:
    warnings.simplefilter("always")
    pm = jax.pmap(lambda b: jax.lax.psum(b, "i"), axis_name="i")(x_np)
    res["pmap"] = {"runs": True, "equal": bool(np.allclose(np.asarray(pm), np.tile(x_np.sum(0), (N, 1)))),
                   "warnings": [H.scrub(str(m.message))[:200] for m in w]}
print("pmap", res["pmap"])
H.dump("collectives.json", res)
