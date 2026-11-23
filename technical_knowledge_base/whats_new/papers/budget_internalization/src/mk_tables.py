"""Transcribe the tables this page uses from the arXiv HTML extracts in inputs/ into tables.json (printed precision kept, as strings
turned into numbers only where the page computes). build.sh runs it first.

  python3 mk_tables.py

Tables: 1 (mean AIME length at the largest budget), 2 (Qwen base truncation), 3 (the ablations, with their 95% intervals),
6 (training-set difficulty), 7 (Qwen base answer forcing at matched total budgets), 8 (Figure 1's means), 9 (Reasoning Gym, AIME),
10 and 11 (GPQA-Diamond and LiveCodeBench v6), 12 (truncation rates), 13 and 14 (answer forcing, Gemma and Nemotron),
15 and 16 (every seed, validation-selected and final checkpoints).
"""
import json, os, re

HERE = os.path.dirname(os.path.abspath(__file__))
INP = os.path.join(HERE, 'inputs')


def toks(name):
    s = open(os.path.join(INP, 'table_' + name + '.txt'), encoding='utf-8').read()
    s = s.split('\n', 2)[2]  # drop the Source line
    return re.sub(r'\s+', ' ', s).strip()


NUM = r'-?\d+(?:\.\d+)?'
nums = lambda s: [float(x) for x in re.findall(NUM, s)]


def after(s, key, n):
    """The n numbers that follow the first occurrence of key in s."""
    i = s.index(key) + len(key)
    out = re.findall(NUM, s[i:])[:n]
    assert len(out) == n, (key, out)
    return [float(x) for x in out]


T = {}
B6 = ['2k', '4k', '8k', '16k', '32k', '64k']
B6s = ['512', '1k', '2k', '4k', '8k', '16k']
B8 = ['512', '1k', '2k', '4k', '8k', '16k', '32k', '64k']

# Table 8: Figure 1's means (accuracy % and mean length, k tokens)
s = toks('A4_T8')
q, g, n = s.split('Gemma4-E2B')[0], 'Gemma4-E2B' + s.split('Gemma4-E2B')[1].split('Nemotron-3-Nano-4B')[0], s.split('Nemotron-3-Nano-4B')[1]
def t8(block, budgets):
    out = {}
    for ck in ('Base', '1k-trained', '2k-trained', '4k-trained', '8k-trained'):
        if ck not in block: continue
        part = block[block.index(ck):]
        out[ck.replace('-trained', '')] = {'acc': after(part, 'Accuracy', 6), 'len': after(part, 'Length', 6)}
    return {'budgets': budgets, 'rows': out}
T['t8'] = {'Qwen3.5-4B': t8(q, B6), 'Gemma4-E2B': t8(g, B6s), 'Nemotron-3-Nano-4B': t8(n, B6s)}

# Table 9: Reasoning Gym checkpoints, AIME accuracy
s = toks('A4_T9')
T['t9'] = {'Qwen3.5-4B': {'budgets': B6, 'Base': after(s, 'Qwen3.5-4B Base', 6), 'RG 4k': after(s, 'RG 4k-trained', 6)},
           'Gemma4-E2B': {'budgets': B6s, 'Base': after(s, 'Gemma4-E2B Base', 6), 'RG 2k': after(s[s.index('Gemma4-E2B'):], 'RG 2k-trained', 6)},
           'Nemotron-3-Nano-4B': {'budgets': B6s, 'Base': after(s, 'Nemotron-3-Nano-4B Base', 6), 'RG 2k': after(s[s.index('Nemotron-3-Nano-4B'):], 'RG 2k-trained', 6)}}

# Tables 10 and 11: transfer (GPQA-Diamond, LiveCodeBench v6)
s = toks('A4_T10')
qs, gs, ns = s[:s.index('Gemma4-E2B')], s[s.index('Gemma4-E2B'):s.index('Nemotron-3-Nano-4B')], s[s.index('Nemotron-3-Nano-4B'):]
def t10(block, k, budgets):
    out = {'budgets': budgets}
    for task in ('GPQA', 'LCB-v6'):
        part = block[block.index(task + ' '):]
        part = part[:part.index('LCB-v6')] if task == 'GPQA' else part
        out[task] = {ck: after(part, ck + (' ' if ck == 'Base' else '-trained'), k) for ck in ('Base', '1k', '2k', '4k', '8k') if (ck + ('' if ck == 'Base' else '-trained')) in part}
    return out
T['t10'] = {'Qwen3.5-4B': t10(qs, 6, B6), 'Gemma4-E2B': t10(gs, 6, B6s), 'Nemotron-3-Nano-4B': t10(ns, 8, B8)}
s = toks('A4_T11')
T['t11'] = {'Qwen3.5-4B, RG 4k': {'budgets': B6, 'GPQA': after(s, 'RG 4k GPQA', 6), 'LCB-v6': after(s[s.index('RG 4k GPQA'):], 'LCB-v6', 6)},
            'Gemma4-E2B, RG 2k': {'budgets': B6s, 'GPQA': after(s, 'Gemma4-E2B, RG 2k GPQA', 6), 'LCB-v6': after(s[s.index('Gemma4-E2B, RG 2k'):], 'LCB-v6', 6)},
            'Nemotron-3-Nano-4B, RG 2k': {'budgets': B8, 'GPQA': after(s, 'Nemotron-3-Nano-4B, RG 2k GPQA', 8), 'LCB-v6': after(s[s.index('Nemotron-3-Nano-4B, RG 2k'):], 'LCB-v6', 8)}}

# Table 3: ablations, Qwen3.5-4B, 8k cap, AIME avg@16, value and 95% half-width
s = toks('S3_T3')
rows = [('Base model', 'Base model', 'Base model'), ('GRPO', 'DeepScaleR (standard)', 'GRPO DeepScaleR'), ('Data', 'GSM8K', 'GSM8K'),
        ('Data', 'Nemotron-RL-Math-v2', 'Nemotron-RL-Math-v2'), ('Truncation', 'Loss masking', 'Loss masking'),
        ('Truncation', 'DAPO overlength penalty', 'DAPO overlength penalty'), ('Truncation', 'Forced answer', 'Forced answer'),
        ('Normalization', 'Dr.GRPO', 'Dr.GRPO'), ('KL anchoring', 'β = 0.001', r'$\beta=0.001$'), ('KL anchoring', 'β = 0.01', r'$\beta=0.01$'),
        ('RFT', 'Short traces (< 4k)', 'Short traces ( $<$ 4K)'), ('RFT', 'Budget-forced traces (4k)', 'Budget-forced traces (4K)')]
t3 = []
for grp, name, key in rows:
    part = s[s.index(key) + len(key):]
    if key.startswith('Short'): part = part  # the "4K" inside the key is already consumed
    pairs = re.findall(r'(' + NUM + r') \$\\pm (' + NUM + r')\$', part)[:6]
    assert len(pairs) == 6, (key, pairs)
    t3.append({'group': grp, 'variant': name, 'acc': [float(a) for a, _ in pairs], 'ci': [float(b) for _, b in pairs]})
T['t3'] = {'budgets': B6, 'train': '8k', 'rows': t3}

# Table 1 (length at the largest budget), Table 2 (Qwen base truncation), Table 6 (datasets)
s = toks('S2_T1')
T['t1'] = [
    {'model': 'Qwen3.5-4B', 'at': '64k', 'base': after(s, 'Qwen3.5-4B base', 1)[0], 'trained': {c: after(s[s.index('Qwen3.5-4B'):], c + '-trained', 3) for c in ('4k', '8k')}},
    {'model': 'Gemma4-E2B', 'at': '16k', 'base': after(s, 'Gemma4-E2B base', 1)[0], 'trained': {c: after(s[s.index('Gemma4-E2B'):], c + '-trained', 3) for c in ('1k', '2k')}},
    {'model': 'Nemotron-3-Nano-4B', 'at': '16k', 'base': after(s, 'Nemotron-3-Nano-4B base', 1)[0], 'trained': {c: after(s[s.index('Nemotron-3-Nano-4B'):], c + '-trained', 3) for c in ('1k', '2k')}}]
s = toks('S2_T2')
T['t2'] = {'budgets': B6, 'AIME': after(s, 'AIME', 6), 'GPQA-Diamond': after(s, 'GPQA-Diamond', 6), 'LiveCodeBench v6': after(s, 'LiveCodeBench v6', 6)}
s = toks('A1_T6')
T['t6'] = [{'data': d, 'pass64k': after(s, d, 3)[0], 'trunc8k': after(s, d, 3)[1], 'median': int(re.search(re.escape(d) + r' \d+% \d+% ([\d,]+)', s).group(1).replace(',', ''))}
           for d in ('GSM8K', 'DeepScaleR', 'Nemotron-RL-Math-v2')]

# Table 12: truncation rates (Qwen budgets 2k..64k; Gemma and Nemotron 1k, 2k, 4k, 8k, 16k, 64k as printed)
s = toks('A5_T12')
T['t12'] = {}
for m, bud in (('Qwen3.5-4B', B6), ('Gemma4-E2B', ['1k', '2k', '4k', '8k', '16k', '64k']), ('Nemotron-3-Nano-4B', ['1k', '2k', '4k', '8k', '16k', '64k'])):
    blk = s[s.index(m):]
    nxt = [x for x in ('Gemma4-E2B', 'Nemotron-3-Nano-4B') if x in blk[len(m):]]
    if nxt: blk = blk[:blk.index(nxt[0], len(m))]
    T['t12'][m] = {'budgets': bud}
    for task in ('AIME', 'GPQA-Diamond', 'LiveCodeBench v6'):
        part = blk[blk.index(task):]
        T['t12'][m][task] = {ck: after(part, ck + ' ', 6) for ck in ('Base',) + tuple(c for c in ('1k-trained', '2k-trained', '4k-trained', '8k-trained') if c in part[:400])}

# Tables 7, 13, 14: base decoding against base answer forcing at matched total budgets
def forcing(name, cols):
    s = toks(name); out = {'cols': cols}
    for task in ('AIME', 'GPQA-Diamond', 'LCB-v6'):
        part = s[s.index(task + ' Total budget'):]
        tb = [int(x.replace(',', '')) for x in re.findall(r'\d{1,2},\d{3}', part)[:len(cols)]]
        acc = re.findall(r'(\d+\.\d+|–) / (\d+\.\d+)', part)[:len(cols)]
        out[task] = {'total': tb, 'base': [None if a == '–' else float(a) for a, _ in acc], 'forced': [float(b) for _, b in acc]}
    return out
T['t7'] = forcing('A3_T7', ['4k', '8k', '16k', '32k', '64k'])
T['t13'] = forcing('A8_T13', ['1k', '2k', '4k', '8k'])
T['t14'] = forcing('A8_T14', ['2k', '4k', '8k', '16k'])

# Tables 15 and 16: every seed (accuracy then length, budgets 512..64k)
def seeds(name):
    s = toks(name); out = {}
    for cond in ('Qwen 4k', 'Qwen 8k', 'Gemma 1k', 'Gemma 2k', 'Nemotron 1k', 'Nemotron 2k'):
        part = s[s.index(cond + ' ') + len(cond):]
        v = nums(part)[:3 * 18]
        out[cond] = [{'seed': int(v[18 * k]), 'step': int(v[18 * k + 1]), 'acc': v[18 * k + 2:18 * k + 10], 'len': v[18 * k + 10:18 * k + 18]} for k in range(3)]
        assert [r['seed'] for r in out[cond]] == [42, 43, 44], cond
    return {'budgets': B8, 'rows': out}
T['t15'] = seeds('A9_T15')
T['t16'] = seeds('A9_T16')

json.dump(T, open(os.path.join(HERE, 'tables.json'), 'w'), indent=1, ensure_ascii=False)
print('tables.json:', ', '.join(sorted(T)))
