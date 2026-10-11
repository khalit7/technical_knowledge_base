"""Chi-square goodness of fit of each rule's sampled L-token sequences against the exact target probabilities.
Categories: every sequence with expected count >= 5, plus one pooled "other" bin.
usage: uv run --no-project --with scipy python stats.py <exact json> <out json>"""
import json, sys
from collections import Counter
from scipy.stats import chisquare
d = json.load(open(sys.argv[1]))
cats = {tuple(c): p for c, p in d["cats"]}
mass = sum(cats.values()); N = d["N"]
out = {"prompt": d["prompt"], "N": N, "k": d["k"], "L": d["L"], "T": d["T"], "n_cats": len(cats) + 1, "cat_mass": mass, "variants": {}}
order = sorted(cats, key=lambda c: -cats[c])
for v, r in d["variants"].items():
    cnt = Counter(tuple(s) for s in r["seqs"])
    obs = [cnt.get(c, 0) for c in order]; other = N - sum(obs)
    exp = [N * cats[c] for c in order] + [N * (1 - mass)]
    obs = obs + [other]
    stat, pv = chisquare(obs, exp)
    tv = 0.5 * (sum(abs(cnt.get(c, 0) / N - cats[c]) for c in order) + abs(other / N - (1 - mass)))
    acc = r["acc_per_step"]
    f = Counter(s[0] for s in r["seqs"])
    out["variants"][v] = {"chi2": stat, "df": len(exp) - 1, "p": pv, "tv_cats": tv,
                          "mean_acc_per_step": sum(acc) / len(acc) if acc else None, "steps": len(acc),
                          "top_obs": [[list(c), cnt.get(c, 0), N * cats[c]] for c in order[:12]],
                          "first": {str(k): n for k, n in f.most_common(20)}}
    print(v, "chi2 %.1f df %d p %.3g tv %.4f acc/step %s" % (stat, len(exp) - 1, pv, tv, out["variants"][v]["mean_acc_per_step"]))
json.dump(out, open(sys.argv[2], "w"), indent=1)
