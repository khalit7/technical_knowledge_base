"""Measure the 2,852 released training harnesses (HF dataset JIT-Agent/jit-meta-harness, "a subset of the training data")
and pick a small gallery for the page. Classification uses stated keyword rules on each module's docstring (first paragraph);
they are heuristics, reported as such. usage: python3 harness_stats.py <scaffolds.jsonl>   (writes inputs/harness_stats.json)"""
import json, re, sys, random, collections
rows = [json.loads(l) for l in open(sys.argv[1])]
def doc(s):
    m = re.match(r'\s*(?:#[^\n]*\n|from __future__[^\n]*\n|\s)*[rR]?"""(.*?)"""', s, re.S)
    return re.sub(r'\s+', ' ', m.group(1)).strip() if m else ''
def first_para(s):
    m = re.match(r'\s*(?:#[^\n]*\n|\s)*[rR]?"""(.*?)(?:\n\s*\n|""")', s, re.S)
    return re.sub(r'\s+', ' ', m.group(1)).strip().lower() if m else ''
def source(t):
    m = re.search(r'/workspace/([A-Za-z_]+)', t)
    k = m.group(1) if m else ('clawgym' if 'ClawGym task' in t else None)
    if k is None: k = 'short QA or web-app task' if len(t) < 2500 else 'other'
    return {'deepplanning_shopping': 'DeepPlanning-Shopping environment', 'deepplanning_travel': 'DeepPlanning-Travel environment',
            'agentif': 'AgentIF-style workspace', 'clawgym': 'ClawGym', 'apex_agents': 'APEX-Agents'}.get(k, 'ps_* research workspaces' if k.startswith('ps_') else k)
RULES = {
    'tool_all': (r'^(all|flat|full)toolspolicy|no filtering|\b(all|full|entire|every)\b.{0,40}\b(tools?|catalog(ue)?|registry)\b', r'filtered|filters|subset|phase|gate|gated|exposes only|restrict|hide|hidden|withh|depend|based on|selects|dynamic|adaptive|aware|stage|disable|unlock'),
    'plan_null': (r'no ?planning|no explicit plan|null directive|nullplanning|does not plan|no planner|pass-?through|no-?op', None),
    'mem_full': (r'full.?history|full history|keeps? (the )?(entire|full|complete)', r'compress|summar|fold|distill|evict|truncat|window|extract'),
}
def hit(text, rule):
    pos, neg = RULES[rule]
    if rule == 'tool_all' and re.match(r'(all|flat|full)toolspolicy:', text) and not re.search(r'sub-?polic|child', text): return True
    return bool(re.search(pos, text)) and not (neg and re.search(neg, text))
st = collections.Counter(); by_src = collections.defaultdict(collections.Counter)
lines = {k: [] for k in ('memory_py', 'planning_py', 'action_py', 'tool_policy_py', 'prompt_yaml')}
for r in rows:
    tp, pl, me = first_para(r['tool_policy_py']), first_para(r['planning_py']), first_para(r['memory_py'])
    f = {'tool_all': hit(tp, 'tool_all'), 'plan_null': hit(pl, 'plan_null'), 'mem_full': hit(me, 'mem_full')}
    f['react_like'] = f['tool_all'] and f['plan_null'] and f['mem_full']
    s = source(r['task_instruction'])
    st['rows'] += 1; by_src[s]['rows'] += 1
    for k, v in f.items():
        st[k] += v; by_src[s][k] += v
    for k in lines: lines[k].append(r[k].count('\n') + 1)
med = lambda v: sorted(v)[len(v) // 2]
stats = {'rows': len(rows), 'unique_tasks': len({r['task_instruction'] for r in rows}),
         'counts': dict(st), 'by_source': {k: dict(v) for k, v in sorted(by_src.items(), key=lambda kv: -kv[1]['rows'])},
         'median_lines': {k: med(v) for k, v in lines.items()}, 'median_total_lines': med([sum(x) for x in zip(*lines.values())]),
         'rules': {k: {'match': v[0], 'unless': v[1]} for k, v in RULES.items()}}
# gallery: two per main source, fixed seed
random.seed(7)
gal = []
want = ['DeepPlanning-Travel environment', 'DeepPlanning-Shopping environment', 'AgentIF-style workspace', 'ClawGym', 'ps_* research workspaces', 'short QA or web-app task']
for s in want:
    pool = [r for r in rows if source(r['task_instruction']) == s]
    for r in random.sample(pool, 2):
        t = r['task_instruction']
        i = t.find('## User Request'); task = t[i + 15:] if i >= 0 else t
        task = re.sub(r'\s+', ' ', re.split(r'## Workspace|## Output Directory|## Working Directory', task)[0]).strip()
        g = {'id': r['scaffold_id'], 'source': s, 'task': task[:420] + ('...' if len(task) > 420 else '')}
        for k, lab in (('memory_py', 'M'), ('planning_py', 'P'), ('action_py', 'A'), ('tool_policy_py', 'F')):
            d = doc(r[k]); g[lab] = {'doc': d[:300] + ('...' if len(d) > 300 else ''), 'lines': r[k].count('\n') + 1}
        g['flags'] = {'tool_all': hit(first_para(r['tool_policy_py']), 'tool_all'), 'plan_null': hit(first_para(r['planning_py']), 'plan_null'), 'mem_full': hit(first_para(r['memory_py']), 'mem_full')}
        gal.append(g)
stats['gallery'] = gal
json.dump(stats, open('inputs/harness_stats.json', 'w'), indent=1, ensure_ascii=False)
print(json.dumps({k: stats[k] for k in ('rows', 'unique_tasks', 'counts', 'median_lines', 'median_total_lines')}, indent=1))
for k, v in stats['by_source'].items(): print(k, v)
