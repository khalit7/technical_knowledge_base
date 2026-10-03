"""Decode the data in DPO's figures from the arXiv HTML's vector SVGs (matplotlib output).
Axis calibration: every tick mark's position is matched to its printed label and a straight line is
fitted (residual printed). Data: scatter markers (Figure 2 left), polylines and error-bar segments
(the win-rate figures). Legend colours are matched to the legend text on the same row.
usage: python3 decode_figs.py   (reads inputs/figs/*.svg, writes inputs/figs.json)
Sources: https://arxiv.org/html/2305.18290v3/<name>.svg"""
import re, json

RINGS = {}
H = 345.6  # every path uses transform matrix(1,0,0,-1,0,345.6): screen y = H - y

def nums(s):
    return [float(v) for v in re.findall(r'-?\d*\.?\d+(?:e-?\d+)?', s)]

def parse_path(d):
    """M/L/H/V/C path to a list of subpaths of (x, y) points (C: end point only)."""
    toks = re.findall(r'[MLHVCZ]|-?\d*\.?\d+(?:e-?\d+)?', d)
    subs, cur, cmd, i, x, y = [], [], None, 0, 0.0, 0.0
    while i < len(toks):
        t = toks[i]
        if t in 'MLHVCZ':
            cmd = t; i += 1
            if t == 'M' and cur: subs.append(cur); cur = []
            if t == 'Z': continue
            continue
        if cmd in ('M', 'L'):
            x, y = float(toks[i]), float(toks[i + 1]); i += 2; cur.append((x, y))
            if cmd == 'M': cmd = 'L'
        elif cmd == 'H':
            x = float(toks[i]); i += 1; cur.append((x, y))
        elif cmd == 'V':
            y = float(toks[i]); i += 1; cur.append((x, y))
        elif cmd == 'C':
            x, y = float(toks[i + 4]), float(toks[i + 5]); i += 6; cur.append((x, y))
        else:
            i += 1
    if cur: subs.append(cur)
    return subs

def texts(body):
    """Glyph runs: list of (x_start, y_baseline, string, size)."""
    us = re.findall(r'<use[^>]*data-text="([^"]*)"[^>]*transform="matrix\(([^)]*)\)"', body)
    rows = {}
    for ch, m in us:
        a = [float(v) for v in m.split(',')]
        if a[1] != 0: continue  # rotated axis title
        rows.setdefault((round(a[5], 1), a[0]), []).append((a[4], ch))
    out = []
    for (y, sz), l in rows.items():
        l.sort(); cur = [l[0]]
        for p in l[1:]:
            if p[0] - cur[-1][0] > 1.2 * sz: out.append((cur[0][0], y, ''.join(c for _, c in cur), sz)); cur = [p]
            else: cur.append(p)
        out.append((cur[0][0], y, ''.join(c for _, c in cur), sz))
    return out

def fit(pairs):
    n = len(pairs); mx = sum(p for p, _ in pairs) / n; my = sum(v for _, v in pairs) / n
    sxx = sum((p - mx) ** 2 for p, _ in pairs); sxy = sum((p - mx) * (v - my) for p, v in pairs)
    a = sxy / sxx; b = my - a * mx
    res = max(abs(a * p + b - v) for p, v in pairs)
    return a, b, res

def decode(name, xlabels_fix=None):
    s = open('inputs/figs/%s.svg' % name).read(); body = s[s.index('</defs>'):]
    paths = re.findall(r'<path\b([^>]*)/?>', body)
    xt, yt, series = [], [], {}
    markers = {}
    for a in paths:
        st = re.search(r'stroke="([^"]*)"', a)
        if not st: continue
        col = st.group(1); d = re.search(r' d="([^"]*)"', a).group(1)
        tr = nums(re.search(r'transform="matrix\(([^)]*)\)"', a).group(1))
        if col == '#000000':
            m = re.fullmatch(r'M(-?[\d.]+) (-?[\d.]+)V(-?[\d.]+)', d)
            if m and abs(float(m.group(2)) - float(m.group(3)) - 3.5) < 0.01: xt.append(float(m.group(1)))
            m = re.fullmatch(r'M(-?[\d.]+) (-?[\d.]+)H(-?[\d.]+)', d)
            if m and abs(float(m.group(1)) - float(m.group(3)) - 3.5) < 0.01: yt.append(H - float(m.group(2)))
            continue
        if col == '#cccccc': continue
        if d.startswith('M0-'):  # scatter marker centred at the transform's offset
            markers.setdefault(col, []).append((tr[4], tr[5]))
            continue
        if d.startswith('M3 0H-3'): continue  # error-bar cap
        subs = parse_path(d)
        for sp in subs:
            pts = [(x, H - y) for x, y in sp]
            sd = series.setdefault(col, {'lines': [], 'bars': []})
            if len(pts) == 2 and abs(pts[0][0] - pts[1][0]) < 1e-6: sd['bars'].append((pts[0][0], pts[0][1], pts[1][1]))
            elif len(pts) == 2 and abs(pts[0][1] - pts[1][1]) < 1e-6 and abs(pts[0][0] - pts[1][0]) <= 20.01: sd.setdefault('legend', []).append(pts)
            elif max(p[0] for p in pts) - min(p[0] for p in pts) < 8: RINGS[col] = pts
            else: sd['lines'].append(pts)
    tx = texts(body)
    xs = sorted(xt); ys = sorted(yt, reverse=True)
    ylab = sorted([t for t in tx if t[3] == 10 and t[0] < 45], key=lambda t: -t[1])
    xlab = sorted([t for t in tx if t[3] == 10 and t[1] > 305 and t[0] > 45], key=lambda t: t[0])
    xv = [float(t[2]) for t in xlab] if xlabels_fix is None else xlabels_fix
    yv = [float(t[2]) for t in ylab]
    assert len(xv) == len(xs) and len(yv) == len(ys), (name, len(xv), len(xs), len(yv), len(ys))
    ax, bx, rx = fit(list(zip(xs, xv))); ay, by, ry = fit(list(zip(ys, yv)))
    X = lambda p: ax * p + bx; Y = lambda p: ay * p + by
    # legend: text rows of size 12 (or 10 inside the plot for some figures); colour sample left of the text
    legend = {}
    others = [t for t in tx if t not in ylab and t not in xlab and t[3] in (10, 12)]
    samples = []
    for col, sd in series.items():
        for seg in sd.get('legend', []): samples.append((col, max(seg[0][0], seg[1][0]), seg[0][1]))
    for col, x, y in samples:
        cand = [t for t in others if abs(t[1] - 3.5 - y) < 6 and t[0] > x]
        if cand: legend[col] = min(cand, key=lambda t: t[0] - x)[2]
    out = {'name': name, 'source': 'https://arxiv.org/html/2305.18290v3/%s.svg' % name,
           'calibration': {'x_ticks': len(xs), 'y_ticks': len(ys), 'x_max_residual': rx, 'y_max_residual': ry,
                           'y_units_per_pt': abs(ay)}, 'series': {}}
    for col, pts in markers.items():
        if len(pts) < 3:  # legend markers
            continue
        out['series'][col] = {'points': [[round(X(x), 4), round(Y(y), 4)] for x, y in pts]}
    for col, sd in series.items():
        if not sd['lines'] and not sd['bars']: continue
        e = out['series'].setdefault(col, {})
        if sd['lines']:
            e['line'] = [[round(X(x), 4), round(Y(y), 4)] for x, y in max(sd['lines'], key=len)]
        if sd['bars']:
            # keep only error bars that stand on a plotted vertex (the legend's sample bars do not)
            xs_line = [x for ln in sd['lines'] for x, _ in ln]
            e['bars'] = [[round(X(x), 4), round(Y(lo), 4), round(Y(hi), 4)] for x, lo, hi in sd['bars'] if any(abs(x - x2) < 0.5 for x2 in xs_line)]
    for col in out['series']: out['series'][col]['label'] = legend.get(col)
    return out, markers, others

if __name__ == '__main__':
    res = {}
    o, mk, oth = decode('frontier')
    rings = RINGS
    # frontier legend: the legend markers sit left of the six labels
    lab = [t for t in oth if t[3] == 12]
    # the frontier's legend markers are drawn as absolute circle paths: match each ring's centre to the label on its row
    for col, e in o['series'].items():
        e.pop('line', None)
    for col, ring in rings.items():
        cx = (min(p[0] for p in ring) + max(p[0] for p in ring)) / 2; cy = (min(p[1] for p in ring) + max(p[1] for p in ring)) / 2
        cand = [t for t in oth if t[3] == 12 and abs(t[1] - 3.5 - cy) < 6 and t[0] > cx]
        o['series'][col]['label'] = min(cand, key=lambda t: t[0] - cx)[2]
    res['frontier'] = o
    steps = [0, 300, 600, 900, 1200, 1500, 1800, 2100, 2400, 2700, 3000, 3300]
    for nm in ['tldr_winrate_vs_temp', 'dialogue_winrate_vs_temp', 'dialogue_winrate_vs_steps', 'dialogue_winrate_vs_temp_rerank', 'tldr_rerank_vs_temp']:
        o, mk, oth = decode(nm, steps if nm == 'dialogue_winrate_vs_steps' else None)
        res[nm] = o
    json.dump(res, open('inputs/figs.json', 'w'), indent=1)
    for k, v in res.items():
        print(k, v['calibration'])
        for col, e in v['series'].items():
            print('  ', col, e.get('label'), 'points' if 'points' in e else '', len(e.get('points', e.get('line', []))), e.get('line', e.get('points'))[:6])
