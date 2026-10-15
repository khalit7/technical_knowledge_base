"""Collect the proxy runs of run_pending.sh into ../data/proxy_runs.json (what the page embeds), and with --fit
choose the best mixture for the rank check ($MX2_WORK/mix_best.json).

Target: the mean held-out loss over the five domains (uniform weight per domain). Fit: the Data Mixing Laws form
L = c + exp(b + sum_j t_j r_j) on the sweep runs; RegMix's selection: score 100,000 Dirichlet samples, average the best 128.
"""
import argparse, glob, json, os
import numpy as np
from scipy.optimize import least_squares
W = os.environ['MX2_WORK']; H = os.path.dirname(os.path.abspath(__file__))
ap = argparse.ArgumentParser(); ap.add_argument('--fit', action='store_true'); a = ap.parse_args()
names = list(json.load(open(f'{W}/domains.json')))
runs = [json.load(open(f)) for f in sorted(glob.glob(f'{W}/runs/*.json'))]
sweep = [r for r in runs if r.get('tag', '').startswith('sweep_')]
X = np.array([[r['weights'][n] for n in names] for r in sweep]); y = np.array([np.mean([r['val_loss'][n] for n in names]) for r in sweep])
f = lambda p, R: p[0] + np.exp(p[1] + R @ p[2:])
fit = least_squares(lambda p: f(p, X) - y, x0=np.r_[y.min() - 0.5, 0.0, np.zeros(len(names))], method='lm', max_nfev=20000)
st = json.load(open(f'{W}/tok/stats.json')); prior = np.array([st[n]['train'] for n in names], float); prior /= prior.sum()
S = np.random.default_rng(42).dirichlet(prior * 5, 100000); best = S[np.argsort(f(fit.x, S))[:128]].mean(0)
if a.fit:
    json.dump(dict(zip(names, best.tolist())), open(f'{W}/mix_best.json', 'w')); print('best', dict(zip(names, best.round(3))))
out = {'names': names, 'runs': [{k: r[k] for k in ('tag', 'weights', 'val_loss', 'tokens', 'seconds', 'tokens_per_s', 'device', 'params_non_embedding', 'config') if k in r} for r in runs if 'val_loss' in r],
       'doremi': [json.load(open(p)) for p in glob.glob(f'{W}/runs/doremi_proxy_*.json')],
       'fit': {'c': float(fit.x[0]), 'b': float(fit.x[1]), 't': dict(zip(names, fit.x[2:].round(4).tolist())), 'best': dict(zip(names, best.round(4).tolist()))}}
json.dump(out, open(f'{H}/../data/proxy_runs.json', 'w'), separators=(',', ':')); print('runs', len(out['runs']))
