"""Rebuild Nemotron-CC's ensemble bucketing (arXiv 2412.02595 Section 2.2) and check it against the levels Nemotron-CC
published, on its own documents.
Recipe (paper): score every document with three classifiers (NVIDIA's Mixtral- and Nemotron-340B-annotated FineWeb-Edu-style
regressors, and DCLM's fastText); turn each score into an integer 0..19 by rank so each bucket holds about 5% of documents;
take the maximum of the three integers; group buckets into levels: 19 high, 18 medium-high, 12-17 medium, 7-11 medium-low,
0-6 low (Table 2).
Our pool: the 1,000 head documents (200 per level) of Nemotron-CC CC-MAIN-2024-30, re-weighted to the published level
shares (Table 2 token shares 12.63/11.52/46.24/20.43/9.18%) so the percentiles approximate the real pool. Departures:
token shares used as document shares; percentiles from 1,000 documents, not a whole crawl.
Then the same cut-offs applied to run0's 2,617 documents. Output: ../data/out/nemotron.json"""
import json
import os

import numpy as np

import qc_common as C

SD = C.sdir("scores", "x")[:-1]
LEVELS = ["high", "medium-high", "medium", "medium-low", "low"]
SHARE = {"high": 12.63, "medium-high": 11.52, "medium": 46.24, "medium-low": 20.43, "low": 9.18}


def level_of(b):
    return "high" if b == 19 else "medium-high" if b == 18 else "medium" if b >= 12 else "medium-low" if b >= 7 else "low"


def wquant_edges(x, w):
    o = np.argsort(x)
    cw = np.cumsum(w[o]) / w.sum()
    return np.array([x[o][np.searchsorted(cw, q)] for q in np.arange(1, 20) / 20])


nemo_root = [json.loads(l) for l in open(C.Q.qdir("nemo_scores.jsonl"))]
truth = np.array([r["bucket"] for r in nemo_root])
w = np.array([SHARE[t] / 200 for t in truth])
S = {"mixtral": np.load(os.path.join(SD, "nemo_mixtral__nemo.npy")), "nemotron": np.load(os.path.join(SD, "nemo_nemotron__nemo.npy")),
     "dclm": np.array([r["dclm"] for r in nemo_root]), "fwedu": np.array([r["edu"] for r in nemo_root])}
edges = {k: wquant_edges(v, w) for k, v in S.items()}
B = {k: np.searchsorted(edges[k], v, side="right") for k, v in S.items()}
res = {"edges": {k: [float(e) for e in v] for k, v in edges.items()}, "variants": {}}
for name, members in [("ensemble", ["mixtral", "nemotron", "dclm"]), ("mixtral", ["mixtral"]), ("nemotron", ["nemotron"]),
                      ("dclm", ["dclm"]), ("fwedu", ["fwedu"]), ("ensemble_plus_fwedu", ["mixtral", "nemotron", "dclm", "fwedu"])]:
    b = np.max(np.stack([B[m] for m in members]), axis=0)
    pred = np.array([level_of(x) for x in b])
    conf = [[int(((truth == t) & (pred == p)).sum()) for p in LEVELS] for t in LEVELS]
    res["variants"][name] = {"exact": float((pred == truth).mean()),
                             "within_one": float(np.mean([abs(LEVELS.index(a) - LEVELS.index(c)) <= 1 for a, c in zip(pred, truth)])),
                             "confusion_true_rows_pred_cols": conf,
                             "weighted_share_by_pred": {L: float(w[pred == L].sum() / w.sum()) for L in LEVELS}}
    print(name, res["variants"][name]["exact"], res["variants"][name]["within_one"], flush=True)
# winners: which classifier sets the max in the ensemble
bm = np.stack([B[m] for m in ["mixtral", "nemotron", "dclm"]])
res["ensemble_argmax_share"] = {m: float((bm.argmax(0) == i).mean()) for i, m in enumerate(["mixtral", "nemotron", "dclm"])}
# run0 under the same cut-offs
R = {"mixtral": np.load(os.path.join(SD, "nemo_mixtral__run0.npy")), "nemotron": np.load(os.path.join(SD, "nemo_nemotron__run0.npy")),
     "dclm": np.array([d["dclm"] for d in C.run0_final()])}
br = np.max(np.stack([np.searchsorted(edges[k], v, side="right") for k, v in R.items()]), axis=0)
pr = np.array([level_of(x) for x in br])
res["run0_levels"] = {L: int((pr == L).sum()) for L in LEVELS}
np.save(os.path.join(SD, "nemo_ensemble_bucket__run0.npy"), br.astype(np.int8))
from scipy.stats import spearmanr  # noqa: E402
res["spearman_run0"] = {"mixtral_nemotron": float(spearmanr(R["mixtral"], R["nemotron"]).statistic),
                        "mixtral_dclm": float(spearmanr(R["mixtral"], R["dclm"]).statistic),
                        "nemotron_fwedu": float(spearmanr(R["nemotron"], [d["edu"] for d in C.run0_final()]).statistic),
                        "mixtral_fwedu": float(spearmanr(R["mixtral"], [d["edu"] for d in C.run0_final()]).statistic)}
print(res["run0_levels"], res["spearman_run0"], res["ensemble_argmax_share"])
C.dump("nemotron.json", res)
