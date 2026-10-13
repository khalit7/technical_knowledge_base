"""PowerSGD on gloo: are collectives issued in the same order on every rank? Per step, each rank appends the
sizes of its flight-recorder entries, in sequence order, to a file (flushed), so a crash keeps earlier steps.

    sh run.sh 2 psgd_race.py --rank 4 [--one-bucket] --steps 12
"""
import argparse, json, os
from dptc import *
from torch.nn.parallel import DistributedDataParallel as DDP
from torch.distributed.algorithms.ddp_comm_hooks import powerSGD_hook as ps
from model import GPTConfig, make_model, get_batch, make_optimizer
ap = argparse.ArgumentParser(); ap.add_argument("--rank", type=int, default=4); ap.add_argument("--one-bucket", action="store_true")
ap.add_argument("--steps", type=int, default=12); ap.add_argument("--nosync-first", action="store_true"); ap.add_argument("--ref-allreduce", action="store_true"); ap.add_argument("--tag", default="psgd_race")
a = ap.parse_args()
rank, world = init(timeout_s=20)
cfg = GPTConfig(); model = make_model(cfg)
ddp = DDP(model, bucket_cap_mb=(100 if a.one_bucket else None))
st = ps.PowerSGDState(process_group=None, matrix_approximation_rank=a.rank, start_powerSGD_iter=2)
ddp.register_comm_hook(st, ps.powerSGD_hook)
opt = make_optimizer(model)
ref_pg = dist.new_group(list(range(world)))
import threading
calls = open(os.path.join(SCRATCH, f"{a.tag}.calls.r{dist.get_rank()}.jsonl"), "w")
_orig = ps.dist.all_reduce
cur = {"step": -1}
def logged_all_reduce(t, *args, **kw):   # every all-reduce PowerSGD issues: size, and whether it came from the main thread
    calls.write(json.dumps([cur["step"], t.numel() * t.element_size(), threading.current_thread() is threading.main_thread()]) + "\n"); calls.flush()
    return _orig(t, *args, **kw)
ps.dist.all_reduce = logged_all_reduce
f = open(os.path.join(SCRATCH, f"{a.tag}.r{rank}.jsonl"), "w")
for s in range(a.steps):
    x, y = get_batch(cfg, s * world + rank); cur["step"] = s
    if a.nosync_first:          # what the hooks experiment does before each step: a local backward under no_sync
        with ddp.no_sync():
            _, l0 = ddp(x, y); l0.backward()
        if a.ref_allreduce:
            for p in model.parameters(): dist.all_reduce(p.grad.clone(), group=ref_pg)
        opt.zero_grad(set_to_none=True)
    w = FRWindow().start()
    _, l = ddp(x, y); l.backward(); opt.step(); opt.zero_grad(set_to_none=True)
    ent = w.stop()
    f.write(json.dumps({"step": s, "seq": [[e["collective_seq_id"], e["in_bytes"]] for e in ent]}) + "\n"); f.flush()
print("done", rank)
