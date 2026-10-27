"""Decode Figures 2 and 3 of the arXiv v2 HTML (vector SVG; glyphs carry data-text) into numbers: inputs/figs.json.
Values come from a linear fit of the figures' own gridlines / tick marks to their labels, so they are exact up to the
SVG coordinate precision (about 0.01 pt). This is transcription of vector geometry, not reading a raster by eye.

  mkdir -p /tmp/bt && for f in ratio coeff; do curl -sL https://arxiv.org/html/2405.14862v2/2405.14862v2/$f.svg -o /tmp/bt/$f.svg; done
  python3 decode_figs.py /tmp/bt
"""
import json, os, sys
import svgparse as P
d = sys.argv[1]; out = {}

# Figure 2: bidirectional-to-causal ratio (alpha, averaged over layers) during training, Llama3-8B, three theta_init
H, g, paths = P.parse(os.path.join(d, 'ratio.svg')); W = P.words(g)
grid = sorted(p['pts'][0][1] for p in paths if p['stroke'] == '#cccccc' and len(p['pts']) == 2 and abs(p['pts'][0][1] - p['pts'][1][1]) < 1e-6
              and 8 < p['pts'][0][1] < 118)                      # the two inner horizontal gridlines
labs = sorted((w['y'], float(w['t'])) for w in W if w['t'] in ('0.4', '0.6'))
(ya, va), (yb, vb) = sorted(zip(grid, [l[1] for l in sorted(labs, key=lambda l: l[0])]))
fy = lambda y: va + (y - ya) * (vb - va) / (yb - ya)
panel = [p for p in paths if p['fill'] == '#ffffff' and len(p['pts']) == 4 and p['pts'][0][0] > 1][0]['pts']
x0, x1 = min(q[0] for q in panel), max(q[0] for q in panel)
fx = lambda x: 3000 * (x - x0) / (x1 - x0)                       # x axis labelled 0 and 3000 at the panel edges
legend = {'#4c72b0': None, '#dd8452': None, '#55a868': None}
lw = sorted((w['y'], w['t']) for w in W if w['t'] in ('0.1', '0.01', '0.001'))
lp = sorted((p['pts'][0][1], p['stroke']) for p in paths if p['stroke'] in legend and len(p['pts']) == 3)
for (ly, col), (wy, t) in zip(lp, lw): legend[col] = t
fig2 = {}
for p in paths:
    if p['stroke'] in legend and len(p['pts']) > 5:
        pts = [(round(fx(x), 1), round(fy(y), 4)) for x, y in p['pts']]
        fig2[legend[p['stroke']]] = dict(start=pts[0][1], end=pts[-1][1], min=min(v for _, v in pts), max=max(v for _, v in pts),
                                         points=pts[::max(1, len(pts) // 60)] + [pts[-1]])
out['fig2'] = dict(axis_note='y axis labelled "Ratio [%]" but its ticks read 0.4 and 0.6: the values are fractions (alpha), not percent',
                   gridlines={'0.4': round(ya if va == 0.4 else yb, 2), '0.6': round(yb if vb == 0.6 else ya, 2)}, curves=fig2)

# Figure 3: final alpha per layer for K and V (Llama3-8B, theta_init 0.01): bars over two panels
H, g, paths = P.parse(os.path.join(d, 'coeff.svg'))
ticks = sorted({round(p['pts'][0][1], 2) for p in paths if p['stroke'] == '#000000' and len(p['pts']) == 2
                and abs(p['pts'][0][1] - p['pts'][1][1]) < 1e-6 and abs(p['pts'][0][0] - p['pts'][1][0]) < 4})
ty = sorted(ticks, reverse=True)[:3]                               # 0.0, 0.2, 0.4 from bottom to top
fy3 = lambda y: 0.0 + (ty[0] - y) * 0.2 / (ty[0] - ty[1])
bars = sorted((min(q[0] for q in p['pts']), min(q[1] for q in p['pts']), max(q[1] for q in p['pts'])) for p in paths if p['fill'] == '#cc8964')
mid = (183.25 + 197.55) / 2
k = [round(fy3(top), 4) for x, top, bot in bars if x < mid]; v = [round(fy3(top), 4) for x, top, bot in bars if x > mid]
out['fig3'] = dict(k=k, v=v, n_layers=len(k), mean_k=round(sum(k) / len(k), 4), mean_v=round(sum(v) / len(v), 4),
                   min_k=min(k), max_k=max(k), min_v=min(v), max_v=max(v), ticks_px=ty)
json.dump(out, open('inputs/figs.json', 'w'), indent=1)
print({c: {kk: vv for kk, vv in x.items() if kk != 'points'} for c, x in fig2.items()})
print(out['fig3']['n_layers'], out['fig3']['mean_k'], out['fig3']['mean_v'], out['fig3']['min_k'], out['fig3']['max_k'], out['fig3']['min_v'], out['fig3']['max_v'])
print('K', k); print('V', v)
