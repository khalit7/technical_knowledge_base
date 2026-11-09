# Recompute every number the page derives, from src/inputs/ only (stdlib Python).
# Writes recompute_out.json; check_page.mjs compares the page's JavaScript against it.
import json, math, os, random
HERE = os.path.dirname(os.path.abspath(__file__))
I = lambda f: json.load(open(os.path.join(HERE, 'inputs', f)))
LN10 = math.log(10)
out = {}

# ---- Bradley-Terry scale ----
p = lambda d: 1 / (1 + 10 ** (-d / 400))
out['bt_100'] = round(100 * p(100), 1); out['bt_200'] = round(100 * p(200), 1)

# ---- lab sample ----
S = I('lab_sample.json'); al = S['alphabet']; n = S['n']; v = S['votes']
A, B, O, F = [], [], [], [[], [], [], []]
for i in range(n):
    A.append(al.index(v[i * 7])); B.append(al.index(v[i * 7 + 1])); O.append(al.index(v[i * 7 + 2]))
    for k in range(4): F[k].append((al.index(v[i * 7 + 3 + k]) - 31) / 31)
m = len(S['models'])
score = lambda o: 1.0 if o == 0 else 0.0 if o == 1 else 0.5

def solve(H, g):
    nn = len(g); M = [H[i][:] + [g[i]] for i in range(nn)]
    for c in range(nn):
        piv = max(range(c, nn), key=lambda r: abs(M[r][c])); M[c], M[piv] = M[piv], M[c]
        d = M[c][c] or 1e-12
        for r in range(c + 1, nn):
            f = M[r][c] / d
            if f:
                for k in range(c, nn + 1): M[r][k] -= f * M[c][k]
    x = [0.0] * nn
    for r in range(nn - 1, -1, -1):
        s = M[r][nn] - sum(M[r][k] * x[k] for k in range(r + 1, nn)); x[r] = s / (M[r][r] or 1e-12)
    return x

def inv(H):
    nn = len(H); cols = [solve(H, [1.0 if i == j else 0.0 for i in range(nn)]) for j in range(nn)]
    return [[cols[j][i] for j in range(nn)] for i in range(nn)]

def rows_for(idx, style, ties='half'):
    Z = []
    for f in style:
        vals = [F[f][i] for i in idx]; mu = sum(vals) / len(vals); sd = math.sqrt(max(1e-12, sum(x * x for x in vals) / len(vals) - mu * mu)); Z.append((f, mu, sd))
    rows = []
    if not style:
        agg = {}
        for i in idx:
            y = score(O[i])
            if ties == 'drop' and y == 0.5: continue
            agg[(A[i], B[i], y)] = agg.get((A[i], B[i], y), 0) + 1
        for (a, b, y), w in agg.items(): rows.append((a, b, y, w, []))
    else:
        for i in idx:
            y = score(O[i])
            if ties == 'drop' and y == 0.5: continue
            rows.append((A[i], B[i], y, 1, [(F[f][i] - mu) / sd for f, mu, sd in Z]))
    return rows

def fit(rows, k, reg=0.0):
    P = m + k; lam = reg if reg > 0 else 1e-6; x = [0.0] * P
    for it in range(30):
        H = [[0.0] * P for _ in range(P)]; g = [lam * x[t] for t in range(P)]
        for t in range(P): H[t][t] += lam
        for (a, b, y, w, z) in rows:
            s = LN10 * (x[a] - x[b]) + sum(z[q] * x[m + q] for q in range(k))
            pr = 1 / (1 + math.exp(-s)); e = (pr - y) * w; h = pr * (1 - pr) * w
            idx = [a, b] + [m + q for q in range(k)]; val = [LN10, -LN10] + list(z)
            for ai in range(len(idx)):
                g[idx[ai]] += e * val[ai]
                for bi in range(len(idx)): H[idx[ai]][idx[bi]] += h * val[ai] * val[bi]
        d = solve(H, g); x = [x[t] - d[t] for t in range(P)]
        if max(abs(t) for t in d) < 1e-10: break
    Bm = [[0.0] * P for _ in range(P)]
    for (a, b, y, w, z) in rows:
        s = LN10 * (x[a] - x[b]) + sum(z[q] * x[m + q] for q in range(k)); pr = 1 / (1 + math.exp(-s)); e = pr - y
        idx = [a, b] + [m + q for q in range(k)]; val = [LN10, -LN10] + list(z)
        for ai in range(len(idx)):
            for bi in range(len(idx)): Bm[idx[ai]][idx[bi]] += w * e * e * val[ai] * val[bi]
    if not reg > 0:
        for a in range(m):
            for b in range(m): H[a][b] += 1.0
    Hi = inv(H)
    V = [[sum(Hi[i][a] * sum(Bm[a][b] * Hi[b][j] for b in range(P)) for a in range(P)) for j in range(P)] for i in range(P)]
    rm = [sum(V[i][j] for j in range(m)) / m for i in range(m)]; gm = sum(rm) / m
    for i in range(m):
        for j in range(m): V[i][j] = V[i][j] - rm[i] - rm[j] + gm
    return x[:m], x[m:], V

def points(r, mean):
    pts = [400 * t for t in r]; mu = sum(pts) / len(pts); return [t - mu + mean for t in pts]

fits = I('arena2024_fits.json')
full = {r['m']: r for r in fits['boards']['overall']['rows']}
# centre the sample's ratings on the mean of the full-data ratings of the same ten models (plain and style-controlled)
mean_bt = sum(full[mm]['bt'] for mm in S['models']) / m
mean_sc = sum(full[mm]['sc'] for mm in S['models']) / m
allidx = list(range(n))
r0, _, V0 = fit(rows_for(allidx, []), 0)
r1, g1, V1 = fit(rows_for(allidx, [0, 1, 2, 3]), 4, 0.5)
out['lab'] = {'n': n, 'bt': [round(t, 2) for t in points(r0, mean_bt)], 'bt_se': [round(400 * math.sqrt(V0[i][i]), 3) for i in range(m)],
              'sc': [round(t, 2) for t in points(r1, mean_sc)], 'sc_se': [round(400 * math.sqrt(V1[i][i]), 3) for i in range(m)], 'gamma': [round(t, 4) for t in g1],
              'mean_bt': round(mean_bt, 3), 'mean_sc': round(mean_sc, 3)}

# online Elo, FastChat's K = 4, in time order, reversed, and one seeded shuffle (mulberry32 seed 7, as in the page)
def elo(order, K=4):
    R = [1000.0] * m
    for i in order:
        a, b = A[i], B[i]; ea = 1 / (1 + 10 ** ((R[b] - R[a]) / 400)); sa = score(O[i]); R[a] += K * (sa - ea); R[b] -= K * (sa - ea)
    return R
def mulberry(seed):
    a = seed & 0xffffffff
    def imul(x, y): return ((x & 0xffffffff) * (y & 0xffffffff)) & 0xffffffff
    def r():
        nonlocal a
        a = (a + 0x6D2B79F5) & 0xffffffff
        t = imul(a ^ (a >> 15), 1 | a)
        t = ((t + imul(t ^ (t >> 7), 61 | t)) & 0xffffffff) ^ t
        return ((t ^ (t >> 14)) & 0xffffffff) / 4294967296
    return r
def shuffled(nn, seed):
    r = mulberry(seed); o = list(range(nn))
    for i in range(nn - 1, 0, -1):
        j = int(r() * (i + 1)); o[i], o[j] = o[j], o[i]
    return o
for name, order in [('time', list(range(n))), ('rev', list(range(n - 1, -1, -1))), ('shuf', shuffled(n, 7))]:
    out['lab']['elo_' + name] = [round(t, 2) for t in elo(order)]
out['lab']['elo_spread'] = [round(max(out['lab']['elo_' + k][i] for k in ('time', 'rev', 'shuf')) - min(out['lab']['elo_' + k][i] for k in ('time', 'rev', 'shuf')), 2) for i in range(m)]

# ---- rank spreads on the 2 October 2026 board (top 15, stored spreads computed over all 413 models) ----
bd = I('board_2026-10-02.json')
top = bd['cats']['overall']['rows'][:15]
out['board_top15_sc_spread'] = [r['sp']['sc'] for r in top]
out['search_moves'] = {r['m']: round(r['sc'] - r['raw'], 1) for r in bd['search']['rows'][:4]}

# ---- best of N ----
Phi = lambda x: 0.5 * (1 + math.erf(x / math.sqrt(2)))
def emax(N):
    if N <= 1: return 0.0
    s, h, x = 0.0, 0.002, -8.0
    while x <= 8:
        s += x * N * math.exp(-x * x / 2) / math.sqrt(2 * math.pi) * Phi(x) ** (N - 1) * h; x += h
    return s
sig_ref = 10.4 / 1.96  # Claude Sonnet 5.5 (xhigh): plus or minus 10.4 on 3,145 votes
out['bon'] = {'sigma_ref': round(sig_ref, 3), 'emax50': round(emax(50), 4), 'sigma_3000': round(sig_ref * math.sqrt(3145 / 3000), 3),
              'inflation_50_3000': round(sig_ref * math.sqrt(3145 / 3000) * emax(50), 2)}

# ---- preference against capability ----
pv = I('pref_vs_cap.json')['rows']
def ranks(vals):
    o = sorted(range(len(vals)), key=lambda i: vals[i]); r = [0.0] * len(vals); i = 0
    while i < len(o):
        j = i
        while j + 1 < len(o) and vals[o[j + 1]] == vals[o[i]]: j += 1
        for k in range(i, j + 1): r[o[k]] = (i + j) / 2 + 1
        i = j + 1
    return r
def spear(x, y):
    a, b = ranks(x), ranks(y); nn = len(a); ma, mb = sum(a) / nn, sum(b) / nn
    return sum((p - ma) * (q - mb) for p, q in zip(a, b)) / math.sqrt(sum((p - ma) ** 2 for p in a) * sum((q - mb) ** 2 for q in b))
sel = {'all': pv, 'same': [r for r in pv if r['same']], 'frontier': [r for r in pv if r['idx'] >= 40]}
out['pvc'] = {}
for k, rs in sel.items():
    out['pvc'][k] = {'n': len(rs), 'r': round(spear([r['idx'] for r in rs], [r['r'] for r in rs]), 4),
                     'hp': round(spear([r['idx'] for r in rs if r['hp']], [r['hp'] for r in rs if r['hp']]), 4)}

json.dump(out, open(os.path.join(HERE, 'recompute_out.json'), 'w'), indent=1)
print(json.dumps(out, indent=1)[:3000])

# ---- style control on all 2024 votes: positions within the plain top 20 (as the Reading animation shows) ----
for bname in ('overall', 'hard'):
    R = [r for r in fits['boards'][bname]['rows'] if r['bt'] is not None and r['sc'] is not None]
    R = sorted(R, key=lambda r: -r['bt'])[:20]
    pos = {}
    for key in ('bt', 'len', 'sc', 'osc'):
        o = sorted(R, key=lambda r: -(r[key] if r[key] is not None else -1e9))
        for i, r in enumerate(o): pos.setdefault(r['m'], {})[key] = i + 1
    out['style_pos_' + bname] = pos
    out['style_moved3_' + bname] = sum(1 for m_, p_ in pos.items() if abs(p_['bt'] - p_['sc']) >= 3)

# ---- the 3D stages (2026-11-09): the lab sample's win matrix, the Bradley-Terry fit's predictions, and bootstrap refits ----
# Fig. 2 (votes to a rating): battles and scores per pair (ties and both-bad count half, as in the fit), after the first 600 votes and after all 6,000.
bt = out['lab']['bt']
def pairs(upto):
    nb = [[0] * m for _ in range(m)]; sc = [[0.0] * m for _ in range(m)]
    for i in range(upto):
        a, b, y = A[i], B[i], score(O[i]); nb[a][b] += 1; nb[b][a] += 1; sc[a][b] += y; sc[b][a] += 1 - y
    return nb, sc
nb6, sc6 = pairs(n); nb600, sc600 = pairs(600)
pred = [[1 / (1 + 10 ** ((bt[b] - bt[a]) / 400)) if a != b else None for b in range(m)] for a in range(m)]
obs = [[sc6[a][b] / nb6[a][b] if a != b and nb6[a][b] else None for b in range(m)] for a in range(m)]
cnt = [x for a in range(m) for x in nb6[a] if x]
gaps = [(abs(obs[a][b] - pred[a][b]), nb6[a][b]) for a in range(m) for b in range(m) if a < b]
won = [sum(sc6[a]) / sum(nb6[a]) for a in range(m)]
# the first decisive vote, for step 1
fv = next(i for i in range(n) if O[i] in (0, 1))
st = {'nb6': nb6, 'sc6': [[round(x, 1) for x in r] for r in sc6], 'nb600': nb600, 'sc600': [[round(x, 1) for x in r] for r in sc600],
      'pair_min': min(cnt), 'pair_max': max(cnt), 'n_pairs': len(cnt) // 2,
      'pred': [[round(x, 4) if x is not None else None for x in r] for r in pred],
      'gap_mean_w': round(sum(g * w for g, w in gaps) / sum(w for g, w in gaps), 4), 'gap_max': round(max(g for g, w in gaps), 4),
      'won': [round(x, 4) for x in won], 'first': {'i': fv, 'a': A[fv], 'b': B[fv], 'o': O[fv]}}
# Fig. 4 (how sure): 200 bootstrap refits, votes resampled with replacement (mulberry32 seed 12345, the same draws as the Fit the votes tab's bootstrap),
# on all 6,000 votes and on the earliest 1,000; plain Bradley-Terry, ties half, centred like the lab.
def boot(nn, rounds=200):
    r = mulberry(12345); idx = list(range(nn)); R = []
    for _ in range(rounds):
        s = [idx[int(r() * nn)] for _ in idx]; f, _, _ = fit(rows_for(s, []), 0); R.append([round(t, 1) for t in points(f, mean_bt)])
    ci = []
    for i in range(m):
        v = sorted(x[i] for x in R); ci.append([v[int(0.025 * rounds)], v[math.ceil(0.975 * rounds) - 1]])
    rk = [[0] * m for _ in range(m)]
    for x in R:
        for pos, i in enumerate(sorted(range(m), key=lambda j: -x[j])): rk[i][pos] += 1
    sp = []
    for i in range(m):
        b_, w_ = 1, 1
        for j in range(m):
            if j != i and ci[j][0] > ci[i][1]: b_ += 1
            if j != i and ci[j][1] > ci[i][0]: w_ += 1
        sp.append([b_, w_])
    return {'n': nn, 'R': R, 'ci': ci, 'rank': rk, 'spread': sp}
r1k, _, V1k = fit(rows_for(list(range(1000)), []), 0)
st['boot6'] = boot(n); st['boot1'] = boot(1000)
st['bt1000'] = [round(t, 2) for t in points(r1k, mean_bt)]; st['bt1000_se'] = [round(400 * math.sqrt(V1k[i][i]), 3) for i in range(m)]
w6 = [c[1] - c[0] for c in st['boot6']['ci']]; w1 = [c[1] - c[0] for c in st['boot1']['ci']]
st['width_ratio'] = round(sum(w1) / sum(w6), 2)
st['boot_vs_sand'] = round(max(abs((c[1] - c[0]) / 2 - 1.96 * se) for c, se in zip(st['boot6']['ci'], out['lab']['bt_se'])), 2)
out['stage'] = st
json.dump(out, open(os.path.join(HERE, 'recompute_out.json'), 'w'), indent=1)
