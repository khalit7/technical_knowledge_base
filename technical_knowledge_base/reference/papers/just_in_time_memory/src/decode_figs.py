"""Decode the validation curves of Figures 5 and 6 (A2.F5, A2.F6) from the vector PDFs in the arXiv e-print.
usage: curl -sL https://arxiv.org/e-print/2609.27334v1 | tar xz -C $SCRATCH/src
       uv run --with pymupdf python decode_figs.py $SCRATCH/src/figures   (writes inputs/fig_curves.json)
Markers are the filled 8-segment paths; y is calibrated on the panel's horizontal gridlines, each matched to
its tick label; x is calibrated on the 0..100 step labels. Precision is about 0.001 of the axis unit."""
import json, sys, pymupdf as fitz
out = {}
for name, fig in (('alfworld', 'curves_alfworld_iter1_all.pdf'), ('webshop', 'curves_webshop_iter1_all.pdf')):
    p = fitz.open(sys.argv[1] + '/' + fig)[0]
    dr = p.get_drawings(); words = p.get_text('words')
    titles = [w for w in words if w[4] == 'Validation']
    panels = []
    for t in titles:
        line = sorted([w for w in words if abs(w[1] - t[1]) < 1 and w[0] >= t[0]], key=lambda w: w[0])
        tw = [line[0]]
        for w in line[1:]:
            if w[0] - tw[-1][2] > 8: break
            tw.append(w)
        title = ' '.join(w[4] for w in tw)
        # markers below this title, in its column
        cx = (tw[0][0] + tw[-1][2]) / 2
        mk = [d for d in dr if d.get('fill') and len(d['items']) == 8 and d['rect'].width < 4 and t[3] < d['rect'].y0 < t[3] + 110 and abs((d['rect'].x0 + d['rect'].x1) / 2 - cx) < 128]
        if not mk: continue
        ys = [((d['rect'].y0 + d['rect'].y1) / 2) for d in mk]; xs = [((d['rect'].x0 + d['rect'].x1) / 2) for d in mk]
        # tick labels left of the panel, within the panel's vertical span
        tl = [w for w in words if w[2] < min(xs) and w[0] > min(xs) - 40 and t[3] < w[1] < t[3] + 110]
        tl = [w for w in tl if w[4].replace('.', '').isdigit()]
        # horizontal gridlines spanning the panel
        gl = []
        for d in dr:
            for it in d['items']:
                if it[0] == 'l' and abs(it[1].y - it[2].y) < 0.01 and abs(it[2].x - it[1].x) > 150 and min(xs) - 10 < min(it[1].x, it[2].x) < min(xs) + 10:
                    gl.append(it[1].y)
        gl = sorted(set(round(g, 3) for g in gl))
        pts = []
        for w in tl:
            c = (w[1] + w[3]) / 2; g = min(gl, key=lambda g: abs(g - c)) if gl else c
            pts.append((g, float(w[4])))
        pts.sort()
        if len(pts) < 2: print("skip", name, title, len(mk), len(tl)); continue
        (ya, va), (yb, vb) = pts[0], pts[-1]
        fy = lambda y: va + (y - ya) * (vb - va) / (yb - ya)
        # x: steps 0..100 at the first and last marker (markers every 5 steps, 21 of them)
        xs_s = sorted(zip(xs, ys))
        n = len(xs_s); step = 100 / (n - 1)
        out[name + ': ' + title] = {'steps': [round(i * step) for i in range(n)], 'values': [round(fy(y), 4) for _, y in xs_s],
                                    'calibration': {'labels': pts, 'gridlines_found': len(gl)}}
json.dump(out, open('inputs/fig_curves.json', 'w'), indent=1)
for k, v in out.items(): print(k, v['values'])
