"""Cosine vs dot product vs L2 on real, NOT normalised vectors.
gte-modernbert-base ships without a Normalize module (its modules.json: Transformer + CLS Pooling), so
SentenceTransformer.encode returns vectors of varying length. The shared setup stored them normalised; here the
SciFact corpus and the 300 test claims are re-encoded raw (same settings as the setup: float32, 1,024 tokens,
no prompt). Step 1 (`embed`) runs the model on MPS and must hold the bench lock (about 4 minutes); step 2
(`analyse`, default) is deterministic and CPU only.
Writes $RAG_SCRATCH/vec/gte_raw_{corpus,queries}.npy and out/metric.json."""
import os, sys; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import time
import numpy as np
from common import L, scifact, scratch, topk, to_run, evaluate, save

M = "gte-modernbert"


def embed():
    corpus, queries, qrels = L.beir("scifact")
    ids, _ = L.embeddings("scifact", M)
    test = open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "data", "ids", "scifact_test_qids.txt")).read().split()
    enc = L.encoder(M)
    lb = os.getloadavg()
    t = time.time()
    C = enc.encode([L.doc_text(corpus[i]) for i in ids], batch_size=64, normalize_embeddings=False, convert_to_numpy=True, show_progress_bar=False)
    Qr = enc.encode([queries[q] for q in test], batch_size=64, normalize_embeddings=False, convert_to_numpy=True)
    dt = time.time() - t
    np.save(scratch("gte_raw_corpus.npy"), C.astype(np.float32)); np.save(scratch("gte_raw_queries.npy"), Qr.astype(np.float32))
    tok = enc.tokenizer([L.doc_text(corpus[i]) for i in ids], truncation=True, max_length=enc.max_seq_length)["input_ids"]
    np.save(scratch("gte_doc_tokens.npy"), np.array([len(x) for x in tok]))
    print("embedded", C.shape, Qr.shape, "in %.1f s" % dt, "load", lb, "->", os.getloadavg())


def analyse():
    ids, Xn, qids, Qn, qrels, corpus, queries = scifact(M)
    C = np.load(scratch("gte_raw_corpus.npy")); Qr = np.load(scratch("gte_raw_queries.npy"))
    ntok = np.load(scratch("gte_doc_tokens.npy"))
    cn, qn = np.linalg.norm(C, axis=1), np.linalg.norm(Qr, axis=1)
    # check: raw / length == the setup's stored normalised vectors
    agree = float(np.min(np.einsum("nd,nd->n", C / cn[:, None], Xn)))
    dot = Qr @ C.T
    cos = dot / qn[:, None] / cn[None, :]
    l2 = -(qn[:, None] ** 2 + cn[None, :] ** 2 - 2 * dot)  # minus squared distance: larger = closer
    res = {}
    tops = {}
    for nm, Sx in (("cosine", cos), ("dot", dot), ("l2", l2)):
        I = topk(Sx, 100)
        tops[nm] = I
        m = evaluate(to_run(qids, ids, I, np.take_along_axis(Sx, I, 1)), qrels)
        res[nm] = {k: round(v, 4) for k, v in m.items()}
        res[nm]["mean_norm_top10"] = round(float(cn[I[:, :10]].mean()), 3)
    ov = lambda a, b: round(float(np.mean([len(set(x[:10]) & set(y[:10])) / 10 for x, y in zip(tops[a], tops[b])])), 4)
    # after normalising, the three agree exactly
    Cn, Qnn = C / cn[:, None], Qr / qn[:, None]
    d2 = Qnn @ Cn.T
    l2n = -(2 - 2 * d2)
    same = bool((topk(d2, 10) == topk(l2n, 10)).all())
    # one claim to show: the largest disagreement between dot and cosine top 5 among claims whose relevant doc is in cosine top 5
    best, br = -1, 0
    for r, q in enumerate(qids):
        rel = set(qrels[q])
        c5 = [ids[j] for j in tops["cosine"][r, :5]]; d5 = [ids[j] for j in tops["dot"][r, :5]]
        if rel & set(c5) and not rel & set(d5) and len(queries[q]) < 100:
            diff = 5 - len(set(c5) & set(d5))
            if diff > best:
                best, br = diff, r
    r = br; q = qids[r]
    def lst(nm):
        return [dict(id=ids[j], title=(corpus[ids[j]]["title"] or corpus[ids[j]]["text"])[:90], norm=round(float(cn[j]), 3),
                     tokens=int(ntok[j]), cos=round(float(cos[r, j]), 4), dot=round(float(dot[r, j]), 3),
                     l2=round(float(np.sqrt(-l2[r, j])), 3), rel=ids[j] in qrels[q]) for j in tops[nm][r, :5]]
    corr = float(np.corrcoef(cn, ntok)[0, 1])
    hist = np.histogram(cn, bins=24)
    out = dict(asof="2026-10-14", model=M, note="raw vectors (no normalisation), SciFact test, 300 claims",
               stored_vs_raw_min_cos=round(agree, 6),
               norms=dict(doc_min=round(float(cn.min()), 3), doc_median=round(float(np.median(cn)), 3), doc_max=round(float(cn.max()), 3),
                          query_min=round(float(qn.min()), 3), query_median=round(float(np.median(qn)), 3), query_max=round(float(qn.max()), 3),
                          corr_norm_tokens=round(corr, 3), hist_counts=[int(x) for x in hist[0]], hist_edges=[round(float(x), 3) for x in hist[1]]),
               metrics=res, overlap10=dict(cos_dot=ov("cosine", "dot"), cos_l2=ov("cosine", "l2"), dot_l2=ov("dot", "l2")),
               normalised_all_same_top10=same,
               example=dict(qid=q, claim=queries[q], qnorm=round(float(qn[r]), 3), relevant=list(qrels[q]),
                            cosine=lst("cosine"), dot=lst("dot"), l2=lst("l2")))
    save("metric.json", out)
    print(res, out["overlap10"], out["norms"]["doc_median"], corr, agree, same)


if __name__ == "__main__":
    embed() if sys.argv[1:] == ["embed"] else analyse()
