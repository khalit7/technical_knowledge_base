"""Rate and distortion of the toy models against reverse-process time, as Figure 5 and Table 4 of the
paper (https://arxiv.org/html/2006.11239v2#S4.SS3) measure them for CIFAR10.

  uv run --with torch --with numpy python rd.py      -> model/rd.json

At reverse time tau = T - t + 1 the receiver holds x_t. Rate = L_T + sum_{s=t..T-1} L_s (bits sent so
far, per dimension); distortion = RMSE between x_0 and the Eq. 15 estimate x0_hat(x_t), on the 0..255
scale. Both use the 2,000 held-out test points, one eps draw per (point, t), float weights.
"""
import json, math, os
import numpy as np
import torch
import toy as Y
import train as TR

torch.set_num_threads(2)
out = {'_doc': __doc__.strip().splitlines()[0], 'tau': list(range(10, 1001, 10)), 'variants': {}}
X = TR.TEST
for kind in ['eps_simple', 'eps_true', 'mu_true', 'mu_mse']:
    net = TR.load(kind)
    tot, per_t, lt = TR.bound_bpd(net, kind, X)
    nats = per_t.numpy().astype(np.float64)  # per_t[k] = term at t = k+1 (L_k for k >= 1, L_0 at k = 0)
    D = Y.D * math.log(2)
    rate, dist = [], []
    g = torch.Generator().manual_seed(9)
    for tau in out['tau']:
        t = Y.T - tau + 1
        rate.append(lt + float(nats[t:].sum()) / D)
        tt = torch.full((X.shape[0],), t, dtype=torch.long)
        e = torch.randn(X.shape, generator=g)
        with torch.no_grad():
            xt = Y.q_sample(X, tt, e)
            _, eps = Y.model_mean(net, kind, xt, tt)
            if eps is None:   # mu variants: the implied eps from mu (inverting Eq. 11)
                mu = net(xt, tt)
                b, ab, a = (Y.SCH[k][t - 1] for k in ('beta', 'abar', 'alpha'))
                eps = (xt - a.sqrt() * mu) * (1 - ab).sqrt() / b
            ab = Y.SCH['abar'][t - 1]
            xh = (xt - (1 - ab).sqrt() * eps) / ab.sqrt()        # Eq. 15
        dist.append(float(((X - xh) ** 2).mean().sqrt()) * 127.5)
    out['variants'][kind] = {'bound_bpd': tot, 'LT_bpd': lt, 'L0_bpd': float(nats[0]) / D,
                             'rate': [round(v, 5) for v in rate], 'dist': [round(v, 4) for v in dist],
                             'per_t_bits_per_dim_every10': [round(float(v) / D, 6) for v in nats[::10]]}
    print(kind, 'bound', round(tot, 4), 'rate at end', round(rate[-1], 4), 'distortion at end', round(dist[-1], 3), flush=True)
json.dump(out, open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'model', 'rd.json'), 'w'))
