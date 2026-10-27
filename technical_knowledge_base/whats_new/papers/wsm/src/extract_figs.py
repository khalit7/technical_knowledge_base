"""Read exact data points from the paper's vector figures (arXiv e-print, figs/*.pdf), calibrated on each panel's own
gridlines and tick labels. Never reads curves by eye: every value is a marker centre mapped through the panel's axes.
usage: curl -sL https://arxiv.org/e-print/2507.17634v2 -o /tmp/wsm.tgz; mkdir /tmp/wsm_e; tar xzf /tmp/wsm.tgz -C /tmp/wsm_e
       uv run --with pymupdf python extract_figs.py /tmp/wsm_e/figs   -> inputs/figs.json"""
import pymupdf, sys, json, re
D = sys.argv[1]

def fit(pairs):
    (a1, v1), (a2, v2) = pairs[0], pairs[-1]
    k = (v2 - v1) / (a2 - a1)
    res = max(abs(v1 + k * (a - a1) - v) for a, v in pairs)
    return (lambda a: v1 + k * (a - a1)), res

def num(s):
    s = s.replace('−', '-')
    return float(s) if re.fullmatch(r'-?\d+(\.\d+)?', s) else None

def extract(fn, legend, snap=None):
    p = pymupdf.open(D + '/' + fn)[0]
    words = [(w[0], w[1], w[2], w[3], w[4]) for w in p.get_text('words')]
    dr = p.get_drawings()
    frames, grid = [], []
    for x in dr:
        if x['type'] == 's' and len(x['items']) == 1 and x['items'][0][0] == 'l':
            a, b = x['items'][0][1], x['items'][0][2]
            c = x.get('color') or (0, 0, 0)
            (frames if max(c) < 0.05 else grid).append((a.x, a.y, b.x, b.y))
    # panels: bounding boxes of black frame lines (4 per panel)
    xs = sorted(set(round(min(f[0], f[2]), 1) for f in frames if abs(f[0] - f[2]) < .1))
    ys = sorted(set(round(min(f[1], f[3]), 1) for f in frames if abs(f[1] - f[3]) < .1))
    panels = []
    for f in frames:
        if abs(f[1] - f[3]) < .1: continue  # vertical lines only
    # build panels from horizontal frame lines pairs
    hs = [f for f in frames if abs(f[1] - f[3]) < .1]
    for f in hs:
        x0, x1 = min(f[0], f[2]), max(f[0], f[2])
        same = sorted(set(round(g[1], 1) for g in hs if abs(min(g[0], g[2]) - x0) < .5 and abs(max(g[0], g[2]) - x1) < .5))
        for i in range(0, len(same) - 1, 2):
            r = (x0, same[i], x1, same[i + 1])
            if r not in panels: panels.append(r)
    out = []
    for (x0, y0, x1, y1) in sorted(panels, key=lambda r: (round(r[1]), r[0])):
        vg = sorted(set(round(g[0], 2) for g in grid if abs(g[0] - g[2]) < .1 and x0 - .5 <= g[0] <= x1 + .5 and y0 - .5 <= min(g[1], g[3]) and max(g[1], g[3]) <= y1 + .5))
        hg = sorted(set(round(g[1], 2) for g in grid if abs(g[1] - g[3]) < .1 and y0 - .5 <= g[1] <= y1 + .5 and x0 - .5 <= min(g[0], g[2]) and max(g[0], g[2]) <= x1 + .5))
        xp, yp = [], []
        for gx in vg:  # tick label centred under the gridline, anywhere below the panel
            c = [(abs((w[0] + w[2]) / 2 - gx), num(w[4])) for w in words if w[1] > y1 - 2 and num(w[4]) is not None and abs((w[0] + w[2]) / 2 - gx) < 4]
            if c: xp.append((gx, min(c)[1]))
        inside = lambda w: any(r[0] < (w[0] + w[2]) / 2 < r[2] and r[1] < (w[1] + w[3]) / 2 < r[3] for r in panels)
        def ylab(lx):
            r = []
            for gy in hg:
                c = [(abs((w[1] + w[3]) / 2 - gy), num(w[4])) for w in words if w[2] <= lx + 2 and w[0] > lx - 80 and not inside(w) and num(w[4]) is not None and abs((w[1] + w[3]) / 2 - gy) < 4]
                if c: r.append((gy, min(c)[1]))
            return r
        yp = ylab(x0)
        if len(yp) < 2:  # shared y axis: labels sit beside the leftmost panel of the row
            yp = ylab(min(r[0] for r in panels if abs(r[1] - y0) < 1))
        fx, rx = fit(xp); fy, ry = fit(yp)
        title = ' '.join(w[4] for w in sorted(words, key=lambda w: w[0]) if w[3] <= y0 + 6 and w[1] > y0 - 60 and x0 <= (w[0] + w[2]) / 2 <= x1)
        # legend boxes inside the axes: white-filled patches much smaller than the panel; their swatches are not data
        boxes = [x['rect'] for x in dr if x.get('fill') and min(x['fill']) > 0.99 and x0 - 1 <= x['rect'].x0 and x['rect'].x1 <= x1 + 1 and y0 - 1 <= x['rect'].y0 and x['rect'].y1 <= y1 + 1 and x['rect'].width < 0.8 * (x1 - x0)]
        series = {}
        for x in dr:
            if x['type'] in ('f', 'fs') and len(x['items']) >= 4 and x.get('fill'):
                r = x['rect']
                cx, cy = (r.x0 + r.x1) / 2, (r.y0 + r.y1) / 2
                if not (x0 < cx < x1 and y0 < cy < y1) or r.width > 30: continue
                if any(b.x0 <= cx <= b.x1 and b.y0 <= cy <= b.y1 for b in boxes): continue
                col = '#%02x%02x%02x' % tuple(int(round(c * 255)) for c in x['fill'])
                if col not in legend: continue
                vx, vy = fx(cx), fy(cy)
                if snap:  # data points sit on multiples of `snap`; legend swatches inside the axes do not
                    if abs(vx - snap * round(vx / snap)) > 0.02 * snap: continue
                    vx = snap * round(vx / snap)
                series.setdefault(legend[col], []).append([round(vx, 3), round(vy, 3)])
        for k in series: series[k].sort()
        out.append({'title': title, 'x_ticks': xp, 'y_ticks': yp, 'calib_residual': [round(rx, 5), round(ry, 5)], 'series': series})
    return out

FIG = {
 'fig3_main': ('main.pdf', 25, {'#808080': 'WSM (before merge)', '#ff0000': 'WSD', '#94c4df': 'WSM (Merge 8)', '#60a7d2': 'WSM (Merge 12)', '#3787c0': 'WSM (Merge 16)', '#1764ab': 'WSM (Merge 20)'}),
 'fig4_window': ('window.pdf', 25, {'#94c4df': 'Mean, Merge 2', '#6aaed6': 'Mean, Merge 8', '#4a98c9': 'Mean, Merge 12', '#2e7ebc': 'Mean, Merge 16', '#1764ab': 'Mean, Merge 20',
    '#fc8a6a': '1-sqrt, Merge 4', '#f85d42': '1-sqrt, Merge 8', '#e32f27': '1-sqrt, Merge 12', '#bc141a': '1-sqrt, Merge 16',
    '#b5b5b5': 'EMA, Merge 4', '#8d8d8d': 'EMA, Merge 8', '#686868': 'EMA, Merge 12', '#404040': 'EMA, Merge 16'}),
 'fig5a_constant': ('constant.pdf', None, {'#808080': 'constant', '#d62728': 'Decay', '#1f77b4': 'Merge'}),
 'fig5b_decay_merge': ('decay_merge.pdf', None, {'#808080': 'constant', '#d62728': 'Decay', '#1f77b4': 'Decay-then-Merge'}),
 'fig5c_merge_decay': ('merge_decay.pdf', None, {'#ff0000': 'Decay', '#4a7ebb': 'Merge-then-Decay'}),
}
if __name__ == '__main__':
    import collections
    res = {}
    for k, (fn, snap, leg) in FIG.items():
        res[k] = {'file': 'figs/' + fn, 'panels': extract(fn, leg, snap)}
    # Figure 10: its tick labels are rounded to integers (two ticks print as "92"), too coarse to calibrate on, so only the
    # printed per-dataset labels "+x pts (+y%)" are transcribed, in panel order with the dataset name that follows each.
    t = pymupdf.open(D + '/all_datasets_with_absolute_improvement.pdf')[0].get_text()
    lines = [l.strip() for l in t.split('\n') if l.strip()]
    lab = []
    for i, l in enumerate(lines):
        m = re.fullmatch(r'([+-]\d+\.\d) pts \((-?[+-]\d+\.\d)%\)', l)
        if m: lab.append({'pts': float(m.group(1)), 'pct': float(m.group(2).replace('--', '-')), 'dataset': lines[i + 1]})
    res['fig10_labels'] = {'file': 'figs/all_datasets_with_absolute_improvement.pdf', 'note': 'printed labels: best WSM merged point against best WSD point per dataset', 'labels': lab}
    print('fig10 labels', len(lab))
    json.dump(res, open('inputs/figs.json', 'w'), indent=1)
    for k, v in res.items():
        for pn in v.get('panels', []):
            print(k, pn['title'], pn['calib_residual'], {s: len(a) for s, a in pn['series'].items()})
