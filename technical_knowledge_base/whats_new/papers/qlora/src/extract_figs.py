"""Figure 2, Figure 4 and Figure 6 of QLoRA from the vector PDFs in the arXiv source (no curves are read by eye).

  curl -sL https://arxiv.org/e-print/2305.14314 -o /tmp/q.tgz && mkdir -p /tmp/qsrc && tar xzf /tmp/q.tgz -C /tmp/qsrc
  python3 extract_figs.py /tmp/qsrc/figures            writes inputs/fig_points.json

Scatter markers (Figures 2 and 4) are placed by translation operators in the PDF content stream; their positions are
mapped to data values with the gridlines, whose tick labels are printed in the figure. Figure 6's segment heights are
whole PDF points (the plotting tool rounded them), so they are kept only as a check; its printed MB labels and
GB totals were transcribed from the rendered figure (they are glyph outlines, not text).
"""
import json, os, re, sys, zlib

D = sys.argv[1]
HERE = os.path.dirname(os.path.abspath(__file__))


def streams(fn):
    d = open(os.path.join(D, fn), 'rb').read()
    for m in re.finditer(rb'stream\r?\n(.*?)endstream', d, re.S):
        try: yield zlib.decompress(m.group(1)).decode('ascii')
        except Exception: pass


def markers(fn):
    """Return [(x, y, marker)] in absolute PDF coordinates. Inside each clipped group (q ... re W n ... Q) the first
    translation is absolute and the following ones are relative, so they are accumulated."""
    pts = []
    for s in streams(fn):
        x = y = 0.0
        for m in re.finditer(r'(re W n)|(\bQ\b)|1 0 0 1 ([\d.\-]+) ([\d.\-]+) cm /(\w+) Do', s):
            if m.group(1) or m.group(2): x = y = 0.0; continue
            x += float(m.group(3)); y += float(m.group(4)); pts.append((x, y, m.group(5)))
    return pts


def hgrid(fn):
    ys = []
    for s in streams(fn):
        for x1, y1, x2, y2 in re.findall(r'([\d.\-]+) ([\d.\-]+) m\s+([\d.\-]+) ([\d.\-]+) l\s+S', s):
            if abs(float(y1) - float(y2)) < 1e-6 and abs(float(x1) - float(x2)) > 100: ys.append(round(float(y1), 3))
    return sorted(set(ys))


out = {'_source': 'arXiv e-print 2305.14314 (v1), figures/*.pdf; extracted by extract_figs.py'}
# Figure 2 (hyper.pdf): RougeL ticks 60..64 on the gridlines; x groups are the five categories
g = hgrid('hyper.pdf')
gy = [y for y in g if y > 110][:5]
assert len(gy) == 5, g
v = lambda y: 60 + (y - gy[0]) / (gy[1] - gy[0])
cats = ['QLoRA-All (4-bit)', 'QLoRA-FFN (4-bit)', 'QLoRA-Attention (4-bit)', 'Alpaca, ours (16-bit full finetuning)', 'Stanford-Alpaca (16-bit full finetuning)']
pm = markers('hyper.pdf')
groups = {}
for x, y, nm in pm: groups.setdefault(nm, []).append(round(v(y), 3))
out['figure2'] = {'metric': 'RougeL, LLaMA 7B on Alpaca, one point per seed', 'points': {cats[int(k[1:])]: sorted(vv) for k, vv in sorted(groups.items())},
                  'gridlines_y': gy}
# Figure 4 (lora_r.pdf): RougeL ticks 64.0..65.0 step 0.2; markers P0..P3 are r = 8, 16, 32, 64
g = hgrid('lora_r.pdf')
gy = [y for y in g if y > 50][:6]
assert len(gy) == 6, g
v = lambda y: 64.0 + 0.2 * (y - gy[0]) / (gy[1] - gy[0])
groups = {}
for x, y, nm in markers('lora_r.pdf'): groups.setdefault(nm, []).append(round(v(y), 3))
out['figure4'] = {'metric': 'RougeL, LLaMA 7B on Alpaca, LoRA on all layers; each point one hyperparameter combination and seed',
                  'points': {str([8, 16, 32, 64][int(k[1:])]): sorted(vv) for k, vv in sorted(groups.items())}}
# Figure 6: printed labels (MB) and totals (GB), transcribed
out['figure6'] = {'note': 'printed labels transcribed from the rendered figure: Model, Optimizer and the red Adapters label; GB totals are text in the PDF',
                  'totals_GB': {'7B': 6.9, '13B': 11.3, '33B': 24.7, '65B': 45.0},
                  'model_MB': {'7B': 5046, '13B': 8476, '33B': 19302, '65B': 37074},
                  'optimizer_MB': {'7B': 1152, '13B': 1800, '33B': 3510, '65B': 5760},
                  'adapters_MB': {'7B': 288, '13B': 450, '33B': 877.5, '65B': 1440},
                  'segments_pt': {'axis': [388, 60], 'note': 'bottom to top: model, adapters, weight gradient, optimizer, input gradient; PDF y of each boundary',
                                  '7B': [388, 147, 133, 120, 65, 60], '13B': [388, 142, 129, 116, 63, 60], '33B': [388, 132, 120, 108, 62, 60], '65B': [388, 123, 113, 102, 61, 60]}}
json.dump(out, open(os.path.join(HERE, 'inputs', 'fig_points.json'), 'w'), indent=1)
print(json.dumps(out['figure2']['points'])); print(json.dumps(out['figure4']['points']))
