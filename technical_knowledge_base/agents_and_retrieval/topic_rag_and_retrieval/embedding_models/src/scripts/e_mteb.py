"""MTEB: does the leaderboard average predict the score on one retrieval set?
Reads the MTEB results repository (github.com/embeddings-benchmark/results, sparse clone at a pinned commit, see
src/README.md) through mteb's own loader (mteb 2.24.13, run with the root Tool map's env `$RAG_SCRATCH/mapenv`,
because mteb is not in the shared venv). For every model with all 41 tasks of MTEB(eng, v2): its mean over tasks
(the leaderboard's "Mean (Task)"), its mean over the 10 retrieval tasks, and its own SciFact and NFCorpus nDCG@10
(two BEIR tasks that are NOT in MTEB(eng, v2)). Spearman rank correlations, top-10 overlaps and the scatter data.
usage: $RAG_SCRATCH/mapenv/bin/python -I -B e_mteb.py   -> ../data/mteb.json"""
import json
import logging
import os
import warnings

warnings.filterwarnings("ignore")
logging.disable(logging.WARNING)
import mteb  # noqa: E402
import numpy as np  # noqa: E402
from mteb.cache import ResultCache  # noqa: E402
from scipy.stats import spearmanr  # noqa: E402

H = os.path.dirname(os.path.abspath(__file__))
RS = os.environ["RAG_SCRATCH"]
cache = ResultCache(cache_path=os.path.join(RS, "emb", "dl", "mtebcache"))  # remote -> sparse clone
bench = mteb.get_benchmark("MTEB(eng, v2)")
tasks = [t.metadata.name for t in bench.tasks]
ttype = {t.metadata.name: t.metadata.type for t in bench.tasks}
ret = [t for t in tasks if ttype[t] == "Retrieval"]


def frame(task_sel):
    r = cache.load_results(tasks=task_sel, include_remote=True, validate_and_filter=True, only_main_score=True)
    df = r.join_revisions().to_dataframe()
    return df.set_index("task_name").drop(columns=["is_public"], errors="ignore")


big = frame(bench)
beir = frame(["SciFact", "NFCorpus"])
models = [m for m in big.columns if big[m].notna().sum() == len(tasks)]
rows = []
for m in models:
    sf = beir[m]["SciFact"] if m in beir.columns else np.nan
    nf = beir[m]["NFCorpus"] if m in beir.columns else np.nan
    rows.append(dict(model=m, mean=float(big[m].mean()), ret=float(big[m][ret].mean()),
                     scifact=None if np.isnan(sf) else float(sf), nfcorpus=None if np.isnan(nf) else float(nf)))
both = [r for r in rows if r["scifact"] is not None and r["nfcorpus"] is not None]


def rho(a, b):
    return round(float(spearmanr([r[a] for r in both], [r[b] for r in both]).statistic), 3)


def top_overlap(a, b, k=10):
    ta = set(r["model"] for r in sorted(both, key=lambda r: -r[a])[:k])
    tb = set(r["model"] for r in sorted(both, key=lambda r: -r[b])[:k])
    return len(ta & tb)


def rank_of(m, key):
    o = [r["model"] for r in sorted(both, key=lambda r: -r[key])]
    return o.index(m) + 1 if m in o else None


setup = ["BAAI/bge-small-en-v1.5", "sentence-transformers/all-MiniLM-L6-v2", "Qwen/Qwen3-Embedding-0.6B",
         "Alibaba-NLP/gte-modernbert-base", "intfloat/e5-small-v2"]
out = dict(
    asof="2026-10-14", source="github.com/embeddings-benchmark/results", mteb="2.24.13",
    n_tasks=len(tasks), task_types={k: sum(1 for t in tasks if ttype[t] == k) for k in sorted(set(ttype.values()))},
    retrieval_tasks=ret, n_models_full=len(models), n_models_both=len(both),
    rho=dict(mean_scifact=rho("mean", "scifact"), mean_nfcorpus=rho("mean", "nfcorpus"),
             ret_scifact=rho("ret", "scifact"), ret_nfcorpus=rho("ret", "nfcorpus"),
             scifact_nfcorpus=rho("scifact", "nfcorpus"), mean_ret=rho("mean", "ret")),
    top10=dict(mean_scifact=top_overlap("mean", "scifact"), mean_nfcorpus=top_overlap("mean", "nfcorpus"),
               ret_scifact=top_overlap("ret", "scifact"), scifact_nfcorpus=top_overlap("scifact", "nfcorpus")),
    setup={m: dict(**{k: (round(v, 4) if isinstance(v, float) else v) for r in both if r["model"] == m for k, v in r.items()},
                   rank_mean=rank_of(m, "mean"), rank_scifact=rank_of(m, "scifact"), rank_nfcorpus=rank_of(m, "nfcorpus"))
           for m in setup},
    points=[[r["model"], round(r["mean"], 4), round(r["ret"], 4), round(r["scifact"], 4), round(r["nfcorpus"], 4)] for r in both],
)
# leader by mean and its SciFact rank; leader on SciFact and its mean rank
lm = max(both, key=lambda r: r["mean"]); ls = max(both, key=lambda r: r["scifact"])
out["leader_mean"] = dict(model=lm["model"], rank_scifact=rank_of(lm["model"], "scifact"), rank_nfcorpus=rank_of(lm["model"], "nfcorpus"))
out["leader_scifact"] = dict(model=ls["model"], rank_mean=rank_of(ls["model"], "mean"))
# how often a model higher on the mean is lower on SciFact (discordant pairs) among pairs whose means differ by < 1 point
d = n = 0
for i in range(len(both)):
    for j in range(i + 1, len(both)):
        a, b = both[i], both[j]
        if abs(a["mean"] - b["mean"]) < 0.01:
            n += 1
            d += (a["mean"] - b["mean"]) * (a["scifact"] - b["scifact"]) < 0
out["close_pairs"] = dict(n=n, discordant_scifact=d)
# declared training data (mteb ModelMeta.training_datasets; None = not declared)
decl = {"scifact": 0, "nfcorpus": 0, "none": 0}
for r in both:
    try:
        td = mteb.get_model_meta(r["model"]).training_datasets
    except Exception:
        td = None
    if td is None:
        decl["none"] += 1
        continue
    names = set(td)
    decl["scifact"] += any(n.startswith("SciFact") for n in names)
    decl["nfcorpus"] += any(n.startswith("NFCorpus") for n in names)
out["declared_training"] = decl
json.dump(out, open(os.path.join(H, "..", "data", "mteb.json"), "w"), indent=1)
print({k: out[k] for k in ("n_models_full", "n_models_both", "rho", "top10", "leader_mean", "leader_scifact", "close_pairs", "declared_training")})
for m, v in out["setup"].items():
    print(m, v.get("mean"), v.get("scifact"), v.get("rank_mean"), v.get("rank_scifact"))
