"""Schema retrieval for text-to-SQL: with 81 tables across the 20 Spider dev databases pooled (the enterprise case:
many databases, the question does not say which), retrieve the tables a question needs before writing SQL.
One document per table: "<table> in <database>: <natural column names>" (Spider tables.json). Retrievers: BM25
(bm25s, the setup's tokenisation: English stopwords, Snowball stemmer, k1 1.2, b 0.75) and bge-small (CPU, its query
prefix). For the 100 questions of sql_set.json: gold-table recall at k, all gold tables in the top k, and prompt tokens
of the retrieved CREATE TABLE statements against the all-databases dump. Deterministic; CPU.
Run: $RAG_SCRATCH/venv/bin/python -I -B s_schema_ret.py
"""
import json
import os
import sys

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from grlib import L, load_data, r3, save, work  # noqa: E402

KS = (1, 2, 3, 5, 10)


def main():
    from tokenizers import Tokenizer
    tok = Tokenizer.from_file(os.path.join(L.path("models", "Qwen3-Embedding-0.6B"), "tokenizer.json"))
    S = load_data("sql_set.json")
    sch = json.load(open(work("spider_schemas.json")))["schemas"]
    tj = {x["db_id"]: x for x in json.load(open(L.path("gr", "dl", "spider", "x", "spider_data", "tables.json")))}
    docs, keys = [], []
    for db in sorted(sch):
        t = tj[db]
        for ti, tn in enumerate(t["table_names_original"]):
            cols = [c for (k, c) in t["column_names"] if k == ti]
            docs.append("%s in %s: %s" % (t["table_names"][ti], db.replace("_", " "), ", ".join(cols)))
            keys.append((db, tn.lower()))
    create = {}
    for db, tabs in sch.items():
        for n, s in tabs.items():
            create[(db, n.lower())] = len(tok.encode(s, add_special_tokens=False).ids)
    qs = [r["question"] for r in S["rows"]]
    gold = [{(r["db"], t) for t in r["tables"]} for r in S["rows"]]
    # BM25
    import bm25s, Stemmer
    st = Stemmer.Stemmer("english")
    bm = bm25s.BM25(k1=1.2, b=0.75)
    bm.index(bm25s.tokenize(docs, stopwords="en", stemmer=st, show_progress=False), show_progress=False)
    res, sc = bm.retrieve(bm25s.tokenize(qs, stopwords="en", stemmer=st, show_progress=False), k=len(docs), show_progress=False, n_threads=1)
    rank_bm = [list(res[i]) for i in range(len(qs))]
    enc = L.encoder("bge-small", device="cpu")
    D = enc.encode(docs, normalize_embeddings=True, show_progress_bar=False)
    Q = enc.encode(qs, prompt=L.MODELS["bge-small"]["query_prefix"], normalize_embeddings=True, show_progress_bar=False)
    rank_de = [list(np.argsort(-(D @ q), kind="stable")) for q in Q]
    out = {}
    for name, rk in (("bm25", rank_bm), ("bge-small", rank_de)):
        m = {"all_gold_at": {}, "gold_recall_at": {}, "tokens_at": {}, "db_top1": 0}
        for k in KS:
            allg = rec = tk = 0
            for r, g in zip(rk, gold):
                top = {keys[j] for j in r[:k]}
                allg += g <= top
                rec += len(g & top) / len(g)
                tk += sum(create[keys[j]] for j in r[:k])
            m["all_gold_at"][k] = allg
            m["gold_recall_at"][k] = r3(rec / len(gold))
            m["tokens_at"][k] = round(tk / len(gold))
        m["db_top1"] = sum(1 for r, row in zip(rk, S["rows"]) if keys[r[0]][0] == row["db"])
        out[name] = m
        print(name, json.dumps(m))
    per = [{"i": row["i"], "top5_bge": [list(keys[j]) for j in rd[:5]], "top5_bm25": [list(keys[j]) for j in rb[:5]]}
           for row, rd, rb in zip(S["rows"], rank_de, rank_bm)]
    save("schema_ret.json", {"tables": len(docs), "systems": out, "per_q": per, "doc_example": docs[keys.index(("concert_singer", "singer"))]})


if __name__ == "__main__":
    main()
