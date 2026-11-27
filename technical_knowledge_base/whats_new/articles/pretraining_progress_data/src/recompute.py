"""Recompute every number this page derives from "Pretraining progress is mostly coming from data" (Patel and Han).

  python3 src/recompute.py        (from the page folder; writes src/inputs/recompute.json and parts/22_js_pd_data.js)

Inputs: the authors' own numbers, the data behind the post's seven Datawrapper charts (dataset.csv of each chart,
fetched 27 November 2026; the embedded versions and their latest versions hold identical data), saved in src/inputs/:
  corners_TrYq2.csv          OLMES score against compute for the four corners (2019 or 2025 recipe x 2019 or 2025 data),
                             mean and mean +- 1 sd over seeds ("at least 3 seeds each", footnote 6)
  models_on_fwedu_djBI7.csv  seven recipes, all trained on FineWeb-Edu (the chart's title)
  data_on_olmo2_lm6Jz.csv    seven corpora, all trained with the OLMo-2 recipe (the chart's title)
  model_table_CzRR5.csv, data_table_k03qL.csv   the two tables of multipliers at 1e19
  grid_KNa3I.csv             the 7 x 7 grid at 3.16e18 FLOPs (one seed per cell, footnote 6), OLMES points over 2019/2019
  residuals_Cnl63.csv        the additive fit's residuals, in thousandths of accuracy

The multiplier rule is the post's ("How compute multipliers were calculated"): take the reference curve's score at a
reference compute; find where the candidate curve first reaches that score; the multiplier is reference compute over
that compute. Between measured budgets the curve is taken as linear in log10(compute): the post does not say how it
interpolates, and this rule reproduces its 3.7x, 12.0x and the model table to the printed precision.
"""
import csv, json, math, os, random
from decimal import Decimal, ROUND_HALF_UP

HERE = os.path.dirname(os.path.abspath(__file__))
IN = os.path.join(HERE, 'inputs')
C = [1e17, 3.16e17, 1e18, 3.16e18, 1e19]
LC = [math.log10(c) for c in C]


def q(x, p='0.01'):
    return float(Decimal(repr(x)).quantize(Decimal(p), rounding=ROUND_HALF_UP))


def curves(fn):
    rows = list(csv.reader(open(os.path.join(IN, fn), encoding='utf-8')))
    head, out = rows[0], {}
    for j, name in enumerate(head):
        if j == 0 or name.endswith(' sd'):
            continue
        m = [float(r[j]) for r in rows[1:]]
        lo = [float(r[j + 1]) for r in rows[1:]]
        hi = [float(r[j + 2]) for r in rows[1:]]
        out[name] = {'m': m, 'sd': [(h - l) / 2 for l, h in zip(lo, hi)]}
    return out


def first_reach(m, level):
    """log10 compute where the curve m (on C) first reaches level, linear in log10 C; None if it never does"""
    if m[0] >= level:
        return None  # already above at the smallest budget: would need extrapolation below 1e17
    for i in range(1, len(m)):
        if m[i] >= level:
            f = (level - m[i - 1]) / (m[i] - m[i - 1])
            return LC[i - 1] + f * (LC[i] - LC[i - 1])
    return None


def mult(ref, cand, at=4):
    """compute multiplier of cand over ref, at ref's score at budget index at"""
    x = first_reach(cand, ref[at])
    return None if x is None else 10 ** (LC[at] - x)


def mult_level(ref, cand, level):
    a, b = first_reach(ref, level), first_reach(cand, level)
    return None if a is None or b is None else 10 ** (a - b)


R = {}
K = curves('corners_TrYq2.csv')
OO, MO, OD, MD = (K[k]['m'] for k in ('2019 model, 2019 data', '2025 model, 2019 data', '2019 model, 2025 data', '2025 model, 2025 data'))

# 1. the headline: each corner against 2019/2019 at 1e19
model, data, both = mult(OO, MO), mult(OO, OD), mult(OO, MD)
R['headline'] = {'model': q(model), 'data': q(data), 'joint': q(both), 'product': q(model * data), 'ratio_data_over_model': q(data / model),
                 'ref_score_1e19': OO[4], 'joint_share_of_product': q(both / (model * data)),
                 'log_share': q(math.log10(both) / (math.log10(model) + math.log10(data)))}
# per year over the six years 2019 -> 2025 (the post's 1.24x, 1.51x, 1.57x)
R['per_year'] = {'model': q(model ** (1 / 6)), 'data': q(data ** (1 / 6)), 'joint': q(both ** (1 / 6)), 'product_of_rates': q((model * data) ** (1 / 6))}

# 2. the same comparison at the same score (0.4008, 2019/2019 at 1e19), the other factor already upgraded
lvl = OO[4]
R['conditional'] = {'model_on_2019_data': q(mult_level(OO, MO, lvl)), 'model_on_2025_data': q(mult_level(OD, MD, lvl)),
                    'data_with_2019_model': q(mult_level(OO, OD, lvl)), 'data_with_2025_model': q(mult_level(MO, MD, lvl))}
# Shapley split of the joint 15x in log compute: each factor's gain averaged over the two orders of upgrading
cm, cd = R['conditional'], None
lm = (math.log10(mult_level(OO, MO, lvl)) + math.log10(mult_level(OD, MD, lvl))) / 2
ld = (math.log10(mult_level(OO, OD, lvl)) + math.log10(mult_level(MO, MD, lvl))) / 2
R['shapley'] = {'model': q(10 ** lm), 'data': q(10 ** ld), 'model_share': q(lm / (lm + ld)), 'data_share': q(ld / (lm + ld))}
# and at each one's own 1e19 reference (what the post's other tables do)
R['conditional_own_ref'] = {'model_on_2025_data': q(mult(OD, MD)), 'data_with_2025_model': q(mult(MO, MD))}

# 3. the reference budget moved: the live figure's numbers
R['by_reference'] = []
for at in range(1, 5):
    r = {'ref': C[at], 'score': OO[at]}
    for k, cand in (('model', MO), ('data', OD), ('joint', MD)):
        v = mult(OO, cand, at)
        r[k] = None if v is None else q(v)
    R['by_reference'].append(r)

# 4. the two tables at 1e19, recomputed from the charts they summarise
def table(fn, tfile, refname):
    cv = curves(fn)
    pub = {row[0]: row[-1] for row in list(csv.reader(open(os.path.join(IN, tfile), encoding='utf-8')))[1:]}
    out = []
    names = list(cv)
    for name in names:
        yr = name[-5:-1]
        v = mult(cv[refname]['m'], cv[name]['m'])
        out.append({'name': name, 'published': pub.get(yr, '').split(' [')[0].replace(' (reference)', ''),
                    'recomputed': None if v is None else q(v), 'score_1e19': cv[name]['m'][4]})
    return out
R['model_table'] = table('models_on_fwedu_djBI7.csv', 'model_table_CzRR5.csv', 'GPT-2 (2019)')
R['data_table'] = table('data_on_olmo2_lm6Jz.csv', 'data_table_k03qL.csv', 'OpenWebText (2019)')

# 5. the 7 x 7 grid: the additive fit, its R squared, the share of each factor, residual size against seed noise
rows = list(csv.reader(open(os.path.join(IN, 'grid_KNa3I.csv'), encoding='utf-8')))
G = [[float(x) for x in r[1:]] for r in rows[1:]]
n = 7
mu = sum(map(sum, G)) / 49
a = [sum(G[i]) / n - mu for i in range(n)]
b = [sum(G[i][j] for i in range(n)) / n - mu for j in range(n)]
res = [[G[i][j] - mu - a[i] - b[j] for j in range(n)] for i in range(n)]
sst = sum((G[i][j] - mu) ** 2 for i in range(n) for j in range(n))
ssr = sum(x * x for r in res for x in r)
pub_res = [[float(x) for x in r[1:]] for r in list(csv.reader(open(os.path.join(IN, 'residuals_Cnl63.csv'), encoding='utf-8')))[1:]]
seed_sd = [s for cv in (K, curves('models_on_fwedu_djBI7.csv'), curves('data_on_olmo2_lm6Jz.csv')) for v in cv.values() for s in [v['sd'][3]]]
pooled = math.sqrt(sum(s * s for s in seed_sd) / len(seed_sd)) * 100
resid_sd = math.sqrt(ssr / 36)
# how big the model effect is in the grid, against the multi-seed corner curves at the same budget
R['grid'] = {'r2': q(1 - ssr / sst, '0.001'), 'share_data': q(7 * sum(x * x for x in b) / sst, '0.001'),
             'share_model': q(7 * sum(x * x for x in a) / sst, '0.001'), 'share_resid': q(ssr / sst, '0.001'),
             'resid_sd_points': q(resid_sd), 'seed_sd_points_3e18': q(pooled), 'resid_max_abs_points': q(max(abs(x) for r in res for x in r)),
             'residuals_match_published': max(abs(res[i][j] * 10 - pub_res[i][j]) for i in range(n) for j in range(n)) < 0.006,
             'model_effects': [q(x) for x in a], 'data_effects': [q(x) for x in b],
             'grid_2025model_2019data': G[6][0], 'curves_2025model_2019data': q((MO[3] - OO[3]) * 100),
             'grid_2025_2025': G[6][6], 'curves_2025_2025': q((MD[3] - OO[3]) * 100),
             'models': [r[0] for r in rows[1:]], 'corpora': [c.replace('​', '') for c in rows[0][1:]], 'G': G}
def f_sf(F, d1, d2, n=200000):
    # upper tail of the F distribution by Simpson integration of its density on t in (0, 1), x = F + t / (1 - t)
    lg = math.lgamma((d1 + d2) / 2) - math.lgamma(d1 / 2) - math.lgamma(d2 / 2) + (d1 / 2) * math.log(d1 / d2)
    pdf = lambda x: math.exp(lg + (d1 / 2 - 1) * math.log(x) - ((d1 + d2) / 2) * math.log(1 + d1 * x / d2))
    g = lambda t: 0.0 if t >= 1 else pdf(F + t / (1 - t)) / (1 - t) ** 2
    h = 1 / n
    return h / 3 * (g(0) + 4 * sum(g((2 * k - 1) * h) for k in range(1, n // 2 + 1)) + 2 * sum(g(2 * k * h) for k in range(1, n // 2)) + g(1))
Fm = (R['grid']['share_model'] / 6) / (R['grid']['share_resid'] / 36)
Fd = (R['grid']['share_data'] / 6) / (R['grid']['share_resid'] / 36)
R['grid'].update({'F_model': q(Fm), 'p_model': q(f_sf(Fm, 6, 36), '0.001'), 'F_data': q(Fd),
                  'resid_var_over_seed_var': q((resid_sd / pooled) ** 2)})
# null check: an additive fit to pure seed noise of the pooled size leaves residual sd sqrt(36/48) * sigma... and
# the expected residual sd when the truth is exactly additive is just the noise sd (36 residual degrees of freedom)

# 6. a parametric bootstrap of the headline (our own, not the authors' pipeline): each point of each corner curve
# drawn from Normal(mean, sd / sqrt(3)), the standard error of a mean over three seeds
rng = random.Random(20260908)
SE = {k: [s / math.sqrt(3) for s in K[k]['sd']] for k in K}
bs = {'model': [], 'data': [], 'joint': [], 'product': [], 'model_on_2025_data': [], 'gap': []}
for _ in range(4000):
    d = {k: [m + rng.gauss(0, s) for m, s in zip(K[k]['m'], SE[k])] for k in K}
    oo, mo, od, md = (d[k] for k in ('2019 model, 2019 data', '2025 model, 2019 data', '2019 model, 2025 data', '2025 model, 2025 data'))
    vm, vd, vj = mult(oo, mo), mult(oo, od), mult(oo, md)
    if None in (vm, vd, vj):
        continue
    bs['model'].append(vm); bs['data'].append(vd); bs['joint'].append(vj); bs['product'].append(vm * vd)
    bs['gap'].append(vm * vd / vj)
    c = mult_level(od, md, oo[4])
    if c is not None:
        bs['model_on_2025_data'].append(c)
def pct(v, p):
    v = sorted(v); return v[min(len(v) - 1, int(p * len(v)))]
R['bootstrap'] = {k: {'p16': q(pct(v, 0.16)), 'p50': q(pct(v, 0.5)), 'p84': q(pct(v, 0.84)), 'p2_5': q(pct(v, 0.025)), 'p97_5': q(pct(v, 0.975)), 'n': len(v)} for k, v in bs.items()}
R['bootstrap']['share_gap_above_1'] = q(sum(1 for g in bs['gap'] if g > 1) / len(bs['gap']), '0.001')

# 7. Ho et al. 2024 (arXiv 2403.05812, section 3.1): median doubling time of effective compute 8.4 months, 95% CI 4.5 to 14.3
R['ho'] = {'per_year_median': q(2 ** (12 / 8.4)), 'per_year_lo': q(2 ** (12 / 14.3)), 'per_year_hi': q(2 ** (12 / 4.5)),
           'over_6y_at_3x': 3 ** 6, 'over_6y_median': q((2 ** (12 / 8.4)) ** 6, '1')}

# the corner curves for the page's figure
R['curves'] = {'C': C, 'OO': OO, 'MO': MO, 'OD': OD, 'MD': MD, 'sd': {k: K[k]['sd'] for k in K}}

json.dump(R, open(os.path.join(IN, 'recompute.json'), 'w'), indent=1)
open(os.path.join(HERE, 'parts', '22_js_pd_data.js'), 'w').write(
    '/* written by src/recompute.py from the authors\' chart data; do not edit by hand */\nwindow.PDD=' + json.dumps({k: R[k] for k in ('headline', 'per_year', 'conditional', 'shapley', 'by_reference', 'grid', 'curves', 'bootstrap')}, separators=(',', ':')) + ';\n')
for k in ('headline', 'per_year', 'conditional', 'shapley', 'conditional_own_ref', 'by_reference', 'model_table', 'data_table', 'bootstrap', 'ho'):
    print(k, json.dumps(R[k]))
print('grid', json.dumps({k: v for k, v in R['grid'].items() if k not in ('G',)}))
