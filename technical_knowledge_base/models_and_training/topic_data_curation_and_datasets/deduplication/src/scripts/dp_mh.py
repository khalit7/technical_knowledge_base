"""MinHash in depth on the running example: estimator variance and masks for the band designer.

Reads the root lab's shingles.pkl and pairs.npz (dd_pairs.py: datatrove's 5-gram shingles of run0's 2,692 filtered
documents, true Jaccard of every pair that shares a shingle). Computes a fresh 1,024-hash signature per document with
datatrove's own universal-hash family ((a*x + b) mod 2^61-1, a and b drawn by RandomState) but seed 2, so it is
independent of the seed-1 signatures the root lab used to select pairs.

Writes ../data/out/dp_mh.json:
- variance: for k = 16 ... 1,024 hashes, the spread of the estimate (equal values / k) around the true Jaccard, per
  Jaccard bin, against the binomial prediction sqrt(J(1-J)/k), over every pair that shares a shingle (19,675);
- masks: 1,024-bit equality masks (base64) for every pair with Jaccard >= 0.01 and < 1 (pairs at 1 are all ones);
- jhist: counts of the remaining pairs (Jaccard < 0.01) in 0.001 bins, for expected-candidate sums;
- the number of pairs with no shared shingle (never candidates).
"""
import base64
import os
import pickle
import sys
import time

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import dp_common as P  # noqa: E402

MP = np.uint64((1 << 61) - 1)
K = 1024
t0 = time.time()
sh = pickle.load(open(P.dd_work("shingles.pkl"), "rb"))
Z = np.load(P.dd_work("pairs.npz"))
shingles = sh["shingles"]
n = len(shingles)
gen = np.random.RandomState(2)
a = gen.randint(1, MP, dtype=np.uint64, size=(1, K))
b = gen.randint(0, MP, dtype=np.uint64, size=(1, K))
sig = np.zeros((n, K), dtype=np.uint64)
for i, s in enumerate(shingles):
    if s.size:
        sig[i] = np.min((s.reshape(-1, 1) * a + b) % MP, axis=0)  # same arithmetic as datatrove minhash.py:182
print("signatures", round(time.time() - t0, 1), "s")
np.save(P.work("sig1024_seed2.npy"), sig)

ai, aj, ajac = Z["all_i"], Z["all_j"], Z["all_jac"].astype(np.float64)
# exact Jaccard is float32 in the file: recompute exactly for the masks we keep
def jac_exact(x, y):
    u = np.union1d(shingles[x], shingles[y]).size
    return np.intersect1d(shingles[x], shingles[y]).size / u if u else 0.0

eq = np.zeros((ai.size, K), dtype=bool)
for k in range(ai.size):
    eq[k] = sig[ai[k]] == sig[aj[k]]
print("equality masks", round(time.time() - t0, 1), "s")

ks = [16, 32, 64, 112, 128, 256, 286, 512, 1024]
bins = np.round(np.arange(0, 1.0001, 0.1), 1)
var = {"k": ks, "bins": bins.tolist(), "rows": []}
for k in ks:
    est = eq[:, :k].mean(1)
    row = {"k": k, "bins": []}
    for lo, hi in zip(bins[:-1], bins[1:]):
        m = (ajac >= lo) & ((ajac < hi) if hi < 1 else (ajac < 1))
        if m.sum() < 5:
            row["bins"].append(None)
            continue
        err = est[m] - ajac[m]
        pred = np.sqrt(np.mean(ajac[m] * (1 - ajac[m])) / k)
        row["bins"].append({"n": int(m.sum()), "sd": round(float(err.std()), 4), "bias": round(float(err.mean()), 4),
                            "pred": round(float(pred), 4)})
    m = ajac < 1
    z = (est[m] - ajac[m]) / np.sqrt(np.maximum(ajac[m] * (1 - ajac[m]), 1e-12) / k)
    row["outside2sd"] = round(float(np.mean(np.abs(z) > 2)), 4)
    row["n"] = int(m.sum())
    var["rows"].append(row)
    print("k", k, "outside 2 sd", row["outside2sd"])

# worked example for the text: pairs near J = 0.75 at k = 112
m = (ajac >= 0.7) & (ajac <= 0.8)
est112 = eq[m][:, :112].mean(1)
var["near075"] = {"n": int(m.sum()), "min_est": round(float(est112.min()), 3), "max_est": round(float(est112.max()), 3),
                  "j_min": round(float(ajac[m].min()), 3), "j_max": round(float(ajac[m].max()), 3)}

keep = (ajac >= 0.01) & (ajac < 0.9999999)
masks = []
for k in np.nonzero(keep)[0]:
    je = jac_exact(ai[k], aj[k])
    masks.append([int(ai[k]), int(aj[k]), round(je, 4), base64.b64encode(np.packbits(eq[k]).tobytes()).decode()])
ones = int(((ajac >= 0.9999999)).sum())
low = ajac[ajac < 0.01]
jh = np.bincount(np.floor(low * 1000).astype(int), minlength=10)[:10]
npairs = n * (n - 1) // 2
P.save("dp_mh.json", {"K": K, "seed": 2, "n_docs": n, "n_pairs": npairs, "n_share": int(ai.size),
                      "n_none": int(npairs - ai.size), "ones": ones, "masks": masks, "jhist_lt001": jh.tolist(),
                      "jlow_sum": round(float(low.sum()), 4), "variance": var})
print("masks", len(masks), "ones", ones, "done", round(time.time() - t0, 1), "s")
