"""What a reranker score means: scales, distributions, calibration and abstention (deterministic, recorded scores).

Stored scores (the setup's CrossEncoder.predict defaults, read in sentence-transformers 6.1.0):
  ce-minilm-l6         raw logit of a 1-output head (its config sets the Identity activation)
  bge-reranker-v2-m3   sigmoid(logit): no activation in its config and num_labels 1 -> nn.Sigmoid default
  qwen3-reranker-0.6b  logit("yes") - logit("no") at the last position (LogitScore module, Identity activation)
All three are mapped to the logit scale here (bge: log(p / (1 - p))) so they can be compared.

Pool: every test claim's union of the BM25 top 30 and the Qwen3-Embedding top 30 (all three rerankers scored it).
Labels: SciFact qrels (binary). Unlabelled is treated as not relevant (SciFact is sparsely judged: say so on the page).

1 distributions: histogram of logits for relevant and unlabelled pairs, per reranker.
2 calibration: reliability bins of sigmoid(logit) against the observed relevant rate; ECE; then Platt scaling
  (logistic regression on the logit) fitted on one half of the claims and evaluated on the other (2-fold, fixed split).
3 abstention (constructed): each claim twice, once with its pool as is ("answerable" if a relevant doc is in it) and
  once with every relevant doc removed ("nothing relevant"). Abstain when the top score is below t. AUROC of the top
  score for separating the two, for the rerankers and for the first-stage scores (BM25 score, Qwen3 cosine).
4 transfer: CE MiniLM on NFCorpus (only CE has NFCorpus scores): relevant-score distribution vs SciFact.
Output: data/scores.json"""
import os, sys; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import math
import numpy as np
from rrlib import L, DS, rerank_scores, RERANKERS, logit, sigmoid, r3, r4, save

NAMES = ["ce-minilm-l6", "bge-reranker-v2-m3", "qwen3-reranker-0.6b"]


def to_logit(name, s):
    return logit(s) if name == "bge-reranker-v2-m3" else s


def auroc(pos, neg):
    """Probability that a random positive outscores a random negative (ties count half)."""
    pos, neg = np.asarray(pos), np.asarray(neg)
    allv = np.concatenate([pos, neg])
    order = allv.argsort(kind="mergesort")
    ranks = np.empty(len(allv))
    # average ranks for ties
    sv = allv[order]
    i = 0
    while i < len(sv):
        j = i
        while j + 1 < len(sv) and sv[j + 1] == sv[i]:
            j += 1
        ranks[order[i:j + 1]] = (i + j) / 2 + 1
        i = j + 1
    rp = ranks[:len(pos)].sum()
    return (rp - len(pos) * (len(pos) + 1) / 2) / (len(pos) * len(neg))


def platt_fit(x, y, iters=200):
    """Logistic regression p = sigmoid(a x + b) by Newton steps (two parameters)."""
    a, b = 1.0, 0.0
    x, y = np.asarray(x, float), np.asarray(y, float)
    for _ in range(iters):
        z = np.clip(a * x + b, -30, 30)
        p = 1 / (1 + np.exp(-z))
        g = np.array([np.sum((p - y) * x), np.sum(p - y)])
        w = p * (1 - p) + 1e-9
        Hm = np.array([[np.sum(w * x * x), np.sum(w * x)], [np.sum(w * x), np.sum(w)]]) + 1e-6 * np.eye(2)
        step = np.linalg.solve(Hm, g)
        a, b = a - step[0], b - step[1]
        if np.abs(step).max() < 1e-10:
            break
    return float(a), float(b)


def reliability(p, y, nb=10):
    p, y = np.asarray(p), np.asarray(y)
    bins, ece = [], 0.0
    for i in range(nb):
        lo, hi = i / nb, (i + 1) / nb
        m = (p >= lo) & ((p < hi) if i < nb - 1 else (p <= hi))
        if m.sum() == 0:
            bins.append({"lo": lo, "hi": hi, "n": 0})
            continue
        conf, acc = float(p[m].mean()), float(y[m].mean())
        ece += m.sum() / len(p) * abs(conf - acc)
        bins.append({"lo": lo, "hi": hi, "n": int(m.sum()), "conf": r3(conf), "acc": r3(acc)})
    return bins, r4(ece)


def main():
    corpus, queries, qrels = L.beir(DS)
    qt = qrels["test"]
    test = sorted(qt)
    bm = L.run(DS, "bm25")
    de = L.run(DS, "qwen3-emb-0.6b")
    pool = {q: list(dict.fromkeys(list(bm[q])[:30] + list(de[q])[:30])) for q in test}
    S = {n: rerank_scores(RERANKERS[n]) for n in NAMES}
    # Qwen3 cosine for any (claim, doc): precomputed unit vectors
    ids, X = L.embeddings(DS, "qwen3-emb-0.6b")
    qids, Q = L.embeddings(DS, "qwen3-emb-0.6b", "queries")
    dpos = {d: i for i, d in enumerate(ids)}
    qpos = {q: i for i, q in enumerate(qids)}
    X = np.asarray(X)
    cos = {q: {d: float(X[dpos[d]] @ np.asarray(Q[qpos[q]])) for d in pool[q]} for q in test}
    out = {"pool": "BM25 top 30 + Qwen3-Embedding top 30, union", "n_claims": len(test),
           "n_pairs": sum(len(v) for v in pool.values()),
           "n_rel_in_pool": sum(sum(d in qt[q] for d in pool[q]) for q in test),
           "claims_with_rel_in_pool": sum(any(d in qt[q] for d in pool[q]) for q in test),
           "scale": {"ce-minilm-l6": "raw logit (Identity activation in its config)",
                     "bge-reranker-v2-m3": "sigmoid probability (CrossEncoder default for 1 label when the config names no activation)",
                     "qwen3-reranker-0.6b": "logit(yes) - logit(no) (LogitScore module, Identity activation)"},
           "raw_range": {}, "hist": {}, "calib": {}, "abstain": {}, "examples": {}}
    edges = list(np.arange(-14, 12.01, 1.0))
    half = set(test[::2])  # fixed 2-fold split by sorted claim id
    for n in NAMES:
        raw = [S[n][q][d] for q in test for d in pool[q]]
        out["raw_range"][n] = [r4(min(raw)), r4(max(raw))]
        lr, ln = [], []
        for q in test:
            for d in pool[q]:
                (lr if d in qt[q] else ln).append(to_logit(n, S[n][q][d]))
        hr, _ = np.histogram(np.clip(lr, -14, 12), bins=edges)
        hn, _ = np.histogram(np.clip(ln, -14, 12), bins=edges)
        out["hist"][n] = {"edges": [float(e) for e in edges], "rel": hr.tolist(), "non": hn.tolist(),
                          "rel_median": r3(np.median(lr)), "non_median": r3(np.median(ln)),
                          "pair_auroc": r4(auroc(lr, ln))}
        # calibration: raw sigmoid, then Platt 2-fold
        xs = {q: [to_logit(n, S[n][q][d]) for d in pool[q]] for q in test}
        ys = {q: [1 if d in qt[q] else 0 for d in pool[q]] for q in test}
        p_raw = [sigmoid(x) for q in test for x in xs[q]]
        y_all = [y for q in test for y in ys[q]]
        bins_raw, ece_raw = reliability(p_raw, y_all)
        p_pl, y_pl, fits = [], [], []
        for fold in (0, 1):
            tr = [q for q in test if (q in half) == (fold == 0)]
            te = [q for q in test if (q in half) != (fold == 0)]
            a, b = platt_fit([x for q in tr for x in xs[q]], [y for q in tr for y in ys[q]])
            fits.append([r4(a), r4(b)])
            p_pl += [sigmoid(max(-30, min(30, a * x + b))) for q in te for x in xs[q]]
            y_pl += [y for q in te for y in ys[q]]
        bins_pl, ece_pl = reliability(p_pl, y_pl)
        out["calib"][n] = {"raw": bins_raw, "ece_raw": ece_raw, "platt": bins_pl, "ece_platt": ece_pl, "platt_ab": fits,
                           "base_rate": r4(np.mean(y_all)),
                           "mean_p_raw": r4(np.mean(p_raw))}
        # abstention: top score with and without the relevant docs
        top_ans, top_none, hit1 = [], [], []
        for q in test:
            sc = [(to_logit(n, S[n][q][d]), d) for d in pool[q]]
            sc.sort(key=lambda x: -x[0])
            if any(d in qt[q] for d in pool[q]):
                top_ans.append(sc[0][0]); hit1.append(1 if sc[0][1] in qt[q] else 0)
            rest = [s for s in sc if s[1] not in qt[q]]
            top_none.append(rest[0][0])
        thr = []
        for t in np.arange(-12, 10.01, 0.5):
            keep = [a >= t for a in top_ans]
            thr.append({"t": float(t), "kept_ans": r3(np.mean(keep)),
                        "kept_ans_correct": r3(np.mean([k and h for k, h in zip(keep, hit1)])),
                        "abstain_none": r3(np.mean([a < t for a in top_none]))})
        out["abstain"][n] = {"auroc": r4(auroc(top_ans, top_none)), "n_ans": len(top_ans), "n_none": len(top_none),
                             "top1_correct": r3(np.mean(hit1)), "sweep": thr,
                             "top_ans_median": r3(np.median(top_ans)), "top_none_median": r3(np.median(top_none))}
        print(n, "pair AUROC", out["hist"][n]["pair_auroc"], "ECE raw", ece_raw, "Platt", ece_pl, "abstain AUROC", out["abstain"][n]["auroc"])
    # first-stage scores as abstention signals
    for name, getter in (("bm25", lambda q, d: bm[q].get(d)), ("qwen3-cosine", lambda q, d: cos[q][d])):
        top_ans, top_none = [], []
        for q in test:
            sc = [(getter(q, d), d) for d in pool[q] if getter(q, d) is not None]
            sc.sort(key=lambda x: -x[0])
            if any(d in qt[q] for d in pool[q]):
                top_ans.append(sc[0][0])
            rest = [s for s in sc if s[1] not in qt[q]]
            top_none.append(rest[0][0])
        out["abstain"][name] = {"auroc": r4(auroc(top_ans, top_none)), "n_ans": len(top_ans), "n_none": len(top_none)}
        print(name, "abstain AUROC", out["abstain"][name]["auroc"])
    # transfer: CE MiniLM relevant scores on NFCorpus vs SciFact
    c2, q2, qr2 = L.beir("nfcorpus")
    t2 = qr2["test"]
    S2 = L.rerank_scores("nfcorpus", "ce-minilm-l6")
    bm2 = L.run("nfcorpus", "bm25")
    rel2, non2 = [], []
    for q in t2:
        for d in list(bm2.get(q, {}))[:30]:
            if d in S2.get(q, {}):
                (rel2 if d in t2[q] else non2).append(S2[q][d])
    h1, _ = np.histogram(np.clip(rel2, -14, 12), bins=edges)
    h2, _ = np.histogram(np.clip(non2, -14, 12), bins=edges)
    out["transfer"] = {"nfcorpus_rel_median": r3(np.median(rel2)), "nfcorpus_non_median": r3(np.median(non2)),
                       "nfcorpus_rel": h1.tolist(), "nfcorpus_non": h2.tolist(), "pool": "BM25 top 30",
                       "nfcorpus_pair_auroc": r4(auroc(rel2, non2)),
                       "share_rel_above_0_scifact": r3(np.mean(np.asarray([to_logit("ce-minilm-l6", S["ce-minilm-l6"][q][d]) for q in test for d in pool[q] if d in qt[q]]) > 0)),
                       "share_rel_above_0_nfcorpus": r3(np.mean(np.asarray(rel2) > 0))}
    print("transfer", {k: v for k, v in out["transfer"].items() if not isinstance(v, list)})
    save("scores.json", out)


if __name__ == "__main__":
    main()
