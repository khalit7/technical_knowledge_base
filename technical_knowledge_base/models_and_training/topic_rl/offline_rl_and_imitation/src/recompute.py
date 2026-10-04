"""Independent Python recomputation of every number the page's engine (parts/21_js_of_engine.js) computes.

Run from this folder:  python3 recompute.py      (a few seconds; writes expected.json and prints the headline numbers)
Then:                  node check_engine.mjs      (runs the page's engine in Node and compares every value with expected.json)

Two models, both exact (no training noise beyond the seeded data):

1. Driving: behaviour cloning against DAgger (Ross, Gordon and Bagnell 2011, Algorithm 3.1 with beta_i = I(i = 1)).
   Lanes x in -4..4, heading h in -1..1, action a in {-1, 0, +1}: h' = clamp(h + a), x' = clamp(x + h').
   Cost 1 for every step the car is outside its own lane (x != 0); the expert returns to the lane and never leaves it, so J* = 0.
   The learner predicts the expert's label at the nearest state in its dataset (distance |dx| + |dh|, ties to the lower state index)
   and is wrong with probability eps (each other action eps / 2): eps is exactly its 0-1 loss under the expert's state distribution.
   Its expected cost J = sum over t = 1..T of P(x_t != 0) is computed exactly by propagating the state distribution.
   DAgger rounds: round 1 is the expert's own data (only the centre state), so the round-1 policy is behaviour cloning;
   each later round rolls out the current learner m times (seeded), labels every visited state with the expert's action, aggregates.

2. Extrapolation error on one state with a 1-D action a in [-1, 1] that loops back to the same state (gamma = 0.9).
   Data: n = 30 actions from N(-0.35, 0.12^2), rewards r(a) + N(0, 0.1^2) with r(a) = 1 - 2 (a - 0.15)^2 (illustrative).
   Q(a) = w . phi(a), phi = [1, a, relu(a - k) for 9 knots k = -0.8..0.8], ridge 1e-3 on all but the bias:
   a ReLU network whose first layer is frozen, so fits are exact (normal equations, or Newton for CQL).
   Fitted Q iteration, Q_0 = 0, K = 40 iterations, target y_i = r_i + gamma * t_k, where t_k is
     naive: max over the action grid (201 points) of Q_k;
     BCQ-style: the same max restricted to |a - mean| <= 2 sd of the dataset's actions (a fitted Gaussian standing in for BCQ's generative model);
     CQL(H): each fit minimises 1/(2n) sum (Q(a_i) - y_i)^2 + alpha ((1/beta) log sum_g exp(beta Q(a_g)) - mean_i Q(a_i)) + ridge,
       the soft maximum taken at the policy's own temperature so that mu = pi as in CQL's Theorem 3.2;
     IQL: the tau-expectile of {Q_k(a_i)} over the dataset's actions only.
"""
import json, math, os

HERE = os.path.dirname(os.path.abspath(__file__))
M32 = 0xFFFFFFFF


def imul(a, b):
    return (a * b) & M32


class Rng:
    """mulberry32, bit for bit the page's OF.rng."""

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


# ---------------- 1. Driving ----------------
XS = list(range(-4, 5))
HS = [-1, 0, 1]
STATES = [(x, h) for x in XS for h in HS]          # index = (x + 4) * 3 + (h + 1)
IDX = {s: i for i, s in enumerate(STATES)}
ACTS = [-1, 0, 1]


def clamp(v, lo, hi):
    return lo if v < lo else hi if v > hi else v


def step(s, a):
    x, h = s
    h2 = clamp(h + a, -1, 1)
    return (clamp(x + h2, -4, 4), h2)


def expert(s):
    x, h = s
    d = 0 if x == 0 else (-1 if x > 0 else 1)
    return clamp(d - h, -1, 1)


def learner_label(s, data):
    """expert label at the nearest dataset state; data is a set of state indices"""
    best, bd = None, None
    for i in sorted(data):
        t = STATES[i]
        d = abs(t[0] - s[0]) + abs(t[1] - s[1])
        if bd is None or d < bd:
            best, bd = i, d
    return expert(STATES[best])


def learner_probs(s, data, eps):
    lab = learner_label(s, data)
    return {a: (1 - eps if a == lab else eps / 2) for a in ACTS}


def exact_cost(data, eps, T):
    """expected cost per step and its total; also the mass on states outside the dataset"""
    P = [0.0] * len(STATES)
    P[IDX[(0, 0)]] = 1.0
    pol = [learner_probs(s, data, eps) for s in STATES]
    per, unl = [], []
    for t in range(T):
        Q = [0.0] * len(STATES)
        for i, p in enumerate(P):
            if p == 0:
                continue
            for a in ACTS:
                Q[IDX[step(STATES[i], a)]] += p * pol[i][a]
        P = Q
        per.append(sum(p for i, p in enumerate(P) if STATES[i][0] != 0))
        unl.append(sum(p for i, p in enumerate(P) if i not in data))
    return per, unl, P


def rollout(data, eps, T, r):
    s = (0, 0)
    vis = [IDX[s]]
    for t in range(T):
        lab = learner_label(s, data)
        u = r()
        others = [a for a in ACTS if a != lab]
        a = lab if u < 1 - eps else (others[0] if u < 1 - eps / 2 else others[1])
        s = step(s, a)
        vis.append(IDX[s])
    return vis


def dagger(eps, T, rounds, m, seed):
    """returns the list of datasets after each round (round 1 = expert data only)"""
    data = {IDX[(0, 0)]}          # expert rollouts from the centre never leave it
    out = [sorted(data)]
    r = Rng(seed)
    for k in range(2, rounds + 1):
        cur = set(data)           # the learner trained on the data so far is fixed for the whole round
        for j in range(m):
            for i in rollout(cur, eps, T, r):
                data.add(i)
        out.append(sorted(data))
    return out


# ---------------- 2. Extrapolation ----------------
G = 201
GRID = [-1 + 2 * g / (G - 1) for g in range(G)]
KNOTS = [round(-0.9 + 0.1 * j, 10) for j in range(19)]
D = 2 + len(KNOTS)
GAMMA, LAM, NDATA, KIT = 0.9, 1e-3, 30, 40
MU_B, SD_B, SD_R = -0.35, 0.12, 0.1


def rtrue(a):
    return 1 - 2 * (a - 0.15) ** 2


def phi(a):
    return [1.0, a] + [max(0.0, a - k) for k in KNOTS]


def dataset(seed):
    r = Rng(seed)
    A, R = [], []
    for i in range(NDATA):
        a = clamp(MU_B + SD_B * gauss(r), -1, 1)
        A.append(a)
        R.append(rtrue(a) + SD_R * gauss(r))
    return A, R


def solve(M, v):
    n = len(v)
    A = [row[:] + [v[i]] for i, row in enumerate(M)]
    for c in range(n):
        p = max(range(c, n), key=lambda i: abs(A[i][c]))
        A[c], A[p] = A[p], A[c]
        for i in range(n):
            if i != c:
                f = A[i][c] / A[c][c]
                for j in range(c, n + 1):
                    A[i][j] -= f * A[c][j]
    return [A[i][n] / A[i][i] for i in range(n)]


def qval(w, a):
    f = phi(a)
    return sum(w[j] * f[j] for j in range(D))


def fit(A, y, alpha, w0, beta=1.0):
    n = len(A)
    F = [phi(a) for a in A]
    H0 = [[sum(F[i][p] * F[i][q] for i in range(n)) / n + (LAM if p == q and p > 0 else 0) for q in range(D)] for p in range(D)]
    b = [sum(F[i][p] * y[i] for i in range(n)) / n for p in range(D)]
    if alpha == 0:
        return solve(H0, b)
    FG = [phi(a) for a in GRID]
    fbar = [sum(F[i][p] for i in range(n)) / n for p in range(D)]
    def fobj(w):
        s = 0.0
        for j in range(D):
            r = 0.0
            for k in range(D):
                r += H0[j][k] * w[k]
            s += w[j] * (0.5 * r - b[j] - alpha * fbar[j])
        q = [sum(w[j] * FG[g][j] for j in range(D)) for g in range(G)]
        mx = max(q)
        z = 0.0
        for v in q:
            z += math.exp(beta * (v - mx))
        return s + alpha * (mx + math.log(z) / beta)
    w = w0[:]
    for it in range(200):
        q = [sum(w[j] * FG[g][j] for j in range(D)) for g in range(G)]
        mx = max(q)
        e = [math.exp(beta * (v - mx)) for v in q]
        z = sum(e)
        p_ = [v / z for v in e]
        mu = [sum(p_[g] * FG[g][j] for g in range(G)) for j in range(D)]
        grad = [sum(H0[j][k] * w[k] for k in range(D)) - b[j] + alpha * (mu[j] - fbar[j]) for j in range(D)]
        Hs = [[H0[j][k] + alpha * beta * (sum(p_[g] * FG[g][j] * FG[g][k] for g in range(G)) - mu[j] * mu[k]) for k in range(D)] for j in range(D)]
        dw = solve(Hs, grad)
        f0, t = fobj(w), 1.0           # damped Newton: halve the step until the objective does not increase
        while True:
            wn = [w[j] - t * dw[j] for j in range(D)]
            if fobj(wn) <= f0 or t < 1e-12:
                break
            t /= 2
        w = wn
        if max(abs(t * x) for x in dw) < 1e-12:
            break
    return w


def expectile(xs, tau):
    """exact tau-expectile: the m with sum_i |tau - 1(x_i < m)| (x_i - m) = 0"""
    s = sorted(xs)
    n = len(s)
    for j in range(n + 1):      # m lies between s[j-1] and s[j]: the first j values are below m
        wl, wh = 1 - tau, tau
        num = wl * sum(s[:j]) + wh * sum(s[j:])
        den = wl * j + wh * (n - j)
        m = num / den
        lo = s[j - 1] if j > 0 else -math.inf
        hi = s[j] if j < n else math.inf
        if lo <= m <= hi:
            return m
    return s[-1]


def support(A):
    mu = sum(A) / len(A)
    sd = math.sqrt(sum((a - mu) ** 2 for a in A) / len(A))
    return [g for g in range(G) if abs(GRID[g] - mu) <= 2 * sd], mu, sd


def softmax(v, beta, idx):
    mx = max(v[i] for i in idx)
    e = {i: math.exp(beta * (v[i] - mx)) for i in idx}
    z = sum(e.values())
    return {i: e[i] / z for i in idx}


def run_x(method, seed, alpha=0.0, tau=0.9, beta=1.0):
    """policy at iteration k: probability proportional to exp(beta Q_k) over the allowed actions
    (grid for naive and CQL, grid within the support for BCQ-style), or AWR weights exp(beta (Q_k - V_k)) over the dataset's actions for IQL"""
    A, R = dataset(seed)
    sup, mu, sd = support(A)
    w = [0.0] * D
    hist = []
    for k in range(KIT + 1):
        qg = [qval(w, a) for a in GRID]
        qd = [qval(w, a) for a in A]
        if method == 'iql':
            V = expectile(qd, tau)
            pol = softmax(qd, beta, range(NDATA))
            acts = A
            t = V
            bel = sum(pol[i] * qd[i] for i in pol)
        else:
            idx = sup if method == 'bcq' else range(G)
            pol = softmax(qg, beta, idx)
            acts = GRID
            bel = sum(pol[i] * qg[i] for i in pol)
            t = bel
        tru = sum(pol[i] * rtrue(acts[i]) for i in pol) / (1 - GAMMA)
        mode = max(pol, key=lambda i: (pol[i], -i))
        hist.append({'w': w[:], 'bel': bel, 'true': tru, 't': t, 'mode': acts[mode]})
        if k == KIT:
            break
        y = [R[i] + GAMMA * t for i in range(NDATA)]
        w = fit(A, y, alpha if method == 'cql' else 0.0, w, beta)
    sv = [rtrue(GRID[g]) for g in sup]
    return {'A': A, 'R': R, 'mu': mu, 'sd': sd, 'hist': hist,
            'beh': sum(rtrue(a) for a in A) / NDATA / (1 - GAMMA),
            'bestSup': max(sv) / (1 - GAMMA), 'bestAll': 1 / (1 - GAMMA)}


if __name__ == '__main__':
    out = {'drive': {}, 'x': {}}
    # driving: the settings the page offers
    for eps in [0.01, 0.02, 0.05, 0.1]:
        for T in [30, 60, 120]:
            ds = dagger(eps, T, 8, 5, 7)
            res = []
            for d in ds:
                per, unl, _ = exact_cost(set(d), eps, T)
                res.append({'data': d, 'J': sum(per), 'per': per, 'unl': unl})
            out['drive'][f'{eps} {T}'] = res
    # horizon sweep at eps = 0.02
    hz = {}
    for T in [5, 10, 20, 40, 80, 160, 320]:
        ds = dagger(0.02, T, 8, 5, 7)
        jb = sum(exact_cost(set(ds[0]), 0.02, T)[0])
        jd = sum(exact_cost(set(ds[-1]), 0.02, T)[0])
        hz[T] = {'bc': jb, 'dagger': jd, 'nd': len(ds[-1])}
    out['horizon'] = hz
    for seed in [1, 2, 3]:
        for beta in [1.0, 3.0, 10.0]:
            for meth, kw in [('naive', {}), ('bcq', {}), ('cql', {'alpha': 0.1}), ('cql', {'alpha': 1.0}), ('cql', {'alpha': 10.0}),
                             ('iql', {'tau': 0.7}), ('iql', {'tau': 0.9}), ('iql', {'tau': 0.99})]:
                key = f"{seed} {beta:g} {meth} {kw.get('alpha', kw.get('tau', ''))}".strip()
                r = run_x(meth, seed, beta=beta, **kw)
                r['wlast'] = r['hist'][-1]['w']          # weights of the final fit only, to keep expected.json small
                for h in r['hist']:
                    del h['w']
                out['x'][key] = r
    with open(os.path.join(HERE, 'expected.json'), 'w') as f:
        json.dump(out, f)
    print('driving eps 0.02 T 60: J by round', [round(x['J'], 3) for x in out['drive']['0.02 60']], 'dataset sizes', [len(x['data']) for x in out['drive']['0.02 60']])
    for T, v in hz.items():
        print(f"T {T}: BC {v['bc']:.3f} (eps T^2 = {0.02*T*T:.1f}), DAgger {v['dagger']:.3f} (eps T = {0.02*T:.2f}), states {v['nd']}")
    for k, r in out['x'].items():
        h = r['hist'][-1]
        print(k, 'mode', round(h['mode'], 3), 'believed', round(h['bel'], 2), 'true', round(h['true'], 2), 'behaviour', round(r['beh'], 2), 'bestSup', round(r['bestSup'], 2))
