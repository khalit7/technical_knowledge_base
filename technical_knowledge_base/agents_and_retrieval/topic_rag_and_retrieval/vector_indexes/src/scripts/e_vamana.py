"""Vamana (DiskANN's graph) from the paper's pseudocode, on SciFact Qwen3 (5,183) and optionally the four corpora
stacked (25,039): the effect of alpha on degree, edge lengths, hops (= SSD reads per query in DiskANN, one node per
4 KB sector) and recall@10, against HNSW's layer-0 hops on the same vectors (hnswlib graph M 16, ef_construction 200,
walked by the port). Deterministic (seeded), no timing.  usage: e_vamana.py [scifact|all4]
Output: $RAG_SCRATCH/vix/out/vamana_<set>.json"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import time

import hnswlib
import numpy as np

import pyhnsw
import vamana
import vixlib as V

which = sys.argv[1] if len(sys.argv) > 1 else "scifact"
if which == "scifact":
    X, Q, *_ = V.beir_set("scifact", "qwen3-emb-0.6b")
    alphas = (1.0, 1.2, 1.4, 2.0)
else:
    X, Q, _, _ = V.all4_set()
    Q = Q[np.sort(np.random.default_rng(1).choice(len(Q), 400, replace=False))]
    alphas = (1.0, 1.2)
GT, _ = V.exact_topk(X, Q)
SAMPLE = np.random.default_rng(3).choice(len(X), 500, replace=False)
KNN, KD = V.exact_topk(X, X[SAMPLE], k=101)  # each sampled node's 100 nearest (plus itself)
nn10 = np.sqrt(np.maximum(0, 2 - 2 * KD[:, 10]))
RANK = np.argsort(np.argsort(-(X[SAMPLE] @ X.T), axis=1), axis=1)  # RANK[r, j] = rank of node j among sample r's neighbours (0 = itself)
R = {"asof": V.stamp(), "set": which, "n": len(X), "queries": len(Q), "R": 32, "L_build": 100,
     "median_10nn_dist": V.r4(np.median(nn10)), "rows": []}
LS = [10, 16, 24, 40, 64, 100, 160]


def far_share(nbrs):
    """Where a node's edges go, by neighbour rank (1 = its nearest other node), over 500 sampled nodes: the median
    rank and the share of edges to nodes outside its 50 nearest (the 'long' edges that let a walk cross the
    collection in few hops)."""
    rk = np.array([RANK[r, j] for r, i in enumerate(SAMPLE) for j in nbrs[i]])
    return {"median_rank": float(np.median(rk)), "share_rank_gt50": V.r4(np.mean(rk > 50)), "share_rank_gt200": V.r4(np.mean(rk > 200))}
for a in alphas:
    t = time.time()
    G = vamana.Vamana(X, R=32, L=100, alpha=a, seed=0).build()
    tb = time.time() - t
    deg = np.array([len(x) for x in G.nbrs])
    lens = np.concatenate([np.sqrt(np.maximum(0, 2 - 2 * (X[G.nbrs[i]] @ X[i]))) for i in range(len(X))])
    rows = []
    for Ls in LS:
        res, hops, nd = [], [], []
        for q in Q:
            G.ndis = 0
            ids, Vx = G.greedy(q, 10, Ls)
            res.append(ids); hops.append(len(Vx)); nd.append(G.ndis)
        rows.append({"L": Ls, "recall10": V.r4(V.recall_at(np.array(res), GT)), "hops": V.r4(np.mean(hops)), "ndis": V.r4(np.mean(nd))})
    r = {"alpha": a, "build_s_python": round(tb, 1), "deg_mean": V.r4(deg.mean()), "deg_full": int((deg == 32).sum()),
         "edge_len_median": V.r4(np.median(lens)), "edge_len_p90": V.r4(np.percentile(lens, 90)),
         "edge_ranks": far_share(G.nbrs), "search": rows}
    R["rows"].append(r)
    print(a, {k: v for k, v in r.items() if k != "search"}, [(x["L"], x["recall10"], x["hops"]) for x in rows])
    V.save("vamana_" + which, R)

# HNSW on the same vectors, walked by the port: hops on layer 0 (+ upper-layer evaluations) and recall
p = hnswlib.Index(space="ip", dim=X.shape[1])
p.init_index(max_elements=len(X), M=16, ef_construction=200, random_seed=100)
p.set_num_threads(1)
p.add_items(X, np.arange(len(X)))
f = os.path.join(V.WORK, "vamana_cmp_%s.bin" % which)
p.save_index(f)
H = pyhnsw.read_hnswlib(f)
P = pyhnsw.HNSW(X, M=16, ef_construction=200)
P.links, P.levels, P.ep, P.maxlevel = H["links"], H["levels"], H["ep"], H["maxlevel"]
hr = []
for ef in LS:
    res, hops, nd = [], [], []
    for q in Q:
        P.ndis = 0
        tr = {"descent": []}
        ids, _ = P.search(q, 10, ef, tr)
        res.append(ids); hops.append(len(tr["steps"]) + len(tr["descent"])); nd.append(P.ndis)
    hr.append({"ef": ef, "recall10": V.r4(V.recall_at(np.array(res), GT)), "hops": V.r4(np.mean(hops)), "ndis": V.r4(np.mean(nd))})
R["hnsw_same_vectors"] = {"M": 16, "efc": 200, "rows": hr, "edge_ranks_layer0": far_share([l[0] for l in P.links])}
print("hnsw", [(x["ef"], x["recall10"], x["hops"]) for x in hr])
V.save("vamana_" + which, R)
