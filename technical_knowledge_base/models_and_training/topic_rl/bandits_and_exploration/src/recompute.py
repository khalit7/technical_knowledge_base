"""Independent Python recomputation of every number the page's engine (parts/21_js_bx_engine.js) computes.

Run from this folder:  python3 recompute.py        (about a minute; writes expected.json)
Then:                  node check_engine.mjs        (runs the page's engine in Node and compares with expected.json)
Optional:              python3 recompute.py --full  (also runs all 2000 testbed tasks for Figure 2.2's settings in Python; a few minutes)

Published figures checked (Sutton and Barto, 2nd ed., 2020, chapter 2):
- "the best possible of about 1.54 on this testbed": E[max of 10 standard normals], here by numerical integration with math.erf (independently).
- greedy "found the optimal action in only approximately one-third of the tasks" and epsilon = 0.1 "never selected that action more
  than 91% of the time" (91% = 1 - 0.1 + 0.1/10 is a ceiling by construction; the run stays below it).
No other numbers are printed in the book's Figures 2.2 to 2.6; their shapes are compared in README.md.
Lai and Robbins (1985) constant: sum over suboptimal arms of gap / KL(p_a, p*), Bernoulli KL.
"""
import json, math, os, sys

HERE = os.path.dirname(os.path.abspath(__file__))
M32 = 0xFFFFFFFF


def imul(a, b):
    return (a * b) & M32


class Rng:
    """mulberry32, bit for bit the page's BX.rng."""

    def __init__(self, seed):
        self.a = seed & M32

    def __call__(self):
        self.a = (self.a + 0x6D2B79F5) & M32
        t = self.a
        t = imul(t ^ (t >> 15), t | 1)
        t = (t ^ ((t + imul(t ^ (t >> 7), t | 61)) & M32)) & M32
        return ((t ^ (t >> 14)) & M32) / 4294967296


def gauss(r):
    u1, u2 = r(), r()
    return math.sqrt(-2 * math.log(1 - u1)) * math.cos(2 * math.pi * u2)


def argmax_r(v, r):
    m = max(v)
    ties = [k for k, x in enumerate(v) if x == m]
    if len(ties) == 1:
        return ties[0]
    return ties[int(r() * len(ties))]


# ---- 1. E[max of n standard normals], Simpson's rule on x n phi(x) Phi(x)^(n-1), Phi from math.erf ----
def emax(n, h=1e-3):
    lo, hi = -9.0, 9.0
    m = int(round((hi - lo) / h))
    s = 0.0
    for i in range(m + 1):
        x = lo + i * h
        f = x * n * math.exp(-x * x / 2) / math.sqrt(2 * math.pi) * (0.5 * (1 + math.erf(x / math.sqrt(2)))) ** (n - 1)
        w = 1 if i in (0, m) else (4 if i % 2 else 2)
        s += w * f
    return s * h / 3


# ---- 2. the 10-armed testbed ----
def tb_run(cfg, run, steps, acc):
    K = cfg.get('k', 10)
    tr, nr, pr = Rng(1000000 + run), Rng(2000000 + run), Rng(3000000 + run)
    off, walk = cfg.get('off', 0), cfg.get('walk', 0)
    q = [0.0 if walk else gauss(tr) + off for _ in range(K)]
    Q = [float(cfg.get('q0', 0))] * K
    N = [0] * K
    H = [0.0] * K
    S = [0.0] * K
    rbar = 0.0
    best = max(range(K), key=lambda k: (q[k], -k))
    if not walk:
        acc['maxq'] += q[best]
    for t in range(steps):
        if walk:
            best = max(range(K), key=lambda k: (q[k], -k))
        kind = cfg['kind']
        if kind == 'eps':
            if pr() < cfg['eps']:
                a = int(pr() * K)
            else:
                a = argmax_r(Q, pr)
        elif kind == 'ucb':
            a = argmax_r([math.inf if N[k] == 0 else Q[k] + cfg['c'] * math.sqrt(math.log(t + 1) / N[k]) for k in range(K)], pr)
        elif kind == 'ts':
            a = argmax_r([(off + S[k]) / (1 + N[k]) + gauss(pr) / math.sqrt(1 + N[k]) for k in range(K)], pr)
        else:
            mx = max(H)
            e = [math.exp(x - mx) for x in H]
            z = sum(e)
            pi = [x / z for x in e]
            u = pr()
            cum = 0.0
            a = K - 1
            for k in range(K):
                cum += pi[k]
                if u < cum:
                    a = k
                    break
        R = q[a] + gauss(nr)
        acc['R'][t] += R
        if a == best:
            acc['O'][t] += 1
        N[a] += 1
        if kind == 'grad':
            rbar += (R - rbar) / (t + 1)
            d = cfg['alpha'] * (R - (rbar if cfg['base'] else 0))
            for k in range(K):
                H[k] += d * (1 - pi[k]) if k == a else -d * pi[k]
        else:
            Q[a] += (cfg['alpha'] if cfg.get('alpha') else 1 / N[a]) * (R - Q[a])
            S[a] += R
        if walk:
            for k in range(K):
                q[k] += walk * gauss(tr)


def tb_batch(cfg, r0, r1, steps):
    acc = {'R': [0.0] * steps, 'O': [0.0] * steps, 'maxq': 0.0}
    for r in range(r0, r1):
        tb_run(cfg, r, steps, acc)
    return acc


# ---- 3. the Reading tab's five-armed bandit on one pre-drawn table ----
MU, TB = [0.2, 1.0, -0.4, 1.5, 0.6], 300


def bandit_table(seed):
    r = Rng(seed)
    K = len(MU)
    rew = [[MU[k] + gauss(r) for k in range(K)] for _ in range(TB)]
    u, ra = [], []
    for _ in range(TB):
        u.append(r())
        ra.append(int(r() * K))
    z = [[gauss(r) for _ in range(K)] for _ in range(TB)]
    return rew, u, ra, z


def first_max(v):
    bv, a = -math.inf, -1
    for k, x in enumerate(v):
        if x > bv:
            bv, a = x, k
    return a


def bandit_run(tab, st):
    rew, u, ra, z = tab
    K = len(MU)
    Q = [float(st.get('q0', 0))] * K
    N = [0] * K
    S = [0.0] * K
    best = max(MU)
    reg = 0.0
    acts = []
    for t in range(TB):
        kind = st['kind']
        if kind == 'ucb':
            un = [k for k in range(K) if N[k] == 0]
            a = un[0] if un else first_max([Q[k] + st['c'] * math.sqrt(math.log(t + 1) / N[k]) for k in range(K)])
        elif kind == 'ts':
            a = first_max([S[k] / (1 + N[k]) + z[t][k] / math.sqrt(1 + N[k]) for k in range(K)])
        elif kind == 'eps' and u[t] < st['eps']:
            a = ra[t]
        else:
            a = first_max(Q)
        R = rew[t][a]
        N[a] += 1
        S[a] += R
        Q[a] += (R - Q[a]) * (st['alpha'] if st.get('alpha') else 1 / N[a])
        reg += best - MU[a]
        acts.append(a)
    return {'reg': reg, 'N': N, 'Q': Q, 'acts': acts}


# ---- 4. Bernoulli bandit regret and the Lai and Robbins constant ----
def kl_b(p, q):
    e = 1e-15
    p = min(max(p, e), 1 - e)
    q = min(max(q, e), 1 - e)
    return p * math.log(p / q) + (1 - p) * math.log((1 - p) / (1 - q))


def lr_const(p):
    b = max(p)
    return sum((b - x) / kl_b(x, b) for x in p if x < b)


def gamma_s(a, r):
    d = a - 1 / 3
    c = 1 / math.sqrt(9 * d)
    while True:
        while True:
            x = gauss(r)
            v = 1 + c * x
            if v > 0:
                break
        v = v * v * v
        u = r()
        if u < 1 - 0.0331 * x * x * x * x:
            return d * v
        if math.log(u) < 0.5 * x * x + d * (1 - v + math.log(v)):
            return d * v


def beta_s(a, b, r):
    x = gamma_s(a, r)
    y = gamma_s(b, r)
    return x / (x + y)


def br_run(cfg, p, T, run, marks):
    K = len(p)
    nr, pr = Rng(5000000 + run), Rng(6000000 + run)
    b = max(p)
    N = [0] * K
    S = [0] * K
    reg = 0.0
    out = []
    m = 0
    for t in range(T):
        kind = cfg['kind']
        if kind == 'ts':
            a = argmax_r([beta_s(1 + S[k], 1 + N[k] - S[k], pr) for k in range(K)], pr)
        elif kind == 'ucb1':
            a = argmax_r([math.inf if N[k] == 0 else S[k] / N[k] + math.sqrt(2 * math.log(t) / N[k]) for k in range(K)], pr)
        else:
            if kind == 'eps' and pr() < cfg['eps']:
                a = int(pr() * K)
            else:
                a = argmax_r([0.5 if N[k] == 0 else S[k] / N[k] for k in range(K)], pr)
        x = 1 if nr() < p[a] else 0
        N[a] += 1
        S[a] += x
        reg += b - p[a]
        while m < len(marks) and marks[m] == t + 1:
            out.append(reg)
            m += 1
    return out


def log_marks(T, per):
    s = set()
    i = 0
    while i <= per * math.log10(T) + 1e-9:
        s.add(max(1, round(10 ** (i / per))))
        i += 1
    s.add(T)
    return sorted(x for x in s if x <= T)


# ---- 5. the sparse-reward gridworld ----
GX = dict(W=14, H=7, start=(0, 3), small=(2, 1), big=(13, 3), rs=0.1, rb=1.0, cap=60, alpha=0.5, g=0.95, eps=0.1, beta=0.2, q0=1.0)
MV = [(1, 0), (-1, 0), (0, 1), (0, -1)]


def gx_run(mode, seed, episodes):
    W, Hh = GX['W'], GX['H']
    n = W * Hh
    r = Rng(7000000 + seed)
    Q = [GX['q0'] if mode == 'opt' else 0.0] * (n * 4)
    N = [0] * n
    idf = lambda x, y: y * W + x
    sm, bg = idf(*GX['small']), idf(*GX['big'])
    first, nbig, ends = -1, 0, []
    for ep in range(episodes):
        x, y = GX['start']
        end = 0
        for t in range(GX['cap']):
            s = idf(x, y)
            if mode != 'opt' and r() < GX['eps']:
                a = int(r() * 4)
            else:
                a = argmax_r(Q[s * 4:s * 4 + 4], r)
            x = min(W - 1, max(0, x + MV[a][0]))
            y = min(Hh - 1, max(0, y + MV[a][1]))
            s2 = idf(x, y)
            N[s2] += 1
            rew = GX['rb'] if s2 == bg else (GX['rs'] if s2 == sm else 0.0)
            ri = rew + (GX['beta'] / math.sqrt(N[s2]) if mode == 'cnt' else 0.0)
            term = s2 in (bg, sm)
            mx = 0.0 if term else max(Q[s2 * 4:s2 * 4 + 4])
            Q[s * 4 + a] += GX['alpha'] * (ri + (0 if term else GX['g'] * mx) - Q[s * 4 + a])
            if term:
                end = 2 if s2 == bg else 1
                break
        if end == 2:
            nbig += 1
            if first < 0:
                first = ep
        ends.append(end)
    return {'first': first, 'nBig': nbig, 'ends': ends}


def main():
    full = '--full' in sys.argv
    X = {}
    X['emax10'] = emax(10)
    X['emax'] = {str(n): emax(n) for n in (2, 3, 5, 10, 20)}
    print('E[max of 10 standard normals] = %.4f (book: "about 1.54")' % X['emax10'])

    # testbed: exact agreement on the first 40 tasks of every setting the page runs
    cfgs = {
        'greedy': {'kind': 'eps', 'eps': 0}, 'eps01': {'kind': 'eps', 'eps': 0.1}, 'eps001': {'kind': 'eps', 'eps': 0.01},
        'opt5': {'kind': 'eps', 'eps': 0, 'q0': 5, 'alpha': 0.1}, 'real01': {'kind': 'eps', 'eps': 0.1, 'alpha': 0.1},
        'ucb2': {'kind': 'ucb', 'c': 2}, 'ucb1c': {'kind': 'ucb', 'c': 1}, 'ts': {'kind': 'ts'},
        'gb01': {'kind': 'grad', 'alpha': 0.1, 'base': True, 'off': 4}, 'gb04': {'kind': 'grad', 'alpha': 0.4, 'base': True, 'off': 4},
        'gn01': {'kind': 'grad', 'alpha': 0.1, 'base': False, 'off': 4}, 'gn04': {'kind': 'grad', 'alpha': 0.4, 'base': False, 'off': 4},
        'tsoff': {'kind': 'ts', 'off': 4},
    }
    X['tbcfg'] = cfgs
    X['tb'] = {}
    for k, c in cfgs.items():
        a = tb_batch(c, 0, 40, 1000)
        X['tb'][k] = {'R': a['R'], 'O': a['O'], 'maxq': a['maxq']}
    ns = {'sa': {'kind': 'eps', 'eps': 0.1, 'walk': 0.01}, 'const': {'kind': 'eps', 'eps': 0.1, 'alpha': 0.1, 'walk': 0.01}}
    X['nscfg'] = ns
    X['ns'] = {k: {kk: v for kk, v in tb_batch(c, 0, 5, 3000).items() if kk != 'maxq'} for k, c in ns.items()}

    # five-armed bandit
    strat = {'greedy': {'kind': 'greedy'}, 'eps': {'kind': 'eps', 'eps': 0.1}, 'opt': {'kind': 'greedy', 'q0': 5, 'alpha': 0.1},
             'ucb': {'kind': 'ucb', 'c': 2}, 'ts': {'kind': 'ts'}}
    X['bandit'] = {str(s): {k: bandit_run(bandit_table(s), st) for k, st in strat.items()} for s in range(1, 6)}

    # Bernoulli regret
    presets = {'close': [0.6, 0.5, 0.45, 0.4, 0.3], 'far': [0.9, 0.8, 0.6, 0.5]}
    X['lr'] = {k: lr_const(p) for k, p in presets.items()}
    marks = log_marks(2000, 10)
    X['brMarks'] = marks
    X['br'] = {}
    for pk, p in presets.items():
        for kind in ('greedy', 'eps', 'ucb1', 'ts'):
            cfg = {'kind': kind, 'eps': 0.1}
            X['br'][pk + ' ' + kind] = [br_run(cfg, p, 2000, r, marks) for r in range(6)]
    for k, v in X['lr'].items():
        print('Lai and Robbins constant, %s arms: %.3f' % (k, v))

    # gridworld
    X['gx'] = {}
    for mode in ('eps', 'cnt', 'opt'):
        runs = [gx_run(mode, s, 500) for s in range(1, 21)]
        X['gx'][mode] = {'firsts': [o['first'] for o in runs], 'found': sum(1 for o in runs if o['first'] >= 0),
                         'ends1': runs[0]['ends']}
        f = sorted(o['first'] for o in runs if o['first'] >= 0)
        print('gridworld %s: far goal found in %d of 20 seeds within 500 episodes; median first episode %s' %
              (mode, len(f), f[len(f) // 2] if f else 'none'))

    if full:
        for k in ('greedy', 'eps01', 'eps001'):
            a = tb_batch(cfgs[k], 0, 2000, 1000)
            R = [x / 2000 for x in a['R']]
            O = [x / 2000 for x in a['O']]
            print('%s: mean reward last 100 steps %.3f; optimal action at step 1000 %.1f%%, max %.1f%%; mean max q* %.4f' %
                  (k, sum(R[900:]) / 100, 100 * O[-1], 100 * max(O), a['maxq'] / 2000))
            X.setdefault('full', {})[k] = {'R': R, 'O': O, 'maxq': a['maxq'] / 2000}
    json.dump(X, open(os.path.join(HERE, 'expected.json'), 'w'))
    print('wrote expected.json')


if __name__ == '__main__':
    main()
