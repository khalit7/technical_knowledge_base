"""Copy-on-write after fork, one level below the root page: reference counts AND the cyclic garbage collector.
A parent builds 1,000,000 two-element lists (containers the cyclic GC tracks; a tuple of ints would be
untracked by the parent's own collection, so it would not show the effect), forks, and the child does one thing;
we read the child's Private_Dirty (pages it now owns alone, i.e. copied) before and after.
  touch   : the child reads every list (refcount writes only)
  collect : the child runs gc.collect() without reading the lists (the GC writes to every tracked object's header)
  collect_frozen : the parent called gc.freeze() before fork, so the child's collection skips those objects
  numpy   : the same data as one numpy array, child sums it
Usage: python cow_gc.py
"""
import gc
import os
import sys

import numpy as np

N = 1_000_000


def private_dirty_kb(pid="self"):
    with open(f"/proc/{pid}/smaps_rollup") as f:
        for line in f:
            if line.startswith("Private_Dirty:"):
                return int(line.split()[1])
    return -1


def run(case):
    gc.disable()  # no collection at a random moment in the parent: we decide when it happens
    if case == "numpy":
        data = np.arange(2 * N, dtype=np.int64).reshape(N, 2)
    else:
        data = [[i, i + 1] for i in range(N)]
    gc.collect()  # parent collects once, so the objects sit in the oldest generation
    if case == "collect_frozen":
        gc.freeze()  # Python 3.7+: move every tracked object to a permanent generation the GC ignores
    r, w = os.pipe()
    pid = os.fork()
    if pid == 0:
        os.close(r)
        before = private_dirty_kb()
        if case == "touch":
            s = 0
            for t in data:
                s += 1
        elif case in ("collect", "collect_frozen"):
            gc.collect()
        elif case == "numpy":
            s = int(data.sum())
        after = private_dirty_kb()
        os.write(w, f"{before} {after}".encode())
        os._exit(0)
    os.close(w)
    msg = os.read(r, 200).decode()
    os.waitpid(pid, 0)
    before, after = map(int, msg.split())
    copied = after - before
    print(f"cow_gc case {case:15s} objects {N} child_private_dirty_before_kb {before} after_kb {after} "
          f"copied_kb {copied} pages {copied // 4}", flush=True)


if __name__ == "__main__":
    print(f"python {sys.version.split()[0]} numpy {np.__version__}")
    for case in sys.argv[1:] or ["touch", "collect", "collect_frozen", "numpy"]:
        # each case in a fresh interpreter so the parent's heap starts the same
        if os.fork() == 0:
            run(case)
            os._exit(0)
        os.wait()
