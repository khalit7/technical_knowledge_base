"""Rerank depth K against quality on SciFact from recorded scores (deterministic, no model runs, no lock).
First stages: BM25, Qwen3-Embedding-0.6B (dense), hybrid RRF k 60 (the root's Pipeline lab definitions).
For each reranker and K: nDCG@10, recall@10, MRR, per-query wins/losses against the first stage, and the ceiling
(first-stage recall@K: a reranker cannot surface what is not in its K). Cross-checks the root's out/rerank.json.
Output: data/depth.json"""
import os, sys; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import json
from rrlib import L, DS, first_stages, rerank_scores, RERANKERS, rerank, per_query, mean, r3, save, ROOT_SRC

KS = [1, 3, 5, 10, 20, 30, 40, 50, 75, 100]
M = ("ndcg_cut.10", "recall.10", "recall.100", "recip_rank")


def main():
    _, _, qrels = L.beir(DS)
    qt = qrels["test"]
    FS = first_stages()
    RR = {k: rerank_scores(v) for k, v in RERANKERS.items()}
    out = {"n_queries": len(qt), "ks": KS, "first": {}, "sweep": {}, "check_root": {}}
    for fn, first in FS.items():
        pq0 = per_query(first, qt, M)
        rec = {}
        for K in KS:
            pk = per_query({q: dict(list(first[q].items())[:K]) for q in qt}, qt, ("recall.100",))
            rec[str(K)] = r3(mean(pk, "recall.100"))
        out["first"][fn] = {"ndcg10": r3(mean(pq0, M[0])), "r10": r3(mean(pq0, M[1])), "mrr": r3(mean(pq0, M[3])), "recallK": rec}
        for rn, S in RR.items():
            row = {}
            for K in KS:
                run, miss = rerank(first, S, K, qt)
                if miss:
                    continue
                pq = per_query(run, qt, M)
                win = sum(pq[q][M[0]] > pq0[q][M[0]] + 1e-9 for q in qt)
                loss = sum(pq[q][M[0]] < pq0[q][M[0]] - 1e-9 for q in qt)
                row[str(K)] = {"ndcg10": r3(mean(pq, M[0])), "r10": r3(mean(pq, M[1])), "mrr": r3(mean(pq, M[3])),
                               "win": win, "loss": loss}
            out["sweep"].setdefault(fn, {})[rn] = row
            print(fn, rn, {k: v["ndcg10"] for k, v in row.items()})
    # agreement with the root's Pipeline lab (src/pipe/out/rerank.json), where it exists
    rp = os.path.join(ROOT_SRC, "pipe", "out", "rerank.json")
    if os.path.exists(rp):
        R = json.load(open(rp))
        same, diff = 0, []
        for fn, d in R["sweep"].items():
            for rn, row in d.items():
                for K, v in row.items():
                    mine = out["sweep"][fn][rn].get(K)
                    if mine is None:
                        continue
                    if mine["ndcg10"] == v["ndcg10"] and mine["r10"] == v["r10"]:
                        same += 1
                    else:
                        diff.append([fn, rn, K, v, mine])
        out["check_root"] = {"cells_equal": same, "cells_differ": diff}
        print("root agreement:", same, "equal,", len(diff), "differ", diff[:3])
    extra = {}
    for n in ("bge-reranker-v2-m3_top30", "qwen3-reranker-0.6b_top30"):
        p = L.path("rr", "rerank_extra", DS, n + ".tsv")
        extra[n] = sum(1 for _ in open(p)) if os.path.exists(p) else 0
    out["deep_extra_pairs"] = extra
    save("depth.json", out)


if __name__ == "__main__":
    main()
