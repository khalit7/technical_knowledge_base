"""SimHash (Charikar 2002; Manku et al. 2007) on the running example, next to MinHash on the same pairs.

Features: datatrove's 64-bit hashes of the 5-word shingles of run0's 2,692 filtered documents (the same sets MinHash
uses), each counted once (set semantics, like MinHash). Fingerprint bit i = 1 when more shingles have bit i set than
not (sum of +1/-1 per shingle > 0). For every pair: Hamming distance between the 64-bit fingerprints.
Theory: bit i of the fingerprint is the sign of a random +/-1 projection of the shingle indicator vector, so two
documents disagree on a bit with probability theta/pi, theta = arccos(|A & B| / sqrt(|A| |B|)) (the cosine of the sets).
Writes ../data/out/dp_simhash.json: candidates, recall at Jaccard >= 0.8 and pairs below 0.5 for each Hamming
threshold k; expected vs measured Hamming by cosine bin; the 661 pairs with Jaccard >= 0.01 as (J, cosine, Hamming).
"""
import os
import pickle
import sys
import time

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import dp_common as P  # noqa: E402

t0 = time.time()
sh = pickle.load(open(P.dd_work("shingles.pkl"), "rb"))["shingles"]
Z = np.load(P.dd_work("pairs.npz"))
n = len(sh)
bitsel = (np.uint64(1) << np.arange(64, dtype=np.uint64))
fp = np.zeros(n, dtype=np.uint64)
for i, s in enumerate(sh):
    if not s.size:
        continue
    bits = ((s.reshape(-1, 1) & bitsel) != 0)  # shingles x 64
    v = bits.sum(0) * 2 - s.size
    f = 0
    for k in range(64):
        if v[k] > 0:
            f |= 1 << k
    fp[i] = np.uint64(f)
print("fingerprints", round(time.time() - t0, 2), "s")

# Hamming distance of every pair (upper triangle), via byte popcount table
pop8 = np.array([bin(x).count("1") for x in range(256)], dtype=np.uint8)
ham = np.zeros((n, n), dtype=np.uint8)
fb = fp.view(np.uint8).reshape(n, 8)
for i in range(n):
    ham[i] = pop8[fb[i] ^ fb].sum(1)
iu = np.triu_indices(n, 1)
H = ham[iu]
print("hamming all pairs", round(time.time() - t0, 2), "s")

# Jaccard and cosine for pairs sharing a shingle; others are 0 and 0
J = np.zeros((n, n), dtype=np.float32)
ai, aj, ajac = Z["all_i"], Z["all_j"], Z["all_jac"]
J[ai, aj] = ajac
Jp = J[iu]
sizes = np.array([s.size for s in sh], dtype=np.float64)
inter = ajac * (sizes[ai] + sizes[aj]) / (1 + ajac)
cosv = inter / np.sqrt(np.maximum(sizes[ai] * sizes[aj], 1))
C = np.zeros((n, n), dtype=np.float32)
C[ai, aj] = cosv
Cp = C[iu]

hi = Jp >= 0.8
lo = Jp < 0.5
rows = []
for k in range(0, 17):
    c = H <= k
    rows.append({"k": k, "cand": int(c.sum()), "recall08": round(float(c[hi].mean()), 4), "hit08": int(c[hi].sum()),
                 "below05": int((c & lo).sum()), "zero_overlap": int((c & (Jp == 0)).sum())})
    print(rows[-1])

# expected Hamming from the cosine (random-hyperplane argument) vs measured, by cosine bin, over pairs sharing a shingle
share = Cp > 0
bins = np.round(np.arange(0, 1.0001, 0.1), 1)
cmp = []
for lo_, hi_ in zip(bins[:-1], bins[1:]):
    m = share & (Cp >= lo_) & ((Cp < hi_) if hi_ < 1 else (Cp <= 1.0001))
    if m.sum() < 3:
        continue
    exp = 64 * np.arccos(np.clip(Cp[m], -1, 1)) / np.pi
    cmp.append({"c": float(lo_), "n": int(m.sum()), "measured": round(float(H[m].mean()), 2), "expected": round(float(exp.mean()), 2)})
# pairs with no shared shingle: cosine 0, expected Hamming 32
z = ~share
cmp_zero = {"n": int(z.sum()), "measured_mean": round(float(H[z].mean()), 3), "sd": round(float(H[z].std()), 3),
            "expected": 32, "expected_sd": 4.0, "min": int(H[z].min())}
print(cmp, cmp_zero)
pts = [[round(float(j), 3), round(float(c), 3), int(h)] for j, c, h in zip(Jp[Jp >= 0.01], Cp[Jp >= 0.01], H[Jp >= 0.01])]
P.save("dp_simhash.json", {"n_docs": n, "n_pairs": int(H.size), "pairs_ge08": int(hi.sum()), "rows": rows,
                           "by_cos": cmp, "no_overlap": cmp_zero, "pts": pts,
                           "hist_no_overlap": np.bincount(H[z], minlength=65).tolist()})
print("done", round(time.time() - t0, 1), "s")
