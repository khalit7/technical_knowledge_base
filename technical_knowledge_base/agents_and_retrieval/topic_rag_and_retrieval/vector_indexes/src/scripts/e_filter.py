"""Filtered vector search (deterministic, no timing): recall@10 against the exact filtered top 10, and distance
computations per query, for pre-filtering, post-filtering, hnswlib's in-graph filter, an ACORN-1-style traversal and
FAISS's HNSW with an IDSelector. One hnswlib graph per set (M 16, ef_construction 200, single thread, seed 100); the
port (pyhnsw.py, checked link for link against hnswlib) walks that same graph and counts distances.
Sets and filters:
  qasper: 6,463 chunks of 281 papers, 892 questions. Filter "own paper" (the question's paper: about 0.4% of chunks,
          and correlated with the query) and "another paper" (same size, uncorrelated: a paper picked at random).
  all4:   25,039 vectors of four corpora, 400 of the 1,715 queries (seeded sample). A random attribute kept by a share
          s of rows (uncorrelated), s from 0.1% to 100%; and the real source corpus (the query's own corpus vs another).
Output: $RAG_SCRATCH/vix/out/filter.json"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import faiss
import hnswlib
import numpy as np

import pyhnsw
import vixlib as V

R = {"asof": V.stamp(), "graph": {"lib": "hnswlib 0.8.0", "M": 16, "efc": 200}}
KPOST = [10, 40, 100, 400, 1000]
EFS = [10, 40, 100, 400]


def graph(X, name):
    p = hnswlib.Index(space="ip", dim=X.shape[1])
    p.init_index(max_elements=len(X), M=16, ef_construction=200, random_seed=100)
    p.set_num_threads(1)
    p.add_items(X, np.arange(len(X)))
    f = os.path.join(V.WORK, "filter_%s.bin" % name)
    p.save_index(f)
    H = pyhnsw.read_hnswlib(f)
    P = pyhnsw.HNSW(X, M=16, ef_construction=200)
    P.links, P.levels, P.ep, P.maxlevel = H["links"], H["levels"], H["ep"], H["maxlevel"]
    fa = faiss.IndexHNSWFlat(X.shape[1], 16, faiss.METRIC_INNER_PRODUCT)
    fa.hnsw.efConstruction = 200
    faiss.omp_set_num_threads(1)
    fa.add(X)
    return p, P, fa


def run(X, Q, masks, p, P, fa, check_hnswlib=True):
    """masks: list of boolean arrays, one per query. Returns rows per strategy and setting."""
    n = len(X)
    gts = []
    for qi, m in enumerate(masks):
        idx = np.flatnonzero(m)
        s = X[idx] @ Q[qi]
        gts.append(idx[np.argsort(-s)[:10]].tolist())

    def rec(res):
        return float(np.mean([len(set(r[:10]) & set(g)) / max(1, len(g)) for r, g in zip(res, gts)]))
    rows = [{"strategy": "pre-filter + exact", "setting": "", "recall10": 1.0,
             "ndis": V.r4(np.mean([m.sum() for m in masks])), "returned": V.r4(np.mean([min(10, m.sum()) for m in masks]))}]
    # post-filter: unfiltered HNSW for k' results, then drop the rows that fail the filter
    for kp in KPOST:
        res, nd, ret = [], [], []
        for qi, m in enumerate(masks):
            P.ndis = 0
            ids, _ = P.search(Q[qi], kp, kp)
            nd.append(P.ndis)
            keep = [i for i in ids if m[i]][:10]
            res.append(keep); ret.append(len(keep))
        rows.append({"strategy": "post-filter", "setting": "k'=%d" % kp, "recall10": V.r4(rec(res)), "ndis": V.r4(np.mean(nd)),
                     "returned": V.r4(np.mean(ret)), "empty": int(sum(r == 0 for r in ret))})
    for acorn, nm in ((False, "in-graph (hnswlib rule)"), (True, "ACORN-1-style")):
        for ef in EFS:
            res, nd, vis = [], [], []
            for qi, m in enumerate(masks):
                ids, d, v = pyhnsw.filtered_search(P, Q[qi], m, 10, ef, acorn=acorn)
                res.append(ids); nd.append(d); vis.append(v)
            row = {"strategy": nm, "setting": "ef=%d" % ef, "recall10": V.r4(rec(res)), "ndis": V.r4(np.mean(nd)),
                   "visited_share": V.r4(np.mean(vis) / n), "returned": V.r4(np.mean([len(r) for r in res]))}
            if not acorn and check_hnswlib and ef in (10, 100):
                p.set_ef(ef)
                agree = 0
                for qi, m in enumerate(masks):
                    try:
                        I, _ = p.knn_query(Q[qi:qi + 1], k=10, filter=lambda i, m=m: bool(m[i]))
                        agree += set(I[0].tolist()) == set(res[qi])
                    except RuntimeError:  # fewer than k allowed results
                        agree += len(res[qi]) < 10
                row["hnswlib_identical"] = agree
            rows.append(row)
    # FAISS HNSW with an IDSelector: a different stop rule (it stops after efSearch expansions)
    for ef in EFS:
        fa.hnsw.efSearch = ef
        res, nd = [], []
        for qi, m in enumerate(masks):
            sel = faiss.IDSelectorBatch(np.flatnonzero(m).astype("int64"))
            prm = faiss.SearchParametersHNSW(sel=sel, efSearch=ef)
            st = faiss.cvar.hnsw_stats; st.reset()
            _, I = fa.search(Q[qi:qi + 1], 10, params=prm)
            nd.append(st.ndis)
            res.append([int(i) for i in I[0] if i >= 0])
        rows.append({"strategy": "FAISS HNSW + IDSelector", "setting": "ef=%d" % ef, "recall10": V.r4(rec(res)), "ndis": V.r4(np.mean(nd)),
                     "returned": V.r4(np.mean([len(r) for r in res]))})
    for r in rows:
        print("   ", r)
    return rows


# ---------------- QASPER: own paper vs another paper
X, Q, cids, qids, cpaper, qpaper = V.qasper_set()
p, P, fa = graph(X, "qasper")
papers = sorted(set(cpaper))
cp = np.array(cpaper)
rng = np.random.default_rng(0)
own = [cp == qp for qp in qpaper]
other = []
for qp in qpaper:
    o = qp
    while o == qp:
        o = papers[rng.integers(len(papers))]
    other.append(cp == o)
R["qasper"] = {"n": len(X), "queries": len(Q), "papers": len(papers),
               "own_share": V.r4(np.mean([m.mean() for m in own])), "other_share": V.r4(np.mean([m.mean() for m in other]))}
print("qasper own"); R["qasper"]["own"] = run(X, Q, own, p, P, fa)
print("qasper other"); R["qasper"]["other"] = run(X, Q, other, p, P, fa)

# ---------------- all4: random attribute at many selectivities, and the source corpus
XA, QA, src, qsrc = V.all4_set()
sel = np.sort(np.random.default_rng(1).choice(len(QA), 400, replace=False))
QS = QA[sel]; qs_src = [qsrc[i] for i in sel]
p, P, fa = graph(XA, "all4")
attr = np.random.default_rng(2).uniform(size=len(XA))
R["all4"] = {"n": len(XA), "queries": len(QS), "selectivity": []}
for s in (0.001, 0.005, 0.01, 0.02, 0.05, 0.1, 0.25, 0.5, 1.0):
    m = attr < s
    print("all4 s", s, m.sum())
    R["all4"]["selectivity"].append({"s": s, "rows_kept": int(m.sum()), "rows": run(XA, QS, [m] * len(QS), p, P, fa, check_hnswlib=s in (0.01, 0.1))})
srcs = np.array(src)
names = ["scifact", "nfcorpus", "hotpotqa", "qasper"]
own = [srcs == s for s in qs_src]
other = [srcs == names[(names.index(s) + 1) % 4] for s in qs_src]
R["all4"]["source_own_share"] = V.r4(np.mean([m.mean() for m in own]))
R["all4"]["source_other_share"] = V.r4(np.mean([m.mean() for m in other]))
print("all4 own source"); R["all4"]["source_own"] = run(XA, QS, own, p, P, fa, check_hnswlib=False)
print("all4 other source"); R["all4"]["source_other"] = run(XA, QS, other, p, P, fa, check_hnswlib=False)
V.save("filter", R)
