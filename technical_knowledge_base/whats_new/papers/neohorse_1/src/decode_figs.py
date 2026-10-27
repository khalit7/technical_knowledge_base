"""Decode Figures 7 and 1 of NeoHorse-1 (arXiv 2609.08183v1) from their vector SVGs.

Figure 7 (data-scaling-v2.svg): six markers on a log-x axis of unique supervised tokens (millions) and a linear
y axis of the five-benchmark average. The y axis is calibrated on the figure's own five gridlines and their printed
tick labels (69.5 to 71.5); the x axis on its four printed ticks (2, 4, 8, 10). Both calibrations are checked against
the two values the figure prints as text (Baseline 69.31, 71.45). This is transcription of vector geometry.
Figure 1 (headline-agentic-4b-9b.svg): only its printed bar labels are read, to check them against Tables 1 and 2.

  mkdir -p $SCRATCH && for f in data-scaling-v2 headline-agentic-4b-9b; do \
      curl -sL https://arxiv.org/html/2609.08183v1/$f.svg -o $SCRATCH/nh_$f.svg; done
  python3 decode_figs.py $SCRATCH        (writes inputs/figs.json; the SVGs are not kept)
"""
import json, math, os, sys
import svgparse

d = sys.argv[1]
H, G, P = svgparse.parse(os.path.join(d, 'nh_data-scaling-v2.svg'))
W = svgparse.words(G)
num = lambda t: float(t) if t.replace('.', '', 1).isdigit() else None

# y: gridlines (#e1e7ed horizontals) against the tick labels at the left edge
grid = sorted(p['pts'][0][1] for p in P if p['stroke'] == '#e1e7ed')
yt = sorted((w['y'], float(w['t'])) for w in W if w['x'] < 50 and num(w['t']) is not None)
assert len(grid) == len(yt) == 5
pairs = list(zip(grid, [v for _, v in yt]))
n = len(pairs); mx = sum(p for p, _ in pairs) / n; my = sum(v for _, v in pairs) / n
b = sum((p - mx) * (v - my) for p, v in pairs) / sum((p - mx) ** 2 for p, _ in pairs); a = my - b * mx
yv = lambda y: a + b * y
yres = max(abs(yv(p) - v) for p, v in pairs)

# x: the four tick marks (short verticals of #17212b) against the tick labels under them, log scale
ticks = sorted(p['pts'][0][0] for p in P if p['stroke'] == '#17212b' and abs(p['pts'][0][0] - p['pts'][1][0]) < 1e-6)
xl = sorted((w['x'], float(w['t'])) for w in W if w['y'] > 440 and w['y'] < 470 and num(w['t']) is not None)
assert len(ticks) == len(xl) == 4
xp = list(zip(ticks, [math.log(v) for _, v in xl]))
mx = sum(p for p, _ in xp) / 4; my = sum(v for _, v in xp) / 4
bx = sum((p - mx) * (v - my) for p, v in xp) / sum((p - mx) ** 2 for p, _ in xp); ax_ = my - bx * mx
xv = lambda x: math.exp(ax_ + bx * x)
xres = max(abs(xv(p) / math.exp(v) - 1) for p, v in xp)

# baseline: the long #17212b horizontal that is not the x axis (the axis is the lowest)
hz = sorted(p['pts'][0][1] for p in P if p['stroke'] == '#17212b' and abs(p['pts'][0][1] - p['pts'][1][1]) < 1e-6)
base = yv(hz[0])
# markers: filled diamonds; the centre is the mean of the four distinct corners
pts = []
for p in P:
    if p.get('fill') == '#2b70b9' and p['stroke'] is None:
        c = p['pts'][:4]
        cx = sum(q[0] for q in c) / 4; cy = sum(q[1] for q in c) / 4
        pts.append({'tokens_M': round(xv(cx), 3), 'avg': round(yv(cy), 3)})
pts.sort(key=lambda r: r['tokens_M'])
printed = {w['t'] for w in W}
assert 'Baseline 69.31' in printed and '71.45' in printed
fig7 = {'source': 'https://arxiv.org/html/2609.08183v1#S5.F7 (data-scaling-v2.svg)', 'y_residual': round(yres, 6),
        'x_residual_rel': round(xres, 6), 'baseline': round(base, 3), 'baseline_printed': 69.31, 'last_printed': 71.45,
        'points': pts, 'note': 'x is unique supervised tokens in millions on a log axis; the paper does not print the x values'}

# Figure 1: printed labels in reading order (benchmark rows, then the six models in legend order)
H1, G1, P1 = svgparse.parse(os.path.join(d, 'nh_headline-agentic-4b-9b.svg'))
lab = [w['t'] for w in svgparse.words(G1)]
fig1 = {'source': 'https://arxiv.org/html/2609.08183v1#S0.F1 (headline-agentic-4b-9b.svg)', 'words': lab}
os.makedirs('inputs', exist_ok=True)
json.dump({'fig7': fig7, 'fig1': fig1}, open('inputs/figs.json', 'w'), indent=1)
print('fig7', fig7['baseline'], pts, 'residuals', yres, xres)
