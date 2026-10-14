"""HNSW from the inside (deterministic, no timing): levels, degrees, reachability, and the M / efConstruction /
efSearch grid, on SciFact (Qwen3-Embedding 1,024-d and bge-small 384-d) and the four corpora stacked (25,039).
FAISS IndexHNSWFlat built single-threaded (deterministic); distance computations and hops per query from FAISS's
HNSWStats. hnswlib checks at its defaults and at pgvector's defaults.
Output: $RAG_SCRATCH/vix/out/hnsw.json"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from collections import deque

import faiss
import hnswlib
import numpy as np

import vixlib as V

R = {"asof": V.stamp(), "faiss": faiss.__version__, "hnswlib": "0.8.0"}
EFS = [10, 16, 24, 40, 64, 100, 160, 256, 400, 800]


def build(X, M, efc):
    faiss.omp_set_num_threads(1)
    h = faiss.IndexHNSWFlat(X.shape[1], M, faiss.METRIC_INNER_PRODUCT)
    h.hnsw.efConstruction = efc
    h.add(X)
    faiss.omp_set_num_threads(2)
    return h


def sweep(h, Q, GT, labels=None, efs=EFS):
    rows = []
    for ef in efs:
        h.hnsw.efSearch = ef
        st = faiss.cvar.hnsw_stats
        st.reset()
        D, I = h.search(Q, max(10, min(ef, 100)))
        r = {"ef": ef, "recall10": V.r4(V.recall_at(I, GT)), "ndis": round(st.ndis / len(Q), 1), "nhops": round(st.nhops / len(Q), 1)}
        if labels:
            r.update({k: V.r4(v) for k, v in V.ndcg_run(I, D, *labels).items()})
        rows.append(r)
    return rows


def graph_stats(h):
    g = h.hnsw
    levels = faiss.vector_to_array(g.levels) - 1  # FAISS stores level+1
    nb = faiss.vector_to_array(g.neighbors)
    off = faiss.vector_to_array(g.offsets).astype(np.int64)
    cum = faiss.vector_to_array(g.cum_nneighbor_per_level).astype(np.int64)
    n = len(levels)
    M0 = cum[1] - cum[0]
    deg0 = np.empty(n, dtype=np.int64)
    adj0 = []
    indeg = np.zeros(n, dtype=np.int64)
    for i in range(n):
        a = nb[off[i] + cum[0]: off[i] + cum[1]]
        a = a[a >= 0]
        adj0.append(a)
        deg0[i] = len(a)
        indeg[a] += 1
    # reachability on layer 0 from the entry point (search always ends on layer 0)
    seen = np.zeros(n, bool)
    dq = deque([g.entry_point]); seen[g.entry_point] = True
    while dq:
        u = dq.popleft()
        for v in adj0[u]:
            if not seen[v]:
                seen[v] = True; dq.append(v)
    lv = {str(l): int((levels == l).sum()) for l in range(int(levels.max()) + 1)}
    return {"n": n, "M0": int(M0), "max_level": int(levels.max()), "entry_point": int(g.entry_point), "level_counts": lv,
            "deg0_hist": {str(k): int(v) for k, v in zip(*np.unique(deg0, return_counts=True))},
            "deg0_mean": V.r4(deg0.mean()), "full_lists": int((deg0 == M0).sum()), "indeg0_zero": int((indeg == 0).sum()),
            "unreachable_layer0": int(n - seen.sum())}


def expected_levels(n, M):
    mL = 1 / np.log(M)
    p = [np.exp(-l / mL) * (1 - np.exp(-1 / mL)) for l in range(8)]
    return {str(l): V.r4(n * p[l]) for l in range(8) if n * p[l] >= 0.01}


# ---- SciFact Qwen3: the full grid
X, Q, ids, tq, qrels = V.beir_set("scifact", "qwen3-emb-0.6b")
GT, _ = V.exact_topk(X, Q)
labels = (ids, tq, qrels)
R["scifact_qwen3"] = {"n": len(X), "d": X.shape[1], "grid": []}
for M in (4, 8, 16, 32, 48):
    for efc in (16, 40, 100, 200):
        h = build(X, M, efc)
        rows = sweep(h, Q, GT, labels)
        gs = graph_stats(h)
        R["scifact_qwen3"]["grid"].append({"M": M, "efc": efc, "rows": rows, "graph": gs,
                                            "index_bytes": int(faiss.serialize_index(h).size)})
        print("M", M, "efc", efc, gs["level_counts"], "unreach", gs["unreachable_layer0"], [(r["ef"], r["recall10"], r["ndis"]) for r in rows[:6]])
R["scifact_qwen3"]["expected_levels"] = {str(M): expected_levels(len(X), M) for M in (4, 8, 16, 32, 48)}

# ---- the Tool map's checks on bge-small, plus pgvector's defaults in hnswlib
X, Q, ids, tq, qrels = V.beir_set("scifact", "bge-small")
GT, _ = V.exact_topk(X, Q)
h = build(X, 32, 40)
R["toolmap_check_faiss"] = {"M": 32, "efc": 40, "rows": sweep(h, Q, GT, efs=[16, 64])}
print("faiss bge", R["toolmap_check_faiss"])
hl = []
for (M, efc, efs, seed) in ((16, 200, [10, 40, 100], 100), (16, 64, [10, 40, 100], 100)):
    p = hnswlib.Index(space="ip", dim=X.shape[1])
    p.init_index(max_elements=len(X), M=M, ef_construction=efc, random_seed=seed)
    p.set_num_threads(1)
    p.add_items(X, np.arange(len(X)))
    rr = []
    for ef in efs:
        p.set_ef(ef)
        I, _ = p.knn_query(Q, k=10)
        rr.append({"ef": ef, "effective_ef": max(ef, 10), "recall10": V.r4(V.recall_at(I, GT))})
    hl.append({"M": M, "efc": efc, "seed": seed, "rows": rr})
    print("hnswlib", M, efc, rr)
R["hnswlib_bge"] = hl

# ---- four corpora stacked: M sweep at efc 100 and 200
XA, QA, _, _ = V.all4_set()
GTA, _ = V.exact_topk(XA, QA)
R["all4_qwen3"] = {"n": len(XA), "d": XA.shape[1], "queries": len(QA), "grid": []}
for M in (8, 16, 32):
    h = build(XA, M, 100)
    rows = sweep(h, QA, GTA)
    gs = graph_stats(h)
    R["all4_qwen3"]["grid"].append({"M": M, "efc": 100, "rows": rows, "graph": gs, "index_bytes": int(faiss.serialize_index(h).size)})
    print("all4 M", M, gs["level_counts"], gs["unreachable_layer0"], [(r["ef"], r["recall10"], r["ndis"]) for r in rows[:6]])
R["all4_qwen3"]["expected_levels"] = {str(M): expected_levels(len(XA), M) for M in (8, 16, 32)}
V.save("hnsw", R)
