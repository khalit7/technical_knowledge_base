"""A worker that caches every decoded sample (a common "speed-up"): each worker's memory grows until
the cgroup's OOM killer picks the biggest process, which is a worker, not the main process."""
import numpy as np
import torch
from torch.utils.data import Dataset, DataLoader


class Cached(Dataset):
    def __init__(self):
        self.cache = {}

    def __len__(self):
        return 100_000

    def __getitem__(self, i):
        if i not in self.cache:
            self.cache[i] = np.ones(1 << 20, dtype=np.uint8)  # 1 MiB "decoded image", kept forever
        return torch.from_numpy(self.cache[i][:16].copy())


try:
    for step, b in enumerate(DataLoader(Cached(), batch_size=16, num_workers=2, multiprocessing_context="fork")):
        if step % 10 == 0:
            print(f"step {step}", flush=True)
except Exception as e:
    print(f"{type(e).__name__}: {e}", flush=True)
