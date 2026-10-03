"""Transcribe the tables that carry the argument from inputs/tables_v1.txt (extract_paper.py) into tables.json,
keeping the printed precision (values stay strings as printed; numbers are parsed where needed).

  python3 mk_tables.py      (build.sh runs it)
"""
import json, re, os
HERE = os.path.dirname(os.path.abspath(__file__))
raw = open(os.path.join(HERE, 'inputs', 'tables_v1.txt')).read()
blocks = {}
for blk in raw.split('=== ')[1:]:
    tid = blk.split()[0]
    cells = [l.strip() for l in blk.split('\n')[1:] if l.strip()]
    blocks[tid] = cells
num = re.compile(r'^[+-]?\d+(\.\d+)?$')
COLS7 = ['RULER 4k', 'RULER 8k', 'RULER 16k', 'LB en16', 'LB cn5', 'LongHealth5', 'GSM8K']


def summary(tid, ncol=7):
    """Tables whose rows are a label then ncol numbers; group headers ('16x compression') start a group."""
    c = blocks[tid]; cap = c[0]
    i = c.index('GSM8K') + 1 if 'GSM8K' in c else None
    rows, group = [], ''
    while i < len(c):
        lab = c[i]
        if lab.endswith('compression') and not num.match(c[i + 1] if i + 1 < len(c) else ''):
            group = lab; i += 1; continue
        vals = c[i + 1:i + 1 + ncol]
        if len(vals) < ncol or not all(num.match(v) for v in vals): break
        rows.append({'group': group, 'label': lab, 'v': vals}); i += 1 + ncol
    return {'caption': cap, 'cols': COLS7, 'rows': rows, 'url': 'https://arxiv.org/html/2606.09659v1#' + tid}


T = {}
for tid in ['A7.T6', 'A7.T12', 'A7.T16', 'A7.T20', 'A7.T26', 'A7.T30', 'A7.T31', 'A7.T32']:
    T[tid] = summary(tid)
# Table 4: encoder / decoder scaling, six columns
c = blocks['A5.T4']; i = c.index('GSM8K') + 1; rows = []
while i + 6 < len(c) + 1 and i < len(c):
    rows.append({'label': c[i], 'v': c[i + 1:i + 7]}); i += 7
T['A5.T4'] = {'caption': c[0], 'cols': ['RULER 4K', 'RULER 8K', 'RULER 16K', 'LongBench', 'LongHealth5', 'GSM8K'], 'rows': rows,
              'url': 'https://arxiv.org/html/2606.09659v1#A5.T4'}
# Table 33: agent, NIAH per task
c = blocks['A7.T33']; cols = c[c.index('Model') + 1:c.index('AVG') + 1]; i = c.index('AVG') + 1; rows = []; group = ''
while i < len(c):
    if c[i].endswith('context'): group = c[i]; i += 1; continue
    rows.append({'group': group, 'label': c[i], 'v': c[i + 1:i + 1 + len(cols)]}); i += 1 + len(cols)
T['A7.T33'] = {'caption': c[0], 'cols': cols, 'rows': rows, 'url': 'https://arxiv.org/html/2606.09659v1#A7.T33'}
# Table 7: RULER 4k per task (the uncompressed row and the 16x LCLM rows are used beside Table 33)
c = blocks['A7.T7']; cols = c[c.index('Model') + 1:c.index('AVG') + 1]; i = c.index('AVG') + 1; rows = []; group = ''
while i < len(c):
    if c[i].endswith('compression'): group = c[i]; i += 1; continue
    rows.append({'group': group, 'label': c[i], 'v': c[i + 1:i + 1 + len(cols)]}); i += 1 + len(cols)
T['A7.T7'] = {'caption': c[0], 'cols': cols, 'rows': rows, 'url': 'https://arxiv.org/html/2606.09659v1#A7.T7'}
# Table 1: training recipe token budgets (four stages)
c = blocks['S4.T1']
def after(label, n=4): k = c.index(label); return [x.strip(' $B') for x in c[k + 1:k + 1 + n]]
T['S4.T1'] = {'caption': c[0], 'stages': ['Stage 0: adapter', 'Stage 1: encoder', 'Stage 2: end to end', 'Stage 3: SFT'],
              'adapter_lr': after('Adapter Peak LR'), 'encoder_lr': after('Encoder Peak LR'), 'llm_lr': after('LLM Peak LR'),
              'enc_tokens_B': after('Encoder Tokens'), 'llm_tokens_B': after('LLM Tokens (16x)'), 'total_tokens_B': after('Total Tokens (16x)'),
              'batch': '4 Million', 'seq': '16384', 'url': 'https://arxiv.org/html/2606.09659v1#S4.T1'}
for k in T['S4.T1']:
    if isinstance(T['S4.T1'][k], list) and k != 'stages': T['S4.T1'][k] = [re.sub(r'\\times 10\^\{(-?\d+)\}', r'e\1', x).replace(' ', '').replace('$', '') for x in T['S4.T1'][k]]
# Tables 2 and 3: data mixtures (name, licence, description, samples, pre, post, trainable, percent)
def mixture(tid, groups):
    c = blocks[tid]; i = c.index('Trainable') + 1; rows = []
    while i < len(c):
        if c[i] in groups or c[i] == 'Total':
            vals = c[i + 1:i + 6] if c[i] != 'Total' or tid == 'A3.T3' else c[i + 2:i + 7]
            rows.append({'name': c[i], 'group': True, 'v': vals}); i += 1 + len(vals) + (1 if (c[i] == 'Total' and tid != 'A3.T3') else 0); continue
        rows.append({'name': c[i], 'lic': c[i + 1], 'desc': c[i + 2], 'v': c[i + 3:i + 8]}); i += 8
    return {'caption': c[0], 'cols': ['Samples', 'Pre-comp', 'Post-comp', 'Trainable', '%'], 'rows': rows, 'url': 'https://arxiv.org/html/2606.09659v1#' + tid}
T['A3.T2'] = mixture('A3.T2', [])
T['A3.T3'] = mixture('A3.T3', ['Reasoning', 'Long-Context Instruction Tuning', 'General Instruction Following', 'Reconstruction Data'])
def clean(x):
    x = re.sub(r'\$?([0-9.]+)\\times 10\^\{(-?\d+)\}\$?', r'\1e\2', x)
    return x.replace('$\\Delta$', 'Delta').replace('$', '')
for t in T.values():
    for r in t.get('rows', []):
        if 'label' in r: r['label'] = clean(r['label'])
json.dump(T, open(os.path.join(HERE, 'tables.json'), 'w'), indent=1)
for k, v in T.items():
    print(k, len(v.get('rows', [])), (v.get('rows') or [{}])[0], (v.get('rows') or [{}])[-1])
