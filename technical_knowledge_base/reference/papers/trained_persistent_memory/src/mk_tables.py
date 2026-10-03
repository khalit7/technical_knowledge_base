"""Parse the paper's numeric tables (3, 4 and 5) from the arXiv HTML extracts in inputs/ into tables.json,
keeping the printed precision (values kept as printed strings and as numbers). Table 2's descriptive columns are
transcribed below from inputs/table_S5_T2.txt; its parameter counts are recounted in recompute.py.
usage: python3 mk_tables.py"""
import json, re, os

HERE = os.path.dirname(os.path.abspath(__file__))


def toks(f):
    t = open(os.path.join(HERE, 'inputs', f), encoding='utf-8').read()
    return [x.strip() for x in t.split('\n') if x.strip()]


def num(s):
    s = s.replace('$-$', '-').replace(' ', '').replace('+', '')
    return float(s) if re.fullmatch(r'-?\d+(\.\d+)?', s) else None


def rows(tk):
    out, cur = [], None
    for x in tk:
        if re.match(r'^M\.\d', x):
            cur = {'m': x, 'v': [], 'p': []}; out.append(cur); continue
        v = num(x)
        if cur is not None and v is not None:
            cur['v'].append(v); cur['p'].append(x.replace('$-$ ', '-').replace('$-$', '-'))
        elif cur is not None:
            cur = None
    return out


t3 = toks('table_S6_T3.txt')
i10 = next(i for i, x in enumerate(t3) if x.startswith('10') and 'capacity' in x)
T3 = {'caption': 'Memory recall rate (%) by lag bucket on LoCoMo (smoothed, non-increasing isotonic fit). n = QA pairs per bucket.',
      'anchor': 'S6.T3', 'buckets': ['0-31', '32-63', '64-127', '128-255', '256+'], 'n': [28, 24, 62, 130, 395],
      'x1': rows(t3[:i10]), 'x10': rows(t3[i10:])}
T4 = {'caption': 'Knowledge accumulation on LoCoMo (1x capacity). K30 terminal knowledge score; dK = K30 - K1.', 'anchor': 'S6.T4',
      'cols': ['K30 (%)', 'dK (%)'], 'rows': rows(toks('table_S6_T4.txt'))}
T5 = {'caption': 'Adapter interference. Tax = F_base - F0_m (adapter on, memory zeroed); Benefit = Fmem_m - F_base. Baseline mean F1 = 6.44% at both scales.',
      'anchor': 'S7.T5', 'cols': ['Tax 1x', 'Benefit 1x', 'Tax 10x', 'Benefit 10x'], 'base_f1': 6.44, 'rows': rows(toks('table_S7_T5.txt'))}
T2 = {'caption': 'Six trained persistent-memory methods compared across key design dimensions (Table 2).', 'anchor': 'S5.T2',
      'rows': [
          {'m': 'M.1 Encoder-input prefix', 'inj': 'Before E', 'safe': True, 'params': '4.2M', 'cost': 'const.', 'write': 'A^T V', 'read': 'delegated'},
          {'m': 'M.2 Parallel decoder XAttn', 'inj': 'Inside D', 'safe': True, 'params': '16.8M', 'cost': 'const.', 'write': 'A^T V', 'read': 'explicit'},
          {'m': 'M.3 Decoder KV extension', 'inj': 'Inside D xattn', 'safe': True, 'params': '4.2M', 'cost': 'const.', 'write': 'A^T V', 'read': 'delegated'},
          {'m': 'M.4 Hebbian / associative', 'inj': 'Decoder KV', 'safe': True, 'params': '1.0M', 'cost': 'O(d_h^2)', 'write': 'Hebbian outer product', 'read': 'explicit'},
          {'m': 'M.5 Context-gated decoder branch', 'inj': 'Inside D', 'safe': True, 'params': '21.0M', 'cost': 'const.', 'write': 'A^T V', 'read': 'explicit'},
          {'m': 'M.6 Slot-based sparse write', 'inj': 'Decoder KV', 'safe': True, 'params': '4.2M', 'cost': 'O(Sd)', 'write': 'Top-k overwrite', 'read': 'delegated'}]}
for t, k in ((T3, 'x1'), (T3, 'x10')):
    for r in t[k]: assert len(r['v']) == 6, r
for r in T4['rows']: assert len(r['v']) == 2, r
for r in T5['rows']: assert len(r['v']) == 4, r
assert len(T3['x1']) == 7 and len(T3['x10']) == 7 and len(T4['rows']) == 7 and len(T5['rows']) == 6
json.dump({'t2': T2, 't3': T3, 't4': T4, 't5': T5}, open(os.path.join(HERE, 'tables.json'), 'w'), indent=1)
print('tables.json: Table 3', len(T3['x1']), '+', len(T3['x10']), 'rows; Table 4', len(T4['rows']), '; Table 5', len(T5['rows']))
