"""Transcribe the paper's tables from the arXiv HTML extracts (inputs/table_*.txt, written by extract_paper.py)
into tables.json, keeping every value as printed (strings), so nothing is retyped by hand.
usage: python3 mk_tables.py"""
import json, os, re

HERE = os.path.dirname(os.path.abspath(__file__))
NUM = re.compile(r'^(-|–|[\d,]+(\.\d+)?M?(e-?\d+)?|\d+(\.\d+)? \$\\pm\$ \d+(\.\d+)?)$')


def toks(f):
    s = open(os.path.join(HERE, 'inputs', f)).read().split('\n', 2)[2]
    return [t.strip() for t in s.split('\n') if t.strip()]


def grouped(f, cols, first_header, skip_after_header=0):
    """Rows of a table whose header row starts at token `first_header`, with `cols` value columns and
    size-group rows ("XXS Models (...)")."""
    t = toks(f)
    i = t.index(first_header)
    head = t[i:i + cols + 1]; i += cols + 1 + skip_after_header
    rows, group = [], None
    cap = next(x for x in t if x.startswith('Table '))
    while i < len(t) and not t[i].startswith('Table '):
        if not NUM.match(t[i]) and (i + 1 >= len(t) or not NUM.match(t[i + 1])):
            group = t[i]; i += 1; continue
        name = t[i]; vals = t[i + 1:i + 1 + cols]
        assert len(vals) == cols and all(NUM.match(v) for v in vals), (f, name, vals)
        rows.append({'g': group, 'name': name, 'v': vals}); i += 1 + cols
    return {'cols': head[1:], 'rows': rows, 'caption': cap}


def wide(f, nrows_label, ncols):
    """Table 1: parameters as rows, model sizes as columns."""
    t = toks(f)
    sizes = t[:ncols]; labels = t[ncols:2 * ncols + 1]
    i = 2 * ncols + 1; rows = []
    while not t[i].startswith('Table '):
        rows.append({'name': t[i], 'v': t[i + 1:i + 1 + ncols]}); i += 1 + ncols
    return {'sizes': sizes, 'size_names': labels[1:], 'rows': rows, 'caption': t[i]}


def mix(f):
    t = toks(f)
    i = t.index('News'); rows = []
    while t[i] != 'Total':
        rows.append({'cat': t[i], 'name': t[i + 1], 'v': t[i + 2:i + 8]}); i += 8
    total = t[i + 1:i + 7]
    return {'cols': ['Pre-training tokens (B)', '%', 'Mid-training tokens (B)', '%', 'Decay tokens (B)', '%'], 'rows': rows, 'total': total, 'caption': t[i + 7]}


def pairs(f):
    t = toks(f)
    i = t.index('Value') + 1; rows = []
    while not t[i].startswith('Table '):
        rows.append([t[i], t[i + 1]]); i += 2
    return {'rows': rows, 'caption': t[i]}


T = {
 '_doc': 'The paper\'s tables, transcribed by mk_tables.py from the arXiv HTML v2 (https://arxiv.org/html/2507.11412v2). Values are strings exactly as printed.',
 'T1': wide('table_S2_T1.txt', 0, 6),
 'T2': mix('table_S3_T2.txt'),
 'T3': grouped('table_S4_T3.txt', 8, 'Model Name'),
 'T4': grouped('table_S4_T4.txt', 11, 'Model Name'),
 'T5': grouped('table_S4_T5.txt', 2, 'Model'),
 'T6': grouped('table_A7_T6.txt', 9, 'Model Name'),
 'T7': grouped('table_A7_T7.txt', 9, 'Model Name'),
 'T8': grouped('table_A7_T8.txt', 11, 'Model Name'),
 'T9': grouped('table_A7_T9.txt', 3, 'Model Name'),
 'T10': grouped('table_A7_T10.txt', 7, 'Model Name'),
 'T11': grouped('table_A7_T11.txt', 3, 'Model Name'),
 'T12': pairs('table_A7_T12.txt'),
}
T['T5']['rows'] = [r for r in T['T5']['rows']]
json.dump(T, open(os.path.join(HERE, 'tables.json'), 'w'), indent=1, ensure_ascii=False)
for k, v in T.items():
    if k.startswith('_'): continue
    print(k, len(v.get('rows', [])), 'rows', v.get('cols', v.get('sizes', ''))[:12])
