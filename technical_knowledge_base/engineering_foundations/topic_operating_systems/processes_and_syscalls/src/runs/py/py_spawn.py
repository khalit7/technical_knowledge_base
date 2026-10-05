"""P2. Starting a child from a Python process: does the parent's memory matter?
Run as: python py_spawn.py <label> <import_torch 0|1> <extra_mib> [mp]
Prints the parent's memory (smaps_rollup: Rss, Anonymous, AnonHugePages in MiB) and the median ms of
os.fork()+os._exit+waitpid and subprocess.run(["/bin/true"]); with "mp", also multiprocessing.Process
start+join for fork, spawn and forkserver. NumPy asks for transparent huge pages (madvise) on big
arrays unless NUMPY_MADVISE_HUGEPAGE=0."""
import os, statistics, subprocess, sys, time, multiprocessing as mp
import numpy as np
if sys.argv[2] == "1":
    import torch  # noqa: F401
def noop(): pass
def rollup():
    d = {}
    for l in open("/proc/self/smaps_rollup"):
        p = l.split()
        if p[0] in ("Rss:", "Anonymous:", "AnonHugePages:"): d[p[0][:-1]] = int(p[1]) // 1024
    return d
def t_fork():
    t = time.perf_counter(); p = os.fork()
    if p == 0: os._exit(0)
    os.waitpid(p, 0); return time.perf_counter() - t
def t_sub():
    t = time.perf_counter(); subprocess.run(["/bin/true"]); return time.perf_counter() - t
def t_mp(ctx):
    def f():
        t = time.perf_counter(); p = ctx.Process(target=noop); p.start(); p.join(); return time.perf_counter() - t
    return f
def med(f, n): f(); return statistics.median(f() for _ in range(n))
if __name__ == "__main__":
    label, extra = sys.argv[1], int(sys.argv[3])
    keep = np.ones(extra * 1024 * 1024 // 8) if extra else None
    r = rollup()
    out = [label, f"rss {r['Rss']}", f"anon {r['Anonymous']}", f"anon_huge {r['AnonHugePages']}",
           f"os.fork {1000 * med(t_fork, 21):.2f}", f"subprocess {1000 * med(t_sub, 21):.2f}"]
    if len(sys.argv) > 4:
        for m in ("fork", "spawn", "forkserver"):
            out.append(f"mp_{m} {1000 * med(t_mp(mp.get_context(m)), 5):.1f}")
    print("|".join(out), flush=True)
