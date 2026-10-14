"""Data for the IVF-PQ lab: a real FAISS IndexIVFPQ on SciFact (5,183 abstracts, Qwen3-Embedding 1,024-d; nlist 72,
m 16 sub-vectors of 64 dims, 8 bits, seed 1234), the codes of every abstract, and for four test claims the
similarity to each centroid, the 16 x 256 lookup table, and the exact similarity to every abstract. The page's
JavaScript scores candidates from these exactly as FAISS does (inner product, by residual:
score = <q, centroid> + sum over m of table[m][code[m]]); this script checks that recomputation against FAISS.
Output: ../data/ivfpq_anim.json"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import base64
import json

import faiss
import numpy as np

import vixlib as V

faiss.omp_set_num_threads(2)
X, Q, ids, tq, qrels = V.beir_set("scifact", "qwen3-emb-0.6b")
corpus, queries, _ = V.L.beir("scifact")
n, d = X.shape
NL, M = 72, 16
ix = faiss.IndexIVFPQ(faiss.IndexFlatIP(d), d, NL, M, 8, faiss.METRIC_INNER_PRODUCT)
ix.cp.seed = 1234
ix.train(X); ix.add(X)
cent = ix.quantizer.reconstruct_n(0, NL)
assign = ix.quantizer.search(X, 1)[1][:, 0]
inv = faiss.extract_index_ivf(ix).invlists
codes = np.zeros((n, M), dtype=np.uint8)
for l in range(NL):
    sz = inv.list_size(l)
    if sz == 0:
        continue
    lid = faiss.rev_swig_ptr(inv.get_ids(l), sz).copy()
    cd = faiss.rev_swig_ptr(inv.get_codes(l), sz * M).copy().reshape(sz, M)
    codes[lid] = cd
pq = ix.pq
cb = faiss.vector_to_array(pq.centroids).reshape(M, 256, d // M)
GT = V.exact_topk(X, Q)[0][:, :10]

# four claims chosen by what happens to them (first test claim, in golden-set order, meeting each condition):
# an easy one; one whose true neighbours sit in other cells at nprobe 1; one where PQ alone loses neighbours that
# rescoring recovers; one that stays hard at nprobe 8
cent0 = ix.quantizer.reconstruct_n(0, NL)
def per_query(qi):
    q = Q[qi]; cs = cent0 @ q; order = np.argsort(-cs)
    T = np.einsum("msd,md->ms", cb, q.reshape(M, d // M)); ex = X @ q; g = set(GT[qi].tolist()); r = {}
    for p_ in (1, 8):
        cand = np.flatnonzero(np.isin(assign, order[:p_]))
        ap = cs[assign[cand]] + T[np.arange(M)[None, :], codes[cand]].sum(1)
        r[p_] = (len(g & set(cand[np.argsort(-ex[cand])[:10]].tolist())) / 10, len(g & set(cand[np.argsort(-ap)[:10]].tolist())) / 10)
    return r
st = [per_query(i) for i in range(len(Q))]
conds = [lambda r: r[1][0] == 1 and r[1][1] >= 0.7, lambda r: r[1][0] <= 0.5 and r[8][0] == 1,
         lambda r: r[8][0] == 1 and r[8][1] <= 0.7, lambda r: r[8][0] <= 0.7]
print("counts", [sum(c(r) for r in st) for c in conds], np.mean([r[1][0] for r in st]), np.mean([r[8][0] for r in st]), np.mean([r[8][1] for r in st])); pick = []
for c in conds:
    pick.append(next(i for i in range(len(Q)) if c(st[i]) and i not in pick))
print("picked", pick, [st[i] for i in pick])
qs = []
maxerr = 0.0
for qi in pick:
    q = Q[qi]
    cs = cent @ q
    T = np.einsum("msd,md->ms", cb, q.reshape(M, d // M))
    approx_all = cs[assign] + T[np.arange(M)[None, :], codes].sum(1)
    ix.nprobe = 8
    Df, If = ix.search(q[None], 200)
    for dist, j in zip(Df[0], If[0]):
        if j >= 0:
            maxerr = max(maxerr, abs(float(dist) - float(approx_all[j])))
    exact = X @ q
    rel = list(qrels.get(tq[qi], {}).keys())
    qs.append({"qi": qi, "qid": tq[qi], "text": queries[tq[qi]], "cs": [round(float(x), 4) for x in cs],
               "T": base64.b64encode(np.round(T * 30000).astype(np.int16).tobytes()).decode(),
               "_exact": exact,
               "gt": GT[qi].tolist(), "rel": [ids.index(r) for r in rel if r in ids]})
print("max |FAISS - recomputed| over 200 results x 4 queries:", maxerr)

# keep only the abstracts that can be candidates (members of each claim's 8 nearest cells)
sub = set()
for qq in qs:
    sub |= set(np.flatnonzero(np.isin(assign, np.argsort(-np.array(qq["cs"]))[:8])).tolist())
sub = np.array(sorted(sub))
for qq in qs:
    qq["exact"] = base64.b64encode(np.round(qq.pop("_exact")[sub] * 30000).astype(np.int16).tobytes()).decode()
    qq["gt"] = [int(np.searchsorted(sub, j)) if j in set(sub.tolist()) else -1 for j in qq["gt"]]
    qq["rel"] = [int(np.searchsorted(sub, j)) for j in qq["rel"] if j in set(sub.tolist())]
codes_s, assign_s = codes[sub], assign[sub]
# the recall the JS must reproduce (int16-rounded tables give the same top 10 within rounding), per nprobe
check = {}
for qq in qs:
    T = np.frombuffer(base64.b64decode(qq["T"]), dtype=np.int16).reshape(M, 256) / 30000
    ex = np.frombuffer(base64.b64decode(qq["exact"]), dtype=np.int16) / 30000
    cs = np.array(qq["cs"])
    order = np.argsort(-cs)
    row = {}
    for p in (1, 2, 4, 8):
        cand = np.flatnonzero(np.isin(assign_s, order[:p]))
        ap = cs[assign_s[cand]] + T[np.arange(M)[None, :], codes_s[cand]].sum(1)
        top_pq = cand[np.argsort(-ap, kind="stable")[:10]]
        top_fl = cand[np.argsort(-ex[cand], kind="stable")[:10]]
        sl = cand[np.argsort(-ap, kind="stable")[:100]]
        top_rs = sl[np.argsort(-ex[sl], kind="stable")[:10]]
        g = set(qq["gt"])
        row[str(p)] = {"cand": int(len(cand)), "gt_outside": sum(1 for j in qq["gt"] if j < 0), "flat": len(g & set(top_fl.tolist())) / 10, "pq": len(g & set(top_pq.tolist())) / 10,
                       "rescore": len(g & set(top_rs.tolist())) / 10}
    check[qq["qid"]] = row
    print(qq["qid"], row)
need = set()
for qq in qs:
    need |= set(j for j in qq["gt"] if j >= 0) | set(qq["rel"])
    ex = np.frombuffer(base64.b64decode(qq["exact"]), dtype=np.int16) / 30000
    need |= set(np.argsort(-ex)[:40].tolist())
titles = {str(j): corpus[ids[sub[j]]]["title"][:110] for j in sorted(need)}
out = {"asof": V.stamp(), "faiss": faiss.__version__, "n": n, "d": d, "nlist": NL, "m": M, "ksub": 256, "dsub": d // M, "scale": 30000,
       "list_sizes": [int(inv.list_size(l)) for l in range(NL)],
       "sub_n": int(len(sub)), "gt_note": "gt holds sub-indices; -1 = a true neighbour outside every claim's 8 nearest cells",
       "assign": base64.b64encode(assign_s.astype(np.uint8).tobytes()).decode(),
       "codes": base64.b64encode(codes_s.tobytes()).decode(), "queries": qs, "titles": titles, "check": check,
       "recompute_max_abs_err": float(maxerr)}
json.dump(out, open(os.path.join(V.DATA, "ivfpq_anim.json"), "w"), separators=(",", ":"))
print("bytes", os.path.getsize(os.path.join(V.DATA, "ivfpq_anim.json")))
