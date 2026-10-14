"""Metadata filtering inside the search (pre-filter) against after the search (post-filter), on SciFact with
Qwen3-Embedding-0.6B and exact search (so the only effect is where the filter runs; filtered ANN indexes are
the Vector search lab's subject).
The attribute is constructed: every abstract gets an access group g = crc32(doc id) mod G (like a tenant or a
permission group), so a filter keeps 1/G of the corpus. Each claim is asked by a user of the group of its first
relevant abstract, so the answer is always reachable; relevant abstracts in other groups are out of bounds.
Pre-filter: exact top 10 among the allowed abstracts. Post-filter: exact top N over everything (N = 10, 30, 100,
1000), then drop what the user may not see, keep at most 10.
Output: out/filter.json."""
import os, sys; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import zlib
import numpy as np
from common import L, save, r3

DS, MODEL = "scifact", "qwen3-emb-0.6b"
_, _, qrels = L.beir(DS)
qt = sorted(qrels["test"])
ids, X = L.embeddings(DS, MODEL); X = np.asarray(X)
qall, Q = L.embeddings(DS, MODEL, "queries"); pos = {q: i for i, q in enumerate(qall)}
S = np.stack([X @ np.asarray(Q[pos[q]]) for q in qt])          # [300, 5183] exact scores
order = np.argsort(-S, axis=1)
grp_hash = np.array([zlib.crc32(d.encode()) for d in ids], dtype=np.int64)
idx = {d: i for i, d in enumerate(ids)}
GS = [1, 2, 5, 10, 20, 50, 100]
NS = [10, 30, 100, 1000]
res = {"model": MODEL, "n_docs": len(ids), "n_queries": len(qt), "groups": {}}
for G in GS:
    grp = grp_hash % G
    row = {"keep_share": r3(1 / G), "allowed_docs_mean": 0, "pre": {}, "post": {}}
    pre_found, pre_n, allowed_n = 0, [], []
    post = {N: {"found": 0, "returned": [], "empty": 0, "short": 0} for N in NS}
    for i, q in enumerate(qt):
        rel = sorted(qrels["test"][q])
        g = grp[idx[rel[0]]]
        relok = {d for d in rel if grp[idx[d]] == g}
        allowed = grp[order[i]] == g
        allowed_n.append(int(allowed.sum()))
        ranked_allowed = order[i][allowed]
        top_pre = [ids[j] for j in ranked_allowed[:10]]
        pre_found += any(d in relok for d in top_pre)
        pre_n.append(len(top_pre))
        for N in NS:
            cand = order[i][:N]
            kept = [ids[j] for j in cand if grp[j] == g][:10]
            p = post[N]
            p["found"] += any(d in relok for d in kept)
            p["returned"].append(len(kept))
            p["empty"] += len(kept) == 0
            p["short"] += len(kept) < 10
    row["allowed_docs_mean"] = round(float(np.mean(allowed_n)), 1)
    row["pre"] = {"hit10": pre_found, "returned_mean": round(float(np.mean(pre_n)), 2)}
    for N in NS:
        p = post[N]
        row["post"][str(N)] = {"hit10": p["found"], "returned_mean": round(float(np.mean(p["returned"])), 2),
                               "empty": p["empty"], "short": p["short"]}
    res["groups"][str(G)] = row
    print(G, row)
save("filter.json", res)
