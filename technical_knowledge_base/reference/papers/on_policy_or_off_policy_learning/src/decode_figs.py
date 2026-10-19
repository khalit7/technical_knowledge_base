"""Decode the paper's line figures from the vector SVGs in its arXiv HTML (2609.35259v1) into numbers.

The SVGs carry each glyph's character (data-text), so tick labels are read exactly, and every line, marker
and error bar is a path with exact coordinates. Values come from a linear fit of tick positions to tick
labels (residual printed), so they are transcriptions of vector geometry ("read from figure"), not curves
read by eye. Error-bar half lengths are the SEM the captions describe.

  mkdir -p SCRATCH/figs && cd SCRATCH/figs && for f in 13_contrastive_lambda_three_seed_main_solid \
     average_probability_vs_lambda 05_countdown_learning_rate_effects; do \
     curl -sL https://arxiv.org/html/2609.35259v1/$f.svg -o $f.svg; done
  python3 decode_figs.py SCRATCH/figs     (writes inputs/figs.json)
"""
import json, os, re, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import svgparse

FKL, RKL = '#7158a4', '#d18c28'          # forward KL purple, reverse KL orange (legend)
NUM = re.compile(r'^[−-]?\d+(\.\d+)?%?$')


def tonum(t):
    return float(t.replace('−', '-').replace('%', ''))


def panels(paths):
    out = []
    for p in paths:
        if p['fill'] == '#ffffff' and len(p['pts']) == 4 and p['stroke'] is None:
            xs = [q[0] for q in p['pts']]; ys = [q[1] for q in p['pts']]
            r = (min(xs), min(ys), max(xs), max(ys))
            if r[0] < 1 and r[1] < 1: continue
            out.append(r)
    return sorted(out)


def fit(pairs):
    n = len(pairs); mx = sum(a for a, b in pairs) / n; my = sum(b for a, b in pairs) / n
    k = sum((a - mx) * (b - my) for a, b in pairs) / sum((a - mx) ** 2 for a, b in pairs)
    c = my - k * mx
    res = max(abs(k * a + c - b) for a, b in pairs)
    return (lambda v: k * v + c), res


def axis(paths, words, rect, which):
    """Tick marks (filled #4a4a4a two-point paths touching the panel edge) matched to their numeric labels."""
    x0, y0, x1, y1 = rect
    marks = []
    for p in paths:
        if p['fill'] == '#4a4a4a' and len(p['pts']) == 2:
            (ax, ay), (bx, by) = p['pts']
            if which == 'y' and abs(ay - by) < 1e-6 and abs(max(ax, bx) - x0) < 0.6 and y0 - 1 <= ay <= y1 + 1: marks.append(ay)
            if which == 'x' and abs(ax - bx) < 1e-6 and abs(min(ay, by) - y1) < 0.6 and x0 - 1 <= ax <= x1 + 1: marks.append(ax)
    pairs = []
    for m in marks:
        best = None
        for w in words:
            if w['rot'] or not NUM.match(w['t']): continue
            if which == 'y':
                if w['x'] > x0 or x0 - w['x'] > 40: continue
                d = abs((w['y'] - 3.2) - m)
            else:
                if w['y'] < y1 or w['y'] - y1 > 16: continue
                d = abs(w['x'] + 2.5 * len(w['t']) - m)
            if d < 4 and (best is None or d < best[0]): best = (d, w)
        if best: pairs.append((m, tonum(best[1]['t'])))
    return fit(pairs)


def lines(paths, rect, colours):
    """Polylines of width 1.5 inside a panel: (colour, dashed, [(x, y), ...])."""
    x0, y0, x1, y1 = rect
    out = []
    for p in paths:
        if p['stroke'] in colours and abs(p['sw'] - 1.5) < 1e-6 and len(p['pts']) > 2:
            if all(x0 - 1 <= x <= x1 + 1 and y0 - 1 <= y <= y1 + 1 for x, y in p['pts']):
                out.append((p['stroke'], p.get('dash', False), p['pts']))
    return out


def errbars(paths, rect, colour):
    """Error-bar stems: stroked vertical two-point paths of width 0.75 in the series colour."""
    x0, y0, x1, y1 = rect
    out = []
    for p in paths:
        if p['stroke'] == colour and abs(p['sw'] - 0.75) < 1e-6 and len(p['pts']) == 2:
            (ax, ay), (bx, by) = p['pts']
            if abs(ax - bx) < 1e-6 and x0 - 1 <= ax <= x1 + 1: out.append((ax, min(ay, by), max(ay, by)))
    return out


def load(d, f):
    H, glyphs, paths = svgparse.parse(os.path.join(d, f + '.svg'))
    # dashed flag from the raw file, in path order
    s = open(os.path.join(d, f + '.svg')).read()
    raw = re.findall(r'<path([^>]*)/>', s[s.index('</defs>'):])
    for p, a in zip(paths, raw): p['dash'] = 'stroke-dasharray' in a
    return glyphs, svgparse.words(glyphs), paths


def series(d, f, ncol, labels):
    """One entry per panel: {series: {lr: [(x, y, sem)]}} for both KL directions."""
    glyphs, words, paths = load(d, f)
    out = []
    for i, rect in enumerate(panels(paths)[:ncol]):
        fy, ry = axis(paths, words, rect, 'y'); fx, rx = axis(paths, words, rect, 'x')
        pan = {'panel': labels[i], 'tick_residual_y': round(ry, 6), 'tick_residual_x': round(rx, 6)}
        for col, name in ((FKL, 'forward'), (RKL, 'reverse')):
            bars = errbars(paths, rect, col)
            for c, dash, pts in lines(paths, rect, (col,)):
                lr = '1e-5' if dash else '5e-5'
                rows = []
                for x, y in pts:
                    sem = None
                    for bx, lo, hi in bars:
                        if abs(bx - x) < 0.05 and abs((lo + hi) / 2 - y) < 0.05:
                            sem = round(abs(fy(lo) - fy(hi)) / 2, 2); break
                    rows.append([round(fx(x), 3), round(fy(y), 2), sem])
                pan[name + ' ' + lr] = rows
        out.append(pan)
    return out


CFG = {'#0072b2': 'OnPD F-KL', '#009e73': 'OnPD R-KL', '#e69f00': 'OffPD F-KL', '#d55e00': 'OffPD R-KL'}


def fig1(d):
    """Figure 1: bars (ID accuracy, sparsity) with SEM stems, and the ID-OOD scatter with x and y SEM."""
    glyphs, words, paths = load(d, '02_full_kl_final_metrics')
    P = panels(paths)
    out = {'bars_id': [], 'bars_sparsity': [], 'scatter': []}
    for key, rect in (('bars_id', P[0]), ('bars_sparsity', P[2])):
        fy, ry = axis(paths, words, rect, 'y'); out[key + '_tick_residual'] = round(ry, 6)
        bars = sorted([p for p in paths if p['fill'] in CFG and len(p['pts']) == 4 and not p['curve']
                       and rect[0] <= min(x for x, y in p['pts']) <= rect[2] and max(y for x, y in p['pts']) >= rect[3] - 0.5 and min(y for x, y in p['pts']) < rect[3]], key=lambda p: min(x for x, y in p['pts']))
        for i, b in enumerate(bars):
            xs = [x for x, y in b['pts']]; ys = [y for x, y in b['pts']]; xc = (min(xs) + max(xs)) / 2
            stem = [p for p in paths if p['stroke'] == '#000000' and len(p['pts']) == 2 and abs(p['pts'][0][0] - xc) < 0.3 and abs(p['pts'][0][0] - p['pts'][1][0]) < 1e-6]
            sem = round(abs(fy(stem[0]['pts'][0][1]) - fy(stem[0]['pts'][1][1])) / 2, 2) if stem else None
            out[key].append({'config': CFG[b['fill']], 'lr': '1e-5' if i % 2 == 0 else '5e-5', 'value': round(fy(min(ys)), 2), 'sem': sem})
    rect = P[1]
    fy, ry = axis(paths, words, rect, 'y'); fx, rx = axis(paths, words, rect, 'x')
    out['scatter_tick_residual'] = [round(rx, 6), round(ry, 6)]
    for p in paths:
        if (p['fill'] in CFG or p['stroke'] == '#555555') and p['curve'] or (p['fill'] in CFG and len(p['pts']) == 4 and not p['curve'] and (max(x for x, y in p['pts']) - min(x for x, y in p['pts'])) < 7):
            xs = [x for x, y in p['pts']]; ys = [y for x, y in p['pts']]
            xc = (min(xs) + max(xs)) / 2; yc = (min(ys) + max(ys)) / 2
            if not (rect[0] <= xc <= rect[2] and rect[1] <= yc <= rect[3]): continue
            col = p['fill'] if p['fill'] in CFG else '#555555'
            # caps: vertical caps at the x-error ends, horizontal caps at the y-error ends
            vc = [q for q in paths if q['fill'] == col and len(q['pts']) == 2 and abs(q['pts'][0][0] - q['pts'][1][0]) < 1e-6 and abs((q['pts'][0][1] + q['pts'][1][1]) / 2 - yc) < 0.3]
            hc = [q for q in paths if q['fill'] == col and len(q['pts']) == 2 and abs(q['pts'][0][1] - q['pts'][1][1]) < 1e-6 and abs((q['pts'][0][0] + q['pts'][1][0]) / 2 - xc) < 0.3]
            def pair(caps, k, c):
                vals = sorted(set(round(q['pts'][0][k], 4) for q in caps))
                best = None
                for i in range(len(vals)):
                    for j in range(i + 1, len(vals)):
                        if abs((vals[i] + vals[j]) / 2 - c) < 0.3 and (best is None or vals[j] - vals[i] < best[1] - best[0]): best = (vals[i], vals[j])
                return best
            bx = pair(vc, 0, xc); by = pair(hc, 1, yc)
            sx = round(abs(fx(bx[1]) - fx(bx[0])) / 2, 2) if bx else None
            sy = round(abs(fy(by[1]) - fy(by[0])) / 2, 2) if by else None
            out['scatter'].append({'config': CFG.get(col, 'untrained baseline'), 'marker_circle': p['curve'], 'id': round(fx(xc), 2), 'ood': round(fy(yc), 2), 'sem_id': sx, 'sem_ood': sy})
    return out


def fig5(d, f):
    """Figure 5 / 12: pass@1 and pass@10 along the spectrum, read from the SEM caps (fill-opacity .75, two caps
    per point: the mean is their midpoint, the SEM half their distance). At each lambda the lower point is pass@1."""
    glyphs, words, paths = load(d, f)
    s = open(os.path.join(d, f + '.svg')).read()
    raw = re.findall(r'<path([^>]*)/>', s[s.index('</defs>'):])
    caps = [p for p, a in zip(paths, raw) if 'fill-opacity=".75"' in a and len(p['pts']) == 2]
    names = ['Countdown-3 forward', 'Countdown-3 reverse', 'Countdown-4E forward', 'Countdown-4E reverse']
    out = []
    PP = panels(paths)[:4]
    for i, rect in enumerate(PP):
        fy, ry = axis(paths, words, PP[i - i % 2], 'y'); fx, rx = axis(paths, words, rect, 'x')   # right panel of each pair shares the left one's y axis
        byx = {}
        for c in caps:
            (ax, ay), (bx, by) = c['pts']; xc = (ax + bx) / 2
            if rect[0] <= xc <= rect[2]: byx.setdefault(round(xc, 2), []).append(ay)
        rows = []
        for xc in sorted(byx):
            ys = sorted(byx[xc], reverse=True)          # screen y down: largest y = lowest value
            if len(ys) != 4: rows.append([round(fx(xc), 3), None, None, None, None]); continue
            p1 = ((fy(ys[0]) + fy(ys[1])) / 2, abs(fy(ys[0]) - fy(ys[1])) / 2)
            p10 = ((fy(ys[2]) + fy(ys[3])) / 2, abs(fy(ys[2]) - fy(ys[3])) / 2)
            rows.append([round(fx(xc), 3), round(p1[0], 2), round(p1[1], 2), round(p10[0], 2), round(p10[1], 2)])
        out.append({'panel': names[i], 'tick_residual': [round(rx, 6), round(ry, 6)], 'rows_lambda_p1_sem_p10_sem': rows})
    return out


def fig6(d, f):
    """Figure 6 / 26: RLVR training reward on Countdown-4 per distillation seed (three curves per panel).
    Panels: top row OffPD and OnPD forward KL, bottom row OffPD and OnPD reverse KL. y ticks sit on the left
    column, x ticks on the bottom row. Reports each curve's first, peak, last value and mean of the last 50 steps."""
    glyphs, words, paths = load(d, f)
    P = panels(paths)                      # sorted by x then y: TL, BL, TR, BR
    TL, BL, TR, BR = P[:4]
    names = {TL: 'OffPD F-KL', TR: 'OnPD F-KL', BL: 'OffPD R-KL', BR: 'OnPD R-KL'}
    yref = {TL: TL, TR: TL, BL: BL, BR: BL}; xref = {TL: BL, BL: BL, TR: BR, BR: BR}
    out = []
    for rect in (TL, TR, BL, BR):
        fy, ry = axis(paths, words, yref[rect], 'y')
        fx0, rx = axis(paths, words, xref[rect], 'x')
        fx = lambda x, r=rect, ref=xref[rect]: fx0(x)   # same column, same x mapping
        curves = []
        for p in paths:
            if p['stroke'] and p['stroke'] not in ('#4a4a4a', '#d8dee8') and abs(p['sw'] - 2.0) < 1e-6 and len(p['pts']) > 10:
                xs = [x for x, y in p['pts']]; ys = [y for x, y in p['pts']]
                if rect[0] - 1 <= min(xs) and max(xs) <= rect[2] + 1 and rect[1] - 1 <= min(ys) and max(ys) <= rect[3] + 1:
                    pts = [(fx(x), fy(y)) for x, y in p['pts']]
                    tail = [v for st, v in pts if st >= pts[-1][0] - 50]
                    curves.append({'colour': p['stroke'], 'first': round(pts[0][1], 3), 'peak': round(max(v for st, v in pts), 3),
                                   'peak_step': round(max(pts, key=lambda q: q[1])[0]), 'last': round(pts[-1][1], 3),
                                   'last_step': round(pts[-1][0]), 'mean_last50': round(sum(tail) / len(tail), 3)})
        out.append({'panel': names[rect], 'tick_residual': [round(rx, 6), round(ry, 6)], 'curves': curves})
    return out


if __name__ == '__main__':
    d = sys.argv[1]
    figs = {
        'source': 'https://arxiv.org/html/2609.35259v1 (vector SVG figures, decoded by decode_figs.py)',
        'F3': series(d, '13_contrastive_lambda_three_seed_main_solid', 3,
                     ['Held-out ID accuracy (Countdown-3, %)', 'Change in OOD accuracy (points)', 'Update sparsity (%)']),
    }
    figs['F1'] = fig1(d)
    figs['F5'] = fig5(d, '14_contrastive_cd4_easy_passk_llama_maxlen4096_temp0p5_spectrum_fill_lr1e-05_seed_sem')
    figs['F6'] = fig6(d, '09_countdown4_downstream_rl_lr_1e-05')
    figs['F26'] = fig6(d, '09_countdown4_downstream_rl_lr_5e-05')
    json.dump(figs, open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'inputs', 'figs.json'), 'w'), indent=1)
    for k in ('F6', 'F26'):
        for p in figs[k]: print(k, p['panel'], p['tick_residual']); [print('  ', c) for c in p['curves']]
    for p in figs['F5']: print(p['panel'], p['tick_residual']); [print('  ', r) for r in p['rows_lambda_p1_sem_p10_sem']]
    for p in figs['F3']:
        print(p['panel'], p['tick_residual_y'], p['tick_residual_x'])
        for k, v in p.items():
            if isinstance(v, list): print(' ', k, [r[1] for r in v], [r[2] for r in v])
