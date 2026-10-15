"""The same pair hashed many times: MinHash's estimate and LSH candidacy as random variables.

For 24 real pairs from the running example spanning true Jaccard 0.3 to 0.97 (datatrove 5-gram shingles of run0's
filtered documents), draw 2,000 independent hash families (seeds 1000..2999) of 1,024 functions each with datatrove's
arithmetic, and record for each family: the estimate with k = 16, 112 and 1,024 hashes, and whether the pair becomes a
candidate under 14 bands of 8 (FineWeb), 26 of 11 (Dolma 3 web), 20 of 5 and 9 of 13.
Writes ../data/out/dp_seeds.json: per pair the histogram of the k = 112 estimate, the spread at each k, and the
measured candidate rate per setting next to 1 - (1 - J^r)^b.
"""
import os
import pickle
import sys
import time

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import dp_common as P  # noqa: E402

MP = np.uint64((1 << 61) - 1)
SEEDS = range(1000, 3000)
K = 1024
SETTINGS = [(14, 8), (26, 11), (20, 5), (9, 13)]
t0 = time.time()
sh = pickle.load(open(P.dd_work("shingles.pkl"), "rb"))["shingles"]
Z = np.load(P.dd_work("pairs.npz"))
ai, aj, ajac = Z["all_i"], Z["all_j"], Z["all_jac"].astype(float)

# pick pairs: for each target J, the pair closest to it among pairs whose documents are not yet used
targets = np.round(np.linspace(0.3, 0.97, 24), 3)
used, chosen = set(), []
for t in targets:
    order = np.argsort(np.abs(ajac - t))
    for k in order:
        x, y = int(ai[k]), int(aj[k])
        if x in used or y in used or abs(ajac[k] - t) > 0.05:
            continue
        u = np.union1d(sh[x], sh[y]).size
        if u > 3000:  # keep the run cheap
            continue
        chosen.append((x, y, np.intersect1d(sh[x], sh[y]).size / u, u))
        used.update((x, y))
        break
print("pairs", len(chosen))

res = []
for x, y, j, u in chosen:
    est = {16: [], 112: [], 1024: []}
    cand = {f"{b}x{r}": 0 for b, r in SETTINGS}
    sx, sy = sh[x].reshape(-1, 1), sh[y].reshape(-1, 1)
    for s in SEEDS:
        g = np.random.RandomState(s)
        a = g.randint(1, MP, dtype=np.uint64, size=(1, K))
        b = g.randint(0, MP, dtype=np.uint64, size=(1, K))
        eq = np.min((sx * a + b) % MP, axis=0) == np.min((sy * a + b) % MP, axis=0)
        for k in est:
            est[k].append(eq[:k].mean())
        for bb, r in SETTINGS:
            cand[f"{bb}x{r}"] += int(eq[:bb * r].reshape(bb, r).all(1).any())
    e112 = np.array(est[112])
    hist = np.bincount(np.round(e112 * 112).astype(int), minlength=113).tolist()
    res.append({"a": x, "b": y, "j": round(j, 4), "union": u,
                "sd": {str(k): round(float(np.std(v)), 4) for k, v in est.items()},
                "mean": {str(k): round(float(np.mean(v)), 4) for k, v in est.items()},
                "hist112": hist,
                "cand": {k: round(v / len(SEEDS), 4) for k, v in cand.items()},
                "formula": {f"{bb}x{r}": round(1 - (1 - j ** r) ** bb, 4) for bb, r in SETTINGS}})
    print(round(j, 3), res[-1]["sd"], res[-1]["cand"]["14x8"], res[-1]["formula"]["14x8"], round(time.time() - t0), "s")
P.save("dp_seeds.json", {"n_seeds": len(SEEDS), "K": K, "settings": [f"{b}x{r}" for b, r in SETTINGS], "pairs": res})
