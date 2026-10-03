"""Toy self-supervised runs on real data: the 1,797 scikit-learn 8x8 digits (UCI ML hand-written digits).

Two augmented views of each training image; 200 held-out digits (20 per class) are measured at 16 or 24
steps of training. Two modes:

  sphere    encoder MLP 64-256-256-2 (no BatchNorm), l2-normalised output = a point on the circle.
            Runs: InfoNCE at tau 0.2 and 0.5, positives only. Stores every test point's angle per snapshot
            (one byte) for the alignment and uniformity view (Wang and Isola 2020).
  collapse  encoder MLP 64-256-256-16 with BatchNorm (SimSiam's projector layout, scaled down), the same
            encoder for every objective: InfoNCE, positives only, SimSiam (with and without stop-gradient,
            without predictor), BYOL, DINO (with and without centering or sharpening), VICReg (with and
            without the variance term). Stores the 10 x 10 class-mean cosine matrix of the 200 test points per snapshot.

Per snapshot (all 200 test points): embedding std (std of the l2-normalised output, averaged over
dimensions, SimSiam section 4.1: about 1/sqrt(d) when spread, 0 when collapsed), per-dimension std,
effective rank (exp of the entropy of the normalised singular values, Roy and Vetterli 2007), alignment
(E||f(x)-f(x+)||^2 over two fresh augmentations) and uniformity (log E exp(-2||f(x)-f(y)||^2)), 5-NN accuracy
(leave one out, cosine). Three seeds per run; snapshots kept for seed 0, final metrics for all seeds.

Run:  OMP_NUM_THREADS=2 uv run --with torch --with scikit-learn --with numpy python train_toy.py sphere|collapse [steps] [only]
Writes inputs/toy_sphere.json or inputs/toy_collapse.json.
"""
import json, math, sys, time
import numpy as np
import torch, torch.nn as nn, torch.nn.functional as F
from sklearn.datasets import load_digits

torch.set_num_threads(2)
MODE = sys.argv[1]
STEPS = int(sys.argv[2]) if len(sys.argv) > 2 else 3000
ONLY = sys.argv[3].split(',') if len(sys.argv) > 3 else None
BATCH = 256
NSNAP = 24 if MODE == 'sphere' else 16
SNAP = sorted(set([0] + [int(round(x)) for x in np.geomspace(5, STEPS, NSNAP - 1)]))
D = 2 if MODE == 'sphere' else 16
BN = MODE == 'collapse'
K = 32  # DINO prototypes

X, Y = load_digits(return_X_y=True)
X = (X / 16.0).astype(np.float32)
rng = np.random.RandomState(0)
perm = rng.permutation(len(X))
te_idx = np.sort(np.concatenate([perm[Y[perm] == c][:20] for c in range(10)]))
tr_mask = np.ones(len(X), bool); tr_mask[te_idx] = False
Xtr = torch.tensor(X[tr_mask])
Xte, Yte = torch.tensor(X[te_idx]), Y[te_idx]
SHOW = np.concatenate([np.where(Yte == c)[0][:4] for c in range(10)])  # 40 points, 4 per class, in class order


def augment(x, g):
    """Shift by up to 2 pixels, drop 25% of pixels, contrast x0.6 to x1.4, add N(0, 0.1^2) noise."""
    n = x.shape[0]
    im = F.pad(x.view(n, 1, 8, 8), (2, 2, 2, 2))
    dx = torch.randint(0, 5, (n,), generator=g); dy = torch.randint(0, 5, (n,), generator=g)
    rows = (dy[:, None] + torch.arange(8))[:, :, None]; cols = (dx[:, None] + torch.arange(8))[:, None, :]
    out = im[torch.arange(n)[:, None, None], 0, rows, cols].unsqueeze(1)
    keep = (torch.rand(n, 1, 8, 8, generator=g) > 0.25).float()
    s = 0.6 + 0.8 * torch.rand(n, 1, 1, 1, generator=g)
    out = out * keep * s + 0.1 * torch.randn(n, 1, 8, 8, generator=g)
    return out.view(n, 64)


def encoder():
    if not BN:
        return nn.Sequential(nn.Linear(64, 256), nn.ReLU(), nn.Linear(256, 256), nn.ReLU(), nn.Linear(256, D))
    return nn.Sequential(nn.Linear(64, 256), nn.BatchNorm1d(256), nn.ReLU(), nn.Linear(256, 256), nn.BatchNorm1d(256), nn.ReLU(),
                         nn.Linear(256, D), nn.BatchNorm1d(D))


def predictor():
    return nn.Sequential(nn.Linear(D, 8), nn.BatchNorm1d(8), nn.ReLU(), nn.Linear(8, D))


def measure(enc, ge):
    enc.eval()
    with torch.no_grad():
        z = F.normalize(enc(Xte), dim=1)
        a = F.normalize(enc(augment(Xte, ge)), dim=1); b = F.normalize(enc(augment(Xte, ge)), dim=1)
    enc.train()
    pds = z.std(0)
    std = pds.mean().item()
    d2 = torch.cdist(z, z).pow(2); iu = torch.triu_indices(len(z), len(z), 1)
    unif = torch.log(torch.exp(-2 * d2[iu[0], iu[1]]).mean()).item()
    al = (a - b).pow(2).sum(1).mean().item()
    s = z @ z.T; s.fill_diagonal_(-9)
    votes = Yte[s.topk(5, dim=1).indices.numpy()]
    knn = float((np.array([np.bincount(v, minlength=10).argmax() for v in votes]) == Yte).mean())
    sv = torch.linalg.svdvals(z - z.mean(0)); p = sv / sv.sum().clamp_min(1e-12)
    erank = math.exp(-(p * torch.log(p.clamp_min(1e-12))).sum().item())
    return z, dict(std=round(std, 4), pds=[round(v, 3) for v in pds.tolist()], erank=round(erank, 3),
                   align=round(al, 4), unif=round(unif, 4), knn=round(knn, 4))


SPHERE_RUNS = {
    'infonce': dict(kind='infonce', tau=0.2),
    'infonce_t05': dict(kind='infonce', tau=0.5),
    'pos_only': dict(kind='pos_only'),
}
COLLAPSE_RUNS = {
    'infonce': dict(kind='infonce', tau=0.2),
    'pos_only': dict(kind='pos_only'),
    'simsiam': dict(kind='simsiam', stopgrad=True, pred=True),
    'simsiam_nosg': dict(kind='simsiam', stopgrad=False, pred=True),
    'simsiam_nopred': dict(kind='simsiam', stopgrad=True, pred=False),
    'byol': dict(kind='byol', m=0.99),
    'dino': dict(kind='dino', center=True, tt=0.04, ts=0.1, m=0.996),
    'dino_nocenter': dict(kind='dino', center=False, tt=0.04, ts=0.1, m=0.996),
    'dino_nosharp': dict(kind='dino', center=True, tt=0.1, ts=0.1, m=0.996),
    'vicreg': dict(kind='vicreg', var=25.0),
    'vicreg_novar': dict(kind='vicreg', var=0.0),
}


def ema(t, s, m):
    with torch.no_grad():
        for a, b in zip(t.parameters(), s.parameters()): a.mul_(m).add_(b, alpha=1 - m)
        for a, b in zip(t.buffers(), s.buffers()): a.copy_(b)


def run(cfg, seed, keep):
    torch.manual_seed(seed); g = torch.Generator().manual_seed(1000 + seed); ge = torch.Generator().manual_seed(7)
    enc = encoder(); params = list(enc.parameters()); kind = cfg['kind']
    pred = None
    if kind == 'byol' or (kind == 'simsiam' and cfg['pred']):
        pred = predictor(); params += list(pred.parameters())
    if kind == 'byol':
        tgt = encoder(); tgt.load_state_dict(enc.state_dict()); [p.requires_grad_(False) for p in tgt.parameters()]
    if kind == 'dino':
        head = nn.utils.parametrizations.weight_norm(nn.Linear(D, K, bias=False)); params += list(head.parameters())
        t_enc = encoder(); t_enc.load_state_dict(enc.state_dict())
        t_head = nn.utils.parametrizations.weight_norm(nn.Linear(D, K, bias=False)); t_head.load_state_dict(head.state_dict())
        for p in list(t_enc.parameters()) + list(t_head.parameters()): p.requires_grad_(False)
        center = torch.zeros(K)
    opt = torch.optim.SGD(params, lr=0.05, momentum=0.9, weight_decay=5e-4) if BN else torch.optim.Adam(params, lr=1e-3)
    snaps, kept, last = [], [], None
    for step in range(STEPS + 1):
        if step in SNAP:
            z, rec = measure(enc, ge); rec['step'] = step; rec['loss'] = last
            if kind == 'dino':
                t_enc.eval()
                with torch.no_grad():
                    tl = t_head(F.normalize(t_enc(Xte), dim=1))
                    pt = F.softmax((tl - (center if cfg['center'] else 0)) / cfg['tt'], dim=1)
                    rec['t_entropy'] = round(-(pt * torch.log(pt + 1e-12)).sum(1).mean().item(), 4)
                    pm = pt.mean(0); rec['kl_mean_unif'] = round((pm * torch.log(pm * K + 1e-12)).sum().item(), 4)
                t_enc.train()
            snaps.append(rec)
            if keep:
                if MODE == 'sphere':
                    ang = torch.atan2(z[:, 1], z[:, 0]).numpy()
                    kept.append([int(round((a % (2 * math.pi)) / (2 * math.pi) * 256)) % 256 for a in ang])
                else:  # class-mean cosine matrix (10 x 10, diagonal over distinct pairs), upper triangle, x1000
                    S = (z @ z.T).numpy(); cm = []
                    for a in range(10):
                        for b in range(a, 10):
                            blk = S[np.ix_(Yte == a, Yte == b)]
                            v = (blk.sum() - np.trace(blk)) / (blk.size - blk.shape[0]) if a == b else blk.mean()
                            cm.append(int(round(float(v) * 1000)))
                    kept.append(cm)
        if step == STEPS: break
        x = Xtr[torch.randint(0, len(Xtr), (BATCH,), generator=g)]
        x1, x2 = augment(x, g), augment(x, g)
        if kind == 'infonce':
            z = F.normalize(torch.cat([enc(x1), enc(x2)]), dim=1)
            s = z @ z.T / cfg['tau']; s.fill_diagonal_(-1e9)
            loss = F.cross_entropy(s, torch.cat([torch.arange(BATCH, 2 * BATCH), torch.arange(0, BATCH)]))
        elif kind == 'pos_only':
            loss = (F.normalize(enc(x1), dim=1) - F.normalize(enc(x2), dim=1)).pow(2).sum(1).mean()
        elif kind == 'simsiam':
            z1, z2 = enc(x1), enc(x2)
            p1, p2 = (pred(z1), pred(z2)) if pred is not None else (z1, z2)
            if cfg['stopgrad']: z1, z2 = z1.detach(), z2.detach()
            loss = -0.5 * (F.cosine_similarity(p1, z2).mean() + F.cosine_similarity(p2, z1).mean())
        elif kind == 'byol':
            p1, p2 = pred(enc(x1)), pred(enc(x2))
            with torch.no_grad(): t1, t2 = tgt(x1), tgt(x2)
            loss = (2 - 2 * F.cosine_similarity(p1, t2)).mean() + (2 - 2 * F.cosine_similarity(p2, t1)).mean()
        elif kind == 'dino':
            s1 = head(F.normalize(enc(x1), dim=1)); s2 = head(F.normalize(enc(x2), dim=1))
            with torch.no_grad():
                t1 = t_head(F.normalize(t_enc(x1), dim=1)); t2 = t_head(F.normalize(t_enc(x2), dim=1))
                c = center if cfg['center'] else 0
                q1 = F.softmax((t1 - c) / cfg['tt'], 1); q2 = F.softmax((t2 - c) / cfg['tt'], 1)
            loss = 0.5 * (-(q2 * F.log_softmax(s1 / cfg['ts'], 1)).sum(1).mean() - (q1 * F.log_softmax(s2 / cfg['ts'], 1)).sum(1).mean())
        elif kind == 'vicreg':
            z1, z2 = enc(x1), enc(x2)
            def vc(z):
                z = z - z.mean(0); sd = torch.sqrt(z.var(0) + 1e-4)
                cov = (z.T @ z) / (len(z) - 1); off = cov - torch.diag(torch.diag(cov))
                return F.relu(1 - sd).mean(), off.pow(2).sum() / D
            v1, c1 = vc(z1); v2, c2 = vc(z2)
            loss = 25.0 * F.mse_loss(z1, z2) + cfg['var'] * 0.5 * (v1 + v2) + 1.0 * (c1 + c2)
        opt.zero_grad(); loss.backward(); opt.step(); last = round(loss.item(), 4)
        if kind == 'byol': ema(tgt, enc, cfg['m'])
        if kind == 'dino':
            ema(t_enc, enc, cfg.get('m', 0.99)); ema(t_head, head, cfg.get('m', 0.99))
            if cfg['center']: center = 0.9 * center + 0.1 * torch.cat([t1, t2]).mean(0)
    return snaps, kept


def main():
    runs = SPHERE_RUNS if MODE == 'sphere' else COLLAPSE_RUNS
    out = dict(mode=MODE, steps=STEPS, batch=BATCH, dim=D, snap_steps=SNAP, test_labels=Yte.tolist(),
               show_idx=SHOW.tolist(), runs={})
    t0 = time.time()
    for name, cfg in runs.items():
        if ONLY and name not in ONLY: continue
        finals = []
        for seed in range(3):
            snaps, kept = run(cfg, seed, seed == 0)
            finals.append(snaps[-1])
            if seed == 0: out['runs'][name] = dict(cfg=cfg, snaps=snaps, kept=kept)
        out['runs'][name]['final_seeds'] = finals
        print(f"{name:15s} " + "  ".join(f"s{i}: std {f['std']:.3f} er {f['erank']:.2f} knn {f['knn']:.2f} al {f['align']:.2f} un {f['unif']:.2f}" for i, f in enumerate(finals)) + f"  {time.time()-t0:.0f}s", flush=True)
    if not ONLY:
        json.dump(out, open(f'inputs/toy_{MODE}.json', 'w'), separators=(',', ':'))


if __name__ == '__main__':
    main()
