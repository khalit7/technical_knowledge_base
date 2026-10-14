"""ACORN-1 (Patel et al., SIGMOD 2024, section 5.3), written here on the port: the graph is built like HNSW but
without neighbour pruning (pyhnsw.HNSW(select="simple"), M 16), and the search expands one-hop and two-hop
neighbours, applies the filter, and truncates to M. Same sets, filters and queries as e_filter.py. Deterministic.
Output: $RAG_SCRATCH/vix/out/acorn.json"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import time

import numpy as np

import pyhnsw
import vixlib as V

R = {"asof": V.stamp(), "M": 16}


def build(X, efc):
    P = pyhnsw.HNSW(X, M=16, ef_construction=efc, select="simple")
    lv = pyhnsw.random_levels(len(X), 16, seed=5)
    t = time.time()
    for i in range(len(X)):
        P.add(i, int(lv[i]))
    return P, round(time.time() - t, 1)


def run(X, Q, masks, P, label):
    gts = []
    for qi, m in enumerate(masks):
        idx = np.flatnonzero(m); s = X[idx] @ Q[qi]
        gts.append(idx[np.argsort(-s)[:10]].tolist())
    rows = []
    for ef in (10, 40, 100, 400):
        res, nd, vis = [], [], []
        for qi, m in enumerate(masks):
            ids, d, v = pyhnsw.filtered_search(P, Q[qi], m, 10, ef, acorn="acorn1")
            res.append(ids); nd.append(d); vis.append(v)
        rec = float(np.mean([len(set(r) & set(g)) / max(1, len(g)) for r, g in zip(res, gts)]))
        rows.append({"strategy": "ACORN-1 (unpruned graph)", "setting": "ef=%d" % ef, "recall10": V.r4(rec), "ndis": V.r4(np.mean(nd)),
                     "visited_share": V.r4(np.mean(vis) / len(X)), "returned": V.r4(np.mean([len(r) for r in res]))})
        print(label, rows[-1], flush=True)
    return rows


X, Q, cids, qids, cpaper, qpaper = V.qasper_set()
P, tb = build(X, 200)
cp = np.array(cpaper); papers = sorted(set(cpaper)); rng = np.random.default_rng(0)
other = []
for qp in qpaper:
    o = qp
    while o == qp:
        o = papers[rng.integers(len(papers))]
    other.append(cp == o)
R["qasper"] = {"efc": 200, "build_s_python": tb, "own": run(X, Q, [cp == qp for qp in qpaper], P, "own"), "other": run(X, Q, other, P, "other")}
V.save("acorn", R)
XA, QA, src, qsrc = V.all4_set()
sel = np.sort(np.random.default_rng(1).choice(len(QA), 400, replace=False))
QS = QA[sel]; qs_src = [qsrc[i] for i in sel]
P, tb = build(XA, 100)
attr = np.random.default_rng(2).uniform(size=len(XA))
R["all4"] = {"efc": 100, "build_s_python": tb, "selectivity": []}
for s in (0.001, 0.005, 0.01, 0.02, 0.05, 0.1, 0.25, 0.5, 1.0):
    R["all4"]["selectivity"].append({"s": s, "rows": run(XA, QS, [attr < s] * len(QS), P, "s=%g" % s)})
    V.save("acorn", R)
srcs = np.array(src); names = ["scifact", "nfcorpus", "hotpotqa", "qasper"]
R["all4"]["source_own"] = run(XA, QS, [srcs == s for s in qs_src], P, "own src")
R["all4"]["source_other"] = run(XA, QS, [srcs == names[(names.index(s) + 1) % 4] for s in qs_src], P, "other src")
V.save("acorn", R)
