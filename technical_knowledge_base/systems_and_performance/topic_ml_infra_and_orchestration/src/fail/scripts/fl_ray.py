#!/usr/bin/env python3
"""Failure lab: the running example on Ray Train (src/data/ray/ray_train.py) with --crash-once.

Same trainer, placement and train() as ray_train.py. With --crash-once in the train.py arguments, the crash
knob (--crash-rank/--crash-step) fires on the first attempt only: the crashing worker drops a marker in the
checkpoint folder before it exits, and a restarted worker group that sees the marker runs without the knob.
Recovery uses train.py's own checkpoints (its latest pointer in --ckpt-dir), not Ray Train's checkpoint API.

usage: python fl_ray.py --address auto --storage /shared/results --name RUN --max-failures N -- <train.py args>
"""
import argparse, os, sys, time


def loop(cfg):
    import ray.train
    sys.path.insert(0, "/opt/mi")
    import train as T
    ctx = ray.train.get_context()
    argv = list(cfg["argv"])
    once = "--crash-once" in argv
    argv = [x for x in argv if x != "--crash-once"]
    a = T.parse(argv)
    marker = os.path.join(a.ckpt_dir, ".fl_crashed")
    if once and os.path.exists(marker):
        a.crash_rank, a.crash_step = -1, -1
    elif once:
        real_exit = os._exit
        def exit_with_marker(code):
            os.makedirs(a.ckpt_dir, exist_ok=True)
            open(marker, "w").write("crashed\n")
            real_exit(code)
        os._exit = exit_with_marker
    extra = {"env": {k.lower(): os.environ[k] for k in ("MASTER_ADDR", "MASTER_PORT", "LOCAL_WORLD_SIZE")
                     if k in os.environ}, "launcher": "ray-train"}
    T.train(a, ctx.get_world_rank(), ctx.get_world_size(), ctx.get_local_rank(),
            host=f"raynode{ctx.get_node_rank()}", extra_start=extra)


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--address", default="auto")
    p.add_argument("--workers", type=int, default=4)
    p.add_argument("--storage", required=True)
    p.add_argument("--name", default="fl-ray")
    p.add_argument("--max-failures", type=int, default=0)
    args, rest = p.parse_known_args()
    argv = [x for x in rest if x != "--"]

    import ray
    from ray.train import ScalingConfig, RunConfig, FailureConfig
    from ray.train.torch import TorchTrainer, TorchConfig

    ray.init(address=args.address, log_to_driver=True)
    trainer = TorchTrainer(
        loop,
        train_loop_config={"argv": argv},
        torch_config=TorchConfig(backend="gloo"),
        scaling_config=ScalingConfig(num_workers=args.workers, use_gpu=False,
                                     resources_per_worker={"CPU": 1, "fake_gpu": 1}, placement_strategy="PACK"),
        run_config=RunConfig(name=args.name, storage_path=args.storage,
                             failure_config=FailureConfig(max_failures=args.max_failures)),
    )
    t = time.time()
    try:
        result = trainer.fit()
        print("FL_RESULT error=", result.error, "secs=", round(time.time() - t, 1), flush=True)
    except Exception as e:
        print("FL_RESULT exception=", type(e).__name__, str(e)[:500], "secs=", round(time.time() - t, 1), flush=True)


if __name__ == "__main__":
    main()
