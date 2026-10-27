"""Decode the vector figures of Context Language Models (arXiv 2609.37725v1) from the PDFs in the arXiv e-print.

Markers are read from the vector paths and calibrated on each panel's own tick marks; labels printed on a
figure are kept as words. Nothing is read by eye.

usage: mkdir -p $SCRATCH/eprint/x && curl -sL https://arxiv.org/e-print/2609.37725 | tar xz -C $SCRATCH/eprint/x
       uv run --no-project --with pymupdf python decode_figs.py $SCRATCH/eprint/x/figures   (writes inputs/figs.json)

Figure 5 (pareto_q36_main.pdf) and the six panels of Figure 19 (pareto_9b_27b.pdf): one circle per method, white
for baselines and blue for CLM; each method's name is printed beside its circle. A label is assigned to the circle
that minimises the total label-to-circle distance over the panel (an exact assignment by brute force over all
permutations), and the assignment is checked against the numbers the text prints (recompute.py).
Figure 2 (livectxbench_gpt54_7arm.pdf): one marker shape and colour per method (from the legend swatches),
accuracy on a 0 to 1 axis; pressure levels are the marker x positions, named by the nearest printed tick.
"""
import itertools, json, math, os, sys
import pymupdf

D = sys.argv[1]
r2 = lambda v, d=2: float(round(v, d))


def circles(page):
    out = []
    for g in page.get_drawings():
        r = g['rect']; it = g['items']
        if 4 < r.width < 12 and len(it) == 8 and all(i[0] == 'c' for i in it):
            f = tuple(round(x, 3) for x in (g.get('fill') or ()))
            out.append(((r.x0 + r.x1) / 2, (r.y0 + r.y1) / 2, 'clm' if f != (1.0, 1.0, 1.0) else 'base'))
    return out


def bd(box, p):
    """Distance from a circle centre to the nearest point of a label's box (labels sit beside their circles)."""
    x0, y0, x1, y1 = box
    return math.hypot(max(x0 - p[0], 0, p[0] - x1), max(y0 - p[1], 0, p[1] - y1))


def assign(labels, pts):
    """labels: [(name, box, centre)], pts: [(x, y, kind)]; CLM is the only blue circle, the rest by least total
    box-to-circle distance, then the runner-up assignment's margin is kept to flag ambiguous panels."""
    res = {}
    lab = [l for l in labels if l[0] != 'CLM']
    blue = [p for p in pts if p[2] == 'clm']
    white = [p for p in pts if p[2] == 'base']
    assert len(blue) == 1 and len(white) == len(lab), (len(blue), len(white), len(lab))
    res['CLM'] = blue[0]
    allp = sorted((sum(bd(lab[i][1], white[j]) for i, j in enumerate(perm)), perm) for perm in itertools.permutations(range(len(white))))
    best, second = allp[0], allp[1]
    for i, j in enumerate(best[1]): res[lab[i][0]] = white[j]
    # the labels whose circle differs in the runner-up assignment, and by how many points of total distance
    swap = sorted(lab[i][0] for i in range(len(lab)) if best[1][i] != second[1][i])
    return res, {'swap_if_wrong': swap, 'margin_pt': r2(second[0] - best[0], 1)}


def pareto(path, panels, names):
    p = pymupdf.open(os.path.join(D, path))[0]
    words = p.get_text('words')
    pts = circles(p)
    out = {}
    for key, P in panels.items():
        x0, x1 = P['xr']; y0, y1 = P['yr']
        inside = lambda x, y: x0 < x < x1 and y0 < y < y1
        lab = [(w[4], w[:4]) for w in words if w[4] in names and inside((w[0] + w[2]) / 2, (w[1] + w[3]) / 2)]
        ps = [q for q in pts if inside(q[0], q[1])]
        a, amb = assign(lab, ps)
        fx, fy = P['fx'], P['fy']
        out[key] = {m: {'pflops': r2(fx(x), 2), 'acc': r2(fy(y), 1), 'xy': [r2(x, 2), r2(y, 2)]} for m, (x, y, _) in sorted(a.items())}
        out[key]['_ambiguity'] = amb
    return out


lin = lambda pa, va, pb, vb: (lambda q: va + (q - pa) * (vb - va) / (pb - pa))
res = {}
NAMES = ['Base', 'Summary', 'MEM1', 'Self-Compact', 'ACM', 'CLM', 'RLM']
# Figure 5: tick marks at x 77.7/111.67/145.65 (2.5/5.0/7.5), 221.11/252.42/283.73 (2.5/5.0/7.5),
# 370.63/425.28 (2/3); shared y ticks at 127.72/90.86/54.0 (25/50/75)
fy5 = lin(127.72, 25, 54.0, 75)
res['fig5'] = pareto('pareto_q36_main.pdf', {
    'bcp': dict(xr=(40, 180), yr=(30, 162), fx=lin(77.7, 2.5, 145.65, 7.5), fy=fy5),
    'tb21': dict(xr=(195, 320), yr=(30, 162), fx=lin(221.11, 2.5, 283.73, 7.5), fy=fy5),
    'tblite': dict(xr=(330, 475), yr=(30, 162), fx=lin(370.63, 2, 425.28, 3), fy=fy5)}, NAMES)


def ticks(page):
    """Short black tick marks: vertical ones (x axis) and horizontal ones (y axis)."""
    xs, ys = [], []
    for g in page.get_drawings():
        f = tuple(round(x, 2) for x in (g.get('fill') or ())); r = g['rect']
        k = ''.join(i[0] for i in g['items'])
        if k == 'l' and f == (0.0, 0.0, 0.0):
            if r.width < 0.01 and 3 < r.height < 4: xs.append((r.x0, r.y0))
            if r.height < 0.01 and 3 < r.width < 4: ys.append((r.x0, r.y0))
    return xs, ys


# Figure 19: top row Qwen3.5-9B, bottom row Qwen3.6-27B (the latter repeats Figure 5). Tick marks from ticks().
# The 9B BrowseComp-Plus panel prints 0.0, 1.5, 3.0 and 7.0 at equal spacing (a broken axis): x is read only
# up to 3.0 and reported as null beyond it.
def brk(q):
    v = lin(54.22, 0.0, 120.12, 3.0)(q)
    return v if q <= 121 else float('nan')
res['fig19'] = pareto('pareto_9b_27b.pdf', {
    '9b_bcp': dict(xr=(40, 190), yr=(25, 128), fx=brk, fy=lin(118.8, 0, 50.8, 40)),
    '9b_tb21': dict(xr=(225, 380), yr=(25, 128), fx=lin(272.84, 1, 361.36, 3), fy=lin(99.48, 10, 40.72, 30)),
    '9b_tblite': dict(xr=(420, 590), yr=(25, 128), fx=lin(453.45, 0.5, 508.37, 1.0), fy=lin(103.21, 30, 61.18, 40)),
    '27b_bcp': dict(xr=(40, 190), yr=(195, 300), fx=lin(77.65, 2.5, 143.06, 7.5), fy=lin(273.99, 20, 218.21, 60)),
    '27b_tb21': dict(xr=(225, 380), yr=(195, 300), fx=lin(265.39, 2.5, 335.48, 7.5), fy=lin(283.01, 20, 206.41, 60)),
    '27b_tblite': dict(xr=(420, 590), yr=(195, 300), fx=lin(481.78, 2, 553.57, 3), fy=lin(273.72, 40, 208.83, 80))}, NAMES)
for k, v in res['fig19'].items():
    for m, d in v.items():
        if m != '_ambiguity' and d['pflops'] != d['pflops']: d['pflops'] = None
# Figure 2 (livectxbench_gpt54_7arm.pdf): GPT-5.4, 32K limit, four seeds a level (eight for some).
# Panels in the order of the task pictures above the caption: Needle Retention, Sudoku Sketchpad, KV Store, Log Triage.
ARMS = {(0.64, 0.62, 0.58): 'Base', (0.9, 0.72, 0.36): 'RLM', (0.89, 0.61, 0.69): 'Summary', (0.55, 0.75, 0.6): 'Context Folding',
        (0.61, 0.56, 0.83): 'Self-Compact', (0.44, 0.66, 0.72): 'ACM', (0.02, 0.41, 0.88): 'CLM'}
P2 = [('needle', (20, 120), [(27.8, 0.5), (58.3, 2), (88.9, 8), (113.1, 24)]),
      ('sudoku', (130, 236), [(152.6, 0.5), (172.9, 1), (191.3, 2), (209.0, 4), (226.2, 8)]),
      ('kv', (240, 346), [(265.8, 0.5), (291.3, 2), (316.9, 8), (337.1, 24)]),
      ('log', (350, 456), [(362.5, 0.25), (391.0, 1), (419.6, 4), (448.1, 16)])]
p2 = pymupdf.open(os.path.join(D, 'gpt54', 'livectxbench_gpt54_7arm.pdf'))[0]
f2 = {}
for g in p2.get_drawings():
    r = g['rect']; f = tuple(round(x, 2) for x in (g.get('fill') or ()))
    if f not in ARMS or not (3 < r.width < 5.5) or r.y0 > 70: continue
    cx, cy = (r.x0 + r.x1) / 2, (r.y0 + r.y1) / 2
    for task, (a, b), tk in P2:
        if a < cx < b:
            # pressure: log-linear between the two nearest printed ticks (markers sit on or between them)
            tk2 = sorted(tk, key=lambda t: abs(t[0] - cx))[:2]; tk2.sort()
            (xa, va), (xb, vb) = tk2
            pr = 2 ** (math.log2(va) + (cx - xa) * (math.log2(vb) - math.log2(va)) / (xb - xa))
            near = min(tk, key=lambda t: abs(t[0] - cx))
            f2.setdefault(task, {}).setdefault(ARMS[f], []).append({'x': r2(cx, 1), 'pressure': near[1] if abs(near[0] - cx) < 1.5 else float('%.2g' % pr),
                                                                     'acc': r2(min(1.0, max(0.0, (60.5 - cy) / (60.5 - 7.5))), 2)})
for t in f2:
    for m in f2[t]: f2[t][m].sort(key=lambda d: d['x'])
res['fig2'] = f2
os.makedirs('inputs', exist_ok=True)
json.dump(res, open('inputs/figs.json', 'w'), indent=0)
print(json.dumps(res['fig5'], indent=0)[:3000])
print(json.dumps(res['fig19']))
for t in f2: print(t, {m: [(d['pressure'], d['acc']) for d in v] for m, v in f2[t].items()})
