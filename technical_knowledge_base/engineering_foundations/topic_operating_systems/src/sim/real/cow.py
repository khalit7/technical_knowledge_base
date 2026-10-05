# Copy-on-write after fork, counted from /proc/<pid>/smaps_rollup (Linux 4.14+).
# The parent builds 1,000,000 objects, forks, and the child does one thing with them.
# Pages the child writes stop being shared: they show up as the child's Private_Dirty.
# Reading a Python object still writes to it: the loop's reference count increment
# (Py_INCREF) stores into the object's header, so every page holding an object is copied.
import os, sys, time
import numpy as np

N = 1_000_000

def rollup(pid):
    d = {}
    with open(f"/proc/{pid}/smaps_rollup") as f:
        for line in f:
            p = line.split()
            if len(p) >= 3 and p[2] == "kB":
                d[p[0].rstrip(":")] = int(p[1])
    return d

def run(kind, action):
    if kind == "list":
        data = [i + 1_000_000 for i in range(N)]      # distinct int objects (not the cached small ints)
    else:
        data = np.arange(N, dtype=np.int64) + 1_000_000  # one object, 8 MB of raw numbers
    r, w = os.pipe(); r2, w2 = os.pipe()
    pid = os.fork()
    if pid == 0:
        os.read(r, 1)                      # wait until the parent has taken the "before" reading
        if action == "iterate":
            s = 0
            for x in data:                 # Python-level loop: Py_INCREF/DECREF on every element
                s += 1
        elif action == "len":
            s = len(data)                  # touches only the container's header
        elif action == "sum":
            s = int(data.sum())            # numpy reads raw memory in C, no per-element object
        os.write(w2, b"x"); os.read(r, 1); os._exit(0)
    before = rollup(pid)
    os.write(w, b"g"); os.read(r2, 1)
    after = rollup(pid)
    os.write(w, b"q"); os.waitpid(pid, 0)
    dpriv = after["Private_Dirty"] - before["Private_Dirty"]
    print(f"{kind:5s} {action:8s} child Private_Dirty before {before['Private_Dirty']:7d} kB after {after['Private_Dirty']:7d} kB "
          f"copied {dpriv:7d} kB = {dpriv // 4:6d} pages; child Shared_Dirty before {before['Shared_Dirty']} kB")

if __name__ == "__main__":
    print("python", sys.version.split()[0], "numpy", np.__version__, "page", os.sysconf("SC_PAGE_SIZE"), "bytes; N", N)
    xs = [i + 1_000_000 for i in range(N)]
    gaps = {}
    for a, b in zip(xs, xs[1:]):
        g = id(b) - id(a)
        gaps[g] = gaps.get(g, 0) + 1
    top = max(gaps, key=gaps.get)
    print(f"int object: sys.getsizeof {sys.getsizeof(xs[0])} bytes; most common address gap between consecutive ints {top} bytes ({gaps[top] / (N - 1):.1%} of pairs)")
    del xs
    for kind, action in [("list", "len"), ("list", "iterate"), ("numpy", "sum"), ("numpy", "iterate")]:
        run(kind, action)
