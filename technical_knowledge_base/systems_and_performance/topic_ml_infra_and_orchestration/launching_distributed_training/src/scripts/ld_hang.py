"""ld_hang.py: the running example's training loop with one classic distributed bug injected (--case), plus an
in-process hang watchdog. Run under torchrun (4 ranks). Model, data, optimiser and batches are train.py's own
(imported from /opt/mi/train.py); the loop is train.py's loop without checkpoints.

Cases (all fire at step --at, default 5):
  ok           no bug (the baseline).
  rank0_extra  rank 0 alone all-reduces a metric (code under `if rank == 0:` that calls a collective).
  shape        rank 3 all-reduces a tensor of shape [2] where the others use shape [] (a metric built differently).
  uneven       rank 3 has one batch fewer, so its loop ends one step early (uneven data shards).
  stuck        rank 1 blocks forever inside its "data loader" (a deadlock in user code); the others wait in a collective.

Watchdog: a daemon thread notes the time of every completed step; if no step completes for --watch-s seconds it
writes, once, (1) every thread's Python stack with faulthandler and (2) this rank's flight-recorder ring buffer
(torch._C._distributed_c10d._dump_fr_trace, a pickle that torchfrtrace reads) into --dump-dir.
"""
import argparse, datetime, faulthandler, importlib.util, json, os, signal, sys, threading, time

import torch
import torch.distributed as dist
import torch.nn as nn
import torch.nn.functional as F

spec = importlib.util.spec_from_file_location("mi_train", "/opt/mi/train.py")
T = importlib.util.module_from_spec(spec); spec.loader.exec_module(T)

p = argparse.ArgumentParser()
p.add_argument("--case", default="ok")
p.add_argument("--at", type=int, default=5)
p.add_argument("--steps", type=int, default=12)
p.add_argument("--timeout-s", type=int, default=60)
p.add_argument("--watch-s", type=float, default=20)
p.add_argument("--dump-dir", default="/w/dump")
a = p.parse_args()
ta = T.parse([])  # train.py defaults: same model, data, batch, seed

rank, world = int(os.environ["RANK"]), int(os.environ["WORLD_SIZE"])
faulthandler.register(signal.SIGUSR1, all_threads=True)  # `kill -USR1 <pid>` prints all stacks to stderr
T0 = time.time()


def log(ev, **kw):
    print(json.dumps({"ev": ev, "rank": rank, "t": round(time.time() - T0, 3), "ts": round(time.time(), 3), **kw}),
          flush=True)


last = [time.time()]


def watchdog():
    while True:
        time.sleep(1)
        if time.time() - last[0] > a.watch_s:
            os.makedirs(a.dump_dir, exist_ok=True)
            with open(os.path.join(a.dump_dir, f"stacks_{rank}.txt"), "w") as f:
                faulthandler.dump_traceback(file=f, all_threads=True)
            try:
                with open(os.path.join(a.dump_dir, f"fr_{rank}"), "wb") as f:
                    f.write(torch._C._distributed_c10d._dump_fr_trace())
                log("watchdog_dump", idle_s=round(time.time() - last[0], 1))
            except Exception as e:  # noqa
                log("watchdog_dump_failed", err=repr(e)[:200])
            return


threading.Thread(target=watchdog, daemon=True).start()
dist.init_process_group("gloo", timeout=datetime.timedelta(seconds=a.timeout_s))
log("init", world=world, debug=os.environ.get("TORCH_DISTRIBUTED_DEBUG", "OFF"))

torch.set_num_threads(1); torch.use_deterministic_algorithms(True)
data, vocab = T.load_text(ta.data)
torch.manual_seed(ta.seed)
model = T.GPT(vocab, ta.d, ta.layers, ta.heads, ta.ctx)
opt = torch.optim.AdamW(model.parameters(), lr=ta.lr)
ddp = nn.parallel.DistributedDataParallel(model)


def next_batch(step):  # the "data loader"
    if a.case == "stuck" and rank == 1 and step == a.at:
        log("bug", what="rank 1 blocks forever in its data loader")
        threading.Event().wait()  # never set
    return T.get_batch(data, step, ta, rank, world)


steps = a.steps - 1 if (a.case == "uneven" and rank == 3) else a.steps
try:
    for step in range(steps):
        x, y = next_batch(step)
        loss = F.cross_entropy(ddp(x).view(-1, vocab), y.view(-1))
        opt.zero_grad(set_to_none=True); loss.backward(); opt.step()
        g = loss.detach().clone()
        if a.case == "shape" and rank == 3 and step == a.at:
            log("bug", what="rank 3 all-reduces shape [2]")
            g = torch.stack([g, g])
        dist.all_reduce(g)
        if a.case == "rank0_extra" and rank == 0 and step == a.at:
            log("bug", what="rank 0 alone all-reduces a metric")
            acc = torch.tensor([0.5]); dist.all_reduce(acc)
        last[0] = time.time()
        log("step", step=step + 1, gloss=round(float(g.flatten()[0]) / world, 6))
    log("end", steps=steps)
    dist.destroy_process_group()
except Exception as e:  # noqa
    log("error", type=type(e).__name__, msg=str(e)[:1500])
    raise
