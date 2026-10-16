#!/usr/bin/env python3
"""Launch lab, Ray: the running example's ray_train.py (src/data/ray/ray_train.py) with launch probes.

Same TorchTrainer, 4 workers {"CPU": 1, "fake_gpu": 1}, PACK, gloo. Added, and only recording time:
  * the driver's own timestamps (start, `import ray`, ray.init connected, fit() called, fit() returned);
  * a worker_process_setup_hook (runs in every worker process Ray starts for this job on a worker node) that notes
    when the process was set up and wraps torch.distributed.init_process_group with timestamps;
  * the training function notes when it starts, then calls the same train() as torchrun does.
Writes <out>/driver.json, <out>/raypg_<host>_<pid>.json and <out>/loop_rank<r>.json.
usage: python la_ray_train.py --out DIR [--workers 4] [--start-timeout S] -- <train.py args>
"""
import time
T0 = time.time()
import argparse, json, os, sys


def _w(path, rec):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w") as f:
        json.dump(rec, f)


def make_hook(out):
    def hook():
        import os, time, json, socket
        if not socket.gethostname().startswith("ray-w"):
            return  # the head (driver, Train controller) never trains: do not load torch there (it has 1.5 GB)
        import torch.distributed as dist
        rec = {"pid": os.getpid(), "host": socket.gethostname(), "t_setup": time.time()}
        path = os.path.join(out, f"raypg_{socket.gethostname()}_{os.getpid()}.json")
        orig = dist.init_process_group

        def init_process_group(*a, **k):
            rec["t_pg0"] = time.time()
            rec["env"] = {x: os.environ[x] for x in sorted(os.environ) if x.startswith(
                ("MASTER_", "RANK", "LOCAL_", "WORLD_", "NODE_RANK", "RAY_", "TORCH", "NCCL_", "OMP_", "CUDA_", "ACCELERATE_"))}
            _w2(path, rec)
            try:
                return orig(*a, **k)
            finally:
                rec["t_pg1"] = time.time()
                _w2(path, rec)

        def _w2(p, r):
            os.makedirs(os.path.dirname(p), exist_ok=True)
            with open(p, "w") as f:
                json.dump(r, f)

        dist.init_process_group = init_process_group
        _w2(path, rec)
    return hook


def loop(cfg):
    import ray.train
    t_loop = time.time()
    sys.path.insert(0, "/opt/mi")
    import train as T
    ctx = ray.train.get_context()
    a = T.parse(cfg["argv"])
    host = f"raynode{ctx.get_node_rank()}"
    r = ctx.get_world_rank()
    _w(os.path.join(cfg["out"], f"loop_rank{r}.json"),
       {"rank": r, "pid": os.getpid(), "t_loop": t_loop, "env": {k: os.environ[k] for k in sorted(os.environ) if k.startswith(
           ("MASTER_", "RANK", "LOCAL_", "WORLD_", "NODE_RANK", "RAY_", "TORCH", "NCCL_", "OMP_", "CUDA_", "ACCELERATE_"))}})
    extra = {"env": {k.lower(): os.environ[k] for k in ("MASTER_ADDR", "MASTER_PORT", "LOCAL_WORLD_SIZE")
                     if k in os.environ}, "launcher": "ray-train"}
    T.train(a, r, ctx.get_world_size(), ctx.get_local_rank(), host=host, extra_start=extra)


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--address", default="auto")
    p.add_argument("--workers", type=int, default=4)
    p.add_argument("--out", required=True)
    p.add_argument("--name", default="la-ray")
    p.add_argument("--max-failures", type=int, default=0)
    args, rest = p.parse_known_args()
    argv = [x for x in rest if x != "--"]
    rec = {"t0": T0}
    import ray
    from ray.train import ScalingConfig, RunConfig, FailureConfig
    from ray.train.torch import TorchTrainer, TorchConfig
    rec["t_import"] = time.time()
    ray.init(address=args.address, runtime_env={"worker_process_setup_hook": make_hook(args.out)})
    rec["t_init"] = time.time()
    _w(os.path.join(args.out, "driver.json"), rec)
    trainer = TorchTrainer(
        loop,
        train_loop_config={"argv": argv, "out": args.out},
        torch_config=TorchConfig(backend="gloo"),
        scaling_config=ScalingConfig(num_workers=args.workers, use_gpu=False,
                                     resources_per_worker={"CPU": 1, "fake_gpu": 1}, placement_strategy="PACK"),
        run_config=RunConfig(name=args.name, storage_path="/shared/results",
                             failure_config=FailureConfig(max_failures=args.max_failures)),
    )
    rec["t_fit"] = time.time()
    _w(os.path.join(args.out, "driver.json"), rec)
    try:
        result = trainer.fit()
        rec["error"] = None if result.error is None else f"{type(result.error).__name__}: {result.error}"[:4000]
    except Exception as e:
        rec["error"] = f"{type(e).__name__}: {e}"[:4000]
    rec["t_done"] = time.time()
    _w(os.path.join(args.out, "driver.json"), rec)
    print("LA_RESULT", json.dumps(rec))


if __name__ == "__main__":
    main()
