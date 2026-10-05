"""Copy-on-write growth in DataLoader workers (fork start method).

The Dataset holds 2,000,000 short strings, stored three ways:
  list   a Python list of str objects (each object carries a reference count in its header)
  numpy  one numpy array of fixed-width bytes (one buffer, no per-item objects)
  arrow  a pyarrow array (one buffer of offsets and one of bytes)
The loader shuffles (as training does), so every batch touches items spread over the whole list. Reading a Python object increments and decrements its reference
count, which is a write to the page holding it, so the kernel copies that page into the worker.
Memory is read from /proc/<pid>/smaps_rollup through psutil: RSS counts shared pages in full,
PSS splits each shared page among the processes sharing it, USS counts only pages private to the process.
"""
import os, sys, time
import numpy as np
import psutil
import torch
from torch.utils.data import Dataset, DataLoader

N = 2_000_000
KIND = sys.argv[1]
MB = 1 << 20


def make():
    items = [f"/data/shard_{i % 997:04d}/sample_{i:08d}.jpg" for i in range(N)]
    if KIND == "list":
        return items
    if KIND == "numpy":
        return np.array(items, dtype="S40")
    if KIND == "arrow":
        import pyarrow as pa
        return pa.array(items, type=pa.string())


class Paths(Dataset):
    def __init__(self, items):
        self.items = items

    def __len__(self):
        return N

    def __getitem__(self, i):
        s = self.items[i]
        if KIND == "arrow":
            s = s.as_py()
        return len(s)


def mem(p):
    m = p.memory_full_info()
    return m.rss / MB, m.pss / MB, m.uss / MB


def report(tag, main, workers):
    print(f"{tag}")
    print(f"  {'process':<10}{'RSS MiB':>9}{'PSS MiB':>9}{'USS MiB':>9}")
    rows = [("main", main)] + [(f"worker {k}", w) for k, w in enumerate(workers)]
    tot = [0.0, 0.0, 0.0]
    for name, p in rows:
        r = mem(p)
        tot = [a + b for a, b in zip(tot, r)]
        print(f"  {name:<10}{r[0]:9.0f}{r[1]:9.0f}{r[2]:9.0f}")
    print(f"  {'sum':<10}{tot[0]:9.0f}{tot[1]:9.0f}{tot[2]:9.0f}")


ds = Paths(make())
main = psutil.Process()
print(f"dataset kind: {KIND}, {N} items, start method fork, 2 workers, batch 1000, shuffled")
dl = DataLoader(ds, batch_size=1000, shuffle=True, num_workers=2, multiprocessing_context="fork",
                persistent_workers=True, generator=torch.Generator().manual_seed(0))
it = iter(dl)
next(it)
workers = [psutil.Process(w.pid) for w in it._workers]
report("after the first batch", main, workers)
t = time.perf_counter()
n = 1
for _ in it:
    n += 1
    if n in (N // 1000 // 4, N // 1000 // 2):
        report(f"after {n} batches", main, workers)
report(f"after one epoch ({n} batches, {time.perf_counter() - t:.1f} s)", main, workers)
