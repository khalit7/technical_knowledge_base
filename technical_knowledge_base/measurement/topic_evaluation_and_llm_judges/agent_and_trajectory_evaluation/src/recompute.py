# Recompute every number the page derives from the tau2 trials, plus the published figures it quotes.
# Writes recompute.json; checks/check_ui.mjs compares the page's JavaScript output (window.ATJ_OUT) with it.
import json, os
from math import comb
H = os.path.dirname(os.path.abspath(__file__))
D = json.load(open(os.path.join(H, 'inputs', 'tau2_airline_trials.json')))
C = D['meta']['cols']; R = [dict(zip(C, r)) for r in D['rows']]
out = {}
nulls = set(D['meta']['null']['airline']['tasks'])

def grade(r, g):
    if g == 'msg': return None if r['nl_n'] == 0 else int(r['nl_met'] == r['nl_n'])
    if g == 'state': return r['db']
    if g == 'steps': return None if r['ac_n'] == 0 else int(r['ac_ok'] == r['ac_n'])
    if g == 'writes': return int(r['w_matched'] == r['gold_w'] and r['w_extra'] == 0)
    if g == 'reward': return r['reward']

for m in ['gpt52', 'opus45']:
    xs = [r for r in R if r['model'] == m]
    o = {}
    by = {}
    for r in xs: by.setdefault(r['task'], []).append(r['reward'])
    o['pass_hat'] = [round(100 * sum(comb(sum(v), k) / comb(len(v), k) for v in by.values()) / len(by), 2) for k in range(1, 5)]
    o['passes'] = sum(r['reward'] for r in xs)
    o['passes_on_null_tasks'] = sum(r['reward'] for r in xs if r['task'] in nulls)
    o['null_task_trials'] = sum(1 for r in xs if r['task'] in nulls)
    o['pass1_non_null'] = round(100 * sum(r['reward'] for r in xs if r['task'] not in nulls) / sum(1 for r in xs if r['task'] not in nulls), 2)
    ok = [r for r in xs if r['reward'] == 1]; bad = [r for r in xs if r['reward'] == 0]
    o['cost_pass'] = round(sum(r['agent_cost'] for r in ok) / len(ok), 4)
    o['cost_fail'] = round(sum(r['agent_cost'] for r in bad) / len(bad), 4)
    o['calls_pass'] = round(sum(r['calls'] for r in ok) / len(ok), 2)
    o['calls_fail'] = round(sum(r['calls'] for r in bad) / len(bad), 2)
    o['cost_total'] = round(sum(r['agent_cost'] for r in xs), 2)
    o['max_calls'] = max(r['calls'] for r in xs)
    out[m] = o

# agreement between graders over all 400 trials
pairs = [('msg', 'state'), ('state', 'steps'), ('msg', 'steps'), ('state', 'writes')]
for a, b in pairs:
    t = {'11': 0, '10': 0, '01': 0, '00': 0, 'na': 0}
    for r in R:
        x, y = grade(r, a), grade(r, b)
        if x is None or y is None: t['na'] += 1
        else: t['%d%d' % (x, y)] += 1
    out['agree_%s_%s' % (a, b)] = t

# task-level reliability over both models (8 trials per task)
tk = {}
for r in R: tk.setdefault(r['task'], []).append(r['reward'])
out['tasks_0_of_8'] = sorted([t for t, v in tk.items() if sum(v) == 0], key=int)
out['tasks_8_of_8'] = len([t for t, v in tk.items() if sum(v) == 8])
out['tasks_mixed'] = len([t for t, v in tk.items() if 0 < sum(v) < 8])
out['null'] = D['meta']['null']

# published figures quoted on the page, with their arithmetic
out['devai_cost_share'] = round(100 * 30.58 / 1297.50, 2)      # 2.36 (paper prints 2.29 for cost)
out['devai_time_share'] = round(100 * 118.43 / 5190, 2)        # 2.28 (paper prints 2.36 for time)
out['mole_complete_share'] = round(100 * 28 / 39, 1)           # 71.8, the "72%"
out['mole_monitor'] = round(24 / 45, 3)                        # 0.533 R@10/day
out['ajb_gain_ds'] = round(77.34 - 64.49, 2)                   # 12.85
out['ajb_gain_g5m'] = round(72.41 - 59.00, 2)                  # 13.41
out['impossible_abort_gpt5'] = [54, 9]
out['metr_rebench_hcast_ratio_note'] = '43x more common on RE-Bench than HCAST (METR, 5 Jun 2025)'
out['statem_after_flags'] = [round(100 * 420 / 445, 2), round(100 * 415 / 445, 2), round(100 * 411 / 445, 2)]

# agentevals port on the five stepped-through cases (compared with window.ATJ_MATCH5)
from match_port import verdict, MODES, ARGS
CS = json.load(open(os.path.join(H, 'inputs', 'tau2_cases.json')))
m5 = {}
for k, c in CS.items():
    o = [{'name': s['n'], 'args': s['a']} for s in c['steps'] if s['k'] == 'call']
    r = [{'name': g['n'], 'args': g['a']} for g in c['gold']]
    for mo in MODES:
        for am in ARGS:
            for w in (0, 1): m5['%s|%s|%s|%d' % (k, mo, am, w)] = verdict(mo, am, o, r, bool(w))
out['match5'] = m5
out['match_gpt52_strict_all'] = D['meta']['match']['gpt52|strict|exact|0']
out['match_gpt52_unordered_writes'] = D['meta']['match']['gpt52|unordered|exact|1']
json.dump(out, open(os.path.join(H, 'recompute.json'), 'w'), indent=1)
print('recompute.json written,', len(out), 'keys')
