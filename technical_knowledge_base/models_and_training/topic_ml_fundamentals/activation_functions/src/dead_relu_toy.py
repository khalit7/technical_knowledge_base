"""Dead ReLUs in a small network trained for real, offline.

Data: scikit-learn's digits (1,797 handwritten 8x8 digits, UCI), pixels standardised; 1,437 for training, 360 held out.
Model: MLP 64-128-128-128-10, He (Kaiming normal) initialisation, zero biases; ReLU or leaky ReLU (slope 0.01);
SGD with momentum 0.9, batch 32, 30 epochs, at learning rates 0.01 to 0.3 (LRS); seeds 0 to 4.
A hidden unit is "dead" when its pre-activation is <= 0 on every one of the 1,797 images (so it outputs 0 and passes
no gradient for any of them). For leaky ReLU the same count is reported, though such units still pass 1% of the gradient.
Also recorded: the dead count after every epoch, held-out accuracy, and whether the loss went to NaN.

Run: OMP_NUM_THREADS=2 uv run --with torch --with scikit-learn python dead_relu_toy.py   (writes inputs/dead_relu_toy.json)
"""
import json, os, math
import torch, torch.nn as nn
from sklearn.datasets import load_digits

torch.set_num_threads(2)
HERE = os.path.dirname(os.path.abspath(__file__))
X, y = load_digits(return_X_y=True)
X = torch.tensor(X, dtype=torch.float32); y = torch.tensor(y)
X = (X - X.mean(0)) / (X.std(0) + 1e-6)
g = torch.Generator().manual_seed(123)
perm = torch.randperm(len(X), generator=g)
tr, te = perm[:1437], perm[1437:]
W = [64, 128, 128, 128, 10]
LRS = [0.01, 0.02, 0.03, 0.04, 0.05, 0.06, 0.07, 0.08, 0.1, 0.3]
SEEDS = [0, 1, 2, 3, 4]

def make(act, seed):
    torch.manual_seed(seed)
    layers = []
    for i in range(4):
        lin = nn.Linear(W[i], W[i + 1])
        nn.init.kaiming_normal_(lin.weight, nonlinearity="relu"); nn.init.zeros_(lin.bias)
        layers.append(lin)
    return nn.ModuleList(layers)

def forward(L, act, x, keep=False):
    pres = []
    for i, lin in enumerate(L):
        x = lin(x)
        if i < 3:
            pres.append(x)
            x = torch.relu(x) if act == "relu" else nn.functional.leaky_relu(x, 0.01)
    return x, pres

def dead_counts(L, act):
    with torch.no_grad():
        _, pres = forward(L, act, X)
    return [int((p <= 0).all(0).sum()) for p in pres]

def masks(L, act):
    # per unit: 1 if dead on all 1,797 images; plus the share of images on which each unit is on, in tenths
    with torch.no_grad():
        _, pres = forward(L, act, X)
    return "".join("".join("x" if bool(d) else str(min(9, int(f * 10))) for d, f in zip((p <= 0).all(0).tolist(), (p > 0).float().mean(0).tolist())) for p in pres)

SHOW = {("relu", 0.04, 0), ("relu", 0.08, 0), ("leaky", 0.08, 0)}

runs = []
for act in ["relu", "leaky"]:
    for lr in LRS:
        for seed in SEEDS:
            L = make(act, seed)
            opt = torch.optim.SGD(L.parameters(), lr=lr, momentum=0.9)
            gen = torch.Generator().manual_seed(seed)
            hist = [sum(dead_counts(L, act))]
            nan = False
            show = (act, lr, seed) in SHOW
            frames = []
            def frame(ep, tl):
                with torch.no_grad():
                    o, _ = forward(L, act, X[te])
                    a = float((o.argmax(1) == y[te]).float().mean())
                frames.append(dict(ep=ep, loss=tl, acc=a if math.isfinite(tl if tl is not None else 0) else None, m=masks(L, act)))
            if show: frame(0, None)
            for ep in range(30):
                idx = tr[torch.randperm(len(tr), generator=gen)]
                tot, cnt = 0.0, 0
                for b in range(0, len(idx), 32):
                    j = idx[b:b + 32]
                    out, _ = forward(L, act, X[j])
                    loss = nn.functional.cross_entropy(out, y[j])
                    if not torch.isfinite(loss): nan = True; break
                    tot += float(loss) * len(j); cnt += len(j)
                    opt.zero_grad(); loss.backward(); opt.step()
                if nan:
                    if show: frames.append(dict(ep=ep + 1, loss=None, acc=None, m=None, nan=True))
                    break
                if show: frame(ep + 1, tot / cnt)
                hist.append(sum(dead_counts(L, act)))
            with torch.no_grad():
                out, _ = forward(L, act, X[te]); acc = float((out.argmax(1) == y[te]).float().mean()) if not nan else None
            dc = dead_counts(L, act) if not nan else None
            runs.append(dict(act=act, lr=lr, seed=seed, dead_layers=dc, dead_hist=hist, acc=acc, nan=nan, **({'frames': frames} if show else {})))
            print(act, lr, seed, dc, acc, nan)
json.dump(dict(units=384, images=1797, epochs=30, runs=runs), open(os.path.join(HERE, "inputs", "dead_relu_toy.json"), "w"), separators=(",", ":"))
