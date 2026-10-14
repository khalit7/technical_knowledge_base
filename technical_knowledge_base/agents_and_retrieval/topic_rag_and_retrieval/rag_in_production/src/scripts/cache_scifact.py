"""Semantic cache false hits on real SciFact claims (deterministic, no lock).

SciFact's annotators wrote many claims in pairs from one cited abstract: one the abstract SUPPORTS and one it
CONTRADICTS (often a negation of the other). Those pairs are the hardest case for a semantic cache in a RAG system:
nearly the same words, opposite correct answers.

Simulation: the 1,109 labelled claims (809 train + 300 dev = BEIR's test) arrive in id order. A claim is served from
the cache when the most similar earlier claim (cosine of the query embeddings precomputed by the setup, with each
model's query prompt) is at least the threshold. A served answer is right only if the cached claim has the same
verdict on the same abstract. Two caches:
  answer cache: the cached claim's answer is returned (relation of the two claims decides right or wrong);
  result cache: the cached claim's retrieved top 10 is reused (nDCG@10 of the 300 BEIR test claims with and without).
Output: data/cache_scifact.json"""
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
from common import L, orig_scifact, save

MODELS = ["minilm-l6", "bge-small", "gte-modernbert", "qwen3-emb-0.6b"]
TH = [round(0.50 + 0.01 * i, 2) for i in range(51)]

cl = [json.loads(l) for f in ("claims_train.jsonl", "claims_dev.jsonl") for l in open(os.path.join(orig_scifact(), f))]
cl.sort(key=lambda c: c["id"])
corpus, queries, qrels = L.beir("scifact")
by_text = {}
for q, t in queries.items():
    by_text.setdefault(t.strip(), []).append(q)
test = qrels["test"]


def verdicts(c):
    v = {}
    for d, ev in c["evidence"].items():
        labs = {e["label"] for e in ev}
        v[d] = labs.pop() if len(labs) == 1 else "MIXED"
    return v


def relation(a, b):
    va, vb = verdicts(a), verdicts(b)
    shared = set(va) & set(vb)
    if shared:
        if any(va[d] == vb[d] for d in shared):
            return "same"
        return "opposite"
    if not va and not vb and set(map(str, a["cited_doc_ids"])) & set(map(str, b["cited_doc_ids"])):
        return "nei_same_doc"
    return "unrelated"


# BEIR qid for each claim (by exact text)
qid_of = {}
for c in cl:
    qs = by_text.get(c["claim"].strip(), [])
    if len(qs) == 1:
        qid_of[c["id"]] = qs[0]
print("claims mapped to BEIR ids:", len(qid_of), "of", len(cl))
cl = [c for c in cl if c["id"] in qid_of]
pytrec = __import__("pytrec_eval")

out = {"n_claims": len(cl), "thresholds": TH, "models": {}}
for m in MODELS:
    qids, Q = L.embeddings("scifact", m, "queries")
    pos = {q: i for i, q in enumerate(qids)}
    V = np.asarray(Q)[[pos[qid_of[c["id"]]] for c in cl]].astype(np.float32)
    S = V @ V.T
    n = len(cl)
    best_j = np.full(n, -1)
    best_s = np.full(n, -1.0)
    for i in range(1, n):
        j = int(np.argmax(S[i, :i]))
        best_j[i], best_s[i] = j, float(S[i, j])
    rel = ["none"] + [relation(cl[i], cl[best_j[i]]) for i in range(1, n)]
    rows = []
    for t in TH:
        hit = best_s >= t
        cnt = {k: int(sum(1 for i in range(n) if hit[i] and rel[i] == k)) for k in ("same", "opposite", "nei_same_doc", "unrelated")}
        rows.append({"t": t, "hits": int(hit.sum()), **cnt})
    # every opposite pair (not only nearest neighbours): how similar are a claim and its contradiction?
    opp_s, same_s = [], []
    for i in range(n):
        for j in range(i):
            r = relation(cl[i], cl[j])
            if r == "opposite":
                opp_s.append(float(S[i, j]))
            elif r == "same":
                same_s.append(float(S[i, j]))
    # result cache on the BEIR test claims
    ids, X = L.embeddings("scifact", m)
    X = np.asarray(X, dtype=np.float32)
    top = {}
    for i, c in enumerate(cl):
        s = X @ V[i]
        k = np.argpartition(-s, 10)[:10]
        k = k[np.argsort(-s[k])]
        top[i] = {ids[j]: float(s[j]) for j in k}
    tidx = [i for i, c in enumerate(cl) if qid_of[c["id"]] in test]
    ev = pytrec.RelevanceEvaluator({qid_of[cl[i]["id"]]: test[qid_of[cl[i]["id"]]] for i in tidx}, {"ndcg_cut.10"})
    own = ev.evaluate({qid_of[cl[i]["id"]]: top[i] for i in tidx})
    served = ev.evaluate({qid_of[cl[i]["id"]]: (top[best_j[i]] if best_j[i] >= 0 else {"x": 0.0}) for i in tidx})
    own_n = {i: own[qid_of[cl[i]["id"]]]["ndcg_cut_10"] for i in tidx}
    srv_n = {i: served[qid_of[cl[i]["id"]]]["ndcg_cut_10"] for i in tidx}
    rc = []
    for t in TH:
        hit = [i for i in tidx if best_s[i] >= t]
        nd = np.mean([srv_n[i] if best_s[i] >= t else own_n[i] for i in tidx])
        rc.append({"t": t, "hits": len(hit), "ndcg": round(float(nd), 4),
                   "hits_worse": sum(1 for i in hit if srv_n[i] < own_n[i] - 1e-9),
                   "hits_better": sum(1 for i in hit if srv_n[i] > own_n[i] + 1e-9)})
    # examples: the most similar opposite nearest-neighbour hits
    ex = sorted([i for i in range(1, n) if rel[i] == "opposite"], key=lambda i: -best_s[i])[:6]
    out["models"][m] = {
        "answer_cache": rows,
        "result_cache": {"n_test": len(tidx), "ndcg_no_cache": round(float(np.mean(list(own_n.values()))), 4), "rows": rc},
        "pairs": {"opposite_n": len(opp_s), "same_n": len(same_s),
                  "opposite_sim_pct": [round(float(np.percentile(opp_s, p)), 3) for p in (10, 25, 50, 75, 90)],
                  "same_sim_pct": [round(float(np.percentile(same_s, p)), 3) for p in (10, 25, 50, 75, 90)],
                  "opposite_hist": np.histogram(opp_s, bins=25, range=(0.5, 1.0))[0].tolist(),
                  "same_hist": np.histogram(same_s, bins=25, range=(0.5, 1.0))[0].tolist()},
        "examples": [{"new": cl[i]["claim"], "cached": cl[best_j[i]]["claim"], "sim": round(float(best_s[i]), 3),
                      "new_v": list(verdicts(cl[i]).values())[0], "cached_v": list(verdicts(cl[best_j[i]]).values())[0]} for i in ex],
    }
    r90 = [r for r in rows if r["t"] == 0.9][0]
    print(m, "opp median sim", out["models"][m]["pairs"]["opposite_sim_pct"][2], "at 0.90:", r90,
          "result-cache ndcg no cache", out["models"][m]["result_cache"]["ndcg_no_cache"], [r for r in rc if r["t"] in (0.8, 0.9, 0.95)])
save("cache_scifact.json", out)
