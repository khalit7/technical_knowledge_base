"""Decode Figure 2 (taxonomy per mixture) and Figure 4 (cross-framework transfer) from the vector PDFs in the arXiv e-print.
usage: curl -sL https://arxiv.org/e-print/2608.14036v1 | tar xz -C /tmp/das; uv run --with pymupdf python decode_figs.py /tmp/das/assets
Writes inputs/fig2_decoded.json and inputs/fig4_decoded.json. Calibrated on the figures' own gridlines and printed tick labels."""
import sys, json, pymupdf
A = sys.argv[1]
MIX = ['5s0f', '4s1f', '3s2f', '2s3f', '1s4f', '0s5f']

# ---- Figure 2: stacked bars, one panel per arm, y in trajectories (0..100 ticks)
p = pymupdf.open(A + '/taxonomy_per_setting.pdf')[0]
dr = p.get_drawings()
words = p.get_text('words')
# gridlines: grey horizontal strokes; tick labels 0,20,40,... give their values
grid = sorted({round(x['rect'].y0, 2) for x in dr if x['type'] == 's' and x['rect'].height == 0 and x.get('color') and abs(x['color'][0] - 0.69) < 0.01})
ys = sorted(grid, reverse=True)  # bottom first
y0 = ys[0]; unit = (ys[0] - ys[1]) / 20.0  # points per trajectory
# legend: swatches with grey (0.667) stroke, label = words on the same row to the right
leg = [x for x in dr if x['type'] == 'fs' and x.get('color') and abs(x['color'][0] - 0.667) < 0.01]
def label_at(r):
    row = [w for w in words if abs((w[1] + w[3]) / 2 - (r.y0 + r.y1) / 2) < 4 and w[0] > r.x1]
    return ' '.join(w[4] for w in sorted(row, key=lambda w: w[0]))
colmap = {tuple(round(v, 3) for v in x['fill']): label_at(x['rect']) for x in leg}
panels = {'Raw': (45, 225), 'Workflow Memory': (245, 425), 'Skill': (445, 625)}
ticks = sorted([(w[0] + w[2]) / 2 for w in words if w[4] in MIX and w[1] > 300])
out = {'unit_pt_per_trajectory': unit, 'colours': {str(k): v for k, v in colmap.items()}, 'panels': {}}
bars = [x for x in dr if x['type'] == 'fs' and x.get('color') and x['color'][0] == 1.0 and x.get('fill')]
for arm, (xa, xb) in panels.items():
    xs = [t for t in ticks if xa < t < xb]
    res = {}
    for i, xc in enumerate(xs):
        segs = {}
        for b in bars:
            r = b['rect']
            if r.x0 < xc < r.x1:
                lab = colmap.get(tuple(round(v, 3) for v in b['fill']), '?')
                segs[lab] = round(r.height / unit, 2)
        res[MIX[i]] = segs
    out['panels'][arm] = res
json.dump(out, open('inputs/fig2_decoded.json', 'w'), indent=1)

# ---- Figure 4: grouped bars with printed integer labels
p = pymupdf.open(A + '/fig_cross_agent_transfer.pdf')[0]
dr = p.get_drawings(); words = p.get_text('words')
tick = {w[4]: (w[1] + w[3]) / 2 for w in words if w[0] < 30 and w[4].isdigit()}
y_0, y_80 = tick['0'], tick['80']
val = lambda y: (y_0 - y) / (y_0 - y_80) * 80
xm = {w[4]: (w[0] + w[2]) / 2 for w in words if w[4] in MIX}
rects = [x for x in dr if x['type'] in ('f', 'fs') and x.get('fill') and x['rect'].width > 3 and x['rect'].height > 3 and x['rect'].width < 60]
f4 = {'raw_dashed_line': None, 'bars': {}}
for m, xc in xm.items():
    near = sorted([x for x in rects if abs((x['rect'].x0 + x['rect'].x1) / 2 - xc) < 30], key=lambda x: x['rect'].x0)
    f4['bars'][m] = [{'fill': [round(v, 3) for v in x['fill']], 'value': round(val(x['rect'].y0), 2)} for x in near]
lines = [x for x in dr if x['type'] == 's' and x['rect'].height < 0.5 and x['rect'].width > 50]
f4['horizontal_strokes'] = [{'y_value': round(val(x['rect'].y0), 2), 'color': [round(v, 3) for v in x['color']], 'dashes': x.get('dashes')} for x in lines]
f4['printed_labels'] = [(round(w[0]), round(w[1]), w[4]) for w in words]
json.dump(f4, open('inputs/fig4_decoded.json', 'w'), indent=1)
print('ok')
