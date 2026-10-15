"""Train fastText quality classifiers that differ only in their reference (positive) set, with the hyperparameters read
from DCLM's published classifier (dim 100, lr 0.05, epoch 5, wordNgrams 2, minCount 1, bucket 2,000,000, softmax;
see qc_ftexplain / ../data/out/vocab_dclm.json), and negatives drawn from RefinedWeb.

  small: 50,000 positives vs 50,000 negatives for each of oh_eli5, wiki, owt2, gpt3 (wiki + owt2 + books in thirds)
  full : oh_eli5 at DCLM's own size, 200,000 vs 200,000 (100k OH-2.5 + 100k ELI5)
Then a GPT-3-style classifier: logistic regression on Spark-like features (lowercase, whitespace tokens, 2^18 hashed
features) with wiki + owt2 + books positives against raw English Common Crawl (WET) negatives.
Models in $DC_SCRATCH/qc/models/; summary in ../data/out/train_ref.json.
usage: qc_train_ref.py fasttext | gpt3"""
import json
import os
import random
import sys
import time

import numpy as np

import qc_common as C

REF = C.sdir("ref", "x")[:-1]
MD = C.sdir("models", "x")[:-1]
os.makedirs(MD, exist_ok=True)
DCLM_ARGS = dict(dim=100, lr=0.05, epoch=5, wordNgrams=2, minCount=1, bucket=2_000_000, loss="softmax", thread=4)  # DCLM's file
# The shared machine had little free memory (a GPU job held most of the unified memory), and a 2M-bucket model with a
# 1.4M-word vocabulary was swapped out while scoring. Smaller variant used for the comparison, measured against the
# DCLM-parameter model on run0 (oh_eli5_50k vs oh_eli5_50k_dclmparams, Spearman reported on the page):
ARGS = dict(DCLM_ARGS, minCount=3, bucket=500_000)


def read(name, n=None, skip=0):
    out = []
    with open(os.path.join(REF, name + ".txt")) as f:
        for i, line in enumerate(f):
            if i < skip:
                continue
            out.append(line.rstrip("\n"))
            if n and len(out) >= n:
                break
    return out


def positives(kind, n):
    if kind == "oh_eli5":
        return read("oh", n // 2) + read("eli5", n // 2)
    if kind == "gpt3":
        k = n // 3
        return read("wiki", k) + read("owt2", k) + read("books", n - 2 * k)
    return read(kind, n)


def train(kind, n):
    import fasttext
    rng = random.Random(0)
    pos = positives(kind, n)
    neg = read("rw", len(pos))
    lines = [f"__label__hq {t}" for t in pos] + [f"__label__cc {t}" for t in neg]
    rng.shuffle(lines)
    tf = C.sdir("tmp_train.txt")
    with open(tf, "w") as f:
        f.write("\n".join(lines) + "\n")
    t0 = time.time()
    m = fasttext.train_supervised(input=tf, verbose=0, **ARGS)
    secs = time.time() - t0
    name = f"{kind}_{n // 1000}k"
    m.save_model(os.path.join(MD, name + ".bin"))
    os.remove(tf)
    return name, {"kind": kind, "positives": len(pos), "negatives": len(neg), "train_secs_rough": round(secs, 1),
                  "nwords": len(m.words)}


def gpt3():
    from sklearn.feature_extraction.text import HashingVectorizer
    from sklearn.linear_model import LogisticRegression
    import joblib
    neg = read("cc_raw")  # all English WET documents of the two files (about 18,000)
    pos = positives("gpt3", len(neg))  # balanced: thirds of Wikipedia, OpenWebText, books
    # Spark ML Tokenizer: lowercase, split on whitespace; HashingTF default numFeatures 2^18 (term counts)
    hv = HashingVectorizer(n_features=2 ** 18, lowercase=True, token_pattern=None, tokenizer=str.split,
                           alternate_sign=False, norm=None)
    X = hv.transform(pos + neg)
    y = np.r_[np.ones(len(pos)), np.zeros(len(neg))]
    t0 = time.time()
    clf = LogisticRegression(max_iter=1000, C=1.0)
    clf.fit(X, y)
    joblib.dump((hv, clf), os.path.join(MD, "gpt3_lr.joblib"))
    return {"positives": len(pos), "negatives": len(neg), "train_secs_rough": round(time.time() - t0, 1),
            "features": "lowercase, whitespace tokens, 2^18 hashed term counts (Spark Tokenizer + HashingTF defaults)",
            "model": "sklearn LogisticRegression(C=1.0)"}


if __name__ == "__main__":
    outp = os.path.join(C.OUT, "train_ref.json")
    res = json.load(open(outp)) if os.path.exists(outp) else {}
    if sys.argv[1] == "fasttext":
        for kind, n in [("oh_eli5", 50_000), ("wiki", 50_000), ("owt2", 50_000), ("gpt3", 50_000), ("oh_eli5", 200_000)]:
            name, r = train(kind, n)
            res[name] = r
            print(name, r, flush=True)
            json.dump(res, open(outp, "w"), indent=1)
    elif sys.argv[1] == "gpt3":
        res["gpt3_lr"] = gpt3()
        print(res["gpt3_lr"])
        json.dump(res, open(outp, "w"), indent=1)
