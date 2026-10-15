"""Sharding lab, PartitionSpec playground: y = x @ W for the running example's first MLP matmul
(x = the embedded batch 0, [4096 tokens, 128]; W = blocks.0.mlp.fc1.w, [128, 512]) on a 2 x 4 mesh
('data', 'model'), Auto axes (the compiler propagates). Every pair of specs for x and W, with the output left to
the compiler or constrained, compiled for real: per-device shapes, the collectives in the optimised HLO with
their bytes, the output sharding the compiler chose, memory_analysis, and the value checked against numpy.

    XLA_FLAGS=--xla_force_host_platform_device_count=8 JAX_PLATFORMS=cpu nice -n 15 \
        $JX_SCRATCH/venv/bin/python -I -B sh_playground.py
Writes out/playground.json.
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import sh_common as H  # noqa: E402

import jax  # noqa: E402
import numpy as np  # noqa: E402
from jax.sharding import AxisType, NamedSharding, PartitionSpec as P  # noqa: E402

import common as C  # noqa: E402

assert len(jax.devices()) == 8
mesh = jax.make_mesh((2, 4), ("data", "model"), axis_types=(AxisType.Auto,) * 2)

sd = dict(np.load(C.path("data", "init_torch.npz")))
xb, _ = C.batch(0)
x_np = (sd["tok_emb.weight"][xb] + sd["pos_emb.weight"][None, :, :]).reshape(-1, 128).astype(np.float32)  # [4096, 128]
w_np = sd["blocks.0.mlp.fc1.weight"].T.astype(np.float32)                                                 # [128, 512]
ref = x_np.astype(np.float64) @ w_np.astype(np.float64)

XS = [P(), P("data", None), P("model", None), P(None, "model"), P(None, "data"), P("data", "model")]
WS = [P(), P(None, "model"), P("model", None), P("data", None), P(None, "data"), P("data", "model")]
OUTS = [("auto", None), ("data", P("data", None)), ("rep", P())]


def spec_s(p):
    return "P(" + ", ".join("None" if a is None else repr(a) for a in p) + ")"


def tiles(spec, shape):
    """device id -> [row start, row stop, col start, col stop] of the block it holds."""
    m = NamedSharding(mesh, spec).devices_indices_map(shape)
    out = {}
    for d, idx in m.items():
        r, c = idx
        out[d.id] = [r.start or 0, r.stop if r.stop is not None else shape[0], c.start or 0, c.stop if c.stop is not None else shape[1]]
    return out


rows = []
for xs in XS:
    for ws in WS:
        for oname, os_ in OUTS:
            xa = jax.device_put(x_np, NamedSharding(mesh, xs))
            wa = jax.device_put(w_np, NamedSharding(mesh, ws))
            kw = {} if os_ is None else {"out_shardings": NamedSharding(mesh, os_)}
            f = jax.jit(lambda a, b: a @ b, **kw)
            comp = f.lower(xa, wa).compile()
            y = f(xa, wa)
            err = float(np.abs(np.asarray(y, np.float64) - ref).max())
            colls = H.collectives(comp.as_text(), 8)
            outspec = comp.output_shardings.spec if hasattr(comp.output_shardings, "spec") else comp.output_shardings[0].spec
            rows.append({"x": spec_s(xs), "w": spec_s(ws), "out": oname,
                         "x_shard": list(xa.sharding.shard_shape(x_np.shape)), "w_shard": list(wa.sharding.shard_shape(w_np.shape)),
                         "y_spec": spec_s(outspec), "y_shard": list(y.sharding.shard_shape(ref.shape)),
                         "coll": [[c["kind"], c["logical"], c["group"], c["shapes"][0] if c["shapes"] else ""] for c in colls],
                         "mem": H.mem(comp), "max_err": err})
            print(rows[-1]["x"], rows[-1]["w"], oname, "->", rows[-1]["y_spec"], [c[:3] for c in rows[-1]["coll"]], err)

H.dump("playground.json", {
    "what": "y = x @ W, x [4096,128] (embedded batch 0), W [128,512] (blocks.0.mlp.fc1.w, initial weights), "
            "mesh 2 x 4 ('data','model'), Auto axes, jax " + jax.__version__ + " with Shardy; collectives from "
            "compile().as_text(); bytes = the full array each collective works on, per device group.",
    "mesh_devices": [[d.id for d in row] for row in mesh.devices],
    "x_shape": list(x_np.shape), "w_shape": list(w_np.shape),
    "x_tiles": {spec_s(s): tiles(s, x_np.shape) for s in XS},
    "w_tiles": {spec_s(s): tiles(s, w_np.shape) for s in WS},
    "rows": rows})
