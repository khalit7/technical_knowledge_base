"""Recompute every number the page derives, from inputs/ only (stdlib). Writes recompute.json; check_page.mjs
compares the page's JavaScript (window.HE_CHECK) against it.  Run: python3 recompute.py"""
import collections, itertools, json, math, os

HERE = os.path.dirname(os.path.abspath(__file__))
A = json.load(open(os.path.join(HERE, 'inputs', 'agree.json')))
AU = json.load(open(os.path.join(HERE, 'inputs', 'audit.json')))
NC = json.load(open(os.path.join(HERE, 'inputs', 'northcutt.json')))
out = {}
r4 = lambda x: round(x, 4)


# ---------- agreement statistics from a coincidence matrix (Krippendorff) and a pair matrix
def stats(co, pairs, kind):
    """co: coincidence matrix (each unit's ordered pairs weighted 1/(m-1)); pairs: unweighted symmetric pair counts.
    kind: 'cat' (nominal only meaningful) or 'ord' (values 0..k-1 are ordered and equally spaced)."""
    k = len(co); nc = [sum(r) for r in co]; n = sum(nc)
    def alpha(d):
        Do = sum(co[c][j] * d(c, j) for c in range(k) for j in range(k)) / n
        De = sum(nc[c] * nc[j] * d(c, j) for c in range(k) for j in range(k)) / (n * (n - 1))
        return 1 - Do / De
    nom = lambda c, j: 0 if c == j else 1
    itv = lambda c, j: (c - j) ** 2
    def ordd(c, j):
        lo, hi = min(c, j), max(c, j)
        s = sum(nc[g] for g in range(lo, hi + 1)) - (nc[c] + nc[j]) / 2
        return s * s
    P = sum(map(sum, pairs)) / 2  # number of rater pairs
    po = sum(pairs[c][c] for c in range(k)) / 2 / P
    pi = [x / n for x in nc]  # pooled label shares (coincidence margins equal vote shares for pairable units)
    pe = sum(x * x for x in pi)
    q = sum(1 for x in nc if x > 0)
    pe_g = sum(x * (1 - x) for x in pi) / (q - 1)
    res = {'pairs': int(P), 'votes': r4(n), 'po': r4(po), 'shares': [r4(x) for x in pi], 'pe': r4(pe),
           'kappa_fleiss': r4((po - pe) / (1 - pe)), 'ac1': r4((po - pe_g) / (1 - pe_g)), 'pe_ac1': r4(pe_g),
           'alpha_nominal': r4(alpha(nom)), 'Do_nom': r4(sum(co[c][j] for c in range(k) for j in range(k) if c != j) / n)}
    if kind == 'ord':
        res['alpha_ordinal'] = r4(alpha(ordd)); res['alpha_interval'] = r4(alpha(itv))
        w1 = sum(pairs[c][j] for c in range(k) for j in range(k) if abs(c - j) <= 1) / 2 / P
        res['within1'] = r4(w1)
    return res


def mats(units, cats):
    k = len(cats); idx = {c: i for i, c in enumerate(cats)}
    co = [[0.0] * k for _ in range(k)]; pr = [[0] * k for _ in range(k)]
    for u in units:
        v = [idx[x] for x in u]; m = len(v)
        if m < 2: continue
        for i, j in itertools.permutations(range(m), 2): co[v[i]][v[j]] += 1 / (m - 1)
        for i, j in itertools.combinations(range(m), 2): pr[v[i]][v[j]] += 1; pr[v[j]][v[i]] += 1
    return co, pr


mt = {}
for t in ('t1', 't2'):
    U = A['mtb'][t]
    co, pr = mats(U, 'ATB')          # A, Tie, B: Tie placed between, so "ordinal" reads tie as halfway
    s = stats(co, pr, 'ord'); s['units'] = len(U)
    nt = [u.replace('T', '') for u in U]; nt = [u for u in nt if len(u) >= 2]
    co2, pr2 = mats(nt, 'AB'); s2 = stats(co2, pr2, 'cat'); s2['units'] = len(nt)
    mt[t] = {'ties': s, 'noties': s2}
out['mtb'] = mt
out['mtb_table5_published'] = {'t1': {'ties': [63, 721], 'noties': [81, 479]}, 't2': {'ties': [67, 707], 'noties': [82, 474]},
                               'source': 'Zheng et al. 2023, arXiv:2306.05685, Table 5 (H vs H, expert votes)'}

hs = {}
for att in ['helpfulness', 'correctness', 'coherence', 'complexity', 'verbosity']:
    hs[att] = {}
    for f in ('all', 'kept'):
        m = A['hs2'][att][f]; s = stats(m['co'], m['pairs'], 'ord'); s['units'] = m['units']
        hs[att][f] = s
out['hs2'] = hs
out['hs2_paper_table1'] = {'helpfulness': [0.465, 0.706, 0.791], 'correctness': [0.472, 0.715, 0.793], 'coherence': [0.169, 0.387, 0.428],
                           'complexity': [0.293, 0.416, 0.427], 'verbosity': [0.342, 0.536, 0.548],
                           'cols': ['initial collection', 'after improvements', 'post-processing'],
                           'source': 'Wang et al. 2024, HelpSteer2, arXiv:2406.08673, Table 1 (quadratic weighted Cohen kappa)'}


# ---------- gold-label audit on MMLU-Redux subjects
def rank_desc(vals):  # competition ranking, 1 = best ("1224")
    return [1 + sum(1 for w in vals if w > v + 1e-12) for v in vals]


def spearman(a, b):
    def avg_rank(v):
        o = sorted(range(len(v)), key=lambda i: -v[i]); r = [0.0] * len(v); i = 0
        while i < len(o):
            j = i
            while j + 1 < len(o) and abs(v[o[j + 1]] - v[o[i]]) < 1e-12: j += 1
            for x in range(i, j + 1): r[o[x]] = (i + j) / 2 + 1
            i = j + 1
        return r
    ra, rb = avg_rank(a), avg_rank(b); n = len(a); ma = sum(ra) / n; mb = sum(rb) / n
    num = sum((x - ma) * (y - mb) for x, y in zip(ra, rb))
    return num / math.sqrt(sum((x - ma) ** 2 for x in ra) * sum((y - mb) ** 2 for y in rb))


M = AU['models']; aud = {}
for s, d in AU['subjects'].items():
    it = d['items']; n = len(it)
    ok = [i for i, x in enumerate(it) if x['t'] == 'o']
    fix = [i for i, x in enumerate(it) if x['t'] == 'o' or (x['t'] == 'w' and x['c'] >= 0)]
    gold_fix = lambda i: it[i]['k'] if it[i]['t'] == 'o' else it[i]['c']
    orig = [sum(int(x['p'][mi]) == x['k'] for x in it) / n for mi in range(len(M))]
    clean = [sum(int(it[i]['p'][mi]) == it[i]['k'] for i in ok) / len(ok) for mi in range(len(M))]
    corr = [sum(int(it[i]['p'][mi]) == gold_fix(i) for i in fix) / len(fix) for mi in range(len(M))]
    err = [x['t'] != 'o' for x in it]; wg = [x['t'] == 'w' for x in it]
    sc_self = [x['mp'][x['k']] for x in it]
    sc_marg = [x['mp'][x['k']] - max(p for j, p in enumerate(x['mp']) if j != x['k']) for x in it]
    def votes(x):
        c = collections.Counter(int(ch) for ch in x['p']); return max([c[j] for j in range(4) if j != x['k']] + [0])
    sc_vote = [-votes(x) for x in it]  # more models agreeing on one non-key option = more suspicious
    curves = {}
    for nm, sc in (('self', sc_self), ('margin', sc_marg), ('votes', sc_vote)):
        o = sorted(range(n), key=lambda i: (sc[i], i))  # ascending: most suspicious first; ties by item order
        cum_e = list(itertools.accumulate(int(err[i]) for i in o)); cum_w = list(itertools.accumulate(int(wg[i]) for i in o))
        curves[nm] = {'err': cum_e, 'wrong': cum_w}
    aud[s] = {'n': n, 'n_ok': len(ok), 'n_fix': len(fix), 'errors': sum(err), 'wrong_key': sum(wg),
              'acc_orig': [r4(x) for x in orig], 'acc_clean': [r4(x) for x in clean], 'acc_corr': [r4(x) for x in corr],
              'rank_orig': rank_desc(orig), 'rank_clean': rank_desc(clean), 'rank_corr': rank_desc(corr),
              'spearman_orig_clean': r4(spearman(orig, clean)), 'spearman_orig_corr': r4(spearman(orig, corr)),
              'found_at': {nm: {str(k): [c['err'][k - 1], c['wrong'][k - 1]] for k in (10, 20, 30, 50) if k <= n} for nm, c in curves.items()},
              'curves': curves,
              'wrong_key_agree': {'old': [sum(int(it[i]['p'][mi]) == it[i]['k'] for i in range(n) if wg[i]) for mi in range(len(M))],
                                  'new': [sum(int(it[i]['p'][mi]) == it[i]['c'] for i in range(n) if wg[i]) for mi in range(len(M))]}}
out['audit'] = aud
out['audit_models'] = M

# ---------- Northcutt Table S1: ranks recomputed from the printed accuracies
S1 = NC['s1']
r1 = rank_desc([r['acc1'] for r in S1]); c1 = rank_desc([r['cacc1'] for r in S1])
out['northcutt'] = {'rank_match': sum(a == r['rank1'] for a, r in zip(r1, S1)), 'crank_match': sum(a == r['crank1'] for a, r in zip(c1, S1)),
                    'n': len(S1), 'spearman': r4(spearman([r['acc1'] for r in S1], [r['cacc1'] for r in S1])),
                    'mismatch_rank': [(r['model'], r['platform'], a, r['rank1']) for a, r in zip(r1, S1) if a != r['rank1']],
                    'mismatch_crank': [(r['model'], r['platform'], a, r['crank1']) for a, r in zip(c1, S1) if a != r['crank1']],
                    'avg_error_pct_table1': r4(sum(x[4] for x in NC['table1']) / len(NC['table1']))}

# ---------- derived figures quoted in the prose
out['derived'] = {
    'redux_flagged_pct': r4(100 * 370 / 5700), 'redux_wrong_key_pct': r4(100 * 106 / 5700),
    'gsm8k_platinum_removed_or_relabelled_pct': r4(100 * 120 / 1319), 'gsm8k_platinum_relabelled_pct': r4(100 * 10 / 1319),
    'platinumbench_gsm8k_bad_or_mislabeled_pct': r4(100 * 27 / 300), 'platinumbench_gsm8k_mislabeled_pct': r4(100 * 1 / 300),
    'platinumbench_table4_over_half': sum(1 for x in [90, 93, 89, 77, 48, 5, 0, 24, 0, 75, 91, 82, 77, 10] if x > 50),
    'northcutt_imagenet_pct': r4(100 * 2916 / 50000),
    'mtb_t1_votes_per_unit': r4(sum(len(u) for u in A['mtb']['t1']) / len(A['mtb']['t1'])),
}


# ---------- illustrative prevalence paradox (two raters, binary, 100 items, both rate "pass" at the same rate)
def kappa2(a, b, c, d):
    n = a + b + c + d; po = (a + d) / n; p1 = (a + b) / n; p2 = (a + c) / n
    pe = p1 * p2 + (1 - p1) * (1 - p2); pg = ((p1 + p2) / 2) * (1 - (p1 + p2) / 2) * 2
    return r4(po), r4((po - pe) / (1 - pe)), r4((po - pg) / (1 - pg))


out['paradox'] = {'balanced_45_5_5_45': kappa2(45, 5, 5, 45), 'skewed_85_5_5_5': kappa2(85, 5, 5, 5), 'root_example_always_pass': None}
json.dump(out, open(os.path.join(HERE, 'recompute.json'), 'w'), indent=1)

v = aud['virology']
print('MT-Bench t1', mt['t1']['ties']['po'], mt['t1']['ties']['kappa_fleiss'], mt['t1']['ties']['alpha_nominal'], mt['t1']['ties']['alpha_ordinal'],
      '| no ties', mt['t1']['noties']['po'], mt['t1']['noties']['alpha_nominal'], mt['t1']['ties']['pairs'], mt['t1']['noties']['pairs'])
print('MT-Bench t2', mt['t2']['ties']['po'], mt['t2']['noties']['po'])
for a in hs: print('HS2', a, hs[a]['all']['po'], hs[a]['all']['alpha_interval'], hs[a]['kept']['alpha_interval'], 'AC1', hs[a]['all']['ac1'])
print('virology ranks', list(zip(M, v['rank_orig'], v['rank_corr'])))
print('found@20', {s: aud[s]['found_at']['self'].get('20') for s in aud}, 'errors', {s: aud[s]['errors'] for s in aud})
print('northcutt', out['northcutt'])
print('derived', out['derived'], out['paradox'])
