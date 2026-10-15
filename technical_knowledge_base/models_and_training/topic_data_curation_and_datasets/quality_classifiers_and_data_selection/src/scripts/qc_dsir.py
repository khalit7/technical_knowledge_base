"""DSIR (Xie et al. 2023, arXiv 2302.03169) on CPU, reproducing the data-selection package's hashed n-gram estimator
(p-lambda/dsir @ 4802a1c7, data_selection/hashed_ngram_dsir.py):
  - text lowercased, nltk WordPunctTokenizer (hashed_ngram_dsir.py:40, 104-105);
  - unigrams and bigrams, each hashed with sha256 into 10,000 buckets (lines 22-23, 45-50);
  - raw and target bag-of-ngram distributions; log importance weight of a document = counts . (log p_target - log p_raw)
    (lines 119-120, 216: np.log(p + 1e-8) on both);
  - resampling without replacement by Gumbel top-k on the log weights (base.py:236-242).
Our only change: a dictionary cache in front of sha256 (same buckets, much faster in pure Python).
Pool: 50,000 FineWeb CC-MAIN-2024-30 rows (the raw distribution is fitted on the pool itself, as the package does)
plus the 2,617 run0 documents scored with the same raw model. Targets: Wikipedia, OH-2.5 + ELI5, FineWeb-Edu.
Output: $DC_SCRATCH/qc/scores/dsir_<target>__{fw50k,run0}.npy and ../data/out/dsir.json"""
import hashlib
import json
import os

import numpy as np
from nltk.tokenize import WordPunctTokenizer

import qc_common as C

NB = 10_000
wpt = WordPunctTokenizer()
_cache = {}
SD = C.sdir("scores", "x")[:-1]


def bucket(s):
    b = _cache.get(s)
    if b is None:
        b = int(hashlib.sha256(s.encode("utf-8")).hexdigest(), 16) % NB
        if len(_cache) < 2_000_000:  # bounded memory
            _cache[s] = b
    return b


def buckets(text):
    w = wpt.tokenize(text.lower())
    return [bucket(x) for x in w] + [bucket(a + " " + b) for a, b in zip(w, w[1:])]


def fit_counts(texts):
    """bag of hashed n-grams of a whole set, accumulated document by document (bounded memory)"""
    c = np.zeros(NB, dtype=np.float64)
    for t in texts:
        c += np.bincount(buckets(t), minlength=NB)
    return c / c.sum()


def log_weights(texts, LD):
    """log importance weight of each document for each row of LD (targets x buckets), and its n-gram count"""
    W = np.zeros((len(texts), LD.shape[0]), dtype=np.float64)
    n = np.zeros(len(texts), dtype=np.int64)
    for i, t in enumerate(texts):
        b = buckets(t)
        n[i] = len(b)
        if b:
            W[i] = LD[:, b].sum(axis=1)
    return W, n


def gumbel_topk(logw, k, seed=0):
    g = logw + np.random.default_rng(seed).gumbel(size=logw.shape)
    return np.argpartition(-g, k)[:k]


if __name__ == "__main__":
    from scipy.stats import spearmanr
    fw = C.L.curated("fineweb_rand50k", columns=["text"]).text.tolist()
    run = [d["text"] for d in C.run0_final()]
    p_raw = fit_counts(fw)
    REF = C.sdir("ref", "x")[:-1]

    def readref(name, n):
        out = []
        with open(os.path.join(REF, name + ".txt")) as f:
            for line in f:
                out.append(line)
                if len(out) >= n:
                    break
        return out
    names = ["wiki", "oh_eli5", "fwedu"]
    P = {"wiki": fit_counts(readref("wiki", 50_000)),
         "oh_eli5": fit_counts(readref("oh", 25_000) + readref("eli5", 25_000)),
         "fwedu": fit_counts(C.L.curated("fineweb_edu_rand50k", columns=["text"]).text.tolist())}
    LD = np.stack([np.log(P[k] + 1e-8) - np.log(p_raw + 1e-8) for k in names])
    W_fw, lens = log_weights(fw, LD)
    W_run, _ = log_weights(run, LD)
    res = {"num_buckets": NB, "pool": "fineweb_rand50k", "targets": {}}
    for j, name in enumerate(names):
        lw_fw, lw_run = W_fw[:, j], W_run[:, j]
        np.save(os.path.join(SD, f"dsir_{name}__fw50k.npy"), lw_fw.astype(np.float32))
        np.save(os.path.join(SD, f"dsir_{name}__run0.npy"), lw_run.astype(np.float32))
        sel = gumbel_topk(lw_fw, 5000)
        np.save(os.path.join(SD, f"dsir_{name}__fw50k_sel.npy"), np.sort(sel))
        p_t = P[name]
        res["targets"][name] = {"spearman_logw_length": float(spearmanr(lw_fw, lens).statistic),
                                "spearman_logw_per_token_length": float(spearmanr(lw_fw / np.maximum(lens, 1), lens).statistic),
                                "selected_median_tokens": float(np.median(lens[sel])), "pool_median_tokens": float(np.median(lens)),
                                "kl_target_raw": float(np.sum(p_t * (np.log(p_t + 1e-8) - np.log(p_raw + 1e-8))))}
        print(name, res["targets"][name], flush=True)
    C.dump("dsir.json", res)
