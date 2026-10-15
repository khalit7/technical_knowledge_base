"""Every slice shape Google Cloud lists (v4, v5e, v5p, v6e, TPU7x), and what jax.make_mesh's placement
(jax._src.mesh_utils.create_device_mesh at jax-v0.11.2) does with a 2-axis (data, model) mesh on each.

The topology rows are copied from src/inputs/cloud_tpu_pages_extract.txt (Cloud pages, last updated
2026-10-13) and each topology string is asserted to appear there. The placement runs on mock TPU devices
(same fields as jax's own tests/mesh_utils_test.py), so the result is measured here: which logical meshes
JAX accepts, and the largest ICI hop count between neighbours on the 'model' axis.
Wraparound: 3D slices of a full 4x4x4 cube or more have it on every axis (Cloud v5p page); 2D v5e/v6e only on
an axis of 16 (scaling book). Two extra rows: v5p 16x20x28 (the scaling book's full pod) for the cross-check.
"""
import os, sys; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import dataclasses, itertools, time
import tq_common as T
from jax._src import mesh_utils as MU

EXTRACT = open(os.path.join(T.INPUTS, "cloud_tpu_pages_extract.txt")).read()


from tq_slices_mock import MockTpuDevice, mock


GENS = {  # device_kind strings jax matches; JAX devices per chip (megacore fuses v4/v5p cores)
    "v4": dict(kind="TPU v4", cores=1, tc=2), "v5e": dict(kind="TPU v5 lite", cores=1, tc=1),
    "v5p": dict(kind="TPU v5", cores=1, tc=2), "v6e": dict(kind="TPU v6 lite", cores=1, tc=1),
    "7x": dict(kind="TPU7x", cores=2, tc=2)}
TOPOS = {
    "v4": ["2x2x1", "2x2x2", "2x2x4", "2x4x4", "4x4x4", "4x4x8", "4x8x8", "8x8x8", "8x8x12", "8x8x16", "8x16x16"],
    "v5e": ["1x1", "2x2", "2x4", "4x4", "4x8", "8x8", "8x16", "16x16"],
    "v5p": ["2x2x1", "2x2x2", "2x4x4", "4x4x4", "4x4x8", "4x8x8", "8x8x8", "8x8x16", "8x16x16", "16x16x16", "16x16x24"],
    "v6e": ["1x1", "2x2", "2x4", "4x4", "4x8", "8x8", "8x16", "16x16"],
    "7x": ["2x2x1", "2x2x2", "2x2x4", "2x4x4", "4x4x4", "4x4x8", "4x8x8", "8x8x8", "8x8x16", "8x16x16"]}
EXTRA = [("v5p", "16x20x28", "scaling book 'superpod' (8,960 chips); not in Cloud's list (largest single slice 16x16x24)")]
CHIPS_PER_HOST = {"v4": 4, "v5e": 8, "v5p": 4, "v6e": 8, "7x": 4}


def wrap_axes(gen, shape):
    if len(shape) == 2 or shape[2] == 1 and gen in ("v5e", "v6e"):
        return [s == 16 for s in shape]
    full = all(s >= 4 for s in shape) and all(s % 4 == 0 for s in shape)
    return [full] * len(shape)


def hop(a, b, shape, wraps):
    return sum(min(abs(p - q), s - abs(p - q)) if w else abs(p - q) for p, q, s, w in zip(a, b, shape, wraps))


def model_axis(mesh, shape, wraps):
    varying, maxhop = set(), 0
    ax = mesh.ndim - 1
    for idx in itertools.product(*[range(n) for n in mesh.shape[:-1]]):
        for j in range(mesh.shape[-1] - 1):
            d0, d1 = mesh[idx + (j,)], mesh[idx + (j + 1,)]
            c0, c1 = d0.coords + (d0.core_on_chip,), d1.coords + (d1.core_on_chip,)
            varying |= {i for i in range(4) if c0[i] != c1[i]}
            maxhop = max(maxhop, hop(d0.coords, d1.coords, shape, wraps))
    return sorted("xyzc"[i] for i in varying), maxhop


rows = []
t0 = time.time()
for gen, tops in TOPOS.items():
    for topo in tops + [t for g, t, _ in EXTRA if g == gen]:
        note = next((n for g, t, n in EXTRA if g == gen and t == topo), None)
        if note is None:
            assert topo in EXTRACT, (gen, topo)
        dims = [int(v) for v in topo.split("x")]
        shape = tuple(dims + [1] * (3 - len(dims)))
        g = GENS[gen]
        chips = shape[0] * shape[1] * shape[2]
        devs = mock(*shape, g["kind"], g["cores"])
        n = len(devs)
        wraps = wrap_axes(gen, dims) + ([False] if len(dims) == 2 else [])
        meshes = []
        for m in [1, 2, 4, 8, 16, 32, 64]:
            if m > n or n % m:
                continue
            r = {"model": m, "data": n // m}
            try:
                mesh = MU.create_device_mesh((n // m, m), devs)
                r["phys"], r["hop"] = model_axis(mesh, shape, wraps)
            except Exception as e:
                r["error"] = type(e).__name__ + ": " + T.scrub(str(e)).splitlines()[0][:300]
            meshes.append(r)
        rows.append(dict(gen=gen, topo=topo, chips=chips, devices=n, hosts=max(chips / CHIPS_PER_HOST[gen], 0),
                         cubes=(chips / 64 if len(dims) == 3 else None), wrap=wraps[:len(dims)], note=note, meshes=meshes))
        print(gen, topo, n, [(r["model"], r.get("hop", "ERR")) for r in meshes], round(time.time() - t0, 1), flush=True)
T.save("slices.json", {"rows": rows, "chips_per_host": CHIPS_PER_HOST,
                       "src": {"create": T.src_line("jax", "jax/_src/mesh_utils.py", r"^def create_device_mesh\("),
                               "reversed_loop": T.src_line("jax", "jax/_src/mesh_utils.py", r"for logical_axis_index, logical_axis_size in reversed\(")}})
