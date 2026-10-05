"""Allocate and touch <MiB> of anonymous memory, then sleep <s> seconds: hold.py <MiB> <s>."""
import sys, time
import numpy as np
a = np.ones(int(sys.argv[1]) << 20, dtype=np.uint8)
print("holding", sys.argv[1], "MiB", flush=True)
time.sleep(float(sys.argv[2]))
