"""Decode the DSec paper's figures from the vector PDFs in its arXiv e-print (no reading by eye).

usage (from src/):
  curl -sL https://arxiv.org/e-print/2609.22978 -o /tmp/dsec.tgz && mkdir -p /tmp/dsec_ep && tar xzf /tmp/dsec.tgz -C /tmp/dsec_ep
  uv run --with pymupdf python decode_figs.py /tmp/dsec_ep/figs

Each axis is calibrated on its own tick marks (the short dark lines beside the printed tick labels),
fitted by least squares; the largest calibration residual is recorded per axis. Markers are read as the
centre of their bounding box, lines as their vertices. Output: inputs/figs.json (PDFs are not kept).
"""
import json, math, os, re, sys
import pymupdf

D = sys.argv[1]
COL = {(0.8, 0.33, 0.39): 'red', (0.19, 0.53, 0.83): 'blue', (0.86, 0.63, 0.17): 'yellow',
       (0.51, 0.71, 0.47): 'green', (0.54, 0.54, 0.54): 'grey'}


def load(path):
    p = pymupdf.open(os.path.join(D, path))[0]
    words = [dict(t=w[4], x=(w[0] + w[2]) / 2, y=(w[1] + w[3]) / 2) for w in p.get_text('words')]
    drs = []
    for x in p.get_drawings():
        pts = []
        for it in x['items']:
            if it[0] == 'l': pts += [(it[1].x, it[1].y), (it[2].x, it[2].y)]
            elif it[0] == 'c': pts += [(it[1].x, it[1].y), (it[4].x, it[4].y)]
            elif it[0] == 're': r = it[1]; pts += [(r.x0, r.y0), (r.x1, r.y1)]
        c = x.get('color') or x.get('fill')
        c = tuple(round(v, 2) for v in c) if c else None
        # drop repeated vertices (each segment repeats the previous end)
        q = []
        for pt in pts:
            if not q or abs(q[-1][0] - pt[0]) > 1e-6 or abs(q[-1][1] - pt[1]) > 1e-6: q.append(pt)
        drs.append(dict(col=COL.get(c, str(c)), raw=c, type=x.get('type'), dash=bool(x.get('dashes') and x['dashes'] != '[] 0'),
                        n=len(x['items']), pts=q, kinds=[it[0] for it in x['items']]))
    return words, drs


def num(t, log):
    t = t.replace(',', '').replace('−', '-')
    if log:
        m = re.fullmatch(r'10(-?\d)', t)
        return int(m.group(1)) if m else None
    try: return float(t)
    except ValueError: return None


def axis(words, drs, which, box, log=False):
    """which 'x' or 'y'; box=(x0,y0,x1,y1) where the tick labels sit. Returns (fn coord->value, info)."""
    ticks = [d for d in drs if d['raw'] == (0.27, 0.27, 0.27) and len(d['pts']) == 2]
    pairs = []
    for w in words:
        if not (box[0] <= w['x'] <= box[2] and box[1] <= w['y'] <= box[3]): continue
        v = num(w['t'], log)
        if v is None: continue
        best = None
        for t in ticks:
            (x1, y1), (x2, y2) = t['pts']
            if which == 'x' and abs(x1 - x2) < 0.01 and abs(y1 - y2) < 5:
                dd = abs(x1 - w['x']) + 0.05 * abs(max(y1, y2) - w['y'])
            elif which == 'y' and abs(y1 - y2) < 0.01 and abs(x1 - x2) < 5:
                dd = abs(y1 - w['y']) + 0.05 * abs(min(x1, x2) - w['x'])
            else: continue
            if best is None or dd < best[0]: best = (dd, x1 if which == 'x' else y1)
        if best and best[0] < 12: pairs.append((best[1], v))
    n = len(pairs); sx = sum(p[0] for p in pairs); sv = sum(p[1] for p in pairs)
    sxx = sum(p[0] ** 2 for p in pairs); sxv = sum(p[0] * p[1] for p in pairs)
    b = (n * sxv - sx * sv) / (n * sxx - sx * sx); a = (sv - b * sx) / n
    res = max(abs(a + b * c - v) for c, v in pairs)
    f = (lambda c: 10 ** (a + b * c)) if log else (lambda c: a + b * c)
    return f, dict(ticks=n, max_residual=round(res, 6), log=log)


def ctr(d):
    xs = [p[0] for p in d['pts']]; ys = [p[1] for p in d['pts']]
    return ((min(xs) + max(xs)) / 2, (min(ys) + max(ys)) / 2)


def inside(d, box):
    xs = [p[0] for p in d['pts']]; ys = [p[1] for p in d['pts']]
    return box[0] - 1 <= min(xs) and max(xs) <= box[2] + 1 and box[1] - 1 <= min(ys) and max(ys) <= box[3] + 1


def line(d, fx, fy, box=None, nd=4):
    out = []
    for x, y in d['pts']:
        if box and not (box[0] - .5 <= x <= box[2] + .5): continue
        out.append([round(fx(x), nd), round(fy(y), nd)])
    return out


OUT = {}
W = 'cut'

# ---- Figure 13: QoS (agent time against background load) ----
w, dr = load('8_eval/qos_effect.pdf')
fx, ix = axis(w, dr, 'x', (60, 200, 500, 225)); fy, iy = axis(w, dr, 'y', (20, 0, 55, 205))
plot = (59, 5.8, 498.3, 201.1)
S = {}
for col, name, kind in (('blue', 'baseline', 'c'), ('green', 'idle', 'l'), ('red', 'idle + core', 're')):
    legend = (65.7, 12.5, 230.3, 88.3)
    marks = [ctr(d) for d in dr if d['col'] == col and d['type'] == 'fs' and d['kinds'][0] == kind and d['n'] in (1, 3, 8)
             and inside(d, plot) and not inside(d, legend)]
    marks = sorted({(round(x, 1), round(y, 1)) for x, y in marks})
    # markers: one per load level (x = 10..50); error bars: vertical stroke lines of this colour
    pts = {}
    for x, y in marks:
        if 70 < x and inside({'pts': [(x, y)]}, plot): pts.setdefault(round(fx(x)), []).append(fy(y))
    bars = {}
    for d in dr:
        if d['col'] == col and d['type'] == 's' and len(d['pts']) == 2 and abs(d['pts'][0][0] - d['pts'][1][0]) < .01:
            bars[round(fx(d['pts'][0][0]))] = sorted([round(fy(d['pts'][0][1]), 4), round(fy(d['pts'][1][1]), 4)])
    S[name] = [dict(load=k, t=round(sorted(v)[len(v) // 2], 4), bar=bars.get(k)) for k, v in sorted(pts.items())]
ref = [d for d in dr if d['raw'] == (0.5, 0.5, 0.5) and len(d['pts']) == 2 and d['pts'][0][0] < 60]
OUT['fig13'] = dict(src='figs/8_eval/qos_effect.pdf', x=ix, y=iy, series=S,
                    no_load=round(fy(ref[0]['pts'][0][1]), 4) if ref else None)

# ---- Figure 12: memory (left) and CPU (right) under four Firecracker configurations ----
w, dr = load('8_eval/uvm_mem.pdf')
fxa, ixa = axis(w, dr, 'x', (60, 168, 320, 182)); fya, iya = axis(w, dr, 'y', (30, 30, 60, 170))
fxb, ixb = axis(w, dr, 'x', (400, 168, 560, 182)); fyb, iyb = axis(w, dr, 'y', (380, 30, 395, 170))
fxc, ixc = axis(w, dr, 'x', (600, 168, 690, 182))
pa = (62.9, 30.1, 310.2, 162.6); pb = (400.6, 30.1, 587.3, 162.6); pc = (591.6, 30.1, 684.9, 162.6)
S = {}
names = {'grey': 'baseline', 'blue': 'pmem', 'green': 'fpr', 'red': 'pmem+fpr'}
for col, name in names.items():
    ls = [d for d in dr if d['col'] == col and d['type'] == 's' and d['n'] > 20]
    mk = [d for d in dr if d['col'] == col and d['type'] == 'fs' and d['n'] in (1, 3, 4, 8) and ctr(d)[1] > 25]
    S[name] = dict(
        mem_line=line([d for d in ls if inside(d, (0, 0, 315, 200)) or min(p[0] for p in d['pts']) < 320][0], fxa, fya, pa, 2),
        mem_marks=[[round(fxa(c[0]), 2), round(fya(c[1]), 1)] for c in sorted(ctr(d) for d in mk if inside(d, pa))],
        cpu_line_early=line([d for d in ls if min(p[0] for p in d['pts']) > 340 and max(p[0] for p in d['pts']) > 690 and d['n'] < 150][0], fxb, fyb, pb, 2),
        cpu_line_late=line([d for d in ls if min(p[0] for p in d['pts']) > 550 and d['n'] > 150][0], fxc, fyb, pc, 2),
        cpu_marks=[[round((fxb if c[0] < 590 else fxc)(c[0]), 2), round(fyb(c[1]), 2)] for c in sorted(ctr(d) for d in mk if inside(d, (395, 25, 690, 170)))])
OUT['fig12'] = dict(src='figs/8_eval/uvm_mem.pdf', x_mem=ixa, y_mem=iya, x_cpu=ixb, x_cpu_late=ixc, y_cpu=iyb, series=S)

# ---- Figure 10: on-demand EROFS against eager Docker pulls ----
w, dr = load('8_eval/docker_pull_comparison.pdf')
fxa, ixa = axis(w, dr, 'x', (60, 176, 310, 190)); fya, iya = axis(w, dr, 'y', (40, 50, 65, 175))
fxb, ixb = axis(w, dr, 'x', (405, 176, 655, 190)); fyb, iyb = axis(w, dr, 'y', (380, 50, 410, 175))
fyc, iyc = axis(w, dr, 'y', (655, 50, 680, 175))
names = {'yellow': 'Docker (cached)', 'blue': 'Docker (cold)', 'red': 'EROFS'}
S = {}
for col, name in names.items():
    ls = [d for d in dr if d['col'] == col and d['type'] == 's' and d['n'] > 5]
    run = [d for d in ls if max(p[0] for p in d['pts']) < 320][0]
    iops = [d for d in ls if min(p[0] for p in d['pts']) > 400 and not d['dash']][0]
    tot = [d for d in ls if min(p[0] for p in d['pts']) > 400 and d['dash']][0]
    S[name] = dict(running=line(run, fxa, fya, None, 2), iops=line(iops, fxb, fyb, None, 1), total_gb=line(tot, fxb, fyc, None, 1))
OUT['fig10'] = dict(src='figs/8_eval/docker_pull_comparison.pdf', x_run=ixa, y_run=iya, x_io=ixb, y_iops=iyb, y_total=iyc, series=S)

# ---- Figure 11: tar against EROFS, setup CPU and disk writes ----
w, dr = load('8_eval/tar_cpu_diskio_ab.pdf')
fx, ix = axis(w, dr, 'x', (60, 252, 470, 265)); fya, iya = axis(w, dr, 'y', (40, 0, 65, 115)); fyb, iyb = axis(w, dr, 'y', (40, 150, 65, 252))
S = {}
for col, name in (('blue', 'Tar'), ('red', 'EROFS')):
    ls = [d for d in dr if d['col'] == col and d['type'] == 's' and d['n'] > 5]
    cpu = [d for d in ls if max(p[1] for p in d['pts']) < 120][0]; dw = [d for d in ls if min(p[1] for p in d['pts']) > 140][0]
    S[name] = dict(cpu=line(cpu, fx, fya, None, 2), write_mb_s=line(dw, fx, fyb, None, 1))
OUT['fig11'] = dict(src='figs/8_eval/tar_cpu_diskio_ab.pdf', x=ix, y_cpu=iya, y_write=iyb, series=S)

# ---- Figure 6: live sandboxes on one node over a day ----
w, dr = load('4_workload/sandbox_num.pdf')
fx, ix = axis(w, dr, 'x', (55, 205, 500, 220)); fy, iy = axis(w, dr, 'y', (30, 15, 60, 175))
S = {}
for col, name in (('red', 'Container'), ('blue', 'microVM')):
    d = [d for d in dr if d['col'] == col and d['n'] > 100][0]
    S[name] = line(d, fx, fy, None, 1)
OUT['fig6'] = dict(src='figs/4_workload/sandbox_num.pdf', x=ix, y=iy, series=S)

# ---- CDFs: Figures 2, 7, 8 (log x) and 5 (broken linear x) ----
def cdf(path, xbox, ybox, cols, log=True):
    w, dr = load(path)
    fx, ix = axis(w, dr, 'x', xbox, log); fy, iy = axis(w, dr, 'y', ybox)
    S = {}
    for col, name in cols:
        d = [d for d in dr if d['col'] == col and d['type'] == 's' and d['n'] > 20][0]
        S[name] = line(d, fx, fy, None, 4)
    labels = ' '.join(x['t'] for x in w)
    return dict(src=path, x=ix, y=iy, series=S, printed=labels)
OUT['fig2'] = cdf('4_workload/sandbox_num_per_task.pdf', (40, 200, 380, 220), (20, 5, 50, 205), (('red', 'Container'), ('blue', 'microVM')))
OUT['fig7'] = cdf('4_workload/lifetime.pdf', (40, 200, 500, 220), (20, 5, 50, 205), (('red', 'Container'), ('blue', 'microVM')))
OUT['fig8'] = cdf('4_workload/fanout.pdf', (60, 200, 470, 220), (20, 5, 50, 205), (('red', 'Container'), ('blue', 'microVM')))
w, dr = load('4_workload/resource_usage.pdf')
fxa, ixa = axis(w, dr, 'x', (45, 208, 215, 222)); fxb, ixb = axis(w, dr, 'x', (285, 208, 515, 222)); fy, iy = axis(w, dr, 'y', (20, 5, 50, 210))
S = {}
for col, what in (('red', 'Container CPU'), ('yellow', 'Container mem'), ('blue', 'microVM CPU'), ('green', 'microVM mem')):
    for dash, stat in ((False, 'avg'), (True, 'peak')):
        ds = [d for d in dr if d['col'] == col and d['type'] == 's' and d['n'] > 20 and d['dash'] == dash]
        left = [d for d in ds if min(p[0] for p in d['pts']) < 100][0]; right = [d for d in ds if min(p[0] for p in d['pts']) > 200][0]
        S[what + ' ' + stat] = line(left, fxa, fy, (51.2, 0, 277.0, 999), 4) + line(right, fxb, fy, (281.6, 0, 507.4, 999), 4)
OUT['fig5'] = dict(src='figs/4_workload/resource_usage.pdf', x_left=ixa, x_right=ixb, y=iy, series=S)

# ---- Figure 3: one representative sandbox (CPU cores and memory over time, phase bands) ----
w, dr = load('4_workload/sandbox_phase.pdf')
fx, ix = axis(w, dr, 'x', (45, 252, 455, 266)); fya, iya = axis(w, dr, 'y', (25, 55, 45, 252))
# right axis (memory, GB) has tick labels at x about 470
fyb, iyb = axis(w, dr, 'y', (460, 55, 480, 252))
S = {}
for col, name in (('red', 'Container'), ('blue', 'microVM')):
    cpu = [d for d in dr if d['col'] == col and d['type'] == 's' and d['n'] > 20 and not d['dash']][0]
    mem = [d for d in dr if d['col'] == col and d['type'] == 's' and d['n'] > 20 and d['dash']][0]
    S[name] = dict(cpu=line(cpu, fx, fya, (51.2, 0, 449.7, 999), 3), mem=line(mem, fx, fyb, (51.2, 0, 449.7, 999), 3))
OUT['fig3'] = dict(src='figs/4_workload/sandbox_phase.pdf', x=ix, y_cpu=iya, y_mem=iyb, series=S,
                   phases=dict(setup=[round(fx(51.2)), round(fx(101.0))], tool_call=[round(fx(101.0)), round(fx(399.9))], test=[round(fx(399.9)), round(fx(449.7))]))

here = os.path.dirname(os.path.abspath(__file__))
json.dump(OUT, open(os.path.join(here, 'inputs', 'figs.json'), 'w'), separators=(',', ':'))
for k, v in OUT.items():
    print(k, {kk: vv for kk, vv in v.items() if isinstance(vv, dict) and 'ticks' in vv})
