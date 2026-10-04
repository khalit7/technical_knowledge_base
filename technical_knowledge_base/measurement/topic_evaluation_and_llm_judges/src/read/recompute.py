"""Recompute every derived number in the Reading tab; writes read/recompute.json.
The page's JavaScript exposes the same values in window.RD_CHECK; read/check_read.mjs compares them."""
import json, math, os

out = {}
# MT-Bench Table 2 (default prompt): percentages of 80 swapped pairs -> counts
T2 = {'g4': [65.0, 30.0, 5.0, 0.0], 'g35': [46.2, 50.0, 1.2, 2.5], 'c1': [23.8, 75.0, 0.0, 1.2]}
out['modes'] = {k: [round(x * 80 / 100) for x in v] for k, v in T2.items()}
for k, c in out['modes'].items():
    assert sum(c) == 80, (k, c)
out['modes']['math'] = [14, 6, 3]  # Table 4, failures of 20

# Cohen's kappa examples
def kappa(tp, fn, fp, tn):
    n = tp + fn + fp + tn
    po = (tp + tn) / n
    pj, ph = (tp + fp) / n, (tp + fn) / n
    pe = pj * ph + (1 - pj) * (1 - ph)
    return (po - pe) / (1 - pe)
out['kappa'] = {'a': kappa(180, 0, 20, 0), 'b': kappa(170, 10, 10, 10)}

# Statistics: 70% on 200 items, 2-point drop, 10% discordant
p, n, d, delta, z, zb = 0.70, 200, 0.10, -0.02, 1.96, 0.8416
se1 = math.sqrt(p * (1 - p) / n)
seU = math.sqrt(2) * se1
seP = math.sqrt((d - delta ** 2) / n)
out['stat'] = {'se1': 100 * se1, 'seU': 100 * seU, 'seP': 100 * seP, 'ciU': 100 * z * seU, 'ciP': 100 * z * seP,
               'nU': math.ceil((z + zb) ** 2 * 2 * p * (1 - p) / delta ** 2),
               'nP': math.ceil((z + zb) ** 2 * (d - delta ** 2) / delta ** 2)}
out['stat_text'] = {'interval_unpaired': [-2 - 100 * z * seU, -2 + 100 * z * seU],
                    'mde_paired_pts': 100 * (z + zb) * math.sqrt(d / n), 'mde_unpaired_pts': 100 * (z + zb) * seU,
                    'false_alarm_20_slices': 1 - 0.95 ** 20}

# Physics re-grading attribution (paper page tables.json funnel)
here = os.path.dirname(os.path.abspath(__file__))
tab = json.load(open(os.path.join(here, '../../../../reference/papers/re_grading_six_physics_benchmarks/src/tables.json')))
f = tab['funnel']
attr = {}
for b in ['HLE-Physics', 'PRISM-Physics', 'PHYBench', 'UGPhysics']:
    r = f[b]
    assert r['rej'] == r['Q'] + r['G'] + r['M'], b
    attr[b] = {'n': r['rej'], 'q': r['Q'], 'g': r['G'], 'm': r['M']}
attr['all'] = {k: sum(attr[b][k] for b in list(attr)) for k in ['n', 'q', 'g', 'm']}
assert attr['all'] == {'n': tab['t2_pooled']['rej'], 'q': tab['t2_pooled']['Q'], 'g': tab['t2_pooled']['G'], 'm': tab['t2_pooled']['M']}
out['attr'] = attr
out['physics_reviewer_agreement'] = tab['t3_total']['agree'] / tab['t3_total']['double']  # 140/196

json.dump(out, open(os.path.join(here, 'recompute.json'), 'w'), indent=1)
print(json.dumps(out, indent=1))
