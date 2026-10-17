"""Flow matching child page: how much does minibatch OT pairing shorten the noise-to-image coupling? (CPU, a minute)

Mean squared travel distance E||x1 - x0||^2 (per pixel, model space [-1, 1], 32x32 incl. padding) of three couplings
between Gaussian noise and Fashion-MNIST training images:
  independent pairs (plain flow matching), minibatch OT inside batches of B (Hungarian; Tong et al. 2023,
  Pooladian et al. 2023), and the ODE's own coupling (z, flow(z)) of the 1- and 2-rectified flows (the reflow pairs,
  if present in GM_SCRATCH/fm). The same measure on the 2-D toy is in out/toy.json ("ot" / "cost").
Writes out/ot_images.json here.
"""
import json, os, sys, time

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT_SRC = os.path.join(HERE, "..", "..", "..", "src")
sys.path.insert(0, os.path.join(ROOT_SRC, "data"))
import numpy as np
import torch
from scipy.optimize import linear_sum_assignment
from common import cap_threads, load_split, to_model, scratch

cap_threads(4)
t0 = time.time()
xtr, _ = load_split("train")
M = 4096
g = torch.Generator().manual_seed(12)
X = to_model(xtr[torch.randperm(len(xtr), generator=g)[:M].numpy()]).float().flatten(1)
Z = torch.randn(M, X.shape[1], generator=g)
P = X.shape[1]
res = []
for B in [1, 2, 4, 16, 64, 256, 1024, 4096]:
    tot = 0.0
    for b in range(0, M, B):
        c = (torch.cdist(Z[b:b + B], X[b:b + B]) ** 2).numpy()
        r, ci = linear_sum_assignment(c); tot += float(c[r, ci].sum())
    res.append({"B": B, "cost_per_pixel": round(tot / M / P, 4)})
    print(res[-1], round(time.time() - t0, 1), flush=True)
out = {"pixels": P, "pairs": M, "minibatch": res, "date": time.strftime("%Y-%m-%d"), "device": "cpu"}
for nm in ["pairs_rf1", "pairs_rf2"]:
    f = scratch("fm", nm + ".npz")
    if os.path.exists(f):
        d = np.load(f); z = torch.from_numpy(d["z"][:M]).float().flatten(1); x1 = torch.from_numpy(d["x1"][:M]).float().flatten(1)
        out[nm] = {"cost_per_pixel": round(float(((x1 - z) ** 2).mean()), 4),
                   "indep_same_images": round(float(((x1 - z[torch.randperm(M, generator=g)]) ** 2).mean()), 4)}
        print(nm, out[nm], flush=True)
json.dump(out, open(os.path.join(HERE, "..", "out", "ot_images.json"), "w"), indent=0)
print("done", round(time.time() - t0, 1), flush=True)
