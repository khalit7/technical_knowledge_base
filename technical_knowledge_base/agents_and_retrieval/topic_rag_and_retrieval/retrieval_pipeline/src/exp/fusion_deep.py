"""Fusion in depth (deterministic, no lock). Extends the root Pipeline lab's fusion.py / fusion_tune.py (which
measured RRF k, min-max and z-score fusion) with the classic score-combination family and weighted RRF, every
knob tuned on SciFact train / NFCorpus dev and scored once on test, plus:
- what scores know that ranks do not: P(top-1 relevant) by the top-1 score margin, per retriever;
- why agreement works: share of relevant documents among those both retrievers put in their top 10 vs one;
- three lists (BM25 + two embedders);
- fusion followed by a reranker (Qwen3-Reranker-0.6B recorded scores): does the fusion choice still matter?
Conventions as the root (top 100 per list; missing document = 0 for RRF, list minimum for normalised scores).
Output: out/fusion_deep.json"""
import os, sys; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
import rp

L, PC = rp.L, rp.PC
M = ("ndcg_cut.10", "recall.10", "recall.100")
TUNE = {"scifact": "train", "nfcorpus": "dev"}
MODELS = ("minilm-l6", "bge-small", "gte-modernbert", "qwen3-emb-0.6b")
A = [round(a / 10, 1) for a in range(11)]
GRIDS = {"rrf": [1, 2, 5, 10, 20, 40, 60, 100, 200, 500, 1000], "wrrf": A, "minmax": A, "zscore": A, "combmnz": A,
         "combmax": A, "borda": A, "raw": [0.0, 0.01, 0.02, 0.05, 0.1, 0.2, 0.5, 0.9, 0.95, 0.98, 0.99, 1.0]}


def norm(s, how):
    v = np.array(list(s.values()), dtype=float)
    if how == "minmax":
        lo, hi = v.min(), v.max()
        return {d: (x - lo) / (hi - lo) if hi > lo else 0.0 for d, x in s.items()}
    mu, sd = v.mean(), v.std()
    return {d: (x - mu) / sd if sd > 0 else 0.0 for d, x in s.items()}


def fuse(bm, de, method, p):
    """bm, de: {doc: score} in rank order. p: k for rrf, else the dense weight alpha."""
    lb, ld = list(bm), list(de)
    docs = set(lb) | set(ld)
    if method == "rrf":
        rb = {d: i + 1 for i, d in enumerate(lb)}; rd = {d: i + 1 for i, d in enumerate(ld)}
        return {d: (1 / (p + rb[d]) if d in rb else 0) + (1 / (p + rd[d]) if d in rd else 0) for d in docs}
    if method == "wrrf":
        rb = {d: i + 1 for i, d in enumerate(lb)}; rd = {d: i + 1 for i, d in enumerate(ld)}
        return {d: (1 - p) * (1 / (60 + rb[d]) if d in rb else 0) + p * (1 / (60 + rd[d]) if d in rd else 0) for d in docs}
    if method == "borda":
        n = 100
        rb = {d: i for i, d in enumerate(lb)}; rd = {d: i for i, d in enumerate(ld)}
        return {d: (1 - p) * (n - rb[d] if d in rb else 0) + p * (n - rd[d] if d in rd else 0) for d in docs}
    if method == "raw":
        fb, fd = min(bm.values()), min(de.values())
        return {d: (1 - p) * bm.get(d, fb) + p * de.get(d, fd) for d in docs}
    if method in ("minmax", "zscore"):
        nb, nd = norm(bm, method), norm(de, method)
        fb, fd = min(nb.values()), min(nd.values())
        return {d: (1 - p) * nb.get(d, fb) + p * nd.get(d, fd) for d in docs}
    nb, nd = norm(bm, "minmax"), norm(de, "minmax")
    if method == "combmnz":  # CombSUM of the lists that hold d, times how many lists hold d (Fox and Shaw 1994)
        return {d: ((1 - p) * nb.get(d, 0) + p * nd.get(d, 0)) * ((d in nb) + (d in nd)) for d in docs}
    if method == "combmax":
        return {d: max((1 - p) * nb.get(d, 0), p * nd.get(d, 0)) for d in docs}
    raise ValueError(method)


def fused_run(bmr, der, qs, method, p):
    return {q: rp.top(fuse(bmr.get(q, {}) or {"_": 0}, der.get(q, {}) or {"_": 0}, method, p)) for q in qs}


def margin_stats(run, qr):
    """bucket queries by relative top-1 margin (s1 - s2) / |s1|; P(top-1 relevant) per quintile"""
    xs, ys = [], []
    for q in qr:
        v = list(run.get(q, {}).items())
        if len(v) < 2:
            continue
        s1, s2 = v[0][1], v[1][1]
        xs.append((s1 - s2) / abs(s1) if s1 else 0)
        ys.append(1 if qr[q].get(v[0][0], 0) > 0 else 0)
    xs, ys = np.array(xs), np.array(ys)
    qs = np.quantile(xs, [0, .2, .4, .6, .8, 1])
    out = []
    for i in range(5):
        m = (xs >= qs[i]) & (xs <= qs[i + 1]) if i == 4 else (xs >= qs[i]) & (xs < qs[i + 1])
        out.append({"lo": rp.r4(qs[i]), "hi": rp.r4(qs[i + 1]), "n": int(m.sum()), "p_top1_rel": rp.r3(ys[m].mean())})
    return out


def agreement(bm, de, qr, k=10):
    both, ob, od = [0, 0], [0, 0], [0, 0]
    for q in qr:
        a = set(list(bm.get(q, {}))[:k]); b = set(list(de.get(q, {}))[:k])
        for d in a | b:
            rel = qr[q].get(d, 0) > 0
            t = both if (d in a and d in b) else (ob if d in a else od)
            t[0] += 1; t[1] += rel
    f = lambda t: {"docs": t[0], "relevant": t[1], "share": rp.r3(t[1] / max(1, t[0]))}
    return {"both": f(both), "bm25_only": f(ob), "dense_only": f(od)}


def main():
    res = {}
    for ds in ("scifact", "nfcorpus"):
        _, _, qr = L.beir(ds)
        tu, te = sorted(qr[TUNE[ds]]), qr["test"]
        bm_te = L.run(ds, "bm25"); bm_tu = PC.bm25_runs(ds, tu)
        R = {"n_test": len(te), "n_tune": len(tu), "models": {}}
        R["bm25"] = rp.summ(PC.per_query(bm_te, te, M))
        R["margin_bm25"] = margin_stats(bm_te, te)
        for dm in MODELS:
            de_te = L.run(ds, dm); de_tu = PC.dense_runs(ds, dm, tu)
            row = {"single": rp.summ(PC.per_query(de_te, te, M)), "methods": {}}
            single_pq = PC.per_query(de_te, te, M)
            for meth, grid in GRIDS.items():
                curve_tu, curve_te, raw_tu = {}, {}, {}
                for p in grid:
                    raw_tu[str(p)] = PC.mean(PC.per_query(fused_run(bm_tu, de_tu, tu, meth, p), qr[TUNE[ds]], M), M[0])
                    curve_tu[str(p)] = rp.r4(raw_tu[str(p)])
                    curve_te[str(p)] = rp.r4(PC.mean(PC.per_query(fused_run(bm_te, de_te, te, meth, p), te, M), M[0]))
                # same rule as the root's fusion_tune.py: best on tune at 6 decimals, ties to the value nearest the default
                best = max(grid, key=lambda p: (round(raw_tu[str(p)], 6), -abs((60 if meth == "rrf" else 0.5) - p)))
                pq = PC.per_query(fused_run(bm_te, de_te, te, meth, best), te, M)
                d = [pq[q][M[0]] - single_pq[q][M[0]] for q in te]
                row["methods"][meth] = {"best_on_tune": best, "tune": curve_tu[str(best)], "test": rp.summ(pq),
                                        "test_best_possible": max(curve_te.values()), "curve_test": curve_te, "curve_tune": curve_tu,
                                        "vs_dense_up": int(sum(x > 1e-9 for x in d)), "vs_dense_down": int(sum(x < -1e-9 for x in d))}
            row["agreement"] = agreement(bm_te, de_te, te)
            row["margin_dense"] = margin_stats(de_te, te)
            R["models"][dm] = row
            print(ds, dm, {m: (v["best_on_tune"], v["test"]["ndcg10"]) for m, v in row["methods"].items()}, flush=True)
        # three lists, test only, equal weights
        q3 = L.run(ds, "qwen3-emb-0.6b"); g3 = L.run(ds, "gte-modernbert")
        def rrf3(q, k=60):
            out = {}
            for lst in (bm_te.get(q, {}), q3.get(q, {}), g3.get(q, {})):
                for r, dd in enumerate(lst):
                    out[dd] = out.get(dd, 0) + 1 / (k + r + 1)
            return rp.top(out)
        R["three_lists_rrf60"] = rp.summ(PC.per_query({q: rrf3(q) for q in te}, te, M))
        R["two_dense_rrf60"] = rp.summ(PC.per_query({q: rp.top(fuse(q3.get(q, {}), g3.get(q, {}), "rrf", 60)) for q in te}, te, M))
        res[ds] = R
    # ---- fusion then rerank (SciFact, Qwen3-Reranker-0.6B recorded scores, rerank the fused top 20)
    sys.path.insert(0, os.path.join(rp.ROOT_SRC, "pipe"))
    _, _, qr = L.beir("scifact"); te = qr["test"]
    S = {}
    for f in (L.path("data", "rerank", "scifact", "qwen3-reranker-0.6b_top30.tsv"),
              L.path("pipe", "rerank_extra", "scifact", "qwen3-reranker-0.6b_top30.tsv")):
        for line in open(f):
            q, d, s = line.rstrip("\n").split("\t")
            S.setdefault(q, {})[d] = float(s)
    bm = L.run("scifact", "bm25"); de = L.run("scifact", "qwen3-emb-0.6b")
    rr = {}
    for name, meth, p in (("rrf k60", "rrf", 60), ("z-score a0.6", "zscore", 0.6), ("weighted rrf", "wrrf", res["scifact"]["models"]["qwen3-emb-0.6b"]["methods"]["wrrf"]["best_on_tune"]),
                          ("bm25 only", "wrrf", 0.0), ("dense only", "wrrf", 1.0)):
        for K in (10, 20, 30):
            first = {q: rp.top(fuse(bm[q], de[q], meth, p)) for q in te}
            out, miss, nq = {}, 0, 0
            for q in te:
                lst = list(first[q]); head = lst[:K]
                m = [d for d in head if d not in S.get(q, {})]
                miss += len(m)
                head = sorted(head, key=lambda d: -S.get(q, {}).get(d, -1e9))
                order = head + lst[K:]
                out[q] = {d: float(len(order) - i) for i, d in enumerate(order)}
            rr["%s|%d" % (name, K)] = {"before": rp.summ(PC.per_query(first, te, M)), "after": rp.summ(PC.per_query(out, te, M)), "unscored_pairs": miss}
    res["scifact"]["fuse_then_rerank"] = rr
    print(rr, flush=True)
    rp.save("fusion_deep.json", res)


if __name__ == "__main__":
    main()
