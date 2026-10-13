"""Tiny install-import-search checks for the vector stores and ANN libraries on the Tool map.
Not a benchmark: no timing. Synthetic clustered vectors (seeded), so every library gets the same input.
For each: installed version, what index it actually built with default settings (read back from the library),
and recall@10 against exact numpy search on the same vectors.
Run with the map env:  <mapenv>/bin/python src/map/checks_stores.py <workdir>   -> src/map/inputs/checks_stores.json"""
import json, os, sys, tempfile, importlib.metadata as md
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
WORK = sys.argv[1] if len(sys.argv) > 1 else tempfile.mkdtemp()
os.makedirs(WORK, exist_ok=True)
N, D, Q, K = 5000, 64, 100, 10
rng = np.random.default_rng(7)
cent = rng.normal(size=(50, D))
X = (cent[rng.integers(0, 50, N)] + 0.35 * rng.normal(size=(N, D))).astype("float32")
X /= np.linalg.norm(X, axis=1, keepdims=True)
Qv = (cent[rng.integers(0, 50, Q)] + 0.35 * rng.normal(size=(Q, D))).astype("float32")
Qv /= np.linalg.norm(Qv, axis=1, keepdims=True)
exact = np.argsort(-(Qv @ X.T), axis=1)[:, :K]


def recall(found):
    return round(float(np.mean([len(set(map(int, f[:K])) & set(e)) / K for f, e in zip(found, exact)])), 4)


def ver(p):
    try:
        return md.version(p)
    except Exception:
        return None


out = {"setup": {"n": N, "dim": D, "queries": Q, "k": K, "data": "50 Gaussian clusters, unit-normalised, seed 7",
                 "metric": "cosine (inner product on unit vectors)", "numpy": np.__version__}}


def run(name, f):
    try:
        out[name] = f()
    except Exception as e:
        out[name] = {"error": repr(e)[:300]}
    print(name, out[name])


def faiss_chk():
    import faiss
    fl = faiss.IndexFlatIP(D); fl.add(X); _, I1 = fl.search(Qv, K)
    h = faiss.IndexHNSWFlat(D, 32, faiss.METRIC_INNER_PRODUCT); h.add(X)
    ef0 = h.hnsw.efSearch; efc = h.hnsw.efConstruction
    _, I2 = h.search(Qv, K)
    h.hnsw.efSearch = 128; _, I3 = h.search(Qv, K)
    q = faiss.IndexFlatIP(D); ivf = faiss.IndexIVFFlat(q, D, 64, faiss.METRIC_INNER_PRODUCT); ivf.train(X); ivf.add(X)
    np0 = ivf.nprobe; _, I4 = ivf.search(Qv, K)
    return {"version": faiss.__version__, "flat_recall": recall(I1), "hnsw_M": 32, "hnsw_efSearch_default": ef0,
            "hnsw_efConstruction_default": efc, "hnsw_recall_default": recall(I2), "hnsw_recall_ef128": recall(I3),
            "ivf_nlist": 64, "ivf_nprobe_default": np0, "ivf_recall_default": recall(I4)}


def hnswlib_chk():
    import hnswlib
    p = hnswlib.Index(space="ip", dim=D); p.init_index(max_elements=N)  # library defaults M=16, ef_construction=200
    p.add_items(X, np.arange(N))
    ef0 = p.ef
    I1, _ = p.knn_query(Qv, k=K)
    p.set_ef(100); I2, _ = p.knn_query(Qv, k=K)
    return {"version": ver("hnswlib"), "M_default": p.M, "ef_construction_default": p.ef_construction,
            "ef_default": ef0, "recall_default": recall(I1), "recall_ef100": recall(I2),
            "note": "knn_query with ef below k searches with max(ef, k)"}


def usearch_chk():
    from usearch.index import Index
    ix = Index(ndim=D, metric="ip")
    ix.add(np.arange(N), X)
    m = ix.search(Qv, K)
    return {"version": ver("usearch"), "connectivity_default": ix.connectivity, "expansion_add_default": ix.expansion_add,
            "expansion_search_default": ix.expansion_search, "recall_default": recall(m.keys)}


def chroma_chk():
    import chromadb
    from chromadb.config import Settings
    c = chromadb.EphemeralClient(settings=Settings(anonymized_telemetry=False))
    col = c.create_collection("map_default", embedding_function=None)
    col2 = c.create_collection("map_cos", embedding_function=None, configuration={"hnsw": {"space": "cosine"}})
    ids = [str(i) for i in range(N)]
    for cc in (col, col2):
        for s in range(0, N, 1000):
            cc.add(ids=ids[s:s + 1000], embeddings=X[s:s + 1000])
    cfg = col.configuration_json if hasattr(col, "configuration_json") else None
    r1 = col.query(query_embeddings=Qv, n_results=K)
    r2 = col2.query(query_embeddings=Qv, n_results=K)
    f1 = [[int(i) for i in row] for row in r1["ids"]]
    f2 = [[int(i) for i in row] for row in r2["ids"]]
    return {"version": chromadb.__version__, "config_read_back": (cfg or {}).get("hnsw") if isinstance(cfg, dict) else str(cfg)[:300],
            "recall_default_space": recall(f1), "recall_cosine_space": recall(f2),
            "note": "unit vectors, so l2 and cosine rank identically; the default space matters for unnormalised vectors"}


def qdrant_chk():
    from qdrant_client import QdrantClient, models
    c = QdrantClient(":memory:")
    c.create_collection("m", vectors_config=models.VectorParams(size=D, distance=models.Distance.COSINE))
    c.upsert("m", points=models.Batch(ids=list(range(N)), vectors=X.tolist()))
    found = [[p.id for p in c.query_points("m", query=q.tolist(), limit=K).points] for q in Qv]
    info = c.get_collection("m")
    return {"version": ver("qdrant-client"), "mode": "local in-process (':memory:')", "recall": recall(found),
            "hnsw_config_reported": str(info.config.hnsw_config)[:200],
            "source": "qdrant_client/local/local_collection.py: search() computes calculate_distance over all vectors, then np.argsort"}


def lance_chk():
    import lancedb, pyarrow as pa
    db = lancedb.connect(os.path.join(WORK, "lance"))
    tbl = db.create_table("m", data=[{"id": i, "vector": X[i].tolist()} for i in range(N)], mode="overwrite")
    f0 = [list(tbl.search(q.tolist()).metric("cosine").limit(K).to_pandas()["id"]) for q in Qv]
    tbl.create_index(metric="cosine", num_partitions=16, num_sub_vectors=8)
    idx = tbl.list_indices()
    f1 = [list(tbl.search(q.tolist()).metric("cosine").limit(K).to_pandas()["id"]) for q in Qv]
    f2 = [list(tbl.search(q.tolist()).metric("cosine").limit(K).refine_factor(10).to_pandas()["id"]) for q in Qv]
    return {"version": lancedb.__version__, "no_index_recall": recall(f0), "index_listed": str(idx)[:300],
            "ivf_pq_recall_default_nprobes": recall(f1), "ivf_pq_recall_refine10": recall(f2),
            "params": "num_partitions=16, num_sub_vectors=8 (set here: 5,000 rows is too few for the defaults)"}


def milvus_chk():
    from pymilvus import MilvusClient
    c = MilvusClient(os.path.join(WORK, "milvus_lite.db"))
    if c.has_collection("m"):
        c.drop_collection("m")
    c.create_collection("m", dimension=D, metric_type="COSINE")
    c.insert("m", [{"id": i, "vector": X[i].tolist()} for i in range(N)])
    idx = [c.describe_index("m", n) for n in c.list_indexes("m")]
    res = c.search("m", data=Qv.tolist(), limit=K)
    found = [[h["id"] for h in r] for r in res]
    err = None
    try:
        c.release_collection("m")
        c.drop_index("m", c.list_indexes("m")[0]) if c.list_indexes("m") else None
        ip = c.prepare_index_params(); ip.add_index(field_name="vector", index_type="HNSW", metric_type="COSINE", params={"M": 16, "efConstruction": 64})
        c.create_index("m", ip)
        c.load_collection("m")
        idx2 = [c.describe_index("m", n) for n in c.list_indexes("m")]
        err = "accepted; described as " + str(idx2)[:200]
    except Exception as e:
        err = repr(e)[:200]
    c.close()
    return {"version": ver("pymilvus"), "milvus_lite": ver("milvus-lite"), "index_described": str(idx)[:300],
            "recall": recall(found), "create_hnsw_result": err}


def bm25_chk():
    import bm25s, rank_bm25
    corpus = ["the cat sat on the mat", "dogs and cats living together", "a quick brown fox", "the mat was red", "cat cat cat"]
    qy = "cat on mat"
    r = bm25s.BM25(); r.index(bm25s.tokenize(corpus, stopwords=None, show_progress=False), show_progress=False)
    s1 = r.get_scores(qy.split())
    o = rank_bm25.BM25Okapi([d.split() for d in corpus]); s2 = o.get_scores(qy.split())
    return {"bm25s": ver("bm25s"), "rank_bm25": ver("rank-bm25"), "bm25s_method_default": r.method, "bm25s_k1": r.k1, "bm25s_b": r.b,
            "rank_bm25_k1": o.k1, "rank_bm25_b": o.b, "rank_bm25_epsilon": o.epsilon,
            "scores_bm25s": [round(float(x), 4) for x in s1], "scores_rank_bm25": [round(float(x), 4) for x in s2],
            "same_order": [int(i) for i in np.argsort(-s1)] == [int(i) for i in np.argsort(-s2)]}


def ranx_chk():
    from ranx import Qrels, Run, evaluate
    qr = Qrels({"q1": {"d1": 1, "d3": 1}}); rn = Run({"q1": {"d1": 0.9, "d2": 0.8, "d3": 0.7}})
    v = evaluate(qr, rn, ["ndcg@10", "recall@2"])
    hand = (1 + 1 / np.log2(4)) / (1 + 1 / np.log2(3))
    return {"version": ver("ranx"), "ndcg@10": round(float(v["ndcg@10"]), 6), "hand_ndcg@10": round(float(hand), 6), "recall@2": float(v["recall@2"])}


for n, f in [("faiss", faiss_chk), ("hnswlib", hnswlib_chk), ("usearch", usearch_chk), ("chroma", chroma_chk), ("qdrant_local", qdrant_chk),
             ("lancedb", lance_chk), ("milvus_lite", milvus_chk), ("bm25", bm25_chk), ("ranx", ranx_chk)]:
    if len(sys.argv) > 2 and n not in sys.argv[2:]:
        continue
    run(n, f)
p = os.path.join(HERE, "inputs", "checks_stores.json")
old = json.load(open(p)) if os.path.exists(p) else {}
old.update(out)
json.dump(old, open(p, "w"), indent=1)
