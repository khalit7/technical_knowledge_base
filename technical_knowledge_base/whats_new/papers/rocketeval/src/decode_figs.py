"""Figures 4 and 5 of RocketEval read from the vector PDFs in the arXiv source (no curve is read by eye).

  curl -sL https://arxiv.org/e-print/2503.05142v1 -o /tmp/re.tgz && mkdir -p /tmp/resrc && tar xzf /tmp/re.tgz -C /tmp/resrc
  python3 decode_figs.py /tmp/resrc/Figure            writes inputs/fig4_fig5.json

Each bar is a filled rectangle (m l l l h B) whose top edge is the value. The y axis is calibrated on the figure's
own gridlines (0.0 at y = 48.78, 0.2 at y = 73.46, ...), so a value is (top - y0) / (y02 - y0) * 0.2. The series
of a bar is its fill colour; the colour of each legend patch is matched to the legend text printed beside it.
"""
import json, os, re, sys, zlib
D = sys.argv[1]
HERE = os.path.dirname(os.path.abspath(__file__))

def stream(fn):
    d = open(os.path.join(D, fn), 'rb').read()
    out = []
    for m in re.finditer(rb'stream\r?\n(.*?)endstream', d, re.S):
        try: out.append(zlib.decompress(m.group(1)).decode('latin1'))
        except Exception: pass
    return '\n'.join(out)

NUM = r'(-?[\d.]+)'
def decode(fn):
    s = stream(fn)
    # gridlines: horizontal stroked lines across the plot, with the tick label printed just after
    grid = [(float(y), float(lab)) for y, lab in re.findall(r'53\.37 ' + NUM + r' m\s+419\.04 [\d.]+ l\s+S\s+Q q\s+q\s+1 0 -0 1 [\d.]+ [\d.]+ cm\s+BT\s+/F1 11 Tf\s+0 0 Td\s+\[ \(([\d.]+)\) \] TJ', s)]
    (y0, v0), (y1, v1) = grid[0], grid[1]
    val = lambda y: v0 + (y - y0) * (v1 - v0) / (y1 - y0)
    # filled rectangles with their fill colour
    rects = []
    for col, x1, ya, x2, yb in re.findall(r'([\d.]+ [\d.]+ [\d.]+) rg\s+(?:0 j 1 G [\d. ]+ rg\s+)?' + NUM + ' ' + NUM + r' m\s+' + NUM + r' [\d.]+ l\s+[\d.]+ ' + NUM + r' l', s):
        rects.append((col, float(x1), float(x2), float(ya), float(yb)))
    # legend: each label (font size 10) follows the fill colour of its patch; take the last colour set before it
    names = {}
    for m in re.finditer(r'/F1 10 Tf\s+0 0 Td\s+\[ \(([^)]*)\) \] TJ', s):
        cols = re.findall(r'([\d.]+)\s+([\d.]+)\s+([\d.]+) rg\s+(?:0 j )?1 G', s[:m.start()])
        names[' '.join(cols[-1])] = m.group(1)
    bars = [r for r in rects if abs(r[3] - y0) < 1e-6]
    ticks = [(float(x), int(t)) for x, t in re.findall(r'1 0 -0 1 ' + NUM + r' 30\.9[\d]+ cm\s+BT\s+/F1 11 Tf\s+0 0 Td\s+\[ \((\d)\) \] TJ', s)]
    series = {}
    for col, x1, x2, ya, yb in bars:
        cx = (x1 + x2) / 2
        tick = min(ticks, key=lambda t: abs(t[0] - cx))[1]
        series.setdefault(names.get(col, col), {})[tick] = round(val(max(ya, yb)), 4)
    return {k: [v[t] for t in sorted(v)] for k, v in series.items()}, grid

out = {'source': 'arXiv e-print 2503.05142v1, Figure/Motivation_Sampling.pdf (Figure 4) and Figure/Motivation_Disagreement.pdf (Figure 5); bar tops calibrated on the printed gridlines',
       'fig4_sampling': None, 'fig5_position': None}
out['fig4_sampling'], g4 = decode('Motivation_Sampling.pdf')
out['fig5_position'], g5 = decode('Motivation_Disagreement.pdf')
out['gridlines'] = g4
json.dump(out, open(os.path.join(HERE, 'inputs', 'fig4_fig5.json'), 'w'), indent=1)
print(json.dumps(out, indent=1))
