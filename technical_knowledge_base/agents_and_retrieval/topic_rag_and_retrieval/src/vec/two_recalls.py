"""The two recalls on the same 300 SciFact test claims (Qwen3-Embedding, 1,024 dims), plus the before/after lists.
ANN recall@10  = share of the exact top 10 that the index returns (needs no labels).
Retrieval recall@10 = share of the relevant abstracts (qrels) in the returned top 10 (needs labels).
Deterministic: FAISS 1.15.1 on CPU, one thread for builds (so the HNSW graph is reproducible), fixed k-means seed.
Writes out/two_recalls.json (sweeps + per-query values for the in-page grid) and out/lists.json (one claim, three indexes)."""
import os, sys; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
import faiss
from common import scifact, topk, to_run, evaluate, per_query, ann_recall, save

faiss.omp_set_num_threads(1)
ids, X, qids, Q, qrels, corpus, queries = scifact("qwen3-emb-0.6b")
n, d = X.shape
S = Q @ X.T
Iex = topk(S, 100)


def metrics(I, D=None):
    run = to_run(qids, ids, I, None)
    m = evaluate(run, qrels)
    pq_ret = per_query(run, qrels, "recall.10")
    pq_ann = [len(set(a[:10]) & set(b[:10])) / 10 for a, b in zip(I, Iex)]
    return m, pq_ret, pq_ann


def row(family, label, params, I, keep=False, ndis=None):
    I = np.asarray(I)
    # -1 = fewer than k results (IVF at nprobe 1 can return a short list); to_run drops them
    m, pr, pa = metrics(I)
    r = dict(family=family, label=label, params=params, ann_recall10=round(float(np.mean(pa)), 4),
             recall10=round(m["recall@10"], 4), ndcg10=round(m["ndcg@10"], 4), recall100=round(m["recall@100"], 4))
    if ndis is not None:
        r["ndis_per_query"] = ndis
    if keep:
        r["per_query"] = dict(ann=[round(x, 1) for x in pa], ret=[round(pr[q], 4) for q in qids])
    print(label, r["ann_recall10"], r["recall10"], r["ndcg10"], flush=True)
    return r


rows = [row("flat", "Exact (flat)", {}, Iex, keep=True)]

# HNSW (FAISS defaults: M 32, efConstruction 40). FAISS searches with max(efSearch, k), so the lists are cut at
# k = 10 for efSearch < 100 (recall@100 is not defined there).
h = faiss.IndexHNSWFlat(d, 32, faiss.METRIC_INNER_PRODUCT)
h.add(X)
for ef in (8, 16, 32, 64, 128, 256):
    h.hnsw.efSearch = ef
    st = faiss.cvar.hnsw_stats; st.reset()
    _, I = h.search(Q, 100 if ef >= 100 else 10)
    nd = round(st.ndis / len(Q))
    rr = row("hnsw", "HNSW M32 efSearch %d" % ef, dict(M=32, efConstruction=40, efSearch=ef), I, keep=ef in (8, 16, 64), ndis=nd)
    if ef < 100:
        rr["recall100"] = None
    rows.append(rr)

# IVF-Flat and IVF-PQ (nlist 72 = about sqrt(n), the FAISS rule of thumb used in the child page)
qz = faiss.IndexFlatIP(d)
ivf = faiss.IndexIVFFlat(qz, d, 72, faiss.METRIC_INNER_PRODUCT)
ivf.train(X); ivf.add(X)
for npb in (1, 2, 4, 8, 16, 32):
    ivf.nprobe = npb
    _, I = ivf.search(Q, 100)
    rows.append(row("ivf", "IVF72 nprobe %d" % npb, dict(nlist=72, nprobe=npb), I, keep=npb in (1, 8)))

qz2 = faiss.IndexFlatIP(d)
ivfpq = faiss.IndexIVFPQ(qz2, d, 72, 32, 8, faiss.METRIC_INNER_PRODUCT)
ivfpq.train(X); ivfpq.add(X)
for npb in (1, 4, 8, 32):
    ivfpq.nprobe = npb
    _, I = ivfpq.search(Q, 100)
    rows.append(row("ivfpq", "IVF72,PQ32 nprobe %d" % npb, dict(nlist=72, m=32, nbits=8, nprobe=npb), I, keep=npb == 4))
    # rescoring the 100 candidates with the float vectors
    fs = np.einsum("qd,qrd->qr", Q, X[np.maximum(I, 0)])
    fs[I < 0] = -9
    o = np.argsort(-fs, 1, kind="stable")
    rows.append(row("ivfpq+rescore", "IVF72,PQ32 nprobe %d + rescore 100" % npb, dict(nlist=72, m=32, nbits=8, nprobe=npb, rescore=100), np.take_along_axis(I, o, 1)))

save("two_recalls.json", dict(asof="2026-10-14", faiss=faiss.__version__, set="scifact test", n=n, d=d,
                              queries=len(qids), qids=qids, rows=rows))

# ---- the before/after lists: pick the claim that shows the most (exact finds the relevant abstract in its top 10,
# HNSW at efSearch 16 keeps it, IVF-PQ at nprobe 4 loses it, and both lists differ from exact)
h.hnsw.efSearch = 16
_, Ih = h.search(Q, 10)
ivfpq.nprobe = 4
Dp, Ip = ivfpq.search(Q, 10)
cands = []
for r, q in enumerate(qids):
    rel = set(qrels[q])
    ex = [ids[j] for j in Iex[r, :10]]; hn = [ids[j] for j in Ih[r]]; pq = [ids[j] for j in Ip[r]]
    if rel & set(ex[:3]) and rel & set(hn) and not rel & set(pq):
        diff_h = 10 - len(set(ex) & set(hn)); diff_p = 10 - len(set(ex) & set(pq))
        if diff_h >= 1:
            cands.append((diff_h, diff_p, len(queries[q]), r))
cands.sort(key=lambda c: (-min(c[0], 3), -c[1], c[2]))
print("candidates", len(cands), cands[:5])
r = cands[0][3]; q = qids[r]


def short(did):
    t = corpus[did]["title"] or corpus[did]["text"][:90]
    return t


def lst(I, scores):
    return [dict(id=ids[j], title=short(ids[j]), exact_rank=int(np.where(Iex[r] == j)[0][0]) + 1 if j in Iex[r] else None,
                 cos=round(float(S[r, j]), 4), score=round(float(s), 4), rel=ids[j] in qrels[q]) for j, s in zip(I, scores)]


ex_idx = Iex[r, :10]
out = dict(asof="2026-10-14", qid=q, claim=queries[q], relevant=list(qrels[q]),
           exact=lst(ex_idx, S[r, ex_idx]),
           hnsw=dict(params="M 32, efConstruction 40, efSearch 16 (FAISS defaults)", list=lst(Ih[r], S[r, Ih[r]])),
           ivfpq=dict(params="IVF72,PQ32 (32 bytes per vector), nprobe 4", list=lst(Ip[r], Dp[r]),
                      note="score = the PQ estimate of the inner product; cos = the true cosine"),
           exact_rank_of_11th=round(float(S[r, Iex[r, 10]]), 4))
# where did IVF-PQ lose the relevant abstract? the cell ranks
qz2_D, qz2_I = qz2.search(Q[r:r + 1], 72)
lists = faiss.extract_index_ivf(ivfpq).invlists
cell_of = {}
for c in range(72):
    sz = lists.list_size(c)
    if sz:
        arr = faiss.rev_swig_ptr(lists.get_ids(c), sz).copy()
        for j in arr:
            cell_of[int(j)] = c
rank_of_cell = {int(c): k + 1 for k, c in enumerate(qz2_I[0])}
for did in qrels[q]:
    j = ids.index(did)
    out.setdefault("relevant_cells", []).append(dict(id=did, cell_rank=rank_of_cell[cell_of[j]], exact_rank=int(np.where(np.argsort(-S[r], kind="stable") == j)[0][0]) + 1))
save("lists.json", out)
