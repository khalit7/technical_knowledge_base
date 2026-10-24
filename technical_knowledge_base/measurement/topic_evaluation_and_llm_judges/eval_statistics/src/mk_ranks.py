"""Ranking uncertainty on the MT-Bench leaderboard (Reading, section 10).

Input: parts/30_js_data.js (window.ES.mtb: LMSYS's released GPT-4 single grades, 34 models x 160 turns, built by mk_data.py).
Method: a model's score is the mean of its valid turn grades (a failed grade is dropped, as on the rest of the page).
Resample the 80 questions (the clusters; both turns travel together) with replacement, 2,000 times, seed 0;
recompute every model's score and its rank (1 = best, ties share the better rank) in each resample.
Output: parts/32_js_ranks.js, window.ESR = {models: [[name, score, lo, hi, rank, rlo, rhi], ...] sorted by score, B, seed}
lo/hi: 2.5% and 97.5% percentiles of the score; rlo/rhi: the same percentiles of the rank.
Runs in about a second: python3 mk_ranks.py
"""
import json
from pathlib import Path
import numpy as np

H = Path(__file__).resolve().parent
t = (H / "parts/30_js_data.js").read_text()
i = t.index("window.ES=") + len("window.ES=")
D = json.loads(t[i:t.index("\n", i)].rstrip(";"))["mtb"]
q = np.array([o[0] for o in D["order"]])
names = [m[0] for m in D["models"]]
G = np.array([[np.nan if ch == "." else (ord(ch) - 95) / 2 for ch in m[1]] for m in D["models"]])  # models x turns
qs = np.unique(q)
idx = [np.where(q == k)[0] for k in qs]
rng = np.random.default_rng(0)
B = 2000


def scores(turns):
    return np.nanmean(G[:, turns], axis=1)


def ranks(s):
    return np.array([1 + np.sum(s > x) for x in s])


s0 = scores(np.arange(G.shape[1]))
r0 = ranks(s0)
S = np.empty((B, len(names)))
R = np.empty((B, len(names)), dtype=int)
for b in range(B):
    pick = rng.integers(0, len(qs), len(qs))
    turns = np.concatenate([idx[k] for k in pick])
    S[b] = scores(turns)
    R[b] = ranks(S[b])
lo, hi = np.percentile(S, [2.5, 97.5], axis=0)
rlo, rhi = np.percentile(R, [2.5, 97.5], axis=0, method="lower"), np.percentile(R, [2.5, 97.5], axis=0, method="higher")
rlo, rhi = rlo[0], rhi[1]
order = np.argsort(-s0)
rows = [[names[k], round(float(s0[k]), 3), round(float(lo[k]), 3), round(float(hi[k]), 3), int(r0[k]), int(rlo[k]), int(rhi[k])] for k in order]
out = {"models": rows, "B": B, "seed": 0, "questions": int(len(qs)),
       "src": "LMSYS MT-Bench GPT-4 single grades (gpt-4_single.jsonl), 34 models, 80 questions x 2 turns; bootstrap over questions"}
widths = [r[6] - r[5] + 1 for r in rows]
out["summary"] = {"median_rank_span": float(np.median(widths)), "max_rank_span": int(max(widths)),
                  "top_sure": sum(1 for r in rows if r[6] == 1)}
(H / "parts/32_js_ranks.js").write_text("// Ranking uncertainty on MT-Bench, written by src/mk_ranks.py (bootstrap over questions, seed 0). Do not edit by hand.\nwindow.ESR=" + json.dumps(out, separators=(",", ":")) + ";\n")
for r in rows:
    print(r)
print(out["summary"])
