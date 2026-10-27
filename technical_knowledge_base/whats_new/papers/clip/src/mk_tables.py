"""Parse the paper's tables from the arXiv HTML extracts (inputs/table_*.txt and inputs/paper_v1.txt) into tables.json.
No hand transcription: every number comes from the extracted text. Figure labels are in inputs/figure_labels.json."""
import json, os, re
HERE = os.path.dirname(os.path.abspath(__file__)); I = os.path.join(HERE, 'inputs')
rd = lambda f: open(os.path.join(I, f)).read()
def toks(s): return [t.strip() for t in s.replace('\t', '\n').split('\n') if t.strip() and not t.startswith('Source:')]
def isnum(t):
    try: float(t.replace('⋆', '').replace('$', '').replace('+', '').strip()); return True
    except ValueError: return False
DS = ['Food101', 'CIFAR10', 'CIFAR100', 'Birdsnap', 'SUN397', 'Stanford Cars', 'FGVC Aircraft', 'VOC2007', 'DTD', 'Oxford Pets', 'Caltech101', 'Flowers102', 'MNIST', 'FER2013', 'STL10', 'EuroSAT', 'RESISC45', 'GTSRB', 'KITTI', 'Country211', 'PCam', 'UCF101', 'Kinetics700', 'CLEVR', 'HatefulMemes', 'Rendered SST2', 'ImageNet']
KORNBLITH12 = ['Food101', 'CIFAR10', 'CIFAR100', 'Birdsnap', 'SUN397', 'Stanford Cars', 'FGVC Aircraft', 'VOC2007', 'DTD', 'Oxford Pets', 'Caltech101', 'Flowers102']
T = {}
# Table 10: linear probes, 66 models x 27 datasets
t = toks(rd('table_A1_T10.txt'))[27:]
GROUPS = {'CLIP-RN': 'CLIP-ResNet', 'CLIP-ViT': 'CLIP-ViT', 'EfficientNet': 'EfficientNet', 'EfficientNet Noisy Student': 'EfficientNet Noisy Student', 'Instagram': 'Instagram ResNeXt',
          'BiT-S': 'BiT-S', 'BiT-M': 'BiT-M', 'ViT': 'ViT (ImageNet-21k)', 'SimCLRv2': 'SimCLRv2', 'BYOL': 'BYOL', 'MoCo': 'MoCo', 'ResNet': 'ResNet'}
rows, g, i = [], None, 0
while i < len(t) and not t[i].startswith('Table 10'):
    if t[i] in GROUPS and not (t[i] == 'ViT' and False): g = GROUPS[t[i]]; i += 1
    name = t[i]; vals = t[i + 1:i + 28]
    assert len(vals) == 27 and all(isnum(v) for v in vals), (name, vals)
    if name in ('LM RN50', 'VirTex', 'FixRes-v1', 'FixRes-v2'): grp = {'LM RN50': 'CLIP-AR', 'VirTex': 'VirTex'}.get(name, 'Instagram ResNeXt')
    else: grp = g
    rows.append({'group': grp, 'model': name, 'v': [float(v) for v in vals]}); i += 28
T['t10'] = {'title': 'Table 10: linear-probe scores of 66 models on 27 datasets', 'at': 'A1.T10', 'datasets': DS, 'rows': rows, 'kornblith12': KORNBLITH12}
# Table 11: zero-shot scores of the CLIP models
s = rd('paper_v1.txt'); a = s.index('Figure 21: Visualization'); b = s.index('Table 11: Zero-shot performance')
t = toks(s[a:b])[1:]
t = t[t.index('ImageNet') + 1:]
rows, g, i = [], None, 0
while i < len(t):
    n = t[i].rstrip('|').strip()
    if n in ('CLIP-ResNet', 'CLIP-ViT'): g = n; i += 1; continue
    vals = [x.rstrip('|') for x in t[i + 1:i + 28]]; assert len(vals) == 27 and all(isnum(v) for v in vals), (n, vals)
    rows.append({'group': g, 'model': n, 'v': [float(v) for v in vals]}); i += 28
T['t11'] = {'title': 'Table 11: zero-shot scores of the CLIP models on 27 datasets', 'at': 'A1.F22', 'datasets': DS, 'rows': rows}
# small tables, kept as cell grids
def grid(f): return toks(rd(f))
T['t1'] = {'at': 'S3.T1', 'cols': ['aYahoo', 'ImageNet', 'SUN'], 'rows': [['Visual N-Grams', 72.4, 11.5, 23.0], ['CLIP', 98.4, 76.2, 58.5]]}
g1 = grid('table_S3_T1.txt'); assert g1[:11] == ['aYahoo', 'ImageNet', 'SUN', 'Visual N-Grams', '72.4', '11.5', '23.0', 'CLIP', '98.4', '76.2', '58.5'], g1
T['t2'] = {'at': 'S4.T2', 'cols': ['Accuracy', 'Majority vote on full dataset', 'Accuracy on guesses', 'Majority vote accuracy on guesses'], 'rows': []}
g2 = grid('table_S4_T2.txt'); k = g2.index('Zero-shot human')
for j in range(4): T['t2']['rows'].append([g2[k + 5 * j]] + [float(x) for x in g2[k + 5 * j + 1:k + 5 * j + 5]])
g12 = grid('table_A4_T12.txt'); k = g12.index('Birdsnap'); r12 = []
for j in range(9):
    c = g12[k + 7 * j:k + 7 * j + 7]; r12.append([c[0]] + [float(x.replace('$', '').replace(' ', '')) for x in c[1:]])
T['t12'] = {'at': 'A4.T12', 'cols': ['Linear YFCC', 'Linear WIT', 'Delta', 'Zero-shot YFCC', 'Zero-shot WIT', 'Delta'], 'rows': r12}
g13 = grid('table_A4_T13.txt'); r13 = []; pos13 = 0
for name in ['Unicoder-VLa', 'Uniterb', 'VILLAc', 'Oscard', 'ERNIE-ViLe', 'Visual N-Gramsf', 'ImageBERTg', 'Unicoder-VLa', 'Uniterb', 'CLIP']:
    k = g13.index(name, pos13); pos13 = k + 1
    r13.append(['zero-shot' if len(r13) >= 5 else 'fine-tuned', name] + [None if x == '-' else float(x) for x in g13[k + 1:k + 13]])
for r in r13: r[1] = re.sub(r'[a-g]$', '', r[1])
T['t13'] = {'at': 'A4.T13', 'cols': ['Flickr30k text R@1', 'R@5', 'R@10', 'MSCOCO text R@1', 'R@5', 'R@10', 'Flickr30k image R@1', 'R@5', 'R@10', 'MSCOCO image R@1', 'R@5', 'R@10'], 'rows': r13}
g16 = grid('table_A5_T16.txt'); r16 = []
for name in ['NS EfficientNet-L2a', 'FixResNeXt101-32x48d V2b', 'Linear Probe CLIP', 'Zero-Shot CLIP']:
    k = g16.index(name); r16.append([re.sub(r'[ab]$', '', name)] + [float(x) for x in g16[k + 1:k + 11]])
T['t16'] = {'at': 'A5.T16', 'cols': ['ImageNet', 'ImageNetV2', 'ImageNet-A', 'ImageNet-R', 'ObjectNet', 'ImageNet Sketch', 'ImageNet-Vid PM0', 'PM10', 'Youtube-BB PM0', 'PM10'], 'rows': r16}
g14 = grid('table_A5_T14.txt'); r14 = []
for name, k in [('Fine-tuned SOTA', g14.index('SOTA')), ('Linear on raw pixels', g14.index('Raw Pixels')), ('Best of 56 other models (linear)', g14.index('ES Best')), ('Linear-probe CLIP', g14.index('CLIP')), ('Zero-shot CLIP', g14.index('CLIP', g14.index('ZS')))]:
    r14.append([name] + [None if x == '-' else float(re.sub(r'[a-i]$', '', x)) for x in g14[k + 1:k + 6]])
T['t14'] = {'at': 'A5.T14', 'cols': ['MNIST', 'SVHN', 'IIIT5K 1k', 'Hateful Memes', 'SST-2'], 'rows': r14}
g17 = grid('table_A5_T17.txt'); r17 = []
for name in ['ISNsa', 'CPlaNetb', 'CLIP', 'Deep-Ret+c', 'PlaNetd']:
    k = g17.index(name); r17.append([re.sub(r'[a-d]$', '', name)] + [float(x) for x in g17[k + 1:k + 6]])
T['t17'] = {'at': 'A5.T17', 'cols': ['1 km', '25 km', '200 km', '750 km', '2500 km'], 'rows': r17}
g8 = grid('table_S7_T8.txt'); k = g8.index('CLIP L/14')
T['t8'] = {'at': 'S7.T8', 'cols': ['100 classes', '1k classes', '2k classes'], 'rows': [[g8[k + 4 * j]] + [float(x) for x in g8[k + 4 * j + 1:k + 4 * j + 4]] for j in range(4)]}
g9 = grid('table_A1_T9.txt'); k = g9.index('Food-101'); r9 = []
for j in range(27): c = g9[k + 5 * j:k + 5 * j + 5]; r9.append([c[0], int(c[1].replace(',', '')), int(c[2].replace(',', '')), int(c[3].replace(',', '')), c[4]])
T['t9'] = {'at': 'A1.T9', 'cols': ['Classes', 'Train size', 'Test size', 'Metric'], 'rows': r9}
# Tables 18 to 20: hyperparameters (they have no anchors of their own; Appendix F is A6)
a = s.index('Appendix F Model Hyperparameters') if 'Appendix F Model Hyperparameters' in s else s.index('Model Hyperparameters')
h = toks(s[a:s.index('Table 20: CLIP-ViT hyperparameters')])
T['t18'] = {'at': 'A6', 'rows': [[h[i], h[i + 1]] for i in range(h.index('Batch size'), h.index('Table 18: Common CLIP hyperparameters'), 2)]}
k = h.index('RN50'); T['t19'] = {'at': 'A6', 'cols': ['Learning rate', 'Embedding dimension', 'Input resolution', 'ResNet blocks', 'ResNet width', 'Text layers', 'Text width', 'Text heads'], 'rows': [h[k + 9 * j:k + 9 * j + 9] for j in range(5)]}
k = h.index('ViT-B/32'); T['t20'] = {'at': 'A6', 'cols': ['Learning rate', 'Embedding dimension', 'Input resolution', 'ViT layers', 'ViT width', 'ViT heads', 'Text layers', 'Text width', 'Text heads'], 'rows': [h[k + 10 * j:k + 10 * j + 10] for j in range(4)]}
SUP = str.maketrans('-0123456789', '⁻⁰¹²³⁴⁵⁶⁷⁸⁹')
def tex(v):
    v = re.sub(r'\$([0-9.]*)\\times 10\^\{(-?\d+)\}\$', lambda m: m.group(1) + ' × 10' + m.group(2).translate(SUP), v)
    v = re.sub(r'\$10\^\{(-?\d+)\}\$', lambda m: '10' + m.group(1).translate(SUP), v)
    return v.replace('$\\beta_{1}$', 'β₁').replace('$\\beta_{2}$', 'β₂').replace('$\\epsilon$', 'ε').replace('$', '').strip()
for k in ('t18', 't19', 't20'): T[k]['rows'] = [[tex(c) for c in r] for r in T[k]['rows']]
T['figures'] = json.load(open(os.path.join(I, 'figure_labels.json')))
json.dump(T, open(os.path.join(HERE, 'tables.json'), 'w'), indent=0)
print('t10 rows', len(T['t10']['rows']), 't11 rows', len(T['t11']['rows']), 't13', [r[1] for r in r13], 't18', T['t18']['rows'][:3], 't19', T['t19']['rows'][0], 't20', T['t20']['rows'][0])
