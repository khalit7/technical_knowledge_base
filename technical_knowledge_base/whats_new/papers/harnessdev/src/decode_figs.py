"""Decode Figures 7 and 8 of HarnessDev (arXiv 2609.01437v1) from their vector SVGs into per-version scores.

The arXiv HTML ships both figures as SVG (rq2b_v6_official_shared_legend.svg is Figure 7,
rq2b_v6_swepro_100_vs_heldout630_combined.svg is Figure 8). Every trajectory is a polyline with exact
coordinates; the y axis is calibrated per panel on the figure's own gridlines and printed tick labels
(residual reported), and every star marks the version the creator declared final. This is transcription of
vector geometry, not reading curves off a raster.

  mkdir -p $SCRATCH/hd && for f in rq2b_v6_official_shared_legend rq2b_v6_swepro_100_vs_heldout630_combined; do \
     curl -sL https://arxiv.org/html/2609.01437v1/2609.01437v1/$f.svg -o $SCRATCH/hd/$f.svg; done
  python3 decode_figs.py $SCRATCH/hd        (writes inputs/figs.json; the SVGs are not kept)
"""
import json, os, re, sys
import svgparse

# lineage colours (dark = the main series; light = Figure 8's SWE-100 feedback line)
DARK = {'#0072b2': 'Gemini 3.1 Pro', '#e69f00': 'Opus 4.8', '#009e73': 'Qwen 3.7 Max', '#8e44ad': 'DeepSeek V4 Pro', '#d55e00': 'GPT-5.5'}
LIGHT = {'#4799c8': '#0072b2', '#edba47': '#e69f00', '#47b99a': '#009e73', '#ae78c4': '#8e44ad', '#e18b47': '#d55e00'}
NUM = re.compile(r'^\d+$')


def load(d, f):
    H, G, P = svgparse.parse(os.path.join(d, f + '.svg'))
    return svgparse.words(G), P


def panels(P):
    """Panels as x-ranges with their gridline ys, from the light grey gridlines."""
    g = {}
    for p in P:
        if p['stroke'] == '#d8dde3' and len(p['pts']) == 2 and abs(p['pts'][0][1] - p['pts'][1][1]) < 1e-6:
            (x0, y), (x1, _) = p['pts']
            g.setdefault((round(min(x0, x1), 2), round(max(x0, x1), 2)), []).append(y)
    # split a column of panels into rows by gaps in y
    out = []
    for (x0, x1), ys in g.items():
        ys = sorted(ys)
        rows = [[ys[0]]]
        for y in ys[1:]:
            (rows[-1].append(y) if y - rows[-1][-1] < 30 else rows.append([y]))
        for r in rows: out.append({'x0': x0, 'x1': x1, 'grid': r})
    return sorted(out, key=lambda r: (round(r['grid'][0] / 50), r['x0']))


def calibrate(W, pan, side_words):
    """Fit value = a + b*y from gridlines matched to the nearest numeric tick label at the panel's left edge."""
    pairs = []
    for gy in pan['grid']:
        best = None
        for w in side_words:
            dist = abs(w['y'] - 2.1 - gy)
            if best is None or dist < best[0]: best = (dist, float(w['t']))
        if best and best[0] < 3: pairs.append((gy, best[1]))
    # also the zero baseline: two gridlines give the slope, and the label "0" sits one step below the lowest grid
    n = len(pairs)
    mx = sum(p for p, _ in pairs) / n; my = sum(v for _, v in pairs) / n
    b = sum((p - mx) * (v - my) for p, v in pairs) / sum((p - mx) ** 2 for p, _ in pairs)
    a = my - b * mx
    res = max(abs(a + b * p - v) for p, v in pairs)
    return (lambda y: a + b * y), res, pairs


def lines_in(P, pan, top, bottom):
    out = []
    for p in P:
        if p['fill'] not in ('none', None) or not p['stroke'] or p['curve']: continue
        c = p['stroke']
        if c not in DARK and c not in LIGHT: continue
        pts = p['pts']
        if len(pts) < 2: continue
        xs = [q[0] for q in pts]
        if any(xs[i + 1] - xs[i] < 1.0 for i in range(len(xs) - 1)): continue  # markers (closed shapes)
        if not all(pan['x0'] - 1 <= x <= pan['x1'] + 1 and top - 2 <= y <= bottom + 2 for x, y in pts): continue
        out.append((c, pts))
    return out


def stars_in(P, pan, top, bottom):
    out = []
    for p in P:
        if p['stroke'] is None and p['fill'] in DARK and len(p['pts']) == 10:
            cx = sum(q[0] for q in p['pts']) / 10; cy = sum(q[1] for q in p['pts']) / 10
            if pan['x0'] - 1 <= cx <= pan['x1'] + 1 and top - 6 <= cy <= bottom + 6: out.append((p['fill'], cx, cy))
    return out


def decode(d, f, side_left):
    W, P = load(d, f)
    nums = [w for w in W if not w['rot'] and NUM.match(w['t'])]
    res = []
    for pan in panels(P):
        top, bottom = min(pan['grid']), max(pan['grid'])
        # the zero baseline sits below the lowest gridline when the lowest grid is not 0: extend bottom by one step
        step = (bottom - top) / max(1, len(pan['grid']) - 1)
        side = [w for w in nums if pan['x0'] - side_left <= w['x'] <= pan['x0'] - 1 and top - 6 <= w['y'] <= bottom + step + 6]
        if not side:  # a right-hand panel whose labels sit just left of it
            side = [w for w in nums if pan['x0'] - 30 <= w['x'] <= pan['x0'] and top - 6 <= w['y'] <= bottom + step + 6]
        fy, r, pairs = calibrate(W, pan, side)
        L = lines_in(P, pan, top - step, bottom + step)
        S = stars_in(P, pan, top - step, bottom + step)
        x0 = min(q[0] for _, pts in L for q in pts)
        dx = min(pts[i + 1][0] - pts[i][0] for _, pts in L for i in range(len(pts) - 1))
        ser = {}
        for c, pts in L:
            key = DARK.get(c) or DARK[LIGHT[c]]
            kind = 'light' if c in LIGHT else 'dark'
            ser.setdefault(key, {})[kind] = [{'v': round(fy(y), 3), 'i': round((x - x0) / dx)} for x, y in pts]
        st = {}
        for c, cx, cy in S:
            st.setdefault(DARK[c], []).append({'i': round((cx - x0) / dx), 'v': round(fy(cy), 3)})
        res.append({'x0': pan['x0'], 'top': top, 'fit_res': round(r, 5), 'ticks': [v for _, v in pairs], 'series': ser, 'stars': st})
    return res


def main(d):
    out = {'note': 'Decoded from the vector SVGs of arXiv 2609.01437v1 by decode_figs.py; values in percent, i = version index (H0 = 0).'}
    f7 = decode(d, 'rq2b_v6_official_shared_legend', 25)
    # Figure 7 panels in reading order: (a) self SWE-100, (b) self Terminal-89, (c) fixed SWE-100, (d) fixed Terminal-89
    names7 = ['self_swe100', 'self_term89', 'fixed_swe100', 'fixed_term89']
    out['fig7'] = {'src': 'S4.F7', 'panels': dict(zip(names7, f7))}
    f8 = decode(d, 'rq2b_v6_swepro_100_vs_heldout630_combined', 16)
    # Figure 8: two rows (self, fixed Gemini) of five creator columns; light line = SWE-100 feedback, dark = held-out-630
    out['fig8'] = {'src': 'S4.F8', 'panels': f8}
    json.dump(out, open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'inputs', 'figs.json'), 'w'), indent=1)
    for k, p in out['fig7']['panels'].items():
        print(k, 'res', p['fit_res'], {s: len(v.get('dark', [])) for s, v in p['series'].items()}, {s: [x['i'] for x in v] for s, v in p['stars'].items()})
    for p in f8:
        print('fig8', p['x0'], round(p['top']), 'res', p['fit_res'], {s: (len(v.get('light', [])), len(v.get('dark', []))) for s, v in p['series'].items()}, {s: [x['i'] for x in v] for s, v in p['stars'].items()})


if __name__ == '__main__':
    main(sys.argv[1])
