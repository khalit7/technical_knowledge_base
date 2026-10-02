"""Recompute every derived number the page shows from the paper's own tables (tables.json) and configurations.
Writes inputs/recompute.json; build.sh runs it first. Prints a line per check."""
import json, math, os
HERE = os.path.dirname(os.path.abspath(__file__))
T = json.load(open(os.path.join(HERE, 'tables.json')))
R = {}
f = lambda x: float(x.split()[0].rstrip('k*').split('/')[0])

# 1. Table 1 parameter counts from Eq. 1 to 4 (224 px RGB input, patch 16 for B and L, 14 for H; head excluded)
CFG = {'B': (12, 768, 3072, 16), 'L': (24, 1024, 4096, 16), 'H': (32, 1280, 5120, 14)}
def params(L, D, M, P, res=224, C=3):
    N = (res // P) ** 2
    emb = P * P * C * D + D + D + (N + 1) * D                     # E and its bias, x_class, E_pos
    blk = 2 * 2 * D + 3 * D * D + 3 * D + D * D + D + D * M + M + M * D + D
    return emb + L * blk + 2 * D
R['params'] = {k: params(*v) for k, v in CFG.items()}
R['params_printed'] = {r[0][4]: r[5] for r in T['t1']['rows']}
print('params', {k: '%.1fM' % (v / 1e6) for k, v in R['params'].items()}, 'printed', R['params_printed'])

# 2. Sequence lengths N = HW/P^2 (+1 for the class token) at pre-training and fine-tuning resolutions
R['seq'] = {'B/16@224': (224 // 16) ** 2, 'B/32@224': (224 // 32) ** 2, 'H/14@224': (224 // 14) ** 2, 'L/16@384': (384 // 16) ** 2,
            'L/16@512': (512 // 16) ** 2, 'H/14@518': (518 // 14) ** 2, 'pixels@224': 224 * 224}
print('seq', R['seq'])

# 3. Training compute of each ViT in Table 6, by formula: 3 x forward FLOPs (2 per multiply-add) x images seen
def fwd_macs(L, D, M, P, res=224):
    N = (res // P) ** 2 + 1
    return (N - 1) * P * P * 3 * D + L * (N * (4 * D * D + 2 * D * M) + 2 * N * N * D)
JFT = 303e6
R['exaflops'] = {}
for name, ep, printed in [('B/32', 7, 55), ('B/16', 7, 224), ('L/32', 7, 196), ('L/16', 7, 783), ('L/16', 14, 1567), ('H/14', 14, 4262)]:
    L, D, M, _ = CFG[name[0]]; P = int(name.split('/')[1])
    ef = 3 * 2 * fwd_macs(L, D, M, P) * JFT * ep / 1e18
    R['exaflops'][name + ' %dep' % ep] = {'formula': round(ef), 'printed': printed, 'ratio': round(ef / printed, 3)}
print('exaflops', R['exaflops'])

# 4. Table 2: compute ratios and the gaps against BiT-L in units of the combined standard deviation
t2 = {r[0]: r[1:] for r in T['t2']['rows']}
cd = [f(x) for x in t2['TPUv3-core-days']]
R['coredays'] = {'BiT/H14': round(cd[3] / cd[0], 2), 'NS/H14': round(cd[4] / cd[0], 2), 'BiT/L16': round(cd[3] / cd[1], 2), 'I21k 8 cores x 30 days': 8 * 30}
gaps = {}
for ds, v in t2.items():
    if ds == 'TPUv3-core-days': continue
    def ms(x):
        if x == 'n/a': return None
        p = x.split(' ±'); return float(p[0].split('/')[0].rstrip('*')), (float(p[1]) if len(p) > 1 else None)
    b = ms(v[3])
    for j, who in ((0, 'H/14'), (1, 'L/16 JFT')):
        a = ms(v[j]); d = round(a[0] - b[0], 2)
        sd = math.sqrt(a[1] ** 2 + b[1] ** 2) if (a[1] is not None and b[1] is not None) else None
        gaps.setdefault(ds, {})[who] = {'diff': d, 'sd': round(sd, 3) if sd else None, 'z': round(d / sd, 1) if sd else None}
R['t2_gaps'] = gaps
R['l16_not_better'] = [ds for ds, g in gaps.items() if g['L/16 JFT']['diff'] <= 0]
print('coredays', R['coredays']); print('L/16 not above BiT-L on', R['l16_not_better'])

# 5. "2 to 4x less compute" (section 4.4): for each ViT in Table 6, the ResNet compute that reaches the same accuracy,
#    read off the ResNets' compute frontier by log-linear interpolation (ImageNet, and the mean of five datasets)
rows = T['t6']['rows']
def acc(r, which):
    if which == 'ImageNet': return float(r[2])
    return sum(float(r[i]) for i in (2, 4, 5, 6, 7)) / 5  # ImageNet, CIFAR-10, CIFAR-100, Pets, Flowers
res = sorted([r for r in rows if r[0].startswith('ResNet')], key=lambda r: float(r[8]))
vit = [r for r in rows if r[0].startswith('ViT')]
R['compute_ratio'] = {}
for which in ('ImageNet', 'Average-5'):
    pts, front = [], []
    for r in res:  # monotone frontier
        a = acc(r, which)
        if not front or a > front[-1][1]: front.append((float(r[8]), a))
    for r in vit:
        a, c = acc(r, which), float(r[8]); out = None
        for (c0, a0), (c1, a1) in zip(front, front[1:]):
            if a0 <= a <= a1:
                cr = math.exp(math.log(c0) + (math.log(c1) - math.log(c0)) * (a - a0) / (a1 - a0)); out = round(cr / c, 2)
        pts.append({'model': r[0] + ' ' + r[1] + 'ep', 'acc': round(a, 2), 'exaflops': c, 'ratio': out,
                    'note': None if out else ('above every ResNet' if a > front[-1][1] else 'below every ResNet')})
    R['compute_ratio'][which] = {'frontier': front, 'vit': pts}
    print('compute ratio', which, [(p['model'], p['ratio'], p['note']) for p in pts])

# 6. Table 5 against Table 6 and Table 2: which rows are the same runs
t5 = {r[0]: r[1:] for r in T['t5']['pre']['JFT-300M']}
t6 = {r[0] + ' ' + r[1]: r for r in rows}
map6 = {'ImageNet': 2, 'ImageNet ReaL': 3, 'CIFAR-10': 4, 'CIFAR-100': 5, 'Oxford-IIIT-Pets': 6, 'Oxford Flowers-102': 7}
cmp = {}
for j, (m, key) in enumerate([('ViT-B/16', 'ViT-B/16 7'), ('ViT-B/32', 'ViT-B/32 7'), ('ViT-L/16', 'ViT-L/16 14'), ('ViT-L/32', 'ViT-L/32 7'), ('ViT-H/14', 'ViT-H/14 14')]):
    cmp[m] = {ds: [t5[ds][j], t6[key][i]] for ds, i in map6.items() if t5[ds][j] != t6[key][i]}
R['t5_vs_t6'] = cmp
R['t5_h14_vs_t2'] = {ds: [t5[ds][4], t2[ds2][0]] for ds, ds2 in (('CIFAR-10', 'CIFAR-10'), ('CIFAR-100', 'CIFAR-100'), ('Oxford-IIIT-Pets', 'Oxford-IIIT Pets'), ('Oxford Flowers-102', 'Oxford Flowers-102'), ('ImageNet', 'ImageNet'), ('ImageNet ReaL', 'ImageNet ReaL'))}
print('T5 vs T6 differences', cmp); print('T5 H/14 vs T2', R['t5_h14_vs_t2'])

# 7. The data-scale crossover in Table 5 (fine-tuned ImageNet top-1): Large minus Base at each pre-training set
R['l_minus_b'] = {pre: round(float(dict((r[0], r[1:]) for r in T['t5']['pre'][pre])['ImageNet'][2]) - float(dict((r[0], r[1:]) for r in T['t5']['pre'][pre])['ImageNet'][0]), 2) for pre in T['t5']['pre']}
print('L/16 minus B/16 on ImageNet', R['l_minus_b'])

# 8. Self-supervision (section 4.6): 79.9 is "2% above from scratch, 4% behind supervised"; Table 5 has both ends
R['ssl'] = {'scratch_B16_t5': 77.91, 'plus2': round(79.9 - 77.91, 2), 'i21k_B16': 83.97, 'jft_B16': 84.15, 'gap_jft': round(84.15 - 79.9, 2), 'gap_i21k': round(83.97 - 79.9, 2)}
print('ssl', R['ssl'])

# 9. Table 8: what position embeddings buy, and how little the variants differ; Table 7 averages
t8 = {r[0]: [float(x) for x in r[1:] if x != 'N/A'] for r in T['t8']['rows']}
withpe = [x for k, v in t8.items() if k != 'No Pos. Emb.' for x in v]
R['t8'] = {'gain_1d_over_none': round((t8['1-D Pos. Emb.'][0] - t8['No Pos. Emb.'][0]) * 100, 2), 'spread_with_pe': round((max(withpe) - min(withpe)) * 100, 2)}
t7 = T['t7']['rows']
R['t7_avg'] = [round(sum(float(r[j]) for r in t7[:5]) / 5, 2) for j in range(1, 5)]
R['t7_avg_printed'] = [float(x) for x in t7[5][1:]]
print('t8', R['t8'], 't7 averages', R['t7_avg'], 'printed', R['t7_avg_printed'])

json.dump(R, open(os.path.join(HERE, 'inputs', 'recompute.json'), 'w'), indent=1)
