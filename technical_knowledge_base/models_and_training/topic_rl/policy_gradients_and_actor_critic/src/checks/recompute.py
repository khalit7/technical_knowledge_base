"""Independent Python implementation of every computation on the page, compared with the page's own JavaScript engine.

usage (from src/checks):  node dump_js.mjs && python3 recompute.py
Plain Python 3, standard library only. The random numbers are the same mulberry32 stream bit for bit, so seeded runs
must agree exactly (or to 1e-9 where exp and log enter). Also checks the closed forms the prose quotes.
"""
import json, math, os, sys

HERE = os.path.dirname(os.path.abspath(__file__))
JS = json.load(open(os.path.join(HERE, 'js_dump.json')))
fails = 0
checks = 0


def close(a, b, tol=1e-9):
    if isinstance(a, (list, tuple)):
        return len(a) == len(b) and all(close(x, y, tol) for x, y in zip(a, b))
    if isinstance(a, bool) or isinstance(b, bool):
        return a == b
    return abs(a - b) <= tol * max(1.0, abs(a), abs(b))


def ok(name, cond, detail=''):
    global fails, checks
    checks += 1
    if not cond:
        fails += 1
        print('FAIL', name, detail)


# ---- mulberry32, written from the C original with explicit 32-bit arithmetic ----
def rng(seed):
    st = [seed & 0xFFFFFFFF]

    def imul(a, b):
        return (a * b) & 0xFFFFFFFF

    def r():
        st[0] = (st[0] + 0x6D2B79F5) & 0xFFFFFFFF
        t = st[0]
        t = imul(t ^ (t >> 15), t | 1)
        t = (t ^ ((t + imul(t ^ (t >> 7), t | 61)) & 0xFFFFFFFF)) & 0xFFFFFFFF
        return ((t ^ (t >> 14)) & 0xFFFFFFFF) / 4294967296
    return r


def softmax(z):
    m = max(z)
    e = [math.exp(v - m) for v in z]
    s = sum(e)
    return [v / s for v in e]


# ---- 1. three-action softmax policy gradient ----
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
    return pi, V, grad, var_of(0), var_of(V)


def pg_run(rew, eta, steps, seed, use_b):
    r = rng(seed)
    th = [0.0, 0.0, 0.0]
    hist = []
    for _ in range(steps):
        pi, V, grad, v0, vB = pg_stats(th, rew)
        u = r()
        a, acc = 0, pi[0]
        while u >= acc and a < 2:
            a += 1
            acc += pi[a]
        b = V if use_b else 0.0
        g = [((1 if j == a else 0) - pi[j]) * (rew[a] - b) for j in range(3)]
        hist.append(dict(pi=pi, a=a, V=V, var0=v0, varB=vB))
        th = [th[j] + eta * g[j] for j in range(3)]
    pi, V, grad, v0, vB = pg_stats(th, rew)
    hist.append(dict(pi=pi, a=-1, V=V, var0=v0, varB=vB))
    return hist


pi, V, grad, v0, vB = pg_stats([0, 0, 0], [1, 2, 6])
ok('pg uniform gradient', close(grad, [-2 / 3, -1 / 3, 1]), grad)
ok('pg variance 7.56 -> 1.56', round(v0, 2) == 7.56 and round(vB, 2) == 1.56, (v0, vB))
for key, hs in JS['pgRun'].items():
    off, s, b = key.split('|')
    off = float(off)
    mine = pg_run([1 + off, 2 + off, 6 + off], 0.1, 60, int(s), b == 'true')
    ok('pgRun ' + key, all(h['a'] == m['a'] and close(h['pi'], m['pi']) and close(h['V'], m['V']) and close(h['var0'], m['var0']) for h, m in zip(hs, mine)))
for key, d in JS['pgStuck'].items():
    off, b = key.split('|')
    off = float(off)
    finals = [pg_run([1 + off, 2 + off, 6 + off], 0.1, 60, s, b == 'true')[-1]['V'] for s in range(100, 300)]
    stuck = sum(1 for v in finals if v < 3 + off)
    ok('pgStuck ' + key, stuck == d['stuck'], (stuck, d['stuck']))
ok('86 of 200 stuck without a baseline at offset 10', JS['pgStuck']['10|false']['stuck'] == 86, JS['pgStuck']['10|false']['stuck'])
ok('0 of 200 stuck with the baseline at offset 10', JS['pgStuck']['10|true']['stuck'] == 0)


# ---- 2. variance against a constant baseline, computed by enumerating actions ----
def base_var(th, rew, b):
    pi = softmax(th)
    V = sum(p * r for p, r in zip(pi, rew))
    est = lambda a, bb: [((1 if j == a else 0) - pi[j]) * (rew[a] - bb) for j in range(3)]
    mean = [sum(pi[a] * est(a, b)[j] for a in range(3)) for j in range(3)]

    def var(bb):
        m = [sum(pi[a] * est(a, bb)[j] for a in range(3)) for j in range(3)]
        return sum(pi[a] * sum((est(a, bb)[j] - m[j]) ** 2 for j in range(3)) for a in range(3))
    # b* by minimising the parabola numerically (golden section), independent of the closed form
    lo, hi = -50.0, 50.0
    for _ in range(200):
        m1, m2 = lo + (hi - lo) * 0.382, lo + (hi - lo) * 0.618
        if var(m1) < var(m2):
            hi = m2
        else:
            lo = m1
    bs = (lo + hi) / 2
    return dict(mean=mean, v=var(b), v0=var(0), vV=var(V), bs=bs, vs=var(bs), V=V)


for key, d in JS['baseVar'].items():
    l, b = map(float, key.split('|'))
    m = base_var([0, 0, l], [1, 2, 6], b)
    ok('baseVar ' + key, close(m['mean'], d['mean']) and close(m['v'], d['v']) and close(m['vV'], d['vV']) and close(m['bs'], d['bs'], 1e-6) and close(m['vs'], d['vs'], 1e-9), (m['bs'], d['bs']))
    ok('baseVar mean equals exact gradient ' + key, close(d['mean'], d['grad']))
ok('b* = V at the uniform policy', close(JS['baseVar']['0|3']['bs'], 3.0))


# ---- 3. GAE as the weighted average of k-step advantages (a different formula from the page's recursion) ----
def gae_direct(R, V, g, lam):
    T = len(R)
    Vx = V + [0.0]
    out = []
    for t in range(T):
        n = T - t
        ks = []
        for k in range(1, n + 1):
            s = sum(g ** l * R[t + l] for l in range(k)) + g ** k * Vx[t + k] - V[t]
            ks.append(s)
        if lam == 1:
            out.append(ks[-1])
            continue
        w = [(1 - lam) * lam ** (k - 1) for k in range(1, n)] + [lam ** (n - 1)]
        out.append(sum(wi * ki for wi, ki in zip(w, ks)))
    return out


for key, d in JS['gae'].items():
    kind, lam, g, err = key.split('|')
    lam, g, err = float(lam), float(g), float(err)
    if kind == 'ex':
        R, V = [0, 0, 1], [0.5 + err, 0.6 + err, 0.8 + err]
    else:
        R, V = [0] * 7 + [1], [g ** (7 - t) + err for t in range(8)]
    ok('gae ' + key, close(gae_direct(R, V, g, lam), d['A'], 1e-9), (gae_direct(R, V, g, lam)[0], d['A'][0]))
ex = JS['gae']['ex|0.95|1|0']
ok('GAE worked example 0.1 / 0.4705 / 0.5', close(JS['gae']['ex|0|1|0']['A'][0], 0.1) and close(ex['A'][0], 0.4705) and close(JS['gae']['ex|1|1|0']['A'][0], 0.5))
ok('long chain, error 0.3: lambda 0 gives -0.003, lambda 1 gives -0.3', close(JS['gae']['long|0|0.99|0.3']['A'][0], -0.003) and close(JS['gae']['long|1|0.99|0.3']['A'][0], -0.3))


# ---- 4. PPO ----
def ppo_l(r, A, e, clip):
    return r * A if not clip else min(r * A, max(1 - e, min(1 + e, r)) * A)


for key, (lc, lu, dl) in JS['ppoL'].items():
    r, A, e = map(float, key.split('|'))
    flat = (A > 0 and r > 1 + e) or (A < 0 and r < 1 - e)
    ok('ppoL ' + key, close(lc, ppo_l(r, A, e, True)) and close(lu, r * A) and close(dl, 0 if flat else A))
table = [(2, 1.5, 2.4), (2, 0.7, 1.4), (-1, 0.7, -0.8), (-1, 1.5, -1.5)]
ok('PPO four-case table', all(close(ppo_l(r, A, 0.2, True), v) for A, r, v in table))


def ppo_run(A, e, eta, epochs, clip):
    th0 = [0, 0.5, -0.5]
    old = softmax(th0)[0]
    th = th0[:]
    hist = []
    for k in range(epochs + 1):
        pi = softmax(th)
        r = pi[0] / old
        p0 = softmax(th0)
        kl = sum(p * math.log(p / q) for p, q in zip(p0, pi))
        active = (not clip) or not ((A > 0 and r > 1 + e) or (A < 0 and r < 1 - e))
        hist.append(dict(r=r, kl=kl, active=active))
        if k == epochs:
            break
        if active:
            th = [th[j] + eta * A * r * ((1 if j == 0 else 0) - pi[j]) for j in range(3)]
    return old, hist


for key, d in JS['ppoRun'].items():
    A, e, h, c = key.split('|')
    old, hist = ppo_run(float(A), float(e), float(h), 10, c == 'true')
    ok('ppoRun ' + key, close(old, d['old']) and all(close(x['r'], y['r']) and close(x['kl'], y['kl']) and x['active'] == y['active'] for x, y in zip(hist, d['hist'])))
ok('old probability 0.307', round(JS['ppoRun']['1|0.2|0.2|true']['old'], 3) == 0.307)

# ---- 5. SAC toy: expected reward of a Gaussian by numerical integration (independent of the closed form) ----
BUMPS = [(1.0, 0.6, 0.12), (0.75, -0.5, 0.35)]
K = 0.5


def r_of(a):
    return sum(h * math.exp(-(a - c) ** 2 / (2 * w * w)) for h, c, w in BUMPS) - K * a * a


def er_closed(mu, s):
    return sum(h * w / math.sqrt(s * s + w * w) * math.exp(-(mu - c) ** 2 / (2 * (s * s + w * w))) for h, c, w in BUMPS) - K * (mu * mu + s * s)


def er_numeric(mu, s, n=4001):
    lo, hi = mu - 10 * s, mu + 10 * s
    h = (hi - lo) / (n - 1)
    tot = 0.0
    for i in range(n):
        a = lo + i * h
        wgt = 0.5 if i in (0, n - 1) else 1.0
        tot += wgt * r_of(a) * math.exp(-(a - mu) ** 2 / (2 * s * s)) / (s * math.sqrt(2 * math.pi))
    return tot * h


for mu, s in [(0.6, 0.05), (-0.4, 0.2), (0.0, 0.9), (0.59, 0.0278)]:
    ok('Gaussian expected reward closed form vs quadrature %s %s' % (mu, s), close(er_closed(mu, s), er_numeric(mu, s), 1e-7), (er_closed(mu, s), er_numeric(mu, s)))
gH = lambda s: 0.5 * math.log(2 * math.pi * math.e * s * s)


def sac_gauss(alpha):
    best, bm, bs = -1e300, 0, 0
    for i in range(481):
        mu = -1.2 + i * 0.005
        for j in range(241):
            s = math.exp(math.log(0.002) + j * (math.log(3) - math.log(0.002)) / 240)
            J = er_closed(mu, s) + alpha * gH(s)
            if J > best:
                best, bm, bs = J, mu, s
    return bm, bs, er_closed(bm, bs), gH(bs)


for a, d in JS['sacGauss'].items():
    mu, s, er, H = sac_gauss(float(a))
    ok('sacGauss ' + a, close(mu, d['mu']) and close(s, d['s']) and close(er, d['ER']) and close(H, d['H']), (mu, s, d['mu'], d['s']))


def sac_boltz(alpha):
    n, lo, hi = 801, -3.0, 3.0
    h = (hi - lo) / (n - 1)
    xs = [lo + i * h for i in range(n)]
    lw = [r_of(x) / alpha for x in xs]
    m = max(lw)
    w = [math.exp(v - m) for v in lw]
    Z = sum(w) * h
    p = [v / Z for v in w]
    ER = sum(pi * r_of(x) * h for pi, x in zip(p, xs))
    H = -sum(pi * math.log(pi) * h for pi in p if pi > 0)
    return ER, H


for a, d in JS['sacBoltz'].items():
    ER, H = sac_boltz(float(a))
    ok('sacBoltz ' + a, close(ER, d['ER'], 1e-9) and close(H, d['H'], 1e-9))
au = JS['sacAuto']
ok('auto alpha sits at the mode switch', sac_gauss(au * 0.99)[0] > 0 and sac_gauss(au * 1.01)[0] < 0 and sac_gauss(au * 0.99)[3] < -1 < sac_gauss(au * 1.01)[3], au)
print('auto alpha %.4f; entropy just below %.3f, just above %.3f' % (au, sac_gauss(au * 0.999)[3], sac_gauss(au * 1.001)[3]))
ok('entropy ln 2 times 0.2 = 0.139', round(0.2 * math.log(2), 3) == 0.139)


# ---- 6. Short corridor: exact values by solving the Bellman system numerically, and the learners ----
def cor_values(p):
    # v1 = -1 + p v2 + (1-p) v1 ; v2 = -1 + p v1 + (1-p) v3 ; v3 = -1 + (1-p) v2  (iterate to convergence)
    v = [0.0, 0.0, 0.0]
    for _ in range(200000):
        n = [-1 + p * v[1] + (1 - p) * v[0], -1 + p * v[0] + (1 - p) * v[2], -1 + (1 - p) * v[1]]
        if max(abs(a - b) for a, b in zip(n, v)) < 1e-12:
            v = n
            break
        v = n
    return v


for p, d in JS['corV'].items():
    ok('corridor values p=' + p, close(cor_values(float(p)), d, 1e-8), (cor_values(float(p)), d))
best = max((cor_values(k / 10000)[0], k / 10000) for k in range(5000, 6500, 1))
ok('optimum p* about 0.5858, J* about -11.657', abs(best[1] - 0.5858) < 2e-4 and abs(best[0] + 11.65685) < 1e-4, best)
ok('epsilon-greedy values -44.21 and -82.11', round(cor_values(0.95)[0], 2) == -44.21 and round(cor_values(0.05)[0], 2) == -82.11)


def cor_step(s, a):
    right = (a == 1) if s == 1 else (a == 0)
    if right:
        return s + 1
    return 0 if s == 0 else s - 1


def cor_pi(th, eps):
    pi = softmax(th)
    if eps > 0:
        m = 0 if pi[0] < pi[1] else 1
        if pi[m] < eps:
            pi[m] = eps
            pi[1 - m] = 1 - eps
    return pi


def cor_run(kind, at, aw, episodes, seed, eps, maxT):
    r = rng(seed)
    th = [-1.47, 1.47]
    w = 0.0
    cut = 0
    tot, ps = [], [cor_pi(th, eps)[0]]
    for _ in range(episodes):
        s, T, A = 0, 0, []
        if kind == 'ac':
            while s != 3 and T < maxT:
                pi = cor_pi(th, eps)
                a = 0 if r() < pi[0] else 1
                s2 = cor_step(s, a)
                T += 1
                d = -1 + (0 if s2 == 3 else w) - w
                w += aw * d
                th = [th[0] + at * d * ((a == 0) - pi[0]), th[1] + at * d * ((a == 1) - pi[1])]
                s = s2
        else:
            while s != 3 and T < maxT:
                pi = cor_pi(th, eps)
                a = 0 if r() < pi[0] else 1
                A.append(a)
                s = cor_step(s, a)
                T += 1
            for t in range(T):
                G = -(T - t)
                pi = cor_pi(th, eps)
                a = A[t]
                d = G
                if kind == 'rfb':
                    d = G - w
                    w += aw * d
                th = [th[0] + at * d * ((a == 0) - pi[0]), th[1] + at * d * ((a == 1) - pi[1])]
        if s != 3:
            cut += 1
        tot.append(-T)
        ps.append(cor_pi(th, eps)[0])
    return tot, ps, cut, w


for key, d in JS['corRun'].items():
    k, s, eps = key.split('|')
    at, aw = {'rf': (2 ** -13, 0), 'rfb': (2 ** -9, 2 ** -6), 'ac': (2 ** -9, 2 ** -6)}[k]
    tot, ps, cut, w = cor_run(k, at, aw, 300, int(s), float(eps), 5000)
    ok('corRun ' + key, tot == [int(x) for x in d['tot']] and close(ps, d['ps'], 1e-9) and cut == d['cut'], (tot[:5], d['tot'][:5]))

if '--full' in sys.argv:
    for cid, (k, at, aw) in {'r12': ('rf', -12, 0), 'r13': ('rf', -13, 0), 'r14': ('rf', -14, 0), 'rb': ('rfb', -9, -6), 'ac': ('ac', -9, -6), 'ac12': ('ac', -12, -6)}.items():
        m = [0.0] * 1000
        pend = 0.0
        for s in range(1, 101):
            tot, ps, cut, w = cor_run(k, 2.0 ** at, 2.0 ** aw if aw else 0, 1000, s, 0.05, 5000)
            for e in range(1000):
                m[e] += tot[e] / 100
            pend += ps[1000] / 100
        av = lambda a, b: sum(m[a:b]) / (b - a)
        d = JS['corAvg'][cid]
        mine = dict(e1_10=av(0, 10), e100_200=av(100, 200), e400_500=av(400, 500), e900_1000=av(900, 1000), pEnd=pend)
        # episode rewards must agree exactly; the final probability to 1e-6 (last-ulp differences of exp accumulate over 1,000 episodes)
        ok('corAvg ' + cid, all(close(mine[x], d[x], 1e-12) for x in mine if x != 'pEnd') and close(mine['pEnd'], d['pEnd'], 1e-6), (mine, d))
        print(cid, {x: round(v, 3) for x, v in mine.items()})
else:
    for cid, d in JS['corAvg'].items():
        print(cid, {x: round(v, 3) for x, v in d.items()}, '(JS; run with --full to recompute)')

# ---- natural-gradient example in the prose ----
def kl_bern(z, dz):
    p = 1 / (1 + math.exp(-z))
    q = 1 / (1 + math.exp(-(z + dz)))
    return p * math.log(p / q) + (1 - p) * math.log((1 - p) / (1 - q))


z99 = math.log(0.99 / 0.01)
ok('KL of a unit logit step: 0.120 at p 0.5, 0.0037 at p 0.99', round(kl_bern(0, 1), 3) == 0.120 and round(kl_bern(z99, 1), 4) == 0.0037)
ok('natural step for KL 0.01: 0.283 and 1.42; exact KL 0.00997 and 0.0066', round(math.sqrt(0.02 / 0.25), 3) == 0.283 and round(math.sqrt(0.02 / 0.0099), 2) == 1.42 and round(kl_bern(0, math.sqrt(0.08)), 5) == 0.00997 and round(kl_bern(z99, math.sqrt(0.02 / 0.0099)), 4) == 0.0066)
ok('E[min of two N(0,1)] = -1/sqrt(pi) = -0.564', round(-1 / math.sqrt(math.pi), 3) == -0.564)

print('checks', checks, 'fails', fails)
sys.exit(1 if fails else 0)
