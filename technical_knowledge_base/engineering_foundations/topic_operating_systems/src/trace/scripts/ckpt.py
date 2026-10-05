"""Three ways to write the same checkpoint (the running job's model and optimizer state).

naive : torch.save(obj, path) straight over the old file (a crash mid-write leaves a torn file)
fsync : write, flush, fsync (durable, but still not atomic: a crash mid-write still tears it)
safe  : write to path.tmp, flush, fsync, os.replace over path, fsync the directory (atomic and durable)
Prints elapsed time; run under strace to see the calls.
"""
import os
import sys
import time

import torch
from torch import nn

mode, path = sys.argv[1], sys.argv[2]
reps = int(sys.argv[3]) if len(sys.argv) > 3 else 1
torch.manual_seed(0)
model = nn.Sequential(nn.Linear(256, 128), nn.ReLU(), nn.Linear(128, 10))
opt = torch.optim.SGD(model.parameters(), lr=0.1, momentum=0.9)
model(torch.randn(4, 256)).sum().backward()
opt.step()
obj = {"step": 20, "model": model.state_dict(), "opt": opt.state_dict()}


def naive():
    torch.save(obj, path)


def with_fsync():
    with open(path, "wb") as f:
        torch.save(obj, f)
        f.flush()
        os.fsync(f.fileno())


def safe():
    tmp = path + ".tmp"
    with open(tmp, "wb") as f:
        torch.save(obj, f)
        f.flush()
        os.fsync(f.fileno())
    os.replace(tmp, path)
    dfd = os.open(os.path.dirname(path) or ".", os.O_RDONLY)
    os.fsync(dfd)
    os.close(dfd)


fn = {"naive": naive, "fsync": with_fsync, "safe": safe}[mode]
times = []
for _ in range(reps):
    os.access("/phase/ckpt_begin", os.F_OK)
    t = time.perf_counter()
    fn()
    times.append(time.perf_counter() - t)
    os.access("/phase/ckpt_end", os.F_OK)
times.sort()
print(f"{mode}: median of {reps}: {times[len(times) // 2] * 1e3:.2f} ms, "
      f"min {times[0] * 1e3:.2f} ms, max {times[-1] * 1e3:.2f} ms, size {os.path.getsize(path)} B")
