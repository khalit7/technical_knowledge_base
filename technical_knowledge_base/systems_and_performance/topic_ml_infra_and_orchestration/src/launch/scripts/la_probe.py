#!/usr/bin/env python3
"""Launch lab worker probe: runs the running example (/opt/mi/train.py) unchanged, timing each start-up stage.

Started by torchrun (or srun) in place of train.py. Records, per rank:
  t0       the Python interpreter reached this file (before `import torch`)
  t_import `import torch` and train.py imported
  t_pg0    just before torch.distributed.init_process_group (store connect + gloo full mesh)
  t_pg1    just after it
and the launcher's environment (rendezvous and scheduler variables only), then calls train.train(),
whose own "start" event (model, data, DDP wrapper ready) and first "step" event close the timeline.
Writes <log-dir>/probe_rank<r>.json. All times are unix seconds from the container's clock.
"""
import time
T0 = time.time()
import datetime, json, os, signal, socket, sys

KEEP_PREFIX = ("MASTER_", "RANK", "LOCAL_", "WORLD_", "GROUP_", "ROLE_", "TORCHELASTIC_", "TORCH_", "NCCL_",
               "SLURM_", "SLURMD_", "JOB_COMPLETION_INDEX", "JOBSET_", "KUBERNETES_SERVICE", "HOSTNAME",
               "OMP_NUM_THREADS", "CUDA_VISIBLE_DEVICES", "NODE_RANK", "ACCELERATE_", "PMI", "PMIX_", "LA_")

import torch
import torch.distributed as dist
sys.path.insert(0, "/opt/mi")
import train as T
T_IMPORT = time.time()


def main():
    a = T.parse(sys.argv[1:])
    rank, world = int(os.environ.get("RANK", 0)), int(os.environ.get("WORLD_SIZE", 1))
    local_rank = int(os.environ.get("LOCAL_RANK", 0))
    env = {k: v for k, v in sorted(os.environ.items()) if k.startswith(KEEP_PREFIX)}
    rec = {"rank": rank, "world": world, "local_rank": local_rank, "host": socket.gethostname(), "pid": os.getpid(),
           "t0": T0, "t_import": T_IMPORT, "n_env": len(os.environ), "env": env}
    out = os.path.join(a.log_dir or ".", f"probe_rank{rank}.json")
    os.makedirs(os.path.dirname(out), exist_ok=True)

    def dump():
        with open(out, "w") as f:
            json.dump(rec, f)

    rec["t_pg0"] = time.time()
    dump()
    if world > 1:
        try:
            dist.init_process_group(a.backend, timeout=datetime.timedelta(seconds=a.timeout_s))
        except Exception as e:  # keep the real error for the hang drills
            rec["t_pg_err"] = time.time()
            rec["pg_error"] = f"{type(e).__name__}: {e}"[:4000]
            dump()
            raise
    rec["t_pg1"] = time.time()
    dump()

    def fr_dump(tag):
        # PyTorch's flight recorder (on by default, last 2000 collectives; gloo records into it too)
        try:
            raw = torch._C._distributed_c10d._dump_fr_trace_json(True, False)
            with open(os.path.join(a.log_dir or ".", f"fr_rank{rank}_{tag}.json"), "wb") as f:
                f.write(raw)
        except Exception as e:
            rec["fr_error"] = repr(e)
            dump()

    signal.signal(signal.SIGUSR1, lambda *_: fr_dump("sigusr1"))  # `kill -USR1 <pid>` on a hung rank
    try:
        T.train(a, rank, world, local_rank, extra_start={"probe": out})
    except Exception as e:
        rec["t_err"] = time.time()
        rec["error"] = f"{type(e).__name__}: {e}"[:4000]
        dump()
        fr_dump("error")
        raise
    rec["t_end"] = time.time()
    dump()
    if world > 1:
        dist.destroy_process_group()


if __name__ == "__main__":
    main()
