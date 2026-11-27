"""Recompute the article's model-free rate of cost decline and test how far it moves.

  python3 src/recompute.py <folder holding the authors' repository at the pinned commit>

The authors' repository (github.com/droodman/inference-cost, commit 9163c17ee7, 2026-09-24) has no licence file, so
its data never enters this repo: download it to scratch, pass the folder here, and this script checks every file it
reads against inputs/manifest.json (sha256) before using it. What it writes, inputs/recompute.json, holds only numbers
derived here: rates, counts, and the record-setting runs per primary benchmark that the page's staircase explorer draws
(date, rescaled accuracy, cost per question rounded to 4 significant figures, a display label). mk_article.py ships it
to the page as window.ARTICLE.recompute.

The method is our Python port of the authors' build_runs (src/prepare_data.R) and pareto_decline_qtr
(src/envelope_frontier.R), read at the pinned commit; their R code is never run. It reproduces every model-free number
of the article's Table 1 to the printed digit (checked below against their out/stair.csv). Pure stdlib plus numpy;
about 1 minute on one core.
"""
import csv, collections, datetime as dt, hashlib, json, math, os, re, sys
from decimal import Decimal, ROUND_HALF_UP
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
MAN = json.load(open(os.path.join(HERE, 'inputs', 'manifest.json'), encoding='utf-8'))
PRIMARY = ['aime', 'chess', 'fm13', 'gpqa', 'mystery']
NAMES = {'aime': 'AIME (OTIS Mock)', 'chess': 'Chess Puzzles', 'fm13': 'FrontierMath, tiers 1-3', 'gpqa': 'GPQA Diamond',
         'mystery': 'Mystery Game Puzzles', 'fm_2025_02_private': 'FrontierMath 2025-02', 'fm_tier4_2025_07_private':
         'FrontierMath, tier 4 (2025-07)', 'fm_tier4_v2': 'FrontierMath, tier 4 v2', 'math_lvl5': 'MATH, level 5',
         'simpleqa': 'SimpleQA Verified', 'swe_bench_verified': 'SWE-bench Verified'}
EPOCH = dt.date(2023, 1, 1)
STEP = 1 / 28  # the authors' time step: 13 days (1/28 of a year)
# Release dates the registry lookup gets wrong (the earliest registry id that starts with the cleaned name wins):
# the model's own registry row gives the date on the right.
FIX = {'o3': '2025-04-16', 'o1': '2024-12-17', 'QwQ-32B': '2025-03-05', 'gemini-2.5-pro': '2025-06-17',
       'gemini-1.5-pro-001': '2024-05-14'}


def q(x, nd=1):
    """round half-up on the decimal repr, so printed numbers do not depend on float rounding"""
    return float(Decimal(repr(float(x))).quantize(Decimal(1).scaleb(-nd), rounding=ROUND_HALF_UP))


def sig(x, n=4):
    return float('%.*g' % (n, x))


def check_files(root):
    for f, h in MAN['files'].items():
        got = hashlib.sha256(open(os.path.join(root, f), 'rb').read()).hexdigest()
        if got != h:
            raise SystemExit('%s: sha256 %s, manifest says %s (not the pinned commit?)' % (f, got, h))


def clean(m):
    m = re.sub(r'^(.*)-maas.*$', r'\1', m)
    return re.sub(r'^(.*)-[0-9]{4}-[0-9]{2}-[0-9]{2}.*$', r'\1', m)


def load(root, keep_row=None, fix_dates=False):
    """build_runs: average rows per (cleaned model, benchmark, effort, budget); release date = earliest registry id that
    starts with the cleaned name; accuracy rescaled from the guessing floor (the mode of the lower half, per benchmark)"""
    R = list(csv.DictReader(open(os.path.join(root, 'data', 'cost_truncated_curves.csv'), encoding='utf-8')))
    if keep_row:
        R = keep_row(R)
    g = collections.OrderedDict()
    for r in R:
        g.setdefault((clean(r['model']), r['benchmark'], r['effort'], float(r['budget'])), []).append(r)
    mv = list(csv.DictReader(open(os.path.join(root, 'data', 'Model versions-Grid view.csv'), encoding='utf-8-sig')))
    reg = [(x['id'].lower(), x['Version release date'], x['Display name'] or x['Model']) for x in mv]

    def rel(m):
        if fix_dates and m in FIX:
            return FIX[m]
        ds = [d for i, d, _ in reg if i.startswith(m.lower()) and d]
        return min(ds) if ds else None
    out = []
    for (m, b, e, bud), rs in g.items():
        def mean(col):
            v = [float(x[col]) for x in rs if x[col] not in ('', 'NA')]
            return sum(v) / len(v) if v else float('nan')
        b2 = {'fm_tiers1_3_v2': 'fm13', 'mystery_agent': 'mystery'}.get(b, b)
        if b2.endswith('_public'):
            continue
        out.append(dict(model=m, benchmark=b2, effort=e, budget=bud, acc=mean('acc'), cost=mean('cost_per_task_usd'),
                        rel=rel(m), src=sorted(set(x['price_source'] for x in rs)),
                        pdate=sorted(set(x['price_date'] for x in rs if x['price_date']))))
    byb = collections.defaultdict(list)
    for r in out:
        byb[r['benchmark']].append(r['acc'])
    floors = {}
    for b, a in byb.items():
        med = float(np.median(a)); lo = [x for x in a if x <= med]
        c = collections.Counter(lo); best = max(c.values())
        floors[b] = min(v for v, k in c.items() if k == best)
    keep = []
    for r in out:
        f = floors[r['benchmark']]
        r['acc'] = (max(f, r['acc']) - f) / (1 - f)
        if r['rel'] is None or not (r['cost'] > 0) or math.isnan(r['acc']):
            continue
        r['t'] = (dt.date.fromisoformat(r['rel']) - EPOCH).days / 365.25
        r['lncost'] = math.log(r['cost'])
        keep.append(r)
    by = collections.defaultdict(list)
    for r in keep:
        by[r['benchmark']].append(r)
    return by, floors


def tgrid(lo, hi):
    return list(np.linspace(lo, hi, max(2, round((hi - lo) / STEP) + 1)))


def rec_fn(runs):
    s = sorted(runs, key=lambda r: r['lncost'])
    T = np.array([r['t'] for r in s]); A = np.array([r['acc'] for r in s]); L = np.array([r['lncost'] for r in s])

    def rec(t, levels):
        el = T <= t + 1e-12
        if not el.any():
            return np.full(len(levels), np.nan)
        m = np.maximum.accumulate(A[el]); lc = L[el]
        i = np.searchsorted(m, levels, side='left')  # first (cheapest) run whose running max reaches the level
        return np.where(i < len(m), lc[np.minimum(i, len(m) - 1)], np.nan)
    return rec


def levels_at(scheme, amin, amax, sota, j):
    if scheme == 'uniform_clip':
        lev = amin + (amax - amin) * j; return lev[lev <= sota]
    if scheme == 'uniform_scale':
        return sota * j
    lo, hi = amin, min(amax, 1 - 1e-9)
    lg = lambda x: math.log(x / (1 - x))
    if scheme == 'logit_clip':
        lev = 1 / (1 + np.exp(-(lg(lo) + (lg(hi) - lg(lo)) * j))); return lev[lev <= sota]
    s2 = min(sota, 1 - 1e-9)
    return 1 / (1 + np.exp(-(lg(lo) + (lg(s2) - lg(lo)) * j)))


def nodes(runs, dtq=0.25, scheme='uniform_clip', n_level=100):
    """every lattice node (t, a, log ratio of record cost dtq years later to now, years since a was first reached)"""
    ts = [r['t'] for r in runs]
    tg = [t for t in tgrid(min(ts), max(ts)) if t + dtq <= max(ts) + 1e-12]
    acc = [r['acc'] for r in runs]
    amax = max(acc); amin = min(a for a in acc if a > 0)
    j = (np.arange(1, n_level + 1) - 0.5) / n_level
    rec = rec_fn(runs)
    first = sorted(runs, key=lambda r: r['t'])
    FT = np.array([r['t'] for r in first]); FM = np.maximum.accumulate(np.array([r['acc'] for r in first]))
    out = []
    for tk in tg:
        sota = max(r['acc'] for r in runs if r['t'] <= tk + 1e-12)
        lev = levels_at(scheme, amin, amax, sota, j)
        if not len(lev):
            continue
        d = rec(tk + dtq, lev) - rec(tk, lev)
        deb = FT[np.minimum(np.searchsorted(FM, lev, side='left'), len(FT) - 1)]  # date each level was first reached
        for a, x, db in zip(lev, d, deb):
            if not math.isnan(x):
                out.append((tk, float(a), float(x), tk - float(db), (a - amin) / (amax - amin)))
    return out


def records(runs):
    """the runs that hold the record cost at some level on some date: no other run is at least as early, as accurate
    and as cheap (strictly better in one)"""
    T = np.array([r['t'] for r in runs]); A = np.array([r['acc'] for r in runs]); C = np.array([r['cost'] for r in runs])
    out = []
    for k, r in enumerate(runs):
        dom = (T <= T[k]) & (A >= A[k]) & (C <= C[k]) & ((T < T[k]) | (A > A[k]) | (C < C[k]))
        if not dom.any():
            out.append(r)
    return out


def one_level(runs, a, dtq=0.25):
    """the explorer's per-level rate: the same quarter-ahead ratio, at one level, over the dates it has been reached"""
    ts = [r['t'] for r in runs]
    rec = rec_fn(runs)
    d = [float((rec(tk + dtq, np.array([a])) - rec(tk, np.array([a])))[0]) for tk in tgrid(min(ts), max(ts)) if tk + dtq <= max(ts) + 1e-12]
    d = [x for x in d if not math.isnan(x)]
    return [q(100 * (1 - math.exp(np.mean(d)))), len(d)] if d else None


def rate(ns, dtq=0.25):
    """the article's statistic: 1 minus the geometric mean of the ratios, per quarter, in percent"""
    if not ns:
        return None
    return 100 * (1 - math.exp(np.mean([n[2] for n in ns]) / (4 * dtq)))


def pooled(rs):
    """the article's pooled 47.0: the five rates averaged geometrically (as ratios), which it calls a simple average;
    the arithmetic mean of the five percentages is 46.8"""
    rs = [r for r in rs if r is not None]
    return 100 * (1 - math.exp(sum(math.log(1 - r / 100) for r in rs) / len(rs)))


def suite(by, **kw):
    return {b: rate(nodes(by[b], **kw), kw.get('dtq', 0.25)) for b in PRIMARY}


def scen(label, note, per, group):
    return {'label': label, 'note': note, 'group': group, 'pooled': q(pooled(per.values())),
            'per': {b: (q(v) if v is not None else None) for b, v in per.items()}}


def main(root):
    check_files(root)
    by, floors = load(root)
    base_nodes = {b: nodes(by[b]) for b in by}
    base = {b: rate(base_nodes[b]) for b in by}
    stair = {r['benchmark']: float(r['decline_pct_qtr']) for r in csv.DictReader(open(os.path.join(root, 'out', 'stair.csv'), encoding='utf-8'))}
    for b, v in base.items():  # the port must reproduce the authors' own output to the last digit we print
        assert q(v) == q(stair[NAMES[b].replace('1-3', '1–3').replace('SWE-bench', 'SWE-Bench')]), b
    P = {b: base[b] for b in PRIMARY}
    out = {'_doc': 'written by src/recompute.py from the authors\' repository at commit %s; derived numbers only' % MAN['commit'],
           'floors': {b: q(v, 4) for b, v in floors.items() if v > 0},
           'base': {b: q(v) for b, v in base.items()},
           'moved': {b: q(100 * float(np.mean([n[2] < 0 for n in base_nodes[b]])), 1) for b in PRIMARY},
           'nodes': {b: len(base_nodes[b]) for b in PRIMARY},
           'pool_arith': q(sum(P.values()) / len(P)),
           'pool_geo': q(100 * (1 - math.exp(np.mean([math.log(1 - v / 100) for v in P.values()]))))}
    out['per_year'] = q(1 / (1 - out['pool_geo'] / 100) ** 4, 2)
    S = [scen('As published', 'our port of the authors\' code, their data and choices', P, 'base')]
    # 1. release dates
    byf, _ = load(root, fix_dates=True)
    S.append(scen('Five dates corrected', 'o3, o1, QwQ-32B, Gemini 2.5 Pro, Gemini 1.5 Pro-001 at their own registry dates', suite(byf), 'data'))
    # 2. price snapshots taken long after release
    def late(R):
        mv = list(csv.DictReader(open(os.path.join(root, 'data', 'Model versions-Grid view.csv'), encoding='utf-8-sig')))
        reg = [(x['id'].lower(), x['Version release date']) for x in mv]
        def rel(m):
            ds = [d for i, d in reg if i.startswith(clean(m).lower()) and d]; return min(ds) if ds else None
        cache = {}
        keep = []
        for r in R:
            m = r['model']
            if m not in cache:
                cache[m] = rel(m)
            if cache[m] and r['price_date'] and (dt.date.fromisoformat(r['price_date']) - dt.date.fromisoformat(cache[m])).days > 180:
                continue
            keep.append(r)
        return keep
    byl, _ = load(root, keep_row=late)
    S.append(scen('Late prices dropped', 'prices snapshotted over 180 days after release removed (a later price cut is otherwise dated to the release)', suite(byl), 'data'))
    byg, _ = load(root, keep_row=lambda R: [r for r in R if 'gpu-effective' not in r['price_source']])
    S.append(scen('GPU prices dropped', 'open-weight models priced at the authors\' own hardware cost', suite(byg), 'data'))
    def full_only(R):
        mx = collections.defaultdict(float)
        for r in R:
            mx[r['run_id']] = max(mx[r['run_id']], float(r['budget']))
        return [r for r in R if float(r['budget']) == mx[r['run_id']]]
    byu, _ = load(root, keep_row=full_only)
    S.append(scen('Untruncated runs only', 'no CAISI budget curve: each run at its full budget', suite(byu), 'data'))
    byc, _ = load(root, keep_row=lambda R: [r for r in late(R) if 'gpu-effective' not in r['price_source']], fix_dates=True)
    S.append(scen('All three data fixes', 'the three data corrections together', suite(byc), 'data'))
    # 3. the averaging choices
    for h, lab in ((0.5, 'Horizon 6 months'), (1.0, 'Horizon 12 months')):
        S.append(scen(lab, 'record cost %s later over now, as a quarterly rate' % ('6 months' if h == 0.5 else '12 months'), suite(by, dtq=h), 'avg'))
    for sc, lab in (('uniform_scale', 'Levels scaled to SOTA'), ('logit_clip', 'Logit levels, clipped'), ('logit_scale', 'Logit levels, scaled')):
        S.append(scen(lab, 'the article\'s Figure 7 alternatives', suite(by, scheme=sc), 'avg'))
    for k, (lo, hi, lab) in enumerate(((0, 1 / 3, 'Bottom third of scores'), (1 / 3, 2 / 3, 'Middle third of scores'), (2 / 3, 1.01, 'Top third of scores'))):
        per = {b: rate([n for n in base_nodes[b] if lo <= n[4] < hi]) for b in PRIMARY}
        S.append(scen(lab, 'only lattice levels in this third of the benchmark\'s accuracy range', per, 'level'))
    out['schemes_gpqa'] = {sc: q(rate(nodes(by['gpqa'], scheme=sc))) for sc in ('uniform_clip', 'uniform_scale', 'logit_clip', 'logit_scale')}
    # 4. leave one model out (only models that ever hold a record can move the rate)
    holders = collections.defaultdict(set)
    for b in PRIMARY:
        for r in records(by[b]):
            holders[r['model']].add(b)
    loo = []
    for m, bs in sorted(holders.items()):
        per = dict(P)
        for b in bs:
            per[b] = rate(nodes([r for r in by[b] if r['model'] != m]))
        loo.append((pooled(per.values()), m))
    loo.sort()
    out['loo'] = {'n_models': len(loo), 'lo': [q(loo[0][0]), loo[0][1]], 'hi': [q(loo[-1][0]), loo[-1][1]],
                  'within1': sum(1 for v, _ in loo if abs(v - out['pool_geo']) <= 1.0)}
    S.append({'label': 'Leave one model out', 'note': 'range over the %d models that ever hold a record' % len(loo), 'group': 'loo',
              'pooled': q(out['pool_geo']), 'lo': q(loo[0][0]), 'hi': q(loo[-1][0]), 'per': {}})
    out['scen'] = S
    # 5. a model-free test of "fastest right after SOTA debut": nodes binned by quarters since the level was first reached
    bins = list(range(9))
    age = {}
    for b in PRIMARY:
        row = []
        for k in bins:
            ns = [n for n in base_nodes[b] if (k <= n[3] / 0.25 < k + 1 if k < 8 else n[3] / 0.25 >= 8)]
            row.append([q(rate(ns)) if len(ns) >= 30 else None, len(ns)])
        age[b] = row
    out['age'] = age
    out['age_pool'] = [q(pooled([age[b][k][0] for b in PRIMARY])) if any(age[b][k][0] is not None for b in PRIMARY) else None for k in bins]
    out['age_pool_n'] = [sum(1 for b in PRIMARY if age[b][k][0] is not None) for k in bins]
    # 6. the article's example: GPQA, 75% of the way from guessing to perfect
    g = by['gpqa']
    def cheapest(rs, a, t):
        c = [r for r in rs if r['acc'] >= a and r['t'] <= t]
        return min(c, key=lambda r: r['cost']) if c else None
    first = min((r for r in g if r['acc'] >= 0.75), key=lambda r: (r['t'], r['cost']))
    last = cheapest(g, 0.75, max(r['t'] for r in g))
    months = (last['t'] - first['t']) * 12
    fixed_first = min((r for r in byf['gpqa'] if r['acc'] >= 0.75), key=lambda r: (r['t'], r['cost']))
    out['example'] = {'first': [first['model'], first['effort'], first['rel'], sig(first['cost'])],
                      'last': [last['model'], last['effort'], last['rel'], sig(last['cost'])],
                      'fold': q(first['cost'] / last['cost'], 0), 'months': q(months, 1),
                      'per_year': q((first['cost'] / last['cost']) ** (12 / months), 0),
                      'months_fixed': q((last['t'] - fixed_first['t']) * 12, 1), 'first_fixed': [fixed_first['model'], fixed_first['effort'], fixed_first['rel'], sig(fixed_first['cost'])],
                      'per_year_fixed': q((fixed_first['cost'] / last['cost']) ** (12 / ((last['t'] - fixed_first['t']) * 12)), 0)}
    # 7. technology comparison (the article's Figure 1 data: log points per quarter)
    rows = list(csv.reader(open(os.path.join(root, 'out', 'fig1.csv'), encoding='latin-1')))
    tech = {}
    for r in rows[1:8]:
        if r and r[6].endswith('%'):
            tech[r[0]] = [float(r[6][:-1]), r[7], r[8]]
    out['tech'] = {k: {'lp': v[0], 'printed_multiple': v[1], 'per_year': v[2], 'multiple': q(tech['LLM inference'][0] / v[0], 1)} for k, v in tech.items()}
    # 8. the staircase explorer's data: every run that is a record at some level on some date, under either date set
    exp = {}
    for b in PRIMARY:
        pts = {}
        for dset, src in (('a', by[b]), ('f', byf[b])):
            for r in records(src):
                if True:
                    pts.setdefault((r['model'], r['effort'], r['budget']), {})[dset] = r
        rows, seen = [], set()
        for (m, e, bud), d in sorted(pts.items(), key=lambda kv: (list(kv[1].values())[0]['t'], list(kv[1].values())[0]['cost'])):
            r = list(d.values())[0]
            ra = next((x for x in by[b] if (x['model'], x['effort'], x['budget']) == (m, e, bud)))
            rf = next((x for x in byf[b] if (x['model'], x['effort'], x['budget']) == (m, e, bud)))
            lab = m + ('' if e in ('default', '', 'unknown') else ' (%s)' % e)
            row = [lab, (dt.date.fromisoformat(ra['rel']) - EPOCH).days, (dt.date.fromisoformat(rf['rel']) - EPOCH).days,
                   q(r['acc'], 4), sig(r['cost'])]
            if tuple(row) not in seen:  # budgets past where a run stopped thinking repeat the same point
                seen.add(tuple(row)); rows.append(row)
        tmax = max(x['t'] for x in by[b])
        ts = [x['t'] for x in by[b]]
        exp[b] = {'name': NAMES[b], 'pts': rows, 'd0': round(min(ts) * 365.25), 'd1': round(max(ts) * 365.25), 'floor': q(floors[b], 4),
                  'check': {str(a): one_level(by[b], a) for a in (0.25, 0.5, 0.75)}}
    out['explorer'] = exp
    json.dump(out, open(os.path.join(HERE, 'inputs', 'recompute.json'), 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
    print(json.dumps({k: v for k, v in out.items() if k not in ('explorer', 'scen', 'age')}, indent=0))
    for s in S:
        print('%-48s %5.1f %s' % (s['label'], s['pooled'], s['per'] if s['per'] else (s['lo'], s['hi'])))
    print('age pooled', out['age_pool'], out['age_pool_n'])
    for b in PRIMARY:
        print(b, age[b])
    print({b: len(exp[b]['pts']) for b in exp})


if __name__ == '__main__':
    if len(sys.argv) != 2:
        raise SystemExit(__doc__)
    main(sys.argv[1])
