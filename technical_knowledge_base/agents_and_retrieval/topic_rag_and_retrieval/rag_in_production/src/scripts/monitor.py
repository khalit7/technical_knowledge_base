"""Monitoring retrieval quality (deterministic, no lock; one CPU encode of 300 short queries with bge-small).
1. Evals in CI: how many golden queries does a paired test need to catch a regression? Baseline = bge-small exact
   search on SciFact (nDCG@10 per test claim). Candidate changes: the query prefix dropped; FAISS HNSW (M 32) at
   efSearch 16 and 64; FAISS IVF (nlist 72) at nprobe 1 and 8; a half-finished model backfill (backfill.py, f = 0.5,
   new-model queries). For golden sets of n claims drawn from the 300 (2,000 draws each), the share of draws in which a
   one-sided paired t-test at 5% flags the change ("power").
2. Drift: the similarity of each query's best match in the SciFact index (bge-small), for SciFact's own test claims
   and for questions from other sets (NFCorpus, HotpotQA) arriving at the same system: a label-free monitor.
Output: data/monitor.json"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import faiss
import numpy as np
import pytrec_eval
from scipy import stats
from common import L, save, work

faiss.omp_set_num_threads(2)
corpus, queries, qrels = L.beir("scifact")
test = qrels["test"]
tq = sorted(test, key=int)
ids, X = L.embeddings("scifact", "bge-small"); X = np.ascontiguousarray(np.asarray(X, dtype=np.float32))
qids, Q = L.embeddings("scifact", "bge-small", "queries"); qp = {q: i for i, q in enumerate(qids)}
QT = np.ascontiguousarray(np.asarray(Q, dtype=np.float32)[[qp[q] for q in tq]])
ev = pytrec_eval.RelevanceEvaluator({q: test[q] for q in tq}, {"ndcg_cut.10"})


def per_query(D, I):
    run = {q: {ids[j]: float(D[i, r]) for r, j in enumerate(I[i]) if j >= 0} or {"none": 0.0} for i, q in enumerate(tq)}
    e = ev.evaluate(run)
    return np.array([e[q]["ndcg_cut_10"] for q in tq])


def exact(Qm, Xm=X):
    S = Qm @ Xm.T
    I = np.argsort(-S, axis=1)[:, :10]
    return np.take_along_axis(S, I, 1), I


systems = {"baseline": per_query(*exact(QT))}
# query prefix dropped (re-encode the 300 claims on CPU without the prefix)
QnoP = np.load(work("scifact_bge_noprefix.npy"))  # made by encode_noprefix.py (torch and faiss in one process clash)
systems["prefix dropped"] = per_query(*exact(QnoP))
hn = faiss.IndexHNSWFlat(384, 32, faiss.METRIC_INNER_PRODUCT); hn.hnsw.efConstruction = 40; hn.add(X)
for ef in (16, 64):
    hn.hnsw.efSearch = ef
    systems["HNSW efSearch %d" % ef] = per_query(*hn.search(QT, 10))
qz = faiss.IndexFlatIP(384); iv = faiss.IndexIVFFlat(qz, 384, 72, faiss.METRIC_INNER_PRODUCT); iv.train(X); iv.add(X)
for npb in (1, 8):
    iv.nprobe = npb
    systems["IVF nprobe %d" % npb] = per_query(*iv.search(QT, 10))
# half-finished backfill from MiniLM to bge-small, queried with bge-small
_, Xo = L.embeddings("scifact", "minilm-l6"); Xm = np.asarray(Xo, dtype=np.float32).copy()
order = np.random.default_rng(0).permutation(len(ids)); m = order[: len(ids) // 2]; Xm[m] = X[m]
systems["backfill half done"] = per_query(*exact(QT, Xm))

rng = np.random.default_rng(0)
NS = [10, 25, 50, 100, 200, 300]
base = systems["baseline"]
ci = {}
for name, v in systems.items():
    if name == "baseline":
        continue
    d = v - base
    row = {"ndcg": round(float(v.mean()), 4), "delta": round(float(d.mean()), 4), "changed_queries": int((np.abs(d) > 1e-9).sum()), "power": {}}
    for n in NS:
        hits = 0
        for _ in range(2000):
            s = rng.integers(0, len(tq), n)
            dd = d[s]
            if dd.std() == 0:
                continue
            t = stats.ttest_1samp(dd, 0.0, alternative="less")
            hits += t.pvalue < 0.05
        row["power"][n] = round(hits / 2000, 3)
    ci[name] = row
    print(name, row)
# drift
def top1(name):
    qi, QQ = L.embeddings(name, "bge-small", "queries")
    _, _, qr = L.beir(name) if name != "hotpotqa" else (None, None, None)
    if name == "hotpotqa":
        hq, _ = L.multihop(); keep = [h["qid"] for h in hq]
    else:
        keep = sorted(qr["test"])
    pos = {q: i for i, q in enumerate(qi)}
    M = np.asarray(QQ, dtype=np.float32)[[pos[q] for q in keep if q in pos]]
    return (M @ X.T).max(1)
drift = {}
for name in ("scifact", "nfcorpus", "hotpotqa"):
    try:
        t1 = top1(name)
    except Exception as e:  # noqa
        print("skip", name, e); continue
    drift[name] = {"n": int(len(t1)), "pct": [round(float(np.percentile(t1, p)), 3) for p in (10, 25, 50, 75, 90)],
                   "hist": np.histogram(t1, bins=35, range=(0.3, 1.0))[0].tolist()}
    print(name, drift[name]["n"], drift[name]["pct"])
save("monitor.json", {"ci": ci, "ns": NS, "baseline_ndcg": round(float(base.mean()), 4), "drift": drift,
                      "faiss": faiss.__version__})
