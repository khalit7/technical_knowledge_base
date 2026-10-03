"""Read the data of the paper's figures from the vector paths of the arXiv HTML's SVG files (matplotlib output).
Each panel is calibrated on its own tick marks, whose printed values are listed below (read off the rendered figure);
a value is then a linear map of the path coordinate between ticks. Lines are the stroke-width 1.5 polylines inside the
panel's axes box (legend samples sit outside and are dropped); bars are the filled rectangles.
A point drawn above the top of the axes is where the clipped line leaves the plot (not a measured point): it is kept
with its coordinate value and a third element 1, so a crossing below the top can still be interpolated along that segment.
usage: python3 extract_figs.py <dir with the downloaded SVGs>   (they come from https://arxiv.org/html/2309.06180v1/<name>.svg)
writes inputs/figs.json"""
import json, re, sys
D = sys.argv[1]
NUM = re.compile(r'-?\d*\.?\d+(?:e-?\d+)?')

def parse_d(d):
    """M/L/H/V absolute polylines (matplotlib writes implicit L after M) -> list of (x, y)."""
    pts, cmd, x, y, pend = [], 'M', 0.0, 0.0, None
    for tok in re.findall(r'[MLHVZC]|-?\d*\.?\d+(?:e-?\d+)?', d):
        if tok in 'MLHVZC':
            cmd = tok; continue
        v = float(tok)
        if cmd in 'ML':
            if pend is None: pend = v; continue
            x, y, pend = pend, v, None; pts.append((x, y))
        elif cmd == 'H': x = v; pts.append((x, y))
        elif cmd == 'V': y = v; pts.append((x, y))
    return pts

def elements(name):
    s = open('%s/%s.svg' % (D, name)).read()
    s = re.sub(r'<clipPath.*?</clipPath>', '', s, flags=re.S)
    H = float(re.search(r'viewBox="0 0 [\d.]+ ([\d.]+)"', s).group(1))
    out = []
    for m in re.finditer(r'<path ([^>]*)/>', s):
        a = m.group(1)
        if 'id="font_' in a: continue
        tr = re.search(r'transform="matrix\(1,0,0,-1,([-\d.e]+),([-\d.e]+)\)"', a)
        if not tr: continue
        dx, dy = float(tr.group(1)), float(tr.group(2))
        d = re.search(r' d="([^"]*)"', a).group(1)
        if 'C' in d: continue
        g = lambda k: (re.search(k + r'="([^"]*)"', a) or [None, None])[1]
        # transform: X = x + dx, Y_svg = dy - y; we keep the upward coordinate H - Y_svg
        out.append(dict(stroke=g('stroke'), fill=g('fill'), sw=g('stroke-width'), cap=g('stroke-linecap'), d=d, dx=dx, dy=dy, pts=[(dx + px, py + (H - dy)) for px, py in parse_d(d)]))
    return out, H

def panels(els):
    """axes boxes: the four square-cap black spines; return sorted list of (x0, x1, y0, y1)."""
    sp = [e for e in els if e['stroke'] == '#000000' and e['cap'] == 'square' and len(e['pts']) == 2]
    xs = {}
    for e in sp:
        (a, b), (c, d) = e['pts']
        if abs(a - c) < 1e-6:  # vertical spine
            xs.setdefault((round(b, 3), round(d, 3)), []).append(a)
    boxes = []
    for (y0, y1), v in xs.items():
        v = sorted(v)
        for i in range(0, len(v) - 1, 2):
            boxes.append((v[i], v[i + 1], min(y0, y1), max(y0, y1)))
    return sorted(boxes)

def ticks(els, box):
    x0, x1, y0, y1 = box
    tx, ty = [], []
    for e in els:
        if e['stroke'] != '#000000' or e['cap'] != 'butt' or len(e['pts']) != 2: continue
        (a, b), (c, d) = e['pts']
        if abs(a - c) < 1e-6 and abs(abs(b - d) - 3.5) < 0.6 and abs(max(b, d) - y0) < 0.01 and x0 - 0.5 <= a <= x1 + 0.5: tx.append(a)
        if abs(b - d) < 1e-6 and abs(abs(a - c) - 3.5) < 0.6 and abs(max(a, c) - x0) < 0.01 and y0 - 0.5 <= b <= y1 + 0.5: ty.append(b)
    return sorted(set(round(t, 4) for t in tx)), sorted(set(round(t, 4) for t in ty))

def lin(pos, vals):
    """least-squares line through (pos, val); returns f and the worst tick residual."""
    n = len(pos); mx = sum(pos) / n; my = sum(vals) / n
    k = sum((p - mx) * (v - my) for p, v in zip(pos, vals)) / sum((p - mx) ** 2 for p in pos)
    f = lambda p: my + k * (p - mx)
    return f, max(abs(f(p) - v) for p, v in zip(pos, vals))

COLORS = {'#808080': 'FasterTransformer', '#ff0000': 'Orca (Max)', '#ffa500': 'Orca (Pow2)', '#008000': 'Orca (Oracle)', '#0000ff': 'vLLM'}

def lines(name, xt, yt, colors=COLORS, catx=None, ylog=False):
    els, H = elements(name)
    res = []
    for i, box in enumerate(panels(els)):
        tx, ty = ticks(els, box)
        xv, yv = xt[i] if isinstance(xt[0], list) else xt, yt[i] if isinstance(yt[0], list) else yt
        assert len(tx) == len(xv) and len(ty) == len(yv), (name, i, tx, ty)
        fx, ex = lin(tx, list(range(len(xv))) if catx else xv)
        fy, ey = lin(ty, yv)
        ser = {}
        for e in els:
            if e['sw'] not in ('1', '1.5', '2') or e['cap'] != 'square' or e['stroke'] not in colors: continue
            p = [q for q in e['pts'] if box[0] - 1 <= q[0] <= box[1] + 1]
            if len(p) < 2 or not any(box[2] - 1 <= y <= box[3] + 1 for _, y in p): continue
            if len(p) <= 3 and len(set(round(y, 3) for _, y in p)) == 1: continue  # legend sample
            pts = []
            for x, y in p:
                X = fx(x); X = catx[round(X)] if catx else round(X, 4)
                pts.append([X, round(fy(y), 4)] + ([] if y <= box[3] + 0.01 else [1]))
            ser.setdefault(colors[e['stroke']], []).append(pts)
        res.append(dict(series=ser, tick_residual_x=ex, tick_residual_y=ey))
    return res

def hist(name, xt, yt, colors):
    els, H = elements(name)
    box = panels(els)[0]
    tx, ty = ticks(els, box)
    fx, ex = lin(tx, xt); fy, ey = lin(ty, yt)
    out = {}
    for e in els:
        if e['fill'] not in colors or len(e['pts']) != 4: continue
        xs = [p[0] for p in e['pts']]; ys = [p[1] for p in e['pts']]
        if abs(min(ys) - box[2]) > 0.01: continue  # legend patch, not a bar
        out.setdefault(colors[e['fill']], []).append([round(fx(min(xs)), 3), round(fx(max(xs)), 3), fy(max(ys)) - fy(min(ys))])
    for k in out:
        b = sorted(out[k]); out[k] = b
    return dict(bins=out, tick_residual_x=ex, tick_residual_y=ey)

def bars(name, yt, fills):
    els, H = elements(name)
    box = panels(els)[0]
    tx, ty = ticks(els, box)
    fy, ey = lin(ty, yt)
    out = []
    for e in els:
        if e['fill'] not in fills or len(e['pts']) != 4: continue
        xs = [p[0] for p in e['pts']]; ys = [p[1] for p in e['pts']]
        if max(ys) > box[3] + 0.01: continue  # legend patch above the axes
        out.append([min(xs), fills[e['fill']], round(fy(min(ys)), 3), round(fy(max(ys)), 3)])
    return dict(bars=sorted(out), tick_residual_y=ey)

R = lambda a, b, s: [round(a + i * s, 6) for i in range(int(round((b - a) / s)) + 1)]
Y1 = [0, 0.5, 1.0]
BS = [1, 2, 4, 8, 16, 32, 64, 128, 256]
F = {}
F['fig12_sharegpt'] = lines('n1-sharegpt', [R(0, 2, .5), R(0, 1, .2), R(0, 2.5, .5)], Y1)
F['fig12_alpaca'] = lines('n1-alpaca', [R(0, 30, 10), R(0, 20, 5), R(0, 20, 5)], Y1)
F['fig14_parallel'] = lines('parallel', [R(0, 15, 5), R(0, 10, 2), R(0, 6, 2)], Y1)
F['fig14_beam'] = lines('beam', [R(0, 15, 5), R(0, 10, 2), R(0, 6, 2)], Y1)
F['fig16_prefix'] = lines('prefix', [R(0, 40, 20), R(0, 40, 20)], Y1)
F['fig17_chat'] = lines('chat-sharegpt', [R(0, .8, .2)], Y1)
F['fig18a_kernel'] = lines('micro_latency', [[64, 128, 256]], [R(0, 250, 50)], colors={'#1f77b4': 'vLLM', '#ff7f0e': 'FasterTransformer'})
F['fig18b_blocksize'] = lines('n1-block-size', [BS], [R(0, 17.5, 2.5)], colors={'#1f77b4': 'ShareGPT', '#ff7f0e': 'Alpaca'}, catx=BS)
F['fig19a_swap'] = lines('micro-swap', [BS], [R(0, 140, 20)], colors={'#1f77b4': 'Recompute', '#ff7f0e': 'Swap in', '#2ca02c': 'Swap out', '#d62728': 'Swap in + out'}, catx=BS)
F['fig19b_e2e'] = lines('recompute-vs-swap', [BS], [R(0, 2.5, .5)], colors={'#1f77b4': 'Recompute', '#d62728': 'Swap'}, catx=BS)
F['fig1_batch'] = lines('memory_batchsize', [R(0, 40, 10), R(0, 40, 10)], [[0, 400, 800, 1200], [20, 30, 40]], colors={'#ff7f0e': 'Existing systems', '#1f77b4': 'vLLM', '#2ca02c': 'Throughput'})
F['fig11_sharegpt'] = hist('sharegpt_hist', R(0, 2000, 500), R(0, .02, .005), {'#1f77b4': 'input', '#ff7f0e': 'output'})
F['fig11_alpaca'] = hist('alpaca_hist', R(0, 2000, 500), R(0, .08, .02), {'#1f77b4': 'input', '#ff7f0e': 'output'})
F['fig2_waste'] = bars('memory_breakdown', R(0, 100, 20), {'#6aa84f': 'token states', '#edae49': 'reservation', '#e63946': 'internal', '#c0c0c0': 'external'})
F['fig13_sharegpt'] = bars('batched_requests_sharegpt', R(0, 35, 5), {'#ff0000': 'Orca (Max)', '#ffa500': 'Orca (Pow2)', '#008000': 'Orca (Oracle)', '#0000ff': 'vLLM'})
F['fig13_alpaca'] = bars('batched_requests_alpaca', R(0, 150, 25), {'#ff0000': 'Orca (Max)', '#ffa500': 'Orca (Pow2)', '#008000': 'Orca (Oracle)', '#0000ff': 'vLLM'})
F['fig15_parallel'] = bars('mem_saving_parallel_gen', R(0, 12, 4), {'#1f77b4': 'saving'})
F['fig15_beam'] = bars('mem_saving_beam', R(0, 60, 20), {'#1f77b4': 'saving'})
json.dump(F, open('inputs/figs.json', 'w'), indent=0)
for k, v in F.items():
    if isinstance(v, list):
        print(k, [sorted((s, len(p[0])) for s, p in pan['series'].items()) for pan in v], 'resid', max(max(p['tick_residual_x'], p['tick_residual_y']) for p in v))
    else:
        print(k, {a: len(b) for a, b in v.get('bins', {}).items()} if 'bins' in v else [b[1:] for b in v['bars']])
