#!/usr/bin/env python3
"""Ray child page: the running example on Ray Train, checkpointing through Ray Train's own API.

The root's ray_train.py and the Failure lab's fl_ray.py let train.py write its own checkpoints. This script keeps
train.py's model, data order, optimiser and DDP wrapper (imported from /opt/mi/train.py) but runs the loop itself so
that it can call ray.train.report(metrics, checkpoint=...) every 50 steps and restore with
ray.train.get_checkpoint() when Ray Train restarts the worker group. A callback on the controller writes every
controller state change, failure decision and reported checkpoint to /shared/ry/out/<name>_ctl.log.

  docker exec mi-ray-head python /shared/ry/ry_train.py --name ry-t1 --max-failures 1 --crash-rank 3 --crash-step 120

The crash fires on the first attempt only (a marker file). Rough timings: shared laptop, Docker Desktop VM.
"""
import argparse, json, os, socket, sys, tempfile, time

OUT = "/shared/ry/out"


def loop(cfg):
    import torch, torch.nn as nn, torch.nn.functional as F, torch.distributed as dist
    import ray.train
    from ray.train import Checkpoint
    sys.path.insert(0, "/opt/mi")
    import train as T
    ctx = ray.train.get_context()
    rank, world = ctx.get_world_rank(), ctx.get_world_size()
    a = T.parse(cfg["argv"])
    host = f"raynode{ctx.get_node_rank()}"
    t_start = time.time()
    logd = os.path.join("/shared/logs", cfg["name"])
    os.makedirs(logd, exist_ok=True)
    logf = open(os.path.join(logd, f"rank{rank}.jsonl"), "a")

    def emit(ev, **kw):
        rec = {"ev": ev, "rank": rank, "world": world, "host": host, "ts": round(time.time(), 3),
               "t": round(time.time() - t_start, 3), **kw}
        logf.write(json.dumps(rec) + "\n"); logf.flush()

    torch.set_num_threads(a.threads)
    torch.use_deterministic_algorithms(True)
    data, vocab = T.load_text(a.data)
    torch.manual_seed(a.seed)
    model = T.GPT(vocab, a.d, a.layers, a.heads, a.ctx)
    opt = torch.optim.AdamW(model.parameters(), lr=a.lr)
    start = 0
    ck = ray.train.get_checkpoint()
    if ck:
        with ck.as_directory() as d:
            st = torch.load(os.path.join(d, "state.pt"), map_location="cpu")
        model.load_state_dict(st["model"]); opt.load_state_dict(st["opt"]); start = st["step"]
    ddp = nn.parallel.DistributedDataParallel(model)
    marker = "/shared/ry/marks/" + cfg["name"] + ".crashed"
    crash = cfg["crash_rank"] == rank and not os.path.exists(marker)
    emit("start", start_step=start, restored_from=(os.path.basename(ck.path) if ck else None), pid=os.getpid())
    for step in range(start, a.steps):
        x, y = T.get_batch(data, step, a, rank, world)
        loss = F.cross_entropy(ddp(x).view(-1, vocab), y.view(-1))
        opt.zero_grad(set_to_none=True)
        loss.backward()
        opt.step()
        g = loss.detach().clone()
        dist.all_reduce(g)
        g /= world
        done = step + 1
        if a.step_sleep_ms > 0:
            time.sleep(a.step_sleep_ms / 1000)
        if crash and done == cfg["crash_step"]:
            os.makedirs(os.path.dirname(marker), exist_ok=True)
            open(marker, "w").write("1")
            emit("crash", step=done, code=13)
            logf.close()
            os._exit(13)
        if done % a.log_every == 0 or step == start or done == a.steps:
            emit("step", step=done, gloss=g.item())
        if done % a.ckpt_every == 0 or done == a.steps:
            t = time.time()
            with tempfile.TemporaryDirectory() as d:
                c = None
                if rank == 0:
                    torch.save({"model": model.state_dict(), "opt": opt.state_dict(), "step": done}, os.path.join(d, "state.pt"))
                    c = Checkpoint.from_directory(d)
                ray.train.report({"step": done, "gloss": g.item()}, checkpoint=c)
            emit("report", step=done, secs=round(time.time() - t, 4), with_ckpt=rank == 0)
    emit("end", step=a.steps, gloss=g.item())


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--name", required=True)
    p.add_argument("--workers", type=int, default=4)
    p.add_argument("--max-failures", type=int, default=1)
    p.add_argument("--crash-rank", type=int, default=-1)
    p.add_argument("--crash-step", type=int, default=-1)
    p.add_argument("--keep", type=int, default=2)
    args, rest = p.parse_known_args()
    argv = [x for x in rest if x != "--"]

    import ray
    from ray.train import ScalingConfig, RunConfig, FailureConfig, CheckpointConfig, UserCallback
    from ray.train.torch import TorchTrainer, TorchConfig
    from ray.train.v2._internal.execution.callback import ControllerCallback

    log = os.path.join(OUT, args.name + "_ctl.log")

    class Recorder(UserCallback, ControllerCallback):
        def _w(self, **kw):
            with open(log, "a") as f:
                f.write(json.dumps({"ts": round(time.time(), 4), **kw}) + "\n")
        def after_controller_state_update(self, previous_state, current_state):
            self._w(ev="state", prev=type(previous_state).__name__, cur=type(current_state).__name__)
        def before_controller_execute_failure_decision(self, failure_decision):
            self._w(ev="failure_decision", decision=str(failure_decision))
        def after_report(self, run_context, metrics, checkpoint):
            self._w(ev="report", step=metrics[0].get("step"), ckpt=(os.path.basename(checkpoint.path) if checkpoint else None))
        def after_exception(self, run_context, worker_exceptions):
            self._w(ev="exception", ranks=sorted(worker_exceptions), msg=" | ".join(str(e)[:300] for e in worker_exceptions.values()))

    os.makedirs(OUT, exist_ok=True)
    ray.init(address="auto", logging_level="ERROR")
    trainer = TorchTrainer(
        loop,
        train_loop_config={"argv": argv, "name": args.name, "crash_rank": args.crash_rank, "crash_step": args.crash_step},
        torch_config=TorchConfig(backend="gloo"),
        scaling_config=ScalingConfig(num_workers=args.workers, use_gpu=False,
                                     resources_per_worker={"CPU": 1, "fake_gpu": 1}, placement_strategy="PACK"),
        run_config=RunConfig(name=args.name, storage_path="/shared/results",
                             failure_config=FailureConfig(max_failures=args.max_failures),
                             checkpoint_config=CheckpointConfig(num_to_keep=args.keep),
                             callbacks=[Recorder()]),
    )
    t = time.time()
    with open(log, "a") as f:
        f.write(json.dumps({"ts": round(t, 4), "ev": "fit_called"}) + "\n")
    try:
        r = trainer.fit()
        res = {"ok": r.error is None, "error": str(r.error)[:500] if r.error else None,
               "metrics": r.metrics, "checkpoint": os.path.basename(r.checkpoint.path) if r.checkpoint else None,
               "best": [os.path.basename(c.path) for c, _ in (r.best_checkpoints or [])]}
    except Exception as e:
        res = {"ok": False, "exception": type(e).__name__, "msg": str(e)[:800]}
    res["secs"] = round(time.time() - t, 2)
    try:
        res["storage_listing"] = sorted(os.listdir(os.path.join("/shared/results", args.name)))
    except Exception as e:
        res["storage_listing"] = repr(e)
    print("RY_RESULT " + json.dumps(res), flush=True)


if __name__ == "__main__":
    main()
