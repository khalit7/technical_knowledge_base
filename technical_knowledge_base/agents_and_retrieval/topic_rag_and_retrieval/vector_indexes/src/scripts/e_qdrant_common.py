"""Shared Qdrant helpers for e_qdrant.py and e_qdrant_paths.py (server on port 8320)."""
import time

from qdrant_client import QdrantClient, models

c = QdrantClient(url="http://localhost:8320", timeout=600)


def make(name, X, payload, fst, field_schema):
    if c.collection_exists(name):
        c.delete_collection(name)
    c.create_collection(name, vectors_config=models.VectorParams(size=X.shape[1], distance=models.Distance.DOT),
                        hnsw_config=models.HnswConfigDiff(m=16, ef_construct=100, full_scan_threshold=fst),
                        optimizers_config=models.OptimizersConfigDiff(indexing_threshold=0))
    for k, sch in field_schema.items():
        c.create_payload_index(name, k, field_schema=sch)
    for s in range(0, len(X), 512):
        c.upsert(name, points=models.Batch(ids=list(range(s, min(len(X), s + 512))), vectors=X[s:s + 512].tolist(),
                                           payloads=payload[s:s + 512]), wait=True)
    c.update_collection(name, optimizers_config=models.OptimizersConfigDiff(indexing_threshold=1))
    for _ in range(600):
        info = c.get_collection(name)
        if info.status == models.CollectionStatus.GREEN and (info.indexed_vectors_count or 0) >= len(X):
            break
        time.sleep(1)
    info = c.get_collection(name)
    return {"points": info.points_count, "indexed_vectors": info.indexed_vectors_count, "segments": info.segments_count}


