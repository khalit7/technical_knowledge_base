"""Statistics of the tiny fine-tune (after e_train.py). CPU, deterministic.
For each arm: per-query nDCG@10 averaged over its seeds, paired bootstrap against the starting model and against the
in-batch arm (SciFact and NFCorpus), the spread across seeds (max - min of the seed means), and claims improved or
worsened. Writes the result into ../data/train_runs.json under "paired".
usage: python -I -B e_ftstats.py"""
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np  # noqa: E402
from emblib import DATA, scratch, paired_bootstrap, r4  # noqa: E402

path = os.path.join(DATA, "train_runs.json")
tr = json.load(open(path))
odir = scratch("train")
base = np.load(os.path.join(odir, "base.npz"))
arms = {}
for r in tr["runs"]:
    if r["variant"] == "base":
        continue
    z = np.load(os.path.join(odir, "%s_s%d_e%d.npz" % (r["variant"], r["seed"], r["epochs"])))
    arms.setdefault(r["variant"], []).append(z)
out = {}
for a, zs in arms.items():
    out[a] = {}
    for ds in ("scifact", "nfcorpus"):
        m = np.mean([z[ds] for z in zs], 0)
        seeds = [float(z[ds].mean()) for z in zs]
        d = dict(vs_base=paired_bootstrap(m, base[ds]), seed_means=[r4(x) for x in seeds], seed_range=r4(max(seeds) - min(seeds)),
                 improved=int((m > base[ds] + 1e-9).sum()), worsened=int((m < base[ds] - 1e-9).sum()))
        if a != "inbatch" and "inbatch" in arms:
            d["vs_inbatch"] = paired_bootstrap(m, np.mean([z[ds] for z in arms["inbatch"]], 0))
        out[a][ds] = d
        print(a, ds, d, flush=True)
tr["paired"] = out
json.dump(tr, open(path, "w"), indent=1)
