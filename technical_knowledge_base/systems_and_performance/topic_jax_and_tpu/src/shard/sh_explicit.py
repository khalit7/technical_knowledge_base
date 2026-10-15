"""Sharding lab, explicit sharding mode and the basics: jax.make_mesh's default axis types in this version,
jax.typeof showing a sharding in the type, what happens to x @ W under Explicit axes for several spec pairs
(result type or the error), jax.reshard, and jax.debug.visualize_array_sharding's text output.

    XLA_FLAGS=--xla_force_host_platform_device_count=8 JAX_PLATFORMS=cpu nice -n 15 \
        $JX_SCRATCH/venv/bin/python -I -B sh_explicit.py
Writes out/explicit.json.
"""
import contextlib
import io
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import sh_common as H  # noqa: E402

import jax  # noqa: E402
import jax.numpy as jnp  # noqa: E402
import numpy as np  # noqa: E402
from jax.sharding import AxisType, NamedSharding, PartitionSpec as P  # noqa: E402

res = {"jax": jax.__version__}
mesh = jax.make_mesh((2, 4), ("data", "model"))
res["make_mesh_default"] = [str(t) for t in mesh.axis_types]
res["Mesh_default"] = [str(t) for t in jax.sharding.Mesh(np.array(jax.devices()).reshape(2, 4), ("data", "model")).axis_types]

x_np = np.ones((4096, 128), np.float32)
w_np = np.ones((128, 512), np.float32)
pairs = [(P("data", None), P(None, "model")), (P("data", None), P()), (P(None, "model"), P("model", None)),
         (P("data", None), P("model", None)), (P("data", None), P("data", None))]
res["matmul"] = []
with jax.set_mesh(mesh):
    for xs, ws in pairs:
        x = jax.device_put(x_np, xs)
        w = jax.device_put(w_np, ws)
        row = {"x": str(xs), "w": str(ws), "x_type": str(jax.typeof(x)), "w_type": str(jax.typeof(w))}
        try:
            y = jax.jit(lambda a, b: a @ b)(x, w)
            row["y_type"] = str(jax.typeof(y))
            comp = jax.jit(lambda a, b: a @ b).lower(x, w).compile()
            row["coll"] = [[c["kind"], c["logical"], c["group"]] for c in H.collectives(comp.as_text(), 8)]
        except Exception as e:  # noqa: BLE001
            row["error"] = H.scrub(f"{type(e).__name__}: {e}").split("\n")[0][:500]
        # the fix the error message suggests: say what you want for the output
        try:
            y2 = jax.jit(lambda a, b: jnp.matmul(a, b, out_sharding=P("data", None)))(x, w)
            row["with_out_sharding"] = str(jax.typeof(y2))
        except Exception as e:  # noqa: BLE001
            row["with_out_sharding_error"] = H.scrub(f"{type(e).__name__}: {e}").split("\n")[0][:300]
        res["matmul"].append(row)
        print(row)
    x = jax.device_put(x_np, P("data", None))
    xr = jax.reshard(x, P(None, "model"))
    res["reshard"] = {"before": str(jax.typeof(x)), "after": str(jax.typeof(xr))}
    print(res["reshard"])

# visualize_array_sharding on an Auto mesh
mesh_a = jax.make_mesh((2, 4), ("data", "model"), axis_types=(AxisType.Auto,) * 2)
res["visualize"] = {}
for spec in (P(None, "model"), P("data", "model"), P("model", None)):
    w = jax.device_put(np.ones((128, 512), np.float32), NamedSharding(mesh_a, spec))
    buf = io.StringIO()
    with contextlib.redirect_stdout(buf):
        jax.debug.visualize_array_sharding(w, use_color=False)
    res["visualize"][str(spec)] = buf.getvalue()
    print(spec)
    print(buf.getvalue())
H.dump("explicit.json", res)
