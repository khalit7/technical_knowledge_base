"""Build tables.json from the arXiv HTML extract (inputs/paper_v1.txt), the decoded figures (inputs/figs.json)
and the SimpleTES extract (inputs/extracts.txt). Every value is parsed, not typed, and asserted against the
printed numbers that the paper's text also quotes.

  python3 mk_tables.py      (build.sh runs it)
"""
import json, re

T = open('inputs/paper_v1.txt').read()
F = json.load(open('inputs/figs.json'))['figures']
X = open('inputs/extracts.txt').read()

def cells(block):
    return [c.strip() for c in block.split('\t') if c.strip() != '']

# ---- Figure 3(a): the Lasso table (a table inside a figure environment, S4.F3) ----
a = T.index('Method\t\nModel\t\nCompute'); b = T.index('(a) Final performance.')
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
         'bold': 'only the Dream-RSI Gemini-3.7-Flash average (2350.6) is bold', 'at': 'S4.F3'}

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
def from_markers(p, col):
    return sorted(p['markers'][col])

def r4(v): return round(v, 4)
fig3b = {}
for pn, key in ((0, 'pro'), (1, 'flash')):
    p = panel('S4.F3', pn)
    fig3b[key] = {'fixed': [[round(x), round(y, 1)] for x, y in p['lines']['#0000BF'][0]],
                  'dream': [[round(x), round(y, 1)] for x, y in p['lines']['#CC0000'][0]],
                  'ycal_resid_ms': round(p['ycal_resid'], 3)}
assert fig3b['pro']['fixed'][-1] == [550, 3587.0] and fig3b['pro']['dream'][-1] == [317, 2931.0]
assert fig3b['flash']['dream'][-1] == [1879, 2350.6]

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

fig4 = {}
for pn, key in ((0, 'VGG16'), (1, 'LayerNorm'), (2, 'ConvDiv'), (3, 'ConvMax')):
    p = panel('S4.F4', pn)
    fig4[key] = {'dream': runs(p['lines']['#0072B2'][0]), 'fixed': runs(p['lines']['#6B7280'][0]),
                 'claim': [l for l in p['labels'] if '×' in l][0]}
    for ser, col in (('dream', '#0072B2'), ('fixed', '#6B7280')):
        mk = from_markers(p, col)
        assert len(mk) == len(fig4[key][ser]), (key, ser, len(mk), fig4[key][ser])
        for (mx, my), (x, y) in zip(mk, fig4[key][ser]):
            assert abs(mx - x) < 0.6 and abs(my - y) < 2.5e-4, (key, ser, mx, my, x, y)

p = panel('S5.F5', 0)
fig5 = {}
for col, key in (('#0072B2', 'dream'), ('#6B7280', 'fixed'), ('#D55E00', 'dream_guided'), ('#009E73', 'fixed_guided')):
    fig5[key] = runs(p['lines'][col][0])
fig5['start'] = r4(p['lines']['#0072B2'][0][0][1])

f6 = F['S5.F6']
best = [float(l['t']) for l in f6[0]['labels'] if re.fullmatch(r'\d\.\d{3}', l['t'])]
att = [int(l['t']) for l in f6[1]['labels'] if re.fullmatch(r'\d+', l['t'])][3:]
fig6 = {'best': best, 'attempts': att, 'rounds': ['E%d' % k for k in range(9)]}
assert len(best) == 9 and att == [110, 110, 87, 80, 50, 92, 80, 91, 86]

out = {'_doc': 'Transcribed and decoded by mk_tables.py from the arXiv HTML v1 of 2609.14858 (tables: printed values; figures: vector paths calibrated on their own tick marks by decode_figs.py; Figure 6 values are its printed bar labels).',
       'lasso': lasso, 'math': math, 'fig3b': fig3b, 'fig4': fig4, 'fig5': fig5, 'fig6': fig6}
json.dump(out, open('tables.json', 'w'), indent=1, ensure_ascii=False)
print('tables.json written:', {k: len(json.dumps(v)) for k, v in out.items()})
for k, v in fig4.items(): print(k, 'dream', v['dream'], '\n   fixed', v['fixed'])
print('fig5', fig5)
