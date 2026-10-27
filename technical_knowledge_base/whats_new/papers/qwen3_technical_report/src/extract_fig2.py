"""Read Figure 2 (thinking budget, Qwen3-235B-A22B) exactly from the arXiv HTML's vector SVG.
usage: curl -sL https://arxiv.org/html/2505.09388v1/thinking_budget.svg -o tb.svg; python3 extract_fig2.py tb.svg
Each panel is one matplotlib axes with its own transform. The y scale is calibrated on the panel's own
horizontal gridlines, whose tick labels (glyph outlines in the SVG, read once from a rendering of it) are
listed in TICKS; x positions are the six vertical gridlines, labelled 1, 2, 4, 8, 16, 32 K tokens.
The blue polyline holds the thinking-mode points; the red dashed line is the non-thinking score.
Writes inputs/fig2.json."""
import json, re, sys
s = open(sys.argv[1]).read()
PANELS = {  # transform translation -> (name, tick values of the horizontal gridlines from bottom to top)
    (0.5999951, 210.8): ('AIME24', [40, 50, 60, 70, 80]),
    (301.2546, 210.8): ('AIME25', [30, 40, 50, 60, 70, 80]),
    (0.5999951, 398.87275): ('LCB', [40, 50, 60]),
    (301.2546, 399.96363): ('GPQA', [64, 66, 68, 70, 72]),
}
grid = {}; blue = {}; red = {}; vx = {}
for m in re.finditer(r'<path ([^>]*)/>', s):
    a = m.group(1)
    st = re.search(r'stroke="([^"]*)"', a)
    if not st: continue
    tr = [float(x) for x in re.search(r'matrix\(([^)]*)\)', a).group(1).split(',')]
    key = (round(tr[4], 7), round(tr[5], 5))
    if key not in PANELS: continue
    d = re.search(r' d="([^"]*)"', a).group(1)
    if st.group(1) == '#b0b0b0':
        h = re.fullmatch(r'M37\.45 ([\d.]+)H310\.085', d)
        v = re.fullmatch(r'M([\d.]+) [\d.]+V[\d.]+', d)
        if h: grid.setdefault(key, []).append(float(h.group(1)))
        elif v: vx.setdefault(key, []).append(float(v.group(1)))
    elif st.group(1) == '#1f77b4' and d.startswith('M49.8425'):
        nums = [float(x) for x in re.findall(r'[\d.]+', d)]
        blue[key] = list(zip(nums[0::2], nums[1::2]))
    elif st.group(1) == '#ff0000' and d.startswith('M37.45'):
        red[key] = float(re.match(r'M37\.45 ([\d.]+)', d).group(1))
out = {'_source': 'https://arxiv.org/html/2505.09388v1#S4.F2 (thinking_budget.svg), read by extract_fig2.py',
       'budget_k': [1, 2, 4, 8, 16, 32]}
for key, (name, ticks) in PANELS.items():
    g = sorted(grid[key]); assert len(g) == len(ticks), (name, g)
    step = (g[-1] - g[0]) / (len(g) - 1); unit = (ticks[-1] - ticks[0]) / (len(g) - 1)
    resid = max(abs(g[i] - (g[0] + i * step)) for i in range(len(g)))
    val = lambda y: ticks[0] + (y - g[0]) / step * unit
    xs = sorted(vx[key]); pts = blue[key]
    assert [round(p[0], 3) for p in pts] == [round(x, 3) for x in xs]
    out[name] = {'thinking': [round(val(y), 2) for _, y in pts], 'non_thinking': round(val(red[key]), 2),
                 'grid_residual_points': round(resid / step * unit, 4)}
json.dump(out, open('inputs/fig2.json', 'w'), indent=1)
print(json.dumps(out, indent=1))
