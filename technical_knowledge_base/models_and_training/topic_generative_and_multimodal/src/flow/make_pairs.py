"""Flow lab: make the reflow pairs (MPS, under the bench lock).

Pushes 30,000 fresh noises (3,000 per class) through the trained flow-matching model with the midpoint solver, 25 steps
(50 network evaluations), and saves (z, x1, y) to GM_SCRATCH/flow/reflow_pairs.npz (float16; about 120 MB, not committed).
The 2-rectified model is then trained on these pairs: train_fm.py --reflow.
Midpoint, not Heun: plain Heun's last corrector evaluates the net at t = 1, where the learned field is just the input,
which spoils the end points (sample_fm.py scores Heun 25 at FD 73 against midpoint 25 at 53, the converged ODE). A first
set made with Heun 25 was discarded (its record: out/pairs_heun_discarded.json). The pairs are unclamped (the ODE's map).
"""
import json, os, sys, time

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "..", "data")); sys.path.insert(0, HERE)
import numpy as np
import torch
from common import cap_threads, device, scratch, sync, touch_bench
from nets import TinyUNet
from fm_samplers import midpoint

cap_threads(4)
dev = device("mps")
net = TinyUNet(); net.load_state_dict(torch.load(scratch("ckpt", "fw_fm_4000.pt"), map_location="cpu")["ema"]); net.to(dev).eval()
M = 30000
g = torch.Generator().manual_seed(2026)
Y = torch.arange(10).repeat_interleave(M // 10)
Y = Y[torch.randperm(M, generator=g)]
Z = torch.randn((M, 1, 32, 32), generator=g)
X1 = torch.empty_like(Z)
t0 = time.time()
for i in range(0, M, 1000):
    X1[i:i + 1000] = midpoint(net, Z[i:i + 1000].to(dev), Y[i:i + 1000].to(dev), 25).cpu()
    if i % 5000 == 0:
        print("pairs", i, round(time.time() - t0, 1), flush=True); touch_bench("fw")
os.makedirs(scratch("flow"), exist_ok=True)
np.savez(scratch("flow", "reflow_pairs.npz"), z=Z.numpy().astype(np.float16), x1=X1.numpy().astype(np.float16), y=Y.numpy())
info = {"pairs": M, "solver": "midpoint 25 steps (50 evaluations)", "seconds": round(time.time() - t0, 1), "seed": 2026,
        "x1_beyond_range_frac": round(float((X1.abs() > 1).float().mean()), 4), "date": time.strftime("%Y-%m-%d")}
json.dump(info, open(os.path.join(HERE, "out", "pairs.json"), "w"), indent=0)
print("done", info, flush=True)
