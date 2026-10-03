"""Decode Figures 1 and 4 of RRSI from the vector PDFs in the arXiv e-print (figures/intro.pdf, figures/efficiency.pdf).
Points are read from the marker paths, calibrated on each axis's own tick marks (labels printed beside the ticks);
printed value labels (Figure 1 b-d, Figure 4 b, Figure 3) are transcribed from the PDF text layer.
usage: curl -sL https://arxiv.org/e-print/2609.24972v2 | tar xz -C $SCRATCH/eprint
       uv run --with pymupdf python decode_figs.py $SCRATCH/eprint      (writes inputs/figs.json)"""
import json, sys
import pymupdf

E = sys.argv[1]


def lin(p0, v0, p1, v1):
    return lambda p: v0 + (p - p0) * (v1 - v0) / (p1 - p0)


def markers(page, xmax):
    """Marker shapes left of xmax: grey circles (baselines) and the blue star (RRSI); returns centre and kind."""
    out = []
    for g in page.get_drawings():
        r = g['rect']
        if r.x1 > xmax or not g.get('fill'): continue
        it = ''.join(i[0] for i in g['items'])
        if it.startswith('cccc') and 6 < r.width < 7:
            out.append(('circle', (r.x0 + r.x1) / 2, (r.y0 + r.y1) / 2))
        elif it.startswith('llllllllll') and 9 < r.width < 11:
            # five-pointed star: centre of the outer pentagon is not the bbox centre; use the mean of its vertices
            pts = [i[1] for i in g['items']]
            out.append(('star', sum(p.x for p in pts) / len(pts), sum(p.y for p in pts) / len(pts)))
    return out


def words(page):
    return [(w[0], w[1], w[2], w[3], w[4]) for w in page.get_text('words')]


res = {}
# Figure 1 (a): relative evolve-split gain (x, %) against relative OOD gain (y, %); ticks x 0,2,4,6 and y -5,0,5,10
p = pymupdf.open(E + '/figures/intro.pdf')[0]
fx = lin(36.70, 0, 153.55, 6)            # tick marks at x = 36.70 (0) and 153.55 (6)
fy = lin(127.43, 0, 52.32, 10)           # tick marks at y = 127.43 (0) and 52.32 (10)
assert abs(fy(164.98) + 5) < 0.01 and abs(fx(75.65) - 2) < 0.01  # the other ticks land on -5 and 2
pts = [(k, round(fx(x), 3), round(fy(y), 3)) for k, x, y in markers(p, 170)]
res['fig1a'] = {'how': 'marker centres, calibrated on ticks x 0..6 and y -5..10 (figures/intro.pdf)', 'points': pts}
W = words(p)
res['fig1bcd_labels'] = [w[4] for w in W if 170 < w[0] and w[4].replace('.', '').isdigit() and '.' in w[4]]
# Figure 4 (a): policy tokens per trial (millions, x) against OOD average (y)
p = pymupdf.open(E + '/figures/efficiency.pdf')[0]
gx = lin(49.77, 1.5, 200.01, 4.0)
gy = lin(135.38, 38, 29.75, 44)
assert abs(gx(109.86) - 2.5) < 0.01 and abs(gy(82.57) - 41) < 0.01
res['fig4a'] = {'how': 'marker centres, calibrated on ticks x 1.5..4.0 and y 38..44 (figures/efficiency.pdf)',
                'points': [(k, round(gx(x), 3), round(gy(y), 3)) for k, x, y in markers(p, 225)]}
W = words(p)
res['fig4b_labels'] = [(w[4], round(w[1], 1)) for w in W if w[0] > 240 and (w[4].replace('.', '').isdigit() or w[4] in ('H0', 'RRSI', 'TTHE', 'Meta-Harness', 'HarnessX', 'AHE'))]
p = pymupdf.open(E + '/figures/main_results.pdf')[0]
res['fig3_labels'] = [(w[4], round(w[0], 1), round(w[1], 1)) for w in words(p) if w[1] < 110]
json.dump(res, open('inputs/figs.json', 'w'), indent=1)
print(json.dumps(res['fig1a']), '\n', json.dumps(res['fig4a']), '\n', res['fig1bcd_labels'], '\n', res['fig4b_labels'])
