"""Is the training loop waiting for data? Time spent blocked in next(loader) against time computing.
Each sample costs about the same CPU as a real decode-and-augment (an FFT round trip on 64 KiB);
the "model step" is a fixed matmul standing in for the GPU's work (there is no GPU here).
Usage: starve.py <num_workers> [steps]"""
import os, sys, time
import numpy as np
import torch
from torch.utils.data import Dataset, DataLoader

torch.set_num_threads(1)
W = int(sys.argv[1]); STEPS = int(sys.argv[2]) if len(sys.argv) > 2 else 30


class Decode(Dataset):
    def __len__(self):
        return 100_000

    def __getitem__(self, i):
        x = np.random.default_rng(i).standard_normal(16384).astype(np.float32)
        for _ in range(6):
            x = np.fft.irfft(np.fft.rfft(x), n=16384).astype(np.float32)  # stand-in for decode + augment
        return torch.from_numpy(x[:256])


dl = DataLoader(Decode(), batch_size=32, num_workers=W, multiprocessing_context="fork" if W else None)
w = torch.randn(256, 256)
wait = comp = 0.0
it = iter(dl)
next(it)  # start-up excluded
t_all = time.perf_counter()
for step in range(STEPS):
    t = time.perf_counter(); x = next(it); t1 = time.perf_counter()
    for _ in range(40):
        x = torch.tanh(x @ w)  # the "model step"
    t2 = time.perf_counter()
    wait += t1 - t; comp += t2 - t1
total = time.perf_counter() - t_all
print(f"num_workers={W}: {total / STEPS * 1000:.0f} ms per step; waiting for data {wait / total:.0%}, "
      f"computing {comp / total:.0%}")
