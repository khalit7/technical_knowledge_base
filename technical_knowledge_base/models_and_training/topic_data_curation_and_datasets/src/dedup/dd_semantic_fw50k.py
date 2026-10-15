"""GPU run (src/dedup/run_pending.sh semantic-fw50k): SemDeDup on the 50,000 random FineWeb rows of CC-MAIN-2024-30.

Same encoder and settings as the deduplication child page's FineWeb-Edu run (deduplication/src/scripts/dp_d4_fw50k.py):
arctic-embed-m backbone of the FineWeb-Edu classifier on disk, [CLS], 512 tokens, normalised, float32, batch 32, MPS;
then NeMo Curator's rule (k-means 100, "hard" ranking, remove when cosine to an earlier-ranked row >= 1 - eps).
NeMo's default encoder, google/embeddinggemma-300m, is gated on Hugging Face and not accessible here (checked
2026-10-15), so only arctic-embed-m is run. FineWeb rather than FineWeb-Edu rows: these are deduplicated per crawl by
MinHash, so what semantic dedup removes here is what per-crawl MinHash leaves.
The bench lock is held only while the GPU embeds (taken and released by this script).
Writes $DC_SCRATCH/dedup/emb_fw50k_arctic.npy and out/dd_semantic_fw50k.json.
"""
import json
import os
import subprocess
import sys
import time

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import dd_common as C  # noqa: E402

LOCK = os.path.join(C.L.scratch(), "..", "inf", "lock.sh")
E_PATH = C.work("emb_fw50k_arctic.npy")
fw = C.L.curated("fineweb_rand50k", columns=["text"])
texts = fw["text"].tolist()
t0 = time.time()
if os.path.exists(E_PATH):
    E = np.load(E_PATH); secs = None
else:
    print(subprocess.run(["sh", LOCK, "acquire", "bench", "dd"], capture_output=True, text=True).stdout.strip(), flush=True)
    try:
        import torch
        from transformers import AutoModel, AutoTokenizer
        dev = "mps" if torch.backends.mps.is_available() else "cpu"
        mp = C.L.model_path("fineweb_edu_classifier")
        tok = AutoTokenizer.from_pretrained(mp)
        model = AutoModel.from_pretrained(mp).eval().to(dev)
        E = np.zeros((len(texts), model.config.hidden_size), dtype=np.float32)
        order = np.argsort([len(x) for x in texts])
        with torch.inference_mode():
            for k in range(0, len(texts), 32):
                idx = order[k:k + 32]
                b = tok([texts[i] for i in idx], truncation=True, max_length=512, padding=True, return_tensors="pt").to(dev)
                v = model(**b).last_hidden_state[:, 0]
                E[idx] = torch.nn.functional.normalize(v, dim=-1).float().cpu().numpy()
                if k % 3200 == 0:
                    print("embedded", k, "of", len(texts), round(time.time() - t0), "s", flush=True)
                    subprocess.run(["sh", LOCK, "touch", "bench", "dd"], capture_output=True)
        np.save(E_PATH, E)
        secs = round(time.time() - t0)
        del model
        if dev == "mps":
            torch.mps.empty_cache()
    finally:
        print(subprocess.run(["sh", LOCK, "release", "bench", "dd"], capture_output=True, text=True).stdout.strip(), flush=True)
    print("embedding done", secs, "s on", dev, flush=True)

from sklearn.cluster import KMeans  # noqa: E402
lab = KMeans(100, n_init=3, random_state=0).fit_predict(E)


def semdedup(eps):
    rem = set()
    for c in range(100):
        m = np.nonzero(lab == c)[0]
        if len(m) < 2:
            continue
        cen = E[m].mean(0); cen /= np.linalg.norm(cen)
        m = m[np.argsort(E[m] @ cen)]
        sub = E[m] @ E[m].T
        for r in range(1, len(m)):
            if sub[r, :r].max() >= 1 - eps:
                rem.add(int(m[r]))
    return rem


# MinHash 14 x 8 candidates inside the same 50,000 rows (signatures from dd_fineweb.py, same row order)
S = np.load(C.work("fw50k_sigs.npy"))
assert len(S) == len(texts)
mh_docs = set()
for b in range(14):
    keys = {}
    for i in range(len(S)):
        if S[i].any():
            keys.setdefault(S[i, b * 8:(b + 1) * 8].tobytes(), []).append(i)
    for v in keys.values():
        if len(v) > 1:
            mh_docs.update(v)
res = {"n": len(texts), "rows": "FineWeb CC-MAIN-2024-30, 50,000 random rows (seed 0)", "device": "mps",
       "dtype": "float32", "embed_seconds": secs, "minhash_docs_in_candidates": len(mh_docs), "sweep": []}
for eps in (0.01, 0.02, 0.05, 0.1, 0.15):
    r = semdedup(eps)
    res["sweep"].append({"eps": eps, "removed": len(r), "with_minhash_candidate": len(r & mh_docs)})
    print(res["sweep"][-1], flush=True)
C.save("dd_semantic_fw50k.json", res)
