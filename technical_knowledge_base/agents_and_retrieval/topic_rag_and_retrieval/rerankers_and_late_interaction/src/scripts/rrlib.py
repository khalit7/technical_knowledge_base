"""Shared helpers for the scripts of the page "Rerankers and late interaction" (prefix rr).

Everything loads the running example through the parent page's src/data/load.py, so numbers agree with the
root's Pipeline lab and with the sibling pages. Run with the shared env:
    RAG_SCRATCH=<shared rag folder> $RAG_SCRATCH/venv/bin/python -I -B scripts/<name>.py
Large intermediates go to $RAG_SCRATCH/rr/; the small results the page embeds go to src/data/*.json.
"""
import json
import math
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT_SRC = os.path.normpath(os.path.join(HERE, "..", "..", "..", "src"))
sys.path.insert(0, os.path.join(ROOT_SRC, "data"))
import load as L  # noqa: E402

DATA = os.path.normpath(os.path.join(HERE, "..", "data"))
DS = "scifact"
M3 = ("ndcg_cut.10", "recall.10", "recall.100")


def work(*parts):
    p = L.path("rr", *parts)
    os.makedirs(os.path.dirname(p) if "." in os.path.basename(p) else p, exist_ok=True)
    return p


def save(name, obj):
    os.makedirs(DATA, exist_ok=True)
    with open(os.path.join(DATA, name), "w") as f:
        json.dump(obj, f, separators=(",", ":"))
    print("wrote", name, os.path.getsize(os.path.join(DATA, name)), "bytes")


def load_data(name):
    return json.load(open(os.path.join(DATA, name)))


def r3(x):
    return round(float(x), 3)


def r4(x):
    return round(float(x), 4)


def per_query(run, qrels, metrics=M3):
    """{qid: {metric: value}} with pytrec_eval (the root's helper, same convention: no run -> 0)."""
    import pytrec_eval
    ev = pytrec_eval.RelevanceEvaluator(qrels, set(metrics))
    res = ev.evaluate({q: run[q] for q in qrels if run.get(q)})
    return {q: {m: res.get(q, {}).get(m.replace(".", "_"), 0.0) for m in metrics} for q in qrels}


def mean(pq, m):
    return sum(v[m] for v in pq.values()) / len(pq)


def rrf(lists, k=60):
    """Reciprocal rank fusion, exactly as the root's src/pipe/fusion.py (ties keep insertion order)."""
    out = {}
    for lst in lists:
        for r, d in enumerate(lst):
            out[d] = out.get(d, 0.0) + 1.0 / (k + r + 1)
    return dict(sorted(out.items(), key=lambda x: -x[1])[:100])


def first_stages(ds=DS):
    _, _, qrels = L.beir(ds)
    qt = qrels["test"]
    bm = L.run(ds, "bm25")
    de = L.run(ds, "qwen3-emb-0.6b")
    hy = {q: rrf([list(bm[q]), list(de[q])], 60) for q in qt}
    return {"bm25": bm, "dense": de, "hybrid": hy}


def rerank_scores(name, ds=DS):
    """The setup's recorded scores, plus the pairs the root's Pipeline lab scored for the hybrid list
    ($RAG_SCRATCH/pipe/rerank_extra, same model, dtype, batch and instruction), plus this page's own extra pairs
    ($RAG_SCRATCH/rr/rerank_extra, same settings), so every agent reads one score per pair."""
    S = L.rerank_scores(ds, name)
    for extra in (L.path("pipe", "rerank_extra", ds, name + ".tsv"), L.path("rr", "rerank_extra", ds, name + ".tsv")):
        if os.path.exists(extra):
            for line in open(extra):
                q, d, s = line.rstrip("\n").split("\t")
                S.setdefault(q, {})[d] = float(s)
    return S


RERANKERS = {"ce-minilm-l6": "ce-minilm-l6", "bge-reranker-v2-m3": "bge-reranker-v2-m3_top30",
             "qwen3-reranker-0.6b": "qwen3-reranker-0.6b_top30"}


def rerank(first, S, K, qids):
    """Rerank the top K of each first-stage list by S; ranks K+1.. follow unchanged (the root's convention).
    Returns (run, missing pairs). A query with any unscored pair in its head is skipped (run None)."""
    out, miss = {}, 0
    for q in qids:
        lst = list(first[q])
        head = lst[:K]
        m = sum(d not in S.get(q, {}) for d in head)
        miss += m
        if m:
            out[q] = None
            continue
        head = sorted(head, key=lambda d: -S[q][d])
        order = head + lst[K:]
        out[q] = {d: float(len(order) - i) for i, d in enumerate(order)}
    return out, miss


def logit(p):
    p = min(max(p, 1e-7), 1 - 1e-7)
    return math.log(p / (1 - p))


def sigmoid(x):
    return 1 / (1 + math.exp(-x))
