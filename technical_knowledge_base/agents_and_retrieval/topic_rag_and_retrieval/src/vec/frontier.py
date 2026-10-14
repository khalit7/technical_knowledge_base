"""A short frontier summary for the root, reusing the Vector indexes child's timed sweep on BEIR Quora
(522,931 all-MiniLM-L6-v2 vectors, 384 dims, 1,000 queries; FAISS 1.15.1, one thread, one query at a time,
bench lock held, load average recorded): ../../vector_indexes/src/data/results.json["bench"]["quora"].
No new runs. hnswlib rows are left out of the timing chart: hnswlib 0.8.0 has hand-written SIMD only for x86, so its
times on this Mac are a platform effect (child page, section 6). Writes out/frontier.json."""
import os, sys; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import json
from common import HERE, save

R = json.load(open(os.path.join(HERE, "..", "..", "vector_indexes", "src", "data", "results.json")))
b = R["bench"]["quora"]
pts = [dict(family=r["family"], label=r["label"], recall10=r["recall10"], ms=r["ms_p50"], qps=r["qps"],
            bytes=r["bytes_per_vector"], load=r["load"][0]) for r in b["rows"] if r["family"] != "hnswlib"]
best = []
for fam, name in (("flat", "Exact (flat)"), ("ivf", "IVF-Flat"), ("ivfpq", "IVF-PQ"), ("sq", "SQ8 (int8)"),
                  ("binary", "Binary"), ("hnsw", "HNSW")):
    rows = [p for p in pts if p["family"] == fam]
    for thr in (0.95, 0.99):
        ok = [p for p in rows if p["recall10"] >= thr]
        p = max(ok, key=lambda p: p["qps"]) if ok else None
        best.append(dict(family=fam, name=name, thr=thr, label=p["label"] if p else None, qps=p["qps"] if p else None,
                         ms=p["ms"] if p else None, recall10=p["recall10"] if p else None, bytes=p["bytes"] if p else None,
                         max_recall=max(r["recall10"] for r in rows)))
builds = [dict(label=x["label"], s=x["build_s"]) for x in b["builds"]]
save("frontier.json", dict(source="Vector indexes child page, results.json bench.quora (measured 2026-10-14)",
                           n=b["n"], d=b["d"], queries=b["queries"], when=b["runs"][0]["when"],
                           load=[b["runs"][0]["load_before"][0], b["runs"][0]["load_after"][0]],
                           points=pts, best=best, builds=builds))
for x in best:
    print(x)
