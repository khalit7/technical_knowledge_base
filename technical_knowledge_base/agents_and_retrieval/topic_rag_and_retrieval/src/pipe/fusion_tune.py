"""Tune the fusion knob (RRF k, or alpha for min-max / z-score) on a split that is not the test split
(SciFact train, 809 claims; NFCorpus dev), then apply the chosen value to the test split.
Shows how much of the best-on-test score was a leak. Output: out/fusion_tuned.json."""
import os, sys; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import json
from common import L, save, per_query, mean, r3, bm25_runs, dense_runs
import fusion as F  # reuses rrf / score_fuse / top (fusion.py's main block reruns; cheap)

M = ("ndcg_cut.10", "recall.10", "recall.100")
out = {}
for ds, tune in (("scifact", "train"), ("nfcorpus", "dev")):
    _, _, qrels = L.beir(ds)
    qtu = sorted(qrels[tune]); qte = qrels["test"]
    bm_tu = bm25_runs(ds, qtu)
    # sanity: the same code reproduces the recorded test run
    bm_te_new = bm25_runs(ds, sorted(qte))
    bm_te = L.run(ds, "bm25")
    same = sum(list(bm_te_new[q])[:10] == list(bm_te[q])[:10] for q in qte)
    R = {"tune_split": tune, "n_tune": len(qtu), "bm25_test_top10_identical": same, "models": {}}
    for dm in ("bge-small", "gte-modernbert", "qwen3-emb-0.6b", "minilm-l6"):
        de_tu = dense_runs(ds, dm, qtu); de_te = L.run(ds, dm)
        row = {}
        for how in ("rrf", "minmax", "zscore"):
            grid = F.KS if how == "rrf" else F.ALPHAS
            def fuse(bm, de, v, qs):
                if how == "rrf":
                    return {q: F.top(F.rrf([list(bm.get(q, {})), list(de.get(q, {}))], v)) for q in qs}
                return {q: F.top(F.score_fuse(bm.get(q, {}), de.get(q, {}), v, how)) for q in qs}
            tu = {str(v): mean(per_query(fuse(bm_tu, de_tu, v, qtu), qrels[tune], M), M[0]) for v in grid}
            best = max(grid, key=lambda v: (round(tu[str(v)], 6), -abs((60 if how == "rrf" else 0.5) - v)))
            te = per_query(fuse(bm_te, de_te, best, qte), qte, M)
            row[how] = {"best_on_tune": best, "tune_ndcg10": r3(tu[str(best)]), "test_ndcg10": r3(mean(te, M[0])),
                        "test_r10": r3(mean(te, M[1])), "test_r100": r3(mean(te, M[2]))}
        row["dense_tune_ndcg10"] = r3(mean(per_query(de_tu, qrels[tune], M), M[0]))
        row["bm25_tune_ndcg10"] = r3(mean(per_query(bm_tu, qrels[tune], M), M[0]))
        R["models"][dm] = row
        print(ds, dm, json.dumps(row))
    out[ds] = R
save("fusion_tuned.json", out)
