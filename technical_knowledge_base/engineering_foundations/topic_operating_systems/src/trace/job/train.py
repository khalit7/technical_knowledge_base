"""The running example for Topic: operating-systems: a tiny but real CPU-only training job.

What it does, in the order the operating system sees it:
  1. the interpreter starts (python3 is exec'd, the dynamic loader maps libpython and libc)
  2. import torch (hundreds of files opened and shared libraries mmapped)
  3. the dataset file is opened and memory-mapped (np.memmap: mmap(2) of a file)
  4. a DataLoader starts 2 worker processes (fork, spawn or forkserver)
  5. a few training steps (workers send batches back through pipes and shared memory)
  6. a checkpoint is written safely: write to a temporary file, fsync, rename over the old one,
     fsync the directory
  7. on SIGTERM (what Kubernetes or Slurm send before killing a job) the loop finishes the current
     step, saves a checkpoint and exits 0

Phase markers: before each phase the script calls os.access("/phase/<name>"), a harmless
syscall that fails with ENOENT. In an strace it shows as
    faccessat(AT_FDCWD, "/phase/<name>", F_OK) = -1 ENOENT
so a trace can be cut into phases without guessing.

Usage (inside kb-os-lab:1; see JOB.md):
  python train.py --data /work/data/train.bin --out /work/out \
      [--steps 20] [--workers 2] [--start-method fork|spawn|forkserver] \
      [--sigterm-at-step K] [--threads 2]
"""
import os
import sys
import signal
import time

T0 = time.perf_counter()


def phase(name):
    """Mark a phase in strace output (and in the log)."""
    os.access("/phase/" + name, os.F_OK)
    print(f"[{time.perf_counter() - T0:8.3f}s] phase {name}", flush=True)


phase("start")

import argparse  # noqa: E402

phase("import_torch")
import numpy as np  # noqa: E402
import torch  # noqa: E402
from torch import nn  # noqa: E402
from torch.utils.data import Dataset, DataLoader  # noqa: E402

phase("import_done")

D, CLASSES = 256, 10
ROW = D + 1  # features + label, float32


class MemmapRows(Dataset):
    """A Dataset backed by a memory-mapped file: rows are read by the page cache, not by read()."""

    def __init__(self, path):
        self.path = path
        self.mm = np.memmap(path, dtype=np.float32, mode="r")  # open(2) + mmap(2)
        self.n = self.mm.shape[0] // ROW
        self.mm = self.mm.reshape(self.n, ROW)

    def __getstate__(self):
        # With spawn or forkserver the Dataset is pickled to each worker. Pickling an np.memmap
        # would copy the whole array into the pickle, so drop it and re-map in the worker.
        s = dict(self.__dict__)
        s["mm"] = None
        return s

    def __len__(self):
        return self.n

    def __getitem__(self, i):
        if self.mm is None:  # first access in a spawned worker
            self.mm = np.memmap(self.path, dtype=np.float32, mode="r").reshape(self.n, ROW)
        row = np.array(self.mm[i])  # touching the row faults its page in from the page cache
        return torch.from_numpy(row[:D]), int(row[D])


def save_checkpoint(obj, path):
    """Atomic, durable checkpoint: write a temp file, fsync it, rename over the old, fsync the dir."""
    d = os.path.dirname(path) or "."
    tmp = path + ".tmp"
    with open(tmp, "wb") as f:  # openat(O_WRONLY|O_CREAT|O_TRUNC)
        torch.save(obj, f)  # many write(2) calls
        f.flush()  # empty Python's buffer into the kernel
        os.fsync(f.fileno())  # fsync(2): wait until the device has the data
    os.replace(tmp, path)  # rename(2)/renameat: atomic swap of the name
    dfd = os.open(d, os.O_RDONLY)
    try:
        os.fsync(dfd)  # make the rename itself durable
    finally:
        os.close(dfd)


stop = False


def on_sigterm(signum, frame):
    # Runs in the main thread between bytecodes; only set a flag, do the work in the loop.
    global stop
    stop = True
    print(f"[{time.perf_counter() - T0:8.3f}s] got signal {signum}; will checkpoint and exit", flush=True)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--data", default="/work/data/train.bin")
    ap.add_argument("--out", default="/work/out")
    ap.add_argument("--steps", type=int, default=20)
    ap.add_argument("--workers", type=int, default=2)
    ap.add_argument("--batch", type=int, default=64)
    ap.add_argument("--start-method", default=None, choices=[None, "fork", "spawn", "forkserver"])
    ap.add_argument("--sigterm-at-step", type=int, default=-1,
                    help="send SIGTERM to ourselves at this step (stands in for the scheduler's signal)")
    ap.add_argument("--threads", type=int, default=2)
    ap.add_argument("--no-ckpt", action="store_true")
    ap.add_argument("--preload", default="",
                    help="comma-separated modules the forkserver imports once (multiprocessing.set_forkserver_preload)")
    ap.add_argument("--second-iter", action="store_true",
                    help="after the loop, time the first batch of a fresh iterator (workers are re-created, as in a new epoch)")
    args = ap.parse_args()

    signal.signal(signal.SIGTERM, on_sigterm)  # rt_sigaction(SIGTERM, ...)
    torch.manual_seed(0)
    torch.set_num_threads(args.threads)
    os.makedirs(args.out, exist_ok=True)

    phase("dataset_open")
    ds = MemmapRows(args.data)
    print(f"dataset: {len(ds)} rows from {args.data} ({os.path.getsize(args.data)} bytes)", flush=True)

    phase("model_build")
    model = nn.Sequential(nn.Linear(D, 128), nn.ReLU(), nn.Linear(128, CLASSES))
    phase("optim_build")  # the first optimizer lazily imports torch._dynamo (and sympy): a second import storm
    opt = torch.optim.SGD(model.parameters(), lr=0.1)
    loss_fn = nn.CrossEntropyLoss()

    phase("loader_start")
    ctx = args.start_method if args.workers > 0 else None
    if args.preload:
        import multiprocessing
        multiprocessing.set_forkserver_preload(args.preload.split(","))
    dl = DataLoader(ds, batch_size=args.batch, shuffle=True, num_workers=args.workers,
                    multiprocessing_context=ctx, generator=torch.Generator().manual_seed(0))
    t_loader = time.perf_counter()  # the clock includes creating the workers
    it = iter(dl)  # workers are created here
    step = 0
    while step < args.steps:
        try:
            x, y = next(it)
        except StopIteration:
            it = iter(dl)
            continue
        if step == 0:
            phase("first_batch")
            print(f"time to first batch: {time.perf_counter() - t_loader:.3f}s "
                  f"(start method {ctx or 'none (no workers)'})", flush=True)
        phase(f"step_{step}")
        opt.zero_grad()
        loss = loss_fn(model(x), y)
        loss.backward()
        opt.step()
        if step % 5 == 0:
            print(f"step {step} loss {loss.item():.4f}", flush=True)
        step += 1
        if step == args.sigterm_at_step:
            os.kill(os.getpid(), signal.SIGTERM)  # kill(2); a scheduler would send this from outside
        if stop:
            break

    if args.second_iter:
        del it
        t2 = time.perf_counter()
        it = iter(dl)
        next(it)
        print(f"time to first batch (second iterator): {time.perf_counter() - t2:.3f}s", flush=True)

    phase("ckpt_begin")
    if not args.no_ckpt:
        save_checkpoint({"step": step, "model": model.state_dict(), "opt": opt.state_dict()},
                        os.path.join(args.out, "ckpt.pt"))
    phase("ckpt_end")
    del it, dl  # shuts the workers down
    phase("exit")
    print(f"done at step {step} ({'SIGTERM' if stop else 'finished'}), "
          f"total {time.perf_counter() - T0:.3f}s", flush=True)
    return 0


if __name__ == "__main__":
    sys.exit(main())
