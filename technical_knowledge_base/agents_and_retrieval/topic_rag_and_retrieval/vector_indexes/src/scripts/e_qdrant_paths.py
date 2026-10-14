"""Which path did Qdrant take for a filtered query? Qdrant's telemetry counts, per segment, searches answered by the
graph with a filter ("filtered_large_cardinality"), by the payload index plus exact scoring ("filtered_small_cardinality"),
by a plain scan ("filtered_plain"), and so on. Re-creates the QASPER collection of e_qdrant.py with both
full_scan_threshold settings, runs the 892 own-paper queries at hnsw_ef 64, and reads the counters.
Needs the vix-qd container on port 8320.  Output: $RAG_SCRATCH/vix/out/qdrant_paths.json"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import json
import urllib.request

from qdrant_client import models

import e_qdrant_common as C
import vixlib as V

X, Q, cids, qids, cpaper, qpaper = V.qasper_set()
R = {"asof": V.stamp()}


def counters(name):
    t = json.load(urllib.request.urlopen("http://localhost:8320/telemetry?details_level=10"))["result"]
    out = {}

    def walk(o, path=""):
        if isinstance(o, dict):
            for k, v in o.items():
                if k.startswith(("filtered_", "unfiltered_")) and isinstance(v, dict) and "count" in v:
                    out[k] = out.get(k, 0) + v["count"]
                else:
                    walk(v, path + "/" + k)
        elif isinstance(o, list):
            for v in o:
                walk(v, path)
    for col in t["collections"]["collections"]:
        if col.get("id") == name:
            walk(col)
    return out


for name, fst in (("vix_paths_graph", 10), ("vix_paths_default", 10000)):
    info = C.make(name, X, [{"paper": p} for p in cpaper], fst, {"paper": models.PayloadSchemaType.KEYWORD})
    before = counters(name)
    for qi in range(len(Q)):
        C.c.query_points(name, query=Q[qi].tolist(), limit=10, search_params=models.SearchParams(hnsw_ef=64),
                         query_filter=models.Filter(must=[models.FieldCondition(key="paper", match=models.MatchValue(value=qpaper[qi]))]))
    after = counters(name)
    R[name] = {"full_scan_threshold_kb": fst, "collection": info, "searches_by_path": {k: after.get(k, 0) - before.get(k, 0) for k in after}}
    print(name, R[name])
    C.c.delete_collection(name)
V.save("qdrant_paths", R)
