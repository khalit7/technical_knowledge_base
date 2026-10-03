"""Recompute every derived number the Milestones tab shows, from printed per-game scores.

Reads inputs/atari57_pergame.tsv (written by extract_pergame.py) and writes inputs/recompute.json,
which mk_miles.py embeds. Asserts the reproductions the page states.
HNS = 100 * (agent - random) / (human - random).
"""
import json, os, statistics as st
here = os.path.dirname(os.path.abspath(__file__))
rows = [l.rstrip('\n').split('\t') for l in open(os.path.join(here, 'inputs', 'atari57_pergame.tsv')) if not l.startswith('#')]
hdr, rows = rows[0], rows[1:]
R = [dict(zip(hdr, r)) for r in rows]
for r in R:
    for k in hdr[1:]:
        r[k] = float(r[k])
def hns(r, col, base='mz'):
    lo, hi = (r['random'], r['human']) if base == 'mz' else (r['a57_random'], r['a57_human'])
    return 100 * (r[col] - lo) / (hi - lo)
def summ(col, base='mz'):
    v = [hns(r, col, base) for r in R]
    return {'median': round(st.median(v), 2), 'mean': round(sum(v) / len(v), 2), 'above_human': sum(x >= 100 for x in v),
            'capped_mean': round(sum(max(0, min(100, x)) for x in v) / len(v), 2)}
out = {}
out['apex_s1'] = summ('apex'); out['r2d2_s1'] = summ('r2d2'); out['muzero_s1'] = summ('muzero')
out['agent57_h4'] = summ('agent57', 'a57'); out['r2d2_bandit_h4'] = summ('r2d2_bandit', 'a57'); out['muzero_in_a57'] = summ('muzero_in_a57', 'a57')
# Agent57 normalisation applied to MuZero's own printed scores
for r in R: r['mz_own_a57'] = r['muzero']
out['muzero_own_with_a57_baselines'] = summ('mz_own_a57', 'a57')
out['typos'] = [{'game': r['game'], 'muzero_paper': r['muzero'], 'agent57_table': r['muzero_in_a57']} for r in R if abs(r['muzero'] - r['muzero_in_a57']) > 1e-6 * max(1, abs(r['muzero']))]
out['beam_rider_hns'] = {'as_in_agent57': round(hns([r for r in R if r['game'] == 'beam rider'][0], 'muzero_in_a57', 'a57'), 1),
                         'from_muzero_paper': round(hns([r for r in R if r['game'] == 'beam rider'][0], 'muzero', 'a57'), 1)}
# per-game HNS for the 57-game animation (one normalisation: MuZero Table S1 random and human)
# per-game HNS for the 57-game animation, one normalisation for all four agents: Agent57 App. H.4 random and human
out['pergame'] = [{'g': r['game'], 'apex': round(hns(r, 'apex', 'a57'), 2), 'r2d2': round(hns(r, 'r2d2', 'a57'), 2),
                   'muzero': round(hns(r, 'muzero', 'a57'), 2), 'agent57': round(hns(r, 'agent57', 'a57'), 2)} for r in R]
out['apex_a57'] = summ('apex', 'a57'); out['r2d2_a57'] = summ('r2d2', 'a57')
# the median game and how much rounding the baselines moves it
out['agent57_with_s1_baselines'] = summ('agent57')
dd = [r for r in R if r['game'] == 'double dunk'][0]
out['double_dunk'] = {'s1': [dd['random'], dd['human']], 'a57': [dd['a57_random'], dd['a57_human']],
                      'agent57_hns_a57': round(hns(dd, 'agent57', 'a57'), 2), 'agent57_hns_s1': round(hns(dd, 'agent57'), 2)}
# checks against printed values
def near(a, b, tol): assert abs(a - b) <= tol, (a, b)
near(out['muzero_s1']['median'], 2041.1, 0.05); near(out['muzero_s1']['mean'], 4999.2, 0.05)        # MuZero Table 1
near(out['apex_s1']['median'], 434.1, 0.05)                                                          # MuZero Table 1 (Ape-X)
near(out['agent57_h4']['median'], 1933.49, 0.01); near(out['agent57_h4']['mean'], 4766.25, 0.01)     # Agent57 Table 1
near(out['agent57_h4']['capped_mean'], 100.0, 0.01)
near(out['muzero_in_a57']['median'], 2381.51, 0.01); near(out['muzero_in_a57']['mean'], 5661.84, 0.01)
near(out['r2d2_bandit_h4']['median'], 2357.92, 0.01)
assert [t['game'] for t in out['typos']] == ['asteroids', 'beam rider'], out['typos']
near(out['beam_rider_hns']['as_in_agent57'], 27469, 1)                                               # Agent57 text: 27469%
json.dump(out, open(os.path.join(here, 'inputs', 'recompute.json'), 'w'), indent=1)
for k, v in out.items():
    if k != 'pergame': print(k, v)
print('all recompute checks pass')
