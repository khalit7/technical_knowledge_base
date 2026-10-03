"""Transcribe HarnessDev's tables (arXiv 2609.01437v1) from inputs/tables_v1.txt into tables.json.
Printed strings are kept (precision as printed); numeric copies are added for the page's charts.

  python3 mk_tables.py      (build.sh runs it)
"""
import json, os, re

HERE = os.path.dirname(os.path.abspath(__file__))
raw = open(os.path.join(HERE, 'inputs', 'tables_v1.txt'), encoding='utf-8').read().replace('\xa0', ' ')
blocks = {}
for b in raw.split('=== ')[1:]:
    tid = b.split()[0]
    body = re.sub(r'\s*\t\s*', '\t', b)
    body = re.sub(r'\n\s*\n+', '\n', body).replace('$', '')
    blocks[tid] = body

CREATORS = ['Opus 4.8', 'GPT-5.5', 'Gemini 3.1 Pro', 'DeepSeek V4 Pro', 'Qwen 3.7 Max', 'Seed 2.0 Pro']
ROWNAMES = ['Seed harness H_{\\mathrm{seed}}', 'Opus 4.8 High', 'GPT-5.5 High', 'Gemini 3.1 Pro High', 'DeepSeek V4 Pro High', 'Qwen 3.7 Max', 'Seed 2.0 Pro High', 'Human harness + paired model']
COLS = ['swe', 'swe_tok', 'term', 'term_tok', 'mle', 'mle_tok', 'eq', 'eq_tok', 'bc', 'bc_tok', 'avg']


def num(s):
    s = s.replace('{,}', '').replace('\\textsuperscript{*}', '').replace('\\textsuperscript{\\ddagger}', '').strip()
    return None if s in ('\u2014', '') else float(s)


def flags(s):
    return ('*' if 'textsuperscript{*}' in s else '') + ('‡' if 'ddagger' in s else '')


def score_table(tid):
    cells = [c for c in blocks[tid].replace('\n', '\t').split('\t')]
    rows = []
    for name in ROWNAMES:
        if name not in cells: continue
        i = cells.index(name)
        vals = cells[i + 1:i + 12]
        r = {'row': name.replace(' High', '').replace('Seed harness H_{\\mathrm{seed}}', 'Seed harness').replace('Human harness + paired model', 'Human reference')}
        for k, v in zip(COLS, vals):
            r[k] = num(v)
            p = v.replace('{,}', ',').replace('\\textsuperscript{*}', '').replace('\\textsuperscript{\\ddagger}', '').strip().replace('\u2014', 'n/a')
            r[k + '_p'] = p
            if flags(v): r[k + '_f'] = flags(v)
        rows.append(r)
    return rows


T = {}
T['T2'] = {'src': 'S3.T2', 'title': 'Table 2: downstream evaluation coverage for Creation', 'rows': [
    {'domain': 'Code', 'bench': 'SWE-bench Pro, public split (SWE-Pro)', 'tasks': 731, 'metric': 'Task success'},
    {'domain': 'Code', 'bench': 'Terminal-Bench 2.1', 'tasks': 89, 'metric': 'Task success'},
    {'domain': 'Data analysis', 'bench': 'MLE-bench', 'tasks': 75, 'metric': 'Medal score'},
    {'domain': 'Writing', 'bench': 'EQ-Bench3', 'tasks': 46, 'metric': 'Rubric score'},
    {'domain': 'Research', 'bench': 'BrowseComp', 'tasks': 1266, 'metric': 'Accuracy'}]}
for b in ('SWE-bench Pro', 'Terminal-Bench 2.1', 'MLE-bench', 'EQ-Bench3', 'BrowseComp'):
    assert b in blocks['S3.T2'], b
T['T3'] = {'src': 'S4.T3', 'title': 'Table 3: Creation under Self-Eval (creator runs its own harness), avg@3; tok. = mean executor tokens per harness, millions', 'rows': score_table('S4.T3')}
T['T4'] = {'src': 'S4.T4', 'title': 'Table 4: Creation under a fixed Gemini 3.1 Pro executor (Unified-Eval), avg@3', 'rows': score_table('S4.T4')}

# Table 5: edit size of the frozen RQ1 Code artifacts
t5 = []
for line in re.findall(r'(Opus 4\.8|GPT-5\.5|Gemini 3\.1 Pro|DeepSeek V4 Pro|Qwen 3\.7 Max|Seed 2\.0 Pro)\t(\d+/\d+/\d+)\t([\d,]+)\t([\d,]+)\t([\d,]+–[\d,]+)\t([\d.]+)\t([\d.]+)', blocks['S4.T5']):
    c, f, loc, med, rng, swe, term = line
    t5.append({'creator': c, 'files': f, 'loc': int(loc.replace(',', '')), 'median': int(med.replace(',', '')), 'range': rng, 'swe': float(swe), 'term': float(term), 'swe_p': swe, 'term_p': term})
T['T5'] = {'src': 'S4.T5', 'title': 'Table 5: edit size of the frozen RQ1 Code artifacts (three per creator)', 'rows': t5}

# Table 6: RQ2 feedback-set gains and held-out-630 generalisation
t6 = []
pat = r'(Self|Fixed Gemini)\t(Gemini 3\.1 Pro|Opus 4\.8|Qwen 3\.7 Max|DeepSeek V4 Pro|GPT-5\.5)\t\s*([\d.]+)\\!\\rightarrow\\!([\d.]+)\s*\n?\s*\(([+-][\d.]+)\)\s*\n?\s*\t?\s*([\d.]+)\\!\\rightarrow\\!([\d.]+)\s*\n?\s*\(([+-][\d.]+)\)\s*\n?\s*\t?\s*([\d.]+)'
for m in re.finditer(pat, blocks['S4.T6']):
    s, c, a, b, d, ha, hb, hd, gap = m.groups()
    t6.append({'setting': s, 'creator': c, 'fb0': float(a), 'fbd': float(b), 'fbgain': d, 'ho0': float(ha), 'hod': float(hb), 'hogain': hd, 'gap': float(gap)})
assert len(t6) == 9, len(t6)
T['T6'] = {'src': 'S4.T6', 'title': 'Table 6: Evolution, feedback pair H0 to declared, and held-out-630 H0 to declared', 'rows': t6}

# Table 7: code edit size of the nine RQ2 lineages
t7 = []
for m in re.finditer(r'(Self|Fixed Gemini)\t(Gemini 3\.1 Pro|Opus 4\.8|Qwen 3\.7 Max|DeepSeek V4 Pro|GPT-5\.5)\t(\d+)\t(\d+) files, \+(\d+)/-(\d+)\t([^\t]+?)\t', blocks['S4.T7'] + '\t'):
    s, c, sw, fl, ad, de, focus = m.groups()
    t7.append({'setting': s, 'creator': c, 'switches': int(sw), 'files': int(fl), 'add': int(ad), 'del': int(de), 'focus': focus.strip()})
assert len(t7) == 9, len(t7)
T['T7'] = {'src': 'S4.T7', 'title': 'Table 7: code edit size of the nine Evolution lineages (H0 to declared)', 'rows': t7}

T['T9'] = {'src': 'A2.T9', 'title': 'Table 9: the human-engineered reference systems behind Table 3\'s human row', 'rows': [
    {'bench': 'SWE-Pro', 'harness': 'Public coding-agent setup', 'model': 'Claude Fable 5', 'score': '80.0*'},
    {'bench': 'Terminal-Bench 2.1', 'harness': 'OpenAI agent setup', 'model': 'GPT-5.6 Sol', 'score': '88.8*'},
    {'bench': 'MLE-bench', 'harness': 'MLEvolve', 'model': 'Gemini 3.1', 'score': '24.0'},
    {'bench': 'EQ-Bench3', 'harness': 'Kimi Writer', 'model': 'Opus 4.8', 'score': '83.7'},
    {'bench': 'BrowseComp', 'harness': 'OpenAI browsing stack', 'model': 'GPT-5.6 Sol', 'score': '92.2*'}]}
for r in T['T9']['rows']:
    assert r['harness'] in blocks['A2.T9'] and r['model'] in blocks['A2.T9'], r

# Figures 7 and 8, decoded (decode_figs.py): per-version feedback and held-out scores of the nine lineages
F = json.load(open(os.path.join(HERE, 'inputs', 'figs.json')))
lin = []
order = ['Gemini 3.1 Pro', 'Opus 4.8', 'Qwen 3.7 Max', 'DeepSeek V4 Pro', 'GPT-5.5']
for si, setting in enumerate(('Self', 'Fixed Gemini')):
    p7s = F['fig7']['panels']['self_swe100' if si == 0 else 'fixed_swe100']
    p7t = F['fig7']['panels']['self_term89' if si == 0 else 'fixed_term89']
    for ci, c in enumerate(order):
        if si == 1 and c == 'Gemini 3.1 Pro': continue  # the Gemini control is listed once
        p8 = F['fig8']['panels'][si * 5 + ci]
        swe = [round(x['v']) for x in p7s['series'][c]['dark']]
        term_pct = [x['v'] for x in p7t['series'][c]['dark']]
        term = [round(v * 89 / 100) for v in term_pct]  # tasks passed out of 89
        swe8 = [round(x['v']) for x in p8['series'][c]['light']]
        ho = [round(x['v'] * 630 / 100) for x in p8['series'][c]['dark']]  # tasks passed out of 630
        assert swe8 == swe, (setting, c, swe8, swe)
        lin.append({'setting': setting, 'creator': c, 'swe100': swe, 'term89': term, 'ho630': ho,
                    'declared': p7s['stars'][c][0]['i'],
                    'max_dev': {'term_pct': round(max(abs(v * 89 / 100 - round(v * 89 / 100)) for v in term_pct), 4),
                                'ho_pct': round(max(abs(x['v'] * 630 / 100 - round(x['v'] * 630 / 100)) for x in p8['series'][c]['dark']), 4)}})
T['lineages'] = {'src': 'S4.F7', 'title': 'Figures 7 and 8 decoded: tasks passed per official version (SWE-Pro-100, Terminal-Bench-89, held-out SWE-Pro-630)', 'rows': lin}

json.dump(T, open(os.path.join(HERE, 'tables.json'), 'w'), indent=1, ensure_ascii=False)
print('tables.json:', ', '.join('%s %d rows' % (k, len(v['rows'])) for k, v in T.items()))
