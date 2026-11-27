"""Recompute every number this page derives, and the live toy's exact values (no sampling anywhere).

  python3 src/recompute.py        (from the page folder; writes src/inputs/recompute.json, which check_page.mjs reads
                                   and the page ships as window.ARTICLE.recompute)

1. The toy: "a token that does not matter". One prompt, two steps. Step 1 picks a path, A or B; the reward is 1 for A
   and 0 for B. Step 2 picks one of four filler tokens (w, x, y, z) that the reward ignores. The trainer p is a softmax
   over its own logits at each prefix (tabular: a logit per prefix and token; illustrative values below). The sampler q
   is the trainer plus a fixed logit offset sigma * d, d drawn once and held fixed (the paper's synthetic mismatch adds
   a fixed Gaussian offset to the sampler's weights; here it is added to logits). Every expectation is an exact sum over
   the 2 x 4 outcomes. For each estimator the script computes, at the starting weights:
     drift  = the norm of the expected update on the filler logits (the true gradient there is exactly zero);
     sd     = the square root of the summed variance of one sampled update (all ten logits);
     signal = the expected update on the path logit divided by the on-policy gradient p(A)(1 - p(A)).
   and the online loop: 400 expected-update steps (learning rate 1) with the sampler refreshed from the trainer every
   step (sampler = trainer + sigma * d), recording the trainer's p(w | A); "offline" keeps the sampler at the start.
   Group centering uses the population baseline E_q[R] = q(A) (the group mean in the limit of a large group).
2. Arithmetic in the article and the paper: the 0.1 / 0.001 ratio, the 152K-vocabulary storage estimate (paper A.1),
   group centering's 1 - 1/G (paper footnote 4), the head-only centering identity (paper Eq. 10 and 12, on random
   distributions), and that the loss of paper Eq. 14 has the centred score as its gradient (finite differences).
"""
import json, math, os, random

HERE = os.path.dirname(os.path.abspath(__file__))
TH1, TH2 = [0.0, 0.0], [0.6, 0.3, 0.0, -0.4]                       # trainer's starting logits (illustrative)
D1, D2 = [0.15, -0.15], {'A': [0.8, -0.2, 0.3, -0.9], 'B': [-0.6, 0.5, 0.4, -0.3]}  # the fixed offset direction (illustrative)
RWD = {'A': 1.0, 'B': 0.0}
F = {'one': lambda r: 1.0, 'tis': lambda r: min(r, 2.0), 'mis': lambda r: (r if 0.5 <= r <= 5.0 else 0.0), 'is': lambda r: r}
# key, baseline, importance weight f(r) with r = p / q, score centering on or off (paper Eq. 11: centre the weighted score)
EST = [('pg', 'none', 'one', False), ('gc', 'group', 'one', False), ('tis', 'group', 'tis', False), ('mis', 'group', 'mis', False),
       ('is', 'group', 'is', False), ('sc', 'group', 'one', True), ('sctis', 'group', 'tis', True)]
T, ETA = 400, 1.0


def sm(z):
    m = max(z); e = [math.exp(x - m) for x in z]; s = sum(e)
    return [x / s for x in e]


def moments(th, sig, est, thq=None):
    key, base, fw, cen = est
    f = F[fw]
    qs = thq or th
    p1, q1 = sm(th[0]), sm([a + sig * b for a, b in zip(qs[0], D1)])
    p2 = {a: sm(th[1][a]) for a in 'AB'}
    q2 = {a: sm([x + sig * d for x, d in zip(qs[1][a], D2[a])]) for a in 'AB'}
    b = q1[0] if base == 'group' else 0.0

    def centre(p, q):  # E_q[f(r) s] in logit coordinates, s_v = e_v - p (zero when centering is off)
        c = [0.0] * len(p)
        if cen:
            for v in range(len(p)):
                w = f(p[v] / q[v])
                for j in range(len(p)):
                    c[j] += q[v] * w * ((1.0 if j == v else 0.0) - p[j])
        return c
    c1, c2 = centre(p1, q1), {a: centre(p2[a], q2[a]) for a in 'AB'}
    outs = []
    for ia, a in enumerate('AB'):
        adv, w1 = RWD[a] - b, f(p1[ia] / q1[ia])
        g1 = [adv * (w1 * ((1.0 if j == ia else 0.0) - p1[j]) - c1[j]) for j in range(2)]
        for y in range(4):
            w2 = f(p2[a][y] / q2[a][y])
            g2 = [adv * (w2 * ((1.0 if j == y else 0.0) - p2[a][j]) - c2[a][j]) for j in range(4)]
            outs.append((q1[ia] * q2[a][y], g1 + (g2 + [0.0] * 4 if a == 'A' else [0.0] * 4 + g2)))
    G = [sum(pr * g[i] for pr, g in outs) for i in range(10)]
    V = sum(pr * sum((g[i] - G[i]) ** 2 for i in range(10)) for pr, g in outs)
    return {'G': G, 'drift': math.sqrt(sum(x * x for x in G[2:])), 'sd': math.sqrt(V), 'signal': G[0] / (p1[0] * (1 - p1[0])),
            'p2A': p2['A'], 'q2A': q2['A']}


def traj(sig, est, online=True):
    th = [TH1[:], {'A': TH2[:], 'B': TH2[:]}]
    th0 = [TH1[:], {'A': TH2[:], 'B': TH2[:]}]
    out = []
    for t in range(T + 1):
        m = moments(th, sig, est, None if online else th0)
        out.append(m['p2A'][0])
        G = m['G']
        th[0] = [th[0][i] + ETA * G[i] for i in range(2)]
        th[1]['A'] = [x + ETA * g for x, g in zip(th[1]['A'], G[2:6])]
        th[1]['B'] = [x + ETA * g for x, g in zip(th[1]['B'], G[6:10])]
    return out


def start():
    return [TH1[:], {'A': TH2[:], 'B': TH2[:]}]


def checks():
    out = {}
    out['ratio_example'] = 0.1 / 0.001                                   # the article's 0.1 against 0.001
    V, B, L = 151936, 1024, 32768                                         # Qwen3 vocabulary (config.json), the paper's batch
    out['bytes_per_token_fp32'] = V * 4
    out['full_logprobs_TB'] = V * 4 * B * L / 1e12
    out['group_scale_G8'] = 1 - 1 / 8
    rng = random.Random(7)
    worst = 0.0
    for trial in range(200):                                              # head-only identity, paper Eq. 10 and Eq. 12
        n, k = 40, 6
        p = sm([rng.gauss(0, 2) for _ in range(n)]); q = sm([x + rng.gauss(0, 0.7) for x in [math.log(v) for v in p]])
        H = sorted(range(n), key=lambda v: -q[v])[:k]
        rho = (1 - sum(q[v] for v in H)) / (1 - sum(p[v] for v in H))
        qh = [q[v] if v in H else rho * p[v] for v in range(n)]
        for f in (F['one'], F['tis'], F['mis']):
            direct = [sum(qh[v] * f(p[v] / qh[v]) * ((1.0 if j == v else 0.0) - p[j]) for v in range(n)) for j in range(n)]
            alpha = rho * f(1 / rho)
            head = [sum((q[v] * f(p[v] / q[v]) - alpha * p[v]) * ((1.0 if j == v else 0.0) - p[j]) for v in H) for j in range(n)]
            worst = max(worst, max(abs(a - b) for a, b in zip(direct, head)))
    out['head_identity_max_err'] = worst
    # paper Eq. 14 as a function of the trainer's logits; its negative gradient should be A (w_y s_y - centre), s_v = e_v - p
    n, k, A, y = 12, 4, 0.7, 5
    z = [rng.gauss(0, 1.5) for _ in range(n)]; q = sm([x + rng.gauss(0, 0.8) for x in z]); H = sorted(range(n), key=lambda v: -q[v])[:k]
    f = F['tis']

    def loss(zz, frozen):
        p = sm(zz); lp = [math.log(v) for v in p]
        pf = sm(frozen)
        rho = (1 - sum(q[v] for v in H)) / (1 - sum(pf[v] for v in H))
        alpha = rho * f(1 / rho)
        coef = {v: q[v] * f(pf[v] / q[v]) - alpha * pf[v] for v in H}   # stop-gradient: computed from frozen logits
        return -A * (f(pf[y] / q[y]) * lp[y] - sum(coef[v] * lp[v] for v in H))
    eps, grad = 1e-6, []
    for j in range(n):
        zp = z[:]; zp[j] += eps; zm = z[:]; zm[j] -= eps
        grad.append(-(loss(zp, z) - loss(zm, z)) / (2 * eps))
    p = sm(z); rho = (1 - sum(q[v] for v in H)) / (1 - sum(p[v] for v in H)); alpha = rho * f(1 / rho)
    s = lambda v: [(1.0 if j == v else 0.0) - p[j] for j in range(n)]
    want = [A * (f(p[y] / q[y]) * s(y)[j] - sum((q[v] * f(p[v] / q[v]) - alpha * p[v]) * s(v)[j] for v in H)) for j in range(n)]
    out['eq14_grad_max_err'] = max(abs(a - b) for a, b in zip(grad, want))
    return out


if __name__ == '__main__':
    sigs = [round(0.1 * i, 1) for i in range(31)]
    grid = {}
    for s in sigs:
        row = {}
        for e in EST:
            m = moments(start(), s, e)
            tr = traj(s, e)
            row[e[0]] = {'drift': m['drift'], 'sd': m['sd'], 'signal': m['signal'], 't100': tr[100], 'tend': tr[-1]}
        tr = traj(s, EST[0], online=False)
        row['pg_off'] = {'t100': tr[100], 'tend': tr[-1]}
        row['q_w'] = moments(start(), s, EST[0])['q2A'][0]
        grid['%.1f' % s] = row
    res = {'_doc': 'written by src/recompute.py; do not edit by hand',
           'toy': {'TH1': TH1, 'TH2': TH2, 'D1': D1, 'D2': D2, 'T': T, 'ETA': ETA}, 'grid': grid, 'checks': checks()}
    json.dump(res, open(os.path.join(HERE, 'inputs', 'recompute.json'), 'w'), indent=1)
    g = grid['1.0']
    print('sigma 1: drift', {k: round(v['drift'], 3) for k, v in g.items() if isinstance(v, dict) and 'drift' in v})
    print('sigma 1: sd', {k: round(v['sd'], 3) for k, v in g.items() if isinstance(v, dict) and 'sd' in v})
    print('sigma 1: signal', {k: round(v['signal'], 3) for k, v in g.items() if isinstance(v, dict) and 'signal' in v})
    print('sigma 1: p(w|A) end', {k: round(v['tend'], 3) for k, v in g.items() if isinstance(v, dict)}, 'start', round(moments(start(), 0, EST[0])['p2A'][0], 3), 'q(w|A)', round(g['q_w'], 3))
    print('sigma 3: sd', {k: round(v['sd'], 3) for k, v in grid['3.0'].items() if isinstance(v, dict) and 'sd' in v})
    print(res['checks'])
