"""2-D pictures of real Qwen3-Embedding vectors (1,024 dims): a seeded sample of the four corpora of the running
example (SciFact abstracts, NFCorpus documents, HotpotQA paragraphs, QASPER chunks), plus six SciFact test claims
and each claim's true 10 nearest abstracts in the whole SciFact corpus. Two projections of the same points:
PCA (linear; keeps the directions of largest variance) and t-SNE (non-linear; keeps local neighbourhoods).
Distortion is measured, not assumed: share of variance PCA keeps, sklearn's trustworthiness at 10 neighbours,
and per claim, how many of its 10 true neighbours (by cosine in 1,024 dims) are among its 10 nearest points in 2-D.
Deterministic (seed 0). Writes out/proj.json."""
import os, sys; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import json
import numpy as np
from sklearn.decomposition import PCA
from sklearn.manifold import TSNE, trustworthiness
from common import L, scifact, topk, save, load_out

rng = np.random.default_rng(0)
M = "qwen3-emb-0.6b"
ids, X, qids, Q, qrels, corpus, queries = scifact(M)
S = Q @ X.T
Iex = topk(S, 10)

# six claims: the before/after claim of the index section, then five short claims whose relevant abstract is in the
# exact top 10 (seeded choice)
lists = load_out("lists.json")
pick = [qids.index(lists["qid"])]
ok = [r for r, q in enumerate(qids) if set(qrels[q]) & {ids[j] for j in Iex[r]} and len(queries[q]) < 90 and r not in pick]
pick += list(rng.choice(ok, 5, replace=False))
pick = [int(p) for p in pick]

pts, vec = [], []
def add(src, pid, text, v, kind="doc"):
    pts.append(dict(src=src, id=pid, t=text[:110], kind=kind)); vec.append(np.asarray(v, dtype=np.float32))

seen = set()
for r in pick:  # neighbours first so they are always in the sample
    for j in Iex[r]:
        if ids[j] in seen:
            continue
        seen.add(ids[j]); d = corpus[ids[j]]
        add("scifact", ids[j], d["title"] or d["text"], X[j])
for j in rng.choice(len(ids), 160, replace=False):
    if ids[j] in seen:
        continue
    seen.add(ids[j]); d = corpus[ids[j]]
    add("scifact", ids[j], d["title"] or d["text"], X[j])

nc, _, _ = L.beir("nfcorpus"); nids, NX = L.embeddings("nfcorpus", M)
for j in rng.choice(len(nids), 160, replace=False):
    d = nc[nids[j]]; add("nfcorpus", nids[j], d["title"] or d["text"], NX[j])
hq, hc = L.multihop(); hids, HX = L.embeddings("hotpotqa", M)
htext = {str(p["pid"]): p["title"] + ": " + p["text"] for p in hc}
for j in rng.choice(len(hids), 160, replace=False):
    add("hotpotqa", hids[j], htext.get(hids[j], hids[j]), HX[j])
ch = {c["cid"]: c for c in L.longdoc_chunks()}
docs, _ = L.longdoc(); ptitle = {d["paper_id"]: d["title"] for d in docs}
cids, CX = L.embeddings("qasper", M)
for j in rng.choice(len(cids), 160, replace=False):
    c = ch.get(cids[j]) or ch.get(int(cids[j]) if cids[j].isdigit() else cids[j])
    add("qasper", cids[j], (ptitle.get(c["paper_id"], "") + ": " + c["text"]) if c else cids[j], CX[j])
nq0 = len(pts)
for r in pick:
    add("claim", qids[r], queries[qids[r]], Q[r], kind="query")
V = np.stack(vec)
print("points", len(V), "of which claims", len(pick))

pca = PCA(n_components=2, random_state=0).fit(V)
P = pca.transform(V)
pca50 = PCA(n_components=50, random_state=0).fit(V)
T = TSNE(n_components=2, perplexity=30, init="pca", random_state=0, metric="cosine").fit_transform(V)

def nz(A):
    A = A - A.mean(0); return A / np.abs(A).max()

P, T = nz(P), nz(T)
tw_p = trustworthiness(V, P, n_neighbors=10, metric="cosine")
tw_t = trustworthiness(V, T, n_neighbors=10, metric="cosine")
idx = {p["id"]: i for i, p in enumerate(pts) if p["kind"] == "doc" and p["src"] == "scifact"}
claims = []
for k, r in enumerate(pick):
    qi = nq0 + k
    true = [idx[ids[j]] for j in Iex[r]]
    rel = [idx[d] for d in qrels[qids[r]] if d in idx]
    out = {}
    for nm, A in (("pca", P), ("tsne", T)):
        dd = np.linalg.norm(A[:nq0] - A[qi], axis=1)
        near = list(np.argsort(dd, kind="stable")[:10])
        out[nm] = dict(kept=len(set(near) & set(true)), near2d=[int(x) for x in near])
    claims.append(dict(i=qi, qid=qids[r], text=queries[qids[r]], true=true, cos=[round(float(S[r, j]), 4) for j in Iex[r]],
                       rel=rel, **{"kept_" + nm: out[nm]["kept"] for nm in out}, near_pca=out["pca"]["near2d"], near_tsne=out["tsne"]["near2d"]))
    print(qids[r], queries[qids[r]][:60], {nm: out[nm]["kept"] for nm in out})

# how far apart are things really? cosine of each claim to its 10th neighbour vs to a random doc of each corpus
cos_by_src = {}
for src in ("scifact", "nfcorpus", "hotpotqa", "qasper"):
    m = [i for i, p in enumerate(pts) if p["src"] == src]
    cos_by_src[src] = round(float(np.median(V[[c["i"] for c in claims]] @ V[m].T)), 4)
save("proj.json", dict(asof="2026-10-14", model=M, n=len(pts), dims=int(V.shape[1]),
                       pca_var2=round(float(pca.explained_variance_ratio_.sum()), 4),
                       pca_var50=round(float(pca50.explained_variance_ratio_.sum()), 4),
                       trust_pca=round(float(tw_p), 4), trust_tsne=round(float(tw_t), 4),
                       tsne=dict(perplexity=30, init="pca", metric="cosine", seed=0, sklearn=__import__("sklearn").__version__),
                       median_claim_cos=cos_by_src,
                       points=[dict(s={"scifact": "s", "nfcorpus": "n", "hotpotqa": "h", "qasper": "p", "claim": "c"}[p["src"]], id=p["id"], t=p["t"],
                                    p=[round(float(P[i, 0]), 3), round(float(P[i, 1]), 3)],
                                    e=[round(float(T[i, 0]), 3), round(float(T[i, 1]), 3)]) for i, p in enumerate(pts)],
                       claims=claims))
print("pca var", pca.explained_variance_ratio_.sum(), "trust", tw_p, tw_t, cos_by_src)
