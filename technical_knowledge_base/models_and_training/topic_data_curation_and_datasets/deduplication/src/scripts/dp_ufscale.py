"""Union-find memory and time at larger sizes (rough: shared machine, one core, low priority).
1. datatrove's own structure: a Python dict union_set {(file, doc): (file, doc)} plus set_size, filled with N nodes in
   clusters of 4 (tracemalloc bytes per node).
2. A numpy int64 parent array with scipy's connected_components on a random duplicate graph (N nodes, N/2 edges).
Writes ../data/out/dp_ufscale.json.
"""
import json, os, sys, time, tracemalloc
import numpy as np
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import dp_common as P

res = {"dict": [], "scipy": []}
for N in (100_000, 1_000_000):
    tracemalloc.start()
    union_set, set_size = {}, {}
    t = time.time()
    for k in range(0, N, 4):
        root = (k // 50000, k % 50000)
        union_set[root] = root
        set_size[root] = 4
        for d in range(1, 4):
            x = ((k + d) // 50000, (k + d) % 50000)
            union_set[x] = root
    cur, peak = tracemalloc.get_traced_memory()
    tracemalloc.stop()
    res["dict"].append({"nodes": N, "bytes_per_node": round(cur / N, 1), "rough_s": round(time.time() - t, 2)})
    print(res["dict"][-1], flush=True)
    del union_set, set_size

from scipy.sparse import coo_matrix
from scipy.sparse.csgraph import connected_components
rng = np.random.default_rng(0)
for N in (1_000_000, 10_000_000):
    a = rng.integers(0, N, N // 2); b = rng.integers(0, N, N // 2)
    t = time.time()
    g = coo_matrix((np.ones(a.size, dtype=np.int8), (a, b)), shape=(N, N)).tocsr()
    nc, lab = connected_components(g, directed=False)
    res["scipy"].append({"nodes": N, "edges": int(a.size), "components": int(nc), "rough_s": round(time.time() - t, 2),
                         "label_bytes_per_node": lab.itemsize})
    print(res["scipy"][-1], flush=True)
P.save("dp_ufscale.json", res)
