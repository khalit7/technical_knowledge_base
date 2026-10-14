"""One SciFact claim scored by BM25 term by term against its relevant abstract and BM25's top non-relevant one
(bm25lab = Lucene BM25 as bm25s computes it; k1 1.2, b 0.75). Output: out/bm25_example.json"""
import os, sys; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
import rp, bm25lab as B
L = rp.L
c, q, qr = L.beir("scifact"); dids = list(c); pos = {d: i for i, d in enumerate(dids)}
dt = B.tokenize([L.doc_text(c[d]) for d in dids]); idx = B.Index({"all": dt})
run = L.run("scifact", "bm25")
# a claim whose relevant abstract is BM25's rank 2 or 3 (so a non-relevant one beats it), short claim
pick = None
for x in sorted(qr["test"], key=lambda z: len(q[z])):
    lst = list(run[x]); rel = [d for d in lst[:3] if d in qr["test"][x]]
    if rel and lst[0] not in qr["test"][x] and len(q[x]) < 110:
        pick = (x, rel[0], lst[0]); break
x, dr, dn = pick
qt = B.tokenize([q[x]])[0]
out = {"qid": x, "claim": q[x], "tokens": qt, "N": idx.N, "avgdl": round(idx.avg["all"], 1), "docs": []}
for d in (dr, dn):
    i = pos[d]; ln = int(idx.len["all"][i]); terms = []
    tot = 0
    for t in qt:
        j = idx.vocab.get(t)
        tf = float(idx.tf["all"][i, j]) if j is not None else 0.0
        df = int(idx.df[j]) if j is not None else 0
        idf = float(idx.idf[j]) if j is not None else 0.0
        tfc = tf / (tf + 1.2 * (1 - 0.75 + 0.75 * ln / idx.avg["all"])) if tf else 0.0
        terms.append({"t": t, "df": df, "idf": round(idf, 3), "tf": int(tf), "tfc": round(tfc, 3), "contrib": round(idf * tfc, 3)}); tot += idf * tfc
    out["docs"].append({"id": d, "relevant": d in qr["test"][x], "title": c[d]["title"][:110], "len": ln, "score": round(tot, 3),
                        "rank": list(run[x]).index(d) + 1, "recorded_score": round(run[x][d], 3)})
    out["docs"][-1]["terms"] = terms
print(out)
rp.save("bm25_example.json", out)
