"""The backfill trap: re-embedding a corpus with a new model inside the same index (deterministic, no lock).
all-MiniLM-L6-v2 (old) and bge-small-en-v1.5 (new) both output 384 numbers, so a database accepts either model's
vectors in the same column without complaint. A backfill rewrites the corpus in batches; during it, the index holds a
mix. Measured: nDCG@10 on SciFact's 300 test claims (exact search, setup's precomputed vectors) when a share f of the
documents (a fixed random order, seed 0) carries new-model vectors, queried with the old or the new model, against the
dual-index pattern (old index serves until the new one is complete, then an atomic switch).
Also: what each model's query finds in the other model's index, and the per-document score scale of each model.
Output: data/backfill.json"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
from common import L, save

corpus, queries, qrels = L.beir("scifact")
test = qrels["test"]
ids_o, Xo = L.embeddings("scifact", "minilm-l6")
ids_n, Xn = L.embeddings("scifact", "bge-small")
assert ids_o == ids_n
qids, Qo = L.embeddings("scifact", "minilm-l6", "queries")
qids2, Qn = L.embeddings("scifact", "bge-small", "queries")
assert qids == qids2
qp = {q: i for i, q in enumerate(qids)}
Xo, Xn, Qo, Qn = (np.asarray(a, dtype=np.float32) for a in (Xo, Xn, Qo, Qn))
tq = sorted(test, key=int)
order = np.random.default_rng(0).permutation(len(ids_o))


def ndcg(X, Q):
    run = {}
    for q in tq:
        s = X @ Q[qp[q]]
        k = np.argpartition(-s, 10)[:10]
        run[q] = {ids_o[j]: float(s[j]) for j in k}
    return L.evaluate(run, test, ("ndcg_cut_10",))["ndcg@10"], run


rows = []
for f in [i / 10 for i in range(11)]:
    X = Xo.copy()
    m = order[: int(round(f * len(ids_o)))]
    X[m] = Xn[m]
    no, run_o = ndcg(X, Qo)
    nn, run_n = ndcg(X, Qn)
    isnew = np.zeros(len(ids_o), bool); isnew[m] = True
    pos = {d: i for i, d in enumerate(ids_o)}
    share_new_o = np.mean([np.mean([isnew[pos[d]] for d in r]) for r in run_o.values()])
    share_new_n = np.mean([np.mean([isnew[pos[d]] for d in r]) for r in run_n.values()])
    rows.append({"f": f, "ndcg_old_query": round(no, 4), "ndcg_new_query": round(nn, 4),
                 "top10_new_share_old_query": round(float(share_new_o), 3), "top10_new_share_new_query": round(float(share_new_n), 3)})
    print(rows[-1])
# score scales: the typical top-1 and random-pair cosine per model
def scale(X, Q):
    s = Q[[qp[q] for q in tq]] @ X.T
    return {"top1_median": round(float(np.median(s.max(1))), 3), "all_median": round(float(np.median(s)), 3)}
out = {"rows": rows, "old": "minilm-l6", "new": "bge-small",
       "cross": {"new_query_old_index": rows[0]["ndcg_new_query"], "old_query_new_index": rows[-1]["ndcg_old_query"]},
       "scale": {"minilm-l6": scale(Xo, Qo), "bge-small": scale(Xn, Qn)}}
print(out["cross"], out["scale"])
save("backfill.json", out)
