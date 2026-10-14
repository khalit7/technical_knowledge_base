"""Pending GPU run (src/dedup/run_pending.sh semantic-fw50k): SemDeDup on the 50,000 random FineWeb rows of
CC-MAIN-2024-30 with two encoders, the same rule as dd_semantic.py (NeMo Curator 1.4.0's: k-means, "hard" ranking,
remove a document whose cosine to an earlier-ranked one in its cluster is at least 1 - eps).
Encoders: arctic-embed-m (the FineWeb-Edu classifier's backbone, on disk; CLS) and google/embeddinggemma-300m
(NeMo Curator's default; mean pooling as its sentence-transformers config does; downloaded to HF_HOME).
Writes $DC_SCRATCH/dedup/emb_fw50k_<enc>.npy and out/dd_semantic_fw50k.json.
"""
import json
import os
import sys
import time

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import dd_common as C  # noqa: E402

import torch  # noqa: E402
from transformers import AutoModel, AutoTokenizer  # noqa: E402

dev = "mps" if torch.backends.mps.is_available() else "cpu"
fw = C.L.curated("fineweb_rand50k", columns=["id", "text"])
texts = fw["text"].tolist()
ENC = {"arctic": (C.L.model_path("fineweb_edu_classifier"), "cls"), "gemma": ("google/embeddinggemma-300m", "mean")}


def embed(name):
    path = C.work(f"emb_fw50k_{name}.npy")
    if os.path.exists(path):
        return np.load(path)
    src, pool = ENC[name]
    tok = AutoTokenizer.from_pretrained(src)
    model = AutoModel.from_pretrained(src).to(dev).eval()
    out = np.zeros((len(texts), model.config.hidden_size), dtype=np.float32)
    order = np.argsort([len(t) for t in texts])
    t0 = time.time()
    with torch.inference_mode():
        for k in range(0, len(texts), 64):
            idx = order[k:k + 64]
            b = tok([texts[i] for i in idx], truncation=True, max_length=512, padding=True, return_tensors="pt").to(dev)
            h = model(**b).last_hidden_state
            v = h[:, 0] if pool == "cls" else (h * b["attention_mask"][..., None]).sum(1) / b["attention_mask"].sum(1, keepdim=True)
            out[idx] = torch.nn.functional.normalize(v.float(), dim=-1).cpu().numpy()
    print(name, "seconds", round(time.time() - t0), flush=True)
    np.save(path, out)
    return out


def semdedup(E, eps, k=100, seed=0):
    from sklearn.cluster import KMeans
    lab = KMeans(k, n_init=3, random_state=seed).fit_predict(E)
    removed = set()
    for c in range(k):
        m = np.nonzero(lab == c)[0]
        if len(m) < 2:
            continue
        cen = E[m].mean(0); cen /= np.linalg.norm(cen)
        m = m[np.argsort(E[m] @ cen)]
        S = E[m] @ E[m].T
        for r in range(1, len(m)):
            if S[r, :r].max() >= 1 - eps:
                removed.add(int(m[r]))
    return removed


res = {"n": len(texts), "device": dev, "sweep": []}
E = {n: embed(n) for n in ENC}
for eps in [0.01, 0.02, 0.05, 0.1, 0.15]:
    r = {n: semdedup(E[n], eps) for n in ENC}
    res["sweep"].append({"eps": eps, **{n: len(v) for n, v in r.items()}, "both": len(r["arctic"] & r["gemma"])})
    print(res["sweep"][-1], flush=True)
C.save("dd_semantic_fw50k.json", res)
