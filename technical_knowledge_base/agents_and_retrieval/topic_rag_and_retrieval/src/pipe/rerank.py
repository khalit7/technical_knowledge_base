"""Rerank depth sweep on SciFact from the recorded cross-encoder scores (no model runs here; see
rerank_extra.py for the scores this script needs beyond the setup's).
First stages: BM25, Qwen3-Embedding-0.6B (dense), and hybrid RRF (k 60) of the two.
After reranking the top K, the reranked K come first and the first stage's ranks K+1.. follow unchanged.
Output: out/rerank.json."""
import os, sys; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import json
from common import L, save, per_query, mean, r3, work
import fusion as F

DS = "scifact"


def load_scores(name):
    S = L.rerank_scores(DS, name)
    extra = work("rerank_extra", DS, name + ".tsv")  # pairs scored by rerank_extra.py (same model and settings)
    if os.path.exists(extra):
        for line in open(extra):
            q, d, s = line.rstrip("\n").split("\t")
            S.setdefault(q, {})[d] = float(s)
    return S


def rerank(first, S, K, qt):
    out, miss = {}, 0
    for q in qt:
        lst = list(first[q])
        head = lst[:K]
        miss += sum(d not in S.get(q, {}) for d in head)
        if any(d not in S.get(q, {}) for d in head):
            out[q] = None
            continue
        head = sorted(head, key=lambda d: -S[q][d])
        order = head + lst[K:]
        out[q] = {d: float(len(order) - i) for i, d in enumerate(order)}
    return out, miss


def main():
    M = ("ndcg_cut.10", "recall.10", "recall.100")
    DS = "scifact"
    _, _, qrels = L.beir(DS)
    qt = qrels["test"]
    bm = L.run(DS, "bm25"); de = L.run(DS, "qwen3-emb-0.6b")
    hy = {q: F.top(F.rrf([list(bm[q]), list(de[q])], 60)) for q in qt}
    FIRST = {"bm25": bm, "dense": de, "hybrid": hy}


    RER = {"ce-minilm-l6": load_scores("ce-minilm-l6"),
           "bge-reranker-v2-m3": load_scores("bge-reranker-v2-m3_top30"),
           "qwen3-reranker-0.6b": load_scores("qwen3-reranker-0.6b_top30")}
    KS = [1, 3, 5, 10, 20, 30, 50, 100]


    res = {"n_queries": len(qt), "first": {}, "sweep": {}, "coverage": {}}
    for fn, first in FIRST.items():
        pq = per_query(first, qt, M)
        res["first"][fn] = {"ndcg10": r3(mean(pq, M[0])), "r10": r3(mean(pq, M[1])), "r100": r3(mean(pq, M[2])),
                            "recallK": {str(K): r3(mean(per_query({q: dict(list(first[q].items())[:K]) for q in qt}, qt, ("recall.100",)), "recall.100")) for K in KS}}
        for rn, S in RER.items():
            row, cov = {}, {}
            for K in KS:
                rr, miss = rerank(first, S, K, qt)
                cov[str(K)] = miss
                if miss:
                    continue
                pq = per_query(rr, qt, M)
                row[str(K)] = {"ndcg10": r3(mean(pq, M[0])), "r10": r3(mean(pq, M[1]))}
            res["sweep"].setdefault(fn, {})[rn] = row
            res["coverage"].setdefault(fn, {})[rn] = cov
            print(fn, rn, json.dumps(row), "missing pairs:", {k: v for k, v in cov.items() if v})
    save("rerank.json", res)


if __name__ == "__main__":
    main()
