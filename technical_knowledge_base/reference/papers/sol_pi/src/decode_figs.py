"""Read the printed value labels of Figures 5, 6, 7 and 8 from the arXiv PDF (v1); the arXiv HTML has no images
for them. Only printed labels are used (no curve reading); each label is assigned to its bar by its x position
and the assignment is asserted against the figure's own layout (two bars per mechanism, left then right).
usage: curl -sL https://arxiv.org/pdf/2609.20519v1 -o $SCRATCH/solpi.pdf
       uv run --with pymupdf python decode_figs.py $SCRATCH/solpi.pdf   (writes inputs/figs.json)"""
import json, re, sys
import pymupdf
d = pymupdf.open(sys.argv[1])
MECH = ['Action Fusion', 'Online Context Compact', 'Evidence-Preserving Reducer', 'ObservationPack']

def nums(page, x0, x1, y0, y1):
    out = []
    for w in page.get_text('words'):
        if x0 <= w[0] < x1 and y0 <= w[1] < y1:
            for m in re.finditer(r'\d+(?:\.\d+)?%?', w[4]):
                out.append((w[0] + (m.start() * 4.5), w[1], m.group(0)))
    return out

def panel(page, x0, x1, y0, y1, axis_labels):
    """value labels in a panel, minus the axis tick labels, sorted left to right"""
    v = [n for n in nums(page, x0, x1, y0, y1) if '.' in n[2]]  # bar labels carry a decimal; axis ticks do not
    v.sort(key=lambda n: n[0])
    vals = [float(n[2].rstrip('%')) for n in v]
    assert len(vals) == 8, (x0, vals)
    return [[vals[2 * i], vals[2 * i + 1]] for i in range(4)]

out = {'source': 'https://arxiv.org/pdf/2609.20519v1, printed bar labels (pymupdf words)', 'mechanisms': MECH}
# Figure 6 (page 9): green = GPT-5.6 Sol, grey = Opus 5 (legend words "GPT-5.6 Sol", "Opus 5" at the top)
p = d[8]
leg = [w[4] for w in p.get_text('words') if 480 < w[1] < 490]
assert leg == ['GPT-5.6', 'Sol', 'Opus', '5'], leg
ticks_rate = {'0', '20', '40', '60', '80', '100'}; ticks_int = {'1', '2', '5', '10', '20', '50', '100'}; ticks_gain = {'0', '10', '20', '30', '40'}
Y0, Y1 = 515, 640
out['fig6'] = {'series': ['GPT-5.6 Sol', 'Opus 5'],
               'trigger_rate_pct': panel(p, 100, 240, Y0, Y1, ticks_rate),
               'intensity': panel(p, 255, 395, Y0, Y1, ticks_int),
               'gain_pct': panel(p, 405, 560, Y0, Y1, ticks_gain)}
# Figure 7 (page 10): grey = enabled alone, green = all mechanisms enabled (GPT-5.6 Sol)
p = d[9]
Y0, Y1 = 100, 265
f7 = {'series': ['Enabled alone', 'All mechanisms enabled'],
      'trigger_rate_pct': panel(p, 88, 235, Y0, Y1, ticks_rate),
      'intensity': panel(p, 250, 395, Y0, Y1, ticks_int),
      'gain_pct': panel(p, 410, 560, Y0, Y1, ticks_gain)}
out['fig7'] = f7
# Figure 8 (page 10): trigger rate and task score per search batch, panels (d)-(f)
ws = [(w[0], w[1], w[4]) for w in p.get_text('words')]
tr = sorted([w for w in ws if 285 < w[0] < 395 and 395 < w[1] < 452 and '%' in w[2]], key=lambda w: w[0])
trv = []
for w in tr: trv += [float(x) for x in re.findall(r'(\d+(?:\.\d+)?)%', w[2])]
sc = sorted([w for w in ws if 418 < w[0] < 530 and 380 < w[1] < 460 and re.fullmatch(r'\d+\.\d', w[2])], key=lambda w: w[0])
out['fig8'] = {'trigger_rate_pct_batches_1_9': trv, 'task_score_batches': [float(w[2]) for w in sc],
               'note': 'batch 10 is printed separately in red (100% trigger, 87.0 score); the 88.9 label at batch 9 sits above the panel'}
top = [(w[0], w[1], w[2]) for w in ws if 380 < w[1] < 400]
out['fig8']['labels_above'] = [w[2] for w in top]
json.dump(out, open('inputs/figs.json', 'w'), indent=1)
print(json.dumps(out, indent=0)[:2500])
