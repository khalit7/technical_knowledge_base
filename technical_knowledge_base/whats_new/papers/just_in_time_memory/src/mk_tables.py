"""Transcribe the paper's tables into tables.json.
Tables 1, 2 and 9 are parsed from the LaTeX sources in the arXiv e-print (inputs/tex/, copied verbatim), so every
value keeps its printed precision; the small Tables 3 to 8 are typed from inputs/tables_v1.txt and checked against it.
Each Table 1 / Table 9 baseline row is marked with where its numbers first appeared: rows identical to SkillOS's own
Tables 1 and 2 (inputs/skillos_tables.txt) are marked "skillos" (copied), the rest "own" (run by the authors).
usage: python3 mk_tables.py   (build.sh runs it)"""
import json, re, os
HERE = os.path.dirname(os.path.abspath(__file__)); os.chdir(HERE)

def clean(s):
    s = re.sub(r'\\adjustbox\{valign=c\}\{\\frozenmark\}', 'P:', s); s = re.sub(r'\\adjustbox\{valign=c\}\{\\firemark\}', 'RL:', s)
    s = s.replace('\\skillos{}', 'SkillOS').replace('\\skillos', 'SkillOS').replace('\\ourmethod{}', 'JitMem').replace('\\ourmethod', 'JitMem').replace('\\phantom{0}', '').replace('\\quad', '')
    s = re.sub(r'\\textcolor\{blue\}\{((?:[^{}]|\{[^{}]*\}|\{(?:[^{}]|\{[^{}]*\})*\})*)\}', r'\1', s)
    s = re.sub(r'\\rowcolor\{[^}]*\}', '', s); s = s.replace('\\ ', ' ').replace('\\', '')
    return s.strip()

def parse(fn, ncol):
    rows, block = [], None
    lines = open('inputs/tex/' + fn).read().split('\n')
    buf = ''
    for ln in lines:
        m = re.search(r'Executor: ([^}]+)\}', ln)
        if m: block = m.group(1); buf = ''; continue
        if block is None or ln.strip().startswith(('\\midrule', '\\bottomrule', '\\hdashline', '\\cmidrule', '%')): continue
        buf += ' ' + ln
        if '\\\\' not in ln: continue
        row, buf = buf.replace('\\\\', ''), ''
        if 'valstd' not in row and '--' not in row: continue
        vals = re.findall(r'\\valstd\{(?:\\phantom\{0\})?([0-9.]+)\}\{([0-9.]+)\}|(?<![-a-z])(--)(?!-)', row)
        cells = [c.strip() for c in row.split('&')]
        name = clean(cells[0]); cur = clean(cells[1]) if len(cells) > 1 else ''
        kind = 'RL' if cur.startswith('RL:') else ('P' if cur.startswith('P:') else '')
        cur = cur.replace('RL:', '').replace('P:', '').strip()
        v = [None if x[2] else [float(x[0]), float(x[1])] for x in vals][-ncol:]
        rows.append({'exec': block, 'method': name, 'curator': cur if cur != '---' else '', 'trained': kind == 'RL', 'v': v})
    return rows

sk = open('inputs/skillos_tables.txt').read()
def provenance(r, cols):
    # a row is "copied" if all of its values with their std appear, in order, on one SkillOS table line with the same method name
    if r['method'] in ('JitMem', 'JitMem-base', 'JitMem-gemini', 'JitMem-gpt') or r['method'].startswith(('w/', 'w/o')): return ['own'] * len(r['v'])
    # SkillOS prints ALFWorld (first column) in its Table 1 and the two WebShop columns in its Table 2
    # per cell: the value with its std on a SkillOS line for the same method (curator names differ in case only)
    mine = [l for l in sk.split('\n') if l.split('  ')[0].strip().lower() == r['method'].lower() and r['curator'].lower() in l.lower()]
    return ['skillos' if x and any(('%.1f±%.1f' % tuple(x)) in l for l in mine) else 'own' for x in r['v']]

T = {}
t1 = parse('merged_alfworld_webshop.tex', 3)
for r in t1: r['src'] = provenance(r, 3)
T['t1'] = {'title': 'Table 1: ALFWorld and WebShop, three frozen executors', 'at': 'S4.T1', 'cols': ['ALFWorld SR', 'WebShop score', 'WebShop SR'], 'note': 'Mean and standard deviation over 3 runs with different task orderings.', 'rows': t1}
t2 = parse('tau_bench_infer.tex', 5)
for r in t2: r['src'] = ['own'] * len(r['v'])
T['t2'] = {'title': 'Table 2: tau2-bench with GPT-5.4 as executor (SR)', 'at': 'S4.T2', 'cols': ['Airline', 'Retail', 'Telecom', 'Macro avg.', 'Micro avg.'], 'note': 'Mean and standard deviation over 4 runs with different task orderings.', 'rows': t2}
t9 = parse('combined_ablation.tex', 3)
for r in t9: r['src'] = provenance(r, 3)
T['t9'] = {'title': 'Table 9: every ablation and baseline, ALFWorld and WebShop', 'at': 'A2.T9', 'cols': ['ALFWorld SR', 'WebShop score', 'WebShop SR'], 'note': 'Mean and standard deviation over 3 runs.', 'rows': t9}
# Small tables, typed from inputs/tables_v1.txt
T['t3'] = {'title': 'Table 3: executor transfer on ALFWorld (SR)', 'at': 'S4.T3', 'cols': ['Qwen3-8B executor', 'GPT-5.4 executor'], 'rows': [
    {'method': 'No training (JitMem-base)', 'v': [[60.5, 2.6], [79.3, 3.6]]}, {'method': 'Trained with Qwen3-8B executor', 'v': [[77.4, 2.9], [86.7, 0.7]]},
    {'method': 'Trained with GPT-5.4 executor', 'v': [None, [88.1, 0.9]]}, {'method': 'Transfer gap (printed)', 'v': [None, [1.4, 0]]}]}
T['t4'] = {'title': 'Table 4: tokens (thousands) and steps per task, ALFWorld, GPT-5.4 executor', 'at': 'S4.T4', 'cols': ['Input tokens (K)', 'Output tokens (K)', 'Steps'], 'rows': [
    {'method': 'No Memory', 'v': [9.0, 1.40, 17.8]}, {'method': 'ReasoningBank', 'v': [19.7, 1.26, 16.2]}, {'method': 'SkillOS-base', 'v': [22.4, 1.36, 16.9]},
    {'method': 'JitMem-base', 'v': [10.9, 1.00, 13.2]}, {'method': 'JitMem', 'v': [9.8, 0.87, 11.6]}]}
T['t5'] = {'title': 'Table 5: staged bank refresh and test bank warm-starting, WebShop', 'at': 'S4.T5', 'cols': ['Score', 'SR'], 'rows': [
    {'exec': 'Qwen3-8B', 'method': 'JitMem', 'v': [[61.1, 0.9], [32.8, 1.7]]}, {'exec': 'Qwen3-8B', 'method': 'w/ staged bank refresh', 'v': [[61.7, 0.9], [35.6, 0.3]]}, {'exec': 'Qwen3-8B', 'method': 'w/ test bank warm-starting', 'v': [[60.9, 1.0], [32.5, 1.5]]},
    {'exec': 'Gemini-2.5-Pro', 'method': 'JitMem', 'v': [[61.0, 0.8], [50.5, 0.8]]}, {'exec': 'Gemini-2.5-Pro', 'method': 'w/ staged bank refresh', 'v': [[61.0, 0.3], [50.5, 1.1]]}, {'exec': 'Gemini-2.5-Pro', 'method': 'w/ test bank warm-starting', 'v': [[61.7, 0.4], [50.9, 0.3]]},
    {'exec': 'GPT-5.4', 'method': 'JitMem', 'v': [[53.8, 0.3], [45.4, 0.0]]}, {'exec': 'GPT-5.4', 'method': 'w/ staged bank refresh', 'v': [[53.6, 0.4], [46.3, 0.1]]}, {'exec': 'GPT-5.4', 'method': 'w/ test bank warm-starting', 'v': [[51.9, 0.3], [44.1, 0.4]]}]}
T['t6'] = {'title': 'Table 6: no-memory baseline, SkillOS reported against the authors\' reproduction', 'at': 'A1.T6', 'cols': ['ALFWorld SR', 'WebShop score', 'WebShop SR'], 'rows': [
    {'exec': 'Qwen3-8B', 'method': 'SkillOS reported', 'v': [[47.9, 1.2], [33.3, 0.7], [9.8, 0.5]]}, {'exec': 'Qwen3-8B', 'method': 'Reproduced (non-thinking)', 'v': [[34.5, 0.3], [36.4, 0.2], [8.6, 1.1]]},
    {'exec': 'Qwen3-8B', 'method': 'Reproduced (thinking)', 'v': [[42.1, 1.0], [29.0, 0.3], [4.4, 0.7]]},
    {'exec': 'Gemini-2.5-Pro', 'method': 'SkillOS reported', 'v': [[66.4, 2.0], [48.6, 0.3], [38.4, 0.5]]}, {'exec': 'Gemini-2.5-Pro', 'method': 'Reproduced', 'v': [[63.6, 1.3], [47.3, 0.8], [37.5, 0.5]]}]}
T['t8'] = {'title': 'Table 8: number of retrieved trajectories k, WebShop', 'at': 'A2.T8', 'cols': ['Score', 'SR'], 'rows': [
    {'exec': 'Qwen3-8B', 'method': 'k = 3', 'v': [[61.1, 0.9], [32.8, 1.7]]}, {'exec': 'Qwen3-8B', 'method': 'k = 5', 'v': [[60.5, 0.4], [32.8, 0.3]]},
    {'exec': 'Gemini-2.5-Pro', 'method': 'k = 3', 'v': [[61.0, 0.8], [50.5, 0.8]]}, {'exec': 'Gemini-2.5-Pro', 'method': 'k = 5', 'v': [[59.2, 0.4], [48.6, 0.7]]},
    {'exec': 'GPT-5.4', 'method': 'k = 3', 'v': [[53.8, 0.3], [45.4, 0.0]]}, {'exec': 'GPT-5.4', 'method': 'k = 5', 'v': [[53.4, 0.7], [45.3, 0.8]]}]}
# check the typed tables against the extracted text: every printed value must occur in the HTML extract
txt = open('inputs/tables_v1.txt').read()
for k in ('t3', 't5', 't6', 't8'):
    for r in T[k]['rows']:
        for x in r['v']:
            if x and not re.search(r'\$%s_\{' % re.escape('%.1f' % x[0]) + r'.{0,80}?scriptscriptstyle %s\}' % re.escape('%.1f' % x[1]), txt) and not (k == 't3' and x == [1.4, 0]):
                raise SystemExit('typed value not found in extract: %s %s %s' % (k, r['method'], x))
for r in T['t4']['rows']:
    for x in r['v']:
        if not re.search(r'\b0?%s\b' % re.escape(('%.2f' % x) if x < 2 else '%.1f' % x), txt): raise SystemExit('t4 value not found %s' % x)
fig = json.load(open('inputs/fig_curves.json'))
T['fig'] = {'title': 'Figures 5 and 6: validation curves during GRPO training (decoded from the vector PDFs)', 'at': 'A2.F5', 'series': fig}
json.dump(T, open('tables.json', 'w'), indent=1)
n = {k: len(v['rows']) for k, v in T.items() if 'rows' in v}
cp = sum(c == 'skillos' for r in t1 for c in r['src']); tot = sum(len(r['v']) for r in t1 if not r['method'].startswith('JitMem'))
print('tables', n, 'Table 1 baseline cells copied from SkillOS:', cp, 'of', tot)
