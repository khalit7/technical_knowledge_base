"""Union-find on the running example, exactly as datatrove 0.10.1 runs it, recorded step by step.

1. Candidate pairs: for each of the 14 bands, sort (band signature, doc id) like MinhashDedupBuckets' heap merge and
   emit (previous, current) for every neighbour with an equal band signature (minhash.py:471-480), bands in file order.
2. MinhashDedupCluster's union-find (minhash.py:537-556): recursive path compression, union by size, the root of the
   larger set wins (ties: the first argument's root); every node that is not its root is removed (579-583).
   Checked: the removed set equals run0's remove file.
3. Per cluster: kept document, true Jaccard of every member with the kept one and between all members; what a
   true-Jaccard check at 0.8 against the kept document (Dolma 3's README) would keep; other keep policies.
4. A recorded operation log for the animation (the 25-document banner cluster and two smaller ones).
Writes ../data/out/dp_uf.json.
"""
import os
import pickle
import struct
import sys
from urllib.parse import urlsplit

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import dp_common as P  # noqa: E402

Z = np.load(P.dd_work("pairs.npz"))
sigs = Z["sigs"]
n = sigs.shape[0]
sh = pickle.load(open(P.dd_work("shingles.pkl"), "rb"))["shingles"]
docs = list(P.C.L.run0("filtered"))
hosts = [urlsplit(d.get("metadata", {}).get("url", "")).hostname or "" for d in docs]
lens = [len(d["text"]) for d in docs]
assert len(docs) == n

pairs = []  # (band, a, b)
for band in range(14):
    recs = sorted((tuple(int(v) for v in sigs[i, band * 8:(band + 1) * 8]), i) for i in range(n))
    for (s0, d0), (s1, d1) in zip(recs, recs[1:]):
        if s0 == s1:
            pairs.append((band, d0, d1))
print("candidate pair records", len(pairs), "distinct", len({(a, b) for _, a, b in pairs}))

union_set, set_size = {}, {}
log = []


def parent(x, path):
    path.append(x)
    if x not in union_set or union_set[x] == x:
        union_set[x] = x
        return x
    union_set[x] = parent(union_set[x], path)
    return union_set[x]


for band, a, b in pairs:
    pa, pb = [], []
    ra, rb = parent(a, pa), parent(b, pb)
    op = {"band": band, "a": a, "b": b, "pa": pa, "pb": pb, "joined": None}
    if ra != rb:
        sa, sb = set_size.get(ra, 1), set_size.get(rb, 1)
        if sa < sb:
            ra, rb = rb, ra
        union_set[rb] = ra
        set_size[ra] = sa + sb
        set_size.pop(rb, None)
        op["joined"] = [rb, ra]
    op["parent"] = dict(union_set)
    log.append(op)

removed = sorted(x for x in union_set if parent(x, []) != x)
rem = open(P.C.L.path("run0", "minhash", "remove_ids", "000000.remove"), "rb").read()
run0_removed = sorted(struct.unpack(f"<{len(rem) // 4}I", rem))
print("removed", len(removed), "equal to run0's remove file:", removed == run0_removed)


def jac(x, y):
    u = np.union1d(sh[x], sh[y]).size
    return float(np.intersect1d(sh[x], sh[y]).size / u) if u else 0.0


groups = {}
for x in union_set:
    groups.setdefault(parent(x, []), []).append(x)
clusters = []
for root, mem in groups.items():
    mem = sorted(mem)
    jk = {x: round(jac(x, root), 3) for x in mem if x != root}
    allj = [jac(x, y) for i, x in enumerate(mem) for y in mem[i + 1:]]
    longest = max(mem, key=lambda x: lens[x])
    first = mem[0]
    clusters.append({"kept": root, "members": mem, "hosts": [hosts[x] for x in mem], "lens": [lens[x] for x in mem],
                     "j_to_kept": jk, "j_min": round(min(allj), 3), "j_max": round(max(allj), 3),
                     "check08_removed": sum(1 for v in jk.values() if v >= 0.8),
                     "longest": longest, "first": first})
clusters.sort(key=lambda c: -len(c["members"]))
check = sum(c["check08_removed"] for c in clusters)
print("clusters", len(clusters), "sizes", [len(c["members"]) for c in clusters][:6], "removed with 0.8 check", check)
kept_is_longest = sum(1 for c in clusters if c["kept"] == c["longest"])
kept_is_first = sum(1 for c in clusters if c["kept"] == c["first"])

# animation logs: operations that touch one cluster, with that cluster's parent pointers after each operation
anim = []
for c in clusters[:3] + [c for c in clusters if 1473 in c["members"]]:
    mem = set(c["members"])
    ops = []
    for op in log:
        if op["a"] in mem:
            ops.append({"band": op["band"], "a": op["a"], "b": op["b"], "pa": op["pa"], "pb": op["pb"],
                        "joined": op["joined"], "par": {str(x): op["parent"].get(x, x) for x in sorted(mem)}})
    key = tuple(sorted(mem))
    if any(tuple(sorted(x["members"])) == key for x in anim):
        continue
    anim.append({"members": sorted(mem), "kept": c["kept"], "hosts": {str(x): hosts[x] for x in mem},
                 "j_to_kept": {str(k): v for k, v in c["j_to_kept"].items()}, "ops": ops})
print("animation clusters", [(len(a["members"]), len(a["ops"])) for a in anim])
P.save("dp_uf.json", {"n_docs": n, "pair_records": len(pairs), "distinct_pairs": len({(a, b) for _, a, b in pairs}),
                      "removed": len(removed), "equals_run0": removed == run0_removed,
                      "clusters": [{k: v for k, v in c.items() if k not in ("lens",)} for c in clusters],
                      "removed_with_check08": check, "kept_is_longest": kept_is_longest,
                      "kept_is_first": kept_is_first, "anim": anim})
