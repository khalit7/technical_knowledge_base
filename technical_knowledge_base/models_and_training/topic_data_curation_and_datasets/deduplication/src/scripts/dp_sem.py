"""Semantic dedup in depth on CPU: does the encoder matter, and what does D4's prototype pruning remove?

Documents: run0's 2,692 filtered documents (the MinHash stage's input). Encoders (all on disk, read only):
  arctic   Snowflake arctic-embed-m, the backbone of the FineWeb-Edu classifier (root lab's emb.npy: CLS, 512 tokens)
  bge      BAAI/bge-small-en-v1.5 @ 5c38ec7c (CLS, normalised, 512 tokens), from the RAG topic's models folder
  minilm   sentence-transformers/all-MiniLM-L6-v2 @ 8b3219a9 (mean pooling, normalised, 256 tokens as its config)
SemDeDup rule as the root lab implements NeMo Curator 1.4.0's (k-means, rank "hard" = farthest from centroid first,
remove when cosine to an earlier-ranked member >= 1 - eps). D4 (Tirumala et al. 2023): SemDeDup first, then "SSL
prototypes": k-means again, and drop the documents CLOSEST to their centroid (the most prototypical) until the target
share is kept. Quality scores for the survivors from the root Quality lab's run0_final_scores.jsonl (FineWeb-Edu
classifier and DCLM fastText on run0's final 2,617 documents).
Writes ../data/out/dp_sem.json.
"""
import json
import os
import sys
import time
from urllib.parse import urlsplit

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import dp_common as P  # noqa: E402

docs = [P.C.clean_doc(d) for d in P.C.L.run0("filtered")]
n = len(docs)
RAG_MODELS = os.path.join(os.path.dirname(P.C.L.scratch()), "rag", "models")
ENC = {"bge": ("bge-small-en-v1.5", "cls", 512), "minilm": ("all-MiniLM-L6-v2", "mean", 256)}


def embed(key):
    path = P.work(f"emb_{key}.npy")
    if os.path.exists(path):
        return np.load(path), None
    import torch
    from transformers import AutoModel, AutoTokenizer
    torch.set_num_threads(4)
    name, pool, ml = ENC[key]
    mp = os.path.join(RAG_MODELS, name)
    tok = AutoTokenizer.from_pretrained(mp)
    model = AutoModel.from_pretrained(mp).eval()
    out = np.zeros((n, model.config.hidden_size), dtype=np.float32)
    order = np.argsort([len(d["text"]) for d in docs])
    t0 = time.time()
    with torch.inference_mode():
        for k in range(0, n, 16):
            idx = order[k:k + 16]
            b = tok([docs[i]["text"] for i in idx], truncation=True, max_length=ml, padding=True, return_tensors="pt")
            h = model(**b).last_hidden_state
            if pool == "cls":
                v = h[:, 0]
            else:
                m = b["attention_mask"].unsqueeze(-1).float()
                v = (h * m).sum(1) / m.sum(1)
            out[idx] = torch.nn.functional.normalize(v, dim=-1).numpy()
    secs = time.time() - t0
    np.save(path, out)
    return out, round(secs)


E = {"arctic": np.load(P.dd_work("emb.npy"))}
secs = {}
for k in ENC:
    E[k], s = embed(k)
    secs[k] = s
    print(k, "embedded", s, "s", flush=True)

from sklearn.cluster import KMeans  # noqa: E402


def semdedup(X, eps, k=20, seed=0):
    lab = KMeans(k, n_init=3, random_state=seed).fit_predict(X)
    S = X @ X.T
    removed = set()
    for c in range(k):
        m = np.nonzero(lab == c)[0]
        if len(m) < 2:
            continue
        cen = X[m].mean(0)
        cen /= np.linalg.norm(cen)
        m = m[np.argsort(X[m] @ cen)]
        sub = S[np.ix_(m, m)]
        for r in range(1, len(m)):
            if sub[r, :r].max() >= 1 - eps:
                removed.add(int(m[r]))
    return removed


res = {"n": n, "rough_embed_seconds": secs, "sweep": {}, "agree": {}}
EPS = [0.01, 0.02, 0.05, 0.1, 0.15]
rem = {}
for key, X in E.items():
    res["sweep"][key] = []
    for eps in EPS:
        r = semdedup(X, eps)
        rem[(key, eps)] = r
        res["sweep"][key].append({"eps": eps, "removed": len(r)})
    print(key, res["sweep"][key], flush=True)
for eps in EPS:
    a, b, c = rem[("arctic", eps)], rem[("bge", eps)], rem[("minilm", eps)]
    res["agree"][str(eps)] = {"arctic_bge": len(a & b), "arctic_minilm": len(a & c), "bge_minilm": len(b & c),
                              "all3": len(a & b & c), "any": len(a | b | c)}
print(res["agree"])
# cosine of the same pair under each encoder: the MinHash pairs at J >= 0.8 and the pairs with J < 0.05
Z = np.load(P.dd_work("pairs.npz"))
pi, pj, jac = Z["i"], Z["j"], Z["jac"]
res["cos_minhash_pairs"] = {}
for key, X in E.items():
    cs = np.sum(X[pi] * X[pj], 1)
    hi = jac >= 0.8
    res["cos_minhash_pairs"][key] = {"j08_min": round(float(cs[hi].min()), 3), "j08_median": round(float(np.median(cs[hi])), 3)}
    iu = np.triu_indices(n, 1)
    allc = (X @ X.T)[iu]
    res["cos_minhash_pairs"][key]["all_pairs_median"] = round(float(np.median(allc)), 3)
    res["cos_minhash_pairs"][key]["all_pairs_p999"] = round(float(np.quantile(allc, 0.999)), 3)

# D4 on arctic: SemDeDup at eps then SSL prototypes to keep a target share
scores = {}
qf = os.path.join(P.C.L.scratch(), "q", "run0_final_scores.jsonl")
for line in open(qf):
    d = json.loads(line)
    scores[d["id"]] = (d["edu"], d["dclm"])
idx_final = [i for i, d in enumerate(docs) if d["id"] in scores]
edu = np.array([scores[docs[i]["id"]][0] if docs[i]["id"] in scores else np.nan for i in range(n)])
dclm = np.array([scores[docs[i]["id"]][1] if docs[i]["id"] in scores else np.nan for i in range(n)])
X = E["arctic"]
sd = semdedup(X, 0.05)
keep0 = np.array([i for i in range(n) if i not in sd])
lab = KMeans(20, n_init=3, random_state=0).fit(X[keep0])
cen = lab.cluster_centers_ / np.linalg.norm(lab.cluster_centers_, axis=1, keepdims=True)
dist = 1 - np.sum(X[keep0] * cen[lab.labels_], 1)  # cosine distance to own centroid
d4 = {"semdedup_eps": 0.05, "after_semdedup": int(len(keep0)), "targets": []}
for keep_share in (0.8, 0.6, 0.4):
    k = int(round(keep_share * n))
    order = np.argsort(-dist)  # farthest first: kept
    kept = keep0[order[:k]]
    pruned = keep0[order[k:]]

    def med(a, ix):
        v = a[ix]
        v = v[~np.isnan(v)]
        return round(float(np.median(v)), 4) if v.size else None

    hosts_pr = [urlsplit(docs[i]["url"]).hostname for i in pruned]
    d4["targets"].append({"keep": keep_share, "kept": int(len(kept)), "pruned": int(len(pruned)),
                          "edu_median_kept": med(edu, kept), "edu_median_pruned": med(edu, pruned),
                          "dclm_median_kept": med(dclm, kept), "dclm_median_pruned": med(dclm, pruned),
                          "chars_median_kept": int(np.median([len(docs[i]["text"]) for i in kept])),
                          "chars_median_pruned": int(np.median([len(docs[i]["text"]) for i in pruned])),
                          "edu3_kept": int(np.sum(edu[kept] >= 2.5)), "edu3_pruned": int(np.sum(edu[pruned] >= 2.5)),
                          "distinct_hosts_pruned": len(set(hosts_pr))})
    print(d4["targets"][-1], flush=True)
# the 12 most prototypical documents (closest to a centroid): hostnames only
proto = keep0[np.argsort(dist)[:12]]
d4["most_prototypical_hosts"] = [urlsplit(docs[i]["url"]).hostname for i in proto]
d4["most_prototypical_chars"] = [len(docs[i]["text"]) for i in proto]
res["d4"] = d4
res["n_with_scores"] = len(idx_final)
P.save("dp_sem.json", res)
