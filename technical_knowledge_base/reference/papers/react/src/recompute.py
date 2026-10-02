"""Recompute every derived number the ReAct page shows, from the paper's text, its tables (tables.json)
and the vector graphics of its figures (inputs/fig*.svg, the arXiv HTML v3 figure files).
Writes inputs/recompute.json, which build.sh embeds in the page (window.PAPER.rc).

  python3 recompute.py

What it does:
  1. Figure 2 and Figure 3 rebuilt from the SVG paths: every line vertex and bar top is converted to data
     units with the figure's own gridlines (axis tick values printed on the figure). No curve is read by eye.
  2. Checks against Table 1: which figure values agree with the table and which do not.
  3. Table 2 arithmetic: column sums, and whether the percentages can come from 50 labelled trajectories.
  4. Standard errors for the main comparisons (binomial, independent samples; a paired test would be
     tighter, but the paper releases no per-question results). HotpotQA and FEVER sizes are not stated in
     the paper; the released code uses 500 random dev questions, so n = 500 is labelled an assumption.
  5. The headline gaps (34 and 10 points), Table 3 row checks, and prompt sizes counted from Appendix C.
"""
import json, math, os, re

HERE = os.path.dirname(os.path.abspath(__file__))
IN = os.path.join(HERE, 'inputs')
TB = json.load(open(os.path.join(HERE, 'tables.json')))
R = {}


# ---------- 1. figures from their vector graphics ----------
def paths(svg):
    s = open(os.path.join(IN, svg)).read()
    return re.findall(r'<path transform="matrix\(1,0,0,-1,0,(\d+)\)"([^>]*)>', s)


def nums(d):
    return [float(x) for x in re.findall(r'-?\d+\.?\d*', d)]


def parse_path(d):
    """Absolute M, L and H commands with implicit repeats (all these figures use)."""
    toks = re.findall(r'[MLHVZ]|-?\d+\.?\d*', d); pts = []; cmd = 'M'; i = 0
    while i < len(toks):
        t = toks[i]
        if t in 'MLHVZ': cmd = t; i += 1; continue
        if cmd in 'ML': pts.append((float(t), float(toks[i + 1]))); i += 2; cmd = 'L'
        elif cmd == 'H': pts.append((float(t), pts[-1][1])); i += 1
        elif cmd == 'V': pts.append((pts[-1][0], float(t))); i += 1
        else: i += 1
    return pts


def line_fig(svg, ticks_y, ticks_x):
    """Lines of a seaborn line plot: returns {colour: [(x, y), ...]} in data units."""
    P = paths(svg)
    grid_h, grid_v, lines = [], [], {}
    for _, attrs in P:
        m = re.search(r'stroke="(#[0-9a-f]{6})"', attrs); d = re.search(r' d="([^"]*)"', attrs)
        if not m or not d: continue
        col, dd = m.group(1), d.group(1)
        if col == '#cccccc' and 'stroke-width="1"' in attrs:
            if not re.fullmatch(r'M[\d.]+ [\d.]+[HV][\d.]+', dd): continue  # the legend frame
            v = nums(dd)
            if 'V' in dd: grid_v.append(v[0])
            elif 'H' in dd: grid_h.append(v[1])
        elif col != '#cccccc':
            pts = parse_path(dd)
            if len(pts) > len(lines.get(col, [])): lines[col] = pts  # the legend swatches are 2-point lines
    grid_h.sort(); grid_v.sort()
    fy = lambda y: ticks_y[0] + (y - grid_h[0]) / (grid_h[-1] - grid_h[0]) * (ticks_y[-1] - ticks_y[0])
    fx = lambda x: ticks_x[0] + (x - grid_v[0]) / (grid_v[-1] - grid_v[0]) * (ticks_x[-1] - ticks_x[0])
    assert len(grid_h) == len(ticks_y) and len(grid_v) == len(ticks_x), (svg, len(grid_h), len(grid_v))
    return {c: [(round(fx(x), 3), round(fy(y), 3)) for x, y in pts] for c, pts in lines.items()}


# colours as in the FEVER panel's legend (the HotpotQA panel uses the same colours without a legend)
LEG = {'#4c72b0': 'CoT-SC -> ReAct', '#dd8452': 'ReAct -> CoT-SC', '#55a868': 'CoT-SC', '#c44e52': 'ReAct', '#8172b3': 'CoT'}
# HotpotQA panel: y gridlines printed 26, 28, 30, 32, 34; x gridlines 0, 5, 10, 15, 20
hq = line_fig('fig2_hotpotqa.svg', [26, 28, 30, 32, 34], [0, 5, 10, 15, 20])
fv = line_fig('fig2_fever.svg', [47.5, 50, 52.5, 55, 57.5, 60, 62.5, 65], [0, 5, 10, 15, 20])
fig2 = {}
for name, L in (('hotpotqa', hq), ('fever', fv)):
    fig2[name] = {LEG[c]: [[x, round(y, 2)] for x, y in pts] for c, pts in L.items()}
R['fig2'] = fig2

# Figure 3: bars. y = 0 at the axis, gridlines every 5 (printed 0 to 30)
def bar_fig(svg):
    P = paths(svg); bars = []; grid = []
    for _, attrs in P:
        f = re.search(r'fill="(#[0-9a-f]{6})"', attrs); d = re.search(r' d="([^"]*)"', attrs)
        s = re.search(r'stroke="(#[0-9a-f]{6})"', attrs)
        if s and s.group(1) == '#cccccc' and d and 'H' in d.group(1) and 'V' not in d.group(1) and 'stroke-width="1"' in attrs:
            v = nums(d.group(1)); grid.append((v[0], v[1]))
        if not f or f.group(1) == '#ffffff' or not d: continue
        v = nums(d.group(1))
        if len(v) < 4: continue  # the empty 540B finetune bars ("M0 0Z")
        x0, y0, x1, y1 = v[0], v[1], v[2], v[3]
        bars.append((f.group(1), x0, y0, y1))
    return bars, grid
bars, grid = bar_fig('fig3_finetune.svg')
left = sorted(set(round(y, 4) for x, y in grid if x < 100))
step5 = (left[-1] - left[0]) / (len(left) - 1)
COL3 = {'#5975a4': 'Standard', '#cc8963': 'CoT', '#5f9e6e': 'Act', '#b55d60': 'ReAct'}
fig3 = {'prompt': {}, 'finetune': {}}
for col, x0, y0, y1 in bars:
    if col not in COL3 or abs(y0 - 66.78) > .01: continue  # legend swatches are not on the axis
    panel = 'prompt' if x0 < 450 else 'finetune'
    base = 71.28 if panel == 'prompt' else 462.87
    size = ['8B', '62B', '540B'][int((x0 - base) // 124.05)]
    fig3[panel].setdefault(size, {})[COL3[col]] = round((y1 - y0) / step5 * 5, 2)
R['fig3'] = fig3

# ---------- 2. figures against Table 1 ----------
T1 = {r['m']: r for r in TB['t1']['rows']}
chk = []
for task, key in (('hotpotqa', 'hq'), ('fever', 'fv')):
    F = fig2[task]
    for m, tm in (('CoT', 'CoT'), ('ReAct', 'ReAct'), ('CoT-SC', 'CoT-SC'), ('CoT-SC -> ReAct', 'CoT-SC -> ReAct'), ('ReAct -> CoT-SC', 'ReAct -> CoT-SC')):
        fig_v = F[m][-1][1]; tab_v = float(T1[tm][key])
        chk.append({'task': task, 'method': m, 'figure_at_21': round(fig_v, 1), 'table1': tab_v, 'agree': abs(fig_v - tab_v) < 0.25})
R['fig2_vs_table1'] = chk
pr540 = fig3['prompt']['540B']
R['fig3_vs_table1'] = [{'method': m, 'figure': round(pr540[m], 1), 'table1': float(T1[m]['hq']), 'agree': abs(pr540[m] - float(T1[m]['hq'])) < 0.25} for m in ('Standard', 'CoT', 'Act', 'ReAct')]
# samples needed for each combination to reach CoT-SC's 21-sample score (the "3-5 samples" claim)
reach = {}
for task in ('hotpotqa', 'fever'):
    target = fig2[task]['CoT-SC'][-1][1]
    for m in ('CoT-SC -> ReAct', 'ReAct -> CoT-SC'):
        n = next((x for x, y in fig2[task][m] if y >= target - 1e-9), None)
        reach[task + ' ' + m] = {'cot_sc_21': round(target, 2), 'first_n_reaching_it': n}
R['reach_cotsc21'] = reach

# ---------- 3. Table 2 arithmetic ----------
t2 = TB['t2']
col = lambda k, rows: sum(r[k] for r in rows if r[k] is not None)
succ = [r for r in t2['rows'] if r['grp'] == 'Success']; fail = [r for r in t2['rows'] if r['grp'] == 'Failure']
R['t2'] = {'success_sum': {'ReAct': col('react', succ), 'CoT': col('cot', succ)}, 'failure_sum': {'ReAct': col('react', fail), 'CoT': col('cot', fail)}}
def consistent_n(pcts, nmax=60):
    out = []
    for n in range(1, nmax + 1):
        ks = [round(p / 100 * n) for p in pcts]
        if all(round(100 * k / n) == p for k, p in zip(ks, pcts)) and sum(ks) == n: out.append(n)
    return out
R['t2']['n_consistent'] = {
    'ReAct success': consistent_n([94, 6]), 'CoT success': consistent_n([86, 14]),
    'ReAct failure': consistent_n([47, 23, 0, 29]), 'CoT failure': consistent_n([16, 0, 56, 28])}
R['t2']['multiple_of_2'] = {k: all(p % 2 == 0 for p in v) for k, v in
    {'ReAct success': [94, 6], 'CoT success': [86, 14], 'ReAct failure': [47, 23, 0, 29], 'CoT failure': [16, 0, 56, 28]}.items()}

# ---------- 4. standard errors ----------
se = lambda p, n: math.sqrt(p * (1 - p) / n) * 100
def gap(a, b, n1, n2=None):
    n2 = n2 or n1; s = math.sqrt((a / 100) * (1 - a / 100) / n1 + (b / 100) * (1 - b / 100) / n2) * 100
    return {'a': a, 'b': b, 'gap': round(a - b, 1), 'se_gap': round(s, 2), 'z': round((a - b) / s, 2)}
N500 = 500
R['se'] = {
    'note': 'binomial, independent samples; HotpotQA and FEVER n = 500 is an assumption (the paper gives no n for Table 1; the released code runs 500 random dev questions)',
    'hotpotqa ReAct vs CoT': gap(27.4, 29.4, N500),
    'hotpotqa ReAct vs Act': gap(27.4, 25.7, N500),
    'hotpotqa ReAct->CoT-SC vs CoT-SC': gap(35.1, 33.4, N500),
    'fever ReAct vs CoT': gap(60.9, 56.3, N500),
    'fever ReAct vs Act': gap(60.9, 58.9, N500),
    'fever CoT-SC->ReAct vs CoT-SC': gap(64.6, 60.4, N500),
    'alfworld ReAct best vs Act best': gap(71, 45, 134),
    'alfworld ReAct avg vs Act best': gap(57, 45, 134),
    'alfworld ReAct best vs BUTLER': gap(71, 37, 134),
    'alfworld ReAct best vs ReAct-IM best': gap(71, 53, 134),
    'webshop ReAct vs Act': gap(40.0, 30.1, 500),
    'webshop ReAct vs IL': gap(40.0, 29.1, 500),
    'se one hotpotqa score near 30': round(se(.30, N500), 2),
    'se one alfworld score near 71': round(se(.71, 134), 2),
    'se one webshop score near 40': round(se(.40, 500), 2),
}
# number of labelled trajectories behind each Table 2 cell
R['t2']['per_cell'] = 50

# ---------- 5. headline gaps, Table 3 rows, prompt sizes ----------
R['headline'] = {'alfworld_abs_gain_vs_butler': 71 - 37, 'webshop_abs_gain_vs_il': round(40.0 - 29.1, 1), 'webshop_abs_gain_vs_ilrl': round(40.0 - 28.7, 1),
                 'webshop_gain_vs_act': round(40.0 - 30.1, 1), 'webshop_human_gap': round(59.6 - 40.0, 1),
                 'hotpotqa_gap_to_sota': round(67.5 - 35.1, 1), 'fever_gap_to_sota': round(89.5 - 64.6, 1)}
t3 = {r['m']: r for r in TB['t3']['rows']}
tasks = TB['t3']['cols']
R['t3'] = {m: {'unweighted_mean_of_tasks': round(sum(t3[m][t] for t in tasks) / 6, 1), 'all': t3[m]['All']} for m in t3}
R['t3']['react_im_tasks_behind_react_best'] = [t for t in tasks if t3['ReAct-IM (best of 6)'][t] < t3['ReAct (best of 6)'][t]]

txt = open(os.path.join(IN, 'paper_v3.txt'), encoding='utf-8').read().split('\n')
def words(a, b):
    L = [l for l in txt[a - 1:b - 1] if l.strip() and 'Continued' not in l and 'Prompts' not in l]
    return sum(len(l.split()) for l in L)
R['prompt_words'] = {'HotpotQA Standard (6 exemplars)': words(963, 1012), 'HotpotQA Act': words(1013, 1178),
                     'HotpotQA CoT': words(1179, 1252), 'HotpotQA ReAct': words(1253, 1503),
                     'FEVER Standard (3 exemplars)': words(1508, 1535), 'FEVER Act': words(1536, 1603), 'FEVER CoT': words(1604, 1647), 'FEVER ReAct': words(1648, 1747)}
R['prompt_words']['ReAct over Standard, HotpotQA'] = round(R['prompt_words']['HotpotQA ReAct'] / R['prompt_words']['HotpotQA Standard (6 exemplars)'], 1)

json.dump(R, open(os.path.join(IN, 'recompute.json'), 'w'), indent=1)
if __name__ == '__main__':
    print(json.dumps({k: R[k] for k in ('fig2_vs_table1', 'fig3', 'reach_cotsc21', 't2', 'headline', 't3', 'prompt_words')}, indent=1))
    for k, v in R['se'].items(): print(k, v)
