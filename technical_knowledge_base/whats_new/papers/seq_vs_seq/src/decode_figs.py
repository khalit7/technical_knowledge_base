"""Decode the paper's three figures from the vector SVGs of its arXiv HTML (inputs/figs/*.svg) into numbers
(inputs/figs.json). Glyphs carry their characters, so tick labels are read exactly; every marker and bar is
a path with exact coordinates; values come from a linear fit of tick positions to tick labels (log for the
x axis of Figure 1). This is transcription of vector geometry, not reading a raster image.

  curl -sL https://arxiv.org/html/2507.11412v2/model_comparison_enc_vs_dec.svg -o inputs/figs/model_comparison_enc_vs_dec.svg
  (and model_prediction_distribution_two.svg, model_prediction_distribution.svg)
  python3 decode_figs.py
"""
import json, math, os
import svgparse

HERE = os.path.dirname(os.path.abspath(__file__))
F = lambda n: os.path.join(HERE, 'inputs', 'figs', n + '.svg')


def linfit(pairs):
    xs = [a for a, _ in pairs]; ys = [b for _, b in pairs]; n = len(xs); mx = sum(xs) / n; my = sum(ys) / n
    b = sum((x - mx) * (y - my) for x, y in zip(xs, ys)) / sum((x - mx) ** 2 for x in xs); a = my - b * mx
    return (lambda p: a + b * p), max(abs(a + b * x - y) for x, y in zip(xs, ys))


def fig1():
    """Figure 1: three panels (MNLI accuracy, MS MARCO nDCG@10, generative average) against model size.
    Series by marker: blue filled circle (9-point path) = Encoders, orange square (4) = Decoders, orange
    triangle (3) = Enc-from-Dec, blue triangle (3) = Dec-from-Enc, as the legend at the top draws them."""
    H, g, p = svgparse.parse(F('model_comparison_enc_vs_dec'))
    w = svgparse.words(g)
    panels = [('mnli', 63.56, 210.46), ('msmarco', 247.16, 394.06), ('gen', 430.76, 577.66)]
    yt = [x for x in p if x['stroke'] == '#000000' and len(x['pts']) == 2 and abs(x['pts'][0][1] - x['pts'][1][1]) < 1e-6 and abs(x['pts'][0][0] - 51.03) < .1 and abs(x['pts'][1][0] - 47.53) < .1]
    xt = [x for x in p if x['stroke'] == '#000000' and len(x['pts']) == 2 and abs(x['pts'][0][0] - x['pts'][1][0]) < 1e-6 and abs(x['pts'][1][1] - x['pts'][0][1] - 3.5) < .01 and 205 < x['pts'][0][1] < 215]
    lab = lambda y0, y1, xmax: [(t['y'], float(t['t'])) for t in w if not t['rot'] and t['x'] < xmax and y0 - 5 < t['y'] < y1 + 10 and t['t'].replace('.', '').isdigit()]
    # x axis: tick marks and their size labels (15M ... 770M) on the first panel
    xl = sorted((t['x'], t['t']) for t in w if t['t'].endswith('M') and abs(t['y'] - 593.8) < 1)
    xticks = sorted(x['pts'][0][0] for x in xt)
    xpairs = [(px, math.log10(float(l[:-1]) * 1e6)) for px, (_, l) in zip(xticks, xl)]
    fx, xres = linfit(xpairs)
    out = {'x_tick_labels': [l for _, l in xl], 'x_fit_max_residual_log10': round(xres, 6), 'panels': {}}
    for name, y0, y1 in panels:
        marks = sorted(x['pts'][0][1] for x in yt if y0 <= x['pts'][0][1] <= y1)
        labs = sorted(lab(y0, y1, 40))
        pairs = [(m, v) for m, (ly, v) in zip(marks, labs)]
        fy, res = linfit(pairs)
        ser = {'Encoders': [], 'Decoders': [], 'Enc-from-Dec': [], 'Dec-from-Enc': []}
        for x in p:
            if x['fill'] not in ('#1f77b4', '#ff7f0e') or x['stroke'] is not None: continue
            xs = [q[0] for q in x['pts']]; ys = [q[1] for q in x['pts']]
            cx = (min(xs) + max(xs)) / 2; cy = (min(ys) + max(ys)) / 2
            if not (y0 < cy < y1) or cx < 60: continue
            n = len(x['pts'])
            if n == 3: cy = ys[0] if x['fill'] == '#ff7f0e' else ys[0]  # triangle: use the centroid instead
            if n == 3: cy = sum(ys) / 3; cx = sum(xs) / 3
            k = {('#1f77b4', 9): 'Encoders', ('#ff7f0e', 4): 'Decoders', ('#ff7f0e', 3): 'Enc-from-Dec', ('#1f77b4', 3): 'Dec-from-Enc'}.get((x['fill'], n))
            if k: ser[k].append((cx, cy))
        # the lines through the markers give the exact data points (marker centroids of triangles are offset)
        lines = [x for x in p if x['fill'] == 'none' and x['stroke'] in ('#1f77b4', '#ff7f0e') and len(x['pts']) == 6 and y0 < x['pts'][0][1] < y1]
        res_lines = {}
        for L in lines:
            # match the line to the series whose markers lie closest to it
            best = None
            for k, pts in ser.items():
                if not pts: continue
                d = sum(min(abs(px - lx) + abs(py - ly) for lx, ly in L['pts']) for px, py in pts)
                if best is None or d < best[0]: best = (d, k)
            res_lines[best[1]] = [{'size_M': round(10 ** fx(lx) / 1e6, 2), 'value': round(fy(ly), 3)} for lx, ly in L['pts']]
        out['panels'][name] = {'y_fit_max_residual': round(res, 6), 'series': res_lines}
    return out


def fig2(name, panels):
    """Figures 2 and 3: stacked bars of predicted pronoun shares (Male blue, Female purple, Neutral orange),
    one bar per size per panel. Share = segment height / bar height (each bar spans 0 to 100%)."""
    H, g, p = svgparse.parse(F(name))
    col = {'#2e86ab': 'male', '#a23b72': 'female', '#f18f01': 'neutral'}
    bars = [x for x in p if x['fill'] in col and len(x['pts']) == 4]
    sizes = ['17M', '32M', '66M', '150M', '400M', '1B']
    out = {}
    segs = []
    for b in bars:
        xs = [q[0] for q in b['pts']]; ys = [q[1] for q in b['pts']]
        if max(ys) - min(ys) > 30 and min(xs) < 120 and False: pass
        segs.append((min(xs), min(ys), max(ys), col[b['fill']]))
    segs = [s for s in segs if s[0] > 100]  # drop legend swatches (x < 100 never holds for bars; legend sits at y < 25)
    segs = [s for s in segs if s[1] > 30]
    xs = sorted(set(round(s[0], 1) for s in segs))
    tops = sorted(set(round(s[1], 1) for s in segs if s[3] == 'neutral'))
    for pi, pname in enumerate(panels):
        top = tops[pi]
        rows = {}
        for xi, x in enumerate(xs):
            mine = [s for s in segs if round(s[0], 1) == x and any(abs(s[1] - t) < .2 or True for t in [top])]
            mine = [s for s in mine if (s[3] == 'neutral' and abs(s[1] - top) < .2) or s[3] != 'neutral']
            # the bar of this panel: segments between this panel's top and the next panel's top
            lo = tops[pi + 1] if pi + 1 < len(tops) else 1e9
            mine = [s for s in mine if top - .2 <= s[1] < lo - .2]
            base = max(s[2] for s in mine); h = base - top
            rows[sizes[xi]] = {s[3]: round(100 * (s[2] - s[1]) / h, 2) for s in mine}
        out[pname] = rows
    return out


if __name__ == '__main__':
    R = {'_doc': 'Decoded by decode_figs.py from the arXiv HTML v2 figure SVGs; values in the figures\' own units.',
         'fig1': fig1(),
         'fig2': fig2('model_prediction_distribution_two', ['Ettin-Encoder', 'Ettin-Decoder']),
         'fig3': fig2('model_prediction_distribution', ['Ettin-Encoder', 'Ettin-Decoder', 'Encoder-from-Decoder', 'Decoder-from-Encoder'])}
    json.dump(R, open(os.path.join(HERE, 'inputs', 'figs.json'), 'w'), indent=1)
    print(json.dumps(R['fig1']['panels']['mnli']['series'], indent=0)[:800])
    print(R['fig1']['x_tick_labels'], R['fig1']['x_fit_max_residual_log10'])
    print(json.dumps(R['fig2']))
