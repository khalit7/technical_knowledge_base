"""Decode the vector figures of Latent Context Language Models (arXiv 2606.09659v1) from the PDFs in the arXiv e-print.
Markers are read from the vector paths (circle = 4x, square = 8x, triangle = 16x, down-triangle = ratio agnostic),
coloured by the legend swatches, and calibrated on each panel's own tick marks (log axes for TTFT). Printed value
labels (the loss call-outs in Figures 3, 8, 9, 10, 11) are kept as word lists.

usage: mkdir -p $SCRATCH/eprint && curl -sL https://arxiv.org/e-print/2606.09659 | tar xz -C $SCRATCH/eprint
       uv run --with pymupdf python decode_figs.py $SCRATCH/eprint/figs        (writes inputs/figs.json)
"""
import json, sys, os, math
import pymupdf

D = sys.argv[1]
COL = {(0.271, 0.482, 0.616): 'SnapKV', (0.165, 0.616, 0.561): 'SnapKV-QA', (0.659, 0.855, 0.863): 'SnapKV-SelfStudy',
       (0.914, 0.769, 0.416): 'ExpAttn', (0.776, 0.157, 0.157): 'KVzip', (1.0, 0.42, 0.42): 'KVzipFast',
       (0.702, 0.616, 0.859): 'AM-Fast', (0.369, 0.208, 0.694): 'AM-Slow', (0.173, 0.627, 0.173): 'LCLM',
       (0.082, 0.396, 0.753): 'NoCompression'}

def markers(page, ybottom):
    out = []
    for g in page.get_drawings():
        f = tuple(round(x, 3) for x in (g.get('fill') or ()))
        c = tuple(round(x, 3) for x in (g.get('color') or ()))
        if f not in COL or c != (0.0, 0.0, 0.0): continue
        it = g['items']; r = g['rect']
        if it[0][0] == 'c' and len(it) == 8: shape = '4x'
        elif it[0][0] == 're': shape = '8x'
        elif len(it) == 3 and it[0][0] == 'l':
            # up-triangle: apex at the top (smaller y); down-triangle: apex at the bottom
            ys = sorted(p.y for seg in it for p in seg[1:])
            top_count = sum(1 for y in ys if abs(y - r.y0) < 0.5)
            shape = '16x' if top_count < sum(1 for y in ys if abs(y - r.y1) < 0.5) else 'agnostic'
        else: continue
        cx, cy = (r.x0 + r.x1) / 2, (r.y0 + r.y1) / 2
        if cy > ybottom: continue          # legend swatches sit below the axes
        out.append((COL[f], shape, cx, cy))
    return out

def logx(x, x0, v0, L): return v0 * 10 ** ((x - x0) / L)
def liny(y, y0, v0, y1, v1): return v0 + (y - y0) * (v1 - v0) / (y1 - y0)

res = {}
# Figure 1 (pareto_curve.pdf): two panels, ticks read from the file (see the README for the dump)
p = pymupdf.open(os.path.join(D, 'pareto_curve.pdf'))[0]
panels = {'fig1_ruler4k': dict(xr=(60, 760), x=(192.3, 0.1, 556.3 - 192.3), y=(395.1, 20, 168.2, 80)),
          'fig1_longbench64k': dict(xr=(830, 1500), x=(981.2, 1.0, 1296.8 - 981.2), y=(395.3, 25, 127.6, 45))}
ms = markers(p, 431)
for k, P in panels.items():
    res[k] = sorted([dict(method=m, ratio=s, ttft=round(logx(x, *P['x']), 4), acc=round(liny(y, *P['y']), 2))
                     for m, s, x, y in ms if P['xr'][0] < x < P['xr'][1]], key=lambda d: (d['method'], d['ratio']))
# Figure 5 (pareto_curve_extra.pdf): three panels
p = pymupdf.open(os.path.join(D, 'pareto_curve_extra.pdf'))[0]
panels = {'fig5_ruler8k': dict(xr=(60, 520), x=(113.5, 0.1, 349.8 - 113.5), y=(364.8, 20, 156.2, 80)),
          'fig5_ruler16k': dict(xr=(560, 1040), x=(799.7, 1.0, (868.3 - 799.7) / math.log10(2)), y=(378.9, 20, 160.7, 80)),
          'fig5_longhealth64k': dict(xr=(1070, 1500), x=(1166.5, 1.0, 1367.9 - 1166.5), y=(345.5, 20, 178.1, 60))}
ms = markers(p, 399)
for k, P in panels.items():
    res[k] = sorted([dict(method=m, ratio=s, ttft=round(logx(x, *P['x']), 4), acc=round(liny(y, *P['y']), 2))
                     for m, s, x, y in ms if P['xr'][0] < x < P['xr'][1]], key=lambda d: (d['method'], d['ratio']))
# Figure 4 (scaling_time_memory.pdf): TTFT (log, 67.2 pt per decade) and peak memory (linear) against context length
p = pymupdf.open(os.path.join(D, 'scaling_time_memory.pdf'))[0]
ctx = ['4k', '8k', '16k', '32k', '64k', '128k', '256k', '512k', '1M']
xs_t = [124.6 + i * 71.3125 for i in range(9)]; xs_m = [893.9 + i * 71.3125 for i in range(9)]
ms = markers(p, 343)
ttft, mem = {}, {}
for m, s, x, y in ms:
    key = m + ('' if s == 'agnostic' else ' ' + s)
    if x < 760:
        i = min(range(9), key=lambda j: abs(xs_t[j] - x))
        ttft.setdefault(key, {})[ctx[i]] = round(0.1 * 10 ** ((307.2 - y) / 67.2), 4)
    else:
        i = min(range(9), key=lambda j: abs(xs_m[j] - x))
        mem.setdefault(key, {})[ctx[i]] = round((334.3 - y) * 25 / (334.3 - 284.9), 2)
res['fig4_ttft_s'] = ttft; res['fig4_peak_mem_gb'] = mem
# printed labels of the loss figures
for f in ['arch_loss', 'concat_vs_mean_ratios', 'adapter_overlap', 'cpt_ablation', 'scaling_behavior']:
    q = pymupdf.open(os.path.join(D, f + '.pdf'))[0]
    res['words_' + f] = [[round(w[0], 1), round(w[1], 1), w[4]] for w in q.get_text('words')]
os.makedirs('inputs', exist_ok=True)
json.dump(res, open('inputs/figs.json', 'w'), indent=0)
for k in res:
    if k.startswith('fig1') or k.startswith('fig5'):
        print(k); [print('  ', d) for d in res[k]]
for k in ['fig4_ttft_s', 'fig4_peak_mem_gb']:
    print(k); [print('  ', m, v) for m, v in sorted(res[k].items())]
