"""Top-1 score ranges of the recorded SciFact test runs (BM25 and Qwen3-Embedding), 5th to 95th percentile across
claims, for the fusion section's point about scales. Output: out/score_ranges.json"""
import os, sys; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
import rp
L = rp.L
out = {}
for sysname in ("bm25", "qwen3-emb-0.6b"):
    r = L.run("scifact", sysname)
    t1 = np.array([list(v.values())[0] for v in r.values() if v]); t10 = np.array([list(v.values())[9] for v in r.values() if len(v) >= 10])
    out[sysname] = {"top1_p5": round(float(np.percentile(t1, 5)), 3), "top1_p95": round(float(np.percentile(t1, 95)), 3),
                    "top10_p5": round(float(np.percentile(t10, 5)), 3), "top10_p95": round(float(np.percentile(t10, 95)), 3)}
print(out); rp.save("score_ranges.json", out)
