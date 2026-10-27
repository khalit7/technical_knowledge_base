"""Decode Figures 6, 7 and 8 of Phi-Bench from the vector SVGs in its arXiv HTML into numbers (inputs/figs.json).

Glyphs carry their characters (data-text) and every line, marker and bar is a path with exact coordinates, so
values come from a linear fit of the gridlines (or bar extents) to their printed labels. This is transcription of
vector geometry, not reading curves off a raster image.

  mkdir -p /tmp/phifig && for f in iteration_best iteration_current error; do \
     curl -sL https://arxiv.org/html/2609.10226v1/$f.svg -o /tmp/phifig/$f.svg; done
  python3 decode_figs.py /tmp/phifig
"""
import json, os, sys
import svgparse

D = sys.argv[1] if len(sys.argv) > 1 else '/tmp/phifig'
COL = {'#ef7c5c': 'Claude Opus 5', '#fa9a82': 'Claude Sonnet 5', '#8d44e9': 'Qwen3.8 Max', '#c58ff5': 'Qwen3.7 Max',
       '#777777': 'Kimi K3', '#2f63d8': 'GLM 5.2', '#1d1d1d': 'GPT 5.6 Sol', '#5778f4': 'DeepSeek V4Pro'}
out = {}

def axis(paths, words):
    """BPB from y: fit the four horizontal gridlines to the labels 1.2 .. 2.4; iteration from x: major ticks 1,4,..,24."""
    grid = sorted({round(q['pts'][0][1], 3) for q in paths if q['stroke'] == '#e5e5e5'}, reverse=True)
    vals = [1.2, 1.6, 2.0, 2.4]
    assert len(grid) == 4
    ay = (vals[-1] - vals[0]) / (grid[-1] - grid[0])
    ticks = sorted(q['pts'][0][0] for q in paths if q['stroke'] == '#555555' and len(q['pts']) == 2 and abs(q['pts'][0][0] - q['pts'][1][0]) < 1e-6)
    labs = [1, 4, 8, 12, 16, 20, 24]
    assert len(ticks) == 7
    ax = (labs[-1] - labs[0]) / (ticks[-1] - ticks[0])
    fy = lambda y: vals[0] + (y - grid[0]) * ay
    fx = lambda x: labs[0] + (x - ticks[0]) * ax
    # check every gridline and tick lands on its label
    res = max([abs(fy(g) - v) for g, v in zip(grid, vals)] + [abs(fx(t) - l) for t, l in zip(ticks, labs)])
    return fx, fy, res

def centre(q):
    xs = [p[0] for p in q['pts']]; ys = [p[1] for p in q['pts']]
    return (min(xs) + max(xs)) / 2, (min(ys) + max(ys)) / 2

for name in ['iteration_best', 'iteration_current']:
    H, glyphs, paths = svgparse.parse(os.path.join(D, name + '.svg'))
    fx, fy, res = axis(paths, svgparse.words(glyphs))
    fig = {'grid_residual': res, 'series': {}}
    legend_y = 120 if name == 'iteration_best' else 55
    for col, model in COL.items():
        lines = [q for q in paths if q['stroke'] == col and not q['curve'] and len(q['pts']) >= 3 and q['pts'][0][1] > legend_y and q['fill'] in ('none', None)]
        # the data polyline is the longest; a 3-point dashed line at the start marks rounds with no valid result
        if not lines: continue
        lines.sort(key=lambda q: -len(q['pts']))
        main = lines[0]
        pts = [(round(fx(x), 3), round(fy(y), 4)) for x, y in main['pts']]
        crosses = [centre(q) for q in paths if q['fill'] == col and len(q['pts']) == 4 and centre(q)[1] > legend_y]
        fails = sorted(round(fx(c[0]), 2) for c in crosses)
        if len(main['pts']) < 10: continue
        fig['series'][model] = {'points': pts, 'failed_rounds': fails, 'other_lines': [[(round(fx(x), 2), round(fy(y), 4)) for x, y in q['pts']] for q in lines[1:]]}
    out[name] = fig

# Figure 7: stacked 100% horizontal bars, one row per model; colours are the four error classes
H, glyphs, paths = svgparse.parse(os.path.join(D, 'error.svg'))
words = svgparse.words(glyphs)
# colour to class from the legend swatches (swatch x,y beside each legend label, checked by legend_check below)
CLS = {'#fae28e': 'Python runtime error', '#88abd7': 'CUDA execution error', '#ecb4d6': 'Triton / MLIR / CUDA compile error', '#8a8ac6': 'Tensor shape mismatch'}
rows = [w for w in words if w['s'] == 15.0 and not w['t'].startswith('n=') and '%' not in w['t']]
ns = [w for w in words if w['t'].startswith('n=')]
bars = []
for q in paths:
    if q['fill'] in CLS and len(q['pts']) == 4:
        xs = [p[0] for p in q['pts']]; ys = [p[1] for p in q['pts']]
        if max(ys) - min(ys) < 12: continue  # legend swatch
        bars.append((CLS[q['fill']], min(xs), max(xs), (min(ys) + max(ys)) / 2))
leg = {}
for q in paths:
    ys = [p[1] for p in q['pts']]
    if q['fill'] in CLS and max(ys) < 80:
        cx, cy = centre(q)
        lab = min([w for w in words if w['s'] == 11.5], key=lambda w: abs(w['y'] - 4 - cy) + abs(w['x'] - cx - 20))
        leg[q['fill']] = lab['t']
assert all(CLS[c].lower().startswith(t.lower()[:10]) for c, t in leg.items()), leg
x0 = min(b[1] for b in bars); x1 = max(b[2] for b in bars)
fig7 = {}
for r in rows:
    mine = [b for b in bars if abs(b[3] - (r['y'] - 4.5)) < 8]
    n = min(ns, key=lambda w: abs(w['y'] - r['y']))
    tot = int(n['t'][2:])
    share = {c: round(sum(b[2] - b[1] for b in mine if b[0] == c) / (x1 - x0), 4) for c in CLS.values()}
    fig7[r['t']] = {'n': tot, 'share': share, 'count': {c: round(v * tot, 2) for c, v in share.items()}, 'sum_share': round(sum(share.values()), 4)}
out['error'] = fig7
json.dump(out, open('inputs/figs.json', 'w'), indent=1)
for k in ['iteration_best', 'iteration_current']:
    print(k, 'grid residual', out[k]['grid_residual'])
    for m, s in out[k]['series'].items():
        print(' ', m, len(s['points']), 'fails', s['failed_rounds'], 'first', s['points'][:2], 'last', s['points'][-1], 'other', s['other_lines'])
for m, v in fig7.items(): print(m, v['n'], v['share'], v['sum_share'])
