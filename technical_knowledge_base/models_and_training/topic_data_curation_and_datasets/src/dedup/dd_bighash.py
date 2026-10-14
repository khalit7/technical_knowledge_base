"""Step 3: settings that need more than 112 hashes, measured on the same pairs.

- Dolma 3 web: 26 bands of 11 rows (286 hashes), then a true-Jaccard check at 0.8 (Dolma 3 pool README).
- RefinedWeb: 9,000 hashes as 450 bands of 20 rows (the reading that reproduces its published 76% and 99.4%)
  against the prose reading, 20 bands of 450 rows.
Signatures are datatrove's (same shingles, same permutation code, seed 1) with more hash functions, computed for every
document that appears in a pair kept by dd_pairs.py; all other pairs have Jaccard < 0.05 and cannot become candidates
at these row counts (probability below 1e-14 per pair, see the printout). Writes out/dd_bighash.json.
"""
import os
import pickle
import sys

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import dd_common as C  # noqa: E402
from datatrove.pipeline.dedup.minhash import _mersenne_prime  # noqa: E402

Z = np.load(C.work("pairs.npz"))
pi, pj, jac = Z["i"], Z["j"], Z["jac"]
sh = pickle.load(open(C.work("shingles.pkl"), "rb"))["shingles"]
docs = sorted(set(pi.tolist()) | set(pj.tolist()))
print("documents in kept pairs", len(docs))


def sigs_for(num, seed=1):
    gen = np.random.RandomState(seed)  # exactly MinhashDedupSignature.parameters with num_hashes = num
    a = gen.randint(1, _mersenne_prime, dtype=np.uint64, size=(1, num))
    b = gen.randint(0, _mersenne_prime, dtype=np.uint64, size=(1, num))
    out = {}
    for d in docs:
        s = sh[d].reshape(-1, 1)
        m = np.full(num, np.iinfo(np.uint64).max, dtype=np.uint64)
        for k in range(0, len(s), 1000):
            m = np.minimum(m, ((s[k:k + 1000] * a + b) % _mersenne_prime).min(0))
        out[d] = m
    return out


def P(s, b, r):
    return 1 - (1 - s ** r) ** b


res = {}
for name, b, r in [("d3web", 26, 11), ("rw450x20", 450, 20), ("rw20x450", 20, 450)]:
    S = sigs_for(b * r)
    eq = np.stack([S[x] == S[y] for x, y in zip(pi, pj)])
    est = eq.mean(1)
    c = eq.reshape(len(eq), b, r).all(2).any(1)
    by = []
    for lo in np.round(np.arange(0.5, 1.0, 0.05), 2):
        m = (jac >= lo) & (jac < lo + 0.05 if lo < 0.95 else jac <= 1)
        by.append([float(lo), int(m.sum()), int(c[m].sum()), round(float(sum(P(x, b, r) for x in jac[m])), 2)])
    row = {"b": b, "r": r, "hashes": b * r, "candidates": int(c.sum()), "by_bin": by,
           "cand_J_lt_08": int((c & (jac < 0.8)).sum()), "pairs_J_ge_08": int((jac >= 0.8).sum()),
           "cand_J_ge_08": int((c & (jac >= 0.8)).sum()), "cand_J_eq_1": int((c & (jac >= 0.999)).sum()),
           "pairs_J_eq_1": int((jac >= 0.999).sum()), "est_err_sd": round(float(np.std(est - jac)), 4)}
    if name == "d3web":  # Dolma 3 keeps a candidate only if its true Jaccard is at least 0.8
        row["after_jaccard_check"] = int((c & (jac >= 0.8)).sum())
    res[name] = row
    print(name, {k: v for k, v in row.items() if k != "by_bin"})
    print("   P(candidate) at J=0.05 for this setting:", P(0.05, b, r))
C.save("dd_bighash.json", res)
