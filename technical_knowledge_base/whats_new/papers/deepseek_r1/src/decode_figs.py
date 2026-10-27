"""Decode the vector figures of the DeepSeek-R1 paper (arXiv v2 PDF) into numbers.

usage: curl -sL https://arxiv.org/pdf/2501.12948v2 -o /tmp/r1_v2.pdf
       uv run --with pymupdf python decode_figs.py /tmp/r1_v2.pdf
writes inputs/figs.json. Nothing is read off by eye: every value comes from a drawing coordinate,
mapped to data units by a least-squares fit of the axis tick marks to their printed labels
(the fit residual is stored with each axis).

For each figure page: tick marks are the short black strokes on the plot frame; each is paired with
the nearest numeric label; colored paths inside a plot frame are the data (markers: small closed
curves, decoded to their centres; lines: their vertices; bars: filled rectangles).
"""
import json, re, sys
import pymupdf as fitz

PAGES = {'fig1': 4, 'fig6': 36, 'fig7': 37, 'fig8': 38, 'fig9': 39, 'fig10': 42, 'fig14': None, 'fig17': 58, 'fig18': 59}
RIGHT = {'fig6': ('(1.0, 0.0, 0.0)',)}  # series drawn against the right-hand axis
NUM = re.compile(r'^[−\-]?\d+(\.\d+)?%?$')


def num(t):
    return float(t.replace('−', '-').replace('%', ''))


def colkey(c):
    return None if c is None else tuple(round(x, 3) for x in c)


def is_grey(c):
    return c is None or (abs(c[0] - c[1]) < 0.02 and abs(c[1] - c[2]) < 0.02)


def page_data(doc, pno):
    p = doc[pno - 1]
    texts = []
    for b in p.get_text('dict')['blocks']:
        for l in b.get('lines', []):
            for s in l['spans']:
                t = s['text'].strip()
                if t:
                    x0, y0, x1, y1 = s['bbox']
                    texts.append({'t': t, 'cx': (x0 + x1) / 2, 'cy': (y0 + y1) / 2, 'x0': x0, 'x1': x1, 'y0': y0, 'y1': y1, 'size': s['size']})
    return p.get_drawings(), texts


def ticks(drs):
    xt, yt = [], []
    for d in drs:
        its = d['items']
        if len(its) != 1 or its[0][0] != 'l': continue
        if not d.get('color') or max(d['color']) > 0.05: continue
        a, b = its[0][1], its[0][2]
        L = abs(a.x - b.x) + abs(a.y - b.y)
        if L > 6 or L < 0.5: continue
        if abs(a.x - b.x) < 0.01: xt.append((a.x, min(a.y, b.y), max(a.y, b.y)))
        elif abs(a.y - b.y) < 0.01: yt.append((a.y, min(a.x, b.x), max(a.x, b.x)))
    return xt, yt


def fit(pairs):
    n = len(pairs)
    if n < 2: return None
    sx = sum(p for p, v in pairs); sv = sum(v for p, v in pairs)
    sxx = sum(p * p for p, v in pairs); sxv = sum(p * v for p, v in pairs)
    den = n * sxx - sx * sx
    if abs(den) < 1e-9: return None
    a = (n * sxv - sx * sv) / den; b = (sv - a * sx) / n
    res = max(abs(a * p + b - v) for p, v in pairs)
    return {'a': a, 'b': b, 'resid': res, 'n': n, 'pairs': pairs}


def split(pairs, gap, decreasing=False):
    """Split sorted (position, value) pairs into separate axes where the gap is large or the labels stop being monotonic
    (in whichever direction the axis runs)."""
    out, cur, sgn = [], [], 0
    for p in pairs:
        if cur:
            d = p[1] - cur[-1][1]
            mono = d != 0 and (sgn == 0 or (d > 0) == (sgn > 0))
            if p[0] - cur[-1][0] > gap or not mono:
                out.append(cur); cur = []; sgn = 0
            else:
                sgn = d
        cur.append(p)
    if cur: out.append(cur)
    return [g for g in out if len(g) >= 2]


def axes(drs, texts):
    """Group tick marks into subplot axes and calibrate each against its labels."""
    xt, yt = ticks(drs)
    nums = [t for t in texts if NUM.match(t['t'])]
    out = []
    # x axes: group ticks by their y (baseline)
    rows = {}
    for x, y0, y1 in xt:
        rows.setdefault(round(y0, 0), []).append(x)
    xaxes = []
    for y, xs in rows.items():
        xs = sorted(set(round(v, 3) for v in xs))
        pairs = []
        for x in xs:
            cand = [t for t in nums if abs(t['cx'] - x) < 9 and 0 < t['cy'] - y < 14]
            if cand:
                c = min(cand, key=lambda t: abs(t['cx'] - x) + abs(t['cy'] - y))
                pairs.append((x, num(c['t'])))
        for g in split(pairs, 120):
            f = fit(g)
            if f: xaxes.append({'y': y, 'x0': g[0][0], 'x1': g[-1][0], 'fit': f})
    cols = {}
    for y, x0, x1 in yt:
        cols.setdefault(round(x1, 0), []).append(y)
    yaxes = []
    for x, ys in cols.items():
        ys = sorted(set(round(v, 3) for v in ys))
        pairs = []
        for y in ys:
            cand = [t for t in nums if abs(t['cy'] - y) < 5 and 0 < x - t['x1'] < 14]
            if cand:
                c = min(cand, key=lambda t: abs(t['cy'] - y) + abs(x - t['x1']))
                pairs.append((y, num(c['t'])))
        for g in split(pairs, 100, decreasing=True):
            f = fit(g)
            if f: yaxes.append({'x': x, 'y0': g[0][0], 'y1': g[-1][0], 'fit': f})
    # right-hand y axes (labels to the right of the tick)
    rcols = {}
    for y, x0, x1 in yt:
        rcols.setdefault(round(x0, 0), []).append(y)
    raxes = []
    for x, ys in rcols.items():
        ys = sorted(set(round(v, 3) for v in ys))
        pairs = []
        for y in ys:
            cand = [t for t in nums if abs(t['cy'] - y) < 5 and 0 < t['x0'] - x < 14]
            if cand:
                c = min(cand, key=lambda t: abs(t['cy'] - y) + abs(t['x0'] - x))
                pairs.append((y, num(c['t'])))
        for g in split(pairs, 100):
            f = fit(g)
            if f: raxes.append({'x': x, 'y0': g[0][0], 'y1': g[-1][0], 'fit': f})
    return xaxes, yaxes, raxes


def series(drs, frame):
    x0, y0, x1, y1 = frame
    out = {}
    for d in drs:
        c = d.get('color') if d.get('color') is not None else d.get('fill')
        r = d['rect']
        if is_grey(c) and d.get('fill') is not None and len(d['items']) > 100 and not (r.x1 < x0 - 2 or r.x0 > x1 + 2):
            # a shaded band (Figure 18's standard deviation): keep its outline
            its = d['items']; e = out.setdefault('band', {'color': None, 'markers': [], 'lines': [], 'bars': []})
            e['lines'].append([(its[0][1].x, its[0][1].y)] + [(it[-1].x, it[-1].y) for it in its]); continue
        if is_grey(c): continue
        if r.x1 < x0 - 2 or r.x0 > x1 + 2 or r.y1 < y0 - 2 or r.y0 > y1 + 2: continue
        its = d['items']
        k = colkey(c)
        e = out.setdefault(str(k), {'color': k, 'markers': [], 'lines': [], 'bars': []})
        if all(it[0] == 'c' for it in its) and r.width < 4 and r.height < 4:
            e['markers'].append(((r.x0 + r.x1) / 2, (r.y0 + r.y1) / 2))
        elif len(its) == 1 and its[0][0] == 're':
            e['bars'].append((r.x0, r.y0, r.x1, r.y1))
        elif all(it[0] == 'l' for it in its):
            pts = [(its[0][1].x, its[0][1].y)] + [(it[2].x, it[2].y) for it in its]
            e['lines'].append(pts)
        elif d.get('fill') is not None and r.width > 1 and all(it[0] in ('l', 're') for it in its):
            e['bars'].append((r.x0, r.y0, r.x1, r.y1))
    return out


def main(pdf):
    doc = fitz.open(pdf)
    res = {}
    for name, pno in PAGES.items():
        if not pno: continue
        drs, texts = page_data(doc, pno)
        xa, ya, ra = axes(drs, texts)
        plots = []
        for X in xa:
            # the y axis whose ticks sit at the left end of this x axis
            cands = [Y for Y in ya if abs(Y['x'] - X['x0']) < 40 and Y['y1'] <= X['y'] + 2]
            Y = min(cands, key=lambda Y: abs(Y['x'] - X['x0'])) if cands else None
            if not Y: continue
            frame = (Y['x'], Y['y0'] - 3, X['x1'] + 8, X['y'])
            fx, fy = X['fit'], Y['fit']
            R = [Z for Z in ra if abs(Z['x'] - X['x1']) < 40]
            fr = R[0]['fit'] if R else None
            if R: frame = (frame[0], frame[1], R[0]['x'], frame[3])
            S = series(drs, frame)
            for k, e in S.items():
                g = fr if (fr and k in RIGHT.get(name, ())) else fy
                e['axis'] = 'right' if g is fr and fr else 'left'
                e['markers'] = [[fx['a'] * x + fx['b'], g['a'] * y + g['b']] for x, y in e['markers']]
                e['lines'] = [[[fx['a'] * x + fx['b'], g['a'] * y + g['b']] for x, y in L] for L in e['lines']]
                e['bars'] = [[fx['a'] * a + fx['b'], g['a'] * b + g['b'], fx['a'] * c + fx['b'], g['a'] * d + g['b']] for a, b, c, d in e['bars']]
            plots.append({'frame': [round(v, 2) for v in frame], 'x_fit': {k: fx[k] for k in ('a', 'b', 'resid', 'n')}, 'y_fit': {k: fy[k] for k in ('a', 'b', 'resid', 'n')}, 'y2_fit': {k: fr[k] for k in ('a', 'b', 'resid', 'n')} if fr else None, 'series': S,
                          'labels': [t['t'] for t in texts if frame[0] - 30 < t['cx'] < frame[2] + 10 and frame[1] - 20 < t['cy'] < frame[3] + 20 and not NUM.match(t['t'])]})
        res[name] = {'page': pno, 'plots': plots}
        print(name, 'page', pno, 'plots', len(plots), [(round(p['x_fit']['resid'], 4), round(p['y_fit']['resid'], 4), list(p['series'].keys())) for p in plots])
    json.dump(res, open('inputs/figs.json', 'w'), indent=0)


if __name__ == '__main__':
    main(sys.argv[1])
