"""Write tables.json from the extracted arXiv HTML tables (inputs/tables_v1.txt) and the printed labels of
Figures 1 and 3 (transcribed from the figure images, whose numbers are printed on the bars and wedges; no
value is read off a curve). Values keep their printed precision as strings plus a numeric copy.
usage: python3 mk_tables.py"""
import json, re

T = open('inputs/tables_v1.txt').read()
blocks = re.split(r'^=== ', T, flags=re.M)[1:]
tab = {b.split()[0]: b for b in blocks}
num = lambda s: float(s.replace(',', '').replace('%', ''))


def cells(block):
    return [c.strip() for c in re.split(r'\t\s*\n|\n\s*\n', block) if c.strip()]


def parse_t1(b):
    lines = [l.strip() for l in b.split('\n') if l.strip()]
    models, cur, rows = [], None, []
    i = lines.index('Avg. Output tokens') + 1
    names = ('GPT 5.1', 'GPT-5.4-mini', 'DeepSeek-v4-Flash', 'Gemini-3.1-Flash-Lite')
    settings = ('Baseline', 'Level 1', 'Level 2', 'Level 3', 'Level 4', 'SchrodingerRepo')
    while i < len(lines):
        l = lines[i]
        if l in names: cur = l; models.append(l); i += 1; continue
        if l in settings:
            vals = lines[i + 1:i + 5]; row = {'model': cur, 'setting': l}
            for k, v in zip(('pass', 'actions', 'input', 'output'), vals):
                m = re.match(r'([\d.,]+%?)\s*(\*{0,2})\s*(?:\(\s*\$\\(downarrow|uparrow)\$\s*([\d.]+)%\))?', v)
                row[k] = {'p': m.group(1), 'v': num(m.group(1)), 'sig': len(m.group(2))}
                if m.group(3): row[k]['dp'] = m.group(4); row[k]['dir'] = 1 if m.group(3) == 'uparrow' else -1
            rows.append(row); i += 5; continue
        i += 1
    return rows


def parse_t23(b, names):
    lines = [l.strip() for l in b.split('\n') if l.strip()]
    rows, cur, i = [], None, 0
    settings = ('Baseline', 'Level 1', 'Level 2', 'Level 3', 'Level 4', 'SchrodingerRepo')
    while i < len(lines):
        l = lines[i]
        if l in names: cur = l; i += 1; continue
        if l in settings:
            row = {'model': cur, 'setting': l}; j = i + 1; vals = []
            while len(vals) < 4 and j < len(lines):
                v = lines[j]
                if re.match(r'^[\d.,]+%?$', v): vals.append([v, None]); j += 1
                elif re.match(r'^\$\\(down|up)arrow\$', v) and vals:
                    m = re.match(r'^\$\\(down|up)arrow\$\s*([\d.]+%?)', v); vals[-1][1] = (m.group(1), m.group(2)); j += 1
                else: break
            while j < len(lines) and re.match(r'^\$\\(down|up)arrow\$', lines[j]):
                m = re.match(r'^\$\\(down|up)arrow\$\s*([\d.]+%?)', lines[j]); vals[-1][1] = (m.group(1), m.group(2)); j += 1
            for k, (v, d) in zip(('score', 'actions', 'input', 'output'), vals):
                row[k] = {'p': v, 'v': num(v)}
                if d: row[k]['dp'] = d[1]; row[k]['dir'] = 1 if d[0] == 'up' else -1
            rows.append(row); i = j; continue
        i += 1
    return rows


t1 = parse_t1(tab['S4.T1'])
t2 = parse_t23(tab['S5.T2'], ('GPT-5.4-mini', 'DeepSeek-v4-Flash'))
# Table III prints the unchanged Pass@1 change as a bare "0.00%" under the value, with no arrow
b3 = tab['S5.T3'].replace('17.27%\t\n\n0.00%', '17.27%\t\n\n $\\downarrow$  0.00%')
t3 = parse_t23(b3, ('GPT-5.4-mini',))
for r in t3:
    if 'score' in r: r['pass'] = r.pop('score')
assert t3[1]['pass']['v'] == 17.27 and t3[1]['actions']['v'] == 17.11, t3
out = {
 '_doc': 'Tables I to III of arXiv 2609.27891v1 as printed (p = printed string, v = number, dp = printed change, dir = arrow direction, sig = number of significance stars: 1 is p<0.05, 2 is p<0.01). Figures 1 and 3 from their printed labels.',
 'T1': {'title': 'Table I: Results on SWE-Bench Verified', 'at': 'S4.T1', 'rows': t1,
        'note': 'Gemini-3.1-Flash-Lite was run on the 300 instances with the strongest leakage evidence in Figure 1 (Section IV-A), the others on all 500; the Gemini row carries no significance stars.'},
 'T2': {'title': 'Table II: Results on SWE-QA (144 questions: Conan, Reflex, Streamlink, 48 each)', 'at': 'S5.T2', 'rows': t2},
 'T3': {'title': 'Table III: Results on the March 2026 SWE-rebench Leaderboard (110 instances)', 'at': 'S5.T3', 'rows': t3},
 'F1': {'title': 'Figure 1: human-judged task-specific recall on SWE-bench Verified (500 instances per model)', 'at': 'S1.F1',
        'cats': ['No valid recall', 'File/symbol recall', 'Repair-logic recall', 'Patch/test recall'],
        'rows': {'DeepSeek-v4-Flash': [171, 182, 1, 146], 'GPT 5.1': [152, 256, 2, 90], 'GPT-5.4-mini': [139, 268, 0, 93], 'Gemini-3.1-Flash-Lite': [124, 197, 40, 139]},
        'note': 'Printed bar labels; GPT 5.1 repair-logic 2 and DeepSeek 1 are call-out labels; GPT-5.4-mini has no repair-logic segment (0 by the 500 total).'},
 'F3': {'title': 'Figure 3: where the additional actions go under the full SchrodingerRepo setting (share of extra actions over baseline)', 'at': 'S5.F3',
        'cats': ['Navigate', 'Search', 'Read', 'Probe', 'Edit', 'Test'],
        'rows': {'DeepSeek-v4-Flash': [15.0, 17.9, 19.4, 31.4, 15.5, 1.0], 'GPT-5.4-mini': [3.0, 33.1, 41.8, 3.7, 18.5, None]},
        'note': 'Printed wedge labels. GPT-5.4-mini shows no Test wedge (by its other five labels, 100 minus 100.1 leaves nothing).'}
}
json.dump(out, open('tables.json', 'w'), indent=1)
print(len(t1), len(t2), len(t3))
for r in t1: print(r['model'], r['setting'], r['pass'], r['actions'].get('dp'))
for r in t2 + t3: print(r)
