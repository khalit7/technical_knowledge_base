"""PENDING GPU RUN (written, not yet run): SemDeDup and D4 on 50,000 random FineWeb-Edu rows of CC-MAIN-2024-30.

Encoder: arctic-embed-m backbone of HuggingFaceFW/fineweb-edu-classifier (on disk), [CLS], 512 tokens, normalised, on
MPS when available. Then the same SemDeDup rule as dp_sem.py (k-means 100 clusters, "hard" ranking, eps 0.01 to 0.15)
and D4's SSL-prototype pruning (k-means 100 on the SemDeDup survivors, drop the documents closest to their centroid)
to keep 80%, 60%, 40%; for each, the FineWeb-Edu score (the rows' own `score` column) of kept vs pruned documents.
Writes ../data/out/dp_d4_fw50k.json and $DC_SCRATCH/dp/emb_fwedu50k.npy.
"""
import os, sys, time
import numpy as np
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import dp_common as P

import pyarrow.parquet as pq
import torch
from transformers import AutoModel, AutoTokenizer
from sklearn.cluster import KMeans

t = pq.read_table(P.C.L.path("curated", "fineweb_edu_2024-30_rand50k.parquet"), columns=["text", "score"])
texts, score = t["text"].to_pylist(), np.array(t["score"].to_pylist(), dtype=float)
dev = "mps" if torch.backends.mps.is_available() else "cpu"
mp = P.C.L.model_path("fineweb_edu_classifier")
tok = AutoTokenizer.from_pretrained(mp)
model = AutoModel.from_pretrained(mp).eval().to(dev)
E_PATH = P.work("emb_fwedu50k.npy")
t0 = time.time()
if os.path.exists(E_PATH):
    E = np.load(E_PATH)
else:
    E = np.zeros((len(texts), model.config.hidden_size), dtype=np.float32)
    order = np.argsort([len(x) for x in texts])
    with torch.inference_mode():
        for k in range(0, len(texts), 32):  # modest batches: 16 GB machine shared with other jobs
            idx = order[k:k + 32]
            b = tok([texts[i] for i in idx], truncation=True, max_length=512, padding=True, return_tensors="pt").to(dev)
            v = model(**b).last_hidden_state[:, 0]
            E[idx] = torch.nn.functional.normalize(v, dim=-1).float().cpu().numpy()
            if k % 3200 == 0:
                print("embedded", k, "of", len(texts), round(time.time() - t0), "s", flush=True)
    np.save(E_PATH, E)
secs = time.time() - t0
print("embedding done", round(secs), "s on", dev, flush=True)
del model
if dev == "mps":
    torch.mps.empty_cache()  # GPU work ends here; the rest is CPU (k-means, numpy)
open(P.work("d4_gpu_done"), "w").write("1")

LAB = {}


def semdedup(X, eps, k=100):
    if id(X) not in LAB:  # one k-means per matrix, reused across eps
        LAB[id(X)] = KMeans(k, n_init=3, random_state=0).fit_predict(X)
    lab = LAB[id(X)]
    rem = set()
    for c in range(k):
        m = np.nonzero(lab == c)[0]
        if len(m) < 2:
            continue
        cen = X[m].mean(0); cen /= np.linalg.norm(cen)
        m = m[np.argsort(X[m] @ cen)]
        sub = X[m] @ X[m].T
        for r in range(1, len(m)):
            if sub[r, :r].max() >= 1 - eps:
                rem.add(int(m[r]))
    return rem

res = {"n": len(texts), "device": dev, "dtype": "float32", "embed_seconds": round(secs), "sweep": []}
for eps in (0.01, 0.02, 0.05, 0.1, 0.15):
    res["sweep"].append({"eps": eps, "removed": len(semdedup(E, eps))})
    print("semdedup eps", eps, res["sweep"][-1]["removed"], flush=True)
sd = semdedup(E, 0.05)
keep0 = np.array([i for i in range(len(texts)) if i not in sd])
km = KMeans(100, n_init=3, random_state=0).fit(E[keep0])
cen = km.cluster_centers_ / np.linalg.norm(km.cluster_centers_, axis=1, keepdims=True)
dist = 1 - np.sum(E[keep0] * cen[km.labels_], 1)
res["d4"] = []
for share in (0.8, 0.6, 0.4):
    k = int(round(share * len(texts)))
    order = np.argsort(-dist)
    kept, pruned = keep0[order[:k]], keep0[order[k:]]
    res["d4"].append({"keep": share, "score_median_kept": float(np.median(score[kept])),
                      "score_median_pruned": float(np.median(score[pruned])) if pruned.size else None,
                      "score3_kept": int((score[kept] >= 3).sum()), "score3_pruned": int((score[pruned] >= 3).sum())})
P.save("dp_d4_fw50k.json", res)
