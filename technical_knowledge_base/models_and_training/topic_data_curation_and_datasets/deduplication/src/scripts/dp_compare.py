"""The method comparer: the same 2,692 documents through every combination of dedup steps, in one fixed order.

Order (doc-level first, then span-level, as Dolma 3 and NeMo Curator order theirs): exact -> fuzzy -> semantic ->
suffix array. Options: exact {off, on}; fuzzy {off, minhash (datatrove 14 x 8, union-find root kept, exactly as
run0), minhash_check (the same, but a member is removed only if its true Jaccard with the kept document is >= 0.8,
as Dolma 3's README describes), simhash (64-bit, Hamming <= 3, Manku et al.'s setting; lowest index kept)};
semantic {off, eps 0.05, eps 0.1} (SemDeDup rule on arctic-embed-m, 20 k-means clusters fitted on the survivors);
suffix array {off, keep one, remove all} at 230 bytes (about 50 GPT-2 tokens), run with Google's tool on the survivors.
Every step runs on the survivors of the previous ones (signatures and embeddings are per document, so they are reused;
pairs, clusters and suffix arrays are recomputed). Writes ../data/out/dp_compare.json: per combination the documents
removed at each step and, per suffix-array mode, the bytes cut per touched document.
"""
import hashlib
import itertools
import os
import pickle
import sys
import time

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import dp_common as P  # noqa: E402
import dp_sa as SA  # noqa: E402  (write_file, ranges; importing runs nothing when no argv)

t0 = time.time()
docs = [P.C.clean_doc(d) for d in P.C.L.run0("filtered")]
n = len(docs)
raw = [d["text"].encode("utf-8") for d in docs]
Z = np.load(P.dd_work("pairs.npz"))
sigs = Z["sigs"]
sh = pickle.load(open(P.dd_work("shingles.pkl"), "rb"))["shingles"]
E = np.load(P.dd_work("emb.npy"))
S = E @ E.T


def jac(x, y):
    u = np.union1d(sh[x], sh[y]).size
    return np.intersect1d(sh[x], sh[y]).size / u if u else 0.0


def exact(surv):
    seen, rem = {}, set()
    for i in surv:
        h = hashlib.sha1(raw[i]).digest()[:8]
        if h in seen:
            rem.add(i)
        else:
            seen[h] = i
    return rem


def minhash(surv, check=False):
    surv = sorted(surv)
    union_set, size = {}, {}

    def parent(x):
        if x not in union_set or union_set[x] == x:
            union_set[x] = x
            return x
        union_set[x] = parent(union_set[x])
        return union_set[x]

    for band in range(14):
        recs = sorted((tuple(int(v) for v in sigs[i, band * 8:(band + 1) * 8]), i) for i in surv)
        for (s0, d0), (s1, d1) in zip(recs, recs[1:]):
            if s0 != s1:
                continue
            ra, rb = parent(d0), parent(d1)
            if ra != rb:
                sa, sb = size.get(ra, 1), size.get(rb, 1)
                if sa < sb:
                    ra, rb = rb, ra
                union_set[rb] = ra
                size[ra] = sa + sb
                size.pop(rb, None)
    rem = set()
    for x in sorted(union_set):
        p = parent(x)
        if x != p and (not check or jac(x, p) >= 0.8):
            rem.add(x)
    return rem


FP = None


def simhash(surv):
    global FP
    if FP is None:
        bitsel = np.uint64(1) << np.arange(64, dtype=np.uint64)
        FP = np.zeros(n, dtype=np.uint64)
        for i, s in enumerate(sh):
            if s.size:
                v = ((s.reshape(-1, 1) & bitsel) != 0).sum(0) * 2 - s.size
                FP[i] = np.uint64(sum(1 << k for k in range(64) if v[k] > 0))
    surv = sorted(surv)
    par = {x: x for x in surv}

    def f(x):
        while par[x] != x:
            par[x] = par[par[x]]
            x = par[x]
        return x
    fb = FP[surv].view(np.uint8).reshape(len(surv), 8)
    pop8 = np.array([bin(x).count("1") for x in range(256)], dtype=np.uint8)
    for a in range(len(surv)):
        h = pop8[fb[a] ^ fb[a + 1:]].sum(1)
        for b in np.nonzero(h <= 3)[0]:
            ra, rb = f(surv[a]), f(surv[a + 1 + b])
            if ra != rb:
                par[max(ra, rb)] = min(ra, rb)
    return {x for x in surv if f(x) != x}


def semantic(surv, eps):
    from sklearn.cluster import KMeans
    m_all = np.array(sorted(surv))
    lab = KMeans(20, n_init=3, random_state=0).fit_predict(E[m_all])
    rem = set()
    for c in range(20):
        m = m_all[lab == c]
        if len(m) < 2:
            continue
        cen = E[m].mean(0)
        cen /= np.linalg.norm(cen)
        m = m[np.argsort(E[m] @ cen)]
        sub = S[np.ix_(m, m)]
        for r in range(1, len(m)):
            if sub[r, :r].max() >= 1 - eps:
                rem.add(int(m[r]))
    return rem


def suffix(surv):
    surv = sorted(surv)
    fn, st, en, data = SA.write_file("cmp", [raw[i] for i in surv])
    SA.run(["make", "--data-file", fn])
    rs = SA.ranges(fn, 230, st)
    allb, first, keepb = {}, set(), {}
    for a, b, d in rs:
        doc = surv[d]
        allb[doc] = allb.get(doc, 0) + (b - a)
        key = data[a:b]
        if key in first:
            keepb[doc] = keepb.get(doc, 0) + (b - a)
        else:
            first.add(key)
    SA.cleanup()
    return allb, keepb


FUZZY = {"off": lambda s: set(), "minhash": minhash, "minhash_check": lambda s: minhash(s, True), "simhash": simhash}
SEM = {"off": None, "0.05": 0.05, "0.1": 0.1}
out = {"n": n, "bytes": [len(r) for r in raw], "combos": {}}
cache_sa = {}
for ex, fz, se in itertools.product(("off", "on"), FUZZY, SEM):
    surv = set(range(n))
    steps = {}
    r = exact(surv) if ex == "on" else set()
    steps["exact"] = sorted(r)
    surv -= r
    r = FUZZY[fz](surv)
    steps["fuzzy"] = sorted(r)
    surv -= r
    r = semantic(surv, SEM[se]) if SEM[se] else set()
    steps["semantic"] = sorted(r)
    surv -= r
    key = tuple(sorted(surv))
    if key not in cache_sa:
        cache_sa[key] = suffix(surv)
    allb, keepb = cache_sa[key]
    steps["sa_all"] = sorted([[d, b] for d, b in allb.items()])
    steps["sa_keep"] = sorted([[d, b] for d, b in keepb.items()])
    name = f"{ex}|{fz}|{se}"
    out["combos"][name] = steps
    print(name, {k: len(v) for k, v in steps.items()}, "sa bytes all", sum(allb.values()), "keep", sum(keepb.values()),
          round(time.time() - t0), "s", flush=True)
P.save("dp_compare.json", out)
