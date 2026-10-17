"""Zero-shot classification and linear probes on Fashion-MNIST from the saved embeddings (numpy only, no model).

Usage: python -I zeroshot.py   (after embed_fmnist.py and analyse.py for both models)
Writes out/zeroshot.json:
  - accuracy on the 10,000 test images for every prompt set (2 class wordings x 5 templates + ensemble)
  - the confusion matrix of the best and of the bare-name prompt set
  - linear probes (multinomial logistic regression, full-batch gradient descent, L2) trained on k = 1, 4, 16, 64
    and 500 val images per class (5 draws for k <= 64), tested on the same 10,000
  - 40 query images (the first 4 test images of each class): cosines to every prompt set's 10 class texts
"""
import os, sys, json, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from vs_env import *
import numpy as np

R = {"date": time.strftime("%Y-%m-%d"), "machine": MACHINE, "classes": CLASSES}
xt, yt = load_split("test")
q = np.concatenate([np.where(yt == c)[0][:4] for c in range(10)])
R["query_idx"] = q.tolist()


def probe(X, y, Xt, yt, lam=1e-3, steps=1000, lr=0.5, standardise=True):
    # Unit-length embeddings have tiny coordinates (about 1/sqrt(768)); without rescaling, plain gradient descent
    # underfits badly (a first run without it gave 79.7% / 84.6% at k = 500, kept below as "unscaled").
    Xm = X.mean(0); X = X - Xm; Xt = Xt - Xm
    if standardise:
        s = X.std(); X = X / s; Xt = Xt / s
    else:
        lr, steps = 2.0, 600
    W = np.zeros((X.shape[1], 10)); b = np.zeros(10); Y = np.eye(10)[y]
    for _ in range(steps):
        z = X @ W + b; z -= z.max(1, keepdims=True); p = np.exp(z); p /= p.sum(1, keepdims=True)
        gW = X.T @ (p - Y) / len(y) + lam * W; gb = (p - Y).mean(0)
        W -= lr * gW; b -= lr * gb
    return float(((Xt @ W + b).argmax(1) == yt).mean())


for which in ("clip", "siglip"):
    E = np.load(big(f"fmnist_{which}.npz")); T = np.load(big(f"text_{which}.npz"))
    et = E["e_test"].astype(np.float32); ev = E["e_val"].astype(np.float32); yv = E["y_val"]
    assert (E["y_test"] == yt).all()
    m = {"acc": {}, "per_class": {}}
    for k in T.files:
        s = et @ T[k].T; pred = s.argmax(1)
        m["acc"][k] = round(float((pred == yt).mean()), 4)
        m["per_class"][k] = [round(float((pred[yt == c] == c).mean()), 3) for c in range(10)]
    best = max(m["acc"], key=m["acc"].get); m["best"] = best
    for k in (best, "official|bare"):
        s = et @ T[k].T; pred = s.argmax(1)
        m.setdefault("confusion", {})[k] = np.array([[int(((yt == i) & (pred == j)).sum()) for j in range(10)] for i in range(10)]).tolist()
    m["query_cos"] = {k: np.round(et[q] @ T[k].T, 4).tolist() for k in T.files}
    rng = np.random.default_rng(0); lp = {}
    for kk in (1, 4, 16, 64, 500):
        accs = []
        for d in range(5 if kk < 500 else 1):
            idx = np.concatenate([rng.permutation(np.where(yv == c)[0])[:kk] for c in range(10)])
            accs.append(probe(ev[idx], yv[idx], et, yt))
        lp[str(kk)] = {"mean": round(float(np.mean(accs)), 4), "min": round(min(accs), 4), "max": round(max(accs), 4), "draws": len(accs)}
        print(which, "probe k", kk, lp[str(kk)], flush=True)
    m["linear_probe"] = lp
    idx = np.concatenate([np.where(yv == c)[0][:500] for c in range(10)])
    m["linear_probe_unscaled_500"] = round(probe(ev[idx], yv[idx], et, yt, standardise=False), 4)
    m["probe_settings"] = "multinomial logistic regression, full-batch gradient descent, features centred and divided by their std, lr 0.5, L2 1e-3, 1000 steps; fixed, not tuned"
    R[which] = m
    print(which, "best", best, m["acc"][best], "bare", m["acc"]["official|bare"], flush=True)
dump("zeroshot.json", R)
