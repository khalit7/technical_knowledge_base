"""Data for the HNSW lab: 240 real vectors (60 from each corpus of the running example, Qwen3-Embedding 1,024-d), built
with the port of hnswlib (pyhnsw.py) at a small M so the graph can be drawn, in three versions on the same points,
order and levels: HNSW (layers + heuristic neighbour selection, hnswlib's algorithm), the same layers with plain
"keep the M closest" selection, and a single layer (every node on layer 0) with the heuristic.
Every distance is computed in 1,024 dimensions; the 2D positions are a t-SNE map used only for drawing.
Output: ../data/hnsw_anim.json"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import json
from collections import deque

import numpy as np
from sklearn.manifold import TSNE

import pyhnsw
import vixlib as V

M, EFC, PER = int(os.environ.get("VIX_M", 5)), int(os.environ.get("VIX_EFC", 40)), 60
rng = np.random.default_rng(7)
pts, labels, snips, qv, qtext, qsrc = [], [], [], [], [], []
corpus_sf, queries_sf, _ = V.L.beir("scifact")
corpus_nf, queries_nf, _ = V.L.beir("nfcorpus")
hq, hcorp = V.L.multihop()
chunks = V.L.longdoc_chunks()
docs, questions = V.L.longdoc()
text_of = {
    "scifact": lambda i: corpus_sf[i]["title"],
    "nfcorpus": lambda i: corpus_nf[i]["title"],
    "hotpotqa": None, "qasper": None}
hmap = {str(r["pid"]): r for r in hcorp}
cmap = {r["cid"]: r for r in chunks}
qmap = {r["qid"]: r for r in questions}
hqmap = {r["qid"]: r for r in hq}


def snippet(ds, i):
    if ds == "scifact":
        s = corpus_sf[i]["title"]
    elif ds == "nfcorpus":
        s = corpus_nf[i]["title"]
    elif ds == "hotpotqa":
        s = hmap[i]["title"] + ": " + hmap[i]["text"]
    else:
        s = cmap[i]["text"]
    s = " ".join(s.split())
    return s[:90] + ("..." if len(s) > 90 else "")


QPICK = {}
for ds in ("scifact", "nfcorpus", "hotpotqa", "qasper"):
    ids, X = V.L.embeddings(ds, "qwen3-emb-0.6b")
    sel = np.sort(rng.choice(len(ids), PER, replace=False))
    for j in sel:
        pts.append(np.asarray(X[j], dtype=np.float32)); labels.append(ds); snips.append(snippet(ds, ids[j]))
    qids, QA = V.L.embeddings(ds, "qwen3-emb-0.6b", "queries")
    pool = V.test_qids(ds) if ds in ("scifact", "nfcorpus") else qids
    pos = {q: i for i, q in enumerate(qids)}
    pick = [pool[k] for k in rng.choice(len(pool), 2, replace=False)]
    for q in pick:
        qv.append(np.asarray(QA[pos[q]], dtype=np.float32)); qsrc.append(ds)
        t = {"scifact": lambda q: queries_sf[q], "nfcorpus": lambda q: queries_nf[q],
             "hotpotqa": lambda q: hqmap[q]["question"], "qasper": lambda q: qmap[q]["question"]}[ds](q)
        qtext.append(" ".join(t.split())[:140])
X = np.vstack(pts); Q = np.vstack(qv)
n = len(X)
levels = pyhnsw.random_levels(n, M, seed=11)
order = rng.permutation(n)
emb = TSNE(n_components=2, perplexity=25, random_state=0, init="pca").fit_transform(np.vstack([X, Q]))
emb = (emb - emb.min(0)) / (emb.max(0) - emb.min(0))
GT = V.exact_topk(X, Q, k=10)[0]


def reach(P):
    seen = {P.ep}; dq = deque([P.ep])
    while dq:
        u = dq.popleft()
        for v in P.links[u][0]:
            if v not in seen:
                seen.add(v); dq.append(v)
    return len(seen)


modes = {}
for key, sel, flat in (("hnsw", "heuristic", False), ("simple", "simple", False), ("flat", "heuristic", True)):
    P = pyhnsw.HNSW(X, M=M, ef_construction=EFC, select=sel, flat=flat)
    tr = []
    for i in order:
        P.add(int(i), int(levels[i]), tr)
    for t in tr:  # keep what the animation draws; the per-node expansion steps of inserts are dropped for size
        for L in t["layers"]:
            L.pop("steps", None)
            L["found"] = len(L["found"])
        for d in t["descent"]:
            d["evals"] = [e[0] for e in d["evals"]]
    if key != "hnsw":  # the other modes keep only what each insert linked to
        tr = [{"id": t["id"], "level": t["level"], "layers": [{"layer": L["layer"], "kept": L["kept"], "pruned": L["pruned"]} for L in t["layers"]]} for t in tr]
    searches = []
    for qi in range(len(Q)):
        for ef in (8,):
            P.ndis = 0
            T = {"descent": []}
            ids, ds = P.search(Q[qi], 4, ef, T)
            searches.append({"q": qi, "ef": ef, "result": ids, "ndis": P.ndis, "descent": T["descent"],
                             "steps": T["steps"], "recall4": len(set(ids) & set(GT[qi, :4].tolist())) / 4})
    modes[key] = {"select": sel, "flat": flat, "ep": P.ep, "maxlevel": P.maxlevel,
                  "links": [[list(map(int, l)) for l in P.links[i]] for i in range(n)], "build": tr, "reachable": reach(P),
                  "searches": searches,
                  "mean_recall4": V.r4(np.mean([s["recall4"] for s in searches if s["ef"] == 8])),
                  "mean_ndis": V.r4(np.mean([s["ndis"] for s in searches if s["ef"] == 8]))}
    print(key, "reachable", modes[key]["reachable"], "of", n, "recall4@ef8", modes[key]["mean_recall4"], "ndis", modes[key]["mean_ndis"],
          "")
out = {"asof": V.stamp(), "M": M, "efc": EFC, "n": n, "per_corpus": PER, "model": "Qwen3-Embedding-0.6B (1,024-d)",
       "levels": [int(x) for x in levels], "order": [int(x) for x in order],
       "xy": [[round(float(a), 4), round(float(b), 4)] for a, b in emb[:n]], "qxy": [[round(float(a), 4), round(float(b), 4)] for a, b in emb[n:]],
       "src": labels, "snip": snips, "qtext": qtext, "qsrc": qsrc, "gt": GT.tolist(), "modes": modes,
       "layout": "t-SNE (scikit-learn, perplexity 25, seed 0) of the 240 points and 8 queries; for drawing only"}
for m in modes.values():  # 3 decimals are enough for captions; keeps the page smaller
    for se in m["searches"]:
        for st_ in se["steps"]:
            st_[1] = [[a, round(b, 3), c] for a, b, c in st_[1]]
        for dd in se["descent"]:
            dd["evals"] = [[a, round(b, 3)] for a, b in dd["evals"]]
json.dump(out, open(os.path.join(V.DATA, "hnsw_anim.json"), "w"), separators=(",", ":"))
print("bytes", os.path.getsize(os.path.join(V.DATA, "hnsw_anim.json")))
