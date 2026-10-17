"""Flow matching child page: (noise, sample) pairs from a trained flow model (MPS, under the bench lock).

    python -I fm_pairs.py --ckpt ckpt/fw_fm_4000.pt --out fm/pairs_rf1.npz --seed 2026     # the 1-rectified flow's pairs (the root's make_pairs.py, rerun)
    python -I fm_pairs.py --ckpt ckpt/fw_reflow_2000.pt --out fm/pairs_rf2.npz --seed 2027 # the 2-rectified flow's pairs (for 3-RF and 2-RF + distill)

Exactly the root Flow lab's make_pairs.py recipe: 30,000 noises (3,000 per class, shuffled), midpoint solver with
25 steps (50 network evaluations), unclamped end points, float16 on disk in GM_SCRATCH (about 120 MB, not committed).
Paths are relative to GM_SCRATCH. Writes out/pairs_<name>.json here.
"""
import argparse, json, os, sys, time

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT_SRC = os.path.join(HERE, "..", "..", "..", "src")
sys.path.insert(0, os.path.join(ROOT_SRC, "data")); sys.path.insert(0, os.path.join(ROOT_SRC, "flow"))
import numpy as np
import torch
from common import cap_threads, device, scratch, touch_bench
from nets import TinyUNet
from fm_samplers import midpoint

ap = argparse.ArgumentParser()
ap.add_argument("--ckpt", required=True); ap.add_argument("--out", required=True)
ap.add_argument("--seed", type=int, default=2026); ap.add_argument("--n", type=int, default=30000)
a = ap.parse_args()
cap_threads(4)
dev = device("mps")
net = TinyUNet(); net.load_state_dict(torch.load(scratch(a.ckpt), map_location="cpu")["ema"]); net.to(dev).eval()
M = a.n
g = torch.Generator().manual_seed(a.seed)
Y = torch.arange(10).repeat_interleave(M // 10)
Y = Y[torch.randperm(M, generator=g)]
Z = torch.randn((M, 1, 32, 32), generator=g)
X1 = torch.empty_like(Z)
t0 = time.time()
for i in range(0, M, 1000):
    X1[i:i + 1000] = midpoint(net, Z[i:i + 1000].to(dev), Y[i:i + 1000].to(dev), 25).cpu()
    if i % 5000 == 0:
        print("pairs", i, round(time.time() - t0, 1), flush=True); touch_bench("fm")
os.makedirs(os.path.dirname(scratch(a.out)), exist_ok=True)
np.savez(scratch(a.out), z=Z.numpy().astype(np.float16), x1=X1.numpy().astype(np.float16), y=Y.numpy())
name = os.path.splitext(os.path.basename(a.out))[0]
info = {"ckpt": a.ckpt, "pairs": M, "solver": "midpoint 25 steps (50 evaluations)", "seconds": round(time.time() - t0, 1),
        "seed": a.seed, "x1_beyond_range_frac": round(float((X1.abs() > 1).float().mean()), 4), "date": time.strftime("%Y-%m-%d")}
json.dump(info, open(os.path.join(HERE, "..", "out", f"{name}.json"), "w"), indent=0)
print("done", info, flush=True)
