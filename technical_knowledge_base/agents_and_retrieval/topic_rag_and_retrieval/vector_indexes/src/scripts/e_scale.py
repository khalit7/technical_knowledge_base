"""How the work per query grows with N (deterministic: distance computations, not time). Prefixes of the Quora
collection (MiniLM-L6, 384-d) from 10,000 to 522,931 vectors, 1,000 queries, exact top 10 per prefix. For each N:
exact search (N distances), IVF-Flat (nlist = sqrt(N), the smallest nprobe reaching recall 0.9 / 0.95 / 0.99) and
FAISS HNSW (M 16, efConstruction 100; the smallest efSearch reaching the same targets), with distances per query
at that setting from FAISS's own counters. Output: $RAG_SCRATCH/vix/out/scale.json"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import faiss
import numpy as np

import vixlib as V

faiss.omp_set_num_threads(4)
d = os.path.join(V.WORK, "quora")
XA = np.load(d + "/corpus.npy"); Q = np.load(d + "/queries.npy")
TARGETS = (0.9, 0.95, 0.99)
R = {"asof": V.stamp(), "set": "quora prefixes, MiniLM-L6 384-d, 1,000 queries", "rows": []}
for n in (10000, 30000, 100000, 300000, 522931):
    X = np.ascontiguousarray(XA[:n])
    GT = V.exact_topk(X, Q, k=10)[0]
    row = {"n": n, "exact_ndis": n}
    nl = int(round(np.sqrt(n)))
    ivf = faiss.IndexIVFFlat(faiss.IndexFlatIP(384), 384, nl, faiss.METRIC_INNER_PRODUCT); ivf.cp.seed = 1234
    ivf.train(X); ivf.add(X)
    curve = []
    for p in (1, 2, 4, 8, 12, 16, 24, 32, 48, 64, 96, 128, 192, 256):
        if p > nl:
            break
        ivf.nprobe = p
        st = faiss.cvar.indexIVF_stats; st.reset()
        _, I = ivf.search(Q, 10)
        curve.append({"nprobe": p, "recall10": V.r4(V.recall_at(I, GT)), "ndis": round(st.ndis / len(Q) + nl, 1)})
    row["ivf"] = {"nlist": nl, "curve": curve}
    h = faiss.IndexHNSWFlat(384, 16, faiss.METRIC_INNER_PRODUCT); h.hnsw.efConstruction = 100; h.add(X)
    curve = []
    for ef in (10, 16, 24, 32, 48, 64, 96, 128, 192, 256, 384, 512):
        h.hnsw.efSearch = ef
        st = faiss.cvar.hnsw_stats; st.reset()
        _, I = h.search(Q, 10)
        curve.append({"ef": ef, "recall10": V.r4(V.recall_at(I, GT)), "ndis": round(st.ndis / len(Q), 1)})
    row["hnsw"] = {"M": 16, "efc": 100, "curve": curve}
    for t in TARGETS:
        a = next((c for c in row["ivf"]["curve"] if c["recall10"] >= t), None)
        b = next((c for c in row["hnsw"]["curve"] if c["recall10"] >= t), None)
        row["at_%g" % t] = {"ivf_ndis": a and a["ndis"], "ivf_nprobe": a and a["nprobe"], "hnsw_ndis": b and b["ndis"], "hnsw_ef": b and b["ef"]}
    R["rows"].append(row)
    print(n, {k: v for k, v in row.items() if k.startswith("at_")}, flush=True)
    V.save("scale", R)
