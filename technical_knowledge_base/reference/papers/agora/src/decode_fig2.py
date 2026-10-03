"""Decode Figure 2 (daily publication volume by type) from the vector PDF in the arXiv e-print
(assets/trace-activity.pdf of arXiv 2609.18094v4), calibrated on the figure's own gridlines
(0 at y = 740, 50 per 137.5 units). Writes inputs/fig2_daily.json.
usage: curl -sL https://arxiv.org/e-print/2609.18094v4 | tar -xz -C $SCRATCH/ep; uv run --with pymupdf python decode_fig2.py $SCRATCH/ep/assets/trace-activity.pdf"""
import json, os, sys
import pymupdf
p = pymupdf.open(sys.argv[1])[0]
Y0, PER = 740.0, 137.5 / 50
days = ['Apr 26', 'Apr 27', 'Apr 28', 'Apr 29', 'Apr 30', 'May 1', 'May 2', 'May 3', 'May 4', 'May 5', 'May 6', 'May 7', 'May 8']
X0 = [178.8, 330.3, 481.9, 633.4, 784.9, 936.5, 1088.0, 1239.6, 1391.1, 1542.6, 1694.2, 1845.7, 1997.3]
KIND = {(0.11, 0.21, 0.34): 'results', (0.18, 0.44, 0.62): 'insights_hypotheses_reports', (0.91, 0.77, 0.42): 'verifications'}
out = [{'day': d, 'results': 0, 'insights_hypotheses_reports': 0, 'verifications': 0} for d in days]
for dr in p.get_drawings():
    f = tuple(round(x, 2) for x in (dr.get('fill') or ()))
    r = dr['rect']
    if f in KIND and r.y1 <= Y0 + 0.5 and r.x0 < 2100 and r.y0 > 60:
        i = min(range(len(X0)), key=lambda k: abs(X0[k] - r.x0))
        if abs(X0[i] - r.x0) < 2: out[i][KIND[f]] = round((r.y1 - r.y0) / PER, 2)
# tagged counts are printed as labels above the markers
lab = {}
for b in p.get_text('dict')['blocks']:
    for l in b.get('lines', []):
        for s in l['spans']:
            if s['text'].strip().isdigit() and s['bbox'][1] < 700 and s['bbox'][0] > 1200:
                i = min(range(len(X0)), key=lambda k: abs(X0[k] + 47 - s['bbox'][0]))
                lab[i] = int(s['text'])
for i, o in enumerate(out):
    o['tagged_explore_novel_or_negative'] = lab.get(i, 0)
    o['total'] = round(o['results'] + o['insights_hypotheses_reports'] + o['verifications'], 2)
tot = {k: round(sum(o[k] for o in out), 2) for k in ('results', 'insights_hypotheses_reports', 'verifications', 'tagged_explore_novel_or_negative', 'total')}
here = os.path.dirname(os.path.abspath(__file__))
json.dump({'source': 'arXiv 2609.18094v4 e-print, assets/trace-activity.pdf (Figure 2), decoded from vector bars',
           'days': out, 'totals': tot}, open(os.path.join(here, 'inputs', 'fig2_daily.json'), 'w'), indent=0)
for o in out: print(o)
print(tot)
