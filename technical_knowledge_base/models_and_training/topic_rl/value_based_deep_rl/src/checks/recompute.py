"""Independent Python reference for every number the page's engine (parts/21_js_vb_engine.js) computes.

Run from src/:  python3 checks/recompute.py   (writes checks/expected.json, prints the published-figure checks)
Then:           node checks/check_engine.mjs  (runs the page's engine in Node and compares every value)

Plain Python 3 (stdlib only), so the page's numbers do not depend on numpy's routines; numpy was used once,
outside this file, to confirm the least-squares fits (scratch).
"""
import json, math, os, statistics

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = {}

# ---- 1. Sutton and Barto section 11.2: the w -> 2w example (as on the root's long Reading tab) ----
def triad(g, a, mode, steps):
    w = 10.0
    ws = [w]
    for _ in range(steps):
        w = w + a * (g * 2 * w - w) * 1
        if mode == 'on':
            w = w + a * (0 - 2 * w) * 2
        ws.append(w)
    return ws

OUT['triad'] = {f'{g}|{a}|{m}': triad(g, a, m, 30) for g in (0.9, 0.5, 0.99) for a in (0.1, 0.05) for m in ('off', 'on')}

# ---- 2. Baird's counterexample (S&B Figure 11.1, 11.2 right): expected semi-gradient DP updates ----
def baird_x(s):
    x = [0.0] * 8
    if s < 6:
        x[s] = 2.0; x[7] = 1.0
    else:
        x[6] = 1.0; x[7] = 2.0
    return x

def baird(alpha, sweeps, dist, g=0.99):
    w = [1, 1, 1, 1, 1, 1, 10, 1.0]
    hist = [w[:]]
    X = [baird_x(s) for s in range(7)]
    for _ in range(sweeps):
        v = [sum(X[s][i] * w[i] for i in range(8)) for s in range(7)]
        dw = [0.0] * 8
        states = range(7) if dist == 'uniform' else [6]
        wt = 1.0 / 7 if dist == 'uniform' else 1.0
        for s in states:
            d = g * v[6] - v[s]          # every action of the target policy goes to state 7, reward 0
            for i in range(8):
                dw[i] += wt * d * X[s][i]
        w = [w[i] + alpha * dw[i] for i in range(8)]
        hist.append(w[:])
    return hist

OUT['baird'] = {}
for dist in ('uniform', 'on'):
    h = baird(0.01, 1000, dist)
    OUT['baird'][dist] = [h[k] for k in range(0, 1001, 50)]

# ---- 3. Moving target against frozen target: expected semi-gradient Q-learning updates on two states ----
# s1 has features (1, 0), s2 has (2, 2); s1 -> s2 with reward 0; s2 -> s2 with reward 1. True values 9 and 10 at gamma 0.9.
PHI = [[1.0, 0.0], [2.0, 2.0]]
NXT = [1, 1]
RW = [0.0, 1.0]

def solve2(A, b):
    det = A[0][0] * A[1][1] - A[0][1] * A[1][0]
    return [(b[0] * A[1][1] - A[0][1] * b[1]) / det, (A[0][0] * b[1] - b[0] * A[1][0]) / det]

def tnet(g, d1, a, C, steps):
    """C = 0 means fitted Q iteration: refresh every step and solve the regression exactly."""
    d = [d1, 1 - d1]
    w = [0.0, 0.0]; wm = w[:]
    out = []
    for k in range(steps):
        if C == 0 or k % C == 0:
            wm = w[:]
        vm = [PHI[s][0] * wm[0] + PHI[s][1] * wm[1] for s in range(2)]
        y = [RW[s] + g * vm[NXT[s]] for s in range(2)]
        if C == 0:
            G = [[sum(d[s] * PHI[s][i] * PHI[s][j] for s in range(2)) for j in range(2)] for i in range(2)]
            b = [sum(d[s] * PHI[s][i] * y[s] for s in range(2)) for i in range(2)]
            w = solve2(G, b)
        else:
            v = [PHI[s][0] * w[0] + PHI[s][1] * w[1] for s in range(2)]
            w = [w[i] + a * sum(d[s] * (y[s] - v[s]) * PHI[s][i] for s in range(2)) for i in range(2)]
        v = [PHI[s][0] * w[0] + PHI[s][1] * w[1] for s in range(2)]
        out.append([v[0], v[1], y[0], y[1]])
    return out

OUT['tnet'] = {}
for (g, d1, a) in ((0.9, 2 / 3, 0.3), (0.9, 0.5, 0.3), (0.95, 0.8, 0.2)):
    for C in (1, 2, 5, 10, 40, 0):
        OUT['tnet'][f'{g}|{round(d1, 4)}|{a}|{C}'] = tnet(g, d1, a, C, 120)

# ---- 4. van Hasselt, Guez and Silver (2015) Figure 2: overestimation from function approximation alone ----
def lstsq_poly(xs, ys, deg):
    """Least squares by Householder QR on the scaled variable x/6 (the page's engine does the same)."""
    m, n = len(xs), deg + 1
    A = [[(x / 6.0) ** j for j in range(n)] for x in xs]
    b = ys[:]
    for k in range(n):
        norm = math.sqrt(sum(A[i][k] ** 2 for i in range(k, m)))
        if A[k][k] > 0:
            norm = -norm
        v = [0.0] * m
        v[k] = A[k][k] - norm
        for i in range(k + 1, m):
            v[i] = A[i][k]
        vv = sum(t * t for t in v)
        if vv == 0:
            continue
        for j in range(k, n):
            s = sum(v[i] * A[i][j] for i in range(k, m)) * 2 / vv
            for i in range(k, m):
                A[i][j] -= s * v[i]
        s = sum(v[i] * b[i] for i in range(k, m)) * 2 / vv
        for i in range(k, m):
            b[i] -= s * v[i]
    c = [0.0] * n
    for i in range(n - 1, -1, -1):
        c[i] = (b[i] - sum(A[i][j] * c[j] for j in range(i + 1, n))) / A[i][i]
    return c

def peval(c, x):
    t = x / 6.0
    r = 0.0
    for j in range(len(c) - 1, -1, -1):
        r = r * t + c[j]
    return r

FUNS = {'sin': math.sin, 'bump': lambda s: 2 * math.exp(-s * s)}

def fig2(fun, deg, ngrid=1201):
    f = FUNS[fun]
    fits = []
    for i in range(10):                       # action a_{i+1} misses integer states -5+i and -4+i
        miss = {-5 + i, -4 + i}
        xs = [x for x in range(-6, 7) if x not in miss]
        fits.append(lstsq_poly([float(x) for x in xs], [f(x) for x in xs], deg))
    grid = [-6 + 12 * k / (ngrid - 1) for k in range(ngrid)]
    emax, edbl = [], []
    for x in grid:
        q = [peval(c, x) for c in fits]
        b = max(range(10), key=lambda i: q[i])
        emax.append(q[b] - f(x))
        edbl.append(peval(fits[(b + 5) % 10], x) - f(x))   # second set: the samples of action a_{i+5} (or a_{i-5})
    return fits, sum(emax) / ngrid, sum(edbl) / ngrid, emax, edbl

OUT['fig2'] = {}
for fun, deg, printed in (('sin', 6, (0.61, -0.02)), ('bump', 6, (0.47, 0.02)), ('bump', 9, (3.35, -0.02))):
    fits, m, d, emax, edbl = fig2(fun, deg)
    OUT['fig2'][f'{fun}|{deg}'] = {'fits': fits, 'avgMax': m, 'avgDbl': d, 'emax': emax[::50], 'edbl': edbl[::50]}
    print(f'Figure 2 {fun} degree {deg}: average max error {m:+.3f} (printed {printed[0]:+.2f}), double {d:+.3f} (printed {printed[1]:+.2f})')
for fun in ('sin', 'bump'):
    for deg in (3, 4, 5, 7, 8, 9):
        if f'{fun}|{deg}' in OUT['fig2']:
            continue
        fits, m, d, _, _ = fig2(fun, deg)
        OUT['fig2'][f'{fun}|{deg}'] = {'fits': fits, 'avgMax': m, 'avgDbl': d}

# ---- 5. C51: projecting the shifted, shrunk distribution back onto the atoms ----
def atoms(N, vmin, vmax):
    dz = (vmax - vmin) / (N - 1)
    return [vmin + i * dz for i in range(N)], dz

def c51_next(N, vmin, vmax):
    """The illustrative next-state distribution the page starts from (two bumps, normalised)."""
    z, _ = atoms(N, vmin, vmax)
    raw = [math.exp(-((x - 5) ** 2) / 6) + 0.55 * math.exp(-((x + 5) ** 2) / 3) for x in z]
    s = sum(raw)
    return [r / s for r in raw]

def c51_project(p, N, vmin, vmax, r, g, mode):
    z, dz = atoms(N, vmin, vmax)
    m = [0.0] * N
    for j in range(N):
        tz = min(vmax, max(vmin, r + g * z[j]))
        if mode == 'eq7':
            for i in range(N):
                m[i] += max(0.0, 1 - abs(tz - z[i]) / dz) * p[j]
        else:                                   # Algorithm 1 exactly as printed
            bj = (tz - vmin) / dz
            l, u = math.floor(bj), math.ceil(bj)
            m[l] += p[j] * (u - bj)
            m[u] += p[j] * (bj - l)
    return m

OUT['c51'] = {}
for (N, r, g) in ((11, 1.0, 0.9), (11, 0.0, 1.0), (51, 1.0, 0.9), (21, -2.0, 0.99), (11, 3.0, 0.9)):
    p = c51_next(N, -10, 10)
    z, _ = atoms(N, -10, 10)
    e7 = c51_project(p, N, -10, 10, r, g, 'eq7')
    a1 = c51_project(p, N, -10, 10, r, g, 'alg1')
    OUT['c51'][f'{N}|{r}|{g}'] = {'p': p, 'eq7': e7, 'alg1': a1,
                                  'meanNext': sum(a * b for a, b in zip(p, z)),
                                  'meanEq7': sum(a * b for a, b in zip(e7, z)),
                                  'massAlg1': sum(a1)}
k = OUT['c51']['11|1.0|0.9']
print(f"C51 default: Algorithm 1 as printed keeps mass {k['massAlg1']:.4f}; equation 7 keeps {sum(k['eq7']):.4f}")
print(f"C51 r = 0, gamma = 1: Algorithm 1 keeps {OUT['c51']['11|0.0|1.0']['massAlg1']:.4f}")

# ---- 6. Prioritised replay: sampling probabilities and importance-sampling weights ----
DELTAS = [0.05, 0.1, 0.2, 0.3, 0.5, 0.8, 1.5, 3.0]

def per(deltas, alpha, beta, variant, eps=0.01):
    n = len(deltas)
    if variant == 'prop':
        pr = [abs(d) + eps for d in deltas]
    else:
        order = sorted(range(n), key=lambda i: -abs(deltas[i]))
        rank = [0] * n
        for r_, i in enumerate(order):
            rank[i] = r_ + 1
        pr = [1.0 / rank[i] for i in range(n)]
    pa = [q ** alpha for q in pr]
    s = sum(pa)
    P = [q / s for q in pa]
    w = [(n * q) ** (-beta) for q in P]
    mw = max(w)
    w = [x / mw for x in w]
    return P, w

OUT['per'] = {f'{v}|{a}|{b}': per(DELTAS, a, b, v) for v in ('prop', 'rank') for a in (0, 0.5, 0.6, 0.7, 1) for b in (0, 0.4, 1)}

# ---- 7. Rainbow Figure 4 (decoded from the PDF's vector drawing): summary statistics ----
F4 = json.load(open(os.path.join(HERE, '..', 'inputs', 'rainbow_fig4_decoded.json')))
OUT['fig4'] = {}
for k_, vals in F4['rows'].items():
    OUT['fig4'][k_] = {'median': statistics.median(vals), 'mean': sum(vals) / len(vals),
                       'hurt': sum(1 for v in vals if v > 0.005), 'helped': sum(1 for v in vals if v < -0.005),
                       'strongest': sum(F4['hi'][k_])}
for k_, s in OUT['fig4'].items():
    print(f"Rainbow Figure 4, {k_}: median drop {s['median']:.3f}, games hurt {s['hurt']}, helped {s['helped']}, strongest drop in {s['strongest']} games")

# ---- 8. Small worked numbers carried from the old page ----
OUT['worked'] = {
    'dqnTarget': 1 + 0.99 * max(2.0, 3.5, 3.0),
    'ddqnTarget': 1 + 0.99 * [2.0, 3.5, 3.0][max(range(3), key=lambda i: [2.5, 3.0, 3.8][i])],
    'dueling': [5 + a - (1 - 1 + 3) / 3 for a in (1, -1, 3)],
    'thm1': {m: math.sqrt(1 / (m - 1)) for m in (2, 4, 10, 18)},
    'uniformMax': {m: (m - 1) / (m + 1) for m in (2, 4, 10, 18)},
    'hRescale': [math.copysign(math.sqrt(abs(x) + 1) - 1, x) + 1e-3 * x for x in (-100.0, -1.0, 0.0, 1.0, 10.0, 100.0, 1000.0)],
}
print('DQN target', OUT['worked']['dqnTarget'], 'Double DQN target', OUT['worked']['ddqnTarget'], 'dueling Q', OUT['worked']['dueling'])

json.dump(OUT, open(os.path.join(HERE, 'expected.json'), 'w'))
print('wrote checks/expected.json')
