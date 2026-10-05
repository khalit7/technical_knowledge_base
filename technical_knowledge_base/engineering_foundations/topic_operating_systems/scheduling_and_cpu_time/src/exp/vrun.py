"""CFS's bookkeeping, read live from /proc/<pid>/sched (CONFIG_SCHED_DEBUG): two busy loops at nice 0 and nice 5 and one
"sleeper" (runs about 1 ms, sleeps 5 ms) share CPU 3. Every 50 ms for 2 s we print each task's vruntime and the CPU time it
has received (sum_exec_runtime), both in ms. Run as: python vrun.py /tmp/schedlab"""
import os, subprocess, sys, time
S = sys.argv[1]
def sched(pid):
    d = {}
    for line in open(f"/proc/{pid}/sched"):
        if ":" in line:
            k, v = line.split(":", 1); d[k.strip()] = v.strip()
    return d
SLEEPER = "import time\nwhile True:\n    t=time.perf_counter()\n    while time.perf_counter()-t<0.001: pass\n    time.sleep(0.005)\n"
procs = [("nice0", subprocess.Popen(["taskset", "-c", "3", S, "hog"])),
         ("nice5", subprocess.Popen(["taskset", "-c", "3", "nice", "-n", "5", S, "hog"])),
         ("sleeper", subprocess.Popen(["taskset", "-c", "3", sys.executable, "-c", SLEEPER]))]
time.sleep(0.5)
for name, p in procs:
    d = sched(p.pid); print(f"task {name} pid {p.pid} weight {d['se.load.weight']} prio {d['prio']}")
t0 = time.perf_counter()
for i in range(41):
    row = [f"t_ms {round((time.perf_counter() - t0) * 1000)}"]
    for name, p in procs:
        d = sched(p.pid)
        row.append(f"{name} vr {float(d['se.vruntime']):.2f} exec {float(d['se.sum_exec_runtime']):.2f} sw {d['nr_switches']}")
    print(" | ".join(row), flush=True)
    time.sleep(0.05)
for _, p in procs:
    p.kill(); p.wait()
