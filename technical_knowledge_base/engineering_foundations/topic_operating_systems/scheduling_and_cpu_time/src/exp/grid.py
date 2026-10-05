"""CPU budget lab: one training loop, a DataLoader feeding it, under a CPU quota. For every (torch threads, workers)
pair: median step time over 20 steps, how many CFS periods were throttled, and involuntary switches.
Each sample costs a real decode-like CPU load in the worker (FFT round trips); the model step is matmuls on torch threads.
Usage (inside a container with --cpus Q): grid.py REPEAT"""
import os, resource, sys, time
import numpy as np, torch
from torch.utils.data import Dataset, DataLoader

class Decode(Dataset):
    def __len__(self): return 1_000_000
    def __getitem__(self, i):
        x = np.random.default_rng(i).standard_normal(8192).astype(np.float32)
        for _ in range(4):
            x = np.fft.irfft(np.fft.rfft(x), n=8192).astype(np.float32)
        return torch.from_numpy(x[:1024].copy())

def cpu_stat():
    return {k: int(v) for k, v in (l.split() for l in open("/sys/fs/cgroup/cpu.stat"))}

def run(T, W, steps=20):
    torch.set_num_threads(T)
    w1 = torch.randn(1024, 1024); w2 = torch.randn(1024, 1024)
    dl = DataLoader(Decode(), batch_size=64, num_workers=W, multiprocessing_context="fork" if W else None,
                    prefetch_factor=2 if W else None)
    it = iter(dl)
    for _ in range(3):  # warm-up: workers started, thread pool spun up
        x = next(it); (torch.tanh(x @ w1) @ w2)
    s0 = cpu_stat(); r0 = resource.getrusage(resource.RUSAGE_SELF); ts = []; wait = 0.0
    for _ in range(steps):
        t = time.perf_counter(); x = next(it); t1 = time.perf_counter()
        for _ in range(6):
            x = torch.tanh(x @ w1) @ w2
        ts.append(time.perf_counter() - t); wait += t1 - t
    s1 = cpu_stat(); r1 = resource.getrusage(resource.RUSAGE_SELF)
    del it, dl
    ts.sort()
    per = s1["nr_periods"] - s0["nr_periods"]; thr = s1["nr_throttled"] - s0["nr_throttled"]
    print(f"threads {T} workers {W} median_ms {ts[len(ts)//2]*1000:.1f} max_ms {ts[-1]*1000:.1f} wait_share {wait/sum(ts):.2f} "
          f"periods {per} throttled {thr} throttled_ms {(s1['throttled_usec']-s0['throttled_usec'])/1000:.0f} "
          f"usage_ms {(s1['usage_usec']-s0['usage_usec'])/1000:.0f} invol_main {r1.ru_nivcsw-r0.ru_nivcsw}", flush=True)

cm = open("/sys/fs/cgroup/cpu.max").read().split()
print(f"repeat {sys.argv[1]} cpu.max {' '.join(cm)} os.cpu_count {os.cpu_count()} vm_load {open('/proc/loadavg').read().split()[0]}", flush=True)
for T in (1, 2, 4, 5):
    for W in (0, 1, 2, 4):
        run(T, W)
