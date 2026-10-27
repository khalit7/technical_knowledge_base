"""Decode the paper's bar charts from the vector PDFs in its arXiv e-print into numbers (inputs/figs.json).

The e-print of 2610.27157v1 ships every chart as a vector PDF (fig/*.pdf). Each bar is a filled rectangle with
exact coordinates and each axis tick is a short line next to a printed tick label, so a bar's value is a linear
fit of tick positions to tick labels, exact up to the PDF's coordinate precision. This is transcription of vector
geometry, not reading curves by eye. Where the authors printed a value above a bar, the printed label is kept
beside the decoded value, and the two must agree to the label's precision (checked here).

  mkdir -p <scratch>/ep && curl -sL https://arxiv.org/e-print/2610.27157v1 | tar xz -C <scratch>/ep
  uv run --no-project --with pymupdf python decode_figs.py <scratch>/ep/fig
"""
import json, os, re, sys
import fitz  # PyMuPDF

SERIES = {(0.0, 0.45, 0.7): 'blue', (0.66, 0.27, 0.5): 'magenta', (0.6, 0.63, 0.65): 'grey'}
PANEL = (0.97, 0.97, 0.95)
NUM = re.compile(r'[+−-]?\d*\.\d+|[+−-]?\d+')


def num(s):
    s = s.replace('−', '-').replace(' ', '')
    return float(s)


def words(page):
    """Words, with merged numbers such as '36.035.0' split into pieces whose boxes share the width."""
    out = []
    raw = page.get_text('words')
    # join '. 75' style splits: a lone '.' followed by digits on the same line
    i = 0
    while i < len(raw):
        w = list(raw[i][:5])
        if w[4] == '.' and i + 1 < len(raw) and re.fullmatch(r'\d+', raw[i + 1][4]) and abs(raw[i + 1][1] - w[1]) < 1.5:
            w = [w[0], w[1], raw[i + 1][2], raw[i + 1][3], '.' + raw[i + 1][4]]; i += 1
        i += 1
        parts = re.findall(r'[+−-]?\d*\.\d', w[4]) if re.fullmatch(r'([+−-]?\d+\.\d)+', w[4]) else None
        if parts and len(parts) > 1:
            n = len(parts); wd = (w[2] - w[0]) / n
            for k, p in enumerate(parts):
                out.append((w[0] + k * wd, w[1], w[0] + (k + 1) * wd, w[3], p))
        else:
            out.append(tuple(w))
    return out


def decode(path):
    doc = fitz.open(path); page = doc[0]
    W = words(page)
    D = page.get_drawings()
    panels = []
    # a panel is an L of axis lines: a vertical spine and a horizontal one meeting at its bottom
    segs = []
    for g in D:
        c = g.get('color'); r = g['rect']
        if c and not g.get('fill') and tuple(round(x, 2) for x in c) == (0.35, 0.35, 0.35) and len(g['items']) == 1:
            segs.append(r)
    for v in segs:
        if v.width < 0.01 and v.height > 20:
            for h in segs:
                if h.height < 0.01 and h.width > 20 and abs(h.x0 - v.x0) < 0.3 and abs(h.y0 - v.y1) < 0.3:
                    panels.append(fitz.Rect(v.x0, v.y0, h.x1, v.y1))
    panels = list({(round(r.x0, 1), round(r.y0, 1), round(r.x1, 1), round(r.y1, 1)): r for r in panels}.values())
    res = []
    for P in sorted(panels, key=lambda r: (round(r.y1), r.x0)):
        # y ticks: short horizontal lines ending at the panel's left edge
        ticks = []
        for g in D:
            r = g['rect']
            if abs(r.y1 - r.y0) < 0.01 and 0.5 < r.width < 3 and abs(r.x1 - P.x0) < 0.6 and P.y0 - 1 <= r.y0 <= P.y1 + 1 and g.get('color'):
                y = r.y0
                lab = [w for w in W if w[2] <= P.x0 + 0.5 and P.x0 - 25 < w[0] and abs((w[1] + w[3]) / 2 - y) < 3.5 and NUM.fullmatch(w[4].replace(' ', ''))]
                if lab:
                    lab.sort(key=lambda w: -w[2])
                    ticks.append((y, num(lab[0][4])))
        ticks = sorted(set(ticks))
        if len(ticks) < 2:
            same = [q for q in res if abs(q['rect'][1] - round(P.y0, 1)) < 0.5 and abs(q['rect'][3] - round(P.y1, 1)) < 0.5]
            if not same: continue
            ticks = [tuple(t) for t in same[-1]['ticks']]
        (ya, va), (yb, vb) = ticks[0], ticks[-1]
        k = (vb - va) / (yb - ya)
        val = lambda y: va + (y - ya) * k
        # check linearity on every tick
        lin = max(abs(val(y) - v) for y, v in ticks)
        bars, lines, errs = [], [], []
        for g in D:
            f = g.get('fill'); r = g['rect']
            if f and tuple(round(x, 2) for x in f) in SERIES and P.x0 - 0.1 <= r.x0 and r.x1 <= P.x1 + 0.1 and P.y0 - 0.1 <= r.y0 and r.y1 <= P.y1 + 80 and r.width > 1:
                col = SERIES[tuple(round(x, 2) for x in f)]
                # a bar grows from the zero line (or the axis bottom); its value is the edge away from it
                zero_y = ya + (0 - va) / k if va <= 0 <= vb or vb <= 0 <= va else P.y1
                has0 = va <= 0 <= vb or vb <= 0 <= va
                top = (r.y0 if abs(r.y0 - zero_y) > abs(r.y1 - zero_y) else r.y1) if has0 else r.y0  # the edge away from the zero line
                v = val(top)
                xc = (r.x0 + r.x1) / 2
                pr = sorted([w for w in W if w[0] < r.x1 + 1 and w[2] > r.x0 - 1 and NUM.fullmatch(w[4].replace(' ', '')) and abs(((w[1] + w[3]) / 2) - top) < 9 and P.y0 - 6 < w[1] < P.y1], key=lambda w: abs((w[0] + w[2]) / 2 - xc))
                pr = [w[4] for w in pr]
                cat = sorted([w for w in W if P.y1 < w[1] < P.y1 + 14], key=lambda w: abs((w[0] + w[2]) / 2 - xc))
                bars.append({'color': col, 'x': round(xc, 2), 'value': round(v, 4), 'printed': pr[0] if pr else None, 'near_label': cat[0][4] if cat else None})
            c = g.get('color'); d = g.get('dashes')
            if c and not f and tuple(round(x, 2) for x in c) == (0.1, 0.1, 0.1) and r.width < 0.01 and r.height > 0.5 and P.x0 < r.x0 < P.x1 and P.y0 - 1 <= r.y0 <= P.y1 + 1:
                errs.append({'x': round(r.x0, 2), 'lo': round(val(r.y1), 3), 'hi': round(val(r.y0), 3)})
            if c and not f and d and d != '[] 0' and abs(r.y1 - r.y0) < 0.01 and r.width > (P.x1 - P.x0) * 0.8 and r.x0 >= P.x0 - 0.5 and r.x1 <= P.x1 + 0.5 and P.y0 - 1 <= r.y0 <= P.y1 + 1:
                lines.append({'color': SERIES.get(tuple(round(x, 2) for x in c), str(tuple(round(x, 2) for x in c))), 'value': round(val(r.y0), 4)})
        title = [w[4] for w in W if P.y0 - 14 < w[1] < P.y0 and P.x0 - 30 < w[0] < P.x1]
        res.append({'panel': ' '.join(title[:8]), 'rect': [round(P.x0, 1), round(P.y0, 1), round(P.x1, 1), round(P.y1, 1)],
                    'ticks': ticks, 'tick_fit_max_err': round(lin, 6), 'bars': sorted(bars, key=lambda b: b['x']), 'lines': lines, 'errbars': sorted(errs, key=lambda e: e['x'])})
    return res


def agree(b):
    """A printed label agrees with the decoded value to the label's precision."""
    p = b['printed']
    if p is None: return None
    s = p.replace('−', '-').replace('+', '')
    dec = len(s.split('.')[1]) if '.' in s else 0
    return abs(float(s) - b['value']) <= 0.5 * 10 ** -dec + 1e-3


if __name__ == '__main__':
    d = sys.argv[1]
    FIGS = {'fig_main_results': 'S1.F1', 'fig3': 'S2.F2', 'fig4': 'S2.F3', 'fig6': 'S5.F5', 'ms_best': 'A1.F9', 'fig13': 'A1.F11',
            'branching_all': 'A1.F12', 'branching_capacity': 'A1.F13'}
    out = {'source': 'https://arxiv.org/e-print/2610.27157v1 (fig/*.pdf), decoded by decode_figs.py', 'figures': {}}
    bad = 0
    for f, anchor in FIGS.items():
        ps = decode(os.path.join(d, f + '.pdf'))
        for p in ps:
            for b in p['bars']:
                if f == 'fig6' and 'trace' in p['panel'] and b['color'] == 'magenta':
                    b['value'] = None; b['note'] = 'plotted on the right axis (gain, points), which has too few ticks to calibrate here; the printed label is used'
                b['agrees'] = agree(b) if b['value'] is not None else None
                if b['agrees'] is False: bad += 1; print('DISAGREE', f, p['panel'], b)
        out['figures'][f] = {'anchor': anchor, 'panels': ps}
    os.makedirs('inputs', exist_ok=True)
    json.dump(out, open('inputs/figs.json', 'w'), indent=1, ensure_ascii=False)
    n = sum(len(p['bars']) for v in out['figures'].values() for p in v['panels'])
    m = sum(1 for v in out['figures'].values() for p in v['panels'] for b in p['bars'] if b['agrees'])
    print('bars', n, 'with printed labels that agree', m, 'disagree', bad)
