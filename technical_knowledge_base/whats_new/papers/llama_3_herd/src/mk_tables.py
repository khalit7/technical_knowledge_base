"""Transcribe the paper's tables from the arXiv HTML extracts in inputs/ into tables.json (no retyping).
Values stay strings as printed ("72.3△", "–", "1,000.4"); recompute.py and the page parse them.
usage: python3 mk_tables.py   (after extract_paper.py and extract_figs.py)"""
import json, os, re

HERE = os.path.dirname(os.path.abspath(__file__))
IN = os.path.join(HERE, 'inputs')


def rows(name):
    t = open(os.path.join(IN, name)).read().split('\n', 2)[2]
    out, cur = [], []
    for line in t.split('\n'):
        if line.strip() == '':
            if cur: out.append(cur); cur = []
        else: cur.append(line.rstrip('\t').strip().replace(' $\\times$ ', 'x'))
    if cur: out.append(cur)
    return out


def pm(cell):
    """'89.0 $\\pm$ 4.8' -> ['89.0', '4.8']; '–' -> ['–', None]."""
    m = re.match(r'\s*([^$]+?)\s*\$\\pm\$\s*([\d.]+)', cell)
    return [m.group(1).strip(), m.group(2)] if m else [cell.strip(), None]


T = {'_doc': 'Tables of The Llama 3 Herd of Models (arXiv 2407.21783v3), transcribed by mk_tables.py from the arXiv HTML. Strings are kept as printed. Anchors are the arXiv HTML ids (the HTML numbers some tables one off from the paper: Table 9 is S5.T10).'}

# Table 2: finetuned models on key benchmarks
r = rows('table_S1_T2.txt')
models = [c.replace('\\rotate', '') for c in r[0][2:]]
t2, cat = [], ''
for row in r[1:-1]:
    if len(row) == 13: cat, row = row[0], row[1:]
    t2.append({'cat': cat, 'bench': row[0], 'v': row[1:]})
T['t2'] = {'anchor': 'S1.T2', 'models': models, 'size_class': [0, 0, 0, 1, 1, 1, 2, 2, 2, 2, 2], 'rows': t2,
           'notes': {'△': '5-shot prompting (no CoT)', '⊲': 'without CoT', '♢': 'zero-shot prompting'}}

# Table 3: hyperparameters
r = rows('table_S3_T3.txt')
T['t3'] = {'anchor': 'S3.T3', 'models': r[0], 'rows': [[x[0], x[1:]] for x in r[1:-1]]}

# Table 4: the 405B's parallelism configurations
r = rows('table_S3_T4.txt')
T['t4'] = {'anchor': 'S3.T4', 'cols': r[0], 'rows': r[1:-1]}

# Table 5: unexpected interruptions (one row is split over several cells in the HTML)
r = rows('table_S3_T5.txt')
t5, i, body = [], 0, r[1:-1]
while i < len(body):
    x = body[i]
    if x == ['Host Maintenance']:
        t5.append(['Host Maintenance', 'Unplanned Maintenance', body[i + 3][0], body[i + 3][1]]); i += 4; continue
    t5.append(x); i += 1
T['t5'] = {'anchor': 'S3.T5', 'cols': r[0], 'rows': t5}

# Tables 6 and 7: human preference data and SFT data
r = rows('table_S4_T6.txt')
T['t6'] = {'anchor': 'S4.T6', 'cols': ['Dataset', '% of comparisons', 'Avg. turns per dialog', 'Avg. tokens per example', 'Avg. tokens in prompt', 'Avg. tokens in response'], 'rows': r[2:-1]}
r = rows('table_S4_T7.txt')
T['t7'] = {'anchor': 'S4.T7', 'cols': ['Dataset', '% of examples', 'Avg. turns', 'Avg. tokens', 'Avg. tokens in context', 'Avg. tokens in final response'], 'rows': [[c.replace('$100\\%$', '100%') for c in x] for x in r if len(x) == 6 and x[0] not in ('Dataset',)]}

# Table 12: pre-trained math and reasoning (with the paper's 95% CIs)
r = rows('table_S5_T12.txt')
T['t12'] = {'anchor': 'S5.T12', 'cols': r[1], 'rows': [[x[0]] + [pm(c) for c in x[1:]] for x in r[2:-1]]}

# Table 15: contamination (the HTML figure also holds Table 14)
r = rows('table_S5_T15.txt')
k = [i for i, x in enumerate(r) if x and x[0].startswith('Contam')][0]
T['t15'] = {'anchor': 'S5.T15', 'cols': ['Benchmark', 'Contam. %', 'Gain 8B', 'Gain 70B', 'Gain 405B'], 'rows': [x for x in r[k + 2:] if len(x) == 5]}

# Tables 18, 21, 22: post-trained code, long context, tool use, with the paper's 95% CIs
for key, f, a in (('t18', 'table_S5_T18.txt', 'S5.T18'), ('t21', 'table_S5_T21.txt', 'S5.T21'), ('t22', 'table_S5_T22.txt', 'S5.T22')):
    r = rows(f)
    body = [x for x in r if len(x) >= 4 and any('pm' in c for c in x[1:])]
    T[key] = {'anchor': a, 'rows': [[x[0]] + [pm(c) for c in x[1:]] for x in body]}
T['t18']['cols'] = ['HumanEval', 'HumanEval+', 'MBPP', 'MBPP EvalPlus (base)']
T['t21']['cols'] = ['QuALITY', 'Qasper', 'SQuALITY', 'En.QA', 'En.MC', 'Multi-needle']
T['t22']['cols'] = ['Nexus', 'API-Bank', 'API-Bench', 'BFCL']
r = rows('table_S5_T20.txt')
T['t20'] = {'anchor': 'S5.T20', 'cols': r[0], 'rows': r[1:-1]}

# Figure 17 (human evaluations), read from the vector PDFs by extract_figs.py
F = json.load(open(os.path.join(IN, 'figs.json')))
T['f17'] = {'anchor': 'S5.F17', 'doc': F['fig17_doc'], 'panels': F['fig17']}

json.dump(T, open(os.path.join(HERE, 'tables.json'), 'w'), indent=1, ensure_ascii=False)
print('tables.json:', ', '.join(k for k in T if not k.startswith('_')))
