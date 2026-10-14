"""Check pyhnsw.py against hnswlib 0.8.0: build hnswlib single-threaded on N SciFact Qwen3 vectors, read its file,
build the port with hnswlib's own levels in the same insertion order, and compare every link list and every query's
top 10. Also counts the port's distance computations per query (hnswlib does not expose them in Python).
usage: check_port.py [N] [M] [efc]   Output: $RAG_SCRATCH/vix/out/port_check.json"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import time

import hnswlib
import numpy as np

import pyhnsw
import vixlib as V

N = int(sys.argv[1]) if len(sys.argv) > 1 else 5183
M = int(sys.argv[2]) if len(sys.argv) > 2 else 16
EFC = int(sys.argv[3]) if len(sys.argv) > 3 else 200
X, Q, ids, tq, qrels = V.beir_set("scifact", "qwen3-emb-0.6b")
X = X[:N]
GT, _ = V.exact_topk(X, Q)
p = hnswlib.Index(space="ip", dim=X.shape[1])
p.init_index(max_elements=N, M=M, ef_construction=EFC, random_seed=100)
p.set_num_threads(1)
p.add_items(X, np.arange(N))
f = os.path.join(V.WORK, "check_port_%d_%d_%d.bin" % (N, M, EFC))
p.save_index(f)
H = pyhnsw.read_hnswlib(f)
assert H["labels"] == list(range(N))
t = time.time()
P = pyhnsw.HNSW(X, M=M, ef_construction=EFC)
for i in range(N):
    P.add(i, H["levels"][i])
tb = time.time() - t
same_order = same_set = total = 0
diff_examples = []
for i in range(N):
    for l in range(H["levels"][i] + 1):
        a, b = H["links"][i][l], P.links[i][l]
        total += 1
        same_order += a == b
        same_set += set(a) == set(b)
        if set(a) != set(b) and len(diff_examples) < 5:
            diff_examples.append({"node": i, "layer": l, "hnswlib": a, "port": b})
rows = []
for ef in (10, 40, 100):
    p.set_ef(ef)
    I, _ = p.knn_query(Q, k=10)
    agree, nd, rp = 0, [], []
    for qi in range(len(Q)):
        P.ndis = 0
        r, _ = P.search(Q[qi], 10, ef)
        nd.append(P.ndis)
        agree += set(r) == set(I[qi].tolist())
        rp.append(r)
    rows.append({"ef": ef, "queries_identical_top10": agree, "queries": len(Q), "recall10_hnswlib": V.r4(V.recall_at(I, GT)),
                 "recall10_port": V.r4(V.recall_at(np.array(rp), GT)), "ndis_mean": V.r4(np.mean(nd)), "ndis_p50": float(np.median(nd))})
    print(rows[-1])
out = {"asof": V.stamp(), "n": N, "M": M, "efc": EFC, "levels": {str(l): H["levels"].count(l) for l in range(max(H["levels"]) + 1)},
       "lists": total, "identical_order": same_order, "identical_set": same_set, "diff_examples": diff_examples,
       "port_build_s": round(tb, 1), "search": rows, "file_bytes": os.path.getsize(f), "size_data_per_element": H["size_data_per_element"]}
print({k: v for k, v in out.items() if k not in ("diff_examples", "search")})
V.save("port_check_%d_%d_%d" % (N, M, EFC), out)
