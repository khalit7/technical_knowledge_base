"""Updates and deletes in HNSW (deterministic, no timing), on SciFact Qwen3 (5,183): hnswlib's markDelete leaves a
tombstone; searches still walk through deleted nodes but never return them, exactly like a filter
(searchBaseLayerST lines 311-440). Measured: recall@10 against the exact top 10 of the live rows and distance
computations per query (port on the same graph), for 0 to 70% deleted, against a graph rebuilt on the live rows;
then the deleted slots re-used for new vectors (replace_deleted=True) and the recall on the new collection.
Output: $RAG_SCRATCH/vix/out/updates.json"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import hnswlib
import numpy as np

import pyhnsw
import vixlib as V

X, Q, *_ = V.beir_set("scifact", "qwen3-emb-0.6b")
n = len(X)
R = {"asof": V.stamp(), "n": n, "M": 16, "efc": 200, "rows": []}


def build(Xb, allow_replace=False, name="u"):
    p = hnswlib.Index(space="ip", dim=Xb.shape[1])
    p.init_index(max_elements=len(Xb), M=16, ef_construction=200, random_seed=100, allow_replace_deleted=allow_replace)
    p.set_num_threads(1)
    p.add_items(Xb, np.arange(len(Xb)))
    return p


def port_of(p, Xb, name):
    f = os.path.join(V.WORK, "upd_%s.bin" % name)
    p.save_index(f)
    H = pyhnsw.read_hnswlib(f)
    P = pyhnsw.HNSW(Xb, M=16, ef_construction=200)
    P.links, P.levels, P.ep, P.maxlevel = H["links"], H["levels"], H["ep"], H["maxlevel"]
    return P


base = build(X)
Pb = port_of(base, X, "base")
rng = np.random.default_rng(0)
perm = rng.permutation(n)
for frac in (0.0, 0.1, 0.3, 0.5, 0.7):
    dele = perm[:int(frac * n)]
    alive = np.ones(n, bool); alive[dele] = False
    live = np.flatnonzero(alive)
    GT = live[V.exact_topk(X[live], Q)[0][:, :10]]
    row = {"deleted_share": frac, "live": int(alive.sum())}
    for ef in (10, 40, 100):
        res, nd = [], []
        for q in Q:
            ids, d, _ = pyhnsw.filtered_search(Pb, q, alive, 10, ef)
            res.append(ids); nd.append(d)
        row["tomb_ef%d" % ef] = {"recall10": V.r4(V.recall_at(np.array(res), GT)), "ndis": V.r4(np.mean(nd))}
    # hnswlib itself with mark_deleted: same answers?
    p = build(X)
    for i in dele:
        p.mark_deleted(int(i))
    p.set_ef(40)
    I, _ = p.knn_query(Q, k=10)
    row["hnswlib_tomb_ef40_recall10"] = V.r4(V.recall_at(I, GT))
    # rebuilt on the live rows only
    Xl = X[live]
    pr = build(Xl)
    Pr = port_of(pr, Xl, "reb")
    for ef in (10, 40, 100):
        res, nd = [], []
        for q in Q:
            Pr.ndis = 0
            ids, _ = Pr.search(q, 10, ef)
            res.append([int(live[i]) for i in ids]); nd.append(Pr.ndis)
        row["rebuilt_ef%d" % ef] = {"recall10": V.r4(V.recall_at(np.array(res), GT)), "ndis": V.r4(np.mean(nd))}
    R["rows"].append(row)
    print(row)

# re-use: delete 30%, then insert the same number of NFCorpus vectors into the freed slots (replace_deleted=True)
XN, _, _, _, _ = V.beir_set("nfcorpus", "qwen3-emb-0.6b")
p = build(X, allow_replace=True)
k = int(0.3 * n)
dele = perm[:k]
for i in dele:
    p.mark_deleted(int(i))
newv = XN[:k]
p.add_items(newv, np.arange(n, n + k), replace_deleted=True)
lab = np.array(p.get_ids_list())
Xnow = np.vstack([X[np.setdiff1d(np.arange(n), dele)], newv])
labs_now = np.concatenate([np.setdiff1d(np.arange(n), dele), np.arange(n, n + k)])
GTi = V.exact_topk(Xnow, Q)[0][:, :10]
GT = labs_now[GTi]
out = {"deleted": k, "inserted_nfcorpus": k, "elements": int(p.get_current_count()), "max_elements": int(p.get_max_elements())}
for ef in (10, 40, 100):
    p.set_ef(ef)
    I, _ = p.knn_query(Q, k=10)
    out["ef%d_recall10" % ef] = V.r4(V.recall_at(I, GT))
pf = build(Xnow)
for ef in (10, 40, 100):
    pf.set_ef(ef)
    I, _ = pf.knn_query(Q, k=10)
    out["fresh_ef%d_recall10" % ef] = V.r4(V.recall_at(labs_now[I], GT))
R["replace_deleted"] = out
print(out)
V.save("updates", R)
