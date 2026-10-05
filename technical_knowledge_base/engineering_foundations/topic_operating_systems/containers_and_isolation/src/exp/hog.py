"""Allocate memory 10 MiB at a time (touched), printing: MiB allocated, ms since start, the cgroup's memory.current
in MiB. Stands in for a data loader whose working set grows. Usage: python3 hog.py <target MiB>"""
import sys, time
target, chunk = int(sys.argv[1]), 10
cg = open("/proc/self/cgroup").read().split("::")[1].strip()
cur = "/sys/fs/cgroup" + cg + "/memory.current"
t0, keep = time.perf_counter(), []
print("mib ms current_mib", flush=True)
for i in range(1, target // chunk + 1):
    keep.append(b"\x01" * (chunk << 20))
    print(i * chunk, round(1000 * (time.perf_counter() - t0)), int(open(cur).read()) >> 20, flush=True)
print("done", flush=True)
