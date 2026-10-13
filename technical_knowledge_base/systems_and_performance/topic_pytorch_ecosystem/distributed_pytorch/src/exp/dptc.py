"""Shared helpers for the Distributed PyTorch child page's experiments (CPU, gloo, torchrun).

Reuses the root's Distributed lab helpers (../../../src/dist/common.py: flight-recorder reader, memory-profiler
timeline, live_bytes_of) and the running example (../../../src/model), never copies them. Writes one JSON per
experiment into ../inputs/ (per-rank files merged by rank 0).
"""
import json, os, sys, time
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT_SRC = os.path.normpath(os.path.join(HERE, "..", "..", "..", "src"))
sys.path.insert(0, os.path.join(ROOT_SRC, "model"))
import importlib.util as _iu
_spec = _iu.spec_from_file_location("dst_common", os.path.join(ROOT_SRC, "dist", "common.py"))
_root = _iu.module_from_spec(_spec); _spec.loader.exec_module(_root)   # the root lab's helpers, imported by path
init, env, fr_entries, FRWindow, live_bytes_of, profile_memory, now, mark, ESZ = (
    _root.init, _root.env, _root.fr_entries, _root.FRWindow, _root.live_bytes_of, _root.profile_memory, _root.now, _root.mark, _root.ESZ)
import torch                                             # noqa: E402
import torch.distributed as dist                         # noqa: E402

OUT = os.path.normpath(os.path.join(HERE, "..", "inputs"))
os.makedirs(OUT, exist_ok=True)
SCRATCH = os.environ.get("DPT_SCRATCH", "/tmp/dpt_scratch")    # bulky outputs (checkpoints), outside the repo
os.makedirs(SCRATCH, exist_ok=True)


def slim(entries, pg_names=None):
    """Flight-recorder entries reduced to what the page shows: op, bytes in/out, dtype, process group."""
    out = []
    for e in entries:
        out.append({"op": (e["profiling_name"] or "").replace("gloo:", ""), "in": e["in_bytes"], "out": e["out_bytes"],
                    "dt": (e["input_dtypes"] or ["-"])[0], "pg": e.get("process_group") if pg_names is None else pg_names.get(e.get("process_group"), e.get("process_group")),
                    "seq": e["collective_seq_id"] if not e["is_p2p"] else e["p2p_seq_id"], "p2p": bool(e["is_p2p"]), "t": e["time_created_ns"]})
    return out


def dump(name, rank, d):
    d = {"env": env(), "rank": rank, **d}
    with open(os.path.join(OUT, f"{name}.rank{rank}.json"), "w") as f:
        json.dump(d, f, indent=1, default=str)


def merge(name, world):
    dist.barrier()
    if dist.get_rank() != 0:
        return
    ranks = []
    for r in range(world):
        p = os.path.join(OUT, f"{name}.rank{r}.json")
        ranks.append(json.load(open(p)))
        os.remove(p)
    with open(os.path.join(OUT, f"{name}.json"), "w") as f:
        json.dump({"name": name, "recorded": time.strftime("%Y-%m-%d"), "env": ranks[0]["env"], "ranks": ranks}, f, indent=1, default=str)
    print("wrote", name)


def save1(name, d):
    """Single-process experiments."""
    with open(os.path.join(OUT, f"{name}.json"), "w") as f:
        json.dump({"name": name, "recorded": time.strftime("%Y-%m-%d"), **d}, f, indent=1, default=str)
    print("wrote", name)


def cpu_mesh(shape, names=None):
    """An explicit CPU DeviceMesh (the default one picks MPS on a Mac and fails; see the root's FACTS dst)."""
    from torch.distributed.device_mesh import init_device_mesh
    return init_device_mesh("cpu", shape, mesh_dim_names=names)


def pg_label_map():
    """Map flight-recorder process-group ids to readable names after meshes are built: filled by each script."""
    return {}
