"""Filtered search in a real vector database: Qdrant v1.19.2 server (Docker, port 8320), recall only (no timing).
Qdrant builds its HNSW graph only when a segment passes indexing_threshold, and it scans instead of walking the
graph when the filtered set is under full_scan_threshold (both 10,000 KB by default; see FACTS.md, Tool map). To
measure the graph we set indexing_threshold 1 and full_scan_threshold 10 (the minimum, in KB), as the Tool map did;
a second collection keeps full_scan_threshold at its default so the query planner can pick a payload-index scan.
Payload indexes are created before the graph is built, so Qdrant adds its extra per-value links (payload_m).
Start: docker run -d --rm --name vix-qd -p 8320:6333 qdrant/qdrant:v1.19.2
Output: $RAG_SCRATCH/vix/out/qdrant.json"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import time

import numpy as np
from qdrant_client import QdrantClient, models

import vixlib as V

from e_qdrant_common import c, make  # noqa: E402
R = {"asof": V.stamp(), "qdrant": "1.19.2", "rows": []}


def run(name, X, Q, flt, masks, label, efs=(16, 64, 128, 512)):
    gts = []
    for qi, m in enumerate(masks):
        idx = np.flatnonzero(m); s = X[idx] @ Q[qi]
        gts.append(set(idx[np.argsort(-s)[:10]].tolist()))
    for ef in efs:
        rec = []
        for qi in range(len(Q)):
            pts = c.query_points(name, query=Q[qi].tolist(), query_filter=flt[qi], limit=10,
                                 search_params=models.SearchParams(hnsw_ef=ef)).points
            got = {p.id for p in pts}
            rec.append(len(got & gts[qi]) / max(1, len(gts[qi])))
        r = {"collection": name, "filter": label, "hnsw_ef": ef, "recall10": V.r4(np.mean(rec)), "selectivity": V.r4(np.mean([m.mean() for m in masks]))}
        R["rows"].append(r); print(r, flush=True)
        V.save("qdrant", R)


# QASPER: filter on the question's own paper vs another paper
X, Q, cids, qids, cpaper, qpaper = V.qasper_set()
cp = np.array(cpaper)
papers = sorted(set(cpaper))
rng = np.random.default_rng(0)
other = []
for qp in qpaper:
    o = qp
    while o == qp:
        o = papers[rng.integers(len(papers))]
    other.append(o)
payload = [{"paper": p} for p in cpaper]
for name, fst in (("vix_qasper_graph", 10), ("vix_qasper_default", 10000)):
    R[name] = make(name, X, payload, fst, {"paper": models.PayloadSchemaType.KEYWORD})
    print(name, R[name])
    f_own = [models.Filter(must=[models.FieldCondition(key="paper", match=models.MatchValue(value=p))]) for p in qpaper]
    f_oth = [models.Filter(must=[models.FieldCondition(key="paper", match=models.MatchValue(value=p))]) for p in other]
    run(name, X, Q, f_own, [cp == p for p in qpaper], "own paper")
    run(name, X, Q, f_oth, [cp == p for p in other], "another paper")
    c.delete_collection(name)

# four corpora: random attribute in 1,000 buckets (filter keeps the first s x 1,000 buckets), graph forced
XA, QA, src, qsrc = V.all4_set()
sel = np.sort(np.random.default_rng(1).choice(len(QA), 400, replace=False))
QS = QA[sel]
attr = np.random.default_rng(2).uniform(size=len(XA))
bucket = np.floor(attr * 1000).astype(int)
name = "vix_all4_graph"
R[name] = make(name, XA, [{"b": int(b)} for b in bucket], 10, {"b": models.PayloadSchemaType.INTEGER})
print(name, R[name])
for s in (0.001, 0.01, 0.1, 0.5):
    lim = int(round(s * 1000))
    flt = models.Filter(must=[models.FieldCondition(key="b", range=models.Range(lt=lim))])
    run(name, XA, QS, [flt] * len(QS), [bucket < lim] * len(QS), "random s=%g" % s, efs=(16, 64, 128))
c.delete_collection(name)
V.save("qdrant", R)
