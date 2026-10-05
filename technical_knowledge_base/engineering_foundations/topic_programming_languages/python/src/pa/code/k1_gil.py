"""The same CPU-bound job and the same I/O-bound job, run serially, on 4 threads and on 4 processes.
Wall-clock seconds, best of 3. CPU job: count primes below 250,000 by trial division, 4 times.
Pool start-up is inside the timing, as it is in a real script."""
import os, sys, sysconfig, time
from concurrent.futures import ThreadPoolExecutor, ProcessPoolExecutor

def count_primes(limit):                 # pure-Python CPU work: holds the GIL while it runs
    n = 0
    for k in range(2, limit):
        for d in range(2, int(k ** 0.5) + 1):
            if k % d == 0:
                break
        else:
            n += 1
    return n

def wait_io(_):                          # stands in for a network call: sleeping releases the GIL
    time.sleep(0.2)
    return 1

def pool(kind, fn, args):
    with kind(max_workers=4) as ex:
        return list(ex.map(fn, args))

def best(f, reps=3):
    ts = []
    for _ in range(reps):
        t0 = time.perf_counter(); f(); ts.append(time.perf_counter() - t0)
    return min(ts)

if __name__ == "__main__":
    gil = "free-threaded" if sysconfig.get_config_var("Py_GIL_DISABLED") else "GIL"
    print(f"Python {sys.version.split()[0]} ({gil} build), {os.cpu_count()} CPUs, load {os.getloadavg()[0]:.2f}")
    jobs = [250_000] * 4
    for name, f in [("CPU serial", lambda: [count_primes(j) for j in jobs]),
                    ("CPU 4 threads", lambda: pool(ThreadPoolExecutor, count_primes, jobs)),
                    ("CPU 4 processes", lambda: pool(ProcessPoolExecutor, count_primes, jobs)),
                    ("I/O serial", lambda: [wait_io(i) for i in range(4)]),
                    ("I/O 4 threads", lambda: pool(ThreadPoolExecutor, wait_io, range(4)))]:
        print(f"{name:16} {best(f):6.3f} s")
