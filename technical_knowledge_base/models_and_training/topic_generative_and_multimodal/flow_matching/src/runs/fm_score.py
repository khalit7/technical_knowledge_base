"""Flow matching child page: score the new image models exactly as the root Flow lab scored its own (MPS, bench lock).

Models: rf3_2000 (third rectified flow), rf1d_1500 and rf2d_1500 (one-step students of the 1- and 2-rectified flows),
plus a re-score of the root's reflow_2000 at 1 and 4 Euler steps as a consistency check against its recorded 159.79 / 83.14.
Scoring is the root's sample_fm.py, unchanged: fid.fd_fmnist on N = 1,000 samples (100 per class) from noise seed 11,
class accuracy, diversity (mean same-class pairwise distance in the classifier's features). Same-noise strips use the
root's strip noise (seed 5, one per class). Writes out/samples_new.json and out/strips_new.npz here.
"""
import json, os, sys, time

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT_SRC = os.path.join(HERE, "..", "..", "..", "src")
sys.path.insert(0, os.path.join(ROOT_SRC, "data")); sys.path.insert(0, os.path.join(ROOT_SRC, "flow"))
import numpy as np
import torch
from common import cap_threads, device, scratch, sync, from_model, MACHINE, touch_bench
from nets import TinyUNet
import fid
from fm_samplers import euler

cap_threads(4)
dev = device("mps")
clf = fid.load_classifier(dev)
N = 1000
CLS = torch.arange(10).repeat_interleave(N // 10).to(dev)
STRIP_Y = torch.arange(10).to(dev)


def noise(n, seed):
    return torch.randn((n, 1, 32, 32), generator=torch.Generator().manual_seed(seed)).to(dev)


def load(path):
    net = TinyUNet(); net.load_state_dict(torch.load(scratch(path), map_location="cpu")["ema"]); return net.to(dev).eval()


def score(x, y):
    d, acc = fid.fd_fmnist(from_model(x), clf, dev, labels=y.cpu().numpy())
    f, _ = fid.classifier_features(from_model(x), clf, dev)
    f = torch.as_tensor(np.asarray(f)); yy = y.cpu()
    div = float(np.mean([torch.pdist(f[yy == c]).mean().item() for c in range(10)]))
    return {"fd": round(float(d), 2), "acc": round(float(acc), 4), "div": round(div, 3)}


def path_ratio(net, z, y, n=50):
    tr = []; x = euler(net, z, y, n, trace=tr)
    P = torch.stack([p for _, p, _ in tr] + [x])
    seg = (P[1:] - P[:-1]).flatten(2).norm(dim=2).sum(0)
    return round(float(((P[-1] - P[0]).flatten(1).norm(dim=1) / seg).mean()), 4)


zN, zS = noise(N, 11), noise(10, 5)
zE = zN[:200]; yE = torch.arange(10, device=dev).repeat_interleave(20)
out = {"machine": MACHINE, "device": str(dev), "date": time.strftime("%Y-%m-%d"), "torch": torch.__version__, "N": N, "models": {}}
strips = {}
PLAN = {"reflow_2000": ("ckpt/fw_reflow_2000.pt", [1, 4]), "rf3_2000": ("fm/rf3_2000.pt", [1, 2, 4, 10, 20, 50]),
        "rf1d_1500": ("fm/rf1d_1500.pt", [1]), "rf2d_1500": ("fm/rf2d_1500.pt", [1])}
for name, (path, steps) in ([] if os.environ.get("FM_SDE_ONLY") else PLAN.items()):
    if not os.path.exists(scratch(path)):
        print("missing", path, flush=True); continue
    net = load(path); rec = {"euler": []}
    for n in steps:
        x = torch.cat([euler(net, zN[i:i + 500], CLS[i:i + 500], n) for i in range(0, N, 500)]); sync(dev)
        r = {"steps": n, **score(x, CLS)}; rec["euler"].append(r); print(name, r, flush=True)
        strips[f"{name}_{n}"] = from_model(euler(net, zS, STRIP_Y, n))
    if name == "rf3_2000":
        rec["straightness"] = path_ratio(net, zE, yE)
        ref = euler(net, zE, yE, 50)
        rec["one_vs_50_rms"] = round(float(((euler(net, zE, yE, 1) - ref) ** 2).mean().sqrt()), 5)
    out["models"][name] = rec
    del net; torch.mps.empty_cache(); touch_bench("fm")
# ------------------------------------------------------------- stochastic sampling of the root's 1-RF with the same marginals
# score from the velocity on the straight path: E[x0 | x] = x - t v, score = -(x - t v) / (1 - t)
# Euler-Maruyama: x += h (v + eps/2 score) + sqrt(eps h) N(0, I); the last step is a plain Euler step (no fresh noise)
@torch.no_grad()
def em(net, x, y, n, eps, g, decay=False):
    for k in range(n):
        t, h = k / n, 1.0 / n
        v = net(x, torch.full((x.shape[0],), t, device=x.device), y)
        e = eps * (1 - t) if decay else eps          # decay: the noise level falls to 0 at the data end
        if k == n - 1 or e == 0:
            x = x + h * v
        else:
            sc = -(x - t * v) / (1 - t)
            x = x + h * (v + 0.5 * e * sc) + (e * h) ** 0.5 * torch.randn(x.shape, generator=g).to(x.device)
    return x


if os.environ.get("FM_SDE_ONLY"):          # follow-up run: only the decaying-noise SDE, appended to samples_new.json
    out = json.load(open(os.path.join(HERE, "..", "out", "samples_new.json")))
    net = load("ckpt/fw_fm_4000.pt"); sde = []
    for eps in [0.5, 1.0, 2.0]:
        for n in [50, 250]:
            g = torch.Generator().manual_seed(99)
            x = torch.cat([em(net, zN[i:i + 500], CLS[i:i + 500], n, eps, g, decay=True) for i in range(0, N, 500)]); sync(dev)
            r = {"eps": eps, "decay": True, "steps": n, **score(x, CLS)}; sde.append(r); print("sde decay", r, flush=True)
    out["sde_decay_fm_4000"] = sde
    json.dump(out, open(os.path.join(HERE, "..", "out", "samples_new.json"), "w"), indent=0)
    raise SystemExit(0)
if os.path.exists(scratch("ckpt/fw_fm_4000.pt")):
    net = load("ckpt/fw_fm_4000.pt"); sde = []
    for eps in [0.0, 0.5, 1.0]:
        for n in [10, 50, 250]:
            g = torch.Generator().manual_seed(99)
            x = torch.cat([em(net, zN[i:i + 500], CLS[i:i + 500], n, eps, g) for i in range(0, N, 500)]); sync(dev)
            r = {"eps": eps, "steps": n, **score(x, CLS)}; sde.append(r); print("sde", r, flush=True)
            if n == 50:
                strips[f"sde_{eps:g}_50"] = from_model(em(net, zS, STRIP_Y, 50, eps, torch.Generator().manual_seed(98)))
        touch_bench("fm")
    out["sde_fm_4000"] = sde
json.dump(out, open(os.path.join(HERE, "..", "out", "samples_new.json"), "w"), indent=0)
np.savez_compressed(os.path.join(HERE, "..", "out", "strips_new.npz"), **strips)
print("done", flush=True)
