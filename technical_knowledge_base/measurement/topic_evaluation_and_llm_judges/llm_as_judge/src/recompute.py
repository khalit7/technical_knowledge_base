"""Independent recomputation of every number the page's JavaScript derives from inputs/mtbench_votes.json,
plus the published figures they are checked against. Writes recompute.json; check_page.mjs compares the page with it.
Usage: python3 src/recompute.py
"""
import json, math, os

HERE = os.path.dirname(os.path.abspath(__file__))
D = json.load(open(os.path.join(HERE, 'inputs', 'mtbench_votes.json')))
K, V, W, M = D['keys'], D['votes'], D['voters'], D['models']


def jv(k, p):
    q, t, i, j, P, Pinc, sa, sb, f, s, la, lb = k
    if p == 'P': return None if P < 0 else P
    if p == 'S': return None if sa < 0 else (2 if sa == sb else (0 if sa > sb else 1))
    if p == 'F': return None if f < 0 else f
    if p == 'B': return None if s < 0 else s
    if p == 'FB': return None if f < 0 else (f if f == s else 2)


def in_scope(k, sc):
    if sc == 'nov': return k[6] >= 0
    if sc == 'g35': return k[8] >= 0 and k[6] >= 0
    return True


def keep(k, w, o):
    if o.get('experts') and W[w] != 'e': return False
    if o.get('turn') and k[1] != o['turn']: return False
    if not in_scope(k, o.get('scope', 'all')): return False
    if o.get('excl') and (k[2] == 0 or k[3] == 0): return False
    return True


def kappa(cm):
    N = sum(map(sum, cm)); a = sum(cm[r][r] for r in range(3))
    pe = sum(sum(cm[r]) * sum(cm[c][r] for c in range(3)) for r in range(3)) / N / N
    return (a / N - pe) / (1 - pe)


def agree(p, o):
    cm = [[0] * 3 for _ in range(3)]; n = a = jt = 0
    for ki, h, w in V:
        k = K[ki]
        if not keep(k, w, o): continue
        v = jv(k, p)
        if v is None: continue
        if o.get('noties') and (h == 2 or v == 2): continue
        n += 1; a += h == v; jt += v == 2; cm[h][v] += 1
    return {'n': n, 'agree': round(100 * a / n, 2), 'kappa': round(kappa(cm), 4), 'ties': round(100 * jt / n, 2)}


def humans(o):
    by = {}
    for ki, h, w in V:
        if keep(K[ki], w, o): by.setdefault(ki, []).append((w, h))
    n = a = 0
    for L in by.values():
        for x in range(len(L)):
            for y in range(x + 1, len(L)):
                if L[x][0] == L[y][0]: continue
                if o.get('noties') and 2 in (L[x][1], L[y][1]): continue
                n += 1; a += L[x][1] == L[y][1]
    return {'n': n, 'agree': round(100 * a / n, 2)}


out = {}
# 1. Zheng et al. Table 5, reproduced from the released files: expert votes only, all 15 pairs, per turn
t5 = {}
for turn in (1, 2):
    for S, nt in (('S1', False), ('S2', True)):
        o = {'scope': 'all', 'experts': True, 'turn': turn, 'noties': nt}
        t5['t%d_%s' % (turn, S)] = {'g4pair_vs_human': agree('P', o), 'human_vs_human': humans(o)}
out['table5_repro'] = t5
out['table5_published'] = {'t1_S1': [66, 1343, 63, 721], 't1_S2': [85, 859, 81, 479], 't2_S1': [66, 1325, 67, 707], 't2_S2': [85, 864, 82, 474]}

# 2. Protocol lab defaults: scope g35, all voters, both turns
lab = {}
for sc in ('all', 'nov', 'g35'):
    for nt in (False, True):
        for ex in (False, True):
            o = {'scope': sc, 'noties': nt, 'excl': ex}
            row = {}
            for p in ('F', 'B', 'FB', 'P', 'S'):
                try: row[p] = agree(p, o)
                except ZeroDivisionError: pass
            row['humans'] = humans(o)
            lab['%s_%s_%s' % (sc, 'S2' if nt else 'S1', 'noG4' if ex else 'all')] = row
out['lab'] = lab

# 3. list level vs instance level (released run P, all voters, all pairs)
def win_rates(p, o):
    wh = [0] * 6; gh = [0] * 6; wj = [0] * 6; gj = [0] * 6
    for ki, h, w in V:
        k = K[ki]
        if not keep(k, w, o): continue
        v = jv(k, p)
        if v is None: continue
        if h != 2: gh[k[2]] += 1; gh[k[3]] += 1; wh[k[2] if h == 0 else k[3]] += 1
        if v != 2: gj[k[2]] += 1; gj[k[3]] += 1; wj[k[2] if v == 0 else k[3]] += 1
    return [(m, wh[m] / gh[m], wj[m] / gj[m]) for m in range(6) if gh[m] and gj[m]]


def ranks(xs):
    idx = sorted(range(len(xs)), key=lambda i: -xs[i]); r = [0] * len(xs); i = 0
    while i < len(idx):
        j = i
        while j + 1 < len(idx) and xs[idx[j + 1]] == xs[idx[i]]: j += 1
        for k in range(i, j + 1): r[idx[k]] = (i + j) / 2 + 1
        i = j + 1
    return r


def spearman(a, b):
    ra, rb = ranks(a), ranks(b); n = len(a); ma = sum(ra) / n; mb = sum(rb) / n
    sab = sum((x - ma) * (y - mb) for x, y in zip(ra, rb))
    return sab / math.sqrt(sum((x - ma) ** 2 for x in ra) * sum((y - mb) ** 2 for y in rb))


for p, sc in (('P', 'all'), ('S', 'nov')):
    wr = win_rates(p, {'scope': sc})
    out['list_%s_%s' % (p, sc)] = {'win_rates': {M[m]: [round(100 * h, 2), round(100 * j, 2)] for m, h, j in wr},
                                  'spearman': round(spearman([h for _, h, _ in wr], [j for _, _, j in wr]), 4),
                                  'instance_S1': agree(p, {'scope': sc})['agree']}


# 4. calibration: same PRNG and draw as the page
def mulberry32(seed):
    a = seed & 0xffffffff
    def r():
        nonlocal a
        a = (a + 0x6D2B79F5) & 0xffffffff
        t = a
        t = ((t ^ (t >> 15)) * (t | 1)) & 0xffffffff
        t ^= (t + (((t ^ (t >> 7)) * (t | 61)) & 0xffffffff)) & 0xffffffff
        return ((t ^ (t >> 14)) & 0xffffffff) / 4294967296
    return r


def draw(n, m, seed):
    r = mulberry32(seed); a = list(range(n))
    for i in range(m):
        j = i + int(r() * (n - i)); a[i], a[j] = a[j], a[i]
    return a[:m]


def items(t, p):
    out_ = []
    for ki, h, w in V:
        k = K[ki]
        if t not in (k[2], k[3]) or h == 2: continue
        v = jv(k, p)
        if v is None: continue
        me = 0 if k[2] == t else 1
        out_.append((1 if h == me else 0, 1 if v == me else 0))
    return out_


def correct(p, n, m0, m1, q0, q1):
    z = 1.96; z2 = z * z
    if q0 + q1 - 1 <= 0: return None, None, None
    est = (p + q0 - 1) / (q0 + q1 - 1)
    nt, m0t, m1t = n + z2, m0 + 2, m1 + 2
    pt = (n * p + z2 / 2) / (n + z2); q0t = (m0 * q0 + 1) / (m0 + 2); q1t = (m1 * q1 + 1) / (m1 + 2); den = q0t + q1t - 1
    if den <= 0: return est, None, None
    tt = (pt + q0t - 1) / den
    dt = 2 * z2 * (-(1 - tt) * q0t * (1 - q0t) / m0t + tt * q1t * (1 - q1t) / m1t)
    se = math.sqrt(pt * (1 - pt) / nt + (1 - tt) ** 2 * q0t * (1 - q0t) / m0t + tt * tt * q1t * (1 - q1t) / m1t) / den
    c = tt + dt
    return est, max(0, c - z * se), min(1, c + z * se)


def calib(I, m, seed):
    n = len(I); g = draw(n, m, seed); tp = fn = fp = tn = 0
    for i in g:
        z, zh = I[i]
        if z and zh: tp += 1
        elif z: fn += 1
        elif zh: fp += 1
        else: tn += 1
    p = sum(x[1] for x in I) / n; th = sum(x[0] for x in I) / n
    m1, m0 = tp + fn, fp + tn
    if not m1 or not m0: return dict(tp=tp, fn=fn, fp=fp, tn=tn, p=p, th=th, est=None, lo=None, hi=None)
    est, lo, hi = correct(p, n, m0, m1, tn / m0, tp / m1)
    return dict(tp=tp, fn=fn, fp=fp, tn=tn, p=p, th=th, est=est, lo=lo, hi=hi)


cal = {}
for t in range(6):
    for p in ('P', 'S'):
        I = items(t, p)
        if not I: continue
        th = sum(x[0] for x in I) / len(I); pr = sum(x[1] for x in I) / len(I)
        pos = sum(x[0] for x in I); q1 = sum(1 for z, zh in I if z and zh) / pos if pos else None
        q0 = sum(1 for z, zh in I if not z and not zh) / (len(I) - pos)
        one = calib(I, 100, 1)
        # 200 draws of a 100-item gold slice (seeds 1..200): coverage and spread, as the lab's "Run 200 draws"
        cov = ok = 0; ests = []
        for s in range(1, 201):
            c = calib(I, 100, s)
            if c['est'] is None or c['lo'] is None: continue
            ok += 1; cov += c['lo'] <= th <= c['hi']; ests.append(c['est'])
        mean = sum(ests) / len(ests) if ests else None
        sd = math.sqrt(sum((e - mean) ** 2 for e in ests) / len(ests)) if ests else None
        cal['%s_%s' % (M[t], p)] = {'n': len(I), 'theta': round(100 * th, 2), 'raw': round(100 * pr, 2),
                                     'q1': None if q1 is None else round(q1, 4), 'q0': round(q0, 4),
                                     'seed1_m100': {k: (round(v, 4) if isinstance(v, float) else v) for k, v in one.items()},
                                     'draws200': {'usable': ok, 'covered': cov, 'mean_est': None if mean is None else round(100 * mean, 2),
                                                  'sd_est': None if sd is None else round(100 * sd, 2)}}
out['calibration'] = cal

# 5. published figures quoted on the page that are arithmetic on other published figures
out['derived'] = {
    'cohere_margin_over_deepl': round(83.6 - 81.37, 2), 'cohere_margin_over_qwen': round(83.6 - 81.56, 2),
    'rocketeval_cost_ratio': round(3400 / 27.70, 1),
    'poll_kappa_gain': round(0.763 - 0.627, 3),
    'calm_mean_robustness': None,
}
calm = [l.rstrip('\n').split('\t') for l in open(os.path.join(HERE, 'inputs', 'calm_table4.tsv')) if not l.startswith('#')]
hdr, rows = calm[0], calm[1:]
out['derived']['calm_mean_robustness'] = {r[0]: round(sum(float(r[hdr.index(c)]) for c in ('Ver.', 'Fal.', 'Sen.', 'Pos.', 'Com.', 'Ban.', 'Aut.', 'Dst.', 'Div.')) / 9, 3) for r in rows}
ks = [k for k in K if k[8] >= 0]
out['runs_differ'] = {'keys': len(ks), 'differ': sum(1 for k in ks if (k[8] if k[8] == k[9] else 2) != k[4])}
json.dump(out, open(os.path.join(HERE, 'recompute.json'), 'w'), indent=1)
print(json.dumps(out['table5_repro'], indent=0)[:900])
print(json.dumps(out['lab']['g35_S1_all'], indent=0))
print(json.dumps({k: (v['theta'], v['raw'], v['q1'], v['q0'], v['seed1_m100']['est'], v['draws200']) for k, v in cal.items()}, indent=0))
print(out['list_P_all'], out['derived'])
