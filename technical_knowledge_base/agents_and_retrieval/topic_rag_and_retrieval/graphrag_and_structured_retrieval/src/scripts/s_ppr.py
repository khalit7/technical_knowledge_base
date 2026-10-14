"""Graph retrieval on the multi-hop set without any LLM call: Personalized PageRank (HippoRAG-style) over graphs built
from the corpus by NLP (graphrag 3.3.0's noun-phrase extractor, s_nlp_extract.py) or by title mentions, against
BM25 and dense retrieval on the root's 200 HotpotQA questions over 9,760 paragraphs. Deterministic, CPU only.

Dense = bge-small-en-v1.5 (the setup's precomputed vectors; Qwen3-Embedding declares HotpotQA in its training data).
Phrase linking for HippoRAG-style seeds uses the same bge-small model on the CPU (phrase vectors cached in $RAG_SCRATCH/gr).

Systems (all rank the 9,760 paragraphs):
  bm25, dense                     the setup's runs / vectors
  ppr_phrase                      HippoRAG 1 shape: phrase graph (co-occurrence in a paragraph + synonymy edges),
                                  reset on the question's phrases weighted by node specificity 1/|paragraphs|,
                                  damping 0.5, paragraph score = sum of its phrases' probabilities
  ppr_bipartite_dense             HippoRAG 2 shape: paragraphs are nodes too (paragraph-phrase edges), reset = phrase
                                  seeds + paragraph nodes weighted by dense score x 0.05, rank paragraph nodes
  ppr_title_dense                 paragraph graph from title mentions (paragraph i mentions the title of j), reset on the
                                  dense top 10 scores, damping 0.5
  expand_title                    dense top 2, then paragraphs linked to them by a title mention, by dense score
usage: python -I -B s_ppr.py [encode]
"""
import json
import os
import re
import sys
import time
from collections import defaultdict

import numpy as np
import scipy.sparse as sp

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from grlib import L, both_at, hotpot, normalize_answer, r3, save, work  # noqa: E402

KS = (1, 2, 3, 5, 10, 20)
qs, corpus, by = hotpot()
pids = [p["pid"] for p in corpus]
pidx = {p: i for i, p in enumerate(pids)}
NP = json.load(open(work("nlp_phrases.json")))
PH, QPH = NP["phrases"], NP["question_phrases"]

# ---------------------------------------------------------------- dense and bm25
cids, X = L.embeddings("hotpotqa", "bge-small")
assert list(cids) == pids
qids, Q = L.embeddings("hotpotqa", "bge-small", "queries")
qrow = {q: i for i, q in enumerate(qids)}
X = np.asarray(X)
DENSE = {q["qid"]: X @ np.asarray(Q[qrow[q["qid"]]]) for q in qs}
BM = L.run("hotpotqa", "bm25")


def rank(scores):
    return [pids[j] for j in np.argsort(-scores, kind="stable")[:100]]


# ---------------------------------------------------------------- phrase graph
phr = sorted({x for v in PH.values() for x in v})
fidx = {x: i for i, x in enumerate(phr)}
rows, cols = [], []
for p, v in PH.items():
    for x in v:
        rows.append(pidx[p]); cols.append(fidx[x])
M = sp.csr_matrix((np.ones(len(rows)), (rows, cols)), shape=(len(pids), len(phr)))  # paragraphs x phrases
df = np.asarray(M.sum(0)).ravel()  # paragraphs per phrase


def bge_phrases():
    f = work("phrase_bge.npy")
    if os.path.exists(f):
        return np.load(f)
    enc = L.encoder("bge-small", device="cpu")
    t = time.time()
    V = enc.encode([x.lower() for x in phr], batch_size=256, normalize_embeddings=True, show_progress_bar=False).astype(np.float32)
    np.save(f, V)
    print("encoded", len(phr), "phrases on CPU in", round(time.time() - t), "s")
    return V


if len(sys.argv) > 1 and sys.argv[1] == "encode":
    bge_phrases(); sys.exit()

V = bge_phrases()
enc_q = None


def qphrase_vecs(texts):
    global enc_q
    if enc_q is None:
        enc_q = L.encoder("bge-small", device="cpu")
    return enc_q.encode([t.lower() for t in texts], normalize_embeddings=True, show_progress_bar=False)


# synonymy edges (HippoRAG: phrase pairs whose retrieval-encoder cosine is above a threshold, among the top k neighbours)
def synonym_edges(thr=0.8, k=10):
    f = work("syn_%g_%d.npy" % (thr, k))
    if os.path.exists(f):
        return np.load(f)
    e = []
    for s in range(0, len(phr), 4096):  # exact top k + 1 by blocks (numpy; faiss and torch clash on libomp here)
        Sb = V[s:s + 4096] @ V.T
        I = np.argpartition(-Sb, k + 1, axis=1)[:, :k + 1]
        for r_, row in enumerate(I):
            i = s + r_
            for j in row:
                d = float(Sb[r_, j])
                if j != i and d >= thr and i < j:
                    e.append((i, int(j), d))
    e = np.array(e, dtype=np.float64).reshape(-1, 3)
    np.save(f, e)
    return e


SYN = synonym_edges()
C = (M.T @ M).tocsr()  # phrase co-occurrence counts
C.setdiag(0); C.eliminate_zeros()
A_phrase = C.copy().astype(np.float64)
A_phrase.data[:] = 1.0  # HippoRAG 1 relation edges are unweighted; co-occurrence stands in for OpenIE triples here
S_syn = sp.csr_matrix((np.ones(len(SYN)), (SYN[:, 0].astype(int), SYN[:, 1].astype(int))), shape=A_phrase.shape)
A_phrase = A_phrase + S_syn + S_syn.T


def ppr(A, reset, d=0.5, iters=60):
    """personalised PageRank by power iteration: p = (1-d) r + d W p, W column-stochastic (dangling mass to r)"""
    deg = np.asarray(A.sum(0)).ravel()
    inv = np.divide(1.0, deg, out=np.zeros_like(deg), where=deg > 0)
    W = A @ sp.diags(inv)
    r = reset / reset.sum()
    p = r.copy()
    for _ in range(iters):
        dang = p[deg == 0].sum()
        p = (1 - d) * r + d * (W @ p) + d * dang * r
    return p


def link(q):
    """question phrases -> graph phrase nodes: exact match, else the nearest node by bge-small cosine (HippoRAG links
    each query entity to its most similar node)"""
    out = []
    qp = QPH[q["qid"]]
    miss = [x for x in qp if x not in fidx]
    out += [(x, fidx[x], 1.0) for x in qp if x in fidx]
    if miss:
        W_ = qphrase_vecs(miss) @ V.T
        for x, row in zip(miss, W_):
            j = int(np.argmax(row)); out.append((x, j, float(row[j])))
    return out


# ---------------------------------------------------------------- title-mention graph (paragraph -> paragraph)
def title_key(t):
    return normalize_answer(re.sub(r"\(.*?\)", "", t))


tk = {p: title_key(by[p]["title"]) for p in pids}
tk_ok = {p: k for p, k in tk.items() if len(k) >= 6 or len(k.split()) >= 2}
by_key = defaultdict(list)
for p, k in tk_ok.items():
    by_key[k].append(p)
keys = sorted(by_key, key=len, reverse=True)
pat = re.compile(r"\b(" + "|".join(re.escape(k) for k in keys) + r")\b")
tr, tc = [], []
for p in pids:
    body = " " + normalize_answer(by[p]["text"]) + " "
    for k in set(pat.findall(body)):
        for j in by_key[k]:
            if j != p:
                tr.append(pidx[p]); tc.append(pidx[j])
A_title = sp.csr_matrix((np.ones(len(tr)), (tr, tc)), shape=(len(pids), len(pids)))
A_title.data[:] = 1.0
A_title_u = ((A_title + A_title.T) > 0).astype(np.float64)

# bipartite paragraph + phrase graph (HippoRAG 2 shape)
nP, nF = len(pids), len(phr)
B = sp.bmat([[None, M], [M.T, A_phrase]]).tocsr().astype(np.float64)
# the same with hub phrases removed (phrases in more than HUB paragraphs, e.g. month names), like graphrag's prune_graph
HUB = 20
keep = sp.diags((df <= HUB).astype(np.float64))
Mp = M @ keep
Ap = keep @ A_phrase @ keep
Bp = sp.bmat([[None, Mp], [Mp.T, Ap]]).tocsr().astype(np.float64)


def systems(q):
    qid, gold = q["qid"], q["gold_pids"]
    dense = DENSE[qid]
    out = {"bm25": list(BM[qid].keys()), "dense": rank(dense)}
    rr = defaultdict(float)  # hybrid: reciprocal rank fusion of BM25 and dense top 100, k = 60 (Cormack et al. 2009)
    for lst in (out["bm25"], out["dense"]):
        for i, x in enumerate(lst):
            rr[x] += 1.0 / (60 + i + 1)
    out["hybrid"] = sorted(rr, key=lambda x: -rr[x])
    L_ = link(q)
    r = np.zeros(nF)
    for _, j, _w in L_:
        r[j] += 1.0 / max(df[j], 1)  # node specificity
    if r.sum() == 0:
        out["ppr_phrase"] = out["dense"]
    else:
        p = ppr(A_phrase, r)
        out["ppr_phrase"] = rank(M @ p + 1e-9 * dense)
    rb = np.zeros(nP + nF)
    rb[nP:] = r / r.sum() if r.sum() else 0
    dn = np.clip(dense, 0, None)
    rb[:nP] += 0.05 * dn / dn.sum()
    pb = ppr(B, rb)
    out["ppr_bipartite_dense"] = rank(pb[:nP])
    rbp = rb.copy(); rbp[nP:][df > HUB] = 0
    if rbp[nP:].sum():
        rbp[nP:] /= rbp[nP:].sum()
    out["ppr_bipartite_pruned"] = rank(ppr(Bp, rbp)[:nP])
    top = np.argsort(-dense)[:10]
    rt = np.zeros(nP); rt[top] = dense[top]
    pt = ppr(A_title_u, rt)
    out["ppr_title_dense"] = rank(pt + 1e-6 * dense)
    seeds = out["dense"][:2]
    nb = set()
    for s in seeds:
        nb |= set(np.nonzero(A_title_u[pidx[s]])[1].tolist())
    exp = sorted((pids[j] for j in nb if pids[j] not in seeds), key=lambda x: -dense[pidx[x]])
    rest = [x for x in out["dense"] if x not in seeds and x not in exp]
    out["expand_title"] = seeds + exp + rest
    return out, L_


def main():
    names = ["bm25", "dense", "hybrid", "ppr_phrase", "ppr_bipartite_dense", "ppr_bipartite_pruned", "ppr_title_dense", "expand_title"]
    res = {n: {"both": {k: 0 for k in KS}, "by_type": {"bridge": {k: 0 for k in KS}, "comparison": {k: 0 for k in KS}}} for n in names}
    perq, ex = {}, []
    linked_exact = linked_total = 0
    for q in qs:
        out, L_ = systems(q)
        linked_total += len(L_); linked_exact += sum(1 for x, j, w in L_ if w == 1.0 and phr[j] == x)
        perq[q["qid"]] = {}
        for n in names:
            b = both_at(out[n], q["gold_pids"], KS)
            perq[q["qid"]][n] = b
            for k in KS:
                res[n]["both"][k] += b[k]; res[n]["by_type"][q["type"]][k] += b[k]
        perq[q["qid"]]["_top5"] = {n: out[n][:5] for n in names}
        perq[q["qid"]]["_link"] = [[x, phr[j], round(w, 3)] for x, j, w in L_]
    # paired wins / losses against dense at k = 5
    wl = {n: {"win": sum(1 for v in perq.values() if v[n][5] and not v["dense"][5]),
              "loss": sum(1 for v in perq.values() if v["dense"][5] and not v[n][5])} for n in names}
    meta = {"paragraphs": nP, "phrases": nF, "phrase_cooc_edges": int(C.nnz // 2), "synonym_edges": int(len(SYN)),
            "hub_cutoff": HUB, "hub_phrases": int((df > HUB).sum()), "title_edges_directed": int(A_title.nnz), "paragraphs_with_title_link_out": int((np.asarray(A_title.sum(1)).ravel() > 0).sum()),
            "question_phrases": linked_total, "question_phrases_exact": linked_exact, "n_q": len(qs)}
    save("ppr.json", {"meta": meta, "systems": res, "wins_vs_dense_at5": wl})
    json.dump(perq, open(work("ppr_perq.json"), "w"))
    for n in names:
        print("%-22s both@2 %3d @5 %3d @10 %3d  (bridge @5 %3d)  win/loss vs dense @5 %d/%d" % (
            n, res[n]["both"][2], res[n]["both"][5], res[n]["both"][10], res[n]["by_type"]["bridge"][5], wl[n]["win"], wl[n]["loss"]))
    print(meta)


if __name__ == "__main__":
    main()
