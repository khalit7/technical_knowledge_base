"""Query routing between BM25, dense and hybrid, per query (deterministic, no lock).
For each query: which first stage serves it best? The oracle (best of the three per query, known only with labels)
is the ceiling; a router must guess from the query and the two result lists alone. Features (no labels):
query length in BM25 terms, max and mean IDF of its terms, share of tokens with a digit or an uppercase letter inside
(identifier-like), BM25 top-1 score and relative margin, dense top-1 cosine and margin, overlap of the two top 10s.
Router: logistic regression (scikit-learn, default L2, C 1) trained on SciFact train / NFCorpus dev, predicting
"BM25 beats dense on nDCG@10" (ties dropped from training); route to BM25 alone, dense alone, or RRF when unsure.
Dense = Qwen3-Embedding-0.6B (the main embedder). Output: out/router.json"""
import os, sys; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import re
import numpy as np
import rp
import bm25lab as B
from fusion_deep import fuse

L, PC = rp.L, rp.PC
TUNE = {"scifact": "train", "nfcorpus": "dev"}
M = ("ndcg_cut.10",)
DM = "qwen3-emb-0.6b"


def feats(qtext, qtok, idf_of, bm, de):
    idfs = [idf_of.get(t, 0.0) for t in qtok] or [0.0]
    lb, ld = list(bm.items()), list(de.items())
    def mg(l):
        return (l[0][1] - l[1][1]) / abs(l[0][1]) if len(l) > 1 and l[0][1] else 0.0
    raw = qtext.split()
    ident = sum(bool(re.search(r"\d", w)) or bool(re.search(r"\w[A-Z]", w)) for w in raw) / max(1, len(raw))
    ov = len(set(list(bm)[:10]) & set(list(de)[:10])) / 10
    return [len(qtok), max(idfs), float(np.mean(idfs)), ident, lb[0][1] if lb else 0, mg(lb), ld[0][1] if ld else 0, mg(ld), ov]


FN = ["query terms", "max IDF", "mean IDF", "identifier-like share", "BM25 top-1", "BM25 margin", "dense top-1", "dense margin", "top-10 overlap"]


def main():
    from sklearn.linear_model import LogisticRegression
    from sklearn.preprocessing import StandardScaler
    res = {}
    for ds in ("scifact", "nfcorpus"):
        c, q, qr = L.beir(ds)
        dids = list(c)
        tu, te = sorted(qr[TUNE[ds]]), sorted(qr["test"])
        idx = B.Index({"all": B.tokenize([L.doc_text(c[d]) for d in dids])})
        idf_of = {t: float(idx.idf[j]) for t, j in idx.vocab.items()}
        toks = {x: t for x, t in zip(tu + te, B.tokenize([q[x] for x in tu + te]))}
        bm = {**PC.bm25_runs(ds, tu), **L.run(ds, "bm25")}
        de = {**PC.dense_runs(ds, DM, tu), **L.run(ds, DM)}
        hy = {x: rp.top(fuse(bm[x], de[x], "rrf", 60)) for x in tu + te}
        def pq(run, qs, split):
            return PC.per_query({x: run[x] for x in qs}, qr[split], M)
        P = {}
        for split, qs in (("tune", tu), ("test", te)):
            sp = TUNE[ds] if split == "tune" else "test"
            P[split] = {n: pq(r, qs, sp) for n, r in (("bm25", bm), ("dense", de), ("hybrid", hy))}
        X = {s: np.array([feats(q[x], toks[x], idf_of, bm[x], de[x]) for x in qs]) for s, qs in (("tune", tu), ("test", te))}
        yb = np.array([P["tune"]["bm25"][x][M[0]] - P["tune"]["dense"][x][M[0]] for x in tu])
        keep = np.abs(yb) > 1e-9
        sc = StandardScaler().fit(X["tune"][keep])
        clf = LogisticRegression(max_iter=1000).fit(sc.transform(X["tune"][keep]), (yb[keep] > 0).astype(int))
        prob = clf.predict_proba(sc.transform(X["test"]))[:, 1]
        prob_tu = clf.predict_proba(sc.transform(X["tune"]))[:, 1]
        def policy_score(pr, qs, split, lo, hi):
            v = []
            for i, x in enumerate(qs):
                n = "bm25" if pr[i] >= hi else "dense" if pr[i] <= lo else "hybrid"
                v.append(P[split][n][x][M[0]])
            return float(np.mean(v))
        # choose the two thresholds on the tune split
        grid = [(lo, hi) for lo in np.arange(0, 0.55, 0.05) for hi in np.arange(0.5, 1.05, 0.05) if lo <= hi]
        best = max(grid, key=lambda t: (round(policy_score(prob_tu, tu, "tune", *t), 6), -(t[1] - t[0])))
        R = {"n_test": len(te)}
        for n in ("bm25", "dense", "hybrid"):
            R[n] = rp.r3(np.mean([P["test"][n][x][M[0]] for x in te]))
        R["oracle_bm25_or_dense"] = rp.r3(np.mean([max(P["test"]["bm25"][x][M[0]], P["test"]["dense"][x][M[0]]) for x in te]))
        R["oracle_of_three"] = rp.r3(np.mean([max(P["test"][n][x][M[0]] for n in ("bm25", "dense", "hybrid")) for x in te]))
        R["router"] = rp.r3(policy_score(prob, te, "test", *best))
        R["router_thresholds"] = [round(float(best[0]), 2), round(float(best[1]), 2)]
        routed = ["bm25" if p >= best[1] else "dense" if p <= best[0] else "hybrid" for p in prob]
        R["routed_counts"] = {n: routed.count(n) for n in ("bm25", "dense", "hybrid")}
        d = np.array([P["test"]["bm25"][x][M[0]] - P["test"]["dense"][x][M[0]] for x in te])
        R["test_bm25_better"] = int((d > 1e-9).sum()); R["test_dense_better"] = int((d < -1e-9).sum()); R["test_tie"] = int((np.abs(d) <= 1e-9).sum())
        from sklearn.metrics import roc_auc_score
        kt = np.abs(d) > 1e-9
        R["router_auc_test"] = rp.r3(roc_auc_score((d[kt] > 0).astype(int), prob[kt]))
        R["coef"] = {f: rp.r3(w) for f, w in zip(FN, clf.coef_[0])}
        # identifier-like queries alone
        ids_ = [i for i, x in enumerate(te) if X["test"][i, 3] > 0]
        R["identifier_like"] = {"n": len(ids_), "bm25": rp.r3(np.mean([P["test"]["bm25"][te[i]][M[0]] for i in ids_])) if ids_ else None,
                                "dense": rp.r3(np.mean([P["test"]["dense"][te[i]][M[0]] for i in ids_])) if ids_ else None}
        res[ds] = R
        print(ds, R, flush=True)
    rp.save("router.json", res)


if __name__ == "__main__":
    main()
