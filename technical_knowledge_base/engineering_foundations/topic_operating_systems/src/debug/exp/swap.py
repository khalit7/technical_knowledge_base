"""A working set larger than the memory limit, with swap allowed: it does not die, it slows down.
Usage: swap.py <MiB>"""
import resource, sys, time
import numpy as np
sys.path.insert(0, "/exp"); import cg
n = int(sys.argv[1]) << 20
a = np.ones(n, dtype=np.uint8)
for p in range(3):
    r0 = resource.getrusage(resource.RUSAGE_SELF); t = time.perf_counter()
    a[::4096] += 1  # touch every page once
    dt = time.perf_counter() - t; r1 = resource.getrusage(resource.RUSAGE_SELF)
    sw = cg.stat("memory.swap.current", []) if False else int(open("/sys/fs/cgroup/memory.swap.current").read())
    print(f"{sys.argv[1]} MiB working set, pass {p}: {dt:6.2f} s, major faults {r1.ru_majflt - r0.ru_majflt}, "
          f"swap in use {sw >> 20} MiB", flush=True)
