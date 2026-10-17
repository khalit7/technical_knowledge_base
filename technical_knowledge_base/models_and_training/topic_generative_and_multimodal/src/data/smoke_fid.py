"""Inception reference statistics for FID on the running example, plus real-vs-real floors.

Run under the bench lock: GM_SCRATCH=... nice -n 15 python -I smoke_fid.py
Writes GM_SCRATCH/fid/inc_test.npz, inc_train10k.npz (mu, sigma) and src/data/smoke/fid_floor.json.

The floors are what FID says when nothing is wrong: real training images against the real test set.
FID is biased upward at small N, so a generator scored on 500 samples must be compared with the
real-vs-real floor at 500, not with zero and not with papers' 50k-sample numbers.
"""
import json, os, sys, time

import numpy as np
import torch

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from common import cap_threads, device, load_split, scratch, PeakMem, sync, MACHINE
import fid as F

cap_threads(4)
dev = device("mps")
os.makedirs(scratch("fid"), exist_ok=True)
xtr, _ = load_split("train"); xte, _ = load_split("test")

with PeakMem() as pm:
    t = time.time()
    fte = F.inception_features(xte, dev); sync(dev); t_te = time.time() - t
    ftr = F.inception_features(xtr[:10000], dev)
np.savez(scratch("fid", "inc_test.npz"), mu=fte.mean(0), sigma=np.cov(fte, rowvar=False))
np.savez(scratch("fid", "inc_train10k.npz"), mu=ftr.mean(0), sigma=np.cov(ftr, rowvar=False))

# check against the CPU path on 200 images (MPS float32 vs CPU float32 features)
fcpu = F.inception_features(xte[:200], torch.device("cpu"))
mps_cpu_maxdiff = float(np.abs(fcpu - fte[:200]).max())

ref = F.stats(fte)
floor = {}
rng = np.random.default_rng(0)
for n in (10000, 5000, 1000, 500, 250):
    vals = []
    for rep in range(3 if n < 10000 else 1):
        idx = rng.choice(10000, n, replace=False) if n < 10000 else np.arange(10000)
        vals.append(round(F.frechet(*F.stats(ftr[idx]), *ref), 2))
    floor[str(n)] = vals
out = {"what": "FID of N real training images (first 10k of the train split, random subsets, 3 draws below 10k) vs the 10k real test images; Inception 'inception-v3-compat' (torch-fidelity 0.4.0), 2048-d",
       "floor_by_N": floor, "inception_seconds_10k_test": round(t_te, 1), "device": str(dev),
       "mps_vs_cpu_feature_maxabsdiff_200imgs": mps_cpu_maxdiff, "peak_mps_mb": pm.peak_mb, "max_rss_mb": pm.rss_mb,
       "machine": MACHINE, "date": time.strftime("%Y-%m-%d")}
os.makedirs(os.path.join(HERE, "smoke"), exist_ok=True)
json.dump(out, open(os.path.join(HERE, "smoke", "fid_floor.json"), "w"), indent=1)
print(json.dumps(out), flush=True)
