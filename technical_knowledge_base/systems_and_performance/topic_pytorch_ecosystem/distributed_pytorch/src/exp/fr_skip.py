"""The root lab's "skipped all_reduce" hang, dumped the way NCCL's watchdog would (one pickle per rank, named
<prefix><rank>) and read by torchfrtrace, PyTorch's flight-recorder analyser, instead of by eye.

    sh run.sh 2 fr_skip.py <dump dir>      then: torchfrtrace <dump dir> -p rank_  (run_fr.sh does both)
"""
import os, sys
from dptc import *
rank, world = init(timeout_s=5)
D = sys.argv[1]
x = torch.ones(1000)
for step in range(3):
    dist.all_reduce(x)
if rank == 0:
    try:
        dist.all_reduce(x)          # rank 1 skips this one (e.g. a logging all-reduce under `if rank == 0`)
    except Exception:
        pass
else:
    try:
        dist.barrier()
    except Exception:
        pass
import torch._C._distributed_c10d as c
with open(os.path.join(D, f"rank_{rank}"), "wb") as f:
    f.write(c._dump_fr_trace(True, True))
print("dumped", rank)
