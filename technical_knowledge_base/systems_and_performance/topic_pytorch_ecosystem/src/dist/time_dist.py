"""Step time of the running example under DDP and FSDP2 (CPU, gloo, 1 thread per rank). Run under the bench lock.

    sh run.sh 1 time_dist.py --mode plain --tag t_plain_w1
    sh run.sh 2 time_dist.py --mode ddp  --tag t_ddp_w2      (and fsdp, and 4 ranks)

5 warm-up steps, then 3 trials of 20 timed steps; a barrier before each step so ranks start together; the step
time is rank 0's wall time from before forward to after optimizer.step (losses are read with .item(), which on CPU
does not change the timing). Records the 1-minute load average at start and end.
"""
import argparse, statistics
from common import *
from model import GPTConfig, make_model, get_batch, make_optimizer

ap = argparse.ArgumentParser(); ap.add_argument("--mode", required=True); ap.add_argument("--tag", required=True)
a = ap.parse_args()
rank, world = init()
cfg = GPTConfig()
model = make_model(cfg, "cpu")
if a.mode == "ddp":
    from torch.nn.parallel import DistributedDataParallel as DDP
    run = DDP(model)
elif a.mode == "fsdp":
    from torch.distributed.fsdp import fully_shard
    from torch.distributed.device_mesh import init_device_mesh
    mesh = init_device_mesh("cpu", (world,))
    for b in model.blocks: fully_shard(b, mesh=mesh)
    fully_shard(model, mesh=mesh); run = model
else:
    run = model
opt = make_optimizer(model)
load0 = os.getloadavg()[0]
def step(s):
    x, y = get_batch(cfg, s * world + rank)
    dist.barrier()
    t = time.perf_counter()
    _, l = run(x, y); l.backward(); opt.step(); opt.zero_grad(set_to_none=True)
    return (time.perf_counter() - t) * 1e3
for s in range(5): step(s)
trials = []
for k in range(3):
    ts = [step(5 + k * 20 + i) for i in range(20)]
    trials.append(statistics.median(ts))
dump(a.tag, rank, {"mode": a.mode, "trial_medians_ms": trials, "median_ms": statistics.median(trials),
                   "load_start": load0, "load_end": os.getloadavg()[0]})
merge(a.tag, world)
dist.destroy_process_group()
