"""Check the page's write-rule simulation (parts/20_js_sim.js, run through node) against an independent NumPy
implementation of the paper's equations: attention-coupled write (Eq. 7), Hebbian write with Frobenius clip (Eq. 16),
top-k slot write (Eqs. 24 to 28). Same seeded random numbers (mulberry32 + Box-Muller, ported), float64 throughout.
Also checks the two exact claims the page makes: a zero-initialised attention-coupled bank keeps every row identical,
and a zero-initialised slot bank holds at most S/k distinct rows.
usage: uv run --with numpy python check_sim.py   (writes inputs/check_sim.json)"""
import json, math, subprocess, os
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
M32 = 0xFFFFFFFF


def rng(seed):
    st = [seed & M32]
    def r():
        a = (st[0] + 0x6D2B79F5) & M32; st[0] = a
        t = ((a ^ (a >> 15)) * (1 | a)) & M32
        t = ((t + (((t ^ (t >> 7)) * (61 | t)) & M32)) & M32) ^ t
        return ((t ^ (t >> 14)) & M32) / 4294967296
    return r


def gauss(r):
    u1 = 1 - r(); u2 = r()
    return math.sqrt(-2 * math.log(u1)) * math.cos(2 * math.pi * u2)


def mat(r, rows, cols, sc):
    return np.array([gauss(r) * sc for _ in range(rows * cols)]).reshape(rows, cols)


def simulate(rule, scale, init, gamma=0.95, T=600, d=32, n=8, seed=7, k=8, zs=1.0):
    r = rng(seed); sd = 1 / math.sqrt(d); g = gamma
    share = np.zeros(T + 1)
    if rule == 'ac':
        nP = 640 if scale == 10 else 64
        WQ, WK, WV = mat(r, d, d, sd), mat(r, d, d, sd), mat(r, d, d, sd)
        P = mat(r, nP, d, 0.01) if init == 'rand' else np.zeros((nP, d))
        cn = np.zeros(T)
        for t in range(T):
            Z = mat(r, n, d, zs)
            Q, V, K = Z @ WQ, Z @ WV, P @ WK
            L = Q @ K.T * sd
            A = np.exp(L - L.max(axis=1, keepdims=True)); A /= A.sum(axis=1, keepdims=True)
            C = A.T @ V
            cn[t] = np.linalg.norm(C); P = g * P + C
        PN = np.linalg.norm(P)
        for t in range(T): share[T - t] = g ** (T - 1 - t) * cn[t] / PN
        bank = P
    elif rule == 'hebb':
        dh = 13 if scale == 10 else 4
        WK, WV = mat(r, d, dh, sd), mat(r, d, dh, sd)
        M = mat(r, dh, dh, 0.01) if init == 'rand' else np.zeros((dh, dh))
        un = np.zeros(T); logc = np.zeros(T); L = 0.0
        for t in range(T):
            Z = mat(r, n, d, zs)
            U = (Z @ WK).T @ (Z @ WV) / n
            un[t] = np.linalg.norm(U); M = g * M + U
            c = max(np.linalg.norm(M), 1.0); M = M / c; L += math.log(c); logc[t] = L
        MN = np.linalg.norm(M)
        for t in range(T):
            prev = logc[t - 1] if t > 0 else 0.0
            share[T - t] = g ** (T - 1 - t) * un[t] * math.exp(-(L - prev)) / MN
        bank = M
    else:
        S = 640 if scale == 10 else 64
        Wa, Wu = mat(r, d, d, sd), mat(r, d, d, sd)
        P = mat(r, S, d, 0.01) if init == 'rand' else np.zeros((S, d))
        w = np.zeros((S, T)); unorm = np.zeros(T)
        for t in range(T):
            Z = mat(r, n, d, zs); zb = Z.mean(axis=0)
            q, u = zb @ Wa, zb @ Wu; unorm[t] = np.linalg.norm(u)
            sc = (P @ q) * sd
            idx = sorted(range(S), key=lambda i: (-sc[i], i))[:k]
            for s in idx:
                P[s] = g * P[s] + (1 - g) * u; w[s, :t] *= g; w[s, t] = 1 - g
        PN = np.linalg.norm(P)
        for t in range(T): share[T - t] = unorm[t] * math.sqrt((w[:, t] ** 2).sum()) / PN
        bank = P
    mx = np.linalg.norm(bank, axis=1).max() or 1
    reps = []
    for i in range(bank.shape[0]):
        if not any(np.linalg.norm(bank[i] - bank[j]) <= 1e-9 * mx for j in reps): reps.append(i)
    return share, len(reps)


CASES = [dict(rule=ru, scale=sc, init=ini) for ru in ('ac', 'hebb', 'slot') for sc in (1, 10) for ini in ('zero', 'rand')]
CASES += [dict(rule='ac', scale=1, init='zero', gamma=0.99), dict(rule='hebb', scale=1, init='zero', zs=0.1), dict(rule='slot', scale=1, init='zero', gamma=0.99)]

js = subprocess.run(['node', '-e', '''
const S=require(%r);const cases=JSON.parse(process.argv[1]);
console.log(JSON.stringify(cases.map(c=>{const o=S.simulate(Object.assign({gamma:0.95},c));return {share:Array.from(o.share),distinct:o.distinct,b:S.bucketMeans(o.share)}})));
''' % os.path.join(HERE, 'parts', '20_js_sim.js'), json.dumps(CASES)], capture_output=True, text=True, check=True)
JS = json.loads(js.stdout)
rows, worst = [], 0.0
for c, j in zip(CASES, JS):
    sh, dist = simulate(**c)
    a, b = np.array(j['share'][1:]), sh[1:]
    m = b > 1e-250
    rel = float(np.max(np.abs(a[m] - b[m]) / b[m])) if m.any() else 0.0
    worst = max(worst, rel)
    rows.append(dict(case=c, max_rel_diff=rel, distinct_js=j['distinct'], distinct_np=dist, buckets_js=j['b']))
    print(c, 'max rel diff %.2e' % rel, 'distinct js/np', j['distinct'], dist)
# exact claims
zero_ac = [r for r in rows if r['case']['rule'] == 'ac' and r['case']['init'] == 'zero']
zero_slot = [r for r in rows if r['case']['rule'] == 'slot' and r['case']['init'] == 'zero']
claims = {
    'ac_zero_init_one_distinct_row': all(r['distinct_np'] == 1 == r['distinct_js'] for r in zero_ac),
    'slot_zero_init_at_most_S_over_k_plus_zero_row': all(r['distinct_np'] <= (640 if r['case']['scale'] == 10 else 64) // 8 + 1 for r in zero_slot),
}
out = dict(source='check_sim.py: parts/20_js_sim.js (node) against NumPy', cases=rows, worst_max_rel_diff=worst, claims=claims,
           decay={'gamma': 0.95, 'gamma^31': 0.95 ** 31, 'gamma^63': 0.95 ** 63, 'gamma^127': 0.95 ** 127, 'gamma^255': 0.95 ** 255,
                  'window_1_over_1_minus_gamma': 1 / (1 - 0.95), 'lag_where_gamma^l_below_bf16_eps_2^-8': math.ceil(math.log(2 ** -8) / math.log(0.95))})
json.dump(out, open(os.path.join(HERE, 'inputs', 'check_sim.json'), 'w'), indent=1)
print('worst max relative difference %.2e' % worst, 'claims', claims)
assert worst < 1e-6 and all(claims.values())
