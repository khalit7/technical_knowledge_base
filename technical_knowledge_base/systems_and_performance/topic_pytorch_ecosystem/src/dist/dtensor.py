"""DTensor and DeviceMesh: every placement change on a 4 x 4 tensor, and the collective each one triggers.

    sh run.sh 4 dtensor.py      # 1-D mesh of 4 and 2-D mesh of 2 x 2
    sh run.sh 2 dtensor.py      # 1-D mesh of 2

Placements: Shard(0), Shard(1), Replicate(), Partial() (sum). A Partial source is built with from_local so
that its local pieces are integers that sum to the global tensor (element k lives on mesh coordinate k mod n).
For each (source, target) pair: the collectives (flight recorder), every rank's local values after, and whether
full_tensor() still equals the global tensor.
"""
import itertools
from common import *
from torch.distributed.tensor import DTensor, Shard, Replicate, Partial, distribute_tensor
from torch.distributed.device_mesh import init_device_mesh
from torch.distributed.tensor.debug import CommDebugMode

rank, world = init()
G = torch.arange(16, dtype=torch.float32).view(4, 4)
PL = {"S0": Shard(0), "S1": Shard(1), "R": Replicate(), "P": Partial()}


def make(mesh, names):
    """A DTensor of G with the given placements (Partial built by hand)."""
    reals = [PL[n] if n != "P" else Replicate() for n in names]
    d = distribute_tensor(G, mesh, reals)
    loc = d.to_local().clone()
    coord = mesh.get_coordinate()
    for i, n in enumerate(names):
        if n == "P":
            size = mesh.size(i)
            keep = (torch.arange(loc.numel()).view(loc.shape) % size) == coord[i]
            loc = torch.where(keep, loc, torch.zeros_like(loc))
    return DTensor.from_local(loc, mesh, [PL[n] for n in names], run_check=False, shape=G.shape, stride=G.stride())


def run(mesh, label):
    nd = mesh.ndim
    combos = list(itertools.product(PL.keys(), repeat=nd))
    out = {"mesh": label, "shape": list(mesh.shape), "coord": mesh.get_coordinate(), "pairs": []}
    for src in combos:
        for dst in combos:
            dist.barrier()
            rec = {"src": list(src), "dst": list(dst)}
            try:
                a = make(mesh, src)
                rec["src_local"] = a.to_local().tolist()
                w = FRWindow().start()
                with CommDebugMode() as cm:       # the collective DTensor asked for (functional collectives)
                    b = a.redistribute(mesh, [PL[n] for n in dst])
                coll = w.stop()                   # what gloo actually ran (flight recorder)
                rec["logical"] = {str(k).split(".")[-1]: v for k, v in cm.get_comm_counts().items()}
                rec["coll"] = [{"op": c["profiling_name"], "in": c["input_sizes"], "out": c["output_sizes"],
                                "in_bytes": c["in_bytes"], "out_bytes": c["out_bytes"], "pg": c["pg_id"]} for c in coll]
                rec["dst_local"] = b.to_local().tolist()
                full = b.full_tensor()
                rec["ok"] = bool(torch.equal(full, G))
            except Exception as e:
                rec["error"] = (type(e).__name__ + ": " + str(e).splitlines()[0])[:300]
                dist.barrier()
            out["pairs"].append(rec)
    return out


res = []
m1 = init_device_mesh("cpu", (world,), mesh_dim_names=("dp",))
res.append(run(m1, f"1-D, {world} ranks"))
if world == 4:
    m2 = init_device_mesh("cpu", (2, 2), mesh_dim_names=("a", "b"))
    res.append(run(m2, "2-D, 2 x 2"))
# uneven sharding: 6 rows over the ranks (torch.chunk semantics)
u = distribute_tensor(torch.arange(24, dtype=torch.float32).view(6, 4), m1, [Shard(0)])
uneven = {"global": [6, 4], "local_shape": list(u.to_local().shape)}
_, pgs = fr_entries()
dump(f"dtensor_w{world}", rank, {"meshes": res, "uneven": uneven, "pg_config": pgs})
merge(f"dtensor_w{world}", world)
dist.destroy_process_group()
