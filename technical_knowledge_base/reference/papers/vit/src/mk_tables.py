"""Parse the paper's tables (inputs/table_*.txt, extracted from the arXiv HTML by extract_paper.py) into tables.json.
Numbers are kept as printed strings (precision as printed); nothing is retyped by hand."""
import json, re, os
HERE = os.path.dirname(os.path.abspath(__file__))
tok = lambda f: re.sub(r'\$|\\mathbf\{([^}]*)\}|\{\\scriptstyle\\,\\pm\\,([^}]*)\}', lambda m: m.group(1) or (' ±' + m.group(2) if m.group(2) else ''), open(os.path.join(HERE, 'inputs', f)).read().split('\n', 2)[2]).split()
T = {}

# Table 1: model variants
t = tok('table_S4_T1.txt')
i = t.index('ViT-Base'); rows = []
for _ in range(3): rows.append(t[i:i + 6]); i += 6
T['t1'] = {'anchor': 'S4.T1', 'cols': ['Model', 'Layers', 'Hidden size D', 'MLP size', 'Heads', 'Params'], 'rows': rows}

# Table 2: comparison with state of the art (mean ± sd over three fine-tuning runs)
s = open(os.path.join(HERE, 'inputs', 'table_S4_T2.txt')).read()
models = ['ViT-H/14 (JFT)', 'ViT-L/16 (JFT)', 'ViT-L/16 (I21k)', 'BiT-L ResNet152x4', 'Noisy Student EfficientNet-L2']
cells = re.findall(r'\$([^$]*)\$', s)
def cell(c):
    c = c.replace('\\mathbf{', '').replace('}{\\scriptstyle\\,\\pm\\,', ' ±').replace('{\\scriptstyle\\,\\pm\\,', ' ±').replace('}', '').replace('^{*', '*').strip()
    return c.replace('-', '') if c == '-' else c
cells = [cell(c) for c in cells][:40]  # the 41st is the caption's 88.5%
datasets = ['ImageNet', 'ImageNet ReaL', 'CIFAR-10', 'CIFAR-100', 'Oxford-IIIT Pets', 'Oxford Flowers-102', 'VTAB (19 tasks)', 'TPUv3-core-days']
assert len(cells) == 40, len(cells)
T['t2'] = {'anchor': 'S4.T2', 'models': models, 'rows': [[datasets[r]] + [cells[r * 5 + j] or 'n/a' for j in range(5)] for r in range(8)]}
for r in T['t2']['rows'][-1:]:
    r[1:] = [x + 'k' for x in r[1:]]

# Table 5: ViT pre-trained on ImageNet, ImageNet-21k, JFT-300M, fine-tuned at 384
t = tok('table_A3_T5.txt'); cols = t[:5]; i = 5; blocks = {}
for pre in ('ImageNet', 'ImageNet-21k', 'JFT-300M'):
    assert t[i] == pre, (t[i], pre); i += 1; rows = []
    for name in ('CIFAR-10', 'CIFAR-100', 'ImageNet', 'ImageNet ReaL', 'Oxford Flowers-102', 'Oxford-IIIT-Pets'):
        n = len(name.split()); assert ' '.join(t[i:i + n]) == name, (t[i:i + n], name); i += n
        rows.append([name] + t[i:i + 5]); i += 5
    blocks[pre] = rows
T['t5'] = {'anchor': 'A3.T5', 'models': cols, 'pre': blocks}

# Table 6: scaling study on JFT-300M
t = tok('table_A3_T6.txt'); hdr = ['name', 'Epochs', 'ImageNet', 'ImageNet ReaL', 'CIFAR-10', 'CIFAR-100', 'Pets', 'Flowers', 'exaFLOPs']
i = t.index('name') + 1; rows = []
while i < len(t) and t[i] != 'Table':
    rows.append(t[i:i + 9]); i += 9
T['t6'] = {'anchor': 'A3.T6', 'cols': hdr, 'rows': rows}

# Table 7: Adam against SGD for ResNets
t = tok('table_A4_T7.txt'); i = t.index('Dataset') + 5; rows = []
for name in ('ImageNet', 'CIFAR10', 'CIFAR100', 'Oxford-IIIT Pets', 'Oxford Flowers-102', 'Average'):
    n = len(name.split()); i += n; rows.append([name] + t[i:i + 4]); i += 4
T['t7'] = {'anchor': 'A4.T7', 'cols': ['Dataset', 'R50 Adam', 'R50 SGD', 'R152x2 Adam', 'R152x2 SGD'], 'rows': rows}

# Table 8: position embedding ablation, ViT-B/16, ImageNet 5-shot linear
t = tok('table_A4_T8.txt'); i = t.index('Layer-Shared') + 1; rows = []
for name in ('No Pos. Emb.', '1-D Pos. Emb.', '2-D Pos. Emb.', 'Rel. Pos. Emb.'):
    n = len(name.split()); assert ' '.join(t[i:i + n]) == name; i += n; rows.append([name] + t[i:i + 3]); i += 3
T['t8'] = {'anchor': 'A4.T8', 'cols': ['Position embedding', 'Default (stem)', 'Every layer', 'Every layer, shared'], 'rows': rows}

json.dump(T, open(os.path.join(HERE, 'tables.json'), 'w'), indent=1, ensure_ascii=False)
print({k: len(v.get('rows', v.get('pre', []))) for k, v in T.items()})
