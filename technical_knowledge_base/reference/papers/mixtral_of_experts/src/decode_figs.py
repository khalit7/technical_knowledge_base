"""Decode the paper's three vector figures from the arXiv HTML into numbers (inputs/figs.json).

The arXiv HTML of 2401.04088v1 embeds Figures 7, 9 and 10 as SVG: every bar and line point is a path with exact
coordinates and every tick label is a glyph carrying its character (data-text). Values come from a linear fit of
each panel's gridline positions to its tick labels, so they are exact to the SVG's coordinate precision. This is
transcription of vector geometry, not reading a raster image. Figure 10 at layers 0, 15 and 31 is checked against
Table 5's printed values.

  mkdir -p /tmp/mxsvg && for f in routing-assignments-short routing-assignments-long repetitions; do \
     curl -sL https://arxiv.org/html/2401.04088v1/$f.svg -o /tmp/mxsvg/$f.svg; done
  python3 decode_figs.py /tmp/mxsvg
"""
import json, os, re, sys

D = sys.argv[1] if len(sys.argv) > 1 else '/tmp/mxsvg'
HERE = os.path.dirname(os.path.abspath(__file__))
TOK = re.compile(r'[MLHVCZmlhvcz]|-?\d*\.?\d+(?:e-?\d+)?')


def parse(fn):
    s = open(os.path.join(D, fn)).read()
    H = float(re.search(r'viewBox="0 0 [\d.]+ ([\d.]+)"', s).group(1))
    words, cur = [], None
    U = [(m.group(1), float(m.group(2)), float(m.group(3)), float(m.group(4))) for m in
         re.finditer(r'<use data-text="([^"]*)"[^>]*transform="matrix\(([-\d.]+),0,0,-?[\d.]+,([-\d.]+),([-\d.]+)\)"', s)]
    U.sort(key=lambda u: (round(u[3], 1), u[2]))
    for ch, sz, x, y in U:
        if cur and abs(cur['y'] - y) < .5 and x - cur['x1'] < sz * .9: cur['t'] += ch; cur['x1'] = x + sz * .6
        else: cur = {'t': ch, 'x': x, 'y': y, 'x1': x + sz * .6}; words.append(cur)
    paths = []
    for m in re.finditer(r'<path\b([^>]*)>', s):
        a = m.group(1)
        tr = re.search(r'transform="matrix\(1,0,0,-1,0,([\d.]+)\)"', a)
        d = re.search(r' d="([^"]*)"', a)
        if not tr or not d: continue
        f = re.search(r'fill="([^"]*)"', a); st = re.search(r'stroke="([^"]*)"', a)
        pts, cmd, nums, x, y = [], None, [], 0, 0
        toks = TOK.findall(d.group(1)); i = 0
        while i < len(toks):
            t = toks[i]
            if t.isalpha(): cmd = t; i += 1; continue
            if cmd in 'ML': x, y = float(toks[i]), float(toks[i + 1]); i += 2; pts.append((x, H - y))
            elif cmd == 'H': x = float(t); i += 1; pts.append((x, H - y))
            elif cmd == 'V': y = float(t); i += 1; pts.append((x, H - y))
            elif cmd == 'C': x, y = float(toks[i + 4]), float(toks[i + 5]); i += 6; pts.append((x, H - y))
            else: i += 1
        paths.append({'fill': f.group(1) if f else None, 'stroke': st.group(1) if st else None, 'pts': pts, 'd': d.group(1)})
    return words, paths


def isnum(t): return re.fullmatch(r'-?\d+(\.\d+)?', t) is not None


def ycal(words, grid_ys, top, bot):
    """Linear map from SVG y to value for a panel, from its numeric tick labels and the nearest gridlines."""
    pairs = []
    for w in words:
        if isnum(w['t']) and w['x'] < 60 and top - 6 <= w['y'] <= bot + 6:
            g = min(grid_ys, key=lambda g: abs(g - (w['y'] - 3)))
            if abs(g - (w['y'] - 3)) < 3: pairs.append((g, float(w['t'])))
    (g0, v0), (g1, v1) = min(pairs), max(pairs)
    return lambda y: v0 + (y - g0) * (v1 - v0) / (g1 - g0), len(pairs)


def legend(words, paths, colors, names):
    """Colour -> legend name: the legend swatch (or line) of each colour and the nearest word to its right."""
    out = {}
    for c in colors:
        cand = [p for p in paths if (p['fill'] == c or p['stroke'] == c)]
        best = None
        for p in cand:
            x = max(q[0] for q in p['pts']); y = sum(q[1] for q in p['pts']) / len(p['pts'])
            for w in words:
                if w['t'] in names and 0 < w['x'] - x < 30 and abs(w['y'] - 3 - y) < 6:
                    dd = w['x'] - x + abs(w['y'] - 3 - y)
                    if best is None or dd < best[0]: best = (dd, w['t'])
        out[c] = best[1]
    return out


NAMES = ['ArXiv', 'DM Mathematics', 'Github', 'Gutenberg', 'PhilPapers', 'PubMed Abstracts', 'StackExchange', 'Wikipedia (en)']
COLS = ['#db5f57', '#dbc257', '#91db57', '#57db80', '#57d3db', '#5770db', '#a157db', '#db57b2']


def bars(fn, titles):
    words, paths = parse(fn)
    cmap = legend(words, paths, COLS, NAMES)
    grid = sorted({round(p['pts'][0][1], 3) for p in paths if p['stroke'] == '#e5e5e5' and len(p['pts']) == 2 and abs(p['pts'][0][1] - p['pts'][1][1]) < 1e-6})
    xt = sorted((w['x'], int(w['t'])) for w in words if re.fullmatch(r'[0-7]', w['t']) and w['y'] > max(t['y'] for t in titles))
    panels = []
    for k, t in enumerate(titles):
        top = t['y']; bot = titles[k + 1]['y'] if k + 1 < len(titles) else min(w['y'] for w in words if w['t'] == 'Expert ID') - 10
        f, n = ycal(words, [g for g in grid if top < g < bot], top, bot)
        vals = {cmap[c]: [None] * 8 for c in COLS}
        for p in paths:
            if p['fill'] in COLS and len(p['pts']) >= 4:
                ys = [q[1] for q in p['pts']]; xs = [q[0] for q in p['pts']]
                if not (top < min(ys) and max(ys) < bot): continue
                if max(xs) - min(xs) > 20: continue
                cx = (min(xs) + max(xs)) / 2
                vals[cmap[p['fill']]].append((cx, round(f(min(ys)) - f(max(ys)), 5)))
        # experts: the 8 bars of each colour sorted by x
        out = {}
        for nm, v in vals.items():
            b = sorted([z for z in v if z is not None], key=lambda z: z[0])
            out[nm] = [z[1] for z in b]
        panels.append({'title': t['t'], 'ticks_used': n, 'values': out})
    return panels, cmap


def main():
    R = {'_doc': 'Decoded by decode_figs.py from the vector SVGs of arXiv 2401.04088v1 (Figures 7, 9, 10).'}
    # Figure 7: three panels, either choice
    w, _ = parse('routing-assignments-short.svg')
    t7 = [x for x in w if x['t'].startswith('layer:')]
    R['fig7'], R['fig7_colors'] = bars('routing-assignments-short.svg', t7)
    w, _ = parse('routing-assignments-long.svg')
    t9 = [x for x in w if ' -- ' in x['t']]
    R['fig9'], _ = bars('routing-assignments-long.svg', t9)
    # Figure 10: repetition per layer, two panels, one polyline per domain
    w, paths = parse('repetitions.svg')
    cmap = legend(w, paths, COLS, NAMES)
    grid = sorted({round(p['pts'][0][1], 3) for p in paths if p['stroke'] == '#e5e5e5' and len(p['pts']) == 2 and abs(p['pts'][0][1] - p['pts'][1][1]) < 1e-6})
    vgrid = sorted({round(p['pts'][0][0], 3) for p in paths if p['stroke'] in ('#e5e5e5', '#fafafa') and len(p['pts']) == 2 and abs(p['pts'][0][0] - p['pts'][1][0]) < 1e-6})
    xl = sorted((x['x'], int(x['t'])) for x in w if x['t'] in ('0', '10', '20', '30') and x['y'] > 300)
    # x: gridline at layer 0 is the one nearest the '0' label; spacing from the 0 and 30 labels' gridlines
    gx = lambda lab: min(vgrid, key=lambda g: abs(g - (xl[[v for _, v in xl].index(lab)][0] + (2.5 if lab < 10 else 5))))
    x0, x30 = gx(0), gx(30)
    titles = sorted([x for x in w if x['t'] in ('First choice', 'First or second choice')], key=lambda x: x['y'])
    R['fig10'] = {}
    for k, t in enumerate(titles):
        top = t['y']; bot = titles[k + 1]['y'] if k + 1 < len(titles) else 312
        f, n = ycal(w, [g for g in grid if top < g < bot], top, bot)
        lines = {}
        for p in paths:
            if p['fill'] == 'none' and p['stroke'] in COLS and len(p['pts']) >= 20 and top < p['pts'][0][1] < bot:
                lines[cmap[p['stroke']]] = [[round((q[0] - x0) * 30 / (x30 - x0), 3), round(f(q[1]), 4)] for q in p['pts']]
        base = [round(f(p['pts'][0][1]), 4) for p in paths if p['stroke'] == '#000000' and top < p['pts'][0][1] < bot]
        R['fig10'][t['t']] = {'ticks_used': n, 'random_line': base, 'lines': lines}
    # validation against Table 5
    T5 = json.load(open(os.path.join(HERE, 'tables.json')))['t5']['rows']
    worst = 0
    for r in T5:
        nm = r[0]
        for j, (panel, L) in enumerate([('First choice', 0), ('First choice', 15), ('First choice', 31), ('First or second choice', 0), ('First or second choice', 15), ('First or second choice', 31)]):
            ln = R['fig10'][panel]['lines'][nm]; v = [y for x, y in ln if abs(x - L) < 1e-3][0]
            worst = max(worst, abs(100 * v - float(r[1 + j].rstrip('%'))))
    R['fig10_vs_table5_max_abs_diff_points'] = round(worst, 3)
    # either-choice shares should sum to 1 per panel and domain
    R['fig7_sums'] = [{k: round(sum(v), 4) for k, v in p['values'].items()} for p in R['fig7']]
    json.dump(R, open(os.path.join(HERE, 'inputs', 'figs.json'), 'w'), indent=1)
    print('fig10 vs Table 5: max abs diff', R['fig10_vs_table5_max_abs_diff_points'], 'points')
    print('fig7 sums', R['fig7_sums'])
    print('fig7 colours', R['fig7_colors'])
    print('fig10 random lines', {k: v['random_line'] for k, v in R['fig10'].items()})
    print('fig10 points per line', {k: len(v['lines']['ArXiv']) for k, v in R['fig10'].items()})


if __name__ == '__main__':
    main()
