"""Flow matching child page: the exact optimum of the flow-matching loss on a finite training set (CPU, a minute).

For a finite training set {d_j} the marginal velocity of the straight path is known in closed form:
    x_t | j ~ N(t d_j, (1 - t)^2 I),  w_j(x) = softmax_j( -||x - t d_j||^2 / (2 (1 - t)^2) ),
    E[x1 | x] = sum_j w_j d_j,        u(x, t) = (E[x1 | x] - x) / (1 - t)
This is the field a network with unlimited capacity, trained to zero excess loss, would learn (class-conditional here:
the 5,500 training images of the requested class). We sample it with Euler from the same noises the root Flow lab used
(seed 11, 10 per class), sample the root's trained flow model (fw_fm_4000.pt, CPU) from the same noises, and measure
how close each sample is to its nearest training image (RMS per pixel on the 28x28 crop, pixel range [-1, 1]).
Writes out/memo.json and out/memo_strips.npz here.
"""
import json, os, sys, time

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT_SRC = os.path.join(HERE, "..", "..", "..", "src")
sys.path.insert(0, os.path.join(ROOT_SRC, "data")); sys.path.insert(0, os.path.join(ROOT_SRC, "flow"))
import numpy as np
import torch
from common import cap_threads, load_split, to_model, from_model, scratch, MACHINE
from nets import TinyUNet
from fm_samplers import euler

cap_threads(4)
t0 = time.time()
xtr, ytr = load_split("train"); xte, yte = load_split("test")
D = to_model(xtr).float()                      # 55000, 1, 32, 32 in [-1, 1]
Yt = torch.from_numpy(np.asarray(ytr)).long()
zN = torch.randn((1000, 1, 32, 32), generator=torch.Generator().manual_seed(11))
PER = 10
idx = torch.cat([torch.arange(c * 100, c * 100 + PER) for c in range(10)])       # the first 10 noises of each class block
Z = zN[idx]; Y = torch.arange(10).repeat_interleave(PER)


@torch.no_grad()
def exact_sample(z, c, n):
    """Euler on the exact empirical field of class c. Returns the end point and the max posterior weight at the last step."""
    Dc = D[Yt == c].flatten(1)                   # Nc, 1024
    x = z.flatten(1).clone(); wmax = None
    for k in range(n):
        t, h = k / n, 1.0 / n
        d2 = torch.cdist(x, t * Dc) ** 2          # B, Nc
        w = torch.softmax(-d2 / (2 * (1 - t) ** 2), 1)
        E1 = w @ Dc
        x = x + h * (E1 - x) / (1 - t)
        wmax = w.max(1).values
    return x.view(-1, 1, 32, 32), wmax


def crop(x):
    return x[:, 0, 2:30, 2:30].reshape(len(x), -1)


Dcrop = crop(D)


def nn_dist(x):
    """RMS per pixel to the nearest training image (28x28 crop, range [-1, 1]), and its index."""
    d = torch.cdist(crop(x.clamp(-1, 1)), Dcrop) ** 2 / Dcrop.shape[1]
    v, i = d.min(1)
    return v.sqrt(), i


net = TinyUNet(); net.load_state_dict(torch.load(scratch("ckpt", "fw_fm_4000.pt"), map_location="cpu")["ema"]); net.eval()
out = {"machine": MACHINE, "device": "cpu", "date": time.strftime("%Y-%m-%d"), "per_class": PER, "steps": {}, "nn": {}}
strips = {"noise": from_model(Z[::PER])}
for n in [1, 4, 10, 50]:
    xs, ws = [], []
    for c in range(10):
        x, w = exact_sample(Z[Y == c], c, n); xs.append(x); ws.append(w)
    xe = torch.cat(xs); we = torch.cat(ws)
    xm = euler(net, Z, Y, n)
    de, ie = nn_dist(xe); dm, im = nn_dist(xm)
    out["steps"][n] = {"exact_nn_rms_median": round(float(de.median()), 5), "exact_nn_rms_max": round(float(de.max()), 5),
                       "exact_copies_frac": round(float((de < 0.01).float().mean()), 4),
                       "exact_last_wmax_median": round(float(we.median()), 4),
                       "net_nn_rms_median": round(float(dm.median()), 5), "net_nn_rms_min": round(float(dm.min()), 5),
                       "same_nn_frac": round(float((ie == im).float().mean()), 4)}
    strips[f"exact_{n}"] = from_model(xe[::PER]); strips[f"net_{n}"] = from_model(xm[::PER])
    if n == 50:
        strips["exact_50_nn"] = from_model(D[ie[::PER]]); strips["net_50_nn"] = from_model(D[im[::PER]])
    print(n, out["steps"][n], round(time.time() - t0, 1), "s", flush=True)
# baselines: held-out real test images (100, 10 per class) against the training set
xt = to_model(xte).float(); yt = torch.from_numpy(np.asarray(yte)).long()
sel = torch.cat([torch.nonzero(yt == c)[:PER, 0] for c in range(10)])
dt, _ = nn_dist(xt[sel])
out["nn"]["test_rms_median"] = round(float(dt.median()), 5); out["nn"]["test_rms_min"] = round(float(dt.min()), 5)
out["seconds"] = round(time.time() - t0, 1)
json.dump(out, open(os.path.join(HERE, "..", "out", "memo.json"), "w"), indent=0)
np.savez_compressed(os.path.join(HERE, "..", "out", "memo_strips.npz"), **strips)
print("done", out, flush=True)
