"""Independent recomputation of every number the Reading tab's visuals compute (parts/21_js_rd_engine.js).

Run: python3 src/read/recompute.py  (writes src/read/expected.json; no third-party packages)
Then: node src/read/check_engine.mjs  (runs the page's engine in Node and compares with expected.json)

Also prints the published figures each default reproduces:
- Silver, Lecture 2: student MRP values (gamma 0, 0.9, 1) and the student MDP's uniform-policy and optimal values.
- Russell and Norvig, AIMA 3rd ed. Figure 17.3: the 4x3 world's utilities (reward -0.04, gamma 1).
- Sutton and Barto section 11.2: w <- (1 + alpha(2 gamma - 1)) w diverges for gamma > 0.5.
- The old Topic: rl page's worked episode (0.81, 0.36, 0.567, 0.52425, 0.288, 0.61, 0.16) and GRPO case (+1.732, -0.577).
- PPO paper Table 1 is quoted, not recomputed.
"""
import json, math, os

HERE = os.path.dirname(os.path.abspath(__file__))
M32 = 0xFFFFFFFF


def imul(a, b):
    return (a * b) & M32


class Rng:
    """mulberry32, bit-for-bit the same as the page's RDE.rng."""

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


def solve(A, b):
    n = len(b)
    M = [row[:] + [b[i]] for i, row in enumerate(A)]
    for c in range(n):
        p = max(range(c, n), key=lambda r: abs(M[r][c]))
        M[c], M[p] = M[p], M[c]
        for r in range(n):
            if r != c:
                f = M[r][c] / M[c][c]
                for k in range(c, n + 1):
                    M[r][k] -= f * M[c][k]
    return [M[i][n] / M[i][i] for i in range(n)]


# ---- 1. student MRP (Silver, Lecture 2) ----
NAMES = ['C1', 'C2', 'C3', 'Pass', 'Pub', 'FB']  # index 6 is Sleep (terminal)
R_MRP = [-2, -2, -2, 10, 1, -1]
P_MRP = {0: {1: .5, 5: .5}, 1: {2: .8, 6: .2}, 2: {3: .6, 4: .4}, 3: {6: 1}, 4: {0: .2, 1: .4, 2: .4}, 5: {5: .9, 0: .1}}


def mrp_values(g):
    A, b = [], []
    for s in range(6):
        row = [0.0] * 6
        row[s] = 1.0
        for t, p in P_MRP[s].items():
            if t < 6:
                row[t] -= g * p
        A.append(row)
        b.append(R_MRP[s])
    return solve(A, b)


def mrp_episode(start, g, r):
    s, G, d, path = start, 0.0, 1.0, [start]
    for _ in range(1000):
        if s >= 6:
            break
        G += d * R_MRP[s]
        d *= g
        u, acc = r(), 0.0
        items = list(P_MRP[s].items())
        nx = items[-1][0]
        for t, p in items:
            acc += p
            if u < acc:
                nx = t
                break
        s = nx
        path.append(s)
    return path, G


# ---- 2. student MDP ----
MDP = [[('Study', -2, {1: 1}), ('Facebook', -1, {3: 1})],
       [('Study', -2, {2: 1}), ('Sleep', 0, {4: 1})],
       [('Study', 10, {4: 1}), ('Pub', 1, {0: .2, 1: .4, 2: .4})],
       [('Quit', 0, {0: 1}), ('Facebook', -1, {3: 1})]]


def q_from(V, g):
    return [[a[1] + g * sum(p * (V[t] if t < 4 else 0) for t, p in a[2].items()) for a in acts] for acts in MDP]


def mdp_eval(pi, g):
    A, b = [], []
    for s in range(4):
        row = [0.0] * 4
        row[s] = 1.0
        rb = 0.0
        for i, a in enumerate(MDP[s]):
            w = pi[s] if i == 0 else 1 - pi[s]
            rb += w * a[1]
            for t, p in a[2].items():
                if t < 4:
                    row[t] -= g * w * p
        A.append(row)
        b.append(rb)
    V = solve(A, b)
    return V, q_from(V, g)


def mdp_opt(g):
    V = [0.0] * 4
    for _ in range(5000):
        nv = [max(q) for q in q_from(V, g)]
        d = max(abs(a - b) for a, b in zip(nv, V))
        V = nv
        if d < 1e-13:
            break
    return V, q_from(V, g)


# ---- 3. bandit ----
MU = [0.2, 1.0, -0.4, 1.5, 0.6]
T_B = 300


def bandit_table(seed):
    r = Rng(seed)
    rew = [[MU[k] + gauss(r) for k in range(5)] for _ in range(T_B)]
    u, ra = [], []
    for _ in range(T_B):
        u.append(r())
        ra.append(math.floor(r() * 5))
    return rew, u, ra


def bandit_run(tab, kind, eps=0.0, q0=0.0, c=0.0, alpha=None):
    rew, u, ra = tab
    Q, N = [q0] * 5, [0] * 5
    best = max(MU)
    reg = 0.0
    acts = []
    for t in range(T_B):
        if kind == 'ucb':
            a = next((k for k in range(5) if N[k] == 0), -1)
            if a < 0:
                vals = [Q[k] + c * math.sqrt(math.log(t + 1) / N[k]) for k in range(5)]
                a = max(range(5), key=lambda k: (vals[k], -k))
        elif kind == 'eps' and u[t] < eps:
            a = ra[t]
        else:
            a = max(range(5), key=lambda k: (Q[k], -k))
        R = rew[t][a]
        N[a] += 1
        Q[a] += (R - Q[a]) * (alpha if alpha else 1 / N[a])
        reg += best - MU[a]
        acts.append(a)
    return {'reg': reg, 'N': N, 'Q': Q, 'acts': acts}


# ---- 4. the 4x3 world ----
CELLS = [(x, y) for y in range(3) for x in range(4) if (x, y) != (1, 1)]
IDX = {c: i for i, c in enumerate(CELLS)}
DIRS = [(0, 1), (1, 0), (0, -1), (-1, 0)]
TERM = {IDX[(3, 2)]: 1.0, IDX[(3, 1)]: -1.0}
NONT = [i for i in range(len(CELLS)) if i not in TERM]


def mv(s, d):
    x, y = CELLS[s]
    n = (x + DIRS[d][0], y + DIRS[d][1])
    return IDX.get(n, s)


def outcomes(s, a):
    return [(mv(s, a), .8), (mv(s, (a + 1) % 4), .1), (mv(s, (a + 3) % 4), .1)]


def gw_vi(K):
    V = [TERM.get(s, 0.0) for s in range(len(CELLS))]
    hist = [V[:]]
    for _ in range(K):
        V = [V[s] if s in TERM else max(-0.04 + sum(p * V[n] for n, p in outcomes(s, a)) for a in range(4)) for s in range(len(CELLS))]
        hist.append(V[:])
    return hist


def gw_q(seed, eps, marks):
    r = Rng(seed)
    n = len(CELLS)
    Q = [[0.0] * 4 for _ in range(n)]
    N = [[0] * 4 for _ in range(n)]
    snaps, samples = [], 0
    for e in range(1, marks[-1] + 1):
        s = NONT[math.floor(r() * len(NONT))]
        for _ in range(500):
            if s in TERM:
                break
            u, ua = r(), r()
            if u < eps:
                a = math.floor(ua * 4)
            else:
                a = max(range(4), key=lambda b: (Q[s][b], -b))
            v = r()
            d = a if v < .8 else ((a + 1) % 4 if v < .9 else (a + 3) % 4)
            s2 = mv(s, d)
            tgt = -0.04 + (TERM[s2] if s2 in TERM else max(Q[s2]))
            N[s][a] += 1
            Q[s][a] += (tgt - Q[s][a]) / N[s][a] ** 0.8
            samples += 1
            s = s2
        if e in marks:
            snaps.append({'ep': e, 'samples': samples, 'V': [TERM[i] if i in TERM else max(Q[i]) for i in range(n)]})
    return snaps


# ---- 5. one episode, every target ----
def targets(g, lam, n, R, V, alpha, pdp):
    def nstep(k):
        G = sum(g ** i * R[i] for i in range(min(k, 3)))
        if k < 3:
            G += g ** k * V[k]
        return G
    mc, td, two = nstep(3), nstep(1), nstep(2)
    lr = (1 - lam) * td + (1 - lam) * lam * two + lam * lam * mc
    return {'mc': mc, 'td': td, 'two': two, 'nn': nstep(n), 'lam': lr, 'dp': pdp * (R[0] + g * V[1]),
            'reinforceB': mc - V[0], 'delta': td - V[0], 'updMC': V[0] + alpha * (mc - V[0]), 'updTD': V[0] + alpha * (td - V[0])}


def group_adv(r, kind):
    G = len(r)
    m = sum(r) / G
    sd = math.sqrt(sum((x - m) ** 2 for x in r) / G)
    if kind == 'drgrpo':
        return [x - m for x in r]
    if kind == 'rloo':
        return [x - (m * G - x) / (G - 1) for x in r]
    return [(x - m) / sd if sd > 0 else 0.0 for x in r]


# ---- 6. the dial ----
def dial(g, q, err, lam):
    V2, V1 = q, q + g * q
    V0 = q + g * q + g * g * q
    h1, h2 = V1 + err, V2 + err
    E = E2 = 0.0
    for o in range(8):
        R = [o & 1, (o >> 1) & 1, (o >> 2) & 1]
        pr = 1.0
        for x in R:
            pr *= q if x else 1 - q
        G1 = R[0] + g * h1
        G2 = R[0] + g * R[1] + g * g * h2
        G3 = R[0] + g * R[1] + g * g * R[2]
        t = (1 - lam) * G1 + (1 - lam) * lam * G2 + lam * lam * G3
        E += pr * t
        E2 += pr * t * t
    b = E - V0
    return {'bias': b, 'var': E2 - E * E, 'mse': b * b + E2 - E * E}


# ---- 7. deadly triad ----
def triad(g, alpha, mode, steps):
    w = 10.0
    ws = [w]
    for _ in range(steps):
        w = w + alpha * (g * 2 * w - w)
        if mode == 'on':
            w = w + alpha * (0 - 2 * w) * 2
        ws.append(w)
    return ws


# ---- 8. maximisation bias: E[max of N standard normals], exact via erf ----
def emax(N):
    h = 1e-4
    s, x = 0.0, -8.0
    while x <= 8:
        pdf = math.exp(-x * x / 2) / math.sqrt(2 * math.pi)
        cdf = 0.5 * (1 + math.erf(x / math.sqrt(2)))
        s += x * N * pdf * cdf ** (N - 1) * h
        x += h
    return s


# ---- 9. policy gradient on a softmax policy ----
def softmax(z):
    m = max(z)
    e = [math.exp(v - m) for v in z]
    s = sum(e)
    return [v / s for v in e]


def pg_stats(th, rew):
    pi = softmax(th)
    V = sum(p * r for p, r in zip(pi, rew))
    grad = [pi[j] * (rew[j] - V) for j in range(3)]

    def var_of(b):
        tot = 0.0
        for a in range(3):
            ga = [((1 if j == a else 0) - pi[j]) * (rew[a] - b) for j in range(3)]
            tot += pi[a] * sum((ga[j] - grad[j]) ** 2 for j in range(3))
        return tot
    return pi, V, grad, var_of(0.0), var_of(V)


def pg_run(rew, eta, steps, seed, use_b):
    r = Rng(seed)
    th = [0.0, 0.0, 0.0]
    hist = []
    for _ in range(steps):
        pi, V, grad, v0, vb = pg_stats(th, rew)
        u = r()
        a, acc = 0, pi[0]
        while u >= acc and a < 2:
            a += 1
            acc += pi[a]
        b = V if use_b else 0.0
        gs = [((1 if j == a else 0) - pi[j]) * (rew[a] - b) for j in range(3)]
        hist.append({'a': a, 'V': V})
        th = [th[j] + eta * gs[j] for j in range(3)]
    pi, V, *_ = pg_stats(th, rew)
    hist.append({'a': -1, 'V': V})
    return hist


# ---- 10. PPO clip ----
def ppo_run(A, e, eta, epochs, clip):
    th0 = [0.0, 0.5, -0.5]
    old = softmax(th0)[0]
    th = th0[:]
    out = []
    for k in range(epochs + 1):
        pi = softmax(th)
        r = pi[0] / old
        active = (not clip) or not ((A > 0 and r > 1 + e) or (A < 0 and r < 1 - e))
        L = r * A if not clip else min(r * A, max(1 - e, min(1 + e, r)) * A)
        out.append({'r': r, 'L': L})
        if k == epochs:
            break
        if active:
            th = [th[j] + eta * A * r * ((1 if j == 0 else 0) - pi[j]) for j in range(3)]
    return out


def main():
    ex = {}
    ex['mrp'] = {str(g): mrp_values(g) for g in (0, 0.5, 0.9, 1)}
    r = Rng(42)
    ex['mrpEp'] = [mrp_episode(0, 0.5, r)[1] for _ in range(20)]
    ex['mdpUnif'] = mdp_eval([.5] * 4, 1)
    ex['mdpOpt'] = mdp_opt(1)
    ex['mdpUnif09'] = mdp_eval([.5] * 4, 0.9)
    ex['bandit'] = {}
    for seed in (1, 2, 3, 4, 5):
        tab = bandit_table(seed)
        ex['bandit'][str(seed)] = {
            'greedy': bandit_run(tab, 'greedy'),
            'eps': bandit_run(tab, 'eps', eps=0.1),
            'opt': bandit_run(tab, 'greedy', q0=5, alpha=0.1),
            'ucb': bandit_run(tab, 'ucb', c=2)}
    vi = gw_vi(40)
    ex['gwVI'] = vi
    marks = [1, 2, 5, 10, 20, 50, 100, 200, 500, 1000, 2000, 3000]
    ex['gwQ'] = gw_q(7, 0.3, marks)
    ex['targets'] = targets(0.9, 0.5, 2, [0, 0, 1], [0.2, 0.4, 0.7], 0.1, 0.8)
    ex['targets2'] = targets(0.97, 0.8, 1, [0.5, -1, 2], [0.1, 0.9, -0.3], 0.3, 0.6)
    ex['grpo'] = {k: group_adv([1, 0, 0, 0], k) for k in ('grpo', 'drgrpo', 'rloo')}
    ex['grpo16'] = {'one': group_adv([1] + [0] * 15, 'grpo'), 'half': group_adv([1] * 8 + [0] * 8, 'grpo')}
    ex['dial'] = {str(l): dial(0.9, 0.5, 0.3, l) for l in (0, 0.25, 0.5, 0.75, 1)}
    ex['dial0'] = {str(l): dial(0.9, 0.5, 0.0, l) for l in (0, 0.5, 1)}
    ex['triad'] = {'off': triad(0.9, 0.1, 'off', 30), 'on': triad(0.9, 0.1, 'on', 30), 'off04': triad(0.4, 0.1, 'off', 30)}
    ex['emax'] = {str(n): emax(n) for n in (1, 2, 3, 4, 10, 18)}
    ex['pg'] = {'s0': pg_stats([0, 0, 0], [1, 2, 6]), 'run0': pg_run([1, 2, 6], 0.1, 60, 5, False), 'runB': pg_run([1, 2, 6], 0.1, 60, 5, True),
                'off10': pg_stats([0, 0, 0], [11, 12, 16])}
    ex['pgSpread'] = {}
    for c in (0, 10):
        rew = [1 + c, 2 + c, 6 + c]
        for B in (False, True):
            fin = [pg_run(rew, 0.1, 60, s, B)[-1]['V'] for s in range(100, 300)]
            ex['pgSpread']['c%d_%s' % (c, 'B' if B else '0')] = fin
    ex['ppo'] = {'clipPos': ppo_run(1.0, 0.2, 0.2, 10, True), 'noclipPos': ppo_run(1.0, 0.2, 0.2, 10, False),
                 'clipNeg': ppo_run(-1.0, 0.2, 0.2, 10, True), 'noclipNeg': ppo_run(-1.0, 0.2, 0.2, 10, False),
                 'clipPos05': ppo_run(1.0, 0.2, 0.5, 10, True)}
    json.dump(ex, open(os.path.join(HERE, 'expected.json'), 'w'), indent=0)

    f = lambda v: ' '.join('%.3f' % x for x in v)
    print('student MRP values, gamma 0 / 0.9 / 1:')
    for g in (0, 0.9, 1):
        print('  ', f(mrp_values(g)), '(Silver prints -13 and -23 for Class 1 and Facebook at gamma 1)')
    V, Q = mdp_eval([.5] * 4, 1)
    print('student MDP uniform V:', f(V), ' Q:', [f(q) for q in Q])
    V, Q = mdp_opt(1)
    print('student MDP optimal V:', f(V), ' Q:', [f(q) for q in Q], '(Silver prints 8.4 for Pub; arithmetic 9.4)')
    print('AIMA Figure 17.3 rows (top to bottom):')
    v = vi[40]
    for y in (2, 1, 0):
        print('  ', ' '.join('%.3f' % v[IDX[(x, y)]] if (x, y) in IDX else '  wall' for x in range(4)))
    print('worked episode:', {k: round(x, 5) for k, x in ex['targets'].items()})
    print('GRPO 1,0,0,0:', [round(x, 3) for x in ex['grpo']['grpo']], ' 1 of 16:', round(ex['grpo16']['one'][0], 3), ' 8 of 16:', round(ex['grpo16']['half'][0], 3))
    print('E[max] N=3, 10:', round(emax(3), 4), round(emax(10), 4))
    pi, Vv, grad, v0, vb = ex['pg']['s0']
    print('softmax toy at uniform: grad', f(grad), 'var no baseline %.3f, with %.3f' % (v0, vb))
    print('triad off-policy factor 1+a(2g-1) =', 1 + 0.1 * (2 * 0.9 - 1), '; w after 30:', round(ex['triad']['off'][-1], 2), ' on-policy:', round(ex['triad']['on'][-1], 5))
    for k in ('greedy', 'eps', 'opt', 'ucb'):
        b = ex['bandit']['3'][k]
        print('bandit seed 3', k, 'regret %.1f' % b['reg'], b['N'])
    print('Q-learning error vs VI:', [(s['ep'], round(max(abs(a - b) for a, b in zip(s['V'], vi[40])), 3)) for s in ex['gwQ']])
    for k, v in ex['pgSpread'].items():
        print('PG 200 runs', k, 'ending below 3 + offset:', sum(1 for x in v if x < 3 + int(k[1:].split('_')[0])))
    print('PPO clip +A ratios:', [round(x['r'], 3) for x in ex['ppo']['clipPos']])
    print('PPO no clip +A ratios:', [round(x['r'], 3) for x in ex['ppo']['noclipPos']])


if __name__ == '__main__':
    main()
