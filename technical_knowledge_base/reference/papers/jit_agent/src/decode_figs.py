"""Decode Figures 4 and 6 of JIT-Agent v2 from the vector PDFs in the arXiv e-print (they are not in the HTML version).
usage: curl -sL https://arxiv.org/e-print/2608.25593v2 | tar xz -C $SCRATCH/src2
       uv run --with pymupdf python decode_figs.py $SCRATCH/src2/figures      (writes inputs/figs.json)
Figure 4 (model_pair_jit_vs_react_bars.pdf): the printed value labels above the bars (transcribed exactly), checked against
the bar heights calibrated on the axis tick labels. Figure 6 (jit_growth_curves_streaming_comparison_.pdf): every vertex of
the 18 curves, calibrated on the tick labels (no gridlines are drawn; the label centres are the tick positions)."""
import json, sys, os, statistics
import pymupdf
D = sys.argv[1]
out = {}

# ---------- Figure 4 ----------
p = pymupdf.open(os.path.join(D, 'model_pair_jit_vs_react_bars.pdf'))[0]
W = p.get_text('words')
panels = ['DeepSearchQA', 'AgentIF-Oneday', 'DeepPlanning-Shopping', 'OfficeBench']
backbones = ['DeepSeek-V4-Flash', 'DeepSeek-V4-Pro', 'Qwen3.6-Flash', 'Qwen3.6-Plus', 'Mimo-V2.5-Flash', 'Mimo-V2.5-Pro']
titles = sorted([w for w in W if w[4] in panels], key=lambda w: w[0])
edges = [0] + [(titles[i][0] + titles[i + 1][0]) / 2 - 80 for i in range(3)] + [1e9]
edges = [0, 360, 720, 1080, 1e9]
bars = [d for d in p.get_drawings() if d['type'] == 'fs' and len(d['items']) == 6 and d['rect'].height > 5 and 8 < d['rect'].width < 30]
fig4 = {}
for k, name in enumerate(panels):
    lo, hi = edges[k], edges[k + 1]
    vals = sorted([w for w in W if lo <= w[0] < hi and '.' in w[4] and w[1] < 470], key=lambda w: w[0])
    ticks = [w for w in W if lo <= w[0] < hi and w[4].isdigit() and w[0] < lo + 60 and w[1] < 470]
    # tick label centre -> value
    ys = [((t[1] + t[3]) / 2, float(t[4])) for t in ticks]
    n = len(ys); mx = sum(a for a, b in ys) / n; my = sum(b for a, b in ys) / n
    slope = sum((a - mx) * (b - my) for a, b in ys) / sum((a - mx) ** 2 for a, b in ys); icpt = my - slope * mx
    bs = sorted([b for b in bars if lo <= b['rect'].x0 < hi], key=lambda b: b['rect'].x0)
    assert len(vals) == 12 and len(bs) == 12, (name, len(vals), len(bs))
    rows = []
    for i, bb in enumerate(backbones):
        react, jit = float(vals[2 * i][4]), float(vals[2 * i + 1][4])
        hr, hj = [round(icpt + slope * bs[2 * i + j]['rect'].y0, 2) for j in (0, 1)]
        rows.append({'backbone': bb, 'react': react, 'jit': jit, 'gain': round(jit - react, 1), 'bar_react': hr, 'bar_jit': hj})
    fig4[name] = rows
out['fig4'] = fig4
dev = max(abs(r['bar_react'] - r['react']) for v in fig4.values() for r in v)
dev = max(dev, max(abs(r['bar_jit'] - r['jit']) for v in fig4.values() for r in v))
out['fig4_bar_vs_label_max_diff'] = round(dev, 2)

# ---------- Figure 6 ----------
p = pymupdf.open(os.path.join(D, 'jit_growth_curves_streaming_comparison_.pdf'))[0]
W = p.get_text('words')
cols = [(70, 370, 'DeepPlanning-Shopping'), (400, 700, 'DeepPlanning-Travel'), (730, 1030, 'OfficeBench')]
rowsy = [(55, 200, 'cumulative_accuracy'), (250, 392, 'cost_usd'), (440, 585, 'tool_calls')]
fig6 = {}
num = lambda s: s.replace('.', '', 1).isdigit()
for x0, x1, bench in cols:
    fig6[bench] = {}
    for y0, y1, metric in rowsy:
        # x tick labels sit just below the panel, y tick labels just left of it
        xl = [w for w in W if x0 - 10 <= (w[0] + w[2]) / 2 <= x1 + 10 and y1 + 5 < w[1] < y1 + 25 and num(w[4])]
        yl = [w for w in W if x0 - 40 <= w[2] <= x0 - 2 and y0 - 8 <= (w[1] + w[3]) / 2 <= y1 + 8 and num(w[4])]
        def fit(pairs):
            n = len(pairs); mx = sum(a for a, b in pairs) / n; my = sum(b for a, b in pairs) / n
            s = sum((a - mx) * (b - my) for a, b in pairs) / sum((a - mx) ** 2 for a, b in pairs); return s, my - s * mx
        sx, ix = fit([((w[0] + w[2]) / 2, float(w[4])) for w in xl])
        sy, iy = fit([((w[1] + w[3]) / 2, float(w[4])) for w in yl])
        curves = [d for d in p.get_drawings() if d['type'] == 's' and len(d['items']) > 50 and x0 <= d['rect'].x0 <= x1 and y0 <= d['rect'].y0 <= y1]
        band = [d for d in p.get_drawings() if d['type'] == 'f' and len(d['items']) > 50 and x0 <= d['rect'].x0 <= x1 and y0 <= d['rect'].y0 <= y1]
        ybot = max(d['rect'].y1 for d in curves + band)
        res = {'x_ticks': sorted(float(w[4]) for w in xl), 'y_ticks': sorted(float(w[4]) for w in yl)}
        for d in curves:
            pts = [d['items'][0][1]] + [it[-1] for it in d['items']]
            key = 'static' if d.get('dashes') and '[]' not in str(d['dashes']).replace(' ', '') else 'streaming'
            res[key] = [[round(ix + sx * q.x, 2), None if q.y >= ybot - 0.05 else round(iy + sy * q.y, 3)] for q in pts]
        fig6[bench][metric] = res
out['fig6'] = fig6
os.makedirs('inputs', exist_ok=True)
json.dump(out, open('inputs/figs.json', 'w'), indent=0)
for b, v in fig4.items():
    print(b, [(r['react'], r['jit']) for r in v])
print('fig4 bars vs labels, max diff', out['fig4_bar_vs_label_max_diff'])
for b in fig6:
    for m in fig6[b]:
        r = fig6[b][m]
        print(b, m, 'n', len(r['static']), len(r['streaming']), 'x', r['static'][0][0], r['static'][-1][0], 'end static', r['static'][-1][1], 'end streaming', r['streaming'][-1][1])
