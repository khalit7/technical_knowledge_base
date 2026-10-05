"""A fixed 'training step' (8 matmuls of 512 x 512, one thread), timed for SECONDS; prints the median and p90 step time
and the cgroup's cpu.weight. Used for the noisy-neighbour runs. Usage: step.py SECONDS"""
import sys, time, torch
torch.set_num_threads(1); a = torch.randn(512, 512); b = torch.randn(512, 512)
for _ in range(20): a @ b
ts = []; end = time.perf_counter() + float(sys.argv[1])
while time.perf_counter() < end:
    t = time.perf_counter()
    for _ in range(8): a @ b
    ts.append((time.perf_counter() - t) * 1000)
ts.sort()
print(f"cpu.weight {open('/sys/fs/cgroup/cpu.weight').read().strip()} steps {len(ts)} median_ms {ts[len(ts) // 2]:.2f} p90_ms {ts[len(ts) * 9 // 10]:.2f}")
