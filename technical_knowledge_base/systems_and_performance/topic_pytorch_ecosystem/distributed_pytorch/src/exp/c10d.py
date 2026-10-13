"""c10d from the inside, on 4 CPU processes (gloo): what torchrun hands each process, the store behind the
rendezvous, the default backend chosen with no argument, subgroups, every collective's payload per rank, and
what happens to an MPS tensor.

    sh run.sh 4 c10d.py
"""
import os
from datetime import timedelta
from dptc import *

ENV_KEYS = ["RANK", "LOCAL_RANK", "WORLD_SIZE", "LOCAL_WORLD_SIZE", "GROUP_RANK", "GROUP_WORLD_SIZE", "ROLE_RANK",
            "ROLE_WORLD_SIZE", "ROLE_NAME", "MASTER_ADDR", "MASTER_PORT", "TORCHELASTIC_RESTART_COUNT",
            "TORCHELASTIC_MAX_RESTARTS", "TORCHELASTIC_RUN_ID", "TORCHELASTIC_USE_AGENT_STORE", "TORCH_NCCL_ASYNC_ERROR_HANDLING",
            "OMP_NUM_THREADS", "TORCHELASTIC_ERROR_FILE"]
envs = {k: os.environ.get(k) for k in ENV_KEYS}
for k in ("TORCHELASTIC_ERROR_FILE", "TORCHELASTIC_RUN_ID"):
    if envs[k]: envs[k] = "<set>"
torch.set_num_threads(1)
# phase 1, no backend argument: c10d picks one for the detected accelerator
def err(e):
    return type(e).__name__ + ": " + str(e).split("\n")[0][:300]
dist.init_process_group(timeout=timedelta(seconds=60))
rank, world = dist.get_rank(), dist.get_world_size()
noarg = {"backend": dist.get_backend(), "backend_config": str(dist.get_backend_config()),
         "accelerator": str(torch._C._get_accelerator())}
for name, grp in (("world", None), ("new_group", "new")):
    try:
        g = dist.new_group(list(range(world))) if grp else None
        t = torch.ones(2)
        dist.all_reduce(t, group=g)
        noarg[name + "_cpu_all_reduce"] = {"ok": True, "value": t.tolist()}
    except Exception as e:
        noarg[name + "_cpu_all_reduce"] = {"ok": False, "error": err(e)}
dist.destroy_process_group()
# phase 2: gloo named explicitly (what the rest of this page does)
dist.init_process_group("gloo", timeout=timedelta(seconds=60))
out = {"env_from_torchrun": envs, "no_backend_argument": noarg, "backend": dist.get_backend(), "backend_config": str(dist.get_backend_config()),
       "default_device_backend_map": dict(dist.Backend.default_device_backend_map),
       "available": {"gloo": dist.is_gloo_available(), "nccl": dist.is_nccl_available(), "mpi": dist.is_mpi_available(),
                     "ucc": dist.is_ucc_available(), "xccl": getattr(dist, "is_xccl_available", lambda: None)()}}

# the store behind the rendezvous
store = dist.distributed_c10d._get_default_store()
chain, s = [], store
while s is not None:
    chain.append(type(s).__name__)
    s = getattr(s, "underlying_store", None)
out["store_chain"] = chain
store.set(f"hello/{rank}", f"rank {rank} was here")
n = store.add("arrived", 1)
store.wait([f"hello/{r}" for r in range(world)], timedelta(seconds=10))
out["store_add_return"] = n
out["store_read"] = [store.get(f"hello/{r}").decode() for r in range(world)]
out["store_num_keys"] = store.num_keys()

# subgroups: two pairs, and a DeviceMesh 2 x 2 (one group per mesh dimension per coordinate)
pairs = [dist.new_group([0, 1]), dist.new_group([2, 3])]
mine = pairs[rank // 2]
t = torch.tensor([float(rank + 1)])
dist.all_reduce(t, group=mine)
out["pair_all_reduce"] = t.item()
mesh = cpu_mesh((2, 2), ("dp", "tp"))
out["mesh"] = {"mesh": mesh.mesh.tolist(), "coord": mesh.get_coordinate(),
               "dp_group_ranks": dist.get_process_group_ranks(mesh.get_group("dp")),
               "tp_group_ranks": dist.get_process_group_ranks(mesh.get_group("tp"))}

# every collective once, 1 MiB per rank, recorded by the flight recorder
S = 262144                      # float32 elements = 1 MiB
x = torch.full((S,), float(rank))
w = FRWindow().start()
calls = []
def rec(name, fn):
    fn(); calls.append(name)
rec("all_reduce", lambda: dist.all_reduce(x.clone()))
rec("broadcast", lambda: dist.broadcast(x.clone(), src=0))
rec("reduce", lambda: dist.reduce(x.clone(), dst=0))
rec("all_gather_into_tensor", lambda: dist.all_gather_into_tensor(torch.empty(S * world), x))
rec("all_gather (list)", lambda: dist.all_gather([torch.empty(S) for _ in range(world)], x))
rec("reduce_scatter_tensor", lambda: dist.reduce_scatter_tensor(torch.empty(S // world), x.clone()))
rec("all_to_all_single", lambda: dist.all_to_all_single(torch.empty(S), x.clone()))
rec("gather", lambda: dist.gather(x, [torch.empty(S) for _ in range(world)] if rank == 0 else None, dst=0))
rec("scatter", lambda: dist.scatter(torch.empty(S // world), [torch.empty(S // world) for _ in range(world)] if rank == 0 else None, src=0))
rec("barrier", lambda: dist.barrier())
ent = w.stop()
out["collectives"] = {"called": calls, "recorded": slim(ent)}
# semantic check of all_to_all on small values: rank r sends element j to rank j
a = torch.arange(world, dtype=torch.float32) + 10 * rank
b = torch.empty(world)
dist.all_to_all_single(b, a)
out["all_to_all_example"] = {"sent": a.tolist(), "received": b.tolist()}

# MPS tensors: the default map sends "mps" to gloo; does gloo take them?
mps = {}
if torch.backends.mps.is_available():
    try:
        tm = torch.ones(4, device="mps") * (rank + 1)
        dist.all_reduce(tm)
        mps = {"ok": True, "value": tm.cpu().tolist()}
    except Exception as e:
        mps = {"ok": False, "error": type(e).__name__ + ": " + str(e).split("\n")[0][:300]}
out["mps_all_reduce"] = mps
dump("c10d", rank, out)
merge("c10d", world)
dist.destroy_process_group()
