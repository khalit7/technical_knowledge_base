"""Check costfm.py against the planner's own EXPLAIN costs in inputs/cost_model.json."""
import json, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from costfm import *
J = json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'inputs', 'cost_model.json')))
c = {k: float(v) for k, v in J['settings'].items()}
ok = bad = 0
for k, d in J['presets'].items():
    for r in d['rows']:
        s = selectivity(d, d['a'], d['a'] + r['n'] - 1); m = costs(d, s, c)
        for got, want, what in [(m['rows'], r['seq']['rows'], 'rows'), (m['seq']['total'], r['seq']['total'], 'seq'), (m['index']['total'], r['index']['total'], 'index'),
                                (m['index']['startup'], r['index']['startup'], 'index startup'), (m['bitmap']['total'], r['bitmap']['total'], 'bitmap'), (m['bitmap']['inner_total'], r['bitmap']['inner']['total'], 'bitmap index')]:
            if abs(got - want) <= 0.006 + 1e-9 * want: ok += 1
            else: bad += 1; print('MISMATCH', k, r['n'], what, round(got, 3), want)
print(f'cost formulas against EXPLAIN: {ok} match to the cent, {bad} differ')
