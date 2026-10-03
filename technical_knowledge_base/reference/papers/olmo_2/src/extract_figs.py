"""Read the OLMo 2 report's training-curve figures from the vector PDFs in the arXiv v3 source, calibrated on
each axis's own tick marks, and write olmo2_figs_full.json in the temp folder (every vertex of every curve, in data units, about 7 MB, so not
kept in the repo; mk_curves.py turns it into the page's data and the spike scores).
The PDFs are not kept in the repo: the script downloads and unpacks the e-print into a temporary folder.
usage: uv run --with pymupdf python extract_figs.py [path/to/unpacked/arxiv/source]

Figures read (paper numbering, arXiv v3):
  Fig. 2  mitchishvpeteish-v2.pdf   OLMo-0424 7B against OLMo 2 7B, loss and gradient norm, whole run
  Fig. 3  without_/with_data_filter_gnorm.pdf   gradient norm without and with the repeated n-gram filter
  Fig. 4  inits.pdf                  old (scaled) against new (normal 0.02) initialisation, loss and gradient norm
  Fig. 5  willm-plots/lyupanov.pdf   growth exponents against width
  Fig. 7  qk_norm_reorder.pdf        pre-attention norm against reordered norm + QK-norm, gradient norm
  Fig. 8  zloss.pdf                  fused against unfused z-loss
  Fig. 9  adameps.pdf                AdamW eps 1e-5 against 1e-8, loss and gradient norm
  Fig. 10 embedding_wd_comp(_emb_norm).pdf   weight decay on embeddings or not: gradient norm, embedding norm
  Fig. 11 learningrates.pdf, learningrateanneals.pdf   four peak learning rates, then anneals to zero
  Fig. 1  olmo2.pdf                  markers of the FLOPs against average-score plot (positions only)
"""
import json, math, os, subprocess, sys, tempfile
import pymupdf

def source_dir():
    if len(sys.argv) > 1: return sys.argv[1]
    d = os.path.join(tempfile.gettempdir(), 'olmo2src')
    if not os.path.exists(os.path.join(d, 'figures', 'inits.pdf')):
        os.makedirs(d, exist_ok=True)
        subprocess.run(['sh', '-c', 'curl -sL https://arxiv.org/e-print/2501.00656v3 | tar -xz -C ' + d], check=True)
    return d

F = os.path.join(source_dir(), 'figures')
def page(f): return pymupdf.open(os.path.join(F, f))[0]

def ticks(pg):
    """Major tick marks (black, width 0.8, length 3.5): x ticks hang below an axis, y ticks stick out left."""
    xs, ys = [], []
    for d in pg.get_drawings():
        if len(d['items']) != 1 or d['items'][0][0] != 'l' or d.get('color') != (0.0, 0.0, 0.0): continue
        a, b = d['items'][0][1], d['items'][0][2]
        if abs((d.get('width') or 0) - 0.8) > 0.01: continue
        if abs(a.x - b.x) < 0.01 and abs(abs(b.y - a.y) - 3.5) < 0.05: xs.append((round(a.x, 3), round(a.y, 3)))
        if abs(a.y - b.y) < 0.01 and abs(abs(b.x - a.x) - 3.5) < 0.05: ys.append((round(a.x, 3), round(a.y, 3)))
    return xs, ys

def axis(px, vals, log=False):
    """Map pixel to value from two (pixel, value) pairs; least squares over all pairs given."""
    t = [math.log10(v) for v in vals] if log else list(vals)
    n = len(px); mx = sum(px) / n; mt = sum(t) / n
    k = sum((p - mx) * (q - mt) for p, q in zip(px, t)) / sum((p - mx) ** 2 for p in px)
    res = max(abs(mt + k * (p - mx) - q) for p, q in zip(px, t))
    f = (lambda p: 10 ** (mt + k * (p - mx))) if log else (lambda p: mt + k * (p - mx))
    return f, res

def curves(pg, box, minitems=30):
    """Colored polylines with many segments whose bounding box lies in the axes box (x0, y0, x1, y1)."""
    out = []
    for d in pg.get_drawings():
        if len(d['items']) < minitems or not d.get('color'): continue
        r = d['rect']
        if r.x0 < box[0] - 2 or r.x1 > box[2] + 2: continue
        if r.y1 < box[1] - 5 or r.y1 > box[3] + 5: continue  # the curve's lowest point lies in this panel
        pts = []
        for it in d['items']:
            if it[0] != 'l': continue
            if not pts: pts.append((it[1].x, it[1].y))
            pts.append((it[2].x, it[2].y))
        out.append({'color': tuple(round(c, 2) for c in d['color']), 'pts': pts, 'rect': (r.x0, r.y0, r.x1, r.y1)})
    return out

BLUE, ORANGE = (0.12, 0.47, 0.71), (1.0, 0.5, 0.05)
LRC = {(0.84, 0.15, 0.16): '12e-4', (0.17, 0.63, 0.17): '9e-4', (1.0, 0.5, 0.06): '6e-4', (0.12, 0.47, 0.7): '3e-4'}
def near(c, ref): return max(abs(a - b) for a, b in zip(c, ref)) < 0.03

def conv(c, fx, fy, top=None):
    """Curve vertices in data units. Vertices above the axes' top edge (matplotlib draws them up to the page edge and clips
    them with a clip path) are off-scale: their true value is larger than the axis shows, so they are counted, not trusted."""
    xs, ys, clip = [], [], 0
    for x, y in c['pts']:
        xs.append(fx(x)); ys.append(fy(y))
        if top is not None and y < top - 0.01: clip += 1
    return {'x': xs, 'y': ys, 'clipped_vertices': clip}

out = {'_doc': 'Every vertex of every curve read from the vector graphics of the arXiv v3 source PDFs (figures/*.pdf), '
               'calibrated on the axes\' major tick marks (least squares; the largest calibration residual is recorded per axis). '
               'Matplotlib simplifies paths when it writes a PDF (vertices within about 1/9 pixel of a straight line are dropped), '
               'so these are the drawn vertices, not every logged step.'}
cal = {}

def panel(name, pg, xs_ticks, ys_ticks, xvals, yvals, ylog, box, series_map):
    fx, rx = axis([p[0] for p in xs_ticks], xvals)
    fy, ry = axis([p[1] for p in ys_ticks], yvals, ylog)
    cal[name] = {'x_residual': rx, 'y_residual': ry, 'x_ticks': xvals, 'y_ticks': yvals, 'ylog': ylog}
    res = {}
    for c in curves(pg, box):
        key = series_map(c)
        if key is None: continue
        s = conv(c, fx, fy, box[1])
        if key in res:  # a curve drawn as several paths: join in drawing order
            for k in ('x', 'y'): res[key][k] += s[k]
            res[key]['clipped_vertices'] += s['clipped_vertices']
        else: res[key] = s
    out[name] = res
    return res

def by_color(m):
    def f(c):
        for ref, k in m:
            if near(c['color'], ref): return k
        return None
    return f

# Figure 4: inits.pdf, two panels sharing x
pg = page('inits.pdf'); X, Y = ticks(pg)
xt = sorted({p for p in X if abs(p[1] - 203.04) < .1}); xb = sorted({p for p in X if abs(p[1] - 384.48) < .1})
yt = sorted([p for p in Y if p[1] < 210], key=lambda p: -p[1]); yb = sorted([p for p in Y if p[1] > 230], key=lambda p: -p[1])
panel('fig4_loss', pg, xt, yt, [0, 2000, 4000, 6000, 8000, 10000, 12000, 14000, 16000], [2, 4, 6, 8, 10], False, (90, 51.84, 648, 203.04),
      by_color([(BLUE, 'old init'), (ORANGE, 'new init')]))
panel('fig4_gnorm', pg, xb, yb, [0, 2000, 4000, 6000, 8000, 10000, 12000, 14000, 16000], [0, 2, 4, 6, 8, 10], False, (90, 233.28, 648, 384.48),
      by_color([(BLUE, 'old init'), (ORANGE, 'new init')]))

# Figure 3: n-gram filter, two files; y log ticks 10^-1, 10^0, 10^1
for fn, key in (('without_data_filter_gnorm.pdf', 'without filter'), ('with_data_filter_gnorm.pdf', 'with filter')):
    pg = page(fn); X, Y = ticks(pg)
    r = panel('fig3_' + key.replace(' ', '_'), pg, sorted(X), sorted(Y, key=lambda p: -p[1]), [0, 2500, 5000, 7500, 10000, 12500, 15000, 17500],
              [0.1, 1, 10], True, (57.87, 7.2, 392.67, 173.52), by_color([(BLUE, key)]))

# Figure 7: QK-norm + reordered norm; y log majors 10^-1, 10^0
pg = page('qk_norm_reorder.pdf'); X, Y = ticks(pg)
panel('fig7_gnorm', pg, sorted(X), sorted(Y, key=lambda p: -p[1]), [0, 20000, 40000, 60000, 80000, 100000, 120000, 140000, 160000], [0.1, 1], True,
      (67.72, 7.2, 960.52, 228.96), by_color([(BLUE, 'pre-attention norm'), (ORANGE, 'reordered norm + QK-norm')]))

# Figure 8: z-loss; y log with one major (10^-3); a minor tick (2 x 10^-3 at y = 76.27) fixes the decade
pg = page('zloss.pdf'); X, Y = ticks(pg)
fx, rx = axis([p[0] for p in sorted(X)], [440000, 450000, 460000, 470000, 480000, 490000, 500000, 510000, 520000])
fy, ry = axis([104.76, 76.27], [1e-3, 2e-3], True)
cal['fig8_zloss'] = {'x_residual': rx, 'y_from': 'major 1e-3 at 104.76 and minor 2e-3 at 76.27; minors 2e-4..9e-4 checked below'}
cal['fig8_zloss']['minor_check'] = [round(fy(y) / 1e-4, 3) for y in (170.91, 154.24, 142.42, 133.25, 125.75, 119.42, 113.93, 109.09)]
out['fig8_zloss'] = {}
for c in curves(pg, (90, 0, 648, 192.24)):
    k = 'with fused z-loss' if near(c['color'], BLUE) else 'without fused z-loss' if near(c['color'], ORANGE) else None
    if k: out['fig8_zloss'][k] = conv(c, fx, fy, 25.92)

# Figure 9: AdamW eps; left loss (log, major 10^1 at 25.92, minor 3 x 10^0 at 159.2), right gradient norm (log majors)
pg = page('adameps.pdf'); X, Y = ticks(pg)
XL = sorted(p for p in X if p[0] < 350); XR = sorted(p for p in X if p[0] > 390)
fx, rx = axis([p[0] for p in XL], [0, 2000, 4000, 6000, 8000]); fy, ry = axis([25.92, 159.2], [10, 3], True)
cal['fig9_loss'] = {'x_residual': rx, 'y_from': 'major 10 at 25.92 and labelled minor 3 at 159.2', 'minor_check_4_6': [round(fy(127.35), 3), round(fy(82.47), 3)]}
leg = {}
for d in pg.get_drawings():  # legend handles: 2-segment horizontal lines; their labels are the eps values below each other
    if len(d['items']) == 2 and d.get('color') and abs(d['rect'].y1 - d['rect'].y0) < .01 and d['rect'].x0 > 200 and d['rect'].x0 < 350:
        leg[round(d['rect'].y0, 1)] = tuple(round(c, 2) for c in d['color'])
ly = sorted(leg)  # first legend row is eps = 1e-8, second 1e-5 (text order on the page)
emap = [(leg[ly[0]], 'eps 1e-8'), (leg[ly[1]], 'eps 1e-5')]
cal['fig9_legend'] = {'rows_y': ly, 'colors': [leg[y] for y in ly], 'labels': ['eps 1e-8', 'eps 1e-5']}
out['fig9_loss'] = {}
for c in curves(pg, (90, 0, 343.64, 192.24)):
    k = by_color(emap)(c)
    if k: out['fig9_loss'][k] = conv(c, fx, fy, 25.92)
fx2, rx2 = axis([p[0] for p in XR], [0, 2000, 4000, 6000, 8000]); fy2, ry2 = axis([167.21, 84.05], [0.1, 1], True)
cal['fig9_gnorm'] = {'x_residual': rx2, 'y_residual': ry2}
out['fig9_gnorm'] = {}
for c in curves(pg, (394.36, 0, 648, 192.24)):
    k = by_color(emap)(c)
    if k: out['fig9_gnorm'][k] = conv(c, fx2, fy2, 25.92)

# Figure 10: embeddings weight decay; gradient norm (log majors 10^-1, 10^0) and embedding norm (linear 0..2000)
pg = page('embedding_wd_comp.pdf'); X, Y = ticks(pg)
panel('fig10_gnorm', pg, sorted(X), sorted(Y, key=lambda p: -p[1]), [0, 50000, 100000, 150000, 200000, 250000], [0.1, 1], True,
      (57.87, 7.2, 392.67, 173.52), by_color([(BLUE, 'no weight decay on embeddings'), (ORANGE, 'weight decay on embeddings')]))
pg = page('embedding_wd_comp_emb_norm.pdf'); X, Y = ticks(pg)
fx, rx = axis([p[0] for p in sorted(X)], [0, 50000, 100000, 150000, 200000, 250000]); fy, ry = axis([p[1] for p in sorted(Y, key=lambda p: -p[1])], [0, 500, 1000, 1500, 2000])
cal['fig10_embnorm'] = {'x_residual': rx, 'y_residual': ry}
out['fig10_embnorm'] = {}
for c in curves(pg, (59.31, 0, 394.11, 173.52), minitems=20):
    k = 'no weight decay on embeddings' if near(c['color'], BLUE) else 'weight decay on embeddings' if near(c['color'], ORANGE) else None
    if k: out['fig10_embnorm'][k] = conv(c, fx, fy, 7.2)

# Figure 11: learning rates (300B tokens) and anneals (from 300B: to zero over 50B or 100B)
pg = page('learningrates.pdf'); X, Y = ticks(pg)
fx, rx = axis([p[0] for p in sorted(X)], [0, 50, 100, 150, 200, 250, 300]); fy, ry = axis([p[1] for p in sorted(Y, key=lambda p: -p[1])], [2.40, 2.45, 2.50, 2.55, 2.60, 2.65, 2.70])
cal['fig11_lr'] = {'x_residual': rx, 'y_residual': ry, 'x_unit': 'billion tokens'}
out['fig11_lr'] = {}
for c in curves(pg, (76.97, 0, 634.97, 345.54)):
    for ref, k in LRC.items():
        if near(c['color'], ref): out['fig11_lr'][k] = conv(c, fx, fy, 12.9)
pg = page('learningrateanneals.pdf'); X, Y = ticks(pg)
fx, rx = axis([p[0] for p in sorted(X)], [280, 300, 320, 340, 360, 380, 400]); fy, ry = axis([p[1] for p in sorted(Y, key=lambda p: -p[1])], [2.300, 2.325, 2.350, 2.375, 2.400, 2.425, 2.450, 2.475, 2.500])
cal['fig11_anneal'] = {'x_residual': rx, 'y_residual': ry, 'x_unit': 'billion tokens'}
out['fig11_anneal'] = {}
for c in curves(pg, (86.51, 0, 644.51, 344.27)):
    for ref, k in LRC.items():
        if near(c['color'], ref):
            seg = 'before' if c['rect'][2] < 230 else ('50B' if c['rect'][2] < 430 else '100B')
            out['fig11_anneal'][k + ' ' + seg] = conv(c, fx, fy, 11.63)

# Figure 2: OLMo-0424 7B against OLMo 2 7B (text drawn as outlines; tick values read from the rendered figure:
# x 0..600,000 by 100,000; loss 2.0..3.0 by 0.2; gradient norm 0.0..3.0 by 0.5). Vertices at y = -1 are clipped by the axes.
pg = page('mitchishvpeteish-v2.pdf'); X, Y = ticks(pg)
xt = sorted(p for p in X if abs(p[1] - 203.04) < .1); xb = sorted(p for p in X if abs(p[1] - 384.48) < .1)
yt = sorted([p for p in Y if p[1] < 210], key=lambda p: -p[1]); yb = sorted([p for p in Y if p[1] > 230], key=lambda p: -p[1])
xv = [0, 100000, 200000, 300000, 400000, 500000, 600000]
m2 = by_color([((0.12, 0.47, 0.71), 'OLMo-0424 7B'), ((1.0, 0.5, 0.05), 'OLMo 2 7B')])
fx, rx = axis([p[0] for p in xt], xv); fy, ry = axis([p[1] for p in yt], [2.0, 2.2, 2.4, 2.6, 2.8, 3.0])
cal['fig2_loss'] = {'x_residual': rx, 'y_residual': ry}
out['fig2_loss'] = {}
for c in curves(pg, (90, -2, 648, 203.04)):
    k = m2(c)
    if k and c['rect'][3] < 210: out['fig2_loss'][k] = conv(c, fx, fy, 51.84)
fx, rx = axis([p[0] for p in xb], xv); fy, ry = axis([p[1] for p in yb], [0, 0.5, 1.0, 1.5, 2.0, 2.5, 3.0])
cal['fig2_gnorm'] = {'x_residual': rx, 'y_residual': ry}
out['fig2_gnorm'] = {}
for c in curves(pg, (90, 200, 648, 384.48)):
    k = m2(c)
    if k and c['rect'][3] > 230: out['fig2_gnorm'][k] = conv(c, fx, fy, 233.28)

# Figure 5: growth exponents (short polylines: one vertex per width)
pg = page(os.path.join('willm-plots', 'lyupanov.pdf')); X, Y = ticks(pg)
fx, rx = axis([p[0] for p in sorted(X)], [0, 500, 1000, 1500, 2000, 2500, 3000, 3500, 4000]); fy, ry = axis([p[1] for p in sorted(Y, key=lambda p: -p[1])], [-0.10, -0.05, 0.0, 0.05, 0.10])
cal['fig5'] = {'x_residual': rx, 'y_residual': ry}
out['fig5'] = []
for d in pg.get_drawings():
    if not d.get('color') or len(d['items']) < 3 or len(d['items']) > 12: continue
    if d['rect'].x0 < 62 or d['rect'].x1 > 420: continue
    pts = [(d['items'][0][1].x, d['items'][0][1].y)] + [(it[2].x, it[2].y) for it in d['items'] if it[0] == 'l']
    out['fig5'].append({'color': [round(c, 2) for c in d['color']], 'dashes': d.get('dashes'),
                        'pts': [[round(fx(x)), round(fy(y), 4)] for x, y in pts]})

out['_calibration'] = cal
FULL = os.path.join(tempfile.gettempdir(), 'olmo2_figs_full.json')  # about 7 MB: kept out of the repo; mk_curves.py reads it
json.dump(out, open(FULL, 'w'), separators=(',', ':'))
print('wrote', FULL)
for k, v in out.items():
    if k.startswith('_'): continue
    if isinstance(v, dict): print(k, {s: (len(d['x']), d['clipped_vertices']) for s, d in v.items()})
    else: print(k, len(v), 'polylines')
print(json.dumps(cal, indent=0)[:3000])

# Figure 1: marker centres, read on the figure's own gridlines. The x axis is a square-root scale (gridline spacing
# grows as sqrt(FLOPs): 1e23 -> 2e23 is 23.1 pt, 2e23 -> 4e23 is 32.7 pt, a ratio of sqrt 2), so x is fitted as a + b sqrt(F).
pg = page('olmo2.pdf')
GX = [(57.01, 6e22), (63.7, 8e22), (69.59, 1e23), (92.72, 2e23), (125.42, 4e23), (150.51, 6e23), (171.67, 8e23), (190.31, 1e24), (263.43, 2e24), (366.85, 4e24), (446.2, 6e24)]
n = len(GX); sx = [math.sqrt(v) for _, v in GX]; px = [p for p, _ in GX]
mx, ms = sum(px) / n, sum(sx) / n; b = sum((p - mx) * (q - ms) for p, q in zip(px, sx)) / sum((q - ms) ** 2 for q in sx)
fit_res = max(abs(mx + b * (q - ms) - p) for p, q in zip(px, sx))
fxF = lambda p: (ms + (p - mx) / b) ** 2
lg_res = None
fyF, ryF = axis([252.45, 230.2, 207.95, 185.7, 163.45, 141.2, 118.94, 96.69, 74.44, 52.19, 29.94], list(range(30, 85, 5)))
marks = []
for d in pg.get_drawings():
    r = d['rect']
    if not (39 < r.x0 < 446 and 29 < r.y0 < 253) or not (3 < r.x1 - r.x0 < 14): continue
    kinds = ''.join(it[0] for it in d['items'])
    if not d.get('fill') and not d.get('color'): continue
    marks.append({'cx': (r.x0 + r.x1) / 2, 'cy': (r.y0 + r.y1) / 2, 'kinds': kinds[:6], 'fill': [round(c, 2) for c in (d.get('fill') or d.get('color'))]})
T6 = json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'tables.json')))['t6']['rows']
labels = []
for bk in pg.get_text('dict')['blocks']:
    for l in bk.get('lines', []):
        for s in l['spans']:
            if s['size'] == 9.0: labels.append((s['text'], s['bbox']))
pts = []
for m in marks:
    best = min(labels, key=lambda L: min(abs(L[1][0] - m['cx']), abs(L[1][2] - m['cx'])) + abs((L[1][1] + L[1][3]) / 2 - m['cy']))
    av = fyF(m['cy'])
    row = min(T6, key=lambda r: abs(float(r['c'][1]) - av))  # the Table 6 row whose average is nearest (labels are hand-placed)
    pts.append({'table6_row': row['c'][0], 'table6_avg': row['c'][1], 'table6_flops_e23': row['c'][2], 'nearest_label': best[0],
                'flops': float('%.3g' % fxF(m['cx'])), 'avg': round(av, 2), 'shape': m['kinds'], 'fill': m['fill']})
json.dump({'_doc': 'Figure 1 (olmo2.pdf in the arXiv v3 source): every marker centre, x read on a square-root axis fitted to the 11 labelled gridlines '
                   '(largest residual %.3f pt), y on the 11 labelled gridlines; each marker is matched to the Table 6 row with the nearest average (the star markers sit about 0.1 point high because a star\'s bounding box is not centred on its point).' % fit_res,
           'points': sorted(pts, key=lambda p: p['flops'])}, open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'inputs', 'fig1_points.json'), 'w'), indent=1)
print('fig1 sqrt-axis residual', round(fit_res, 4)); [print(' ', p) for p in sorted(pts, key=lambda p: p['flops'])]
