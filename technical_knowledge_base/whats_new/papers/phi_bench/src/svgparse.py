"""Read arXiv HTML vector SVG figures (one <use data-text> per glyph) into primitives (copied from the InstructGPT page).
Used by decode_figs.py. Coordinates are returned in screen space (y down), in SVG points."""
import re

def _mat(t):
    m = re.search(r'matrix\(([^)]*)\)', t or '')
    return [float(v) for v in re.split(r'[ ,]+', m.group(1).strip())] if m else [1, 0, 0, 1, 0, 0]

def _nums(d):
    return [float(v) for v in re.findall(r'-?\d*\.?\d+(?:e-?\d+)?', d)]

def parse(path):
    s = open(path).read()
    H = float(re.search(r'viewBox="0 0 [\d.]+ ([\d.]+)"', s).group(1))
    body = s[s.index('</defs>'):]
    glyphs, paths = [], []
    clip = None
    for m in re.finditer(r'<g clip-path="url\(#(clip_\d+)\)">|</g>|<use data-text="([^"]*)"[^>]*transform="([^"]*)"[^>]*/?>|<path([^>]*)/>', body):
        if m.group(1): clip = m.group(1); continue
        if m.group(0) == '</g>': clip = None; continue
        if m.group(3) is not None:
            a = _mat(m.group(3)); glyphs.append({'c': html_unescape(m.group(2)), 'x': a[4], 'y': a[5], 's': round((a[0] ** 2 + a[1] ** 2) ** .5, 3), 'rot': abs(a[1]) > 1e-6})
            continue
        attrs = m.group(4)
        g = lambda k: (re.search(r'\b' + k + r'="([^"]*)"', attrs) or [None, None])[1]
        a = _mat(g('transform'))
        d = g('d') or ''
        pts = []
        # absolute M/L/H/V/C commands only (what these files use); C control points are dropped
        cur = [0, 0]
        for cmd, args in re.findall(r'([MLHVCZ])([^MLHVCZ]*)', d):
            v = _nums(args)
            if cmd in 'ML':
                for i in range(0, len(v) - 1, 2): cur = [v[i], v[i + 1]]; pts.append(tuple(cur))
            elif cmd == 'H':
                for x in v: cur = [x, cur[1]]; pts.append(tuple(cur))
            elif cmd == 'V':
                for y in v: cur = [cur[0], y]; pts.append(tuple(cur))
            elif cmd == 'C':
                for i in range(4, len(v), 6): cur = [v[i], v[i + 1]]; pts.append(tuple(cur))
        sp = [(a[0] * x + a[2] * y + a[4], a[1] * x + a[3] * y + a[5]) for x, y in pts]
        paths.append({'fill': g('fill'), 'stroke': g('stroke'), 'sw': float(g('stroke-width') or 0), 'pts': sp, 'clip': clip, 'curve': 'C' in d})
    return H, glyphs, paths

def html_unescape(t):
    import html
    return html.unescape(t)

def words(glyphs, gap=0.9):
    """Group glyphs into strings: same baseline, size and orientation; split where the gap is wide."""
    from collections import defaultdict
    rows = defaultdict(list)
    for g in glyphs:
        key = (g['rot'], round(g['x'] if g['rot'] else g['y'], 1), round(g['s'], 2))
        rows[key].append(g)
    out = []
    for (rot, base, sz), gs in rows.items():
        gs.sort(key=lambda g: -g['y'] if rot else g['x'])
        cur = None
        for g in gs:
            pos = -g['y'] if rot else g['x']
            if cur and pos - cur['last'] <= max(sz, 1) * gap:
                cur['t'] += g['c']; cur['last'] = pos
            else:
                cur = {'t': g['c'], 'x': g['x'], 'y': g['y'], 's': sz, 'rot': rot, 'last': pos}; out.append(cur)
    for w in out: w['t'] = w['t'].strip(); w.pop('last')
    return [w for w in out if w['t']]
