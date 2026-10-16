"""Pending-only refresh (2026-10-16). The scratch folder was wiped by a reboot after the page was built, so the full
qc_make_data.py cannot be rerun; every value already recorded in ../data/qc_data.json and ../data/facts.json is kept as is.
This script only adds the results of the GPU queue's job 2 and the root Quality lab's new numbers:
  - Qwen3-1.7B perplexity (first 512 tokens) on the root's 2,000 FineWeb rows ($DC_SCRATCH/qc/qwen17_fw2k.jsonl);
  - the FineWeb-Edu classifier on the same rows, rescored on the GPU because the earlier CPU scores were lost
    ($DC_SCRATCH/qc/scores/edu__fw2k.npy);
  - the root's Qwen3-0.6B run on run0 and FineWeb-Edu on 50,000 FineWeb rows (src/qual/out/q_summary.json keys qwen, fw50k).
DCLM per-document scores on the 2,000 rows were also lost; their correlation is not recomputed (it would need the 2.39 GB model)."""
import json
import os

import numpy as np

import qc_common as C
import qc_encoders as E

D = os.path.normpath(os.path.join(C.HERE, "..", "data"))
F = json.load(open(os.path.join(D, "facts.json")))
Q = json.load(open(os.path.join(D, "qc_data.json")))
R = json.load(open(os.path.join(C.ROOT_SRC, "qual", "out", "q_summary.json")))


class _S:  # scipy is not in the restored venv: Spearman = Pearson of average ranks (ties averaged)
    def __init__(self, v):
        self.statistic = v


def _rank(a):
    a = np.asarray(a, dtype=float)
    o = np.argsort(a, kind="mergesort")
    r = np.empty(len(a)); r[o] = np.arange(len(a))
    for u in np.unique(a[np.diff(np.sort(a), prepend=np.nan) == 0]):
        m = a == u; r[m] = r[m].mean()
    return r


def spearmanr(x, y):
    return _S(float(np.corrcoef(_rank(x), _rank(y))[0, 1]))


def pct(x, d=0):
    return f"{100 * x:.{d}f}%"


qw = [json.loads(l) for l in open(C.sdir("qwen17_fw2k.jsonl"))]
assert len(qw) == 2000 and [r["row"] for r in qw] == list(range(2000))
nll = np.array([r["nll"] for r in qw]); ppl = np.exp(nll)
edu = np.load(C.sdir("scores", "edu__fw2k.npy"))
F["qwen17_median"] = f"{np.median(ppl):.1f}"
F["sp_qwen17_edu"] = f"{spearmanr(-nll, edu).statistic:.2f}"
lo, hi = ppl <= np.quantile(ppl, 0.3), ppl >= np.quantile(ppl, 0.7)
F["qwen17_low30_edu"] = pct((edu[lo] >= 2.5).mean(), 1); F["qwen17_high30_edu"] = pct((edu[hi] >= 2.5).mean(), 1)
F["fw2k_edu_keep"] = pct((edu >= 2.5).mean(), 1)
o = np.argsort(ppl)[:12]
F["qwen17_low12"] = f"{ppl[o[0]]:.1f} to {ppl[o[-1]]:.1f}"
texts, urls = E.sets("fw2k")
with open(C.sdir("qwen17_lowest12.txt"), "w") as f:  # for reading by hand (outside the repo)
    for i in o:
        f.write(f"=== {i} ppl={ppl[i]:.2f} edu={edu[i]:.2f} host={C.host(urls[i])}\n{texts[i][:700]}\n")
qr = R["qwen"]
F["qwen06_median"] = f"{qr['median_ppl']:.1f}"; F["sp_qwen06_ccnet"] = f"{qr['spearman_ccnet']:.2f}"
F["sp_qwen06_edu"] = f"{qr['spearman_edu']:.2f}"; F["sp_qwen06_dclm"] = f"{qr['spearman_dclm']:.2f}"
F["qwen06_low12"] = f"{qr['lowest12'][0]} to {qr['lowest12'][-1]}"
F["qwen06_gen_med"] = f"{qr['gen_like_median']:.1f}"; F["qwen06_other_med"] = f"{qr['other_median']:.1f}"
fw = R["fw50k"]
F["fw50k_edu_keep"] = pct(fw["keep_edu"], 1); F["fw50k_edu_tokens"] = pct(fw["keep_edu_tokens"], 1)
F["fw50k_jacc"] = pct(fw["jacc_published"], 1); F["fw50k_sp"] = f"{fw['spearman']:.2f}"
Q["qwen17_hist"] = np.histogram(np.log10(ppl), bins=30, range=(0, 3))[0].tolist()
Q["qwen17_hist_edu"] = [int(((edu >= 2.5) & (np.log10(ppl) >= b / 10) & (np.log10(ppl) < (b + 1) / 10)).sum()) for b in range(30)]
F["qwen17_low12_read"] = F.get("qwen17_low12_read", "")  # written by hand after reading $DC_SCRATCH/qc/qwen17_lowest12.txt
json.dump(Q, open(os.path.join(D, "qc_data.json"), "w"), ensure_ascii=False, separators=(",", ":"))
json.dump(F, open(os.path.join(D, "facts.json"), "w"), ensure_ascii=False, indent=0)
print({k: F[k] for k in F if k.startswith(("qwen", "sp_qwen", "fw50k", "fw2k"))})
