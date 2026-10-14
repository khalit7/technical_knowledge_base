"""Why the two halves of HNSW matter, measured at full size with the port (pyhnsw.py): hnswlib's algorithm against
(a) plain "keep the M closest" neighbour selection with the same layers, and (b) the heuristic with a single layer.
Same vectors, insertion order and levels. Recall@10 against exact search, distance computations per query, nodes
unreachable on layer 0 from the entry point. Sets: SciFact Qwen3 (5,183; M 16, ef_construction 200) and the four
corpora stacked (25,039; M 16, ef_construction 100; 400 queries).  Output: $RAG_SCRATCH/vix/out/variants.json"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from collections import deque

import numpy as np

import pyhnsw
import vixlib as V

R = {"asof": V.stamp()}
for which in ("scifact", "all4"):
    if which == "scifact":
        X, Q, *_ = V.beir_set("scifact", "qwen3-emb-0.6b"); efc = 200
    else:
        X, Q, _, _ = V.all4_set(); efc = 100
        Q = Q[np.sort(np.random.default_rng(1).choice(len(Q), 400, replace=False))]
    GT = V.exact_topk(X, Q)[0]
    lv = pyhnsw.random_levels(len(X), 16, seed=5)
    R[which] = {"n": len(X), "queries": len(Q), "M": 16, "efc": efc, "variants": {}}
    for key, sel, flat in (("hnsw", "heuristic", False), ("simple", "simple", False), ("flat", "heuristic", True)):
        P = pyhnsw.HNSW(X, M=16, ef_construction=efc, select=sel, flat=flat)
        for i in range(len(X)):
            P.add(i, int(lv[i]))
        bnd = P.ndis
        seen = {P.ep}; dq = deque([P.ep])
        while dq:
            u = dq.popleft()
            for v in P.links[u][0]:
                if v not in seen:
                    seen.add(v); dq.append(v)
        rows = []
        for ef in (10, 20, 40, 80, 160):
            res, nd = [], []
            for q in Q:
                P.ndis = 0
                ids, _ = P.search(q, 10, ef)
                res.append(ids); nd.append(P.ndis)
            rows.append({"ef": ef, "recall10": V.r4(V.recall_at(np.array(res), GT)), "ndis": V.r4(np.mean(nd))})
        R[which]["variants"][key] = {"build_ndis": int(bnd), "unreachable": len(X) - len(seen), "rows": rows}
        print(which, key, len(X) - len(seen), [(r["ef"], r["recall10"], r["ndis"]) for r in rows], flush=True)
        V.save("variants", R)
