"""Build tables.json from the arXiv HTML v2 extract (inputs/paper_v2.txt, tables_v2.txt), the decoded figures
(inputs/figs.json from v1, inputs/figs_v2.json from v2) and the SimpleTES extract (inputs/extracts.txt). Every value
is parsed, not typed, and asserted against the printed numbers that the paper's text also quotes.
Since 2026-10-26 the page follows v2. The runs drawn in both versions (Lasso dynamics, kernels, guidance, behaviour)
are taken from the v1 decode, and recompute.py checks that v2 redraws the same points; the figures and tables only
v2 has (harness, PACEvolve, Table 2, Table 3) come from v2. Keys are named by content, not by figure number,
because v2 renumbers the figures (v1 Figure 3 is v2 Figure 4 and so on).

  python3 mk_tables.py      (build.sh runs it)
"""
import json, re

T = open('inputs/paper_v2.txt').read()
TT = open('inputs/tables_v2.txt').read()
F = json.load(open('inputs/figs.json'))['figures']
F2 = json.load(open('inputs/figs_v2.json'))['figures']
X = open('inputs/extracts.txt').read()

def cells(block):
    return [c.strip() for c in block.split('\t') if c.strip() != '']

# ---- Figure 4(a) in v2 (3(a) in v1): the Lasso table (a table inside a figure environment, S4.F4) ----
a = T.index('Method\t\nModel\t\nCompute'); b = T.index('(a) Final performance of running time (ms).')
c = [x.strip() for x in T[a:b].replace('\t', '\n').split('\n') if x.strip()]
DS = ['Gisette', 'RCV1', 'DNA', 'Leukemia', 'Colon', 'Duke Breast']
assert c[3:5] == ['Non-biological', 'Biological'] and c[6:12] == DS, c[:14]
rows, i, group = [], 12, None
num = lambda s: None if s in ('–', '-') else float(s.replace(',', ''))
while i < len(c):
    if c[i] in ('Previous solvers', 'Our System'): group = c[i]; i += 1; continue
    name = c[i]
    if name.startswith('SimpleTES $\\dagger$') or name == 'SimpleTES $\\dagger$': name = 'SimpleTES†'
    if c[i + 1].startswith('Gemini') or c[i + 1].startswith('gpt') or c[i + 1] == '–':
        model = c[i + 1]; vals = c[i + 2:i + 10]; i += 10
    else:  # a method row followed by its second model row (Recursive Fixed Exploration, Dream-RSI)
        raise SystemExit('unexpected row at ' + str(c[i:i + 10]))
    rows.append({'group': group, 'method': name, 'model': model, 'compute': num(vals[0]), 'ms': [num(v) for v in vals[1:7]], 'avg': num(vals[7])})
    # the second model of the same method has no method cell
    while i < len(c) and c[i].startswith('Gemini'):
        vals = c[i + 1:i + 9]
        rows.append({'group': group, 'method': name, 'model': c[i], 'compute': num(vals[0]), 'ms': [num(v) for v in vals[1:7]], 'avg': num(vals[7])})
        i += 9
assert len(rows) == 8, len(rows)
assert [r['avg'] for r in rows] == [44180.3, 13767.5, 3804.8, 8318.4, 3587.1, 2516.7, 2931.0, 2350.6]

# SimpleTES's own Supplementary Table 16 (its machine): glmnet, sklearn, SimpleTES for the same six datasets
st = {}
blk = X[X.index('Supplementary Table 16'):X.index('== SimpleTES Table 1')]
for name, key in (('Gisette', 'Gisette'), ('RCV1', 'RCV1'), ('DNA', 'DNA'), ('Leukemia', 'Leukemia'), ('Colon Cancer', 'Colon'), ('Duke Breast Cancer', 'Duke Breast')):
    m = re.search(re.escape(name) + r' \( [^)]*\) ([\d.]+) ([\d.]+) ([\d.]+)', blk)
    st[key] = {'glmnet': float(m.group(1)), 'sklearn': float(m.group(2)), 'simpletes': float(m.group(3))}

lasso = {'datasets': DS, 'bio': [False, False, True, True, True, True], 'rows': rows, 'simpletes_supp16': st,
         'bold': 'only the Dream-RSI Gemini-3.7-Flash average (2350.6) is bold', 'at': 'S4.F4'}

# ---- Table 1: mathematics ----
a = T.index('Method\t\nLLM\t\nSum Diff'); b = T.index('4.2 Mathematics Optimization')
c = [x.strip() for x in T[a:b].replace('\t', '\n').split('\n') if x.strip()]
c = c[5:]
mrows, i = [], 0
while i < len(c):
    if c[i] == 'Our System': i += 1; continue
    mrows.append({'method': c[i], 'llm': c[i + 1], 'sumdiff': num(c[i + 2]), 'autocorr': num(c[i + 3]), 'circle': num(c[i + 4])}); i += 5
assert len(mrows) == 11 and mrows[-1]['method'] == 'Dream-RSI' and mrows[-1]['sumdiff'] == 1.145427
m = re.search(r'Third autocorrelation inequality Bound \( \\downarrow \) Together AI \[ 143 \] ([\d.]+) ([\d.]+)', X)
math = {'rows': mrows, 'at': 'S4.T1',
        'bold': {'sumdiff': [1.145427], 'autocorr': [1.453675], 'circle': [2.635983]},
        'simpletes_t1': {'third_autocorr_prev_best': {'by': 'Together AI', 'v': float(m.group(1))}, 'third_autocorr_simpletes': float(m.group(2)),
                          'sumdiff_posttrained': 1.144887}}
assert math['simpletes_t1']['third_autocorr_simpletes'] == 1.453675

# ---- decoded figures ----
def panel(fid, pn): return [p for p in F[fid] if p['panel'] == pn][0]
def panel2(fid, pn): return [p for p in F2[fid] if p['panel'] == pn][0]
def from_markers(p, col):
    return sorted(p['markers'][col])

def r4(v): return round(v, 4)
lasso_dyn = {}
for pn, key in ((0, 'pro'), (1, 'flash')):
    p = panel('S4.F3', pn)  # v1 numbering (v2 Figure 4b)
    lasso_dyn[key] = {'fixed': [[round(x), round(y, 1)] for x, y in p['lines']['#0000BF'][0]],
                  'dream': [[round(x), round(y, 1)] for x, y in p['lines']['#CC0000'][0]],
                  'ycal_resid_ms': round(p['ycal_resid'], 3)}
assert lasso_dyn['pro']['fixed'][-1] == [550, 3587.0] and lasso_dyn['pro']['dream'][-1] == [317, 2931.0]
assert lasso_dyn['flash']['dream'][-1] == [1879, 2350.6]

def runs(ln):
    """Round values from a pgfplots step line: the y of each horizontal run, keyed by the x where it starts,
    plus the final vertex (the last round). Zero-length runs (a round with no change) are kept."""
    out = []
    for (x0, y0), (x1, y1) in zip(ln, ln[1:]):
        if abs(y1 - y0) < 1e-9 and x1 - x0 > 0.5 and x0 > 0.5: out.append([round(x0), r4(y0)])
    out.append([round(ln[-1][0]), r4(ln[-1][1])])
    res = []
    for x, y in out:
        if res and res[-1][0] == x: res[-1] = [x, y]
        else: res.append([x, y])
    return res

kern = {}
for pn, key in ((0, 'VGG16'), (1, 'LayerNorm'), (2, 'ConvDiv'), (3, 'ConvMax')):
    p = panel('S4.F4', pn)  # v1 numbering (v2 Figure 3)
    kern[key] = {'dream': runs(p['lines']['#0072B2'][0]), 'fixed': runs(p['lines']['#6B7280'][0]),
                 'claim': [l for l in p['labels'] if '×' in l][0]}
    for ser, col in (('dream', '#0072B2'), ('fixed', '#6B7280')):
        mk = from_markers(p, col)
        assert len(mk) == len(kern[key][ser]), (key, ser, len(mk), kern[key][ser])
        for (mx, my), (x, y) in zip(mk, kern[key][ser]):
            assert abs(mx - x) < 0.6 and abs(my - y) < 2.5e-4, (key, ser, mx, my, x, y)

p = panel('S5.F5', 0)  # v1 numbering (v2 Figure 6)
guide = {}
for col, key in (('#0072B2', 'dream'), ('#6B7280', 'fixed'), ('#D55E00', 'dream_guided'), ('#009E73', 'fixed_guided')):
    guide[key] = runs(p['lines'][col][0])
guide['start'] = r4(p['lines']['#0072B2'][0][0][1])

f6 = F['S5.F6']  # v1 numbering (v2 Figure 7)
best = [float(l['t']) for l in f6[0]['labels'] if re.fullmatch(r'\d\.\d{3}', l['t'])]
att = [int(l['t']) for l in f6[1]['labels'] if re.fullmatch(r'\d+', l['t'])][3:]
behav = {'best': best, 'attempts': att, 'rounds': ['E%d' % k for k in range(9)]}
assert len(best) == 9 and att == [110, 110, 87, 80, 50, 92, 80, 91, 86]

# ---- v2 only ----
# PACEvolve: Figure 3's dashed line labels (its final value per task) and Appendix C's Figure 8 (best so far per generation)
pace = {}
for pn, key in ((0, 'VGG16'), (1, 'LayerNorm'), (2, 'ConvDiv'), (3, 'ConvMax')):
    lab = [float(l) for l in panel2('S4.F3', pn)['labels'] if re.fullmatch(r'0\.\d{4}', l)]
    m8 = sorted(panel2('A3.F8', pn)['markers']['#0072B2'])
    pace[key] = {'label': lab[0], 'f8_final': r4(m8[-1][1]), 'f8_generations': round(m8[-1][0]), 'f8_points': len(m8),
                 'line_drawn_at': r4(panel2('S4.F3', pn)['lines']['#D55E00'][0][0][1])}
assert [pace[k]['label'] for k in pace] == [0.2002, 0.8264, 0.6452, 0.2654]
# harness: Figure 5(a) best-so-far steps, Figure 5(b) printed bar labels
h5 = panel2('S4.F5', 0)
harness = {'steps': [[round(x), r4(y)] for x, y in sorted(h5['markers']['#0072B2'])], 'seed': 0.7247, 'final': 0.8090,
           'end_generations': round(h5['lines']['#0072B2'][0][-1][0]),
           'bars': {'Claude Code': 0.75, 'Terminus-Kira': 0.72, 'Meta-Harness': 0.79, 'Dream-RSI': 0.81}, 'tasks': 89, 'runs_per_task': 2, 'at': 'S4.F5'}
lb = [l['t'] for l in F2['S4.F5'][1]['labels']]
assert all(('%g' % v) in lb or ('%.2f' % v) in lb for v in harness['bars'].values()), lb
assert harness['steps'][-1][1] == 0.809 and '0.7247→0.8090' in ''.join(h5['labels']).replace(' ', '')
# Table 2 (history ablation) and Table 3 (configurations)
t2 = TT[TT.index('=== S5.T2'):TT.index('=== A2.T3')]
c2 = [x.strip() for x in t2.replace('\t', '\n').split('\n') if x.strip()]
i = c2.index('Dream-RSI (All History)')
hist = {'all': {'perf': float(c2[i + 1]), 'compute': int(c2[i + 2])}, 'current': {'perf': float(c2[i + 4]), 'compute': int(c2[i + 5])}, 'at': 'S5.T2'}
assert hist == {'all': {'perf': 1.9, 'compute': 786}, 'current': {'perf': 1.59, 'compute': 430}, 'at': 'S5.T2'}
t3 = TT[TT.index('=== A2.T3'):]
c3 = [x.strip() for x in t3.replace('\t', '\n').split('\n') if x.strip()]
i = c3.index('Lasso'); cfg = []
while i + 5 < len(c3) and len(cfg) < 10:
    bm = re.match(r'\$(\d+)\\;\((\d+)\\times(\d+)\)\$', c3[i + 4].replace(' ', ''))
    cfg.append({'task': c3[i], 'model': c3[i + 1], 'T': int(c3[i + 2]), 'W': int(c3[i + 3]), 'B': int(bm.group(1)), 'branches': int(bm.group(2)), 'attempts': int(bm.group(3)), 'M': int(c3[i + 5])}); i += 6
assert len(cfg) == 10 and all(c['B'] == c['branches'] * c['attempts'] and c['M'] == 4 for c in cfg) and cfg[-1]['task'] == 'Harness Optimization'
config = {'rows': cfg, 'at': 'A2.T3'}

out = {'_doc': 'Transcribed and decoded by mk_tables.py from the arXiv HTML of 2609.14858: tables from v2 (identical to v1 where both have them); runs drawn in both versions decoded from v1 (recompute.py checks v2 against them), harness, PACEvolve, Table 2 and Table 3 from v2. Figures: vector paths calibrated on their own tick marks by decode_figs.py; the behaviour figure uses its printed bar labels. Keys are by content because v2 renumbers the figures.',
       'lasso': lasso, 'math': math, 'lasso_dyn': lasso_dyn, 'kern': kern, 'guide': guide, 'behav': behav,
       'pace': pace, 'harness': harness, 'hist': hist, 'config': config}
json.dump(out, open('tables.json', 'w'), indent=1, ensure_ascii=False)
print('tables.json written:', {k: len(json.dumps(v)) for k, v in out.items()})
for k, v in kern.items(): print(k, 'dream', v['dream'], '\n   fixed', v['fixed'])
print('guide', guide)
print('pace', pace)
print('harness', harness)
print('config', config['rows'][-1])
