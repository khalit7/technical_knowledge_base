"""torchrun's elastic restart, on 2 CPU processes: rank 1 crashes at step 3 of the first attempt; torchrun
(--max-restarts 2) kills the survivors, re-runs the rendezvous and starts every worker again from the top of the
script; the script resumes from the checkpoint it wrote every step.

    PORT=29531 sh run.sh 2 --max-restarts 2 elastic.py      (run_elastic.sh wraps it and keeps torchrun's log)
"""
import json, os, time
from dptc import *
from torch.nn.parallel import DistributedDataParallel as DDP
from model import GPTConfig, make_model, get_batch, make_optimizer

attempt = int(os.environ["TORCHELASTIC_RESTART_COUNT"])
rank, world = init(timeout_s=20)
cfg = GPTConfig()
model = make_model(cfg)
opt = make_optimizer(model)
ck = os.path.join(SCRATCH, "elastic_ckpt.pt")
LOG = os.path.join(SCRATCH, "elastic_log%s.jsonl" % ("_ref" if os.environ.get("NOCRASH") else ""))
start = 0
if attempt == 0 and rank == 0:
    for f in (ck, LOG):
        if os.path.exists(f): os.remove(f)
dist.barrier()
if os.path.exists(ck):
    st = torch.load(ck, weights_only=True)
    model.load_state_dict(st["model"]); opt.load_state_dict(st["opt"]); start = st["step"] + 1
ddp = DDP(model)
def log(**k):
    with open(LOG, "a") as f:
        f.write(json.dumps({"attempt": attempt, "rank": rank, "pid_hidden": True, "wall": time.time(), **k}) + "\n")
log(event="start", resume_from_step=start)
for s in range(start, 6):
    if attempt == 0 and rank == 1 and s == 3 and not os.environ.get("NOCRASH"):
        log(event="crash", step=s)
        raise RuntimeError("simulated failure on rank 1 at step 3")
    x, y = get_batch(cfg, s * world + rank)
    _, loss = ddp(x, y); loss.backward(); opt.step(); opt.zero_grad(set_to_none=True)
    log(event="step", step=s, loss=round(loss.item(), 5))
    if rank == 0:
        torch.save({"model": model.state_dict(), "opt": opt.state_dict(), "step": s}, ck + ".tmp"); os.replace(ck + ".tmp", ck)
    dist.barrier()
log(event="done")
dist.destroy_process_group()
