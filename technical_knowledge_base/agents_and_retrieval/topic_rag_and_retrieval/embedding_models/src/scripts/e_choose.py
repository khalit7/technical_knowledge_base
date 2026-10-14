"""Choosing a model on your own labelled queries, with confidence intervals. Deterministic, CPU, no lock.
1. Per-query nDCG@10 of every first-stage system on SciFact (300), NFCorpus (323) and the multi-hop set (200),
   from the setup's recorded runs; mean with a 95% percentile bootstrap CI (10,000 resamples of queries).
2. Paired bootstrap for every pair of dense models on each set (difference, CI, share of resamples won).
3. "How many labelled queries do I need?": random subsets of n test queries (2,000 draws per n, seed 0): how often
   the subset picks the same winner as the full set, how often it orders the four dense models exactly as the full
   set, and the mean half-width of the 95% CI of the winner's margin.
4. The protocol on held-out data: choose with SciFact TRAIN claims (stored query vectors, exact search), check
   on TEST. For n train claims (2,000 draws), the test nDCG@10 of the model chosen, against always picking the
   test-best model.
5. Optional rows for models measured later by this page (e5-small-v2 with and without prefixes) are read from
   data/prefix.json if present.
usage: python -I -B e_choose.py   -> ../data/choose.json"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np  # noqa: E402
from emblib import L, golden, corpus_vectors, query_vectors, search, per_query, bootstrap_ci, paired_bootstrap, r4, save  # noqa: E402

DENSE = ["minilm-l6", "bge-small", "gte-modernbert", "qwen3-emb-0.6b"]
SYS = {"scifact": ["bm25"] + DENSE + ["colbert-small"], "nfcorpus": ["bm25"] + DENSE + ["colbert-small"],
       "hotpotqa": ["bm25"] + DENSE}
rng = np.random.default_rng(0)


def qrels_for(ds):
    if ds == "hotpotqa":
        qs, _ = L.multihop()
        return {q["qid"]: {p: 1 for p in q["gold_pids"]} for q in qs}
    _, _, qrels = L.beir(ds)
    gold = set(golden(ds))
    return {q: v for q, v in qrels["test"].items() if q in gold}


out = dict(asof="2026-10-14", B=10000, sets={})
PQ = {}
for ds, systems in SYS.items():
    qrels = qrels_for(ds)
    res = {}
    for s in systems:
        pq, qs = per_query(L.run(ds, s), qrels)
        v = pq["ndcg_cut.10"]
        PQ[(ds, s)] = v
        lo, hi = bootstrap_ci(v)
        res[s] = dict(ndcg10=r4(v.mean()), lo=r4(lo), hi=r4(hi), recall100=r4(pq["recall.100"].mean()))
    pairs = {}
    for i, a in enumerate(DENSE):
        for b in DENSE[i + 1:]:
            pairs[a + "|" + b] = paired_bootstrap(PQ[(ds, a)], PQ[(ds, b)])
    best = max(systems, key=lambda s: res[s]["ndcg10"])
    vs_best = {s: paired_bootstrap(PQ[(ds, s)], PQ[(ds, best)]) for s in systems if s != best}
    # subsample stability among the dense models
    M = np.stack([PQ[(ds, s)] for s in DENSE])  # [4, nq]
    full = M.mean(1)
    win, order = int(full.argmax()), list(np.argsort(-full))
    second = order[1]
    sub = []
    for n in [n for n in (25, 50, 100, 200) if n < M.shape[1]]:
        same_w = same_o = 0
        hw = []
        for _ in range(2000):
            idx = rng.choice(M.shape[1], n, replace=False)
            m = M[:, idx].mean(1)
            same_w += int(m.argmax() == win)
            same_o += int(list(np.argsort(-m)) == order)
            d = M[win, idx] - M[second, idx]
            hw.append(1.96 * d.std(ddof=1) / np.sqrt(n))
        sub.append(dict(n=n, same_winner=r4(same_w / 2000), same_order=r4(same_o / 2000), ci_halfwidth=r4(np.mean(hw))))
    out["sets"][ds] = dict(n=len(qrels), systems=res, pairs=pairs, best=best, vs_best=vs_best, winner=DENSE[win], second=DENSE[second],
                           subsample=sub)
    print(ds, {s: res[s]["ndcg10"] for s in res}, sub, flush=True)

# 4. choose on SciFact train, check on test
corpus, queries, qrels = L.beir("scifact")
tr = {q: v for q, v in qrels["train"].items()}
trq = sorted(tr, key=int)
TR = []
for s in DENSE:
    ids, X = corpus_vectors("scifact", s)
    Q = query_vectors("scifact", s, trq)
    pq, qs = per_query(search(Q, X, ids, trq), tr)
    TR.append(pq["ndcg_cut.10"])
    print("train", s, round(pq["ndcg_cut.10"].mean(), 4), flush=True)
TR = np.stack(TR)
test = np.array([out["sets"]["scifact"]["systems"][s]["ndcg10"] for s in DENSE])
proto = []
for n in (25, 50, 100, 200, 400, len(trq)):
    got, right = [], 0
    for _ in range(2000 if n < len(trq) else 1):
        idx = rng.choice(len(trq), n, replace=False)
        c = int(TR[:, idx].mean(1).argmax())
        got.append(test[c]); right += int(c == test.argmax())
    reps = 2000 if n < len(trq) else 1
    proto.append(dict(n=n, test_ndcg_mean=r4(np.mean(got)), test_ndcg_p05=r4(np.quantile(got, .05)),
                      picked_test_best=r4(right / reps)))
out["train_protocol"] = dict(n_train=len(trq), train_ndcg={s: r4(TR[i].mean()) for i, s in enumerate(DENSE)},
                             pairs={DENSE[a] + "|" + DENSE[b]: paired_bootstrap(TR[a], TR[b]) for a in range(4) for b in range(a + 1, 4)},
                             test_best=DENSE[int(test.argmax())], test_best_ndcg=r4(test.max()), sweep=proto)
print(proto)
# 6. train and test mix claims WITH annotated evidence and NEI claims whose qrels are only the cited abstract
#    (original SciFact release, extracted by the Pipeline lab in $RAG_SCRATCH/pipe/scifact_orig).
import json  # noqa: E402
kind = {}
for f in ("claims_train.jsonl", "claims_dev.jsonl"):
    for line in open(L.path("pipe", "scifact_orig", "data", f)):
        c = json.loads(line)
        kind[str(c["id"])] = "evidence" if c["evidence"] else "nei"
tq = sorted(qrels_for("scifact"))
split = {}
for name, qs, getv in (("train", trq, lambda i: TR[i]), ("test", tq, lambda i: PQ[("scifact", DENSE[i])])):
    ks = np.array([kind.get(q, "?") for q in qs])
    split[name] = dict(n_evidence=int((ks == "evidence").sum()), n_nei=int((ks == "nei").sum()),
                       evidence={s: r4(getv(i)[ks == "evidence"].mean()) for i, s in enumerate(DENSE)},
                       nei={s: r4(getv(i)[ks == "nei"].mean()) for i, s in enumerate(DENSE)})
out["claim_kinds"] = split
print(split)
save("choose.json", out)
