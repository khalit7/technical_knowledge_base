"""Allocate and touch anonymous memory in steps: grow.py <step MiB> <total MiB> <passes over it at the end>."""
import sys, time
import numpy as np
step, total, passes = int(sys.argv[1]), int(sys.argv[2]), int(sys.argv[3])
blocks = []
for i in range(total // step):
    blocks.append(np.ones(step << 20, dtype=np.uint8)); time.sleep(0.15)
    print(f"grow: {(i + 1) * step} MiB touched", flush=True)
for p in range(passes):
    t = time.perf_counter()
    for b in blocks: b[::4096] += 1
    print(f"grow: pass {p} over {total} MiB took {time.perf_counter() - t:.2f} s", flush=True)
