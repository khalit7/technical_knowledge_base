# Build the page's small inputs from the released tau2-bench trajectory files (MIT) and the re-grading outputs.
# Usage: python3 mk_inputs.py <scratch dir holding gpt52_airline.json, opus45_airline.json, dbdiff_*.json, regrade_*.json, null_env_retail.json>
# Downloads (read 2026-10-04):
#   https://sierra-tau-bench-public.s3.us-west-2.amazonaws.com/submissions/gpt-5-2_sierra_2026-02-26/trajectories/gpt-5.2_high_airline_gpt-5.2_4trials.json
#   https://sierra-tau-bench-public.s3.us-west-2.amazonaws.com/submissions/claude-opus-4-5_sierra_2026-02-26/trajectories/claude-opus-4-5_high_airline_gpt-5.2_4trials.json
#   (retail and telecom: same pattern, gpt-5.2_high_{retail,telecom}_gpt-5.2_4trials.json)
# Re-grading: regrade.py, null_env.py and dbdiff.py run inside a clone of github.com/sierra-research/tau2-bench at 5bfa7e3
#   (uv run --with websockets python ../regrade.py ../gpt52_airline.json).
import json, sys, os
from match_port import verdict, MODES, ARGS
A = sys.argv[1]
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'inputs')
FILES = [('gpt52', 'gpt52_airline.json', 'GPT-5.2 (high)'), ('opus45', 'opus45_airline.json', 'Claude Opus 4.5 (high)')]
WR = {'book_reservation', 'cancel_reservation', 'update_reservation_flights', 'update_reservation_passengers',
      'update_reservation_baggages', 'send_certificate'}
CASES = [('gpt52', '29', 1), ('gpt52', '0', 3), ('gpt52', '12', 1), ('gpt52', '31', 1), ('opus45', '29', 2)]
norm = lambda x: json.dumps(x, sort_keys=True)

def text_of(m):
    c = m.get('content') or ''
    try:  # GPT-5.2 wraps its replies as JSON {"message": ...} or {"type":"message","content":...}
        j = json.loads(c)
        if isinstance(j, dict):
            c = j.get('message') or j.get('content') or c
    except Exception:
        pass
    return c

rows, cases, tasksets = [], {}, {}
MATCH = {}  # (model, mode, args, writes_only) -> [passes, agree_with_db, n]
dd = {'gpt52': json.load(open(os.path.join(A, 'dbdiff_airline.json'))), 'opus45': json.load(open(os.path.join(A, 'dbdiff_opus.json')))}
for key, fn, label in FILES:
    d = json.load(open(os.path.join(A, fn)))
    tasks = {t['id']: t for t in d['tasks']}
    tasksets[key] = tasks
    for s in d['simulations']:
        r = s['reward_info']; t = tasks[s['task_id']]
        gold = t['evaluation_criteria']['actions'] or []
        gk = [(a['name'], norm(a['arguments'])) for a in gold if a['name'] in WR]
        calls = [c for m in s['messages'] if m['role'] == 'assistant' for c in (m.get('tool_calls') or [])]
        ak = [(c['name'], norm(c['arguments'])) for c in calls if c['name'] in WR]
        nl = r.get('nl_assertions') or []; ac = r.get('action_checks') or []
        rows.append([key, s['task_id'], s['trial'], int(r['reward']), int(r['db_check']['db_match']),
                     len(nl), sum(1 for x in nl if x['met']),
                     len(ac), sum(1 for x in ac if x['action_match']),
                     sum(1 for x in ac if x['tool_type'] == 'write'), sum(1 for x in ac if x['tool_type'] == 'write' and x['action_match']),
                     len(gk), len(ak), sum(1 for k in gk if k in ak), sum(1 for k in ak if k not in gk),
                     len(calls), sum(1 for m in s['messages'] if m['role'] in ('assistant', 'user') and m.get('content')),
                     round(s['agent_cost'] or 0, 5), round(s['user_cost'] or 0, 5), round(s['duration'], 1)])
        outs = [{'name': c['name'], 'args': c['arguments']} for c in calls]
        refs = [{'name': a['name'], 'args': a['arguments']} for a in gold]
        for mo in MODES:
            for am in ARGS:
                for wo in (0, 1):
                    v = verdict(mo, am, outs, refs, bool(wo)); k3 = '%s|%s|%s|%d' % (key, mo, am, wo)
                    x = MATCH.setdefault(k3, [0, 0, 0]); x[0] += v; x[1] += int(v == bool(r['db_check']['db_match'])); x[2] += 1
        ck = (key, s['task_id'], s['trial'])
        if ck in CASES:
            gold_keys = [(a['name'], norm(a['arguments'])) for a in gold]
            steps = []
            res_by_id = {m['id']: m for m in s['messages'] if m['role'] == 'tool'}
            for m in s['messages']:
                if m['role'] in ('assistant', 'user') and m.get('content'):
                    steps.append({'k': 'msg', 'r': m['role'], 't': text_of(m)[:900]})
                for c in (m.get('tool_calls') or []):
                    kk = (c['name'], norm(c['arguments']))
                    if kk in gold_keys: st = 'gold'
                    elif c['name'] in [g[0] for g in gold_keys]: st = 'name'
                    else: st = 'extra'
                    res = res_by_id.get(c['id'], {}).get('content') or ''
                    steps.append({'k': 'call', 'n': c['name'], 'a': c['arguments'], 'w': int(c['name'] in WR), 'st': st, 'res': res[:260]})
            dk = s['task_id'] + ':' + str(s['trial'])
            diff = dd[key].get(dk, {})
            cases['%s/%s/%d' % ck] = {
                'model': label, 'task': s['task_id'], 'trial': s['trial'],
                'instr': t['user_scenario']['instructions'],
                'gold': [{'n': a['name'], 'a': a['arguments']} for a in gold],
                'nl': [{'a': x['nl_assertion'], 'met': x['met'], 'j': x['justification'][:500]} for x in nl],
                'ac': [{'n': x['action']['name'], 'type': x['tool_type'], 'ok': x['action_match']} for x in ac],
                'reward': r['reward'], 'db': r['db_check']['db_match'], 'basis': r['reward_basis'],
                'diff': diff.get('diff', []), 'cost': s['agent_cost'], 'dur': s['duration'], 'term': s['termination_reason'],
                'steps': steps}

null_air = json.load(open(os.path.join(A, 'regrade_airline.json')))
null_tel = json.load(open(os.path.join(A, 'regrade_telecom.json')))
null_ret = json.load(open(os.path.join(A, 'null_env_retail.json')))
meta = {
    'source': 'tau2-bench leaderboard trajectory files (Sierra, MIT), airline domain, four trials per task, user simulator GPT-5.2, submissions dated 2026-02-26; read 2026-10-04',
    'urls': {'gpt52': 'https://sierra-tau-bench-public.s3.us-west-2.amazonaws.com/submissions/gpt-5-2_sierra_2026-02-26/trajectories/gpt-5.2_high_airline_gpt-5.2_4trials.json',
             'opus45': 'https://sierra-tau-bench-public.s3.us-west-2.amazonaws.com/submissions/claude-opus-4-5_sierra_2026-02-26/trajectories/claude-opus-4-5_high_airline_gpt-5.2_4trials.json'},
    'models': {k: l for k, _, l in FILES},
    'cols': ['model', 'task', 'trial', 'reward', 'db', 'nl_n', 'nl_met', 'ac_n', 'ac_ok', 'acw_n', 'acw_ok', 'gold_w', 'agent_w', 'w_matched', 'w_extra', 'calls', 'turns', 'agent_cost', 'user_cost', 'dur_s'],
    'null': {'airline': {'pass': null_air['null_pass'], 'n': null_air['n_tasks'], 'tasks': [t for t, r in null_air['null'] if r == 1.0], 'basis': 'full reward (DB and COMMUNICATE)'},
             'retail': {'pass': sum(r for _, r in null_ret['null']), 'n': len(null_ret['null']), 'basis': 'DB component only (the NL-assertion component needs an LLM judge and was not run)'},
             'telecom': {'pass': null_tel['null_pass'], 'n': null_tel['n_tasks'], 'basis': 'full reward'}},
    'regrade': {'airline': null_air['regrade_same'], 'telecom': null_tel['regrade_same']},
    'max_steps': 200, 'max_errors': 10, 'tau2_commit': '5bfa7e37b36656b37dc6d022156be6563c1007f3', 'match': MATCH}
json.dump({'meta': meta, 'rows': rows}, open(os.path.join(OUT, 'tau2_airline_trials.json'), 'w'), separators=(',', ':'))
json.dump(cases, open(os.path.join(OUT, 'tau2_cases.json'), 'w'), separators=(',', ':'))
print(len(rows), 'rows;', len(cases), 'cases;', os.path.getsize(os.path.join(OUT, 'tau2_cases.json')), 'bytes of cases')
