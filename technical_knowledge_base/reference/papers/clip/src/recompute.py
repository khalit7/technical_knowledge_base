"""Recompute every derived number the page shows from tables.json (the paper's own tables and printed figure labels).
Writes inputs/recompute.json; build.sh runs it. Each entry says what it reproduces and whether independently."""
import json, math, os, statistics as st
HERE = os.path.dirname(os.path.abspath(__file__))
T = json.load(open(os.path.join(HERE, 'tables.json')))
DS = T['t10']['datasets']; F = T['figures']
R = {}
def row10(group, model): return next(r['v'] for r in T['t10']['rows'] if r['group'] == group and r['model'] == model)
def row11(model): return next(r['v'] for r in T['t11']['rows'] if r['model'] == model)
zs = row11('L/14-336px'); lp = row10('CLIP-ViT', 'L/14-336px'); rn50 = row10('ResNet', '50')
# Figure 5: zero-shot CLIP minus a linear probe on ResNet-50 features, per dataset
F5N = {'Food101': 'Food101', 'CIFAR10': 'CIFAR10', 'CIFAR100': 'CIFAR100', 'Birdsnap': 'Birdsnap', 'SUN397': 'SUN397', 'Stanford Cars': 'StanfordCars', 'FGVC Aircraft': 'FGVCAircraft',
       'VOC2007': 'PascalVOC2007', 'DTD': 'DTD', 'Oxford Pets': 'OxfordPets', 'Caltech101': 'Caltech101', 'Flowers102': 'Flowers102', 'MNIST': 'MNIST', 'FER2013': 'FER2013', 'STL10': 'STL10',
       'EuroSAT': 'EuroSAT', 'RESISC45': 'RESISC45', 'GTSRB': 'GTSRB', 'KITTI': 'KITTI Distance', 'Country211': 'Country211', 'PCam': 'PatchCamelyon', 'UCF101': 'UCF101',
       'Kinetics700': 'Kinetics700', 'CLEVR': 'CLEVRCounts', 'HatefulMemes': 'HatefulMemes', 'Rendered SST2': 'SST2', 'ImageNet': 'ImageNet'}
f5 = []
for i, d in enumerate(DS):
    dlt = round(zs[i] - rn50[i], 1); pr = F['figure5']['delta'][F5N[d]]
    f5.append({'d': d, 'zs': zs[i], 'rn50': rn50[i], 'delta': dlt, 'printed': pr, 'match': abs(dlt - pr) < 0.051})
R['fig5'] = {'rows': f5, 'wins': sum(r['delta'] > 0 for r in f5), 'matches': sum(r['match'] for r in f5), 'n': len(f5),
             'how': 'Table 11 (ViT-L/14@336px zero-shot) minus Table 10 (ResNet-50 linear probe), per dataset; independent of Figure 5\'s printed labels'}
# Figure 8: zero-shot against linear probe on the same features
gap = [lp[i] - zs[i] for i in range(27)]
mx, my = st.mean(zs), st.mean(lp)
r = sum((a - mx) * (b - my) for a, b in zip(zs, lp)) / math.sqrt(sum((a - mx) ** 2 for a in zs) * sum((b - my) ** 2 for b in lp))
R['fig8'] = {'pearson': round(r, 3), 'printed': 0.82, 'within3': [DS[i] for i in range(27) if gap[i] <= 3], 'gap_median': round(st.median(gap), 1),
             'gap_10_25': sum(10 <= g <= 25 for g in gap), 'gap_min': round(min(gap), 1), 'gap_max': round(max(gap), 1),
             'pairs': [[DS[i], zs[i], lp[i]] for i in range(27)]}
# Figure 11: linear-probe CLIP against Noisy Student EfficientNet-L2 (both resolutions tried)
for k in ('L2-475', 'L2-800'):
    ns = row10('EfficientNet Noisy Student', k)
    R['fig11_' + k] = {'wins': sum(lp[i] > ns[i] for i in range(27)), 'ties': sum(lp[i] == ns[i] for i in range(27)), 'printed': 21,
                       'deltas': [[DS[i], round(lp[i] - ns[i], 1)] for i in range(27)]}
# Figure 10: average linear-probe score, 12 Kornblith datasets and all 27; best CLIP against the best other model
K12 = [DS.index(d) for d in T['t10']['kornblith12']]
avg = lambda v, idx: sum(v[i] for i in idx) / len(idx)
rows = T['t10']['rows']
def best(idx, clip):
    c = [(avg(r['v'], idx), r['group'] + ' ' + r['model']) for r in rows if (r['group'] in ('CLIP-ResNet', 'CLIP-ViT')) == clip]
    return max(c)
for name, idx in (('k12', K12), ('all27', list(range(27)))):
    bc, bo = best(idx, True), best(idx, False)
    R['fig10_' + name] = {'best_clip': [round(bc[0], 2), bc[1]], 'best_other': [round(bo[0], 2), bo[1]], 'margin': round(bc[0] - bo[0], 2)}
R['fig10_printed'] = {'k12': 2.6, 'all27': 5.0, 'how': 'printed in section 3.2 as "an average of 2.6%" and "increases from 2.6% to 5%"'}
# Figure 7: mean and median of the printed examples-per-class labels
v7 = list(F['figure7']['examples_per_class'].values())
R['fig7'] = {'n': len(v7), 'mean': round(st.mean(v7), 2), 'median': round(st.median(v7), 2), 'printed_mean': 20.8, 'printed_median': 5.4,
             'under5': sum(x < 5 for x in v7), 'under1': sum(x < 1 for x in v7)}
# Figure 2: the efficiency arrows sit on the x-axis ticks
R['fig2'] = {'lm_to_bow': round(400 / 134, 2), 'bow_to_con': round(134 / 33, 2), 'total': round(400 / 33, 1), 'how': 'ratios of the tick labels the two arrows join (400M / 134M and 134M / 33M images)'}
# Figure 4 and 9: compute range
g = F['figure9']['x_ticks_gflops']; R['fig9'] = {'range': round(g['RN50x64'] / g['RN50'], 1), 'printed': 44, 'gflops': g}
# Table 1
t1 = T['t1']['rows']
R['t1'] = {'ayahoo_error_cut': round(1 - (100 - t1[1][1]) / (100 - t1[0][1]), 3), 'printed_ayahoo': 0.95, 'sun_ratio': round(t1[1][3] / t1[0][3], 2), 'imagenet_ratio': round(t1[1][2] / t1[0][2], 1)}
# Table 2: human zero to one shot
t2 = {r[0]: r[1:] for r in T['t2']['rows']}
R['t2'] = {'zero_to_one': round(t2['One-shot human'][0] - t2['Zero-shot human'][0], 1), 'one_to_two': round(t2['Two-shot human'][0] - t2['One-shot human'][0], 1),
           'clip_minus_two_shot_human': round(t2['Zero-shot CLIP'][0] - t2['Two-shot human'][0], 1)}
# Table 16 and Figure 14: adapting CLIP to ImageNet
t16 = {r[0]: r[1:] for r in T['t16']['rows']}; c16 = T['t16']['cols']
z, l = t16['Zero-Shot CLIP'], t16['Linear Probe CLIP']
def shift_avg(v): return (v[1] + v[2] + v[3] + v[4] + v[5] + (v[6] + v[7]) / 2 + (v[8] + v[9]) / 2) / 7
R['t16'] = {'imagenet_gain': round(l[0] - z[0], 1), 'per': [[c16[i], round(l[i] - z[i], 1)] for i in range(10)],
            'shift_avg_zs': round(shift_avg(z), 2), 'shift_avg_lp': round(shift_avg(l), 2), 'shift_avg_change': round(shift_avg(l) - shift_avg(z), 2),
            'printed_text': {'ImageNet-R': -4.7, 'ObjectNet': -3.8, 'ImageNet Sketch': -2.8, 'ImageNet-A': -1.9},
            'objectnet_note': 'Table 16 gives 72.3 - 66.2 = 6.1 for ObjectNet; the text\'s 3.8 is consistent with a zero-shot baseline of 70.0, which is 72.3 minus the 2.3 points that ObjectNet\'s own class names add (section 3.3). Figure 14 starts from the ImageNet-class classifier.',
            'objectnet_reconciled': round(z[4] - 2.3 - l[4], 1)}
# Figure 13: printed table, deltas rechecked
f13 = F['figure13']['rows']
R['fig13'] = {'rows': [[k, v[0], v[1], round(v[1] - v[0], 1), v[2]] for k, v in f13.items()],
              'ina_figure': f13['ImageNet-A'][1], 'ina_table16': z[2],
              'rn101_avg5': round(st.mean(v[0] for k, v in f13.items() if k != 'ImageNet'), 2), 'clip_avg5': round(st.mean(v[1] for k, v in f13.items() if k != 'ImageNet'), 2)}
# Text encoder parameters (GPT-2 style block, section 2.4 and Table 18)
def text_params(V, ctx=77, d=512, L=12, mlp=4):
    blk = 4 * d * d + 4 * d + 2 * mlp * d * d + mlp * d + d + 4 * d
    return V * d + ctx * d + L * blk + 2 * d
R['text_params'] = {'V49408': text_params(49408), 'V49152': text_params(49152), 'printed': 63e6,
                    'how': 'token and position embeddings, 12 blocks of attention (4 d^2 + 4 d) plus MLP (8 d^2 + 5 d) plus two LayerNorms (4 d), final LayerNorm; the projection to the embedding space is left out'}
R['vocab'] = {'section_2_4': 49152, 'table_18': 49408, 'difference': 49408 - 49152}
# Compute and data arithmetic
R['gpu_days'] = {'RN50x64': 18 * 592, 'ViT-L/14': 12 * 256}
R['images_seen'] = {'total': 400e6 * 32, 'years_at_1_per_s': round(400e6 * 32 / (365.25 * 86400), 1), 'printed_years': 405}
R['contrastive'] = {'chance_loss_32768': round(math.log(32768), 3), 'init_scale': round(1 / 0.07, 2), 'max_scale': 100, 'bits_per_image': round(math.log2(32768), 1)}
# Table 12
t12 = {r[0]: r[1:] for r in T['t12']['rows']}
R['t12'] = {'avg_linear': t12['Dataset Average'][:3], 'avg_zs': t12['Dataset Average'][3:]}
# zero-shot ImageNet by model (Table 11), and averages over the 27 datasets
R['t11'] = [{'model': r['group'] + ' ' + r['model'], 'imagenet': r['v'][-1], 'avg27': round(st.mean(r['v']), 2)} for r in T['t11']['rows']]
# Table 9 misprint: Food-101 is listed with 102 classes
R['t9_food'] = next(r for r in T['t9']['rows'] if r[0] == 'Food-101')[1]
json.dump(R, open(os.path.join(HERE, 'inputs', 'recompute.json'), 'w'), indent=1)
if __name__ == '__main__':
    for k in ('fig5', 'fig8', 'fig11_L2-475', 'fig11_L2-800', 'fig10_k12', 'fig10_all27', 'fig7', 'fig2', 'fig9', 't1', 't2', 't16', 'fig13', 'text_params', 'images_seen', 'contrastive', 't11', 't9_food'):
        v = R[k]
        if isinstance(v, dict): v = {a: b for a, b in v.items() if a not in ('rows', 'pairs', 'deltas', 'per')}
        print(k, json.dumps(v)[:600])
    print('fig5 mismatches', [(r['d'], r['delta'], r['printed']) for r in R['fig5']['rows'] if not r['match']])
    print('t16 per', R['t16']['per'])
