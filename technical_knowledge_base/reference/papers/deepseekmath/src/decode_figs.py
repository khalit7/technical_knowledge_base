"""Decode Figures 5, 6 and 7 of DeepSeekMath from the vector SVGs in its arXiv HTML into numbers (inputs/figs.json).

Each SVG is matplotlib output whose glyphs carry their characters (data-text), so tick labels are read exactly
and every curve is a polyline with exact coordinates. Each panel is calibrated by a straight-line fit of its tick
marks to their printed labels (the maximum residual is recorded); the x axis of Figure 7 is categorical
(K = 1, 4, 8, 16, 32, 64 equally spaced), so points are snapped to the tick they sit on. This is transcription
of vector geometry, not reading curves off a raster image.

  for f in combined_figure_rl iter_rl combined_MAJ_PASS GRPO; do curl -sL https://arxiv.org/html/2402.03300v3/$f.svg -o inputs/figs/$f.svg; done
  python3 decode_figs.py
"""
import json, re
import svgparse

NUM = re.compile(r'^-?\d+(\.\d+)?$')
FIGS = {'combined_figure_rl': 'Figure 5', 'iter_rl': 'Figure 6', 'combined_MAJ_PASS': 'Figure 7'}


def fit(pairs):
    n = len(pairs); mx = sum(p for p, _ in pairs) / n; my = sum(v for _, v in pairs) / n
    b = sum((p - mx) * (v - my) for p, v in pairs) / sum((p - mx) ** 2 for p, _ in pairs)
    a = my - b * mx
    return (lambda p: a + b * p), max(abs(a + b * p - v) for p, v in pairs)


def decode(name):
    H, glyphs, paths = svgparse.parse('inputs/figs/%s.svg' % name)
    words = svgparse.words(glyphs)
    black = [q for q in paths if q['stroke'] == '#000000' and len(q['pts']) == 2]
    # panel frames: long vertical black lines (left and right spines)
    vert = sorted({round(q['pts'][0][0], 2) for q in black if abs(q['pts'][0][0] - q['pts'][1][0]) < 1e-6 and abs(q['pts'][0][1] - q['pts'][1][1]) > 100})
    frames = [(vert[0], vert[1]), (vert[2], vert[3])]
    top = min(min(q['pts'][0][1], q['pts'][1][1]) for q in black); bot = max(max(q['pts'][0][1], q['pts'][1][1]) for q in black if abs(q['pts'][0][1] - q['pts'][1][1]) > 100)
    titles = sorted([w for w in words if w['s'] == 16.0 and w['t'] in ('GSM8K', 'MATH')], key=lambda w: w['x'])
    # legend: three-point horizontal lines outside any clip, matched to the nearest label to their right
    leg = {}
    labels = [w for w in words if w['y'] < 30 and w['s'] < 14]
    # merge "Maj@" + "K-Instruct" style splits
    labels.sort(key=lambda w: w['x']); merged = []
    for w in labels:
        if merged and merged[-1]['t'].endswith('@') and w['x'] - merged[-1]['x'] < 45:
            merged[-1]['t'] += w['t']
        else: merged.append(dict(w))
    for q in paths:
        if q['clip'] is None and q['stroke'] and q['stroke'].startswith('#') and q['stroke'] not in ('#000000', '#cccccc', '#b0b0b0') and len(q['pts']) == 3:
            xr = q['pts'][-1][0]
            cand = [w for w in merged if w['x'] > xr]
            leg[q['stroke']] = min(cand, key=lambda w: w['x'] - xr)['t']
    out = {'figure': FIGS[name], 'source': 'https://arxiv.org/html/2402.03300v3/%s.svg' % name, 'panels': {}}
    for k, (x0, x1) in enumerate(frames):
        xt = sorted(q['pts'][0][0] for q in black if abs(q['pts'][0][0] - q['pts'][1][0]) < 1e-6 and abs(abs(q['pts'][0][1] - q['pts'][1][1]) - 3.5) < 0.01 and x0 - 0.5 <= q['pts'][0][0] <= x1 + 0.5)
        yt = sorted(q['pts'][0][1] for q in black if abs(q['pts'][0][1] - q['pts'][1][1]) < 1e-6 and abs(abs(q['pts'][0][0] - q['pts'][1][0]) - 3.5) < 0.01 and abs(max(q['pts'][0][0], q['pts'][1][0]) - x0) < 0.5)
        xl = sorted([w for w in words if NUM.match(w['t']) and w['y'] > bot and x0 - 15 <= w['x'] <= x1], key=lambda w: w['x'])
        yl = sorted([w for w in words if NUM.match(w['t']) and x0 - 30 <= w['x'] < x0], key=lambda w: w['y'])
        assert len(xl) == len(xt) and len(yl) == len(yt), (name, k, len(xl), len(xt), len(yl), len(yt))
        xv = [float(w['t']) for w in xl]; yv = [float(w['t']) for w in yl]
        categorical = name == 'combined_MAJ_PASS'
        fx, rx = fit(list(zip(xt, range(len(xt)) if categorical else xv)))
        fy, ry = fit(list(zip(yt, yv)))
        title = titles[k]['t']
        P = {'x_ticks': xv, 'calibration': {'x_residual': rx, 'y_residual': ry, 'y_units_per_pt': abs(fy(0) - fy(1))}, 'series': {}}
        for q in paths:
            if q['clip'] and q['stroke'] in leg and len(q['pts']) > 3 and x0 <= q['pts'][0][0] <= x1:
                pts = []
                for x, y in q['pts']:
                    xx = fx(x)
                    if categorical:
                        i = round(xx); assert abs(xx - i) < 1e-3; xx = xv[i]
                    else: xx = round(xx, 1)
                    pts.append([xx, round(fy(y), 3)])
                P['series'][leg[q['stroke']]] = pts
        out['panels'][title] = P
    return out


if __name__ == '__main__':
    res = {n: decode(n) for n in FIGS}
    json.dump(res, open('inputs/figs.json', 'w'), indent=1)
    for n, o in res.items():
        print(o['figure'])
        for t, P in o['panels'].items():
            print(' ', t, {k: round(v, 6) for k, v in P['calibration'].items()})
            for s, pts in P['series'].items():
                print('    %-14s n=%d first %s last %s max %s' % (s, len(pts), pts[0], pts[-1], max(pts, key=lambda p: p[1])))
