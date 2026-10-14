"""Compression from the inside (deterministic, no timing): product quantization (PQ), OPQ, IVF-PQ with and without
rescoring, scalar quantization (fp16, int8, int4), binary codes, RaBitQ. ANN recall@10 against exact search,
bytes per vector (codes only, and the serialized index), reconstruction error, nDCG@10 on SciFact.
Set: SciFact with Qwen3-Embedding-0.6B (1,024-d) and the four corpora stacked (25,039 vectors).
Output: $RAG_SCRATCH/vix/out/quant.json"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import faiss
import numpy as np

import vixlib as V

faiss.omp_set_num_threads(2)
R = {"asof": V.stamp(), "faiss": faiss.__version__}


def size_of(idx):
    return int(faiss.serialize_index(idx).size)


def evaluate(name, idx, X, Q, GT, labels=None, k=100, params=None, train=True, extra=None):
    if train and not idx.is_trained:
        idx.train(X)
    if idx.ntotal == 0:
        idx.add(X)
    D, I = idx.search(Q, k) if params is None else idx.search(Q, k, params=params)
    r = {"name": name, "recall10": V.r4(V.recall_at(I, GT)), "recall10_at100": V.r4(np.mean([len(set(I[i, :100]) & set(GT[i, :10])) / 10 for i in range(len(Q))])),
         "index_bytes": size_of(idx), "bytes_per_vector": V.r4(size_of(idx) / len(X))}
    if labels:
        r.update({k_: V.r4(v) for k_, v in V.ndcg_run(I, D, *labels).items()})
    if extra:
        r.update(extra)
    print(r)
    return r


def rescore(name, idx, X, Q, GT, labels, kf, extra):
    """Rescoring: take the index's top 10 x kf by approximate distance, re-rank them with the float32 vectors."""
    _, I = idx.search(Q, 10 * kf)
    S = np.einsum("qd,qkd->qk", Q, X[np.maximum(I, 0)])
    S[I < 0] = -9
    o = np.argsort(-S, axis=1)[:, :10]
    I2 = np.take_along_axis(I, o, 1); D2 = np.take_along_axis(S, o, 1)
    r = {"name": name, "recall10": V.r4(V.recall_at(I2, GT)), "bytes_per_vector": V.r4(size_of(idx) / len(X))}
    if labels:
        r.update({k_: V.r4(v) for k_, v in V.ndcg_run(I2, D2, *labels).items()})
    r.update(extra)
    print(r)
    return r


def pq_mse(pq, X):
    codes = pq.compute_codes(X)
    Y = pq.decode(codes)
    return V.r4(np.mean(np.sum((X - Y) ** 2, axis=1)))


for setname in ("scifact", "all4"):
    if setname == "scifact":
        X, Q, ids, tq, qrels = V.beir_set("scifact", "qwen3-emb-0.6b")
        labels = (ids, tq, qrels)
    else:
        X, Q, _, _ = V.all4_set()
        labels = None
    n, d = X.shape
    GT, _ = V.exact_topk(X, Q)
    out = {"n": n, "d": d, "queries": len(Q), "float32_bytes_per_vector": 4 * d, "rows": []}
    rows = out["rows"]
    rows.append(evaluate("Flat (exact float32)", faiss.IndexFlatIP(d), X, Q, GT, labels, extra={"family": "flat", "code_bytes": 4 * d}))
    # scalar quantization
    for nm, qt, cb in (("fp16", faiss.ScalarQuantizer.QT_fp16, 2 * d), ("int8 (SQ8)", faiss.ScalarQuantizer.QT_8bit, d),
                       ("int4 (SQ4)", faiss.ScalarQuantizer.QT_4bit, d // 2)):
        rows.append(evaluate("Scalar " + nm, faiss.IndexScalarQuantizer(d, qt, faiss.METRIC_INNER_PRODUCT), X, Q, GT, labels,
                             extra={"family": "sq", "code_bytes": cb}))
    # binary: sign bits, Hamming distance, then rescoring with the float vectors
    B = np.packbits((X > 0).astype(np.uint8), axis=1)
    QB = np.packbits((Q > 0).astype(np.uint8), axis=1)
    bi = faiss.IndexBinaryFlat(d)
    bi.add(B)
    for kc in (10, 40, 100, 400, 1000):
        _, I = bi.search(QB, kc)
        S = np.einsum("qd,qkd->qk", Q, X[I])
        o = np.argsort(-S, axis=1)
        I2 = np.take_along_axis(I, o, 1)[:, :10]
        r = {"name": "Binary (1 bit), rescore %d" % kc if kc > 10 else "Binary (1 bit), no rescoring", "family": "binary",
             "candidates": kc, "recall10": V.r4(V.recall_at(I2, GT)), "code_bytes": d // 8, "bytes_per_vector": d / 8}
        rows.append(r); print(r)
    # product quantization: m sub-vectors of d/m dims, 256 centroids each (8 bits)
    for m in (8, 16, 32, 64, 128, 256):
        pq = faiss.IndexPQ(d, m, 8, faiss.METRIC_INNER_PRODUCT)
        pq.pq.cp.seed = 1234
        r = evaluate("PQ m=%d" % m, pq, X, Q, GT, labels, extra={"family": "pq", "m": m, "code_bytes": m, "codebook_bytes": 256 * d * 4})
        r["mse"] = pq_mse(pq.pq, X)
        rows.append(r)
        # rescoring: PQ shortlist of 10 x k, then exact float32 re-ranking (IndexRefineFlat)
        for kf in (4, 10, 40):
            rr = rescore("PQ m=%d + rescore x%d" % (m, kf), pq, X, Q, GT, labels, kf,
                          {"family": "pq+rescore", "m": m, "k_factor": kf, "code_bytes": m})
            rows.append(rr)
        # OPQ: learn a rotation first so each sub-vector carries a balanced share of the variance
        if m in (16, 32, 64):
            opq = faiss.index_factory(d, "OPQ%d,PQ%d" % (m, m), faiss.METRIC_INNER_PRODUCT)
            r = evaluate("OPQ m=%d" % m, opq, X, Q, GT, labels, extra={"family": "opq", "m": m, "code_bytes": m})
            rows.append(r)
    # IVF-PQ (residuals), nlist sqrt(n), nprobe sweep, with and without rescoring
    nl = int(round(np.sqrt(n)))
    for m in (32, 64):
        ivfpq = faiss.IndexIVFPQ(faiss.IndexFlatIP(d), d, nl, m, 8, faiss.METRIC_INNER_PRODUCT)
        ivfpq.cp.seed = 1234
        ivfpq.train(X); ivfpq.add(X)
        for p in (1, 4, 8, 16, 32):
            ivfpq.nprobe = p
            rows.append(evaluate("IVF%d,PQ%d nprobe %d" % (nl, m, p), ivfpq, X, Q, GT, labels, train=False,
                                 extra={"family": "ivfpq", "m": m, "nlist": nl, "nprobe": p, "code_bytes": m}))
            rows.append(rescore("IVF%d,PQ%d nprobe %d + rescore x10" % (nl, m, p), ivfpq, X, Q, GT, labels, 10,
                                 {"family": "ivfpq+rescore", "m": m, "nlist": nl, "nprobe": p, "k_factor": 10, "code_bytes": m}))
    # RaBitQ (Gao and Long, SIGMOD 2024): 1 bit per dimension plus a few floats, with an unbiased distance estimator
    try:
        rq = faiss.IndexRaBitQ(d, faiss.METRIC_INNER_PRODUCT)
        rows.append(evaluate("RaBitQ (1 bit)", rq, X, Q, GT, labels, extra={"family": "rabitq", "code_bytes": d // 8 + 8}))
        rows.append(rescore("RaBitQ + rescore x10", rq, X, Q, GT, labels, 10, {"family": "rabitq+rescore", "code_bytes": d // 8 + 8}))
    except Exception as e:  # noqa: BLE001
        out["rabitq_error"] = str(e)
    R[setname] = out

V.save("quant", R)
