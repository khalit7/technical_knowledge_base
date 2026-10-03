"""Independent recomputation of the Reading tab's one-episode widget (parts/21_js_rd_engine.js).

Run: python3 src/read/recompute.py  (writes src/read/expected.json)
Then: node src/read/check_engine.mjs
Reproduces the old Topic: rl page's worked numbers: 0.81, 0.36, 0.567, 0.52425, 0.288, 0.61, 0.16, and the GRPO case +1.732, -0.577.
"""
import json, math, os, itertools

HERE = os.path.dirname(os.path.abspath(__file__))


def targets(g, lam, R, V, alpha, pdp):
    def nstep(k):
        G = sum(g ** i * R[i] for i in range(min(k, 3)))
        if k < 3:
            G += g ** k * V[k]
        return G
    mc, td, two = nstep(3), nstep(1), nstep(2)
    lr = (1 - lam) * td + (1 - lam) * lam * two + lam * lam * mc
    return {'mc': mc, 'td': td, 'two': two, 'lam': lr, 'dp': pdp * (R[0] + g * V[1]),
            'reinforceB': mc - V[0], 'delta': td - V[0], 'updMC': V[0] + alpha * (mc - V[0]), 'updTD': V[0] + alpha * (td - V[0])}


def group_adv(r):
    G = len(r)
    m = sum(r) / G
    sd = math.sqrt(sum((x - m) ** 2 for x in r) / G)
    return [(x - m) / sd if sd > 0 else 0.0 for x in r]


def main():
    cases = []
    # the worked example, then a grid over the widget's sliders
    cases.append(dict(g=0.9, lam=0.5, R=[0, 0, 1], V=[0.2, 0.4, 0.7], alpha=0.1, pdp=0.8))
    for g, lam, r3, v1, v2 in itertools.product((0.5, 0.9, 1.0), (0, 0.35, 1), (-1, 1, 2), (-1, 0.4, 1), (-1, 0.7, 1)):
        cases.append(dict(g=g, lam=lam, R=[0, 0, r3], V=[0.2, v1, v2], alpha=0.1, pdp=0.8))
    ex = {'cases': cases, 'targets': [targets(**c) for c in cases],
          'grpo': group_adv([1, 0, 0, 0]), 'grpo16': group_adv([1] + [0] * 15), 'grpoSame': group_adv([1] * 8)}
    json.dump(ex, open(os.path.join(HERE, 'expected.json'), 'w'), indent=0)
    print('worked episode:', {k: round(v, 5) for k, v in ex['targets'][0].items()})
    print('GRPO 1,0,0,0:', [round(x, 3) for x in ex['grpo']], ' 1 of 16:', round(ex['grpo16'][0], 3))


if __name__ == '__main__':
    main()
