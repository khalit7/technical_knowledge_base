"""Recompute the article's interference-to-signal curves and capacities (independently of the author's code).

usage (from this src/ folder):  nice -n 15 python3 recompute.py      # about 20 s; writes inputs/recompute.json

What it does, exactly as the page's live figure (parts/24_js_am_lab.js) does it, with the same random numbers:
  - store M random unit keys and M random unit values in d dimensions (d = 16, 32, 64; M = 4 ... 16384);
  - query with Q = min(48, M) of the stored keys; the weight on memory i is sigma(k_i . k_j) for the elementwise
    stores, sigma(1) on the target, and K (K^T K)^-1 k_j for the optimal (least-squares) linear store;
  - ratio = |sum_{i != j} w_i v_i| / |w_j|, the median over the Q queries (as the author's crosstalk.py), then the
    mean over three seeds;
  - capacity = the M where the ratio crosses 1, by log-log interpolation between grid points;
  - theory = sigma(1)^2 / E[sigma(s)^2] for s ~ N(0, 1/d) (numerical quadrature), the Gaussian estimate the article
    uses; for the optimal store 2d (the article's derivation); for softmax also the closed form e^{2 beta (1 - beta/d)}.
The random numbers come from mulberry32 plus Box-Muller, written identically in the JS, so check_page.mjs can compare
the page's numbers with this file's to 1e-6.
Extra, for "How much of this to believe": the same ratio at d = 64, M = 1024 when the query is only 0.9 similar to the
stored key (x = 0.9 k_j + sqrt(0.19) u, u a random unit vector perpendicular to k_j).
"""
import json, math
import numpy as np

DS = [16, 32, 64]
MS = [2 ** p for p in range(2, 15)]
SEEDS = [1, 2, 3]
STORES = ['lin', 'lsq', 'relu', 'relu2', 'relu3', 'swish', 'exp']


def mulberry32(a):
    a &= 0xFFFFFFFF
    while True:
        a = (a + 0x6D2B79F5) & 0xFFFFFFFF
        t = a
        t = ((t ^ (t >> 15)) * (t | 1)) & 0xFFFFFFFF
        t ^= (t + (((t ^ (t >> 7)) * (t | 61)) & 0xFFFFFFFF)) & 0xFFFFFFFF
        yield ((t ^ (t >> 14)) & 0xFFFFFFFF) / 4294967296


def gauss(n, seed):
    g = mulberry32(seed)
    out = np.empty(n)
    for i in range(0, n, 2):
        u1 = next(g) or 1e-12
        u2 = next(g)
        r = math.sqrt(-2 * math.log(u1))
        out[i] = r * math.cos(2 * math.pi * u2)
        if i + 1 < n:
            out[i + 1] = r * math.sin(2 * math.pi * u2)
    return out


def units(n, d, seed):
    x = gauss(n * d, seed).reshape(n, d)
    return x / np.linalg.norm(x, axis=1, keepdims=True)


def sig(name, s, d):
    if name == 'lin': return s
    if name == 'relu': return np.maximum(s, 0)
    if name == 'relu2': return np.maximum(s, 0) ** 2
    if name == 'relu3': return np.maximum(s, 0) ** 3
    if name == 'swish': return s * s / (1 + np.exp(-s))
    if name == 'exp': return np.exp(math.sqrt(d) * (s - 1))  # e^{beta s} / e^{beta}: same ratios, no overflow
    raise ValueError(name)


def ratios(K, V, X, Q, d):
    """Median |interference| / |signal| over Q queries X (row q near stored key q), for every store."""
    S = X @ K.T  # Q x M similarities
    out = {}
    for name in STORES:
        if name == 'lsq':
            M = K.shape[0]
            if M <= d:
                out[name] = 0.0
                continue
            W = (X @ np.linalg.inv(K.T @ K)) @ K.T
        else:
            W = sig(name, S, d)
        sigv = np.abs(W[np.arange(Q), np.arange(Q)])
        W2 = W.copy()
        W2[np.arange(Q), np.arange(Q)] = 0
        noise = np.linalg.norm(W2 @ V, axis=1)
        out[name] = float(np.median(noise / sigv))
    return out


def theory(name, d):
    if name == 'lsq': return 2 * d
    if name == 'exp': return None  # closed form below (the quadrature underflows nothing but is the same number)
    sd = 1 / math.sqrt(d)
    xs = np.linspace(-10 * sd, 10 * sd, 200001)
    pdf = np.exp(-xs ** 2 / (2 * sd * sd)) / (sd * math.sqrt(2 * math.pi))
    e2 = float(np.sum(sig(name, xs, d) ** 2 * pdf) * (xs[1] - xs[0]))
    return float(sig(name, np.array(1.0), d)) ** 2 / e2


def cross(ms, rs):
    for i in range(1, len(ms)):
        a, b = rs[i - 1], rs[i]
        if a < 1 <= b and a == 0:  # the optimal store is exact up to M = d: interpolate linearly in M from there
            return ms[i - 1] + (1 - a) / (b - a) * (ms[i] - ms[i - 1])
        if a < 1 <= b:
            t = (0 - math.log(a)) / (math.log(b) - math.log(a))
            return math.exp(math.log(ms[i - 1]) + t * (math.log(ms[i]) - math.log(ms[i - 1])))
    return None


res = {'Ms': MS, 'seeds': SEEDS, 'curves': {}, 'capacity': {}, 'theory': {}}
for d in DS:
    cur = {n: [] for n in STORES}
    for M in MS:
        acc = {n: [] for n in STORES}
        for sd in SEEDS:
            base = sd * 1000003 + d * 101 + M
            K, V = units(M, d, base), units(M, d, base + 7)
            Q = min(48, M)
            r = ratios(K, V, K[:Q], Q, d)
            for n in STORES: acc[n].append(r[n])
        for n in STORES: cur[n].append(round(float(np.mean(acc[n])), 9))
    res['curves'][d] = cur
    res['capacity'][d] = {n: (None if cross(MS, cur[n]) is None else round(cross(MS, cur[n]), 1)) for n in STORES}
    th = {n: theory(n, d) for n in STORES}
    b = math.sqrt(d)
    th['exp'] = math.exp(2 * b * (1 - b / d))
    res['theory'][d] = {n: round(v, 1) for n, v in th.items()}
    print('d=%d' % d, 'measured', res['capacity'][d])
    print('     theory  ', res['theory'][d])

# truncated exponential series at d = 64 (the article's 40, 450 and 3,100), Gaussian estimate
b, d = 8.0, 64
trunc = {}
for terms in (2, 3, 4):
    sd = 1 / math.sqrt(d)
    xs = np.linspace(-10 * sd, 10 * sd, 200001)
    pdf = np.exp(-xs ** 2 / (2 * sd * sd)) / (sd * math.sqrt(2 * math.pi))
    f = lambda s: sum((b * s) ** p / math.factorial(p) for p in range(terms))
    trunc[terms] = round(f(1.0) ** 2 / float(np.sum(f(xs) ** 2 * pdf) * (xs[1] - xs[0])), 1)
res['truncated_exp_capacity_d64'] = trunc
print('truncated exp capacities', trunc)

# a query only 0.9 similar to the stored key, d = 64, M = 1024
d, M, rho = 64, 1024, 0.9
acc = {n: [] for n in STORES}
for sd in SEEDS:
    base = sd * 1000003 + d * 101 + M
    K, V = units(M, d, base), units(M, d, base + 7)
    Q = 48
    U = units(Q, d, base + 13)
    U = U - np.sum(U * K[:Q], axis=1, keepdims=True) * K[:Q]
    U = U / np.linalg.norm(U, axis=1, keepdims=True)
    X = rho * K[:Q] + math.sqrt(1 - rho * rho) * U
    r = ratios(K, V, X, Q, d)
    for n in STORES: acc[n].append(r[n])
res['rho09_d64_M1024'] = {n: round(float(np.mean(acc[n])), 4) for n in STORES}
b = 8.0
res['softmax_capacity_d64_rho09_theory'] = round(math.exp(2 * b * (0.9 - b / 64)))  # e^{2 beta (rho - beta/d)}
res['rho1_d64_M1024'] = {n: round(res['curves'][64][n][MS.index(1024)], 4) for n in STORES}
print('rho=1  ', res['rho1_d64_M1024'])
print('rho=0.9', res['rho09_d64_M1024'])

# numbers each store keeps at its d = 64 capacity (d_k = d_v = 64): the fixed matrix against one row per memory
res['numbers_at_capacity_d64'] = {
    'outer product (64 memories, one 64 x 64 matrix)': 64 * 64,
    'optimal linear (128 memories, one 64 x 64 matrix)': 64 * 64,
    'squared ReLU MLP (about 2,731 hidden units, 128 numbers each)': round(2 * 64 ** 2 / 3) * 128,
    'softmax attention (about 1.2 million cached keys and values, 128 numbers each)': round(math.exp(14)) * 128,
}
json.dump(res, open('inputs/recompute.json', 'w'), indent=1)
print('wrote inputs/recompute.json')

# the page's default view (d = 64) draws from these recorded curves at once; the figure recomputes them live on request,
# and d = 32 and 16 live on first selection (check_page.mjs confirms the live numbers equal these)
open('parts/22_js_am_data.js', 'w').write('// written by src/recompute.py; do not edit by hand. The d = 64 curves of inputs/recompute.json.\n'
                                         'window.AMD=' + json.dumps({'64': res['curves'][64]}, separators=(',', ':')) + ';\n')
print('wrote parts/22_js_am_data.js')
