"""Decode the paper's result figures from the vector SVGs of its arXiv HTML into numbers (inputs/figs.json).

The arXiv HTML of 2610.17062v1 embeds each figure as an SVG whose glyphs carry their characters
(data-text), so tick labels and legends read exactly, and every marker, error bar and line is a path
with exact coordinates. Values come from a linear fit of tick positions to tick labels. This is
transcription of vector geometry ("read from figure"), not reading curves off an image.

  for f in countdown_figure1 routing_scatter_main proto_respmon6_composite_sidebyside; do
    curl -sL https://arxiv.org/html/2610.17062v1/2610.17062v1/$f.svg -o <dir>/$f.svg; done
  python3 decode_figs.py <dir>
"""
import json, os, re, sys
import svgparse

PCT = re.compile(r'^-?\d+(\.\d+)?%$')


def load(d, f):
    H, g, p = svgparse.parse(os.path.join(d, f + '.svg'))
    return svgparse.words(g), p


def panels(p):
    out = []
    for q in p:
        if q['fill'] == '#ffffff' and len(q['pts']) == 4 and q['stroke'] is None:
            xs = [a for a, b in q['pts']]; ys = [b for a, b in q['pts']]
            r = (min(xs), min(ys), max(xs), max(ys))
            if r[0] > 1 or r[1] > 1: out.append(r)
    return out


def axis(p, words, r, ax):
    """(pixel, value) pairs from the tick marks (bare two-point paths) and the nearest % label."""
    x0, y0, x1, y1 = r; pairs = []
    for q in p:
        if q['fill'] is None and q['stroke'] is None and len(q['pts']) == 2:
            (a, b), (c, d) = q['pts']
            if ax == 'x' and abs(a - c) < 1e-6 and abs(min(b, d) - y1) < 0.6 and x0 - 1 <= a <= x1 + 1: m = a
            elif ax == 'y' and abs(b - d) < 1e-6 and abs(max(a, c) - x0) < 0.6 and y0 - 1 <= b <= y1 + 1: m = b
            else: continue
            best = None
            for w in words:
                if w['rot'] or not PCT.match(w['t']): continue
                if ax == 'x':
                    if not (y1 < w['y'] < y1 + 30): continue
                    dist = abs(w['x'] + len(w['t']) * w['s'] * 0.29 - m)
                else:
                    if not (x0 - 70 < w['x'] < x0): continue
                    dist = abs(w['y'] - w['s'] * 0.36 - m)
                if best is None or dist < best[0]: best = (dist, float(w['t'][:-1]))
            if best and best[0] < 12: pairs.append((m, best[1]))
    pairs = sorted(set(pairs))
    if len(pairs) < 2: return None   # unlabelled shared axis: the caller reuses the previous panel's
    n = len(pairs); mx = sum(a for a, _ in pairs) / n; my = sum(b for _, b in pairs) / n
    k = sum((a - mx) * (b - my) for a, b in pairs) / sum((a - mx) ** 2 for a, _ in pairs)
    res = max(abs(my + k * (a - mx) - b) for a, b in pairs)
    assert res < 0.05, ('tick fit', pairs)
    return lambda v: my + k * (v - mx)


def markers(p, words, rs):
    """Mean markers (about 21 pt; per-seed markers are about 9 pt) and legend markers (a legend label
    starts just right of them). A filled marker is a coloured fill path; a hollow one a coloured stroke."""
    pts, leg = [], []
    for q in p:
        xs = [a for a, b in q['pts']]; ys = [b for a, b in q['pts']]
        if len(xs) < 3: continue
        w, h = max(xs) - min(xs), max(ys) - min(ys)
        if not (14 < max(w, h) < 45): continue
        if q['fill'] not in (None, 'none', '#ffffff') and q['stroke'] is None: col = q['fill']
        elif q['fill'] == 'none' and q['stroke'] not in (None, '#ffffff', '#cccccc', '#000000') and q['sw'] >= 1.9: col = q['stroke']
        else: continue
        cx, cy = (min(xs) + max(xs)) / 2, (min(ys) + max(ys)) / 2
        if any(not wd['rot'] and 0 < wd['x'] - cx < 40 and abs(wd['y'] - cy - 7) < 6 and wd['t'][:1].isalpha() for wd in words):
            leg.append((col, cx, cy, None, max(w, h))); continue
        inside = [i for i, r in enumerate(rs) if r[0] <= cx <= r[2] and r[1] <= cy <= r[3]]
        if inside: pts.append((col, cx, cy, inside[0], max(w, h)))
    return pts, leg


def legend_names(leg, words):
    """The label right of each legend marker: glyph runs on its baseline, joined while the gap stays
    under about two characters (runs split inside words where the font kerns, e.g. 'prom' + 'pt')."""
    out = {}
    for col, cx, cy, _, _ in leg:
        cand = [w for w in words if not w['rot'] and 0 < w['x'] - cx < 40 and abs(w['y'] - cy - 7) < 6]
        if not cand: continue
        w0 = min(cand, key=lambda w: w['x'])
        line = sorted([w for w in words if not w['rot'] and abs(w['y'] - w0['y']) < 0.5 and w['x'] >= w0['x']], key=lambda w: w['x'])
        name, end = '', None
        for w in line:
            if end is not None and w['x'] - end > w['s'] * 1.2: break
            name += w['t'] if end is None or w['x'] - end < w['s'] * 0.45 else ' ' + w['t']
            end = w['x'] + len(w['t']) * w['s'] * 0.55
        out[col] = name.strip()
    return out


def errbars(p, col, cx, cy):
    hx = vy = None
    for q in p:
        if q['stroke'] == col and len(q['pts']) == 2 and abs(q['sw'] - 1.2) < 0.01:
            (a, b), (c, d) = q['pts']
            if abs(b - d) < 1e-6 and abs(b - cy) < 0.5 and min(a, c) - 0.5 <= cx <= max(a, c) + 0.5: hx = (min(a, c), max(a, c))
            if abs(a - c) < 1e-6 and abs(a - cx) < 0.5 and min(b, d) - 0.5 <= cy <= max(b, d) + 0.5: vy = (min(b, d), max(b, d))
    return hx, vy


def scatter(d, f, panel_names):
    words, p = load(d, f)
    rs = panels(p)
    pts, leg = markers(p, words, rs)
    names = legend_names(leg, words)
    out = {}; fy = None
    for i, r in enumerate(rs):
        if i >= len(panel_names): break
        fx, fy = axis(p, words, r, 'x'), axis(p, words, r, 'y') or fy
        rows = {}
        for col, cx, cy, pi, sz in pts:
            if pi != i: continue
            hx, vy = errbars(p, col, cx, cy)
            row = {'x': round(fx(cx), 2), 'y': round(fy(cy), 2)}
            if hx: row['x_lo'], row['x_hi'] = sorted([round(fx(hx[0]), 2), round(fx(hx[1]), 2)])
            if vy: row['y_lo'], row['y_hi'] = sorted([round(fy(vy[0]), 2), round(fy(vy[1]), 2)])
            rows[names.get(col, col)] = row
        out[panel_names[i]] = rows
    return out


def curves(d):
    """Figure 2 right: seed-mean curves of the GRAFT runs (thick lines), legitimate solve and hack rate."""
    words, p = load(d, 'countdown_figure1')
    rs = [r for r in panels(p) if r[0] > 700]
    rs.sort(key=lambda r: r[1])
    col = {'#1f77b4': 'pre-ablation (both adapters)', '#2ca02c': 'deployed (retain only)', '#8b0000': 'forget only', '#595959': 'base model'}
    out = {}
    for name, r in zip(('legit_solve_rate', 'hack_rate'), rs):
        x0, y0, x1, y1 = r
        fy = axis(p, words, r, 'y')
        fx = lambda v: (v - x0) / (x1 - x0) * 200   # x axis: training step 0 to 200 at the panel edges (ticks 0, 50, ..., 200)
        o = {}
        for q in p:
            if q['stroke'] in col and q['sw'] >= 1.8 and (len(q['pts']) >= 5 or q['stroke'] == '#595959' and len(q['pts']) == 2) and all(r[0] - 1 <= a <= r[2] + 1 and r[1] - 1 <= b <= r[3] + 1 for a, b in q['pts']):
                o[col[q['stroke']]] = [[round(fx(a)), round(fy(b), 2)] for a, b in q['pts']]
        out[name] = o
    return out


if __name__ == '__main__':
    d = sys.argv[1]
    res = {'_doc': 'Read from the vector SVG figures of arXiv 2610.17062v1 by decode_figs.py; values in percent, exact up to the SVG coordinate precision.',
           'fig2_left': scatter(d, 'countdown_figure1', ['countdown']),
           'fig2_right': curves(d),
           'fig4': scatter(d, 'routing_scatter_main', ['without_elicitation', 'with_elicitation'])}
    json.dump(res, open('inputs/figs.json', 'w'), indent=1)
    print(json.dumps(res['fig2_left'], indent=0)[:1500]); print(json.dumps(res['fig4'], indent=0))
