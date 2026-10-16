#!/usr/bin/env python3
"""The running example on Ray Train: 4 workers (2 per Ray node), gloo process group set up by Ray.

Ray Train starts one worker actor per rank, places them (here PACK onto the two local Ray nodes,
1 CPU + 1 fake_gpu each), sets MASTER_ADDR/MASTER_PORT/RANK/WORLD_SIZE, initialises torch.distributed
with the backend from TorchConfig, then calls loop() in every worker. loop() calls the same train()
as torchrun does, so the model, data order and checkpoints are those of train.py.

usage: python ray_train.py --address 127.0.0.1:6380 --storage <dir> [--workers 4] -- <train.py args>
"""
import argparse, os, sys

HERE = os.path.dirname(os.path.abspath(__file__))
TRAIN_DIR = os.path.join(os.path.dirname(HERE), "train")


def loop(cfg):
    import ray.train
    sys.path.insert(0, cfg["train_dir"])
    import train as T
    ctx = ray.train.get_context()
    a = T.parse(cfg["argv"])
    host = f"raynode{ctx.get_node_rank()}"
    extra = {"env": {k.lower(): os.environ[k] for k in ("MASTER_ADDR", "MASTER_PORT", "LOCAL_WORLD_SIZE")
                     if k in os.environ}, "launcher": "ray-train"}
    T.train(a, ctx.get_world_rank(), ctx.get_world_size(), ctx.get_local_rank(), host=host, extra_start=extra)


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--address", default="127.0.0.1:6380")
    p.add_argument("--workers", type=int, default=4)
    p.add_argument("--storage", required=True)
    p.add_argument("--name", default="mi-train")
    p.add_argument("--placement", default="PACK")
    p.add_argument("--max-failures", type=int, default=0)
    args, rest = p.parse_known_args()
    argv = [x for x in rest if x != "--"]

    import ray
    from ray.train import ScalingConfig, RunConfig, FailureConfig
    from ray.train.torch import TorchTrainer, TorchConfig

    ray.init(address=args.address, log_to_driver=True)
    trainer = TorchTrainer(
        loop,
        train_loop_config={"argv": argv, "train_dir": TRAIN_DIR},
        torch_config=TorchConfig(backend="gloo"),
        scaling_config=ScalingConfig(num_workers=args.workers, use_gpu=False,
                                     resources_per_worker={"CPU": 1, "fake_gpu": 1},
                                     placement_strategy=args.placement),
        run_config=RunConfig(name=args.name, storage_path=args.storage,
                             failure_config=FailureConfig(max_failures=args.max_failures)),
    )
    result = trainer.fit()
    print("RAY_RESULT error=", result.error)


if __name__ == "__main__":
    main()
