"""Real error messages for the page's common mistakes (measured here, CPU; mock TPU devices as in tq_slices.py)."""
import os, sys; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import tq_common as T
import jax, jax.numpy as jnp
from jax._src import mesh_utils as MU
import tq_slices_mock as M

out = {}
# 1. TPU7x: one host (2x2x1) is 8 JAX devices; a mesh written for 4 chips
devs = M.mock(2, 2, 1, "TPU7x", 2)
try:
    MU.create_device_mesh((2, 2), devs)
except Exception as e:
    out["tpu7x_4"] = T.scrub(f"{type(e).__name__}: {e}").splitlines()[0][:300]
out["tpu7x_devices"] = len(devs)
# 2. TF32 precision on CPU
try:
    jnp.dot(jnp.ones((8, 8)), jnp.ones((8, 8)), precision="TF32_TF32_F32")
except Exception as e:
    out["tf32"] = T.scrub(f"{type(e).__name__}: {e}").splitlines()[0][:300]
print(out)
T.save("errors.json", out)
