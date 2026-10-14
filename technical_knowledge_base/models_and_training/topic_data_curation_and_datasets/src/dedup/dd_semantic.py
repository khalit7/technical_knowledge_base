"""Semantic dedup (SemDeDup as NeMo Curator 1.4.0 implements it) on CPU, on run0's 2,692 filtered documents.

Encoder: the backbone of the FineWeb-Edu classifier on disk (Snowflake arctic-embed-m, BERT-base size; frozen during
the classifier's training), first 512 tokens, CLS vector, L2-normalised. NeMo Curator's default is
google/embeddinggemma-300m (stages/text/deduplication/semantic.py:80); not on disk, and this is a CPU-only round.
Algorithm (stages/deduplication/semantic/pairwise.py and identify_duplicates.py): k-means on the embeddings; inside each
cluster rank documents ("hard": farthest from the centroid first), and remove a document when its cosine similarity to
any earlier-ranked document in its cluster is at least 1 - eps.
Writes $DC_SCRATCH/dedup/emb.npy and out/dd_semantic.json (eps sweep, cosine for every MinHash-kept pair, the top
pairs by cosine that MinHash does not catch).
"""
import os
import sys
import time

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import dd_common as C  # noqa: E402

docs = [C.clean_doc(d) for d in C.L.run0("filtered")]
n = len(docs)
E_PATH = C.work("emb.npy")
if not os.path.exists(E_PATH):
    import torch
    from transformers import AutoModel, AutoTokenizer
    torch.set_num_threads(4)
    mp = C.L.model_path("fineweb_edu_classifier")
    tok = AutoTokenizer.from_pretrained(mp)
    model = AutoModel.from_pretrained(mp).eval()  # BertModel: the classifier minus its regression head
    out = np.zeros((n, model.config.hidden_size), dtype=np.float32)
    t0 = time.time()
    order = np.argsort([len(d["text"]) for d in docs])  # batch similar lengths together
    with torch.inference_mode():
        for k in range(0, n, 16):
            idx = order[k:k + 16]
            b = tok([docs[i]["text"] for i in idx], truncation=True, max_length=512, padding=True, return_tensors="pt")
            v = model(**b).last_hidden_state[:, 0]
            out[idx] = torch.nn.functional.normalize(v, dim=-1).numpy()
            if k % 320 == 0:
                print(k, "of", n, round(time.time() - t0), "s", flush=True)
    np.save(E_PATH, out)
    print("rough seconds to embed (shared machine, 4 threads, low priority):", round(time.time() - t0))
E = np.load(E_PATH)
S = E @ E.T

Z = np.load(C.work("pairs.npz"))
pi, pj, jac = Z["i"], Z["j"], Z["jac"]


def semdedup(eps, k, seed=0):
    from sklearn.cluster import KMeans
    lab = np.zeros(n, dtype=int) if k == 1 else KMeans(k, n_init=3, random_state=seed).fit_predict(E)
    removed = set()
    for c in range(k):
        m = np.nonzero(lab == c)[0]
        if len(m) < 2:
            continue
        cen = E[m].mean(0); cen /= np.linalg.norm(cen)
        m = m[np.argsort(E[m] @ cen)]  # "hard": least similar to the centroid ranked first (kept)
        sub = S[np.ix_(m, m)]
        for r in range(1, len(m)):
            if sub[r, :r].max() >= 1 - eps:
                removed.add(int(m[r]))
    return removed


import json  # noqa: E402
mh = json.load(open(C.work("clusters.json")))
mh_removed_docs = {x for g in mh["clusters"] for x in g[1:]}  # one kept per MinHash cluster (count matches run0's 75)
mh_cluster_docs = {x for g in mh["clusters"] for x in g}
res = {"n": n, "encoder": "Snowflake arctic-embed-m backbone of HuggingFaceFW/fineweb-edu-classifier rev 284663cb, CLS, 512 tokens",
       "sweep": []}
for eps in [0.001, 0.005, 0.01, 0.02, 0.05, 0.1, 0.15]:
    r20, r1 = semdedup(eps, 20), semdedup(eps, 1)
    res["sweep"].append({"eps": eps, "removed_k20": len(r20), "removed_exact": len(r1),
                         "removed_k20_in_minhash_clusters": len(r20 & mh_cluster_docs)})
    print(res["sweep"][-1], flush=True)
# cosine of every MinHash-kept pair, and the most similar pairs that MinHash never pairs
res["pairs_cos"] = [[int(a), int(b), round(float(S[a, b]), 4)] for a, b in zip(pi, pj)]
iu = np.triu_indices(n, 1)
cs = S[iu]
top = np.argsort(-cs)[:4000]
kept = set(zip(pi.tolist(), pj.tolist()))
jl = dict(zip(zip(pi.tolist(), pj.tolist()), jac.tolist()))
extra = []
for t in top:
    a, b = int(iu[0][t]), int(iu[1][t])
    if jl.get((a, b), 0.0) < 0.3:
        extra.append([a, b, round(float(cs[t]), 4), round(jl.get((a, b), 0.0), 3)])
res["high_cos_low_jaccard"] = extra[:60]
res["cos_hist_all_pairs"] = np.histogram(cs, bins=np.linspace(-0.2, 1, 25))[0].tolist()
C.save("dd_semantic.json", res)
