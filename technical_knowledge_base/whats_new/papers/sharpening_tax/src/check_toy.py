"""Check the page's toy engine (parts/22_js_toy.js) against the authors' released numpy code, piece by piece.

  node check_toy.mjs > model/toy_case.json
  <python with numpy> check_toy.py <path to a checkout of github.com/changdaeoh/sharpening-tax at 789ae06c>

Compares, on the same inputs: decision probabilities (their softmax), the policy-gradient update (their
policy_gradient), the tempering rule and pivot ramp (their temperature_from_p, pivot_at), pass@k, pass^k and S(K)
(their metrics.py), and the Beta sampler's moments against the exact Beta mean and variance.
Writes model/check_toy.json. Whole training runs are not compared draw for draw: the page uses its own seeded
random stream, so runs agree in distribution, not sample by sample (toy_sweep.mjs against the authors' printed toy table).
"""
import json, os, sys
import numpy as np
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, sys.argv[1])
from ptgs.controller import temperature_from_p, pivot_at
from sharpening_tax.metrics import pass_at_k, pass_hat_k, scalability
sys.path.insert(0, os.path.join(sys.argv[1], 'examples'))
from ptgs_toy import softmax, policy_gradient

C = json.load(open(os.path.join(HERE, 'model', 'toy_case.json')))
L, A, d = C['dims']
W = np.array(C['W']).reshape(L, A, d)
res = {}
dp = dg = ds = 0.0
for c in C['cases']:
    phi = np.array(c['phi'])
    P = softmax(W @ phi, c['T'])
    dp = max(dp, float(np.abs(P - np.array(c['P'])).max()))
    g = policy_gradient(P, np.array(c['acts']), np.array(c['adv']), phi, c['T'])
    dg = max(dg, float(np.abs(g.ravel() - np.array(c['grad'])).max()))
    # exact success probability: product of the right action's probability (correct actions are not in the case;
    # recompute from the JS probabilities instead) -- checked via P above
res['probs_maxdiff'] = dp
res['grad_maxdiff'] = dg
res['temp_maxdiff'] = max(abs(temperature_from_p(p, pv, tau, 1.0) - t) for p, pv, tau, t in C['temps'])
res['pivot_maxdiff'] = max(abs(pivot_at(s, 200) - v) for s, v in C['piv'])
c = np.array(C['counts']); n = np.full(len(c), 128)
cov = pass_at_k(c, n, 128).mean(0); con = pass_hat_k(c, n, 128).mean(0)
Ap, Sp = scalability(cov, 128)
res['passk_maxdiff'] = float(np.abs(cov - np.array(C['cov'])).max())
res['passhat_maxdiff'] = float(np.abs(con - np.array(C['con'])).max())
res['A_diff'] = float(abs(Ap[0] - C['A'])); res['S_diff'] = float(abs(Sp[0] - C['S']))
bt = []
for b in C['beta']:
    a, bb = b['a'], b['b']; m = a / (a + bb); v = a * bb / ((a + bb) ** 2 * (a + bb + 1))
    se = np.sqrt(v / 200000)
    bt.append({'a': a, 'b': bb, 'mean_js': b['mean'], 'mean_exact': m, 'z': (b['mean'] - m) / se, 'var_ratio': b['var'] / v})
res['beta'] = bt
ok = dp < 1e-12 and dg < 1e-12 and res['temp_maxdiff'] < 1e-12 and res['pivot_maxdiff'] < 1e-12 and res['passk_maxdiff'] < 1e-12 and res['passhat_maxdiff'] < 1e-12 \
    and res['A_diff'] < 1e-9 and res['S_diff'] < 1e-12 and all(abs(x['z']) < 4 and abs(x['var_ratio'] - 1) < 0.02 for x in bt)
res['verdict'] = 'PASS' if ok else 'FAIL'
json.dump(res, open(os.path.join(HERE, 'model', 'check_toy.json'), 'w'), indent=1)
print(json.dumps(res, indent=1))
