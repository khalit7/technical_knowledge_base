"""Transcribe both papers' tables from the extracted arXiv HTML text (inputs/*_tables.txt) into tables.json.

Values are kept as printed (strings), so precision survives; nothing is typed by hand. Each table is read as
cells (one per line), and every row is its label followed by a fixed number of cells.
  python3 mk_tables.py
"""
import json, os, re

HERE = os.path.dirname(os.path.abspath(__file__))


def tables(path):
    out = {}
    for blk in open(path).read().split('=== ')[1:]:
        head, body = blk.split('\n', 1)
        tid, url = head.split()
        cells = [c.strip() for c in body.split('\n') if c.strip()]
        cap = next((c for c in cells if c.startswith('Table ')), '')
        out[tid] = {'url': url, 'cells': [c for c in cells if not c.startswith('Table ')], 'caption': cap}
    return out


def rows(cells, labels, k, start=0):
    """For each label (in order), the k cells after it, searching forward from start."""
    res, i = {}, start
    for lab in labels:
        i = cells.index(lab, i)
        res[lab] = cells[i + 1:i + 1 + k]
        i += 1 + k
    return res


A = tables(os.path.join(HERE, 'inputs', 'edgemma_tables.txt'))
B = tables(os.path.join(HERE, 'inputs', 't5gemma2_tables.txt'))
T = {'_doc': 'Both papers\' tables as printed (strings). A = Encoder-Decoder Gemma, arXiv 2504.06225v1; B = T5Gemma 2, arXiv 2512.14856v2. Written by mk_tables.py from inputs/*_tables.txt.'}

# A, Table 1: configurations
c = A['S3.T1']['cells']
T['A1'] = {'url': A['S3.T1']['url'], 'caption': A['S3.T1']['caption'],
           'cols': ['#Layers', 'd_model', 'd_ffn', '#heads (q/kv)', 'd_head', '#Params decoder-only', '#Params encoder-decoder'],
           'rows': rows(c, ['2B', '9B', 'S (Small)', 'B (Base)', 'L (Large)', 'XL (Xlarge)'], 7)}

# A, Table 2: (a) PT and IT, (b) SuperGLUE. Columns: Gemma 2, +PrefixLM, +UL2 for PT then the same for IT.
# Cells like "46.4 (46.1)" are SFT (RLHF); "(39.0)" is an RLHF-only number.
c = A['S5.T2']['cells']
names = ['2B-2B', '9B-2B', '9B-9B', 'S-S', 'B-B', 'L-L', 'XL-XL']
ia = c.index('(a) Results on PT and IT benchmarks.')
T['A2a'] = {'url': A['S5.T2']['url'] if 'url' in A['S5.T2'] else '', 'cols': ['PT Gemma 2', 'PT +PrefixLM', 'PT +UL2', 'IT Gemma 2', 'IT +PrefixLM', 'IT +UL2'],
            'rows': rows(c[:ia], names, 6)}
T['A2b'] = {'cols': ['PT Gemma 2', 'PT +PrefixLM', 'PT +UL2', 'IT Gemma 2', 'IT +PrefixLM', 'IT +UL2'],
            'rows': rows(c, names, 6, ia), 'what': 'SuperGLUE, finetuned (average dev accuracy)'}
T['A2a']['url'] = A['S5.T2']['url']
T['A2b']['url'] = A['S5.T2']['url']
T['A2_caption'] = next(x for x in open(os.path.join(HERE, 'inputs', 'edgemma_tables.txt')).read().split('\n') if x.startswith('Table 2:'))

# A, Table 3: per task, (a) PT and (b) RLHF; columns Gemma 2 2B, 9B, then 2B-2B, 9B-2B, 9B-9B (PrefixLM)
c = A['S5.T3']['cells']
ia = c.index('(a) Results for pretrained models.')
def task_rows(cs, k=6):
    """Rows are task, metric, then 5 numbers; the Average row has no metric."""
    i = cs.index('Metric') + 6
    res = {}
    while i < len(cs):
        if cs[i].startswith('('): break
        if cs[i] == 'Average':
            res['Average'] = {'metric': '', 'v': cs[i + 1:i + 6]}; i += 6; continue
        res[cs[i]] = {'metric': cs[i + 1], 'v': cs[i + 2:i + 7]}; i += 7
    return res
T['A3a'] = {'url': A['S5.T3']['url'], 'cols': ['Gemma 2 2B', 'Gemma 2 9B', '2B-2B', '9B-2B', '9B-9B'], 'rows': task_rows(c[:ia + 1])}
T['A3b'] = {'url': A['S5.T3']['url'], 'cols': ['Gemma 2 2B', 'Gemma 2 9B', '2B-2B', '9B-2B', '9B-9B'], 'rows': task_rows(c[ia + 1:])}

# A, Table 4: adaptation against scratch
c = A['S6.T4']['cells']
T['A4'] = {'url': A['S6.T4']['url'], 'caption': A['S6.T4']['caption'], 'cols': ['Adapt PT', 'Adapt IT', 'Adapt SG', 'Scratch PT', 'Scratch IT', 'Scratch SG'],
           'rows': rows(c, ['S-S', 'B-B', 'L-L', 'XL-XL', '2B-2B'], 6)}

# B, Table 1: architectural ablations
c = B['S1.T1']['cells']
T['B1'] = {'url': B['S1.T1']['url'], 'caption': B['S1.T1']['caption'], 'cols': ['Performance', '#Parameters model (embedding)'],
           'rows': rows(c, ['Baseline', 'w/ Tied Embedding', 'w/ Merged Attention', 'w/ Cross Attention on Global Layers Only'], 2)}
# B, Table 2: parameters
c = B['S2.T2']['cells']
T['B2'] = {'url': B['S2.T2']['url'], 'caption': B['S2.T2']['caption'], 'cols': ['Vision Encoder', 'Embedding', 'Encoder', 'Decoder'],
           'rows': rows(c, ['270M-270M', '1B-1B', '4B-4B'], 4)}
# B, Table 3: data ablations
c = B['S3.T3']['cells']
T['B3'] = {'url': B['S3.T3']['url'], 'caption': B['S3.T3']['caption'],
           'rows': {'270M-270M': rows(c, ['PrefixLM + KD', 'UL2 + KD', 'UL2'], 1, c.index('T5Gemma 2 270M-270M')),
                    '1B-1B': rows(c, ['PrefixLM + KD', 'UL2 + KD', 'UL2'], 1, c.index('T5Gemma 2 1B-1B'))}}


def cap_table(tid):
    """Tables 4 and 5: capability groups, each with benchmark rows of 8 cells (Gemma 3 270M 1B 4B, T5Gemma 2B-2B 9B-9B, T5Gemma 2 270M 1B 4B)."""
    cs = B[tid]['cells']
    groups = ['Reasoning and Factuality', 'Reasoning', 'Stem and Code', 'Multilingual', 'Multimodal', 'Long Context']
    i = cs.index('4B-4B') + 1
    out, g = {}, None
    while i < len(cs):
        if cs[i] in groups:
            g = cs[i]; out[g] = {}; i += 1; continue
        out[g][cs[i]] = cs[i + 1:i + 9]; i += 9
    return out
cols8 = ['Gemma 3 270M', 'Gemma 3 1B', 'Gemma 3 4B', 'T5Gemma 2B-2B', 'T5Gemma 9B-9B', 'T5Gemma 2 270M-270M', 'T5Gemma 2 1B-1B', 'T5Gemma 2 4B-4B']
T['B4'] = {'url': B['S4.T4']['url'], 'caption': B['S4.T4']['caption'], 'cols': cols8, 'groups': cap_table('S4.T4'), 'what': 'pretrained models'}
T['B5'] = {'url': B['S4.T5']['url'], 'caption': B['S4.T5']['caption'], 'cols': cols8, 'groups': cap_table('S4.T5'), 'what': 'post-trained models'}

json.dump(T, open(os.path.join(HERE, 'tables.json'), 'w'), indent=1, ensure_ascii=False)
print('tables:', [k for k in T if not k.startswith('_')])
print('A3a rows', len(T['A3a']['rows']), 'A3b rows', len(T['A3b']['rows']), 'B4 groups', {g: len(v) for g, v in T['B4']['groups'].items()}, 'B5', {g: len(v) for g, v in T['B5']['groups'].items()})
