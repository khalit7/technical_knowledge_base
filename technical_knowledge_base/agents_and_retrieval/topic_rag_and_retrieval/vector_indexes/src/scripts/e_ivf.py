"""IVF from the inside (deterministic, no timing): k-means cells, nlist and nprobe, list balance, training sample.
Datasets: SciFact with bge-small (384-d, the Tool map's check) and with Qwen3-Embedding-0.6B (1,024-d); the four
corpora stacked (25,039 Qwen3 vectors). ANN recall@10 against exact search, distance computations per query
(centroids + vectors scanned, from FAISS's IndexIVFStats), nDCG@10 on SciFact's labels.
Output: $RAG_SCRATCH/vix/out/ivf.json"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import faiss
import numpy as np

import vixlib as V

faiss.omp_set_num_threads(2)
R = {"asof": V.stamp(), "faiss": faiss.__version__}


def ivf_sweep(X, Q, GT, nlist, probes, seed=1234, train=None, labels=None):
    d = X.shape[1]
    q = faiss.IndexFlatIP(d)
    idx = faiss.IndexIVFFlat(q, d, nlist, faiss.METRIC_INNER_PRODUCT)
    idx.cp.seed = seed
    idx.train(X if train is None else train)
    idx.add(X)
    sizes = np.array([idx.invlists.list_size(i) for i in range(nlist)])
    rows = []
    for p in probes:
        if p > nlist:
            continue
        idx.nprobe = p
        st = faiss.cvar.indexIVF_stats
        st.reset()
        D, I = idx.search(Q, 100)
        r = {"nprobe": p, "recall10": V.r4(V.recall_at(I, GT)), "ndis": round((st.ndis + len(Q) * nlist) / len(Q), 1),
             "scanned_share": V.r4(st.ndis / len(Q) / len(X))}
        if labels:
            r.update({k: V.r4(v) for k, v in V.ndcg_run(I, D, *labels).items()})
        rows.append(r)
    return {"nlist": nlist, "list_sizes": {"min": int(sizes.min()), "max": int(sizes.max()), "mean": V.r4(sizes.mean()),
                                            "cv": V.r4(sizes.std() / sizes.mean()), "empty": int((sizes == 0).sum())},
            "rows": rows, "centroids": idx.quantizer, "index": idx}


PROBES = [1, 2, 3, 4, 6, 8, 12, 16, 24, 32, 48, 64, 96, 128, 192, 256, 384, 512]

# 1. The Tool map's check, reproduced: SciFact bge-small, nlist 72 (round(sqrt(5183))), seed 1234
X, Q, ids, tq, qrels = V.beir_set("scifact", "bge-small")
GT, _ = V.exact_topk(X, Q)
res = ivf_sweep(X, Q, GT, 72, [1, 8], labels=(ids, tq, qrels))
R["toolmap_check"] = {"set": "scifact/bge-small", "nlist": 72, "rows": res["rows"]}
print("toolmap check", res["rows"])

# 2. SciFact Qwen3: nlist sweep around sqrt(N), nprobe sweep
X, Q, ids, tq, qrels = V.beir_set("scifact", "qwen3-emb-0.6b")
GT, GD = V.exact_topk(X, Q)
R["scifact_exact"] = {k: V.r4(v) for k, v in V.ndcg_run(GT, GD, ids, tq, qrels).items()}
R["scifact_qwen3"] = []
for nl in (18, 36, 72, 144, 288):
    r = ivf_sweep(X, Q, GT, nl, PROBES, labels=(ids, tq, qrels))
    R["scifact_qwen3"].append({k: r[k] for k in ("nlist", "list_sizes", "rows")})
    print("scifact qwen3 nlist", nl, r["list_sizes"], [(x["nprobe"], x["recall10"]) for x in r["rows"][:6]])

# 3. Why queries miss: for nlist 72, nprobe 1, where are the true neighbours? rank of the cell holding each true
#    top-10 neighbour among the query's cells (1 = the nearest cell).
r = ivf_sweep(X, Q, GT, 72, [1])
idx = r["index"]
_, cell_of = idx.quantizer.search(X, 1)
_, qcells = idx.quantizer.search(Q, 72)
ranks = []
for qi in range(len(Q)):
    order = {c: i + 1 for i, c in enumerate(qcells[qi])}
    ranks += [order[int(cell_of[j, 0])] for j in GT[qi, :10]]
ranks = np.array(ranks)
R["cell_rank_of_true_neighbours"] = {"nlist": 72, "hist": {str(k): int((ranks == k).sum()) for k in range(1, 13)},
                                     "over12": int((ranks > 12).sum()), "total": int(len(ranks))}
print("cell ranks", R["cell_rank_of_true_neighbours"])

# 4. Training sample: k-means on a sample vs the whole corpus (nlist 72); FAISS warns below 39 points per centroid
rng = np.random.default_rng(0)
R["train_sample"] = []
for frac in (0.05, 0.1, 0.25, 0.5, 1.0):
    n = int(len(X) * frac)
    tr = X[rng.choice(len(X), n, replace=False)]
    r = ivf_sweep(X, Q, GT, 72, [1, 4, 8], train=tr)
    R["train_sample"].append({"train_n": n, "points_per_centroid": round(n / 72, 1), "list_cv": r["list_sizes"]["cv"],
                              "rows": r["rows"]})
    print("train", n, r["list_sizes"], [(x["nprobe"], x["recall10"]) for x in r["rows"]])

# 5. Drift: centroids trained on SciFact only, then NFCorpus, HotpotQA and QASPER vectors added (the corpus grows
#    into new topics), against centroids retrained on everything. Queries: all four sets' queries.
XA, QA, src, qsrc = V.all4_set()
GTA, _ = V.exact_topk(XA, QA)
nl = int(round(np.sqrt(len(XA))))
sci = np.array([s == "scifact" for s in src])
old = ivf_sweep(XA, QA, GTA, nl, [1, 4, 8, 16], train=XA[sci])
new = ivf_sweep(XA, QA, GTA, nl, [1, 4, 8, 16])
R["drift"] = {"n": len(XA), "nlist": nl, "queries": len(QA),
              "trained_on_scifact_only": {"list_sizes": old["list_sizes"], "rows": old["rows"]},
              "retrained_on_all": {"list_sizes": new["list_sizes"], "rows": new["rows"]}}
print("drift old", old["list_sizes"], [(x["nprobe"], x["recall10"]) for x in old["rows"]])
print("drift new", new["list_sizes"], [(x["nprobe"], x["recall10"]) for x in new["rows"]])

V.save("ivf", R)
