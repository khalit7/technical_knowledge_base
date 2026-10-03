"""Build tables.json from the arXiv v2 table extracts in inputs/ (written by extract_paper.py).
Values keep the printed precision as strings ("0.606", "87.5", "-"). usage: python3 mk_tables.py"""
import json, re

def rows(tid):
    s = open('inputs/table_%s.txt' % tid).read().split('\n', 2)[2]
    body = s[:s.find('Table ')]
    cap = re.sub(r'\s+', ' ', s[s.find('Table '):]).strip()
    blocks = [b for b in re.split(r'\n\s*\n', body) if b.strip()]
    return [[c.strip() for c in b.split('\t') if c.strip()] for b in blocks], cap

def bench(tid, ncol, models, meta_rows, lower=('Pile-test (BPB)',), shots=True):
    """Benchmark tables: each data row is [group?] name, [shots], values...; returns meta and rows."""
    R, cap = rows(tid)
    width = ncol + (2 if shots else 1)
    meta, data, group = {}, [], ''
    for r in R[2:]:
        if len(r) == width + 1: group, r = r[0], r[1:]
        assert len(r) == width, (tid, r)
        vals = r[2:] if shots else r[1:]
        if r[0] in meta_rows: meta[r[0]] = vals; continue
        m = re.match(r'(.*) \((.*)\)$', r[0])
        name, metric = (m.group(1), m.group(2)) if m else (r[0], '')
        data.append({'group': group, 'bench': name, 'metric': metric, 'shots': r[1] if shots else '', 'v': vals, 'lower': r[0] in lower})
    return {'models': models, 'meta': meta, 'rows': data, 'caption': cap}

T = {}
R, cap = rows('S1_T1')
T['T1'] = {'at': 'S1.T1', 'cols': R[0][1:], 'hours': R[1][1:], 'usd': R[2][1:], 'caption': cap}
R, cap = rows('S3_T2')
T['T2'] = {'at': 'S3.T2', 'head': R[0], 'rows': [[c.strip('$').replace('\\times', '×').replace('\\frac{PP}{2}', 'PP/2').replace('\\&', '&') for c in r] for r in R[1:]], 'caption': cap}
T['T3'] = dict(bench('S4_T3', 4, ['DeepSeek-V2 Base', 'Qwen2.5 72B Base', 'LLaMA-3.1 405B Base', 'DeepSeek-V3 Base'],
                     ('Architecture', '# Activated Params', '# Total Params')), at='S4.T3')
T['T4'] = dict(bench('S4_T4', 4, ['Small MoE baseline', 'Small MoE w/ MTP', 'Large MoE baseline', 'Large MoE w/ MTP'],
                     ('# Activated Params (Inference)', '# Total Params (Inference)', '# Training Tokens')), at='S4.T4')
T['T5'] = dict(bench('S4_T5', 4, ['Small MoE aux-loss-based', 'Small MoE aux-loss-free', 'Large MoE aux-loss-based', 'Large MoE aux-loss-free'],
                     ('# Activated Params', '# Total Params', '# Training Tokens')), at='S4.T5')
T['T6'] = dict(bench('S5_T6', 7, ['DeepSeek-V2-0506', 'DeepSeek-V2.5-0905', 'Qwen2.5 72B-Inst.', 'LLaMA-3.1 405B-Inst.', 'Claude-3.5-Sonnet-1022', 'GPT-4o-0513', 'DeepSeek-V3'],
                     ('Architecture', '# Activated Params', '# Total Params'), shots=False), at='S5.T6')
for tid, key, at in (('S5_T7', 'T7', 'S5.T7'), ('S5_T8', 'T8', 'S5.T8')):
    R, cap = rows(tid)
    T[key] = {'at': at, 'head': R[0], 'rows': R[1:], 'caption': cap}
R, cap = rows('S5_T9')
T['T9'] = {'at': 'S5.T9', 'head': ['Model', 'LiveCodeBench-CoT Pass@1', 'LiveCodeBench-CoT length', 'MATH-500 Pass@1', 'MATH-500 length'], 'rows': R[2:], 'caption': cap}
json.dump(T, open('tables.json', 'w'), indent=1, ensure_ascii=False)
print('tables', {k: len(v.get('rows', [])) for k, v in T.items()})
