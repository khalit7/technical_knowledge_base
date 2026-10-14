"""Server modes of the two stores the setup agent confirmed in Docker (pgvector/pgvector:pg17 with pgvector 0.8.7, and
qdrant/qdrant:v1.19.2), on the same running-example vectors as defaults_real.py: defaults against one knob turned.
No timing. Start the containers first (ports from the map range):
  docker run -d --rm --name map-pg -e POSTGRES_PASSWORD=map -p 8230:5432 pgvector/pgvector:pg17
  docker run -d --rm --name map-qd -p 8231:6333 qdrant/qdrant:v1.19.2
Run: <mapenv>/bin/python -I defaults_servers.py <RAG_SCRATCH> <defaults_real_full.json>  -> adds runs to it"""
import json, os, sys, time
import numpy as np

RS, FULL = sys.argv[1], sys.argv[2]
d = json.load(open(FULL))
E = os.path.join(RS, "data", "emb", "scifact", "bge-small")
X = np.load(os.path.join(E, "corpus.npy")).astype("float32")
QA = np.load(os.path.join(E, "queries.npy")).astype("float32")
qids = open(os.path.join(E, "queries_ids.txt")).read().split()
Q = QA[[qids.index(q) for q in d["test_qids"]]]
exact = d["exact"]
N, D = X.shape
K = 10


def rec(F):
    return [len(set(map(int, f[:K])) & set(e)) / K for f, e in zip(F, exact)]


def add(key, lib, label, F, cfg, src):
    r = rec(F)
    d["runs"][key] = {"lib": lib, "label": label, "recall10": round(float(np.mean(r)), 4), "per_query": [round(x, 1) for x in r],
                      "top": [[int(i) for i in f[:K]] for f in F], "cfg": cfg, "src": src}
    print(key, d["runs"][key]["recall10"], cfg)


# ---- pgvector ----
import psycopg
from pgvector.psycopg import register_vector
for _ in range(30):
    try:
        cn = psycopg.connect("host=localhost port=8230 user=postgres password=map dbname=postgres", autocommit=True)
        break
    except Exception:
        time.sleep(1)
cn.execute("CREATE EXTENSION IF NOT EXISTS vector")
register_vector(cn)
ver = cn.execute("SELECT extversion FROM pg_extension WHERE extname='vector'").fetchone()[0]
cn.execute("DROP TABLE IF EXISTS sf")
cn.execute("CREATE TABLE sf (id int PRIMARY KEY, v vector(%d))" % D)
with cn.cursor().copy("COPY sf (id, v) FROM STDIN WITH (FORMAT BINARY)") as cp:
    cp.set_types(["int4", "vector"])
    for i in range(N):
        cp.write_row([i, X[i]])
cn.execute("CREATE INDEX ON sf USING hnsw (v vector_ip_ops)")
efs = cn.execute("SHOW hnsw.ef_search").fetchone()[0]
def pgq(q):
    return [r[0] for r in cn.execute("SELECT id FROM sf ORDER BY v <#> %s LIMIT 10", (q,)).fetchall()]
plan = "\n".join(r[0] for r in cn.execute("EXPLAIN SELECT id FROM sf ORDER BY v <#> %s LIMIT 10", (Q[0],)).fetchall())
add("pg_hnsw_def", "pgvector", "pgvector HNSW, defaults", [pgq(q) for q in Q], {"m": 16, "ef_construction": 64, "ef_search": int(efs), "extversion": ver, "plan_uses_index": "Index Scan" in plan}, "pgvector README defaults")
cn.execute("SET hnsw.ef_search = 100")
add("pg_hnsw_ef100", "pgvector", "pgvector HNSW, ef_search 100", [pgq(q) for q in Q], {"ef_search": 100}, "")
cn.close()

# ---- Qdrant server ----
from qdrant_client import QdrantClient, models
qc = QdrantClient(url="http://localhost:8231", timeout=120)
info0 = qc.info() if hasattr(qc, "info") else None
# sfdef: all defaults. sfidx: HNSW built (indexing_threshold 1) but the planner still scans small segments (full_scan_threshold
# default 10000 KB). sffst: HNSW built and full_scan_threshold at its minimum (10 KB), so queries walk the graph.
for name, cfg, hc in [("sfdef", None, None), ("sfidx", models.OptimizersConfigDiff(indexing_threshold=1), None),
                      ("sffst", models.OptimizersConfigDiff(indexing_threshold=1), models.HnswConfigDiff(full_scan_threshold=10))]:
    if qc.collection_exists(name):
        qc.delete_collection(name)
    qc.create_collection(name, vectors_config=models.VectorParams(size=D, distance=models.Distance.DOT), optimizers_config=cfg, hnsw_config=hc)
    for s in range(0, N, 1000):
        qc.upsert(name, points=models.Batch(ids=list(range(s, min(N, s + 1000))), vectors=X[s:s + 1000].tolist()), wait=True)
    for _ in range(120):
        ci = qc.get_collection(name)
        if str(ci.status).lower().endswith("green"):
            break
        time.sleep(1)
ci_def, ci_idx, ci_fst = qc.get_collection("sfdef"), qc.get_collection("sfidx"), qc.get_collection("sffst")
qf = lambda name, q, p=None: [pt.id for pt in qc.query_points(name, query=q.tolist(), limit=K, search_params=p).points]
add("qd_server_def", "qdrant", "Qdrant server, defaults", [qf("sfdef", q) for q in Q],
    {"indexed_vectors": ci_def.indexed_vectors_count, "indexing_threshold_kb": ci_def.config.optimizer_config.indexing_threshold, "m": ci_def.config.hnsw_config.m,
     "ef_construct": ci_def.config.hnsw_config.ef_construct, "full_scan_threshold_kb": ci_def.config.hnsw_config.full_scan_threshold}, "")
add("qd_server_idx_scan", "qdrant", "Qdrant server, HNSW built, default full_scan_threshold", [qf("sfidx", q, models.SearchParams(hnsw_ef=16)) for q in Q],
    {"indexed_vectors": ci_idx.indexed_vectors_count, "full_scan_threshold_kb": ci_idx.config.hnsw_config.full_scan_threshold, "hnsw_ef": 16}, "")
add("qd_server_hnsw", "qdrant", "Qdrant server, HNSW used (full_scan_threshold 10)", [qf("sffst", q) for q in Q],
    {"indexed_vectors": ci_fst.indexed_vectors_count, "full_scan_threshold_kb": 10, "hnsw_ef": "default"}, "")
add("qd_server_hnsw_ef16", "qdrant", "Qdrant server, HNSW used, hnsw_ef 16", [qf("sffst", q, models.SearchParams(hnsw_ef=16)) for q in Q],
    {"full_scan_threshold_kb": 10, "hnsw_ef": 16}, "")
d["versions"]["qdrant-server"] = "1.19.2"
d["versions"]["pgvector-ext"] = ver
json.dump(d, open(FULL, "w"))
print("saved")
