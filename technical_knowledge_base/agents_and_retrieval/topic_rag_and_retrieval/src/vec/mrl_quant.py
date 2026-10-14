"""Matryoshka truncation x precision (float32, int8, binary) x rescoring, on SciFact test (300 claims).
Deterministic, CPU, no lock. Writes out/mrl_quant.json.
- truncation: first d dims, re-normalised (Qwen3-Embedding is trained for it, MRL 32..1024; bge-small and
  gte-modernbert are not).
- int8: per-dimension min/max calibrated on the corpus vectors, each value mapped to one of 256 levels.
  "int8": the float query is compared with the decoded corpus (FAISS SQ8 style, asymmetric).
  "int8-sym": the query is quantised with the same ranges and the score is the integer dot of the codes.
- binary: sign bit per dimension; score = dot of +-1 vectors (= d - 2 x Hamming distance, same order).
- rescoring: take the top R by the compressed score, rescore those R with the full float32 vectors
  (all 1,024 dims for Qwen3), as engines that keep the originals on disk do.
Ties are broken by corpus index (binary codes tie often at small d)."""
import os, sys; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
from common import scifact, topk, to_run, evaluate, ann_recall, save


def trunc(V, d):
    if d == V.shape[1]:
        return np.ascontiguousarray(V, dtype=np.float32)
    W = np.ascontiguousarray(V[:, :d], dtype=np.float32)
    return W / np.linalg.norm(W, axis=1, keepdims=True)


def int8(Xd, Qd):
    """codes 0..255 per dimension (min/max of the corpus); returns corpus codes - 128, query codes - 128,
    and the corpus decoded back to floats (what an engine that dequantises on the fly compares against)."""
    lo, hi = Xd.min(0), Xd.max(0)
    sc = (hi - lo) / 255.0
    c = lambda V: np.clip(np.round((V - lo) / sc), 0, 255)
    cx = c(Xd)
    return (cx - 128).astype(np.float32), (c(Qd) - 128).astype(np.float32), (lo + sc * cx).astype(np.float32)


def binary(Xd, Qd):
    return np.where(Xd > 0, 1, -1).astype(np.float32), np.where(Qd > 0, 1, -1).astype(np.float32)


def run_model(model, dims, precs=("float32", "int8", "int8-sym", "binary")):
    ids, X, qids, Q, qrels, _, _ = scifact(model)
    D = X.shape[1]
    Sfull = Q @ X.T
    Iex = topk(Sfull, 100)
    base = evaluate(to_run(qids, ids, Iex, np.take_along_axis(Sfull, Iex, 1)), qrels)
    rows = []
    for d in dims:
        Xd, Qd = trunc(X, d), trunc(Q, d)
        for prec in precs:
            if prec == "float32":
                S = Qd @ Xd.T; bpv = 4 * d
            elif prec == "int8":  # float query against the decoded int8 corpus (FAISS SQ8 style)
                _, _, Xdq = int8(Xd, Qd); S = Qd @ Xdq.T; bpv = d
            elif prec == "int8-sym":  # integer dot of the two code vectors, query quantised with the corpus ranges
                Xi, Qi, _ = int8(Xd, Qd); S = (Qi.astype(np.float64) @ Xi.T.astype(np.float64)); bpv = d
            else:
                Xb, Qb = binary(Xd, Qd); S = Qb @ Xb.T; bpv = d / 8
            I = topk(S, 400)
            for R in ((None,) if prec == "float32" else (None, 20, 40, 100, 400)):
                if R is None:
                    J = I[:, :100]; sc = np.take_along_axis(S, J, 1).astype(np.float64)
                else:
                    C = I[:, :R]
                    fs = np.einsum("qd,qrd->qr", Q, X[C])  # full-precision rescoring of R candidates
                    o = np.lexsort((C, -fs), axis=1)
                    J = np.take_along_axis(C, o, 1)[:, :100]; sc = np.take_along_axis(fs, o, 1)[:, :100]
                # make scores strictly decreasing so pytrec_eval keeps our tie order
                sc = np.arange(sc.shape[1], 0, -1)[None, :].repeat(sc.shape[0], 0).astype(float)
                m = evaluate(to_run(qids, ids, J, sc), qrels)
                ties = None
                if prec == "binary" and R is None:
                    s10 = np.take_along_axis(S, I[:, 9:11], 1)
                    ties = int((s10[:, 0] == s10[:, 1]).sum())
                rows.append(dict(d=d, prec=prec, rescore=R, bytes_per_vector=bpv,
                                 ndcg10=round(m["ndcg@10"], 4), recall10=round(m["recall@10"], 4),
                                 recall100=round(m["recall@100"], 4) if (R is None or R >= 100) else None,
                                 agree10=round(ann_recall(J, Iex), 4), ties_at_10=ties))
                print(model, d, prec, R, rows[-1]["ndcg10"], rows[-1]["agree10"], flush=True)
    return dict(model=model, n=len(ids), full_dim=D, queries=len(qids),
                full=dict(ndcg10=round(base["ndcg@10"], 4), recall10=round(base["recall@10"], 4),
                          recall100=round(base["recall@100"], 4)),
                rows=rows)


if __name__ == "__main__":
    out = dict(asof="2026-10-14", set="scifact test (300 claims), 5,183 abstracts",
               qwen3=run_model("qwen3-emb-0.6b", [32, 64, 128, 256, 512, 768, 1024]),
               bge=run_model("bge-small", [48, 96, 192, 384], ("float32",)),
               gte=run_model("gte-modernbert", [64, 128, 256, 384, 768], ("float32",)))
    save("mrl_quant.json", out)
