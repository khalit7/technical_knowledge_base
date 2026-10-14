"""Shared helpers for the Vector indexes page (prefix vix). Every experiment imports this.

Data come from the running example of Topic: rag-and-retrieval (the root's src/data/load.py), read from the shared
setup folder named by $RAG_SCRATCH. Outputs go to $RAG_SCRATCH/vix/out/<name>.json (large) and are collected into
this page's src/data/ by collect.py. Run every script as:  $RAG_SCRATCH/venv/bin/python -I -B <script>.py
"""
import json
import os
import sys
import time

import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT_DATA = os.path.normpath(os.path.join(HERE, "..", "..", "..", "src", "data"))
sys.path.insert(0, ROOT_DATA)
import load as L  # noqa: E402  (the root's load helper)

RS = L.scratch()
WORK = os.path.join(RS, "vix")
OUT = os.path.join(WORK, "out")
os.makedirs(OUT, exist_ok=True)
DATA = os.path.normpath(os.path.join(HERE, "..", "data"))


def save(name, obj):
    p = os.path.join(OUT, name + ".json")
    json.dump(obj, open(p, "w"), indent=1)
    print("saved", p.replace(RS, "$RAG_SCRATCH"))


def load_out(name):
    return json.load(open(os.path.join(OUT, name + ".json")))


def test_qids(dataset):
    return open(os.path.join(ROOT_DATA, "ids", dataset + ("_test_qids.txt" if dataset in ("scifact", "nfcorpus") else ""))).read().split()


def beir_set(dataset, model):
    """Corpus vectors X [n, d], test query vectors Q [q, d] (golden-set order), corpus ids, test qids, qrels test."""
    ids, X = L.embeddings(dataset, model)
    qids_all, QA = L.embeddings(dataset, model, "queries")
    tq = test_qids(dataset)
    pos = {q: i for i, q in enumerate(qids_all)}
    Q = np.ascontiguousarray(np.asarray(QA)[[pos[q] for q in tq]], dtype="float32")
    X = np.ascontiguousarray(np.asarray(X), dtype="float32")
    _, _, qrels = L.beir(dataset)
    return X, Q, ids, tq, qrels["test"]


def qasper_set(model="qwen3-emb-0.6b"):
    """QASPER default chunks (6,463) and the 892 answerable dev questions; paper id of each chunk and question."""
    ids, X = L.embeddings("qasper", model)
    qids, Q = L.embeddings("qasper", model, "queries")
    X = np.ascontiguousarray(np.asarray(X), dtype="float32")
    Q = np.ascontiguousarray(np.asarray(Q), dtype="float32")
    cpaper = [i.rsplit("_c", 1)[0] for i in ids]
    qpaper = {}
    for line in open(L.path("data", "longdoc", "questions.jsonl")):
        r = json.loads(line)
        qpaper[r["qid"]] = r["paper_id"]
    return X, Q, ids, qids, cpaper, [qpaper[q] for q in qids]


def all4_set(model="qwen3-emb-0.6b"):
    """The four corpora of the running example stacked into one collection (25,039 vectors with Qwen3-Embedding),
    with the source of each row; queries: the test queries of SciFact and NFCorpus, the 200 HotpotQA and 892 QASPER
    questions (1,715). Used where a bigger, more varied collection than SciFact alone is wanted."""
    Xs, Qs, src, qsrc = [], [], [], []
    for ds in ("scifact", "nfcorpus", "hotpotqa", "qasper"):
        ids, X = L.embeddings(ds, model)
        qids, QA = L.embeddings(ds, model, "queries")
        QA = np.asarray(QA)
        if ds in ("scifact", "nfcorpus"):
            tq = test_qids(ds)
            pos = {q: i for i, q in enumerate(qids)}
            QA = QA[[pos[q] for q in tq]]
        Xs.append(np.asarray(X, dtype="float32")); Qs.append(QA.astype("float32"))
        src += [ds] * len(ids); qsrc += [ds] * len(QA)
    return np.ascontiguousarray(np.vstack(Xs)), np.ascontiguousarray(np.vstack(Qs)), src, qsrc


def exact_topk(X, Q, k=100, bs=256):
    """Exact inner-product top k (rows are unit length, so this is cosine). Returns ids [q, k] and scores."""
    I = np.empty((len(Q), k), dtype=np.int64)
    D = np.empty((len(Q), k), dtype=np.float32)
    for s in range(0, len(Q), bs):
        S = Q[s:s + bs] @ X.T
        part = np.argpartition(-S, k, axis=1)[:, :k]
        ps = np.take_along_axis(S, part, 1)
        o = np.argsort(-ps, axis=1)
        I[s:s + bs] = np.take_along_axis(part, o, 1)
        D[s:s + bs] = np.take_along_axis(ps, o, 1)
    return I, D


def recall_at(I, GT, k=10):
    """ANN recall@k: share of the exact top k that the index returned in its top k (mean over queries)."""
    return float(np.mean([len(set(a[:k].tolist()) & set(g[:k].tolist())) / k for a, g in zip(I, GT)]))


def ndcg_run(I, D, ids, tq, qrels):
    """nDCG@10 and recall@100 of an index's ranked ids with the root's pytrec_eval helper."""
    run = {}
    for qi, q in enumerate(tq):
        run[q] = {ids[j]: float(D[qi, r]) for r, j in enumerate(I[qi]) if j >= 0}
    return L.evaluate(run, qrels, metrics=("ndcg_cut_10", "recall_10"))


def loadavg():
    return [round(x, 2) for x in os.getloadavg()]


def stamp():
    return time.strftime("%Y-%m-%d %H:%M")


def r4(x):
    return round(float(x), 4)
