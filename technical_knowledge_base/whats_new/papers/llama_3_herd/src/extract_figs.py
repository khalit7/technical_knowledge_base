"""Read Figures 2, 3 and 4 of the Llama 3 paper from the vector PDFs in the arXiv source (v3), calibrated on each
figure's own gridlines. Writes inputs/figs.json. The PDFs are not kept in the repo; this script fetches the source.
usage: uv run --with pymupdf python extract_figs.py [path/to/extracted/arxiv/source]"""
import json, math, os, subprocess, sys, tempfile
import pymupdf

def source_dir():
    if len(sys.argv) > 1: return sys.argv[1]
    d = os.path.join(tempfile.gettempdir(), 'l3src')
    if not os.path.exists(os.path.join(d, 'assets', 'isoflops.pdf')):
        os.makedirs(d, exist_ok=True)
        subprocess.run(['sh', '-c', 'curl -sL https://arxiv.org/e-print/2407.21783v3 | tar -xz -C ' + d], check=True)
    return d

A = os.path.join(source_dir(), 'assets')
rnd = lambda c: tuple(round(v, 2) for v in c) if c else None
def draws(f):
    return pymupdf.open(os.path.join(A, f))[0].get_drawings()
def center(x):
    r = x['rect']; return ((r.x0 + r.x1) / 2, (r.y0 + r.y1) / 2)
def lin(p0, v0, p1, v1):
    return lambda p: v0 + (p - p0) * (v1 - v0) / (p1 - p0)
def poly(x):
    pts = []
    for it in x['items']:
        if it[0] == 'l': pts += [(it[1].x, it[1].y), (it[2].x, it[2].y)]
    out = []
    for p in pts:
        if not out or abs(out[-1][0] - p[0]) > 1e-6 or abs(out[-1][1] - p[1]) > 1e-6: out.append(p)
    return out
MAG = (0.77, 0.18, 0.56)
out = {'_doc': 'Values read from the vector graphics of the arXiv v3 source PDFs (assets/isoflops.pdf, datacompute.pdf, scaling_laws_benchmark.pdf), calibrated on gridlines; precision about 0.1% of an axis range. Marker centres are the centres of the marker bounding boxes.'}

# Figure 3 (datacompute.pdf): x log10 FLOPs gridlines 1e19..1e22, y log10 tokens gridlines 1e10, 1e11
D = draws('datacompute.pdf')
fx = lin(107.15262603759766, 19, 403.9258728027344, 22)
fy = lin(199.78900146484375, 10, 66.05198669433594, 11)
pts = [center(x) for x in D if rnd(x.get('fill')) == MAG and len(x['items']) == 4 and x['rect'].y0 > 10 and x['rect'].x0 > 75]
pts = sorted(pts)
out['fig3_points'] = [[float('%.4g' % 10 ** fx(px)), float('%.4g' % 10 ** fy(py))] for px, py in pts]
line = [x for x in D if len(x['items']) > 50][0]
out['fig3_line'] = [[round(fx(px), 4), round(fy(py), 4)] for px, py in poly(line)[::7]]
out['fig3_legend'] = 'Fitted Line, alpha = 0.537, A = 0.299'

# Figure 2 (isoflops.pdf): x log10 tokens gridlines 1e10, 1e11, 1e12; y loss gridlines 0.70..0.95
I = draws('isoflops.pdf')
gx = lin(172.15753173828125, 10, 415.68939208984375, 12)
gy = lin(257.76953125, 0.70, 12.520294189453125, 0.95)
budgets = ['6e18', '1e19', '3e19', '6e19', '1e20', '3e20', '6e20', '1e21', '3e21', '1e22']
legend = sorted([x for x in I if len(x['items']) == 2 and x['rect'].x0 > 340], key=lambda x: x['rect'].y0)
col2b = {rnd(x['color']): b for x, b in zip(legend, budgets)}
fig2 = {b: {'points': [], 'curve': []} for b in budgets}
for x in I:
    c = rnd(x.get('fill')) or rnd(x.get('color'))
    if c in col2b and x.get('fill') and len(x['items']) == 8:
        px, py = center(x); fig2[col2b[c]]['points'].append([float('%.4g' % 10 ** gx(px)), round(gy(py), 4)])
    elif c in col2b and len(x['items']) > 50:
        fig2[col2b[c]]['curve'] = [[round(gx(px), 4), round(gy(py), 4)] for px, py in poly(x)[::6]]
for b in budgets: fig2[b]['points'].sort()
mins = sorted(center(x) for x in I if rnd(x.get('fill')) == MAG and len(x['items']) == 4)
out['fig2'] = fig2
out['fig2_minima'] = [[float('%.4g' % 10 ** gx(px)), round(gy(py), 4)] for px, py in mins]

# Figure 4 (scaling_laws_benchmark.pdf): left x log10 FLOPs gridlines 1e20..1e25, y NLL 1.200..1.400;
# right x NLL gridlines 1.40..1.20, y accuracy 0.3..1.0
S = draws('scaling_laws_benchmark.pdf')
lx = lin(98.74022674560547, 20, 337.2026062011719, 25); ly = lin(262.4714050292969, 1.2, 13.271240234375, 1.4)
rx = lin(442.7892761230469, 1.40, 716.4093017578125, 1.20); ry = lin(259.99383544921875, 0.3, 12.520294189453125, 1.0)
L, R = {}, {}
names = {MAG: 'scaling_law_models', (1.0, 0.5, 0.0): 'llama2_models', (0.22, 0.49, 0.72): 'prediction', (0.0, 0.4, 0.91): 'llama3_405b'}
for x in S:
    c = rnd(x.get('fill')); r = x['rect']
    if c not in names or r.y0 < 15 and r.x0 < 480 and r.x0 > 440: continue
    if len(x['items']) > 50 or r.width > 20: continue
    if 446 < r.x0 < 470 and r.y0 < 95 and r.x0 > 440 and r.width < 14 and r.y0 > 15: continue  # legend glyphs
    px, py = center(x)
    if px < 380: L.setdefault(names[c], []).append([round(lx(px), 4), round(ly(py), 4)])
    else: R.setdefault(names[c], []).append([round(rx(px), 4), round(ry(py), 4)])
curves = [x for x in S if len(x['items']) > 50]
out['fig4_left'] = {k: sorted(v) for k, v in L.items()}
out['fig4_right'] = {k: sorted(v) for k, v in R.items()}
out['fig4_left_curve'] = [[round(lx(px), 4), round(ly(py), 4)] for px, py in poly([c for c in curves if c['rect'].x0 < 380][0])[::6]]
out['fig4_right_curve'] = [[round(rx(px), 4), round(ry(py), 4)] for px, py in poly([c for c in curves if c['rect'].x0 > 380][0])[::6]]

# Figure 17 (heval-*-overall.pdf): win and loss rates per capability with 95% CI whiskers; x calibrated on the
# axis ticks (first tick 0%, last 40%). Rows top to bottom as labelled in the GPT-4 panel.
ROWS = ['English', 'Reasoning', 'Coding', 'Multilingual', 'Multiturn English', 'Multiturn Reasoning', 'Multiturn Coding']
fig17 = {}
for key, f in (('GPT-4 (0125)', 'heval-gpt4preview-overall.pdf'), ('GPT-4o', 'heval-gpt4o-overall.pdf'), ('Claude 3.5 Sonnet', 'heval-claude3.5sonnet-overall.pdf')):
    H = draws(f)
    ticks = sorted(x['rect'].x0 for x in H if rnd(x.get('color')) == (0.27, 0.27, 0.27) and x['rect'].height < 5)
    hx = lin(ticks[0], 0, ticks[-1], 40)
    bars = {'win': (0.11, 0.29, 0.7), 'loss': (0.8, 0.9, 1.0)}
    rows = []
    for kind, col in bars.items():
        bs = sorted([x for x in H if rnd(x.get('fill')) == col and len(x['items']) == 4], key=lambda x: x['rect'].y0)
        for i, b in enumerate(bs):
            yc = (b['rect'].y0 + b['rect'].y1) / 2
            wh = min((x for x in H if len(x['items']) == 3 and rnd(x.get('color')) == (0.65, 0.7, 0.75)), key=lambda x: abs((x['rect'].y0 + x['rect'].y1) / 2 - yc))
            if len(rows) <= i: rows.append({'row': ROWS[i]})
            rows[i][kind] = round(hx(b['rect'].x1), 2)
            rows[i][kind + '_ci'] = [round(hx(wh['rect'].x0), 2), round(hx(wh['rect'].x1), 2)]
    fig17[key] = rows
out['fig17'] = fig17
out['fig17_doc'] = 'Llama 3 405B against each model: win and loss rates (percent of comparisons, ties excluded from both) per capability, with the drawn 95% CI whiskers.'
json.dump(out, open('inputs/figs.json', 'w'), indent=0)
print(json.dumps(out['fig17'], indent=0)[:1500])
print({b: len(fig2[b]['points']) for b in budgets})
