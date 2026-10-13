"""DTensor sharding propagation on 2 CPU ranks: for each op and input placements, the output placement DTensor
chooses and the collectives it inserts (CommDebugMode), with a check against the plain-tensor result; from_local
and to_local; and a custom op without and with a registered sharding strategy.

    sh run.sh 2 dtensor_prop.py
"""
import torch.nn.functional as F
from dptc import *
from torch.distributed.tensor import DTensor, Shard, Replicate, Partial, distribute_tensor
from torch.distributed.tensor.debug import CommDebugMode

rank, world = init()
mesh = cpu_mesh((world,), ("x",))
torch.manual_seed(0)
A = torch.randn(4, 6); B = torch.randn(6, 8); C = torch.randn(4, 6); v = torch.randn(6)
P = {"S0": Shard(0), "S1": Shard(1), "R": Replicate(), "P": Partial()}


def make(t, pl):
    if pl == "P":   # a Partial DTensor whose ranks' pieces sum to t
        piece = t / world
        return DTensor.from_local(piece, mesh, [Partial()], run_check=False)
    return distribute_tensor(t, mesh, [P[pl]])


def err(e):
    return type(e).__name__ + ": " + " ".join(str(e).split())[:300]


cases = [
    ("mm", "A @ B", lambda a, b: a @ b, (A, B), [("S0", "R"), ("R", "S1"), ("S1", "S0"), ("S0", "S0"), ("R", "R"), ("S1", "S1"), ("P", "R")]),
    ("add", "A + C", lambda a, b: a + b, (A, C), [("S0", "S0"), ("S0", "R"), ("S0", "S1"), ("P", "P"), ("P", "R")]),
    ("mul by 2", "2 * A", lambda a: 2 * a, (A,), [("S0",), ("P",)]),
    ("relu", "relu(A)", lambda a: torch.relu(a), (A,), [("S0",), ("P",)]),
    ("sum(dim=0)", "A.sum(0)", lambda a: a.sum(0), (A,), [("S0",), ("S1",)]),
    ("sum()", "A.sum()", lambda a: a.sum(), (A,), [("S0",)]),
    ("softmax(dim=-1)", "softmax(A, -1)", lambda a: F.softmax(a, -1), (A,), [("S0",), ("S1",)]),
    ("layer_norm", "layer_norm(A, (6,))", lambda a: F.layer_norm(a, (6,)), (A,), [("S0",), ("S1",)]),
    ("view(2, 12)", "A.view(2, 12)", lambda a: a.view(2, 12), (A,), [("S0",), ("S1",)]),
    ("transpose", "A.t()", lambda a: a.t(), (A,), [("S0",)]),
    ("embedding", "embedding(idx, W)", lambda i, w: F.embedding(i, w), (torch.tensor([[0, 3], [5, 1]]), B), [("R", "S1"), ("R", "S0")]),
]
rows = []
for name, expr, fn, ins, combos in cases:
    ref = fn(*ins)
    for combo in combos:
        r = {"op": name, "expr": expr, "inputs": list(combo)}; print("case", name, combo, flush=True)
        try:
            dts = [make(t, pl) for t, pl in zip(ins, combo)]
            with CommDebugMode() as cm:
                o = fn(*dts)
            cnt = {str(k).split(".")[-1]: v for k, v in cm.get_comm_counts().items()}
            r.update({"out": [str(p) for p in o.placements], "comms": {k.replace("_into_tensor", "").replace("_tensor", ""): v for k, v in cnt.items()},
                      "local_shape": list(o.to_local().shape), "ok": torch.allclose(o.full_tensor(), ref, atol=1e-5)})
        except Exception as e:
            r.update({"error": err(e)})
        rows.append(r)

print("from_local", flush=True)
# from_local / to_local: wrapping local pieces without moving data, and what run_check costs
local = torch.full((2, 3), float(rank))
with CommDebugMode() as cm:
    d1 = DTensor.from_local(local, mesh, [Shard(0)], run_check=False)
c1 = {str(k).split(".")[-1]: v for k, v in cm.get_comm_counts().items()}
with CommDebugMode() as cm:
    d2 = DTensor.from_local(local, mesh, [Shard(0)], run_check=True)
c2 = {str(k).split(".")[-1]: v for k, v in cm.get_comm_counts().items()}
fl = {"global_shape": list(d1.shape), "to_local_is_same_storage": d1.to_local().data_ptr() == local.data_ptr(),
      "comms_run_check_false": c1, "comms_run_check_true": c2}
# uneven: local pieces of different sizes need the global shape spelled out
lp = torch.ones(2 if rank == 0 else 1, 2)   # 3 rows split as torch.chunk would: 2 and 1
try:
    dd = DTensor.from_local(lp, mesh, [Shard(0)], run_check=False)
    fl["uneven_without_shape"] = {"global_shape": list(dd.shape)}
except Exception as e:
    fl["uneven_without_shape"] = {"error": err(e)}
dd = DTensor.from_local(lp, mesh, [Shard(0)], run_check=False, shape=torch.Size([3, 2]), stride=(2, 1))
fl["uneven_with_shape"] = {"global_shape": list(dd.shape), "full_rows": dd.full_tensor().shape[0]}

print("custom", flush=True)
# a custom op: no strategy, then a registered one
lib = torch.library.Library("dpt", "DEF")
lib.define("rowscale(Tensor x, Tensor s) -> Tensor")
lib.impl("rowscale", lambda x, s: x * s[:, None], "CompositeExplicitAutograd")
x = torch.randn(4, 6); s = torch.randn(4)
cop = {}
try:
    torch.ops.dpt.rowscale(distribute_tensor(x, mesh, [Shard(0)]), distribute_tensor(s, mesh, [Shard(0)]))
    cop["without_strategy"] = {"ok": True}
except Exception as e:
    cop["without_strategy"] = {"error": err(e)}
from torch.distributed.tensor.experimental import register_sharding


@register_sharding(torch.ops.dpt.rowscale.default)
def rowscale_strategy(x, s):
    # (output placements, input placements) pairs DTensor may choose from
    return [([Shard(0)], [Shard(0), Shard(0)]), ([Replicate()], [Replicate(), Replicate()]), ([Shard(1)], [Shard(1), Replicate()])]


for pl in (("S0", "S0"), ("S1", "R"), ("S0", "R"), ("S1", "S0")):
    try:
        dx, ds = make(x, pl[0]), make(s, pl[1])
        with CommDebugMode() as cm:
            o = torch.ops.dpt.rowscale(dx, ds)
        cop["with_strategy " + "/".join(pl)] = {"out": [str(p) for p in o.placements],
              "comms": {str(k).split(".")[-1]: v for k, v in cm.get_comm_counts().items()},
              "ok": torch.allclose(o.full_tensor(), x * s[:, None], atol=1e-6)}
    except Exception as e:
        cop["with_strategy " + "/".join(pl)] = {"error": err(e)}
dump("dtensor_prop", rank, {"cases": rows, "from_local": fl, "custom_op": cop})
merge("dtensor_prop", world)
dist.destroy_process_group()
