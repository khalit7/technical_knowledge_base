"""Step 1 of the MinHash measurements: every pair of run0's 2,692 filtered documents (the MinHash stage's input).

For each document: datatrove's own shingles (5-word n-grams of simplified text, 64-bit hashes) and its 112-value
MinHash signature, recomputed with datatrove's MinhashDedupSignature and checked against run0's signature files.
For every pair: exact Jaccard similarity of the shingle sets (sparse matrix product), the number of equal signature
values, and a 112-bit equality mask for pairs that could matter (Jaccard >= 0.05 or >= 2 equal values).
Writes $DC_SCRATCH/dedup/pairs.npz and shingles.pkl (large; not committed).
"""
import glob
import os
import pickle
import struct
import time

import numpy as np
import scipy.sparse as sp

import sys; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import dd_common as C  # noqa: E402

t0 = time.time()
docs = [C.clean_doc(d) for d in C.L.run0("filtered")]
n = len(docs)
print("docs", n)
sg = C.signer()
shingles = [np.unique(sg.get_shingles(d["text"]).ravel()) for d in docs]
sigs = np.zeros((n, 112), dtype=np.uint64)
for i, s in enumerate(shingles):
    if s.size:
        sigs[i] = np.concatenate(sg.get_signature(s.reshape(-1, 1)))
print("signatures", round(time.time() - t0, 1), "s")

# check against run0's own signature files (bucket b holds 8 uint64 + uint32 doc index per record, sorted)
ok = 0
for b in range(14):
    raw = open(C.L.path("run0", "minhash", "sigs", f"bucket_{b:03d}", "00000.minhash.sig"), "rb").read()
    rec = struct.Struct("<8QI")
    for k in range(len(raw) // rec.size):
        v = rec.unpack_from(raw, k * rec.size)
        ok += int(tuple(int(x) for x in sigs[v[8], b * 8:(b + 1) * 8]) == v[:8])
print("signature values matching run0 files:", ok, "of", 14 * n)

# exact Jaccard for all pairs via a sparse doc x shingle matrix
allsh = np.unique(np.concatenate([s for s in shingles if s.size]))
rows = np.concatenate([np.full(s.size, i) for i, s in enumerate(shingles)])
cols = np.concatenate([np.searchsorted(allsh, s) for s in shingles])
X = sp.csr_matrix((np.ones(rows.size, dtype=np.float32), (rows, cols)), shape=(n, allsh.size))
sizes = np.array([s.size for s in shingles])
I = (X @ X.T).tocoo()
m = I.row < I.col
ii, jj, inter = I.row[m], I.col[m], I.data[m].astype(np.int64)
jac = inter / (sizes[ii] + sizes[jj] - inter)
print("pairs sharing a shingle", ii.size, "of", n * (n - 1) // 2)

# equal signature values for every pair (chunked), masks for the pairs that could matter
keep_i, keep_j, keep_eq, keep_mask = [], [], [], []
eqcount_all = np.zeros(113, dtype=np.int64)
for i in range(n - 1):
    eq = sigs[i + 1:] == sigs[i]
    cnt = eq.sum(1)
    np.add.at(eqcount_all, cnt, 1)
    sel = np.nonzero(cnt >= 2)[0]
    for k in sel:
        keep_i.append(i); keep_j.append(i + 1 + k); keep_eq.append(cnt[k])
        keep_mask.append(np.packbits(eq[k]))
jmap = {(a, b): v for a, b, v in zip(ii.tolist(), jj.tolist(), jac.tolist())}
# add pairs with Jaccard >= 0.05 that have fewer than 2 equal values
have = set(zip(keep_i, keep_j))
for a, b, v in zip(ii.tolist(), jj.tolist(), jac.tolist()):
    if v >= 0.05 and (a, b) not in have:
        eq = sigs[a] == sigs[b]
        keep_i.append(a); keep_j.append(b); keep_eq.append(int(eq.sum())); keep_mask.append(np.packbits(eq))
pi, pj = np.array(keep_i), np.array(keep_j)
pjac = np.array([jmap.get((a, b), 0.0) for a, b in zip(keep_i, keep_j)])
np.savez_compressed(C.work("pairs.npz"), i=pi, j=pj, eq=np.array(keep_eq), mask=np.array(keep_mask), jac=pjac,
                    sigs=sigs, sizes=sizes, eqcount_all=eqcount_all, all_i=ii, all_j=jj, all_jac=jac.astype(np.float32))
pickle.dump({"ids": [d["id"] for d in docs], "shingles": shingles}, open(C.work("shingles.pkl"), "wb"))
print("kept pairs", pi.size, "| Jaccard histogram (0.1 bins, pairs sharing a shingle):",
      np.histogram(jac, bins=np.linspace(0, 1, 11))[0].tolist())
print("done", round(time.time() - t0, 1), "s")
