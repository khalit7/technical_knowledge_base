"""Recompute every derived number on the CPT page from the published tables (transcribed in inputs/),
and pack the toy runs (toy/runs/) into parts/20_js_data.js. Writes inputs/recompute.json too.
Run from src/:  python3 recompute.py"""
import json, math, os

HERE = os.path.dirname(os.path.abspath(__file__))
out = {}

# ---------------- Ibrahim et al. 2024, Tables 2, 4 and 12 (final validation loss, nats per token) ----------------
# Each point: [label, old-domain (Pile) loss, new-domain loss]
IB = {
  'ger405': {
    'name': '405M, Pile to German (strong shift)', 'new': 'German Common Crawl', 'tokens': '300B Pile, then 200B German',
    'base_old': 2.17, 'base_new': None,
    'replay': [[0, 3.56, 1.11], [1, 2.83, 1.12], [5, 2.57, 1.12], [10, 2.46, 1.13], [25, 2.33, 1.16], [50, 2.24, 1.22]],
    'lr': [['const', 3.22, 1.21], [1.5e-4, 3.47, 1.13], [3e-4, 3.56, 1.11], [6e-4, 3.63, 1.11]],
    'union': [2.26, 1.25], 'scratch_new': [3.97, 1.17]},
  'sp405': {
    'name': '405M, Pile to SlimPajama (weak shift)', 'new': 'SlimPajama', 'tokens': '300B Pile, then 300B SlimPajama',
    'base_old': 2.17, 'base_new': 2.70,
    'replay': [[0, 2.44, 2.50], [0.5, 2.27, 2.50], [1, 2.26, 2.50], [5, 2.23, 2.51], [10, 2.21, 2.51], [50, 2.16, 2.54]],
    'lr': [['const', 2.42, 2.55], [1.5e-4, 2.43, 2.51], [3e-4, 2.44, 2.50], [6e-4, 2.48, 2.50]],
    'union': [2.17, 2.53], 'scratch_new': [2.51, 2.53]},
  'sp10b': {
    'name': '10B, Pile to SlimPajama (weak shift)', 'new': 'SlimPajama', 'tokens': '300B Pile, then 300B SlimPajama',
    'base_old': 1.75, 'base_new': 2.24,
    'replay': [[0, 1.98, 2.00], [5, 1.79, 2.00]],
    'lr': [],
    'union': [1.72, 2.02], 'scratch_new': [2.08, 2.05]},
}
d = {}
for k, v in IB.items():
    r0 = v['replay'][0][1]; forg0 = r0 - v['base_old']
    d[k] = {'forget_no_replay': round(forg0, 2), 'forget_no_replay_rel_pct': round(100 * forg0 / v['base_old'], 1),
            'replay': [{'pct': p, 'forget': round(o - v['base_old'], 2),
                        'share_of_forgetting_removed_pct': round(100 * (r0 - o) / forg0, 1),
                        'new_loss_cost': round(n - v['replay'][0][2], 2)} for p, o, n in v['replay']]}
out['ibrahim'] = d
# scale comparison (weak shift): relative rise in Pile loss, no replay and 5% replay
out['ibrahim_scale'] = {
  '405M_no_replay_rel_pct': round(100 * (2.44 - 2.17) / 2.17, 1), '10B_no_replay_rel_pct': round(100 * (1.98 - 1.75) / 1.75, 1),
  '405M_5pct_rel_pct': round(100 * (2.23 - 2.17) / 2.17, 1), '10B_5pct_rel_pct': round(100 * (1.79 - 1.75) / 1.75, 1)}
# LR peak relative to pretraining peak (3e-4) for the 405M sweep
out['ibrahim_lr_ratio'] = {str(x): round(x / 3e-4, 2) for x in (1.5e-4, 3e-4, 6e-4)}
out['ibrahim_lr_ratio']['const_eta_min'] = round(3e-5 / 3e-4, 2)
# merging (Table 6, English average): TIES best top-k against CPT with replay
out['ibrahim_ties'] = {'405M_German_TIES_best_avg': 27.57, '405M_German_CPT25_avg': 32.48,
                       '405M_SP_TIES_best_avg': 32.10, '405M_SP_CPT5_avg': 35.14,
                       '10B_SP_TIES_best_avg': 41.94, '10B_SP_CPT5_avg': 47.68}

# ---------------- CMR scaling law (Gu et al. 2024), Table 5: R_CMR = a4 * T^s4 + b3, T in units of 0.2B tokens ----------------
CMR = {'460M': [0.22524761, 0.26944345, -0.48139982], '940M': [0.7520627, 0.13720245, -1.06581937],
       '1.6B': [-2.36384831, -0.15125569, 1.59223649], '3.1B': [-2.5368197, -0.42071423, 0.84375368]}
CMR_PUB = {'460M': 29.8, '940M': 34.9, '1.6B': 41.4, '3.1B': 47.8}
cm = {}
for k, (a, s, b) in CMR.items():
    v = 100 * (a * 100 ** s + b)
    cm[k] = {'at_T100_pct': round(v, 1), 'published_pct': CMR_PUB[k], 'match': round(v, 1) == CMR_PUB[k],
             'at_T250_pct': round(100 * (a * 250 ** s + b), 1)}
out['cmr'] = cm
out['cmr_tokens_check'] = {'cpt_steps': 10000, 'batch': 512, 'seq': 4096,
                           'tokens_B': round(10000 * 512 * 4096 / 1e9, 2), 'T_unit_B': 0.2,
                           'T250_tokens_B_by_unit': 50, 'T250_tokens_B_as_printed': 500}
# Table 2: domain loss against domain ratio, fit L(R) = a R^s + b on 100/75/50/33% and predict 25%
T2 = {'460M': [1.4628, 1.4844, 1.5122, 1.5387, 1.5561, 1.5566], '940M': [1.3723, 1.3910, 1.4155, 1.4385, 1.4538, 1.4546],
      '1.6B': [1.3242, 1.3416, 1.3643, 1.3854, 1.3994, 1.3999], '3.1B': [1.2585, 1.2750, 1.2965, 1.3170, 1.3305, 1.3303]}
RS = [1.0, 0.75, 0.5, 1 / 3]
def fit(ys):
    best = None
    for i in range(1, 4000):
        s = -3 + i * 0.001  # exponent grid, negative (loss falls as R grows)
        xs = [r ** s for r in RS]
        mx = sum(xs) / 4; my = sum(ys) / 4
        sxx = sum((x - mx) ** 2 for x in xs)
        if sxx == 0: continue
        a = sum((x - mx) * (y - my) for x, y in zip(xs, ys)) / sxx; b = my - a * mx
        e = sum((a * x + b - y) ** 2 for x, y in zip(xs, ys))
        if best is None or e < best[0]: best = (e, a, s, b)
    return best
t2 = {}
for k, v in T2.items():
    e, a, s, b = fit(v[:4])
    p = a * 0.25 ** s + b
    t2[k] = {'alpha': round(a, 5), 's': round(s, 3), 'beta': round(b, 5), 'pred25_ours': round(p, 4),
             'pred25_paper': v[5], 'gt25': v[4], 'err_ours_pct': round(100 * abs(p - v[4]) / v[4], 2)}
out['cmr_table2_fit'] = t2

# ---------------- D-CPT Law (Que et al. 2024), usage 1, Table 5 (chemistry, Qwen1.5-1.8B, D0 = 10B, T = 3%) ----------------
rd = [0.9, 0.91, 0.92, 0.924, 0.93, 0.94, 1.0]
lg = [2.9052, 2.9193, 2.9376, 2.9445, 2.9644, 2.9848, 3.4667]
ld = [1.7321, 1.7312, 1.7311, 1.7291, 1.7279, 1.7265, 1.7220]
lg0 = 2.8602; lim = lg0 * 1.03
cross = None
for i in range(len(rd) - 1):
    if lg[i] <= lim < lg[i + 1]:
        cross = rd[i] + (rd[i + 1] - rd[i]) * (lim - lg[i]) / (lg[i + 1] - lg[i])
out['dcpt'] = {'lg0': lg0, 'limit': round(lim, 4), 'crossing_rd': round(cross, 4), 'published_rd': 0.924,
               'rise_pct': [round(100 * (x / lg0 - 1), 2) for x in lg], 'rd': rd, 'lg': lg, 'ld': ld,
               'no_replay_rise_pct': round(100 * (3.4667 / lg0 - 1), 1)}

# ---------------- Thomson Reuters and Neon (figures as on the parent page) ----------------
out['thomson'] = {'kept_share_pct': round(100 * 200 / 19000, 2), 'final_run_usd': 450000, 'programme_usd': 40e6,
                  'programme_over_final': round(40e6 / 450000)}

# ---------------- the toy runs ----------------
toy = None
rd_dir = os.path.join(HERE, 'toy', 'runs')
if os.path.exists(os.path.join(rd_dir, 'meta.json')):
    meta = json.load(open(os.path.join(rd_dir, 'meta.json')))
    seeds = []
    for s in (1, 2, 3):
        f = os.path.join(rd_dir, f'seed{s}.json')
        if os.path.exists(f): seeds.append(json.load(open(f)))
    if seeds:
        names = list(seeds[0]['cpt'].keys())
        pack = lambda lst: [[e['step'], e['en'], e['de']] for e in lst]
        toy = {'meta': {k: meta[k] for k in ('ctx', 'batch', 'd', 'layers', 'heads', 'peak_lr', 'warmup', 'floor', 'pt_steps',
                                              'cpt_steps', 'peaks', 'replays', 'en_books', 'de_books', 'en_train_chars', 'de_train_chars', 'eval_seqs')},
               'params': seeds[0]['params'], 'seeds': [x['seed'] for x in seeds],
               'pt': [pack(x['pt']) for x in seeds], 'union': [pack(x['union']) for x in seeds],
               'cpt': {n: [pack(x['cpt'][n]) for x in seeds] for n in names},
               'samples': [x['samples'] for x in seeds], 'seconds': [x.get('seconds') for x in seeds]}
        # summary: base (end of pretraining), each CPT run's final losses, and its worst English point
        summ = {}
        for n in names:
            fe = [x['cpt'][n][-1]['en'] for x in seeds]; fd = [x['cpt'][n][-1]['de'] for x in seeds]
            pe = [max(e['en'] for e in x['cpt'][n]) for x in seeds]
            be = [x['pt'][-1]['en'] for x in seeds]; bd = [x['pt'][-1]['de'] for x in seeds]
            m = lambda a: round(sum(a) / len(a), 3)
            summ[n] = {'en': m(fe), 'de': m(fd), 'en_min': round(min(fe), 3), 'en_max': round(max(fe), 3),
                       'de_min': round(min(fd), 3), 'de_max': round(max(fd), 3),
                       'forget': m([a - b for a, b in zip(fe, be)]), 'gain': m([b - a for a, b in zip(fd, bd)]),
                       'peak_en': m(pe)}
        summ['base'] = {'en': round(sum(x['pt'][-1]['en'] for x in seeds) / len(seeds), 3),
                        'de': round(sum(x['pt'][-1]['de'] for x in seeds) / len(seeds), 3)}
        summ['union'] = {'en': round(sum(x['union'][-1]['en'] for x in seeds) / len(seeds), 3),
                         'de': round(sum(x['union'][-1]['de'] for x in seeds) / len(seeds), 3)}
        r0 = summ['p1.0_r0.0']['forget']
        for n in names:
            summ[n]['removed_pct'] = round(100 * (r0 - summ[n]['forget']) / r0, 1) if r0 else None
        toy['summary'] = summ
        out['toy_summary'] = summ

json.dump(out, open(os.path.join(HERE, 'inputs', 'recompute.json'), 'w'), indent=1)
data = {'rcp': json.load(open(os.path.join(HERE, 'inputs', 'recipes.json'))), 'ib': IB, 'cmr': CMR, 'cmrPub': CMR_PUB, 'dcpt': out['dcpt'], 'rc': {k: v for k, v in out.items() if k != 'toy_summary'}, 'toy': toy}
with open(os.path.join(HERE, 'parts', '20_js_data.js'), 'w') as f:
    f.write('// generated by recompute.py: published tables (transcribed) and the toy runs\nwindow.CPT=' +
            json.dumps(data, separators=(',', ':')) + ';\n')
print(json.dumps({k: v for k, v in out.items() if k not in ('dcpt',)}, indent=1)[:4000])
