"""Hybrid search on the recorded top-100 lists: BM25 alone, each dense model alone, and the two fused
with reciprocal rank fusion (RRF, k swept), min-max and z-score score fusion (weight alpha swept).
Deterministic: no model runs. Output: out/fusion.json.

Conventions (stated on the page):
- each first stage contributes its top 100 (the recorded run files);
- RRF: score(d) = sum over lists of 1 / (k + rank(d)), rank starting at 1; a list that does not hold d adds 0;
- min-max: each list's scores mapped to [0, 1]; z-score: (s - mean) / std over that query's top 100;
  a document missing from a list gets that list's lowest normalised value;
  fused = alpha * dense + (1 - alpha) * bm25;
- the fused list is cut to 100 before recall@100.
"""
import os, sys; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
from common import L, save, per_query, mean, r3

DENSE = ["minilm-l6", "bge-small", "gte-modernbert", "qwen3-emb-0.6b", "colbert-small"]
KS = [1, 2, 5, 10, 20, 40, 60, 100, 200, 500, 1000]
ALPHAS = [round(a / 10, 1) for a in range(11)]
M = ("ndcg_cut.10", "recall.10", "recall.100")


def rrf(lists, k):
    out = {}
    for lst in lists:
        for r, d in enumerate(lst):
            out[d] = out.get(d, 0.0) + 1.0 / (k + r + 1)
    return out


def norm(scores, how):
    v = np.array(list(scores.values()), dtype=float)
    if how == "minmax":
        lo, hi = v.min(), v.max()
        f = (lambda s: (s - lo) / (hi - lo)) if hi > lo else (lambda s: 0.0)
    else:
        mu, sd = v.mean(), v.std()
        f = (lambda s: (s - mu) / sd) if sd > 0 else (lambda s: 0.0)
    n = {d: f(s) for d, s in scores.items()}
    return n, min(n.values())


def score_fuse(a, b, alpha, how):
    """alpha weights b (dense); a is BM25."""
    na, fa = norm(a, how)
    nb, fb = norm(b, how)
    docs = set(a) | set(b)
    return {d: (1 - alpha) * na.get(d, fa) + alpha * nb.get(d, fb) for d in docs}


def top(d, n=100):
    return dict(sorted(d.items(), key=lambda x: -x[1])[:n])


def summ(pq):
    return {"ndcg10": r3(mean(pq, M[0])), "r10": r3(mean(pq, M[1])), "r100": r3(mean(pq, M[2]))}


def main():
    res = {}
    for ds in ("scifact", "nfcorpus"):
        _, _, qrels = L.beir(ds)
        qt = qrels["test"]
        bm = L.run(ds, "bm25")
        R = {"n_queries": len(qt), "single": {}, "rrf": {}, "minmax": {}, "zscore": {}, "wins": {}, "overlap": {}}
        pq_bm = per_query(bm, qt, M)
        R["single"]["bm25"] = summ(pq_bm)
        for dm in DENSE:
            de = L.run(ds, dm)
            pq_de = per_query(de, qt, M)
            R["single"][dm] = summ(pq_de)
            R["rrf"][dm] = {}
            for k in KS:
                f = {q: top(rrf([list(bm.get(q, {})), list(de.get(q, {}))], k)) for q in qt}
                pq = per_query(f, qt, M)
                R["rrf"][dm][str(k)] = summ(pq)
                if k == 60:
                    d_dense = [pq[q][M[0]] - pq_de[q][M[0]] for q in qt]
                    d_bm = [pq[q][M[0]] - pq_bm[q][M[0]] for q in qt]
                    R["wins"][dm] = {"vs_dense_up": sum(x > 1e-9 for x in d_dense), "vs_dense_down": sum(x < -1e-9 for x in d_dense),
                                     "vs_bm25_up": sum(x > 1e-9 for x in d_bm), "vs_bm25_down": sum(x < -1e-9 for x in d_bm)}
            for how in ("minmax", "zscore"):
                R[how][dm] = {}
                for a in ALPHAS:
                    f = {q: top(score_fuse(bm.get(q, {}), de.get(q, {}), a, how)) for q in qt}
                    R[how][dm][str(a)] = summ(per_query(f, qt, M))
            # how much the two top-10s agree
            ov = [len(set(list(bm.get(q, {}))[:10]) & set(list(de.get(q, {}))[:10])) for q in qt]
            R["overlap"][dm] = r3(np.mean(ov))
        res[ds] = R
        print(ds, R["single"], {dm: R["rrf"][dm]["60"] for dm in DENSE})

    save("fusion.json", res)


if __name__ == "__main__":
    main()
