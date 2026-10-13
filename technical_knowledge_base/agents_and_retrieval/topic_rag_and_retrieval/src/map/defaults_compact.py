"""Compact the defaults experiment for the page: mean ANN recall@10 per configuration, per-query recall as a digit
string (0-9 tenths, 'A' = 10/10), retrieval nDCG@10 and recall@10 against SciFact's test qrels for each configuration,
and full top-10 lists with titles for 12 queries (the first 12 test queries by id, not chosen by result).
Run: <mapenv>/bin/python -I defaults_compact.py <RAG_SCRATCH> <defaults_real_full.json>  -> inputs/defaults_real.json"""
import json, os, sys, math
import pandas as pd

HERE = os.path.dirname(os.path.abspath(__file__))
RS, FULL = sys.argv[1], sys.argv[2]
d = json.load(open(FULL))
raw = os.path.join(RS, "data", "raw", "scifact")
corpus = pd.read_parquet(os.path.join(raw, "corpus.parquet"))
queries = pd.read_parquet(os.path.join(raw, "queries.parquet"))
cid_col = "_id" if "_id" in corpus.columns else corpus.columns[0]
qid_col = "_id" if "_id" in queries.columns else queries.columns[0]
cids = open(os.path.join(RS, "data", "emb", "scifact", "bge-small", "corpus_ids.txt")).read().split()
title = dict(zip(corpus[cid_col].astype(str), corpus["title"].astype(str)))
qtext = dict(zip(queries[qid_col].astype(str), queries["text"].astype(str)))
qrels = pd.read_csv(os.path.join(raw, "test.tsv"), sep="\t", dtype=str)
rel = {}
for q, c, s in zip(qrels["query-id"], qrels["corpus-id"], qrels["score"]):
    if int(s) > 0:
        rel.setdefault(q, set()).add(c)
tq = d["test_qids"]


def ndcg10(ids, q):
    R = rel.get(q, set())
    dcg = sum(1 / math.log2(i + 2) for i, x in enumerate(ids[:10]) if cids[x] in R)
    idcg = sum(1 / math.log2(i + 2) for i in range(min(10, len(R))))
    return dcg / idcg if idcg else 0.0


def rec10(ids, q):
    R = rel.get(q, set())
    return len([x for x in ids[:10] if cids[x] in R]) / len(R) if R else 0.0


runs = []
for k, r in d["runs"].items():
    nd = sum(ndcg10(t, q) for t, q in zip(r["top"], tq)) / len(tq)
    rc = sum(rec10(t, q) for t, q in zip(r["top"], tq)) / len(tq)
    pq = "".join("A" if x >= 1 else str(int(round(x * 10))) for x in r["per_query"])
    runs.append({"key": k, "lib": r["lib"], "label": r["label"], "ann_recall10": r["recall10"], "ndcg10": round(nd, 4), "recall10": round(rc, 4),
                 "cfg": r["cfg"], "src": r["src"], "pq": pq})
ex_nd = sum(ndcg10(t, q) for t, q in zip(d["exact"], tq)) / len(tq)
pick = list(range(12))
docs = {}
show = []
for i in pick:
    q = tq[i]
    lists = {r["key"]: r["top"][i] for r in [dict(key=k, **v) for k, v in d["runs"].items()]}
    for L in list(lists.values()) + [d["exact"][i]]:
        for x in L:
            docs[x] = title.get(cids[x], "")[:90]
    show.append({"qid": q, "text": qtext.get(q, ""), "exact": d["exact"][i], "rel": [j for j, c in enumerate(cids) if c in rel.get(q, set())], "lists": lists})
out = {"asof": d["asof"], "data": d["data"], "versions": d["versions"], "n_queries": len(tq), "exact_ndcg10": round(ex_nd, 4), "runs": runs,
       "show": show, "docs": {str(k): v for k, v in docs.items()}}
json.dump(out, open(os.path.join(HERE, "inputs", "defaults_real.json"), "w"), indent=0)
for r in runs:
    print(r["key"], r["ann_recall10"], r["ndcg10"], r["recall10"])
print("exact ndcg", out["exact_ndcg10"], "docs", len(docs))
