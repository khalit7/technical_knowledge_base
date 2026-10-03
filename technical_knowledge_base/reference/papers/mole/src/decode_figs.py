"""Decode Figure 3 (four-way outcomes for 39 models) and the printed value labels of Figures 4, 5, 6, 7, 8, 10,
11, 12 and 17 from the vector PDFs in the arXiv e-print. Figure 3 prints no numbers, so its bar segments are read
from the vector rectangles, calibrated on the figure's own 0 and 100 tick labels (to about 0.05 points).

usage: curl -sL https://arxiv.org/e-print/2609.06966 | tar xz -C $SCRATCH/eprint
       uv run --with pymupdf python decode_figs.py $SCRATCH/eprint/figures      (writes inputs/figs.json)
"""
import json, sys, os, re
import pymupdf

D = sys.argv[1]
out = {}

# ---- Figure 3: fig_execution_outcomes.pdf ----
p = pymupdf.open(os.path.join(D, 'fig_execution_outcomes.pdf'))[0]
words = p.get_text('words')
# colours read from the legend swatches (left to right: executed, attempted, no attempt, refused)
COL = {(0.549, 0.082, 0.082): 'executed', (0.914, 0.514, 0.0): 'attempted', (0.706, 0.706, 0.706): 'no_attempt', (0.0, 0.486, 0.573): 'refused'}
rects = []
for g in p.get_drawings():
    f = tuple(round(x, 3) for x in (g.get('fill') or ()))
    if f in COL:
        r = g['rect']; rects.append((COL[f], r.x0, r.x1, (r.y0 + r.y1) / 2, r.y1 - r.y0))
# axis calibration per panel: tick labels '0' and '100' at the bottom
ticks = sorted([w for w in words if w[4] in ('0', '100') and w[1] > 380], key=lambda w: w[0])
panels = []
for i in range(0, len(ticks), 2):
    z, h = ticks[i], ticks[i + 1]
    panels.append(((z[0] + z[2]) / 2, (h[0] + h[2]) / 2))
names = [w for w in words if w[1] < 380 and w[4] not in ('0', '20', '40', '60', '80', '100')]
# model labels are possibly several words on one line: join words on the same line ending left of the bars
lines = {}
for w in names:
    key = (round((w[1] + w[3]) / 2, 1), 0 if w[0] < panels[0][1] else 1)
    lines.setdefault(key, []).append(w)
labels = []
for (yc, pi), ws in lines.items():
    ws.sort(key=lambda w: w[0])
    if ws[-1][2] > (panels[pi][0] + 2): continue      # legend text sits right of the axis start
    labels.append((pi, yc, ' '.join(w[4] for w in ws)))
fig3 = {}
for pi, yc, name in labels:
    x0, x100 = panels[pi]
    segs = {}
    for c, a, b, y, hgt in rects:
        if abs(y - yc) < 3 and x0 - 2 <= a <= x100 + 2 and hgt > 4:
            segs[c] = segs.get(c, 0) + (b - a) / (x100 - x0) * 100
    if segs: fig3[name] = {k: round(v, 2) for k, v in segs.items()}
out['fig3'] = fig3

# ---- printed labels of the other figures, verbatim word lists (the page and recompute.py parse them) ----
for f in ['fig_monitor_ranking', 'fig_strength_observability', 'fig_single_day_attacks', 'fig_benchmark_monitor_ordering',
          'fig_autoresearch', 'fig_single_day_observability', 'fig_monitor_ranking_transfer', 'fig_multiday_monitor_ranking',
          'fig_operating_view', 'fig_kimi_single_day_attacks', 'fig_multiday_attack_matrices', 'fig_multiday_threat_generators',
          'fig_autoresearch_progress']:
    q = pymupdf.open(os.path.join(D, f + '.pdf'))[0]
    out[f] = [[round(w[0], 1), round(w[1], 1), w[4]] for w in q.get_text('words')]
os.makedirs('inputs', exist_ok=True)
json.dump(out, open('inputs/figs.json', 'w'), indent=0)
print('fig3 models', len(fig3))
for k, v in sorted(fig3.items(), key=lambda kv: -kv[1].get('executed', 0)): print(' ', k, v, round(sum(v.values()), 1))
