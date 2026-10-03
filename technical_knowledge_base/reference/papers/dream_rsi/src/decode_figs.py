"""Decode the vector figures of Dream-RSI (arXiv HTML v1, LaTeXML pgfplots SVG) into data points.

usage: curl -sL https://arxiv.org/html/2609.14858v1 -o $SCRATCH/dream1.html
       python3 decode_figs.py $SCRATCH/dream1.html     (writes inputs/figs.json)

Method: every <g transform> is composed down to each <path>; tick marks (#737373 short
segments) are paired, in order, with the numeric tick labels of the same panel; a straight
line through the tick positions calibrates each axis (residual reported, in data units).
Series are the coloured stroked paths; markers are small closed paths whose centre is taken.
Nothing is read by eye. Values are reported to the precision the calibration supports.
"""
import re, sys, json, html

def mat_mul(a, b):  # affine [a b c d e f], apply b then a
    return [a[0]*b[0] + a[2]*b[1], a[1]*b[0] + a[3]*b[1],
            a[0]*b[2] + a[2]*b[3], a[1]*b[2] + a[3]*b[3],
            a[0]*b[4] + a[2]*b[5] + a[4], a[1]*b[4] + a[3]*b[5] + a[5]]

def parse_transform(t):
    m = [1, 0, 0, 1, 0, 0]
    for op, args in re.findall(r'(matrix|translate|scale)\(([^)]*)\)', t or ''):
        v = [float(x) for x in re.split(r'[ ,]+', args.strip()) if x]
        if op == 'matrix': n = v
        elif op == 'translate': n = [1, 0, 0, 1, v[0], v[1] if len(v) > 1 else 0]
        else: n = [v[0], 0, 0, v[1] if len(v) > 1 else v[0], 0, 0]
        m = mat_mul(m, n)
    return m

def apply(m, x, y): return (m[0]*x + m[2]*y + m[4], m[1]*x + m[3]*y + m[5])

def path_points(d):
    pts, cur, start = [], (0.0, 0.0), (0.0, 0.0)
    for cmd, args in re.findall(r'([MLHVCZmlhvcz])([^MLHVCZmlhvcz]*)', d):
        v = [float(x) for x in re.findall(r'-?\d*\.?\d+(?:e-?\d+)?', args)]
        if cmd == 'M':
            cur = (v[0], v[1]); start = cur; pts.append(('M', cur))
            for i in range(2, len(v) - 1, 2): cur = (v[i], v[i+1]); pts.append(('L', cur))
        elif cmd == 'L':
            for i in range(0, len(v) - 1, 2): cur = (v[i], v[i+1]); pts.append(('L', cur))
        elif cmd == 'h':
            for x in v: cur = (cur[0] + x, cur[1]); pts.append(('L', cur))
        elif cmd == 'v':
            for y in v: cur = (cur[0], cur[1] + y); pts.append(('L', cur))
        elif cmd == 'H':
            for x in v: cur = (x, cur[1]); pts.append(('L', cur))
        elif cmd == 'V':
            for y in v: cur = (cur[0], y); pts.append(('L', cur))
        elif cmd == 'C':
            for i in range(4, len(v), 6): cur = (v[i], v[i+1]); pts.append(('C', cur))
        elif cmd in 'Zz':
            cur = start
    return pts

TOK = re.compile(r'<g\b([^>]*)>|</g>|<path\b([^>]*?)(?:/>|></path>)|<foreignObject\b([^>]*)>(.*?)</foreignObject>|<svg\b([^>]*)>|</svg>', re.S)

def attr(a, k):
    m = re.search(r'(?<![\w-])' + k + r'="([^"]*)"', a or '')
    return m.group(1) if m else None

def parse_svg(svg):
    stack = [{'m': [1, 0, 0, 1, 0, 0], 'stroke': None, 'fill': None, 'dash': None, 'panel': None}]
    paths, labels, panel_n = [], [], 0
    for m in TOK.finditer(svg):
        g, p, fo_a, fo_body, svg_a = m.group(1), m.group(2), m.group(3), m.group(4), m.group(5)
        tok = m.group(0)
        if g is not None or svg_a is not None:
            a = g if g is not None else ''
            top = stack[-1]
            new = dict(top)
            new['m'] = mat_mul(top['m'], parse_transform(attr(a, 'transform')))
            for k, ak in (('stroke', 'stroke'), ('fill', 'fill'), ('dash', 'stroke-dasharray')):
                v = attr(a, ak)
                if v: new[k] = v
            if 'ltx_nestedsvg' in (a or '') and top['panel'] is None:
                new['panel'] = panel_n; panel_n += 1
            stack.append(new)
        elif tok.startswith('</g') or tok.startswith('</svg'):
            stack.pop()
        elif p is not None:
            top = stack[-1]
            mm = mat_mul(top['m'], parse_transform(attr(p, 'transform')))
            pts = [(k, apply(mm, *xy)) for k, xy in path_points(attr(p, 'd') or '')]
            style = attr(p, 'style') or ''
            paths.append({'stroke': top['stroke'], 'fill': top['fill'], 'dash': top['dash'], 'panel': top['panel'],
                          'nofill': 'fill:none' in style, 'nostroke': 'stroke:none' in style, 'pts': pts})
        elif fo_a is not None:
            top = stack[-1]
            mm = mat_mul(top['m'], parse_transform(attr(fo_a, 'transform')))
            w = float(attr(fo_a, 'width') or 0); h = float(attr(fo_a, 'height') or 0)
            alts = [html.unescape(x) for x in re.findall(r'alttext="([^"]*)"', fo_body)]
            txt = re.sub(r'<[^>]+>', '', re.sub(r'<annotation.*?</annotation>', '', fo_body, flags=re.S))
            txt = html.unescape(re.sub(r'\s+', ' ', txt)).strip()
            c = apply(mm, w / 2, h / 2)
            labels.append({'alt': alts, 'text': txt, 'x': c[0], 'y': c[1], 'panel': top['panel']})
    return paths, labels

def num(s):
    s = s.replace('{,}', '').replace(',', '').replace('$', '').strip()
    try: return float(s)
    except ValueError: return None

def fit(px, vals):
    n = len(px); mx = sum(px)/n; my = sum(vals)/n
    sxx = sum((x-mx)**2 for x in px)
    b = sum((x-mx)*(y-my) for x, y in zip(px, vals)) / sxx
    a = my - b*mx
    res = max(abs(a + b*x - y) for x, y in zip(px, vals))
    return a, b, res

def axes(paths, labels, panel):
    ticks = [p for p in paths if p['panel'] == panel and p['stroke'] == '#737373' and p['nofill']]
    xs, ys = [], []
    for t in ticks:
        pts = [xy for _, xy in t['pts']]
        for i in range(0, len(pts) - 1, 2):
            (x0, y0), (x1, y1) = pts[i], pts[i+1]
            L = ((x1-x0)**2 + (y1-y0)**2) ** .5
            if 4 < L < 8:
                if abs(x0 - x1) < 1e-6: xs.append(x0)
                elif abs(y0 - y1) < 1e-6: ys.append(y0)
    xs = sorted(set(round(x, 2) for x in xs)); ys = sorted(set(round(y, 2) for y in ys))
    nl = [(l, num(l['alt'][0])) for l in labels if l['panel'] == panel and len(l['alt']) == 1 and num(l['alt'][0]) is not None]
    # x labels: below the lowest y tick (screen y larger); y labels: left of the smallest x tick
    ybot = max(ys) if ys else 0; xleft = min(xs) if xs else 0
    xl = sorted([(l['x'], v) for l, v in nl if l['y'] > ybot + 2], key=lambda t: t[0])
    yl = sorted([(l['y'], v) for l, v in nl if l['x'] < xleft - 2 and l['y'] <= ybot + 2], key=lambda t: t[0])
    out = {}
    if len(xl) == len(xs) and xs: out['x'] = fit(xs, [v for _, v in xl])
    if len(yl) == len(ys) and ys: out['y'] = fit(ys, [v for _, v in yl])
    out['xticks'] = [v for _, v in xl]; out['yticks'] = [v for _, v in yl]; out['xs'] = xs
    return out

def series(paths, panel, ax):
    skip = {'#EBEBEB', '#737373', '#333333', '#000000', '#FFFFFF', None}
    lines, marks = {}, {}
    for p in paths:
        if p['panel'] != panel or p['stroke'] in skip and p['fill'] in skip: continue
        col = p['stroke'] if p['stroke'] not in skip else p['fill']
        pts = [xy for _, xy in p['pts']]
        if not pts: continue
        X = lambda x: ax['x'][0] + ax['x'][1]*x
        Y = lambda y: ax['y'][0] + ax['y'][1]*y
        if p['nofill']:
            lines.setdefault(col, []).append([(round(X(x), 3), round(Y(y), 4)) for x, y in pts])
        else:
            cx = (min(x for x, _ in pts) + max(x for x, _ in pts)) / 2
            cy = (min(y for _, y in pts) + max(y for _, y in pts)) / 2
            if max(x for x, _ in pts) - min(x for x, _ in pts) < 6:
                marks.setdefault(col, []).append((round(X(cx), 3), round(Y(cy), 4)))
    return lines, marks

if __name__ == '__main__':
    s = open(sys.argv[1]).read()
    out = {'source': 'https://arxiv.org/html/2609.14858v1', 'figures': {}}
    for fid in ['S4.F3', 'S4.F4', 'S5.F5', 'S5.F6']:
        fig = re.search(r'<figure[^>]*id="' + re.escape(fid) + r'".*?</figure>', s, re.S).group(0)
        svgs = re.findall(r'<svg\b.*?</svg>', fig, re.S)
        figo = []
        for si, svg in enumerate(svgs):
            paths, labels = parse_svg(svg)
            panels = sorted(set(p['panel'] for p in paths if p['panel'] is not None))
            axs = {pn: axes(paths, labels, pn) for pn in panels}
            for pn in panels:
                ax = axs[pn]
                if 'x' not in ax and ax['xs']:
                    # shared x axis (groupplot): borrow the calibration of a panel with identical tick positions
                    for q in panels:
                        if q != pn and 'x' in axs[q] and axs[q]['xs'] == ax['xs']:
                            ax['x'] = axs[q]['x']; ax['xticks'] = axs[q]['xticks']; ax['x_from_panel'] = q
                if 'x' not in ax or 'y' not in ax:
                    figo.append({'svg': si, 'panel': pn, 'error': 'no calibration', 'ax': ax,
                                 'labels': [{'t': l['text'] or ' '.join(l['alt']), 'x': round(l['x'], 2), 'y': round(l['y'], 2)} for l in labels if l['panel'] == pn]}); continue
                lines, marks = series(paths, pn, ax)
                txt = [l['text'] or ' '.join(l['alt']) for l in labels if l['panel'] == pn]
                figo.append({'svg': si, 'panel': pn, 'xcal_resid': ax['x'][2], 'ycal_resid': ax['y'][2],
                             'x_from_panel': ax.get('x_from_panel'), 'xticks': ax['xticks'], 'yticks': ax['yticks'], 'lines': lines, 'markers': marks, 'labels': txt})
        out['figures'][fid] = figo
    json.dump(out, open('inputs/figs.json', 'w'), indent=1)
    for fid, f in out['figures'].items():
        for p in f:
            print(fid, p.get('svg'), p.get('panel'), p.get('error', ''), 'resid', p.get('xcal_resid'), p.get('ycal_resid'),
                  {k: len(v) for k, v in p.get('markers', {}).items()}, p.get('labels', [])[:12])
