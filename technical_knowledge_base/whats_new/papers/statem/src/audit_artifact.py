"""Audit the authors' released DeepSeek-V4-Flash + StateM Terminal-Bench 2.1 artifact (440 trials, 88 tasks x 5).

The artifact (37 MB packed, 206 MB unpacked) is not kept in the repo. To rebuild inputs/deepseek_trials.json:
  B=https://github.com/henryqin1997/statem/releases/download/deepseek-policy9-tb21-artifacts-20260818
  curl -sLO $B/statem-deepseek-v4-flash-0731-policy9-88task-k5-public-redacted-20260813.tar.gz
  mkdir art && tar xzf statem-deepseek-*-redacted-20260813.tar.gz -C art
  python3 audit_artifact.py art/statem-deepseek-v4-flash-0731-policy9-88task-k5-public-redacted-20260813
Writes inputs/deepseek_trials.json: one compact row per trial, the job totals, which focused gate each
trial selected, and the full StateM history of a few trials (check outputs trimmed) for the replay tab.
"""
import collections, glob, json, os, sys
from datetime import datetime

A = sys.argv[1]
HERE = os.path.dirname(os.path.abspath(__file__))
J = lambda p: json.load(open(p))
ts = lambda s: datetime.fromisoformat(s.replace('Z', '+00:00')).timestamp()
NODES = ['direct_solve', 'task_contract_check', 'self_review', 'soft_guard', 'focused_guard', 'guard_evidence_check', 'repair', 'handoff']
dirs = sorted(d for d in glob.glob(A + '/*__*') if os.path.isdir(d))
tasks = sorted({os.path.basename(d).split('__')[0] for d in dirs})
rows, gate_tasks, replay_src = [], collections.defaultdict(set), {}
for d in dirs:
    name = os.path.basename(d); task = name.split('__')[0]
    r = J(d + '/result.json'); ar = r['agent_result']
    rew = (r.get('verifier_result') or {}).get('rewards', {}).get('reward', 0) or 0
    exc = (r.get('exception_info') or {}).get('exception_type')
    sec = ts(r['agent_execution']['finished_at']) - ts(r['agent_execution']['started_at'])
    S = d + '/agent/statem/'
    h = J(S + 'history.json')['history']
    t0 = ts(h[0]['ts'])
    ng = sum(e['event'] == 'goto' for e in h)
    real = man = 0
    for e in h:
        if e['event'] != 'goto_blocked': continue
        fl = [x for x in (e.get('results') or []) if x.get('passed') is False and x.get('type') != 'manual']
        fl += [x for x in ((e.get('dynamic_before_transfer') or {}).get('results') or []) if x.get('passed') is False]
        if fl: real += 1
        else: man += 1
    cur = J(S + 'current.json')['current']
    vs = J(S + 'verification-selection.json') if os.path.exists(S + 'verification-selection.json') else {}
    gates = [t['name'] for t in vs.get('templates', []) if isinstance(t, dict) and t.get('name')]
    for g in gates: gate_tasks[g].add(task)
    rows.append([tasks.index(task), name.split('__')[1], rew, round(ar['cost_usd'] or 0, 6), ar['n_input_tokens'], ar['n_cache_tokens'], ar['n_output_tokens'],
                 round(sec), 1 if exc == 'AgentTimeoutError' else (2 if exc else 0), ng, real, man, NODES.index(cur), vs.get('recommended_route', ''), gates])
    replay_src[name] = (d, h, t0, rew, exc, ar, sec)

def trim(s, n=260):
    s = (s or '').strip().replace('\r', '')
    return s if len(s) <= n else s[:n].rstrip() + ' [...]'

def replay(name):
    d, h, t0, rew, exc, ar, sec = replay_src[name]
    ev = []
    for e in h:
        k = e['event']; t = round(ts(e['ts']) - t0)
        if k == 'start': ev.append([t, 'start', e.get('current'), '', '', []]); continue
        if k == 'in_hook':
            ev.append([t, 'in_hook', e.get('node'), '', '', [[x.get('type'), 'in_hook', 1 if x.get('passed') else 0, trim(x.get('output'), 200)] for x in e.get('results') or [] if (x.get('output') or '').strip()][:3]]); continue
        chk = []
        if k == 'goto':
            for part in ('before_transfer', 'condition', 'out_hook', 'edge_hook', 'in_hook'):
                v = e.get(part)
                res = v.get('results') if isinstance(v, dict) else v
                for x in (res or []):
                    if isinstance(x, dict) and (x.get('output') or '').strip() and x.get('output') != 'checklist confirmation not required by spec':
                        chk.append([x.get('type'), part, 1 if x.get('passed', True) else 0, trim(x.get('output'))])
            for x in ((e.get('dynamic_before_transfer') or {}).get('results') or []):
                chk.append([x.get('type'), 'dynamic', 1 if x.get('passed', True) else 0, trim(x.get('output'))])
        else:
            for x in (e.get('results') or []):
                if x.get('passed') is False:
                    chk.append([x.get('type'), x.get('purpose'), 0, trim(x.get('output'))])
            for x in ((e.get('dynamic_before_transfer') or {}).get('results') or []):
                if x.get('passed') is False: chk.append([x.get('type'), 'dynamic', 0, trim(x.get('output'))])
        ev.append([t, k, e.get('from'), e.get('to'), e.get('stage', ''), chk[:4]])
    task = open(d + '/agent/statem/task.txt').read().strip()
    return {'trial': name, 'task': name.split('__')[0], 'prompt': trim(task, 700), 'reward': rew, 'exc': exc or '', 'cost': round(ar['cost_usd'], 4),
            'in': ar['n_input_tokens'], 'cache': ar['n_cache_tokens'], 'out': ar['n_output_tokens'], 'sec': round(sec), 'events': ev}

# replay picks: chosen by rule, not by eye, so the choice is reproducible
by = lambda f: [n for n, (d, h, t0, rew, exc, ar, sec) in sorted(replay_src.items()) if f(n, h, rew, exc)]
real_of = {tasks[r[0]] + '__' + r[1]: r[10] for r in rows}
picks = []
def first(lst, why):
    for n in lst:
        if n not in [p[0] for p in picks]: picks.append((n, why)); return
first(sorted(by(lambda n, h, rew, exc: n.startswith('configure-git-webserver') and rew == 1), key=lambda n: -real_of[n]), 'configure-git-webserver, the paper\'s worked example (Table 3); the passing trial with the most blocked transitions')
first(sorted(by(lambda n, h, rew, exc: rew == 1), key=lambda n: -real_of[n]), 'the passing trial with the most transitions blocked by a failing host check')
first(by(lambda n, h, rew, exc: rew == 1 and real_of[n] == 0 and len(h) <= 8), 'a passing trial that went straight through: no gate fired')
first(sorted(by(lambda n, h, rew, exc: rew == 0 and not exc and real_of[n] > 0), key=lambda n: -real_of[n]), 'a failing trial: gates fired, the run reached handoff, the verifier still said no')
first(by(lambda n, h, rew, exc: exc == 'AgentTimeoutError'), 'a timeout: the agent never left its first state')
first(by(lambda n, h, rew, exc: n.startswith('dna-insert') and rew == 1), 'dna-insert, one of the four tasks the leaderboard judge flagged on the GPT-5.6 submission')
out = {'source': 'https://github.com/henryqin1997/statem/releases/tag/deepseek-policy9-tb21-artifacts-20260818',
       'job': J(A + '/result.json')['id'], 'tasks': tasks, 'nodes': NODES,
       'cols': ['task', 'trial', 'reward', 'cost_usd', 'in_tok', 'cache_tok', 'out_tok', 'agent_sec', 'exc(1=timeout)', 'gotos', 'blocked_by_failing_check', 'blocked_manual_only', 'final_node', 'route', 'gates'],
       'rows': rows, 'gate_tasks': {g: sorted(v) for g, v in sorted(gate_tasks.items())},
       'job_result': {k: J(A + '/result.json')['stats'][k] for k in ('n_completed_trials', 'n_errored_trials', 'n_retries')},
       'replays': [dict(replay(n), why=w) for n, w in picks]}
open(os.path.join(HERE, 'inputs', 'deepseek_trials.json'), 'w').write(json.dumps(out, separators=(',', ':'), ensure_ascii=False))
print('trials', len(rows), 'tasks', len(tasks), 'replays', [p[0] for p in picks], 'bytes', os.path.getsize(os.path.join(HERE, 'inputs', 'deepseek_trials.json')))
