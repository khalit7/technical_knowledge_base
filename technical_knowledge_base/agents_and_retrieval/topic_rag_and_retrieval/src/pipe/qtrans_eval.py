"""Query transformation, retrieval step: embed what qtrans_gen.py wrote and measure on SciFact test.
usage: python -I -B qtrans_eval.py <embedding model key>   (MPS for the embedding; hold the bench lock)
Variants: original claim; HyDE passage alone (embedded as a document); HyDE passage + claim (mean of the two
vectors, renormalised); multi-query (RRF k 60 over the original and the three rewordings). BM25 gets the same
variants as text (HyDE: claim and passage concatenated). Conversations: the follow-up alone, the whole chat
concatenated, and the generator's rewrite; reported as the rank of the claim's relevant abstract.
Output: out/qtrans.json (one block per model, plus bm25)."""
import os, sys; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import json
import numpy as np
from common import L, work, save, per_query, mean, r3, OUT
import fusion as F

model = sys.argv[1]
G = json.load(open(work("qtrans_gen.json")))
corpus, queries, qrels = L.beir("scifact")
qt = sorted(qrels["test"])
M = ("ndcg_cut.10", "recall.10", "recall.100")
outp = os.path.join(OUT, "qtrans.json")
res = json.load(open(outp)) if os.path.exists(outp) else {}


def summ(run):
    pq = per_query(run, qrels["test"], M)
    return {"ndcg10": r3(mean(pq, M[0])), "r10": r3(mean(pq, M[1])), "r100": r3(mean(pq, M[2]))}, pq


def gold_rank(lst, qid):
    rel = qrels["test"][qid]
    for i, d in enumerate(lst):
        if d in rel:
            return i + 1
    return None


R = {}
if model == "bm25":
    import bm25s, Stemmer
    stem = Stemmer.Stemmer("english")
    dids = list(corpus)
    ret = bm25s.BM25(method="lucene", k1=1.2, b=0.75)
    ret.index(bm25s.tokenize([L.doc_text(corpus[d]) for d in dids], stopwords="en", stemmer=stem, show_progress=False), show_progress=False)

    def search(texts, k=100):
        res_, sc = ret.retrieve(bm25s.tokenize(texts, stopwords="en", stemmer=stem, show_progress=False), k=k, show_progress=False, n_threads=1)
        return [{dids[res_[i, j]]: float(sc[i, j]) for j in range(res_.shape[1])} for i in range(len(texts))]
    base = dict(zip(qt, search([queries[q] for q in qt])))
    hyde = dict(zip(qt, search([queries[q] + " " + G["hyde"][q] for q in qt])))
    mq_lists = {q: [base[q]] + search(G["mq"][q]) if G["mq"][q] else [base[q]] for q in qt}
    conv_s = lambda texts: [list(r) for r in search(texts)]
    R["original"], pq0 = summ(base)
    R["hyde+claim"], pq1 = summ(hyde)
else:
    enc = L.encoder(model)
    ids, X = L.embeddings("scifact", model); X = np.asarray(X)
    pref = L.query_prefix(model, "scifact")
    qall, Q = L.embeddings("scifact", model, "queries"); pos = {q: i for i, q in enumerate(qall)}
    Qv = np.stack([np.asarray(Q[pos[q]]) for q in qt])

    def top(v, k=100):
        s = X @ v
        t = np.argpartition(-s, k)[:k]; t = t[np.argsort(-s[t])]
        return {ids[j]: float(s[j]) for j in t}
    H = enc.encode([G["hyde"][q] for q in qt], batch_size=16, normalize_embeddings=True)
    HQ = H + Qv; HQ /= np.linalg.norm(HQ, axis=1, keepdims=True)
    flat = [(q, t) for q in qt for t in G["mq"][q]]
    MV = enc.encode([t for _, t in flat], prompt=pref, batch_size=32, normalize_embeddings=True)
    base = {q: top(Qv[i]) for i, q in enumerate(qt)}
    R["original"], pq0 = summ(base)
    R["hyde"], _ = summ({q: top(H[i]) for i, q in enumerate(qt)})
    R["hyde+claim"], pq1 = summ({q: top(HQ[i]) for i, q in enumerate(qt)})
    mq_lists = {q: [base[q]] for q in qt}
    for (q, _), v in zip(flat, MV):
        mq_lists[q].append(top(v))
    conv_s = lambda texts: [list(top(v)) for v in enc.encode(texts, prompt=pref, batch_size=8, normalize_embeddings=True)]
mq = {q: F.top(F.rrf([list(l) for l in mq_lists[q]], 60)) for q in qt}
R["multi-query"], pq2 = summ(mq)
R["mq_lines_mean"] = r3(np.mean([len(G["mq"][q]) for q in qt]))
for name, pq in (("hyde+claim", pq1), ("multi-query", pq2)):
    d = [pq[q][M[0]] - pq0[q][M[0]] for q in qt]
    R[name]["up"] = sum(x > 1e-9 for x in d); R[name]["down"] = sum(x < -1e-9 for x in d)
conv = []
for c in G["conv"]:
    a, b, r = conv_s([c["turn2"], c["turn1"] + " " + c["turn2"], c["rewrite"]])
    o = conv_s([c["claim"]])[0]
    conv.append({"qid": c["qid"], "alone": gold_rank(a, c["qid"]), "concat": gold_rank(b, c["qid"]),
                 "rewrite": gold_rank(r, c["qid"]), "claim": gold_rank(o, c["qid"])})
R["conv"] = conv
res[model] = R
print(model, json.dumps(R))
save("qtrans.json", res)
