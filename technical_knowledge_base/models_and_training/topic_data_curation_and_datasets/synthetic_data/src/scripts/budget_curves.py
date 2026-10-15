"""distinct-n and gzip ratio of each set at several word budgets, so text of any size can be compared at the same budget
(the Diversity meter's "measure your own text" uses these curves). Same sets and tokenisation as measure_sets.py.
usage: DC_SCRATCH=<scratch>/dc python -I budget_curves.py <out.json>"""
import os, sys, json, gzip
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from measure_sets import SETS, W
B = [1000, 3000, 10000, 30000, 100000]
out = {'budgets': B, 'sets': {}}
for key, label, grp, load in SETS:
    docs = load(); flat, txt = [], []
    for d in docs:
        flat += [x.lower() for x in W.findall(d)]; txt.append(d)
    r = {}
    for b in B:
        f = flat[:b]; row = {}
        for n in (1, 2, 4):
            g = [tuple(f[i:i + n]) for i in range(len(f) - n + 1)]; row[f'd{n}'] = round(len(set(g)) / max(1, len(g)), 4)
        # gzip on the raw text of the first b words: rebuild by joining words (punctuation dropped) for a size-matched figure
        raw = ' '.join(f).encode(); row['gz'] = round(len(raw) / len(gzip.compress(raw, 9)), 3)
        r[str(b)] = row
    out['sets'][key] = r; print(key, r['1000'], r['100000'], flush=True)
json.dump(out, open(sys.argv[1], 'w'), indent=0)
