"""Decode the Encoder-Decoder Gemma paper's figures (vector SVGs in its arXiv HTML, 2504.06225v1) into numbers.

Each figure is a matplotlib SVG whose glyphs carry their characters (data-text), so tick labels read exactly,
and every marker, line and bar is a path with exact coordinates. Values come from a linear fit of the
gridline positions to their tick labels (gridlines are the #b0b0b0 two-point paths), so they are exact up to
the SVG's coordinate precision. This is transcription of vector geometry, not reading a raster by eye.

  d=<dir>; for f in ptscore_vs_step pt_score_vs_flops it_score_vs_flops superglue_score_vs_flops latency \
     ul2prefix_delta_pt ul2prefix_delta_it ul2prefix_delta_superglue corr_pt_vs_sft corr_pt_vs_sg; do \
     curl -sL https://arxiv.org/html/2504.06225v1/$f.svg -o $d/$f.svg; done
  python3 decode_figs.py $d       (writes inputs/figs.json)
"""
import json, os, re, sys
import svgparse

NUM = re.compile(r'^[−-]?\d+(\.\d+)?$')
COLORS = {'#1f77b4': 'blue', '#ff7f0e': 'orange', '#2ca02c': 'green', '#d62728': 'red', '#17becf': 'cyan', '#bcbd22': 'olive'}


def num(t): return float(t.replace('−', '-'))


def calib(words, paths):
    """Linear maps pixel->value for x and y, from gridlines matched to their numeric tick labels."""
    grid = [p['pts'] for p in paths if p['stroke'] == '#b0b0b0' and len(p['pts']) == 2]
    vx = sorted({round(a[0], 4) for a, b in grid if abs(a[0] - b[0]) < 1e-6})
    hy = sorted({round(a[1], 4) for a, b in grid if abs(a[1] - b[1]) < 1e-6})
    nw = [w for w in words if not w['rot'] and NUM.match(w['t'])]
    xs, ys = [], []
    for x in vx:  # label centred under the gridline
        c = min(nw, key=lambda w: abs(w['x'] + len(w['t']) * w['s'] * 0.27 - x) + (0 if w['y'] > 240 else 1e3))
        xs.append((x, num(c['t'])))
    for y in hy:  # label left of the gridline, baseline about a third of the font size below it
        c = min(nw, key=lambda w: abs(w['y'] - w['s'] * 0.33 - y) + (0 if w['x'] < 50 else 1e3))
        ys.append((y, num(c['t'])))
    def fit(pairs):
        n = len(pairs); mx = sum(p for p, _ in pairs) / n; my = sum(v for _, v in pairs) / n
        a = sum((p - mx) * (v - my) for p, v in pairs) / sum((p - mx) ** 2 for p, _ in pairs)
        res = max(abs(my + a * (p - mx) - v) for p, v in pairs)
        return (lambda p: my + a * (p - mx)), res
    fx, rx = fit(xs) if len(xs) > 1 else (None, None)
    fy, ry = fit(ys)
    return fx, fy, {'x_ticks': [v for _, v in xs], 'y_ticks': [v for _, v in ys], 'x_resid': rx, 'y_resid': ry}


def markers(paths):
    """Filled scatter markers (circles and stars, 8 or more points), with their bbox centre and colour.
    The legend's own markers sit inside the legend box and are dropped by the caller."""
    out = []
    for p in paths:
        if p['fill'] in COLORS and len(p['pts']) >= 8:
            xs = [q[0] for q in p['pts']]; ys = [q[1] for q in p['pts']]
            star = len(p['pts']) == 10  # a regular star: its centre is the mean of its ten vertices, not its bbox middle
            cx = sum(xs) / 10 if star else (min(xs) + max(xs)) / 2
            cy = sum(ys) / 10 if star else (min(ys) + max(ys)) / 2
            out.append({'c': COLORS[p['fill']], 'x': cx, 'y': cy, 'shape': 'star' if star else 'circle'})
    return out


def legend_box(paths):
    for p in paths:
        if p['stroke'] == '#cccccc':
            xs = [q[0] for q in p['pts']]; ys = [q[1] for q in p['pts']]
            return min(xs), min(ys), max(xs), max(ys)
    return None


def inside(m, box): return box and box[0] <= m['x'] <= box[2] and box[1] <= m['y'] <= box[3]


def main(d):
    out = {'source': 'https://arxiv.org/html/2504.06225v1 (figure SVGs), decoded by decode_figs.py'}
    for f in ['pt_score_vs_flops', 'it_score_vs_flops', 'superglue_score_vs_flops', 'latency', 'corr_pt_vs_sft', 'corr_pt_vs_sg']:
        H, g, p = svgparse.parse(os.path.join(d, f + '.svg'))
        w = svgparse.words(g)
        fx, fy, info = calib(w, p)
        box = legend_box(p)
        pts = [{'c': m['c'], 'shape': m['shape'], 'x': round(fx(m['x']), 4), 'y': round(fy(m['y']), 4)} for m in markers(p) if not inside(m, box)]
        labels = [x['t'] for x in w if x['s'] < 11 and not NUM.match(x['t'])]
        out[f] = {'calib': info, 'points': pts, 'labels': labels,
                  'legend': [x['t'] for x in w if x['s'] > 11 and x['s'] < 13]}
        if f == 'latency':  # attach the on-plot model labels to the nearest marker
            lab = [x for x in w if x['s'] < 11]
            for q, m in zip(pts, [m for m in markers(p) if not inside(m, box)]):
                near = min(lab, key=lambda x: (x['x'] + len(x['t']) * 3 - m['x']) ** 2 + (x['y'] - 4 - m['y']) ** 2)
                q['label'] = near['t']
    # Figure 2: PT score against adaptation tokens, one polyline per model
    H, g, p = svgparse.parse(os.path.join(d, 'ptscore_vs_step.svg'))
    w = svgparse.words(g)
    fx, fy, info = calib(w, p)
    lines = {}
    for q in p:
        if q['stroke'] in COLORS and len(q['pts']) > 3 and q['fill'] in (None, 'none'):
            lines[COLORS[q['stroke']]] = [[round(fx(a) * 1e12 / 1e9, 2), round(fy(b), 3)] for a, b in q['pts']]
        elif q['stroke'] in COLORS and len(q['pts']) == 2 and q['fill'] in (None, 'none') and abs(q['pts'][0][1] - q['pts'][1][1]) < 1e-6 and q['pts'][1][0] - q['pts'][0][0] > 100:
            lines[COLORS[q['stroke']] + '_hline'] = round(fy(q['pts'][0][1]), 3)
    # legend: its short coloured lines and its labels, both sorted top to bottom, give colour -> model
    leg = sorted((q['pts'][0][1], COLORS[q['stroke']]) for q in p if q['stroke'] in COLORS and len(q['pts']) == 3)
    names = [x['t'] for x in sorted(w, key=lambda x: x['y']) if x['t'].startswith(('2B', '9B', 'Gemma'))]
    cmap = {c: n.replace('Gemma2', 'Gemma 2 ') for (_, c), n in zip(leg, names)}
    lines = {(cmap[k] if k in cmap else cmap[k.replace('_hline', '')] + ' (horizontal line)'): v for k, v in lines.items()}
    out['ptscore_vs_step'] = {'calib': info, 'x_unit': 'billion tokens (axis is x 1e12)', 'lines': lines,
                              'legend': [x['t'] for x in w if x['t'].startswith(('2B', '9B', 'Gemma'))]}
    # Figure 5: bars, delta from the single-objective model
    for f in ['ul2prefix_delta_pt', 'ul2prefix_delta_it', 'ul2prefix_delta_superglue']:
        H, g, p = svgparse.parse(os.path.join(d, f + '.svg'))
        w = svgparse.words(g)
        _, fy, info = calib(w, p)
        bars = []
        for q in p:
            if q['fill'] in COLORS and len(q['pts']) == 4:
                xs = [a for a, _ in q['pts']]; ys = [b for _, b in q['pts']]
                v0, v1 = fy(max(ys)), fy(min(ys))
                val = v1 if abs(v0) < abs(v1) else v0
                bars.append({'c': COLORS[q['fill']], 'xc': (min(xs) + max(xs)) / 2, 'yc': (min(ys) + max(ys)) / 2, 'v': round(val, 3)})
        box = legend_box(p)
        bars = [b for b in bars if not (box and box[0] <= b['xc'] <= box[2] and box[1] <= b['yc'] <= box[3])]  # drop the legend's colour patches
        names = ['S-S', 'B-B', 'L-L', 'XL-XL', '2B-2B', '9B-2B', '9B-9B']
        dash = sorted(x['x'] for x in w if x['rot'] and x['t'] == '-')  # the hyphen of each rotated group label
        grp = {n: {} for n in names}
        for b in bars:
            k = min(range(len(dash)), key=lambda i: abs(dash[i] - b['xc']))
            grp[names[k]]['PrefixLM-then-UL2' if b['c'] == 'blue' else 'UL2-then-PrefixLM'] = b['v']
        out[f] = {'calib': info, 'groups': grp, 'note': 'a missing entry is a bar of zero height',
                  'legend': 'blue = PrefixLM-then-UL2, orange = UL2-then-PrefixLM (order of the legend entries)'}
    json.dump(out, open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'inputs', 'figs.json'), 'w'), indent=1)
    print(json.dumps({k: (v.get('points') or v.get('bars') or list(v.get('lines', {}).keys())) for k, v in out.items() if isinstance(v, dict)}, indent=0)[:4000])


if __name__ == '__main__':
    main(sys.argv[1])
