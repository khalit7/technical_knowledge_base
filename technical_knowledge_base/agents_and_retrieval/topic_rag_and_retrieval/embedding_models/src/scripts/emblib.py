"""Shared helpers for the Embedding models page. Loads the running example through the root's src/data/load.py
(needs RAG_SCRATCH). Run scripts as $RAG_SCRATCH/venv/bin/python -I -B scripts/<name>.py"""
import json
import os
import sys

import numpy as np

H = os.path.dirname(os.path.abspath(__file__))
ROOT_DATA = os.path.join(H, "..", "..", "..", "src", "data")
sys.path.insert(0, ROOT_DATA)
import load as L  # noqa: E402

DATA = os.path.join(H, "..", "data")
os.makedirs(DATA, exist_ok=True)


def scratch(*p):
    d = L.path("emb")
    os.makedirs(d, exist_ok=True)
    return os.path.join(d, *p)


def save(name, obj):
    json.dump(obj, open(os.path.join(DATA, name), "w"), indent=1)
    print("wrote data/" + name, flush=True)


def load_data(name):
    p = os.path.join(DATA, name)
    return json.load(open(p)) if os.path.exists(p) else None


def golden(ds):
    return open(os.path.join(ROOT_DATA, "ids", ds + "_test_qids.txt")).read().split()


def corpus_vectors(ds, model):
    ids, X = L.embeddings(ds, model)
    return ids, np.asarray(X, dtype=np.float32)


def query_vectors(ds, model, qids):
    allq, Q = L.embeddings(ds, model, "queries")
    pos = {q: i for i, q in enumerate(allq)}
    return np.asarray(Q[[pos[q] for q in qids]], dtype=np.float32)


def search(Q, X, ids, qids, k=100):
    """exact inner-product search; {qid: {docid: score}} top k (ties by index)."""
    S = Q @ X.T
    run = {}
    for r, q in enumerate(qids):
        idx = np.argpartition(-S[r], k)[:k]
        idx = idx[np.lexsort((idx, -S[r, idx]))]
        run[q] = {ids[j]: float(S[r, j]) for j in idx}
    return run


def per_query(run, qrels, metrics=("ndcg_cut.10", "recall.100", "recall.10")):
    """{metric: np.array over qrels' queries in sorted order}; a query missing from run scores 0."""
    import pytrec_eval
    ev = pytrec_eval.RelevanceEvaluator(qrels, set(metrics))
    res = ev.evaluate({q: run[q] for q in qrels if run.get(q)})
    qs = sorted(qrels)
    return {m: np.array([res.get(q, {}).get(m.replace(".", "_"), 0.0) for q in qs]) for m in metrics}, qs


def r3(x):
    return round(float(x), 3)


def r4(x):
    return round(float(x), 4)


def bootstrap_ci(v, B=10000, seed=0, alpha=0.05):
    """percentile bootstrap of the mean of per-query values v (resampling queries)."""
    rng = np.random.default_rng(seed)
    v = np.asarray(v, float)
    idx = rng.integers(0, len(v), size=(B, len(v)))
    m = v[idx].mean(1)
    return float(np.quantile(m, alpha / 2)), float(np.quantile(m, 1 - alpha / 2))


def paired_bootstrap(a, b, B=10000, seed=0):
    """mean(a - b), its 95% CI, and the share of resamples where a beats b (paired over the same queries)."""
    rng = np.random.default_rng(seed)
    d = np.asarray(a, float) - np.asarray(b, float)
    idx = rng.integers(0, len(d), size=(B, len(d)))
    m = d[idx].mean(1)
    return dict(diff=r4(d.mean()), lo=r4(np.quantile(m, .025)), hi=r4(np.quantile(m, .975)), p_better=r4((m > 0).mean()))
