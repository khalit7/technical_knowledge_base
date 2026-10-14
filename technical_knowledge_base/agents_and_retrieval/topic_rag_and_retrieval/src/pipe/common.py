"""Shared helpers for the Pipeline lab scripts (tab t-pipe of Topic: rag-and-retrieval).

Every script runs with the shared env, from anywhere:
    RAG_SCRATCH=<shared rag folder> $RAG_SCRATCH/venv/bin/python -I -B src/pipe/<script>.py
Large intermediate files go to $RAG_SCRATCH/pipe/ (outside the repo); the small results the page
embeds go to src/pipe/out/*.json (committed).
"""
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "..", "data"))
import load as L  # noqa: E402

OUT = os.path.join(HERE, "out")


def work(*parts):
    p = L.path("pipe", *parts)
    os.makedirs(os.path.dirname(p) if "." in os.path.basename(p) else p, exist_ok=True)
    return p


def save(name, obj):
    os.makedirs(OUT, exist_ok=True)
    with open(os.path.join(OUT, name), "w") as f:
        json.dump(obj, f, separators=(",", ":"), sort_keys=False)
    print("wrote", name, os.path.getsize(os.path.join(OUT, name)), "bytes")


def r3(x):
    return round(float(x), 3)


def per_query(run, qrels, metrics=("ndcg_cut.10", "recall.10", "recall.100")):
    """{qid: {metric: value}} with pytrec_eval; queries with no run score 0."""
    import pytrec_eval
    ev = pytrec_eval.RelevanceEvaluator(qrels, set(metrics))
    res = ev.evaluate({q: run[q] for q in qrels if run.get(q)})
    return {q: {m: res.get(q, {}).get(m.replace(".", "_"), 0.0) for m in metrics} for q in qrels}


def mean(pq, m):
    return sum(v[m] for v in pq.values()) / len(pq)


def ranked(d):
    """doc ids of a {doc: score} dict in rank order (insertion order is rank order for L.run)."""
    return list(d)


# ---------------------------------------------------------------- first stages for any query set
def bm25_runs(ds, qids, k=100):
    """BM25 top-k for the given query ids, same settings as the setup's recorded runs
    (bm25s Lucene, k1 1.2, b 0.75, English stopwords, Snowball stemmer)."""
    import bm25s, Stemmer
    corpus, queries, _ = L.beir(ds)
    stem = Stemmer.Stemmer("english")
    dids = list(corpus)
    ret = bm25s.BM25(method="lucene", k1=1.2, b=0.75)
    ret.index(bm25s.tokenize([L.doc_text(corpus[d]) for d in dids], stopwords="en", stemmer=stem, show_progress=False), show_progress=False)
    qtok = bm25s.tokenize([queries[q] for q in qids], stopwords="en", stemmer=stem, show_progress=False)
    res, sc = ret.retrieve(qtok, k=k, show_progress=False, n_threads=1)
    return {q: {dids[res[i, j]]: float(sc[i, j]) for j in range(res.shape[1])} for i, q in enumerate(qids)}


def dense_runs(ds, model, qids, k=100):
    """Exact inner-product top-k over the precomputed unit vectors."""
    import numpy as np
    ids, X = L.embeddings(ds, model)
    qall, Q = L.embeddings(ds, model, "queries")
    pos = {q: i for i, q in enumerate(qall)}
    X = np.asarray(X)
    out = {}
    for q in qids:
        s = X @ np.asarray(Q[pos[q]])
        top = np.argpartition(-s, k)[:k]
        top = top[np.argsort(-s[top])]
        out[q] = {ids[j]: float(s[j]) for j in top}
    return out
