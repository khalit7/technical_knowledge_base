"""Shared helpers for the Vector search lab (tab t-vec). Loads the running example through ../data/load.py."""
import json
import os
import sys

import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "..", "data"))
import load as L  # noqa: E402

OUT = os.path.join(HERE, "out")
os.makedirs(OUT, exist_ok=True)


def scratch(*p):
    d = L.path("vec", *p[:-1]) if len(p) > 1 else L.path("vec")
    os.makedirs(d, exist_ok=True)
    return L.path("vec", *p)


def save(name, obj):
    with open(os.path.join(OUT, name), "w") as f:
        json.dump(obj, f, indent=1, sort_keys=False)
    print("wrote out/" + name)


def load_out(name):
    return json.load(open(os.path.join(OUT, name)))


def scifact(model="qwen3-emb-0.6b"):
    """corpus ids, X [n,d], test qids (golden order), Q [300,d], qrels test, corpus, queries."""
    corpus, queries, qrels = L.beir("scifact")
    ids, X = L.embeddings("scifact", model)
    qids_all, Qall = L.embeddings("scifact", model, "queries")
    pos = {q: i for i, q in enumerate(qids_all)}
    test = open(os.path.join(HERE, "..", "data", "ids", "scifact_test_qids.txt")).read().split()
    Q = np.asarray(Qall[[pos[q] for q in test]], dtype=np.float32)
    return ids, np.asarray(X, dtype=np.float32), test, Q, qrels["test"], corpus, queries


def topk(S, k):
    """row-wise top k indices of a score matrix, sorted by score desc (ties by index)."""
    idx = np.argpartition(-S, kth=min(k, S.shape[1] - 1), axis=1)[:, :k]
    sc = np.take_along_axis(S, idx, 1)
    o = np.lexsort((idx, -sc), axis=1)
    return np.take_along_axis(idx, o, 1)


def to_run(qids, ids, I, S=None):
    run = {}
    for r, q in enumerate(qids):
        run[q] = {ids[j]: (float(S[r, c]) if S is not None else float(len(I[r]) - c)) for c, j in enumerate(I[r]) if j >= 0}
    return run


def evaluate(run, qrels, metrics=("ndcg_cut_10", "recall_10", "recall_100")):
    return L.evaluate(run, qrels, metrics)


def per_query(run, qrels, metric="recall.10"):
    import pytrec_eval
    ev = pytrec_eval.RelevanceEvaluator(qrels, {metric.split(".")[0] + "." + metric.split(".")[1]} if "." in metric else {metric})
    res = ev.evaluate({q: run[q] for q in qrels if run.get(q)})
    key = metric.replace(".", "_")
    return {q: res.get(q, {}).get(key, 0.0) for q in qrels}


def ann_recall(I_ann, I_exact, k=10):
    return float(np.mean([len(set(a[:k]) & set(b[:k])) / k for a, b in zip(I_ann, I_exact)]))
