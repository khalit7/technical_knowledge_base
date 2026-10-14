"""Learned sparse retrieval, run here: opensearch-project/opensearch-neural-sparse-encoding-doc-v3-distill
(67 M DistilBERT-size MLM head, Apache 2.0; revision in SETUP.md), through sentence-transformers' SparseEncoder.
Documents: the model writes a weight for every vocabulary entry (30,522) and keeps the non-zero ones (expansion:
words the text does not contain get weights too). Queries: "inference-free": a tokenizer plus a fixed IDF weight
table, no model call. Score = inner product. NOTE: the model card lists SciFact, NFCorpus and HotpotQA among the
training sets, so these numbers are in-domain, not zero-shot.
MPS for the corpus: hold the bench lock. Output: out/sparse.json"""
import os, sys; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import time
import numpy as np
import scipy.sparse as sp
import rp
from fusion_deep import fuse

L, PC = rp.L, rp.PC
MD = L.path("models", "opensearch-sparse-doc-v3-distill")


def to_csr(t):
    t = t.coalesce().cpu()
    idx = t.indices().numpy(); val = t.values().numpy()
    return sp.csr_matrix((val, (idx[0], idx[1])), shape=tuple(t.shape))


def main():
    import torch
    from sentence_transformers.sparse_encoder import SparseEncoder
    dev = "mps" if torch.backends.mps.is_available() else "cpu"
    m = SparseEncoder(MD, device=dev)
    res = {"model": "opensearch-neural-sparse-encoding-doc-v3-distill", "in_domain_warning": True}
    for ds in ("scifact", "nfcorpus"):
        c, q, qr = L.beir(ds); dids = list(c); te = sorted(qr["test"])
        p = rp.work("sparse", ds + ".npz")
        la0 = os.getloadavg()
        if not os.path.exists(p):
            t0 = time.perf_counter()
            D = m.encode_document([L.doc_text(c[d]) for d in dids], batch_size=4, convert_to_sparse_tensor=True)  # small batches: the MLM head outputs 30,522 values per token
            dt = time.perf_counter() - t0
            Dm = to_csr(D); sp.save_npz(p, Dm)
            res.setdefault("timing", {})[ds] = {"docs": len(dids), "seconds": round(dt, 1), "docs_per_s": round(len(dids) / dt, 1),
                                                "loadavg_before": [round(x, 2) for x in la0], "loadavg_after": [round(x, 2) for x in os.getloadavg()],
                                                "when": time.strftime("%Y-%m-%d %H:%M")}
        Dm = sp.load_npz(p)
        Q = to_csr(m.encode_query([q[x] for x in te], convert_to_sparse_tensor=True))
        S = (Q @ Dm.T).toarray()
        run = {}
        for i, x in enumerate(te):
            t = np.argpartition(-S[i], 100)[:100]; t = t[np.argsort(-S[i][t])]
            run[x] = {dids[j]: float(S[i][j]) for j in t if S[i][j] > 0}
        R = {"sparse": rp.summ(PC.per_query(run, qr["test"], rp.M3)),
             "bm25": rp.summ(PC.per_query(L.run(ds, "bm25"), qr["test"], rp.M3)),
             "doc_nonzeros_mean": round(float(np.diff(Dm.indptr).mean()), 1), "query_nonzeros_mean": round(float(np.diff(Q.indptr).mean()), 1)}
        de = L.run(ds, "qwen3-emb-0.6b")
        R["qwen3"] = rp.summ(PC.per_query(de, qr["test"], rp.M3))
        R["rrf(sparse, qwen3)"] = rp.summ(PC.per_query({x: rp.top(fuse(run[x], de[x], "rrf", 60)) for x in te}, qr["test"], rp.M3))
        R["rrf(bm25, qwen3)"] = rp.summ(PC.per_query({x: rp.top(fuse(L.run(ds, "bm25")[x], de[x], "rrf", 60)) for x in te}, qr["test"], rp.M3))
        # one example document's heaviest terms, and how many of them are not in its text
        i0 = 0
        row = Dm.getrow(i0)
        vocab = m.tokenizer.convert_ids_to_tokens(row.indices.tolist())
        pairs = sorted(zip(vocab, row.data.tolist()), key=lambda x: -x[1])[:20]
        txt = L.doc_text(c[dids[i0]]).lower()
        R["example_doc"] = {"id": dids[i0], "title": c[dids[i0]]["title"][:100], "top_terms": [[t, round(w, 3), t.strip("#") in txt] for t, w in pairs]}
        res[ds] = R
        print(ds, R, flush=True)
    prev = rp.load_out("sparse.json")
    if prev.get("timing") and "timing" not in res:
        res["timing"] = prev["timing"]
    rp.save("sparse.json", res)


if __name__ == "__main__":
    main()
