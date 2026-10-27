"""Decode the paper's figures from the vector SVGs in its arXiv HTML into numbers (inputs/figs.json).

The arXiv HTML of 2203.02155v1 embeds every results chart as an SVG whose glyphs carry their characters
(data-text), so axis ticks and labels can be read exactly and every bar, point and error bar is a path with
exact coordinates. Values are recovered by a linear (or log) fit of tick positions to tick labels, so they are
exact up to the SVG's own coordinate precision (about 1e-5 pt, far below the third decimal). This is
transcription of vector geometry, not reading curves off a raster image.

  mkdir -p /tmp/igsvg && for f in main-graph-no-facets pref-facetted metadata flan-t0-lik tqa-twobars-human \
     long-toxicity academic-evals-v-pretrain-loss academic-evals-v-kl likert-v-kl-rew-coef; do \
     curl -sL https://arxiv.org/html/2203.02155v1/$f.svg -o /tmp/igsvg/$f.svg; done
  python3 decode_figs.py /tmp/igsvg
"""
import json, math, os, re, sys
import svgparse

NUM = re.compile(r'^-?\d+(\.\d+)?(e-?\d+)?$')
COL = {'#71c1d1': 'GPT', '#99ccff': 'GPT (prompted)', '#7dba88': 'SFT', '#f2b35a': 'PPO', '#c8553d': 'PPO-ptx', '#bf82aa': 'FLAN', '#9d7560': 'T0'}


def load(d, f):
    H, glyphs, paths = svgparse.parse(os.path.join(d, f + '.svg'))
    return H, svgparse.words(glyphs), paths


def panels(H, words, paths):
    """White panel rectangles (not the page background, not a legend box)."""
    out = []
    for p in paths:
        if p['fill'] == '#ffffff' and len(p['pts']) == 4 and p['stroke'] is None:
            xs = [q[0] for q in p['pts']]; ys = [q[1] for q in p['pts']]
            r = (min(xs), min(ys), max(xs), max(ys))
            if r[0] < 1 and r[1] < 1: continue
            out.append(r)
    return out


def ticks(paths, words, rect, axis):
    """(pixel, value) pairs for the y (axis='y') or x ticks of a panel, read from the tick marks and their labels."""
    x0, y0, x1, y1 = rect
    marks = []
    for p in paths:
        if p['fill'] == '#333333' and len(p['pts']) == 2:
            (ax, ay), (bx, by) = p['pts']
            if axis == 'y' and abs(ay - by) < 1e-6 and abs(max(ax, bx) - x0) < 0.6 and y0 - 1 <= ay <= y1 + 1: marks.append(ay)
            if axis == 'x' and abs(ax - bx) < 1e-6 and abs(min(ay, by) - y1) < 0.6 and x0 - 1 <= ax <= x1 + 1: marks.append(ax)
    pairs = []
    for m in marks:
        best = None
        for w in words:
            if w['rot'] or not NUM.match(w['t']): continue
            if axis == 'y':
                if w['x'] > x0 or w['x'] < x0 - 60: continue
                dist = abs(w['y'] - w['s'] * 0.25 - m)
            else:
                if w['y'] < y1 or w['y'] > y1 + 25: continue
                dist = abs(w['x'] + len(w['t']) * w['s'] * 0.28 - m)
            if best is None or dist < best[0]: best = (dist, float(w['t']))
        if best and best[0] < 6: pairs.append((m, best[1]))
    pairs = sorted(pairs)
    if axis == 'y':  # a minus sign drawn as a bare path is lost: values below the zero tick must be negative
        z = [p for p, v in pairs if v == 0]
        if z: pairs = [(p, -abs(v) if p > z[0] else v) for p, v in pairs]
        elif len(pairs) > 1 and all(pairs[i][1] < pairs[i + 1][1] for i in range(len(pairs) - 1)):
            pairs = [(p, -v) for p, v in pairs]  # every label lost its minus sign (values grow downwards)
    return pairs


def fit(pairs, log=False):
    if len(pairs) < 2: return None
    xs = [p for p, _ in pairs]; ys = [math.log10(v) if log else v for _, v in pairs]
    n = len(xs); mx = sum(xs) / n; my = sum(ys) / n
    b = sum((x - mx) * (y - my) for x, y in zip(xs, ys)) / sum((x - mx) ** 2 for x in xs)
    a = my - b * mx
    res = max(abs(a + b * x - y) for x, y in zip(xs, ys))
    f = (lambda px: 10 ** (a + b * px)) if log else (lambda px: a + b * px)
    f.res = res
    return f


def inside(pt, r, pad=0.5):
    return r[0] - pad <= pt[0] <= r[2] + pad and r[1] - pad <= pt[1] <= r[3] + pad


def bars(paths, rect, fy):
    out = []
    for p in paths:
        if p['fill'] in COL or p['fill'] == '#ececec':
            if len(p['pts']) != 4: continue
            xs = [q[0] for q in p['pts']]; ys = [q[1] for q in p['pts']]
            if not inside((sum(xs) / 4, sum(ys) / 4), rect): continue
            out.append({'c': p['fill'], 'x0': min(xs), 'x1': max(xs), 'v': fy(min(ys)), 'base': fy(max(ys))})
    return sorted(out, key=lambda b: b['x0'])


def vsegs(paths, rect, color=None):
    out = []
    for p in paths:
        if len(p['pts']) == 2 and p['stroke'] and p['fill'] in (None, 'none') and (color is None or p['stroke'] == color):
            (ax, ay), (bx, by) = p['pts']
            if abs(ax - bx) < 1e-6 and abs(ay - by) > 1e-9 and inside((ax, (ay + by) / 2), rect):
                out.append((ax, min(ay, by), max(ay, by), p['stroke']))
    return out


def attach_err(bs, segs, fy):
    for b in bs:
        for (x, ya, yb, c) in segs:
            if b['x0'] - 0.5 <= x <= b['x1'] + 0.5 and c == '#000000':
                b['hi'] = fy(ya); b['lo'] = fy(yb)
    return bs


def series(paths, rect, fy, fx=None, xlab=None):
    """Lines (stroke width over 2) with their points, and coloured error bars at the same x."""
    out = {}
    for p in paths:
        if p['stroke'] and p['stroke'] not in ('#000000', '#333333', '#ffffff', '#dddddd', '#1f77b4') and not p['curve'] and len(p['pts']) >= 3 and all(inside(q, rect, 2) for q in p['pts']):
            out.setdefault(p['stroke'], []).append([q for q in p['pts']])
    res = {}
    segs = vsegs(paths, rect)
    for c, lines in out.items():
        pts = sorted({q for l in lines for q in l})
        rows = []
        for x, y in pts:
            r = {'px': x, 'v': fy(y)}
            if fx: r['x'] = fx(x)
            if xlab: r['x'] = min(xlab, key=lambda t: abs(t[0] - x))[1]
            for (sx, ya, yb, sc) in segs:
                if sc == c and abs(sx - x) < 0.01 and ya - 0.01 <= y <= yb + 0.01: r['hi'] = fy(ya); r['lo'] = fy(yb)
            rows.append(r)
        res[c] = rows
    return res


def r3(v): return None if v is None else round(v, 4)


def clean(o):
    if isinstance(o, float): return round(o, 4)
    if isinstance(o, dict): return {k: clean(v) for k, v in o.items() if k not in ('px', 'x0', 'x1', 'base')}
    if isinstance(o, list): return [clean(v) for v in o]
    return o


def text_labels(words, rect, below=True):
    x0, y0, x1, y1 = rect
    return [(w['x'], w['t']) for w in words if not w['rot'] and (y1 < w['y'] < y1 + 20 if below else False)]


def main(d):
    F = {}
    # Figure 1: win rate against SFT 175B by model size
    H, W, P = load(d, 'main-graph-no-facets')
    r = panels(H, W, P)[0]
    fy = fit(ticks(P, W, r, 'y'))
    xl = [(x + 12, t) for x, t in text_labels(W, r) if t.endswith('B')]
    s = series(P, r, fy, xlab=[(x, t) for x, t in xl])
    F['fig1'] = {'src': 'S0.F1', 'what': 'Win rate against SFT 175B, API prompt distribution (InstructGPT prompts), training labelers; 95% CI', 'fit_res': fy.res,
                 'series': {COL[c]: clean(v) for c, v in s.items()}}
    # Figure 3: facetted (rows: held-out workers, training workers; cols: GPT distribution, Instruct distribution)
    H, W, P = load(d, 'pref-facetted')
    ps = sorted(panels(H, W, P), key=lambda r: (round(r[1]), r[0]))
    ps = [p for p in ps if p[3] < 300]
    out = {}
    names = {(0, 0): 'heldout_gptdist', (0, 1): 'heldout_instructdist', (1, 0): 'training_gptdist', (1, 1): 'training_instructdist'}
    rows = sorted({round(p[1]) for p in ps})
    for p in ps:
        ri = rows.index(round(p[1])); ci = 0 if p[0] < 240 else 1
        left = [q for q in ps if round(q[1]) == round(p[1]) and q[0] < 240][0]
        fy = fit(ticks(P, W, left, 'y'))
        xs = [w for w in W if not w['rot'] and w['t'] in ('1.3B', '6B', '175B', '175B1.3B')]
        lab = []
        for w in xs:
            if w['t'] == '175B1.3B': lab += [(w['x'] + 12, '175B'), (w['x'] + 12 + 22, '1.3B')]
            else: lab.append((w['x'] + len(w['t']) * 3.5, w['t']))
        lab = [(x, t) for x, t in lab if p[0] - 5 <= x <= p[2] + 5]
        s = series(P, p, fy, xlab=lab)
        out[names[(ri, ci)]] = {COL[c]: clean(v) for c, v in s.items()}
    F['fig3'] = {'src': 'S3.F3', 'what': 'Win rate against SFT 175B; rows: held-out and training labelers; columns: prompts submitted to GPT-3 and to InstructGPT', 'panels': out}
    # Figure 4: metadata prevalence, collapsed across sizes
    H, W, P = load(d, 'metadata')
    ps = sorted(panels(H, W, P))
    titles = ['Attempts correct instruction', 'Follows explicit constraints', 'Hallucinations', 'Uses language appropriate for customer assistant']
    out = {}
    for i, p in enumerate(ps):
        fy = fit(ticks(P, W, p, 'y'))
        bs = attach_err(bars(P, p, fy), vsegs(P, p, '#000000'), fy)
        out[titles[i]] = {COL[b['c']]: clean({'v': b['v'], 'lo': b.get('lo'), 'hi': b.get('hi')}) for b in bs}
    F['fig4'] = {'src': 'S4.F4', 'what': 'Prevalence of each metadata label on the API distribution, all model sizes pooled; 95% CI', 'panels': out}
    # Figure 30: metadata by model size (panels: correct instruction, appropriate; constraints, hallucinations)
    H, W, P = load(d, 'metadata-with-model-size')
    ps = sorted([p for p in panels(H, W, P) if p[2] < 440], key=lambda r: (round(r[1]), r[0]))
    titles = ['Attempts correct instruction', 'Appropriate for customer assistant', 'Follows explicit constraints', 'Hallucinations']
    out = {}
    for t, p in zip(titles, ps):
        fy = fit(ticks(P, W, p, 'y'))
        lab = [(w['x'] + len(w['t']) * 3.3, w['t']) for w in W if w['t'] in ('1.3B', '6B', '175B') and p[0] - 5 <= w['x'] <= p[2] and abs(w['y'] - p[3]) < 25]
        s_ = series(P, p, fy, xlab=lab)
        out[t] = {COL[c]: clean(v) for c, v in s_.items()}
    F['fig30'] = {'src': 'A5.F30', 'what': 'Metadata prevalence by model size; 95% CI', 'panels': out}
    # Figure 5: Likert by model, FLAN and T0
    H, W, P = load(d, 'flan-t0-lik')
    p = panels(H, W, P)[0]; fy = fit(ticks(P, W, p, 'y'))
    bs = attach_err(bars(P, p, fy), vsegs(P, p, '#000000'), fy)
    F['fig5'] = {'src': 'S4.F5', 'what': 'Likert score 1 to 7, InstructGPT prompt distribution, 175B', 'bars': {COL[b['c']]: clean({'v': b['v'], 'lo': b.get('lo'), 'hi': b.get('hi')}) for b in bs}}
    # Figure 6: TruthfulQA, grey = truthful, colour = truthful and informative; three sizes per model
    H, W, P = load(d, 'tqa-twobars-human')
    ps = sorted(panels(H, W, P))
    out = {}
    for name, p in zip(['QA prompt', 'Instruction + QA prompt'], ps):
        fy = fit(ticks(P, W, ps[0], 'y'))
        bs = bars(P, p, fy)
        segs = vsegs(P, p, '#000000')
        grey = [b for b in bs if b['c'] == '#ececec']; col = [b for b in bs if b['c'] != '#ececec']
        attach_err(grey, segs, fy)
        # colored bars sit inside the grey bars; errorbars: the 2 nearest segments at the same x, the shorter span is ambiguous, keep both
        res = {}
        for g in grey:
            c = [b for b in col if b['x0'] >= g['x0'] - 0.5 and b['x1'] <= g['x1'] + 0.5][0]
            ss = sorted([sg for sg in segs if g['x0'] - .5 <= sg[0] <= g['x1'] + .5], key=lambda sg: sg[1])
            res.setdefault(COL[c['c']], []).append(clean({'truthful': g['v'], 'true_info': c['v'], 'segs': [[fy(a), fy(b)] for _, a, b, _ in ss], 'x0': g['x0']}))
        out[name] = res
    F['fig6'] = {'src': 'S4.F6', 'what': 'TruthfulQA human evaluation, percentage; per model the three bars are 1.3B, 6B, 175B left to right', 'panels': out}
    # Figure 7: RealToxicityPrompts, human eval and Perspective API, 175B
    H, W, P = load(d, 'long-toxicity')
    ps = sorted([p for p in panels(H, W, P) if p[3] - p[1] > 200])
    out = {}
    for name, p in zip(['Human eval', 'PerspectiveAPI score'], ps):
        fy = fit(ticks(P, W, ps[0], 'y'))
        bs = attach_err(bars(P, p, fy), vsegs(P, p, '#000000'), fy)
        mid = (p[0] + p[2]) / 2
        out[name] = {'None' if b['x0'] < mid else 'Respectful': {} for b in bs}
        for b in bs:
            out[name]['None' if b['x0'] < mid else 'Respectful'][COL[b['c']]] = clean({'v': b['v'], 'lo': b.get('lo'), 'hi': b.get('hi')})
    F['fig7'] = {'src': 'S4.F7', 'what': 'RealToxicityPrompts, 175B models, 1,729 prompts; toxicity by prompt type', 'panels': out}
    # Figures 33, 34: DROP and SQuAD v2 F1 and validation reward against pretraining loss coefficient / KL coefficient (log x)
    for key, f, src in (('fig33', 'academic-evals-v-pretrain-loss', 'A5.F33'), ('fig34', 'academic-evals-v-kl', 'A5.F34')):
        H, W, P = load(d, f)
        ps = sorted([p for p in panels(H, W, P) if p[3] - p[1] > 120])
        out = {}
        for name, p in zip(['F1', 'Validation reward'], ps):
            fy = fit(ticks(P, W, p, 'y')); fx = fit(ticks(P, W, p, 'x'), log=True)
            s = series(P, p, fy, fx=fx)
            # horizontal reference lines (GPT baselines) drawn as dashed 2-point lines
            refs = []
            for q in P:
                if len(q['pts']) == 2 and q['stroke'] and q['stroke'] != '#000000' and q['sw'] < 2:
                    (ax, ay), (bx, by) = q['pts']
                    if abs(ay - by) < 1e-6 and inside(((ax + bx) / 2, ay), p) and abs(ax - bx) > 50: refs.append((q['stroke'], round(fy(ay), 3)))
            out[name] = {'series': {c: clean(v) for c, v in s.items()}, 'refs': refs, 'fit_res': [fy.res, fx.res]}
        leg = {}
        for q in P:
            if q['fill'] in ('#db5f57', '#57db5f', '#5f57db') and len(q['pts']) > 4:
                pass
        F[key] = {'src': src, 'panels': out, 'words': [w['t'] for w in W]}
    # Figure 36: Likert against KL reward coefficient
    H, W, P = load(d, 'likert-v-kl-rew-coef')
    p = panels(H, W, P)[0]
    fy = fit(ticks(P, W, p, 'y')); fx = fit(ticks(P, W, p, 'x'), log=True)
    pts = []
    for q in P:
        if len(q['pts']) == 9 and q['stroke'] is None:
            cx = sum(a for a, _ in q['pts'][:8]) / 8; cy = sum(b for _, b in q['pts'][:8]) / 8
            if inside((cx, cy), p): pts.append((cx, cy))
    segs = vsegs(P, p, '#000000')
    rows = []
    for cx, cy in sorted(pts):
        r = {'x': fx(cx), 'v': fy(cy)}
        for (sx, ya, yb, _) in segs:
            if abs(sx - cx) < 0.05 and ya - 0.01 <= cy <= yb + 0.01: r['hi'] = fy(ya); r['lo'] = fy(yb)
        rows.append(clean(r))
    refs = [round(fy(q['pts'][0][1]), 4) for q in P if q['stroke'] == '#99ccff' and len(q['pts']) == 2]
    F['fig36'] = {'src': 'A5.F36', 'what': 'Likert score against KL reward coefficient (log x); blue line: coefficient 0', 'points': rows, 'zero_line': refs}
    json.dump(F, open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'inputs', 'figs.json'), 'w'), indent=1)
    print('wrote inputs/figs.json')


if __name__ == '__main__':
    main(sys.argv[1])
