"""A fixed amount of CPU work per training step, timed, under whatever CPU limit the container has.
Prints what the process believes it has (os.cpu_count, torch threads) and what the cgroup did to it.
Usage: cpu.py <torch threads or 0 for the default> <steps>"""
import os, sys, time, resource
import torch

def cpu_stat():
    d = {}
    for line in open("/sys/fs/cgroup/cpu.stat"):
        k, v = line.split()
        d[k] = int(v)
    return d

n = int(sys.argv[1]); steps = int(sys.argv[2])
if n:
    torch.set_num_threads(n)
cpu_max = open("/sys/fs/cgroup/cpu.max").read().split()
quota = "unlimited" if cpu_max[0] == "max" else f"{int(cpu_max[0]) / int(cpu_max[1]):g} CPUs"
print(f"cpu.max: {' '.join(cpu_max)} ({quota}); os.cpu_count() = {os.cpu_count()}; "
      f"torch threads = {torch.get_num_threads()}")
torch.manual_seed(0)
a = torch.randn(1024, 1024); b = torch.randn(1024, 1024)
for _ in range(3):
    a @ b  # warm up the thread pool
s0 = cpu_stat(); r0 = resource.getrusage(resource.RUSAGE_SELF); t0 = time.perf_counter()
times = []
for _ in range(steps):
    t = time.perf_counter()
    for _ in range(8):
        a @ b
    times.append(time.perf_counter() - t)
wall = time.perf_counter() - t0
s1 = cpu_stat(); r1 = resource.getrusage(resource.RUSAGE_SELF)
times.sort()
print(f"step time: median {times[len(times) // 2] * 1000:.0f} ms, slowest {times[-1] * 1000:.0f} ms, "
      f"total {wall:.2f} s for {steps} steps")
print(f"cpu.stat during the run: nr_periods {s1['nr_periods'] - s0['nr_periods']}, "
      f"nr_throttled {s1['nr_throttled'] - s0['nr_throttled']}, "
      f"throttled_usec {s1['throttled_usec'] - s0['throttled_usec']}, "
      f"usage_usec {s1['usage_usec'] - s0['usage_usec']}")
print(f"context switches: voluntary {r1.ru_nvcsw - r0.ru_nvcsw}, involuntary {r1.ru_nivcsw - r0.ru_nivcsw}")
