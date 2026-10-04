"""Threads, processes and asyncio on CPU-bound and I/O-bound work (stdlib only).

Run the same file with a normal CPython and a free-threaded one (python3.14t):
    python3.14  gil.py > gil_314.json
    python3.14t gil.py > gil_314t.json

CPU job: a pure-Python loop (sum of i*i % 7 over N integers), about 0.14 s on one core of an M1 Pro.
I/O job: time.sleep(0.1) (or asyncio.sleep), standing in for a network or database wait.
Each measurement is the best of 3 runs (wall-clock seconds).
"""
import asyncio, json, os, sys, sysconfig, time
from concurrent.futures import ThreadPoolExecutor, ProcessPoolExecutor

N = 3_000_000
K = 4          # jobs, and workers


def cpu_job(_=None):
    s = 0
    for i in range(N):
        s += i * i % 7
    return s


def io_job(_=None):
    time.sleep(0.1)


def best(f, reps=3):
    out = []
    for _ in range(reps):
        t = time.perf_counter()
        f()
        out.append(time.perf_counter() - t)
    return round(min(out), 4)


def run_seq(job, k):
    return lambda: [job() for _ in range(k)]


def run_pool(pool_cls, job, k):
    def f():
        with pool_cls(max_workers=k) as ex:
            list(ex.map(job, range(k)))
    return f


def run_async_io(k):
    async def main():
        await asyncio.gather(*[asyncio.sleep(0.1) for _ in range(k)])
    return lambda: asyncio.run(main())


if __name__ == "__main__":
    gil = getattr(sys, "_is_gil_enabled", lambda: True)()
    r = {
        "python": sys.version.split()[0],
        "free_threaded_build": bool(sysconfig.get_config_var("Py_GIL_DISABLED")),
        "gil_enabled_at_runtime": gil,
        "cpu_count": os.cpu_count(),
        "jobs": K,
        "cpu": {
            "one_job": best(cpu_job),
            "sequential": best(run_seq(cpu_job, K)),
            "threads": best(run_pool(ThreadPoolExecutor, cpu_job, K)),
            "processes": best(run_pool(ProcessPoolExecutor, cpu_job, K)),
        },
        "io_100_jobs": {
            "sequential_estimate": 100 * 0.1,
            "threads_100": best(run_pool(ThreadPoolExecutor, io_job, 100)),
            "asyncio_100": best(run_async_io(100)),
        },
    }
    print(json.dumps(r, indent=1))
