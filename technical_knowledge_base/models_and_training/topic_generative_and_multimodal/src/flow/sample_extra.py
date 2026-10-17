"""Flow lab: a follow-up to sample_fm.py (MPS, under the bench lock, about 2 minutes).

sample_fm.py found plain Heun far worse than midpoint at equal cost. Hypothesis: Heun's last corrector evaluates the net
at t = 1, where the marginal velocity E[x1 - x0 | x_t = x] = (x - E[x0 | x_t = x]) / t degenerates to v = x (at t = 1 the
noise is independent of the image), the wrong slope for the end of a path. Test: Heun with the last step as Euler
(EDM's rule) at the same step counts; plus what the net returns at t = 1 (cosine with x and with the true x1 - x0).
Writes out/samples_extra.json.
"""
import json, os, sys, time

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "..", "data")); sys.path.insert(0, HERE)
import numpy as np
import torch
import torch.nn.functional as F
from common import cap_threads, device, load_split, scratch, sync, from_model, to_model, touch_bench
from nets import TinyUNet
import fid
from fm_samplers import euler, heun, midpoint, heun_last_euler

cap_threads(4)
dev = device("mps")
net = TinyUNet(); net.load_state_dict(torch.load(scratch("ckpt", "fw_fm_4000.pt"), map_location="cpu")["ema"]); net.to(dev).eval()
clf = fid.load_classifier(dev)
N = 1000
CLS = torch.arange(10).repeat_interleave(N // 10).to(dev)
noise = lambda n, seed: torch.randn((n, 1, 32, 32), generator=torch.Generator().manual_seed(seed)).to(dev)
zN = noise(N, 11)
out = {"date": time.strftime("%Y-%m-%d"), "N": N, "heun_last_euler": []}
for n in [1, 2, 3, 5, 10, 25]:
    x = torch.cat([heun_last_euler(net, zN[i:i + 500], CLS[i:i + 500], n) for i in range(0, N, 500)])
    d, acc = fid.fd_fmnist(from_model(x), clf, dev, labels=CLS.cpu().numpy())
    r = {"steps": n, "nfe": 2 * n - 1, "fd": round(float(d), 2), "acc": round(float(acc), 4)}
    out["heun_last_euler"].append(r); print(r, flush=True)
# integration error of every solver against a reference that never evaluates t = 1: midpoint, 500 steps (1,000 evaluations).
# (sample_fm.py's reference was Heun 250, whose own last step touches t = 1; this replaces it.)
zE = zN[:200]; yE = torch.arange(10, device=dev).repeat_interleave(20)
ref = midpoint(net, zE, yE, 500)
out["ref"] = "midpoint 500 steps"
out["ref_heun250_rms"] = round(float(((heun(net, zE, yE, 250) - ref) ** 2).mean().sqrt()), 5)
out["ode_err"] = []
for kind, f, cost in [("euler", euler, 1), ("heun", heun, 2), ("midpoint", midpoint, 2), ("heun_last_euler", heun_last_euler, 2)]:
    for nfe in [2, 4, 10, 20, 50, 100]:
        n = max(1, nfe // cost) if kind != "heun_last_euler" else (nfe + 1) // 2
        x = f(net, zE, yE, n)
        real = n if kind == "euler" else (2 * n - 1 if kind == "heun_last_euler" else 2 * n)
        out["ode_err"].append({"solver": kind, "nfe": real, "rms": round(float(((x - ref) ** 2).mean().sqrt()), 5)})
    touch_bench("fw")
print(out["ode_err"], flush=True)
# what the net says at t = 1 on real validation images with fresh noise
xv, yv = load_split("val")
x1 = to_model(xv[:1000]).to(dev); yv = torch.from_numpy(yv[:1000]).to(dev)
x0 = torch.randn(x1.shape, generator=torch.Generator().manual_seed(3)).to(dev)
with torch.no_grad():
    for t in [0.9, 0.98, 1.0]:
        xt = (1 - t) * x0 + t * x1
        v = net(xt, torch.full((1000,), t, device=dev), yv)
        cos = lambda a, b: float(F.cosine_similarity(a.flatten(1), b.flatten(1)).mean())
        out[f"at_t{t}"] = {"cos_v_x": round(cos(v, xt), 4), "cos_v_true": round(cos(v, x1 - x0), 4)}
print({k: v for k, v in out.items() if k.startswith("at_")}, flush=True)
json.dump(out, open(os.path.join(HERE, "out", "samples_extra.json"), "w"), indent=0)
print("done", flush=True)
