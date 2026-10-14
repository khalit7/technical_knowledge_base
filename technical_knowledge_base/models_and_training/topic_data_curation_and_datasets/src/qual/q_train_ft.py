"""Train our own fastText quality classifier on CPU from the FineWeb-Edu Llama 3 annotations
(232,000 rows: the first 4 of 8 files of HuggingFaceFW/fineweb-edu-llama3-annotations rev 72df4c92),
and measure it against the published FineWeb-Edu classifier on the same held-out rows.

Label: __label__hq if the Llama 3 70B score >= 3 (FineWeb-Edu's threshold), else __label__lq.
Split (seeded): test = 23,200 rows that include the 1,500 rows q_score.py annot scored with the published
classifier; validation = 10% of the rest (threshold choice and config choice only); train = the remainder.
Outputs: out/q_ft.json (configs, learning curve, test metrics), $DC_SCRATCH/q/ft/own_hq.bin (best model).
"""
import json
import os
import time

import fasttext
import numpy as np
import q_common as Q

L = Q.L
fasttext.FastText.eprint = lambda *a, **k: None
D = Q.qdir("ft")
os.makedirs(D, exist_ok=True)
from q_train_ft_norm import norm  # noqa: E402


a = L.curated("edu_annotations", columns=["text", "score"])
N = len(a)
y = (a.score.to_numpy() >= 3).astype(int)
rng = np.random.default_rng(0)
sample1500 = np.sort(np.random.default_rng(0).choice(N, 1500, replace=False))  # same draw as q_score.py annot
rest = np.setdiff1d(np.arange(N), sample1500)
perm = rng.permutation(rest)
test = np.sort(np.concatenate([sample1500, perm[: 23200 - 1500]]))
pool = perm[23200 - 1500:]
val = pool[: len(pool) // 10]
train = pool[len(pool) // 10:]
print("rows", N, "train", len(train), "val", len(val), "test", len(test), "pos rate", y.mean(), flush=True)

t0 = time.time()
texts = [norm(t) for t in a.text]
print("normalised in", round(time.time() - t0), "s", flush=True)


def write(ix, fn):
    with open(fn, "w") as f:
        for i in ix:
            f.write(("__label__hq " if y[i] else "__label__lq ") + texts[i] + "\n")


def probs(m, ix):
    out = np.empty(len(ix))
    for k, i in enumerate(ix):
        labs, ps = m.predict(texts[i], k=-1)
        out[k] = dict(zip(labs, ps)).get("__label__hq", 0.0)
    return out


def metrics(p, yy, thr):
    pred = p >= thr
    tp = int((pred & (yy == 1)).sum()); fp = int((pred & (yy == 0)).sum()); fn = int((~pred & (yy == 1)).sum())
    tn = int((~pred & (yy == 0)).sum())
    pr = tp / max(tp + fp, 1); rc = tp / max(tp + fn, 1); f1 = 2 * pr * rc / max(pr + rc, 1e-9)
    # F1 of the negative class, for macro-F1
    pr0 = tn / max(tn + fn, 1); rc0 = tn / max(tn + fp, 1); f10 = 2 * pr0 * rc0 / max(pr0 + rc0, 1e-9)
    return {"thr": thr, "precision": round(pr, 4), "recall": round(rc, 4), "f1": round(f1, 4),
            "macro_f1": round((f1 + f10) / 2, 4), "kept_frac": round(float(pred.mean()), 4), "tp": tp, "fp": fp, "fn": fn, "tn": tn}


def best_thr(p, yy):
    best = (0, 0.5)
    for thr in np.round(np.arange(0.05, 0.95, 0.01), 2):
        f = metrics(p, yy, float(thr))["f1"]
        if f > best[0]:
            best = (f, float(thr))
    return best[1]


def spearman(u, v):
    from scipy.stats import spearmanr
    return round(float(spearmanr(u, v).statistic), 4)


trainf, valix = os.path.join(D, "train_full.txt"), val
write(train, trainf)
res = {"rows": N, "n_train": int(len(train)), "n_val": int(len(val)), "n_test": int(len(test)),
       "pos_rate_all": round(float(y.mean()), 4), "pos_rate_test": round(float(y[test].mean()), 4), "configs": []}

# 1) small config search on the validation split
grid = [dict(dim=64, wordNgrams=1, epoch=5, lr=0.1), dict(dim=64, wordNgrams=2, epoch=5, lr=0.1),
        dict(dim=100, wordNgrams=2, epoch=10, lr=0.1), dict(dim=64, wordNgrams=2, epoch=5, lr=0.2)]
best = None
for g in grid:
    t0 = time.time()
    try:
        m = fasttext.train_supervised(trainf, thread=4, minCount=3, bucket=2_000_000, seed=0, verbose=0, **g)
    except RuntimeError as e:  # fastText aborts with "Encountered NaN" when the learning rate is too high
        res["configs"].append({"cfg": g, "error": str(e)}); print(g, e, flush=True)
        continue
    pv = probs(m, val)
    thr = best_thr(pv, y[val])
    r = {"cfg": g, "train_secs_rough": round(time.time() - t0, 1), "val": metrics(pv, y[val], thr), "val_spearman_vs_llama": spearman(pv, a.score.to_numpy()[val])}
    print(r, flush=True)
    res["configs"].append(r)
    if best is None or r["val"]["f1"] > best[0]["val"]["f1"]:
        best = (r, m, thr)

cfg, m, thr = best[0]["cfg"], best[1], best[2]
m.save_model(os.path.join(D, "own_hq.bin"))
pt = probs(m, test)
res["best_cfg"] = cfg
res["test"] = metrics(pt, y[test], thr)
res["test_at_0.5"] = metrics(pt, y[test], 0.5)
res["test_spearman_vs_llama"] = spearman(pt, a.score.to_numpy()[test])
res["model_bytes"] = os.path.getsize(os.path.join(D, "own_hq.bin"))
np.save(os.path.join(D, "test_rows.npy"), test)
np.save(os.path.join(D, "test_probs.npy"), pt)

# 2) learning curve with the best config (threshold chosen on validation each time)
curve = []
for n in [500, 1000, 2000, 5000, 10000, 20000, 50000, 100000, len(train)]:
    ix = train[:n]
    fn = os.path.join(D, "train_n.txt")
    write(ix, fn)
    seeds = [0, 1, 2] if n <= 20000 else [0]
    f1s, sps = [], []
    for s in seeds:
        mm = fasttext.train_supervised(fn, thread=4, minCount=3 if n > 5000 else 1, bucket=2_000_000, seed=s, verbose=0, **cfg)
        pv = probs(mm, val)
        th = best_thr(pv, y[val])
        pp = probs(mm, test)
        f1s.append(metrics(pp, y[test], th)["f1"]); sps.append(spearman(pp, a.score.to_numpy()[test]))
    curve.append({"n": int(n), "f1": f1s, "spearman": sps})
    print(curve[-1], flush=True)
res["curve"] = curve
Q.dump("q_ft.json", res, indent=1)
print("done")
