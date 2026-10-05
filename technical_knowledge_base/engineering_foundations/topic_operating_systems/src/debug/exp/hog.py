"""Allocate and touch memory in steps until told to stop (or until the kernel stops us).
Usage: hog.py <step MiB> <max MiB> [hold seconds] [label]"""
import sys, time
import numpy as np
step, top = int(sys.argv[1]), int(sys.argv[2])
hold = float(sys.argv[3]) if len(sys.argv) > 3 else 0
label = sys.argv[4] if len(sys.argv) > 4 else "hog"
keep = []
while len(keep) * step < top:
    keep.append(np.full(step << 20, 1, dtype=np.uint8))  # np.full writes every byte: pages are really used
    print(f"{label}: {len(keep) * step} MiB allocated and touched", flush=True)
    time.sleep(0.05)
time.sleep(hold)
print(f"{label}: done", flush=True)
