"""Decode Figures 1, 5 and 6 of EnvHarness (arXiv 2608.19880v1) from their vector SVGs.

The arXiv HTML ships the three charts as SVG (figure1.svg, coevolution_swe_dual.svg, crossmodel_bars_python.svg)
with every point and bar as exact path coordinates and the text as glyphs (decoded by svgparse.py). Each y axis is
calibrated on the figure's own gridlines and the printed tick labels (the residual is reported). This is
transcription of vector geometry, not reading curves off a raster.

  S=$SCRATCH/eh; for f in figure1 coevolution_swe_dual crossmodel_bars_python; do \
     curl -sL https://arxiv.org/html/2608.19880v1/$f.svg -o $S/$f.svg; done
  python3 decode_figs.py $S        (writes inputs/figs.json; the SVGs are not kept)
"""
import json, os, sys
import svgparse

D = sys.argv[1]


def fit(pairs):
    n = len(pairs); mx = sum(p for p, _ in pairs) / n; my = sum(v for _, v in pairs) / n
    b = sum((p - mx) * (v - my) for p, v in pairs) / sum((p - mx) ** 2 for p, _ in pairs)
    a = my - b * mx
    return (lambda y: a + b * y), max(abs(a + b * p - v) for p, v in pairs)


out = {}

# ---- Figure 5: environment scaling on SWE-bench Verified (three polylines, 7 points each) ----
H, G, P = svgparse.parse(os.path.join(D, 'coevolution_swe_dual.svg'))
grid = sorted(p['pts'][0][1] for p in P if p['stroke'] == '#e8ebf0' and len(p['pts']) == 2)
# tick labels 56, 54, 52, 50, 48 from top to bottom (glyph baselines at x = 23.9 sit 4.9 pt below each gridline)
fy, res = fit(list(zip(grid, [56, 54, 52, 50, 48])))
names = {'#0072b2': 'EnvHarness envs', '#d55e00': 'Original envs', '#999999': 'Generated envs (SWE-smith)'}
xs_env = [0, 50, 100, 150, 200, 250, 300]
f5 = {'gridline_fit_residual': round(res, 6), 'x': xs_env, 'series': {}}
for p in P:
    if p['stroke'] in names and len(p['pts']) == 7:
        f5['series'][names[p['stroke']]] = [round(fy(y), 4) for _, y in p['pts']]
assert len(f5['series']) == 3
out['figure5'] = f5

# ---- Figure 1: left bars (Table 3's three benchmarks) and right panel (the same scaling curves) ----
H, G, P = svgparse.parse(os.path.join(D, 'figure1.svg'))
f1 = {}
# left panels: gridlines at 45, 50, 55 (y = 112.93, 80.27, 47.602) shared by the three panels
fyl, resl = fit([(112.93, 45), (80.27, 50), (47.602, 55)])
cols = {'#bebbad': 'No Skills (base agent)', '#9b9889': 'Original Envs (real envs)', '#9e2a2b': 'EnvHarness Envs'}
bars = [p for p in P if p['stroke'] is None and p['fill'] in cols and len(p['pts']) == 4 and p['pts'][2][1] == 126.0]
bench = [(0, 102, 'SWE-bench Verified'), (110, 200, 'OfficeQA'), (208, 298, 'SpreadsheetBench')]
f1['left'] = {'axis_floor_value': round(fyl(126.0), 3), 'bars': {}}
for x0, x1, name in bench:
    f1['left']['bars'][name] = {cols[p['fill']]: round(fyl(p['pts'][0][1]), 3) for p in bars if x0 <= p['pts'][0][0] <= x1}
# right panel: gridlines at 48, 51, 54 (y = 114.488, 71.32, 28.148)
fyr, resr = fit([(114.488, 48), (71.32, 51), (28.148, 54)])
f1['right'] = {}
rn = {'#9e2a2b': 'EnvHarness envs', '#9b9889': 'Original envs (SWE-Lite, real envs)', '#bebbad': 'Generated envs (SWE-smith)'}
for p in P:
    if p['stroke'] in rn and len(p['pts']) == 7:
        f1['right'][rn[p['stroke']]] = [round(fyr(y), 4) for _, y in p['pts']]
f1['fit_residuals'] = [round(resl, 6), round(resr, 6)]
out['figure1'] = f1

# ---- Figure 6: cross-model bars (y ticks 30..70 every 10) ----
H, G, P = svgparse.parse(os.path.join(D, 'crossmodel_bars_python.svg'))
W = svgparse.words(G)
ticks = sorted([(w['y'], float(w['t'])) for w in W if not w['rot'] and abs(w['x'] - 29.2) < 1 and w['t'].isdigit()])
grid = sorted(p['pts'][0][1] for p in P if p['stroke'] == '#e4e8ef' and len(p['pts']) == 2)
fy6, res6 = fit(list(zip(grid, sorted([t for _, t in ticks], reverse=True))))
cols6 = {'#d4d4d4': 'No Skills', '#f3c7a6': 'Original Envs', '#a8cde5': 'EnvHarness Envs'}
bars6 = sorted([p for p in P if p['stroke'] is None and p['fill'] in cols6 and len(p['pts']) == 6], key=lambda p: min(q[0] for q in p['pts']))
models = ['Gemini 3.1 Flash-Lite', 'Qwen3.6 27B', 'Gemini 3.5 Flash', 'Claude Sonnet 4.6']
f6 = {'gridline_fit_residual': round(res6, 6), 'bars': {m: {} for m in models}, 'printed_gain_labels': [w['t'] for w in sorted(W, key=lambda w: w['x']) if w['t'].startswith('+')]}
for i, p in enumerate(bars6):
    top = min(q[1] for q in p['pts'])
    f6['bars'][models[i // 3]][cols6[p['fill']]] = round(fy6(top), 3)
out['figure6'] = f6

os.makedirs('inputs', exist_ok=True)
json.dump(out, open('inputs/figs.json', 'w'), indent=1)
print(json.dumps(out, indent=1))
