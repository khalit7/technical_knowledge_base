"""Train the page's four toy DDPMs (the four rows of the paper's Table 2 that differ in what the
network predicts and what it is trained on), then evaluate and export them for the browser.

  uv run --with torch --with numpy python train.py [variant ...]   # train (all four by default)
  uv run --with torch --with numpy python train.py eval            # bound and sample metrics -> model/report.json
  uv run --with torch --with numpy python train.py export          # quantise -> parts/20_model_data.js

Variants (same network, data, seed, steps; Table 2 of https://arxiv.org/html/2006.11239v2#S4.T2):
  eps_simple  predict eps, train on L_simple (Eq. 14)             the paper's recipe
  eps_true    predict eps, train on the true bound L (Eq. 5, 12, 13), fixed isotropic sigma^2 = beta
  mu_true     predict mu-tilde, train on the true bound L, fixed isotropic sigma^2 = beta
  mu_mse      predict mu-tilde, train on unweighted ||mu-tilde - mu_theta||^2
Training as Appendix B: Adam with standard settings, learning rate 2e-4, batch 128, EMA 0.9999;
t uniform on 1..T. Toy-scale departures: 2-D data, an MLP instead of the U-Net, no dropout, no flips,
STEPS steps instead of 800k.
"""
import json, os, sys, time, copy
import numpy as np
import torch
import toy as Y

torch.set_num_threads(2)
HERE = os.path.dirname(os.path.abspath(__file__))
MD = os.path.join(HERE, 'model'); os.makedirs(MD, exist_ok=True)
CFG = dict(steps=int(os.environ.get('STEPS', 150000)), batch=128, lr=2e-4, ema=0.9999, seed=0, n_train=10000, n_test=2000)
VARIANTS = ['eps_simple', 'eps_true', 'mu_true', 'mu_mse']
TRAIN = torch.tensor(Y.to_x(Y.swiss_roll(CFG['n_train'], 0)), dtype=torch.float32)
TEST = torch.tensor(Y.to_x(Y.swiss_roll(CFG['n_test'], 1)), dtype=torch.float32)


def loss_fn(net, kind, x0, t, eps):
    if kind == 'eps_simple':
        out = net(Y.q_sample(x0, t, eps), t)
        return ((eps - out) ** 2).mean()
    if kind == 'mu_mse':
        xt = Y.q_sample(x0, t, eps)
        return ((Y.post_mean(x0, xt, t) - net(xt, t)) ** 2).mean()
    return Y.bound_terms(net, kind, x0, t, eps).mean()     # eps_true, mu_true: the true bound


@torch.no_grad()
def bound_bpd(net, kind, X, seed=123, sig='beta'):
    """The full variational bound (Eq. 5) per point: L_T + sum_{t>1} L_{t-1} + L_0, every t, one eps
    per (point, t). Returns bits/dim mean and the per-t mean terms (nats per point)."""
    g = torch.Generator().manual_seed(seed)
    n = X.shape[0]; per_t = torch.zeros(Y.T); tot = Y.LT(X).clone()
    for t0 in range(1, Y.T + 1, 50):
        ts = torch.arange(t0, t0 + 50)
        tt = ts.repeat_interleave(n); xx = X.repeat(50, 1)
        e = torch.randn(xx.shape, generator=g)
        v = Y.bound_terms(net, kind, xx, tt, e, sig).view(50, n)
        per_t[t0 - 1:t0 + 49] = v.mean(1); tot += v.sum(0)
    return float(tot.mean() / (Y.D * np.log(2))), per_t, float(Y.LT(X).mean() / (Y.D * np.log(2)))


def train(kind):
    torch.manual_seed(CFG['seed']); np.random.seed(CFG['seed'])
    net = Y.Net(); ema = copy.deepcopy(net)
    opt = torch.optim.Adam(net.parameters(), lr=CFG['lr'])
    log = []; acc = 0.0; t0 = time.time(); bad = 0
    for step in range(1, CFG['steps'] + 1):
        idx = torch.randint(0, CFG['n_train'], (CFG['batch'],))
        x0 = TRAIN[idx]; t = torch.randint(1, Y.T + 1, (CFG['batch'],)); eps = torch.randn_like(x0)
        loss = loss_fn(net, kind, x0, t, eps)
        if not torch.isfinite(loss): bad += 1; continue
        opt.zero_grad(); loss.backward(); opt.step()
        with torch.no_grad():
            for pe, pn in zip(ema.parameters(), net.parameters()): pe.mul_(CFG['ema']).add_(pn, alpha=1 - CFG['ema'])
        acc += float(loss.detach())
        if step % 1000 == 0:
            row = {'step': step, 'loss': acc / 1000, 'sec': round(time.time() - t0, 1)}; acc = 0.0
            if step % 10000 == 0:
                row['test_bpd'] = bound_bpd(ema, kind, TEST[:500])[0]
            log.append(row); print(kind, row, flush=True)
    torch.save({'ema': ema.state_dict(), 'raw': net.state_dict(), 'cfg': CFG, 'nonfinite_steps': bad}, os.path.join(MD, kind + '.pt'))
    json.dump(log, open(os.path.join(MD, kind + '_log.json'), 'w'))


def load(kind, which='ema'):
    net = Y.Net(); net.load_state_dict(torch.load(os.path.join(MD, kind + '.pt'))[which]); net.eval(); return net


@torch.no_grad()
def sample(net, kind, n, seed, sig='beta'):
    """Algorithm 2; the last step returns mu_theta(x_1, 1) noiselessly (§3.3)."""
    g = torch.Generator().manual_seed(seed)
    x = torch.randn(n, 2, generator=g)
    for t in range(Y.T, 0, -1):
        tt = torch.full((n,), t, dtype=torch.long)
        mu, _ = Y.model_mean(net, kind, x, tt)
        if t > 1:
            var = Y.BETA[t - 1] if sig == 'beta' else Y.BTILDE[t - 1]
            x = mu + float(np.sqrt(var)) * torch.randn(n, 2, generator=g)
        else:
            x = mu
    return x


def pr_metrics(S, R, r=0.04):
    """Precision: share of samples within r of some reference point. Recall: share of reference
    points within r of some sample (a simple form of Kynkaanniemi et al. 2019). Plus the share of
    samples within r of the noiseless roll curve and the mean distance to it."""
    S = np.asarray(S); R = np.asarray(R); C = Y.roll_curve()
    d = lambda A, B: np.sqrt(((A[:, None, :] - B[None]) ** 2).sum(-1)).min(1)
    dc = d(S, C)
    return {'precision': float((d(S, R) < r).mean()), 'recall': float((d(R, S) < r).mean()),
            'on_roll': float((dc < r).mean()), 'mean_dist_roll': float(dc.mean())}


def evaluate():
    rep = {'cfg': CFG, 'variants': {}}
    real = Y.to_x(Y.swiss_roll(2000, 2))
    rep['real_data_reference'] = pr_metrics(real, TEST.numpy())
    rep['overlap_test_in_train'] = float(np.mean([tuple(p) in set(map(tuple, Y.swiss_roll(CFG['n_train'], 0).tolist())) for p in Y.swiss_roll(CFG['n_test'], 1).tolist()]))
    for kind in VARIANTS:
        if not os.path.exists(os.path.join(MD, kind + '.pt')): continue
        net = load(kind); ck = torch.load(os.path.join(MD, kind + '.pt'))
        te, per_t, lt = bound_bpd(net, kind, TEST)
        tr, _, _ = bound_bpd(net, kind, TRAIN[:2000])
        te_bt, _, _ = bound_bpd(net, kind, TEST, sig='btilde')
        S = sample(net, kind, 2000, 7).numpy()
        S2 = sample(net, kind, 2000, 7, sig='btilde').numpy()
        m = pr_metrics(S, TEST.numpy()); m2 = pr_metrics(S2, TEST.numpy())
        L0 = float(per_t[0]); rate = float(per_t[1:].sum()) + lt * Y.D * np.log(2)
        rep['variants'][kind] = {'test_bpd': te, 'train_bpd': tr, 'test_bpd_sigma_btilde': te_bt, 'LT_bpd': lt,
                                 'rate_bpd': rate / (Y.D * np.log(2)), 'distortion_L0_bpd': L0 / (Y.D * np.log(2)),
                                 'samples_sigma_beta': m, 'samples_sigma_btilde': m2, 'nonfinite_steps': ck.get('nonfinite_steps', 0),
                                 'per_t_terms_nats_every10': [round(float(v), 6) for v in per_t[::10]]}
        print(kind, json.dumps(rep['variants'][kind] | {'per_t_terms_nats_every10': '...'}), flush=True)
    json.dump(rep, open(os.path.join(MD, 'report.json'), 'w'), indent=1)


if __name__ == '__main__':
    a = sys.argv[1:]
    if a and a[0] == 'eval': evaluate()
    elif a and a[0] == 'export':
        import export; export.main()
    else:
        for k in (a or VARIANTS): train(k)
