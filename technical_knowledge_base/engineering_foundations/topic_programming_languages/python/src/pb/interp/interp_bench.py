"""Threads vs processes vs subinterpreters on one interpreter (3.14+). Usage: python interp_bench.py DATA.jsonl OUT.json
1. Start-up: time to create a worker and run a trivial call in it (median of 20).
2. The same token-count job split 4 ways with ThreadPoolExecutor, ProcessPoolExecutor, InterpreterPoolExecutor (median of 5)."""
import json, os, statistics, sys, time
from collections import Counter
from concurrent.futures import ThreadPoolExecutor, ProcessPoolExecutor, InterpreterPoolExecutor
from concurrent import interpreters
import multiprocessing as mp
import threading
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "ft"))
from tokwork import count_slice


def noop():
    return 1


def main():
    data, out = sys.argv[1], sys.argv[2]
    lines = open(data, encoding="utf-8").read().splitlines(keepends=True)
    expected = count_slice(lines)
    res = {"python": sys.version.split()[0], "lines": len(lines), "loadavg_start": os.getloadavg(),
           "mp_start_method": mp.get_start_method()}

    def med(f, n):
        xs = []
        for _ in range(n):
            t = time.perf_counter(); f(); xs.append(time.perf_counter() - t)
        return round(statistics.median(xs) * 1000, 3)

    def one_thread():
        t = threading.Thread(target=noop); t.start(); t.join()

    def one_interp():
        i = interpreters.create(); i.call(noop); i.close()

    def one_process():
        p = mp.get_context("spawn").Process(target=noop); p.start(); p.join()

    res["startup_ms"] = {"thread": med(one_thread, 20), "subinterpreter": med(one_interp, 20),
                         "process_spawn": med(one_process, 10)}
    k = len(lines) // 4
    parts = [lines[i * k:(i + 1) * k if i < 3 else len(lines)] for i in range(4)]
    res["job_s"] = {}
    for name, Ex in [("serial", None), ("threads", ThreadPoolExecutor), ("processes", ProcessPoolExecutor),
                     ("subinterpreters", InterpreterPoolExecutor)]:
        xs = []
        for _ in range(5):
            t = time.perf_counter()
            if Ex is None:
                total = count_slice(lines)
            else:
                with Ex(max_workers=4) as ex:
                    total = Counter()
                    for r in ex.map(count_slice, parts):
                        total.update(r)
            xs.append(time.perf_counter() - t)
            assert total == expected, name
        res["job_s"][name] = {"median_s": round(statistics.median(xs), 4), "all_s": [round(x, 4) for x in xs]}
    res["loadavg_end"] = os.getloadavg()
    json.dump(res, open(out, "w"), indent=1)
    print(res["python"], res["startup_ms"], {k: v["median_s"] for k, v in res["job_s"].items()})


if __name__ == "__main__":
    main()
