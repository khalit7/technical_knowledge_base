"""Good accuracy, useless on the minority class: recorded on a real imbalanced split.

Task: "is this digit a 9?" on scikit-learn's 8x8 digits. Train: 800 non-nines and 40 nines; validation: another
800 and 40 (disjoint), so both splits are 1:20 (4.8% positive) and "always say no" scores 95.2% accuracy.
Model: MLP 64-32-1 (ReLU), Adam 1e-3, batch 32, 300 steps, inputs standardised on the training split, torch threads 2.
Remedies compared at the same budget: plain cross-entropy; re-weighting (positive weight 20); focal loss with
gamma = 2, alpha = 0.25 (Lin et al. 2017's best setting); oversampling the nines to half of each batch; and plain
cross-entropy with the output bias initialised to the prior, b = -log((1 - pi) / pi), pi = 1/21 (Lin et al.'s
initialisation, Karpathy's "init well"). Seeds 1, 2, 3; the positive subsets are the same for every method.
Metrics on validation at threshold 0.5: accuracy, precision, recall, F1; and AUPRC (average precision, threshold-free).

usage: uv run --with torch --with scikit-learn python runs_imbalance.py
"""
import json, math, os
import numpy as np
import torch, torch.nn as nn, torch.nn.functional as F
from sklearn.datasets import load_digits
from sklearn.metrics import average_precision_score

torch.set_num_threads(2)
HERE = os.path.dirname(os.path.abspath(__file__))
d = load_digits(); X = d.data.astype(np.float32); y = (d.target == 9).astype(np.float32)
rs = np.random.RandomState(0)
neg = rs.permutation(np.where(y == 0)[0]); pos = rs.permutation(np.where(y == 1)[0])
tr = np.concatenate([neg[:800], pos[:40]]); va = np.concatenate([neg[800:1600], pos[40:80]])
mu, sd = X[tr].mean(0), X[tr].std(0); X = (X - mu) / np.where(sd < 1e-3, 1, sd)
Xt, yt, Xv, yv = map(torch.tensor, (X[tr], y[tr], X[va], y[va]))
PI = 40 / 840


def focal(z, t, gamma=2.0, alpha=0.25):
    p = torch.sigmoid(z); pt = torch.where(t == 1, p, 1 - p); at = torch.where(t == 1, alpha, 1 - alpha)
    return (-at * (1 - pt) ** gamma * torch.log(pt.clamp_min(1e-12))).mean()


def metrics(z):
    p = torch.sigmoid(z).numpy(); pred = p >= 0.5; t = yv.numpy() == 1
    tp, fp, fn = (pred & t).sum(), (pred & ~t).sum(), (~pred & t).sum()
    prec = tp / (tp + fp) if tp + fp else 0.0; rec = tp / (tp + fn)
    f1 = 2 * prec * rec / (prec + rec) if prec + rec else 0.0
    return {'acc': round(float((pred == t).mean()), 4), 'prec': round(float(prec), 4), 'rec': round(float(rec), 4),
            'f1': round(float(f1), 4), 'auprc': round(float(average_precision_score(t, p)), 4), 'tp': int(tp), 'fp': int(fp), 'fn': int(fn)}


def run(method, seed, steps=300, bs=32):
    torch.manual_seed(seed); g = np.random.RandomState(seed)
    m = nn.Sequential(nn.Linear(64, 32), nn.ReLU(), nn.Linear(32, 1))
    if method == 'prior_bias':
        nn.init.constant_(m[2].bias, -math.log((1 - PI) / PI))
    opt = torch.optim.Adam(m.parameters(), 1e-3)
    P, N = np.where(yt.numpy() == 1)[0], np.where(yt.numpy() == 0)[0]
    curve = []
    for s in range(1, steps + 1):
        idx = np.concatenate([g.choice(P, bs // 2), g.choice(N, bs // 2)]) if method == 'oversample' else g.randint(0, len(yt), bs)
        z = m(Xt[idx]).squeeze(-1); t = yt[idx]
        if method == 'focal':
            loss = focal(z, t)
        elif method == 'weighted':
            loss = F.binary_cross_entropy_with_logits(z, t, pos_weight=torch.tensor(20.0))
        else:
            loss = F.binary_cross_entropy_with_logits(z, t)
        opt.zero_grad(); loss.backward(); opt.step()
        if s % 10 == 0 or s == 1:
            with torch.no_grad():
                mm = metrics(m(Xv).squeeze(-1))
            curve.append([s, mm['acc'], mm['rec'], mm['f1'], mm['auprc']])
    with torch.no_grad():
        return {'final': metrics(m(Xv).squeeze(-1)), 'curve': curve}


if __name__ == '__main__':
    METHODS = ['plain', 'weighted', 'focal', 'oversample', 'prior_bias']
    res = {'_doc': __doc__.strip(), 'n_train': [800, 40], 'n_val': [800, 40], 'always_no_acc': round(800 / 840, 4), 'runs': {}}
    for meth in METHODS:
        rs_ = [run(meth, s) for s in (1, 2, 3)]
        mean = {k: round(float(np.mean([r['final'][k] for r in rs_])), 4) for k in rs_[0]['final']}
        res['runs'][meth] = {'seeds': [r['final'] for r in rs_], 'mean': mean, 'curve_seed1': rs_[0]['curve']}
        print(meth, mean, flush=True)
    json.dump(res, open(os.path.join(HERE, 'runs_imbalance.json'), 'w'), separators=(',', ':'))
