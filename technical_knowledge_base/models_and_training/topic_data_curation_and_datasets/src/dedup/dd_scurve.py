"""Step 2: the LSH S-curve against measured pairs, clusters, and RefinedWeb's two readings.

Reads $DC_SCRATCH/dedup/pairs.npz (dd_pairs.py). Writes out/dd_pairs.json (every pair that could become a candidate
for any setting with at least 2 rows per band: its Jaccard, its 112-bit equality mask), out/dd_scurve.json
(measured candidate rates per Jaccard bin for the published settings) and $DC_SCRATCH/dedup/clusters.json.
"""
import json
import os
import pickle
import struct
import sys

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import dd_common as C  # noqa: E402

Z = np.load(C.work("pairs.npz"))
pi, pj, jac, masks = Z["i"], Z["j"], Z["jac"], Z["mask"]
eqs = np.unpackbits(masks, axis=1)[:, :112].astype(bool)
sh = pickle.load(open(C.work("shingles.pkl"), "rb"))
ids = sh["ids"]
n = len(ids)
npairs = n * (n - 1) // 2


def cand(eq, b, r):
    """candidate pairs under b bands of r rows, bands taken as consecutive slices like datatrove's np.split"""
    return eq[:, :b * r].reshape(len(eq), b, r).all(2).any(1)


def P(s, b, r):
    return 1 - (1 - s ** r) ** b


bins = np.round(np.arange(0, 1.0001, 0.05), 2)
out = {"n_docs": n, "n_pairs": npairs, "bins": bins.tolist(), "settings": {}}
# pairs not in the kept set have Jaccard < 0.05 and at most 1 equal value: never candidates for r >= 2
low = int(npairs - len(pi))
for name, b, r in [("fw", 14, 8), ("d3pdf", 14, 5), ("b8r14", 8, 14)]:
    c = cand(eqs, b, r)
    rows = []
    for k in range(len(bins) - 1):
        lo, hi = bins[k], bins[k + 1]
        m = (jac >= lo) & ((jac < hi) if k < len(bins) - 2 else (jac <= hi))
        cnt = int(m.sum()) + (low if k == 0 else 0)
        rows.append([float(lo), cnt, int(c[m].sum()), round(float(sum(P(x, b, r) for x in jac[m])), 2)])
    out["settings"][name] = {"b": b, "r": r, "rows": rows, "candidates": int(c.sum()),
                             "cand_below_05": int((c & (jac < 0.5)).sum()),
                             "missed_above_08": int((~c & (jac >= 0.8)).sum()), "pairs_above_08": int((jac >= 0.8).sum())}
    print(name, out["settings"][name]["candidates"], "candidates;", out["settings"][name]["cand_below_05"],
          "below J 0.5;", out["settings"][name]["missed_above_08"], "missed of", out["settings"][name]["pairs_above_08"], ">= 0.8")

# clusters from FineWeb's 14 x 8 candidates (union-find, like MinhashDedupCluster), checked against run0
c = cand(eqs, 14, 8)
par = list(range(n))


def find(x):
    while par[x] != x:
        par[x] = par[par[x]]
        x = par[x]
    return x


for a, b in zip(pi[c], pj[c]):
    ra, rb = find(a), find(b)
    if ra != rb:
        par[rb] = ra
groups = {}
for x in range(n):
    groups.setdefault(find(x), []).append(x)
clusters = [g for g in groups.values() if len(g) > 1]
removed_here = sum(len(g) - 1 for g in clusters)
rem = open(C.L.path("run0", "minhash", "remove_ids", "000000.remove"), "rb").read()
run0_removed = set(struct.unpack(f"<{len(rem) // 4}I", rem))
in_clusters = {x for g in clusters for x in g}
print("clusters", len(clusters), "docs in clusters", len(in_clusters), "removed (one kept per cluster)", removed_here,
      "| run0 removed", len(run0_removed), "all inside our clusters:", run0_removed <= in_clusters)
out["clusters"] = {"n": len(clusters), "docs": len(in_clusters), "removed": removed_here, "run0_removed": len(run0_removed),
                   "sizes": sorted([len(g) for g in clusters], reverse=True)}
json.dump({"clusters": clusters, "run0_removed": sorted(run0_removed)}, open(C.work("clusters.json"), "w"))

# pairs for the page: every pair with >= 2 equal values or Jaccard >= 0.05 (dd_pairs.py kept exactly those)
pairs = [[int(a), int(b), round(float(j), 3), bytes(m).hex()] for a, b, j, m in zip(pi, pj, jac, masks)]
out["n_embedded_pairs"] = len(pairs)
out["low_pairs"] = low
C.save("dd_pairs.json", {"n_docs": n, "n_pairs": npairs, "pairs": pairs})
C.save("dd_scurve.json", out)
