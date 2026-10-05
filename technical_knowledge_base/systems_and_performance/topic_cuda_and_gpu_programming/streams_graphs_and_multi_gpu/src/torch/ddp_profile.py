"""torch.profiler view of one DDP step on CPU (Gloo, 2 ranks), PyTorch 2.14.1: do the gradient
all-reduces run while backward is still computing? Same model as ddp_overlap.py, default DDP
bucketing but bucket_cap_mb=8. Saves a summary of rank 0's trace (not the full trace):
backward matmul events and all-reduce events with start and duration in ms from the first
backward event.
"""
import json, os, sys
import torch, torch.distributed as dist, torch.multiprocessing as mp
from torch.nn.parallel import DistributedDataParallel as DDP
from torch.profiler import profile, ProfilerActivity

L, H, BATCH = 12, 1024, 512


def worker(rank, world, outdir):
    os.environ.update(MASTER_ADDR="127.0.0.1", MASTER_PORT="29571")
    torch.set_num_threads(2)
    dist.init_process_group("gloo", rank=rank, world_size=world)
    torch.manual_seed(0)
    m = torch.nn.Sequential(*[torch.nn.Sequential(torch.nn.Linear(H, H), torch.nn.GELU()) for _ in range(L)])
    ddp = DDP(m, bucket_cap_mb=8)
    x = torch.randn(BATCH, H)
    for _ in range(3):
        ddp(x).square().mean().backward()
    with profile(activities=[ProfilerActivity.CPU]) as prof:
        loss = ddp(x).square().mean()
        loss.backward()
    if rank == 0:
        ev = [e for e in prof.events() if ("AddmmBackward0" in e.name and e.name.startswith("autograd::engine"))
              or "all_reduce" in e.name.lower() or e.name.startswith("gloo:")]
        names = sorted({e.name for e in ev})
        t0 = min(e.time_range.start for e in ev if "AddmmBackward0" in e.name)
        rows = [dict(name=e.name, thread=e.thread, start_ms=round((e.time_range.start - t0) / 1e3, 3),
                     dur_ms=round((e.time_range.end - e.time_range.start) / 1e3, 3)) for e in ev]
        rows.sort(key=lambda r: r["start_ms"])
        with open(os.path.join(outdir, "ddp_profile.json"), "w") as f:
            json.dump(dict(torch=torch.__version__, names=names, events=rows, load=os.getloadavg()), f, indent=1)
    dist.destroy_process_group()


if __name__ == "__main__":
    mp.spawn(worker, args=(2, sys.argv[1]), nprocs=2, join=True)
