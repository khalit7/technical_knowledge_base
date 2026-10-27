"""Read the printed labels of the paper's vector figures (arXiv e-print 2609.04148v1, figures/*.pdf) into
inputs/figures.json. Only printed labels are transcribed; no curve or bar is read by eye. Figure 3's slice
labels are matched to its legend by fill colour (each slice's bounding box contains its label).
usage: curl -sL https://arxiv.org/e-print/2609.04148v1 | tar xz -C <dir>; uv run --with pymupdf python decode_figs.py <dir>/figures"""
import json, sys, pymupdf
d = sys.argv[1]
words = lambda f: [(w[0], w[1], w[4]) for w in pymupdf.open(d + '/' + f + '.pdf')[0].get_text('words')]
out = {'source': 'arXiv e-print 2609.04148v1, figures/*.pdf (vector), labels read with PyMuPDF by decode_figs.py'}
# Figure 6: per-category change, Single-WS + Cross-WS minus Single-WS, TB2.1, Terminus2-XML
W = words('breadth_category_changes')
rows = sorted([w for w in W if w[2].startswith('n=')], key=lambda w: w[1])
deltas = sorted([w for w in W if w[2][0] in '+-0' and w[0] > 110 and w[1] > 20], key=lambda w: w[1])
names = []
for r in rows:
    names.append(' '.join(w[2] for w in sorted([w for w in W if abs(w[1] - r[1]) < 3 and w[0] < 90], key=lambda w: w[0])))
out['fig6'] = [{'cat': n, 'n': int(r[2][2:]), 'delta': float(dl[2])} for n, r, dl in zip(names, rows, deltas)]
# Figure 3: session shapes of the 4,563 generated Multi-Round sessions
pg = pymupdf.open(d + '/q4_rounds_shapes.pdf')[0]
W = words('q4_rounds_shapes')
pct = [w for w in W if w[2].endswith('%')]
fills = [(tuple(round(c, 3) for c in x['fill']), x['rect']) for x in pg.get_drawings() if x.get('fill') and x['rect'].width < 150]
slices = [f for f in fills if f[1].height > 20]
legend = sorted([f for f in fills if f[1].height <= 6], key=lambda f: f[1].y0)
lnames = ['All rounds pass', 'One failure episode, recovered', 'Multiple failure episodes, recovered',
          'Trailing failures, kept (at least 2 passing rounds)', 'Trailing failures, discarded (fewer than 2 passing rounds)']
fig3 = []
P = [((w[0] + w[2]) / 2, (w[1] + w[3]) / 2, w[4]) for w in pg.get_text('words') if w[4].endswith('%')]
pairs = sorted(((abs(p[0] - (r.x0 + r.x1) / 2) + abs(p[1] - (r.y0 + r.y1) / 2), i, j) for i, (c2, r) in enumerate(slices) for j, p in enumerate(P)))
got, usedi, usedj = {}, set(), set()
for dd, i, j in pairs:
    if i not in usedi and j not in usedj:
        got[i] = P[j][2]; usedi.add(i); usedj.add(j)
for (col, _), nm in zip(legend, lnames):
    i = [k for k, (c2, r) in enumerate(slices) if c2 == col][0]
    fig3.append({'shape': nm, 'share': float(got[i][:-1])})
out['fig3'] = {'sessions': 4563, 'shapes': fig3}
# Figure 5: language and domain composition of the reconstructed terminal pool
W = words('env_composition')
def bars(xmin, xmax):
    vals = sorted([w for w in W if w[2].endswith('%') and xmin <= w[0] < xmax], key=lambda w: w[1])
    labs = []
    for v in vals:
        labs.append(' '.join(w[2] for w in sorted([w for w in W if abs(w[1] - v[1]) < 4 and xmin <= w[0] < xmin + 120 and not w[2].endswith('%') and w[1] > 10], key=lambda w: w[0]) if w[0] < (xmin + 90)))
    return [{'k': l, 'pct': float(v[2][:-1])} for l, v in zip(labs, vals)]
out['fig5_language'] = bars(0, 250)
out['fig5_domain'] = bars(250, 506)
# Pipeline Sankey (main.tex figure sankey_pipeline, shown as Figure 7 in the appendix)
W = words('sankey_pipeline')
out['funnel_labels'] = sorted({w[2] for w in W if any(ch.isdigit() for ch in w[2])})
json.dump(out, open('inputs/figures.json', 'w'), indent=1)
print(json.dumps(out)[:2500])
