"""Mock TPU devices (same fields as jax tests/mesh_utils_test.py MockTpuDevice); shared by tq_slices.py and tq_errors.py."""
import dataclasses


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
                    devs.append(MockTpuDevice(i, "tpu", kind, 0, (xx, yy, zz), c)); i += 1
    return devs


