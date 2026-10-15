"""How JAX maps mesh axes onto a TPU torus: jax's own create_device_mesh run on mock TPU devices. Writes out/torus.json.

No TPU is needed: mesh_utils.create_device_mesh (jax/_src/mesh_utils.py at jax-v0.11.2) only reads each device's
`coords`, `core_on_chip`, `device_kind` and `platform`. The mock device below has the same fields as the MockTpuDevice
in jax's own tests (tests/mesh_utils_test.py), with the same coordinate layout (hosts of 2 x 2 chips).
For each slice and logical mesh it records which physical axes each logical axis landed on (read back from the
devices' coordinates), whether neighbours along each logical axis are 1 ICI hop apart, or the error JAX raises.
"""
import os, sys; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))   # -I drops the script folder
import dataclasses, itertools
import numpy as np
import tp_common as T
from jax._src import mesh_utils as MU


@dataclasses.dataclass(frozen=True)
class MockTpuDevice:
    id: int
    platform: str
    device_kind: str
    process_index: int
    coords: tuple
    core_on_chip: int
    slice_index: int = 0


def mock(x, y, z, kind, cores):
    devs, i = [], 0
    for zz in range(z):
        for yy in range(y):
            for xx in range(x):
                for c in range(cores):
                    host = (xx // 2) + (x // 2 if x > 1 else 1) * ((yy // 2) + (y // 2 if y > 1 else 1) * zz)
                    devs.append(MockTpuDevice(i, "tpu", kind, host, (xx, yy, zz), c)); i += 1
    return devs


SLICES = [  # name, physical shape, device_kind string jax matches, TensorCores exposed per chip, wraparound note
    dict(name="v5e-16x16 (a full v5e pod, 256 chips)", shape=(16, 16, 1), kind="TPU v5 lite", cores=1, has_wrap=True, wrap="both axes have size 16: wraparound"),
    dict(name="v5e-4x4 (16 chips)", shape=(4, 4, 1), kind="TPU v5 lite", cores=1, has_wrap=False, wrap="no wraparound (v5e has it only on an axis of 16)"),
    dict(name="v5p-4x4x4 (64 chips, one cube)", shape=(4, 4, 4), kind="TPU v5", cores=1, has_wrap=True, wrap="a full 4x4x4 cube: wraparound on all axes"),
    dict(name="v5p-8x8x8 (512 chips)", shape=(8, 8, 8), kind="TPU v5", cores=1, has_wrap=True, wrap="wraparound on all axes (cubes joined by optical switches)"),
    dict(name="TPU7x-4x4x4 (64 chips, 128 TensorCores)", shape=(4, 4, 4), kind="TPU7x", cores=2, has_wrap=True, wrap="a full 4x4x4 cube"),
]
MESHES = {
    "v5e-16x16 (a full v5e pod, 256 chips)": [(256,), (16, 16), (32, 8), (64, 4), (4, 64)],
    "v5e-4x4 (16 chips)": [(16,), (4, 4), (2, 8)],
    "v5p-4x4x4 (64 chips, one cube)": [(64,), (16, 4), (4, 16), (8, 8), (4, 4, 4)],
    "v5p-8x8x8 (512 chips)": [(512,), (64, 8), (8, 64), (32, 16), (128, 4)],
    "TPU7x-4x4x4 (64 chips, 128 TensorCores)": [(128,), (64, 2), (32, 4), (16, 8), (8, 16)],
}


def hops(a, b, shape, wrap):
    return sum(min(abs(p - q), s - abs(p - q)) if wrap else abs(p - q) for p, q, s in zip(a, b, shape))


def analyse(mesh, phys, wrap):
    """For each logical axis: which physical coordinates vary along it, and the ICI hop distance between neighbours."""
    out = []
    for ax in range(mesh.ndim):
        varying, maxhop = set(), 0
        for idx in itertools.product(*[range(n) for n in mesh.shape]):
            if idx[ax] + 1 < mesh.shape[ax]:
                nxt = list(idx); nxt[ax] += 1
                d0, d1 = mesh[idx], mesh[tuple(nxt)]
                c0, c1 = d0.coords + (d0.core_on_chip,), d1.coords + (d1.core_on_chip,)
                varying |= {i for i in range(4) if c0[i] != c1[i]}
                maxhop = max(maxhop, hops(d0.coords, d1.coords, phys, wrap))
        out.append(dict(phys=sorted("xyzc"[i] for i in varying), max_hop=maxhop))
    return out


res = []
for s in SLICES:
    devs = mock(*s["shape"], s["kind"], s["cores"])
    rows = []
    for m in MESHES[s["name"]]:
        r = dict(mesh=list(m))
        try:
            mesh = MU.create_device_mesh(m, devs)
            r["axes"] = analyse(mesh, s["shape"], s["has_wrap"])
            if True:          # a picture: for each chip (x, y) at z = 0 (core 0), its logical coordinates
                pos = {}
                for idx in itertools.product(*[range(n) for n in m]):
                    d = mesh[idx]
                    if d.coords[2] == 0 and d.core_on_chip == 0:
                        pos[f"{d.coords[0]},{d.coords[1]}"] = list(idx)
                r["grid"] = pos
        except Exception as e:
            r["error"] = type(e).__name__ + ": " + T.scrub(str(e))[:420]
            try:
                mesh = MU.create_device_mesh(m, devs, allow_split_physical_axes=True)
                r["split_axes"] = analyse(mesh, s["shape"], s["has_wrap"])
            except Exception as e2:
                r["split_error"] = type(e2).__name__ + ": " + T.scrub(str(e2))[:200]
        rows.append(r)
        print(s["name"], m, r.get("axes"), r.get("error", "")[:90], r.get("split_axes"))
    res.append(dict(name=s["name"], shape=list(s["shape"]), kind=s["kind"], cores=s["cores"], wrap=s["wrap"], has_wrap=s["has_wrap"], meshes=rows))

src = dict(create=T.src_line("jax/_src/mesh_utils.py", r"^def create_device_mesh\("),
           nd_torus=T.src_line("jax/_src/mesh_utils.py", r"^def _create_device_mesh_for_nd_torus\("),
           reversed_loop=T.src_line("jax/_src/mesh_utils.py", r"for logical_axis_index, logical_axis_size in reversed\("),
           not_impl=T.src_line("jax/_src/mesh_utils.py", r"'Failed to find assignment for logical_axis_index'"),
           priority=T.src_line("jax/_src/mesh_utils.py", r"priority_map = \{0: 1, 1: 2, 2: 3, 3: 0\}"),
           handler=T.src_line("jax/_src/mesh_utils.py", r"^device_kind_handler_dict"),
           make_mesh=T.src_line("jax/_src/sharding_impls.py", r"^def make_mesh\("),
           make_mesh_split=T.src_line("jax/_src/sharding_impls.py", r"if devices\[0\]\.device_kind in \(mesh_utils\._TPU_V5_LITE"))
T.save("torus.json", dict(slices=res, src=src))
