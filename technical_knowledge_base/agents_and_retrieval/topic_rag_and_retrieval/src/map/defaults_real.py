"""What you get with each library's defaults, on the running example's real vectors.
SciFact corpus (5,183 abstracts) and its 300 test queries, embedded once by the setup agent with bge-small-en-v1.5
(384 dimensions, unit length). Every library indexes the same float32 vectors; the score is ANN recall@10 against exact
inner-product search on the same vectors (the ANN recall, not the retrieval recall: whether the index returns the
exact top 10, whatever their relevance). No timing. Deterministic except HNSW insertion order effects (single thread
where the library allows).
Run: <mapenv>/bin/python -I defaults_real.py <RAG_SCRATCH> <workdir>   -> inputs/defaults_real.json"""
import json, os, sys, hashlib, importlib.metadata as md
import numpy as np, pandas as pd

HERE = os.path.dirname(os.path.abspath(__file__))
RS, WORK = sys.argv[1], sys.argv[2]
os.makedirs(WORK, exist_ok=True)
E = os.path.join(RS, "data", "emb", "scifact", "bge-small")
X = np.load(os.path.join(E, "corpus.npy")).astype("float32")
QA = np.load(os.path.join(E, "queries.npy")).astype("float32")
cids = open(os.path.join(E, "corpus_ids.txt")).read().split()
qids = open(os.path.join(E, "queries_ids.txt")).read().split()
test = pd.read_csv(os.path.join(RS, "data", "raw", "scifact", "test.tsv"), sep="\t", dtype=str)
tq = sorted(set(test["query-id"]), key=int)
qi = [qids.index(q) for q in tq]
Q = QA[qi]
N, D = X.shape
K = 10
norms = np.linalg.norm(X, axis=1)
S = Q @ X.T
exact = np.argsort(-S, axis=1)[:, :K]
sha = hashlib.sha256(open(os.path.join(E, "corpus.npy"), "rb").read()).hexdigest()


def rec(F):
    return [len(set(map(int, f[:K])) & set(map(int, e))) / K for f, e in zip(F, exact)]


def ver(p):
    try:
        return md.version(p)
    except Exception:
        return None


R = {}


def add(key, lib, label, F, cfg, src):
    r = rec(F)
    R[key] = {"lib": lib, "label": label, "recall10": round(float(np.mean(r)), 4), "per_query": [round(x, 1) for x in r],
              "top": [[int(i) for i in f[:K]] for f in F], "cfg": cfg, "src": src}
    print(key, R[key]["recall10"], cfg)


import faiss
faiss.omp_set_num_threads(1)
fl = faiss.IndexFlatIP(D); fl.add(X); _, I = fl.search(Q, K)
add("faiss_flat", "faiss", "FAISS IndexFlatIP (exact)", I, {"type": "Flat"}, "faiss/IndexFlat.h")
h = faiss.IndexHNSWFlat(D, 32, faiss.METRIC_INNER_PRODUCT); h.add(X)
_, I = h.search(Q, K)
add("faiss_hnsw_def", "faiss", "FAISS HNSW, defaults", I, {"M": 32, "efConstruction": h.hnsw.efConstruction, "efSearch": h.hnsw.efSearch}, "faiss/impl/HNSW.h")
h.hnsw.efSearch = 64; _, I = h.search(Q, K)
add("faiss_hnsw_ef64", "faiss", "FAISS HNSW, efSearch 64", I, {"M": 32, "efSearch": 64}, "")
nl = int(round(np.sqrt(N)))  # the common sqrt(N) rule; 4*sqrt(N) leaves under 39 points per list here
ivf = faiss.IndexIVFFlat(faiss.IndexFlatIP(D), D, nl, faiss.METRIC_INNER_PRODUCT); ivf.cp.seed = 1234; ivf.train(X); ivf.add(X)
np0 = ivf.nprobe; _, I = ivf.search(Q, K)
add("faiss_ivf_def", "faiss", "FAISS IVF-Flat, default nprobe", I, {"nlist": nl, "nprobe": np0}, "faiss/IndexIVF.h")
ivf.nprobe = 8; _, I = ivf.search(Q, K)
add("faiss_ivf_np8", "faiss", "FAISS IVF-Flat, nprobe 8", I, {"nlist": nl, "nprobe": 8}, "")

import hnswlib
p = hnswlib.Index(space="ip", dim=D); p.init_index(max_elements=N, random_seed=100); p.set_num_threads(1); p.add_items(X, np.arange(N))
ef0 = p.ef; I, _ = p.knn_query(Q, k=K)
add("hnswlib_def", "hnswlib", "hnswlib, defaults", I, {"M": p.M, "ef_construction": p.ef_construction, "ef": ef0, "effective_ef": max(ef0, K)}, "hnswlib/hnswalg.h")
p.set_ef(100); I, _ = p.knn_query(Q, k=K)
add("hnswlib_ef100", "hnswlib", "hnswlib, ef 100", I, {"ef": 100}, "")

from usearch.index import Index
u = Index(ndim=D, metric="ip"); u.add(np.arange(N), X, threads=1)
m = u.search(Q, K, threads=1)
add("usearch_def", "usearch", "USearch, defaults", m.keys, {"connectivity": u.connectivity, "expansion_add": u.expansion_add, "expansion_search": u.expansion_search}, "")

import chromadb
from chromadb.config import Settings
c = chromadb.EphemeralClient(settings=Settings(anonymized_telemetry=False))
col = c.create_collection("scifact", embedding_function=None)
for s in range(0, N, 1000):
    col.add(ids=[str(i) for i in range(s, min(N, s + 1000))], embeddings=X[s:s + 1000])
r = col.query(query_embeddings=Q, n_results=K)
cfg = col.configuration_json.get("hnsw") if isinstance(getattr(col, "configuration_json", None), dict) else None
add("chroma_def", "chromadb", "Chroma (single node), defaults", [[int(i) for i in row] for row in r["ids"]], cfg or {}, "chromadb/api/collection_configuration.py")

from qdrant_client import QdrantClient, models
qc = QdrantClient(":memory:")
qc.create_collection("s", vectors_config=models.VectorParams(size=D, distance=models.Distance.COSINE))
qc.upsert("s", points=models.Batch(ids=list(range(N)), vectors=X.tolist()))
F = [[pt.id for pt in qc.query_points("s", query=q.tolist(), limit=K).points] for q in Q]
add("qdrant_local", "qdrant-client", "Qdrant client, local mode", F, {"mode": ":memory:", "search": "exact scan"}, "qdrant_client/local/local_collection.py")

import lancedb
db = lancedb.connect(os.path.join(WORK, "lance"))
tb = db.create_table("s", data=[{"id": i, "vector": X[i].tolist()} for i in range(N)], mode="overwrite")
F = [list(tb.search(q.tolist()).limit(K).to_pandas()["id"]) for q in Q]
add("lance_noindex", "lancedb", "LanceDB, no index (flat scan)", F, {"index": None, "metric": "l2 (default)"}, "")
tb.create_index(metric="cosine")
idx = tb.list_indices()
st = tb.index_stats(idx[0].name) if idx else None
F = [list(tb.search(q.tolist()).metric("cosine").limit(K).to_pandas()["id"]) for q in Q]
add("lance_ivfpq_def", "lancedb", "LanceDB, create_index() defaults", F, {"index_type": str(idx[0].index_type) if idx else None, "stats": str(st)[:240]}, "lancedb/table.py create_index(index_type='IVF_PQ')")
F = [list(tb.search(q.tolist()).metric("cosine").limit(K).refine_factor(10).to_pandas()["id"]) for q in Q]
add("lance_ivfpq_refine", "lancedb", "LanceDB IVF_PQ, refine_factor 10", F, {"refine_factor": 10}, "")

from pymilvus import MilvusClient
mc = MilvusClient(os.path.join(WORK, "milvus_lite.db"))
if mc.has_collection("s"):
    mc.drop_collection("s")
mc.create_collection("s", dimension=D, metric_type="COSINE")
for s in range(0, N, 1000):
    mc.insert("s", [{"id": i, "vector": X[i].tolist()} for i in range(s, min(N, s + 1000))])
res = mc.search("s", data=Q.tolist(), limit=K)
add("milvus_lite", "pymilvus", "Milvus Lite, defaults", [[x["id"] for x in rr] for rr in res], {"index": [mc.describe_index("s", n)["index_type"] for n in mc.list_indexes("s")]}, "")
mc.close()

out = {"asof": "2026-10-13", "data": {"corpus": "BEIR SciFact corpus", "n": N, "dim": D, "queries": len(Q), "model": "BAAI/bge-small-en-v1.5 (setup agent's embeddings)",
                                       "corpus_sha256": sha, "norm_min": round(float(norms.min()), 5), "norm_max": round(float(norms.max()), 5)},
       "versions": {k: ver(k) for k in ["faiss-cpu", "hnswlib", "usearch", "chromadb", "qdrant-client", "lancedb", "pymilvus", "milvus-lite", "numpy"]},
       "test_qids": tq, "exact": exact.tolist(), "runs": R}
json.dump(out, open(os.path.join(WORK, "defaults_real_full.json"), "w"))
print("saved")
