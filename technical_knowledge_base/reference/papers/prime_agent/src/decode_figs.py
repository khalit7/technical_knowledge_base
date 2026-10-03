"""Decode Figures 5, 7, 9 and 10 of Prime Agent (arXiv 2608.23552v1) from their vector SVGs.

The arXiv HTML ships every figure as SVG with exact path coordinates; text is one glyph per <use>.
Each axis is calibrated on the figure's own tick marks or gridlines and the printed tick labels, and the
residual against every printed end label is reported. This is transcription of vector geometry, not
reading curves off a raster.

  S=$SCRATCH/prime; mkdir -p $S/svg; for n in arc-agi3-scaling-combined emulator-genesis \
     emulator-game-boy-color factorio-tech-and-tree mazebench nanogpt-lab-census pmpp-hard; do \
     curl -sL https://arxiv.org/html/2608.23552v1/$n.svg -o $S/svg/$n.svg; done
  python3 decode_figs.py $S/svg        (writes inputs/figs.json; the SVGs are not kept)
"""
import json, math, os, re, sys
import svgparse

D = sys.argv[1]
out = {'source': 'https://arxiv.org/html/2608.23552v1 (Figures 5, 7, 9, 10 as vector SVG)'}
chk = []


def raw_paths(f):
    s = open(os.path.join(D, f + '.svg')).read()
    return re.findall(r'<path[^>]*/>', s[s.index('</defs>'):])


def attr(p, k):
    m = re.search(r'\b' + k + r'="([^"]*)"', p)
    return m.group(1) if m else None


def pts_of(d):
    """Absolute M/L/H/V polyline points (these files use nothing else for data lines)."""
    v, cur, P = None, [0, 0], []
    for cmd, args in re.findall(r'([MLHVZC])([^MLHVZC]*)', d):
        n = [float(x) for x in re.findall(r'-?\d*\.?\d+(?:e-?\d+)?', args)]
        if cmd in 'ML':
            for i in range(0, len(n) - 1, 2): cur = [n[i], n[i + 1]]; P.append(tuple(cur))
        elif cmd == 'H':
            for x in n: cur = [x, cur[1]]; P.append(tuple(cur))
        elif cmd == 'V':
            for y in n: cur = [cur[0], y]; P.append(tuple(cur))
    return P


# ---------------- Figure 5: ARC-AGI-3 test-time scaling ----------------
f = 'arc-agi3-scaling-combined'
_, G, P = svgparse.parse(os.path.join(D, f + '.svg'))
# y: gridline ticks at 540 (0) and 42 (100), same in both panels
sy = lambda y: (540 - y) / 4.98
# x panel A: ticks 75 (10k) and 456.5 (100k), log; panel B: 1155 ($10) and 1426.8 ($100), log
tokA = lambda x: 10 ** (4 + (x - 75) / 381.5)
cstB = lambda x: 10 ** (1 + (x - 1155) / 271.8)
chk.append(('Fig 5 x calibration: 30k tick', round(tokA(257.0)), 30000))
chk.append(('Fig 5 x calibration: $30 tick', round(cstB(1284.7), 2), 30.0))
COL = {'#6f4c9b': 'Prime Agent + Opus 5', '#c45100': 'Prime Agent + GPT-5.6 Sol', '#0072b2': 'Prime Agent + Terra', '#00544f': 'Prime Agent + GLM 5.2', '#b23a3a': 'Hermes Agent + GPT-5.6 Sol'}
PRINTED = {'Prime Agent + Opus 5': 95.5, 'Prime Agent + GPT-5.6 Sol': 78.3, 'Prime Agent + Terra': 25.7, 'Prime Agent + GLM 5.2': 8.6, 'Hermes Agent + GPT-5.6 Sol': 5.8}
runs = {}
for p in P:
    if p['stroke'] in COL and p['sw'] > 6 and len(p['pts']) > 5:
        n = COL[p['stroke']]
        xs = [x for x, _ in p['pts']]
        panel = 'tokens' if max(xs) < 1065 else 'cost'
        conv = tokA if panel == 'tokens' else cstB
        runs.setdefault(n, {})[panel] = [[round(conv(x), 3 if panel == 'cost' else 0), round(sy(y), 2)] for x, y in p['pts']]
for n, r in runs.items():
    end = r['cost'][-1][1]
    chk.append(('Fig 5 end score ' + n, round(end, 2), PRINTED[n]))
out['fig5'] = {'runs': runs, 'printed': PRINTED,
               'refs': {'Human baseline': {'score': round(sy(65.2), 2), 'printed': 95.4},
                        'GPT-5.6 Sol, Responses API': {'score': round(sy(349.3), 2), 'printed': 38.3},
                        'GPT-5.6 Terra, Responses API': {'score': round(sy(473.8), 2), 'printed': 13.3},
                        'Opus 5, ARC harness': {'score': round(sy(389.8), 2), 'printed': 30.2, 'cost': round(cstB(2056.0))},
                        'GPT-5.6 Sol, ARC harness': {'score': round(sy(505.2), 2), 'printed': 7.0, 'cost': round(cstB(2047.4))}},
               'ref_token_points': {}}
# dashed reference curves in panel A (Responses API runs, open circles)
for p in P:
    if p['stroke'] == '#666666' and p['sw'] == 3.6 and 3 <= len(p['pts']) <= 6 and max(x for x, _ in p['pts']) < 1065:
        name = 'GPT-5.6 Sol, Responses API' if p['pts'][-1][1] < 400 else 'GPT-5.6 Terra, Responses API'
        out['fig5']['ref_token_points'][name] = [[round(tokA(x)), round(sy(y), 2)] for x, y in p['pts']]

# ---------------- Figure 7: two EmulatorBench runs ----------------
out['fig7'] = {}
for f, xmax in (('emulator-genesis', 16.05), ('emulator-game-boy-color', 7.01)):
    ser = {}
    for p in raw_paths(f):
        st, da, d = attr(p, 'stroke'), attr(p, 'stroke-dasharray'), attr(p, 'd')
        if st not in ('#c45100', '#6f4c9b') or not d.startswith('M97.5 457.5'): continue
        name = {('#c45100', None): 'Prime Agent + Sol', ('#c45100', '7.5,4.5'): 'Codex + Sol', ('#6f4c9b', None): 'Prime Agent + Opus 5', ('#6f4c9b', '2.25,6'): 'Claude Code + Opus 5'}[(st, da)]
        ser[name] = [[round((x - 97.5) / 735 * xmax, 3), round((457.5 - y) / 257.14, 3)] for x, y in pts_of(d)]
    out['fig7'][f.replace('emulator-', '')] = {'xmax_usd': xmax, 'series': ser}
chk.append(('Fig 7 Genesis Prime end', out['fig7']['genesis']['series']['Prime Agent + Sol'][-1][1], 0.616))
chk.append(('Fig 7 GBC Prime end', out['fig7']['game-boy-color']['series']['Prime Agent + Sol'][-1][1], 0.998))

# ---------------- Figure 9: Factorio ----------------
f = 'factorio-tech-and-tree'
rp = raw_paths(f)
tok = lambda x: (x - 112.5) / 42.615  # millions; ticks 112.5 = 0, 964.8 = 20M
tech = lambda y: (292.5 - y) / 8.5      # gridlines 292.5 = 0, 250.0 = 5
act = lambda y: (622.5 - y) / 27.66     # gridlines 622.5 = 0, 401.2 = 8
cum = lambda y: (622.5 - y) / 0.34      # right-axis ticks: 200 subagents per 68 px
chk.append(('Fig 9 x: 23.4M tick', round(tok(1110.0), 2), 23.4))
fig9 = {}
for p in rp:
    st, d, sw = attr(p, 'stroke'), attr(p, 'd'), attr(p, 'stroke-width')
    if not d: continue
    P = pts_of(d)
    if st == '#222222' and sw == '3' and len(P) > 20:
        fig9['tech'] = [[round(tok(x), 3), round(tech(y))] for x, y in P]
    elif st == '#c8511b' and sw == '2.25' and len(P) > 1000:
        fig9['active'] = [[round(tok(x), 4), round(act(y))] for x, y in P]
    elif st == '#2b6f9e' and len(P) > 100:
        fig9['cumulative'] = [[round(tok(x), 3), round(cum(y))] for x, y in P]
fig9['reset_at_M'] = round(tok(304.0), 3)
fig9['advanced_circuit_pct'] = 71
chk.append(('Fig 9 final technologies', fig9['tech'][-1][1], 24))
chk.append(('Fig 9 cumulative subagents at end', fig9['cumulative'][-1][1], 633))
chk.append(('Fig 9 max active subagents', max(v for _, v in fig9['active']), 7))
chk.append(('Fig 9 tech before reset', max(v for x, v in fig9['tech'] if x < fig9['reset_at_M'] + 0.01), 5))
out['fig9'] = fig9

# ---------------- Figure 10: MazeBench ----------------
f = 'mazebench'
rp = raw_paths(f)
X0 = {36.0: 'states', 324.5: 'rooms', 613.0: 'gems'}
YMAX = {'states': 2500, 'rooms': 25, 'gems': 5}
MOD = {'#00544f': 'GLM-5.2', '#6f4c9b': 'Opus 5', '#c45100': 'GPT-5.6 Sol'}
fig10 = {}
for p in rp:
    st, d, da = attr(p, 'stroke'), attr(p, 'd'), attr(p, 'stroke-dasharray')
    if st not in MOD or attr(p, 'fill') != 'none' or not d: continue
    P = pts_of(d)
    if len(P) < 4 or abs(P[0][1] - P[1][1]) < 1e-9 and len(P) == 2: continue
    x0 = min(X0, key=lambda k: abs(k - P[0][0]))
    if abs(x0 - P[0][0]) > 1: continue
    panel = X0[x0]
    who = ('Prime Agent' if not da else 'comparison')
    ser = [[round((x - x0) / 239 * 45, 2), round((330 - y) / 201 * YMAX[panel], 2)] for x, y in P]
    fig10.setdefault(panel, {})[MOD[st] + ' | ' + who] = ser
out['fig10'] = {'panels': fig10, 'window_usd': 45,
                'note': 'Points beyond $45 exist in the SVG but are clipped from view by the figure; the page uses the plotted window only.'}

out['checks'] = [{'what': a, 'decoded': b, 'printed': c, 'ok': abs(b - c) <= max(0.06, abs(c) * 0.002)} for a, b, c in chk]
json.dump(out, open('inputs/figs.json', 'w'), separators=(',', ':'))
for c in out['checks']: print(('OK ' if c['ok'] else 'BAD'), c['what'], c['decoded'], c['printed'])
