"""Reduce the large downloads (kept outside the repo) to the small extracts in inputs/.

Usage: python3 mk_inputs.py <download dir>
The download dir holds (all fetched 2026-10-04):
  lcb_perf.json        https://livecodebench.github.io/performances_generation.json
  hep.jsonl.gz         https://github.com/evalplus/humanevalplus_release/releases/download/v0.1.10/HumanEvalPlus.jsonl.gz
  HumanEval.jsonl.gz   https://github.com/openai/human-eval/raw/master/data/HumanEval.jsonl.gz
  verified_rows.json   princeton-nlp/SWE-bench_Verified, test split, all 500 rows via datasets-server.huggingface.co
  rebench_payload.txt  the data payload embedded in https://swe-rebench.com/ (Next.js flight data)
  tv.py                django tests/auth_tests/test_validators.py at d26b2424437dabeeca94d7900b37d2df4410da0c
"""
import gzip, json, re, sys, datetime as dt, collections, os
D = sys.argv[1]
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'inputs')

# ---- LiveCodeBench: per-problem results for every model on the official board ----
lcb = json.load(open(os.path.join(D, 'lcb_perf.json')))
probs = {}
for p in lcb['performances']:
    probs.setdefault(p['question_id'], (p['date'], p['difficulty'], p['platform']))
qids = sorted(probs, key=lambda q: (probs[q][0], q))
by = collections.defaultdict(dict)
for p in lcb['performances']:
    by[p['model']][p['question_id']] = p['pass@1']
models = []
for m in lcb['models']:
    name = m['model_repr']; r = by[name]
    vals = sorted(set(round(v, 4) for v in r.values()))
    steps = [v for v in vals if 0 < v < 100]
    n = 1 if not steps else round(100 / min(steps))
    s = ''.join('0123456789abcdefghij'[round(r[q] * n / 100)] for q in qids)
    models.append({'m': name, 'n': n, 'mark': dt.datetime.utcfromtimestamp(m['release_date'] / 1000).strftime('%Y-%m-%d'), 'c': s})
json.dump({'src': 'https://livecodebench.github.io/performances_generation.json', 'read': '2026-10-04',
           'note': 'c[i] is the number of correct samples out of n for problem i (base-20 digit); mark is the date LiveCodeBench stores for the model (its contamination marker).',
           'q': [[q, dt.datetime.utcfromtimestamp(probs[q][0] / 1000).strftime('%Y-%m-%d'), probs[q][1][0], probs[q][2][0]] for q in qids],
           'models': models}, open(os.path.join(OUT, 'lcb_compact.json'), 'w'), separators=(',', ':'))

# ---- HumanEval/31 (is_prime): base and HumanEval+ inputs with the reference outputs ----
P = {json.loads(l)['task_id']: json.loads(l) for l in gzip.open(os.path.join(D, 'hep.jsonl.gz'))}
H = {json.loads(l)['task_id']: json.loads(l) for l in gzip.open(os.path.join(D, 'HumanEval.jsonl.gz'))}
p = P['HumanEval/31']
json.dump({'src': ['https://github.com/openai/human-eval', 'https://github.com/evalplus/humanevalplus_release/releases/tag/v0.1.10'],
           'prompt': H['HumanEval/31']['prompt'], 'test': H['HumanEval/31']['test'], 'contract': p['contract'],
           'canonical': p['canonical_solution'], 'base': [a[0] for a in p['base_input']], 'plus': [a[0] for a in p['plus_input']],
           'counts': {'humaneval_tasks': len(H), 'base_inputs_all': sum(len(x['base_input']) for x in P.values()),
                      'plus_inputs_all': sum(len(x['plus_input']) for x in P.values()),
                      'base_asserts_mean': sum(h['test'].count('assert candidate') for h in H.values()) / len(H)}},
          open(os.path.join(OUT, 'humaneval31.json'), 'w'), indent=0)

# ---- SWE-bench Verified: the django-11099 task in full, and dataset statistics ----
rows = json.load(open(os.path.join(D, 'verified_rows.json')))
t = [r for r in rows if r['instance_id'] == 'django__django-11099'][0]
t = dict(t); t['FAIL_TO_PASS'] = json.loads(t['FAIL_TO_PASS']); t['PASS_TO_PASS'] = json.loads(t['PASS_TO_PASS'])
tv = open(os.path.join(D, 'tv.py')).read()
t['validator_tests_at_base'] = tv[tv.index('class UsernameValidatorsTests'):tv.index('v(invalid)', tv.index('def test_ascii_validator')) + 10]
t['src'] = 'https://huggingface.co/datasets/princeton-nlp/SWE-bench_Verified'
json.dump(t, open(os.path.join(OUT, 'swe_django_11099.json'), 'w'), indent=1, ensure_ascii=False)

def added(pt):
    out = []
    for l in pt.splitlines():
        if l.startswith('+') and not l.startswith('+++'):
            s = l[1:].strip()
            if len(s) >= 12 and not s.startswith('#'): out.append(s)
    return out
norm = lambda s: re.sub(r'\s+', '', s)
stats = {'n': len(rows), 'difficulty': collections.Counter(r['difficulty'] for r in rows),
         'repos': collections.Counter(r['repo'] for r in rows).most_common(),
         'files': collections.Counter(len(re.findall(r'^diff --git', r['patch'], re.M)) for r in rows),
         'lines': [sum(1 for l in r['patch'].splitlines() if l[:1] in '+-' and not l.startswith(('+++', '---'))) for r in rows],
         'f2p': [len(json.loads(r['FAIL_TO_PASS'])) for r in rows], 'p2p': [len(json.loads(r['PASS_TO_PASS'])) for r in rows],
         'year': collections.Counter(r['created_at'][:4] for r in rows),
         'created_max': max(r['created_at'] for r in rows), 'created_min': min(r['created_at'] for r in rows)}
leak = []
for r in rows:
    a = added(r['patch'])
    if not a: continue
    ps = norm(r['problem_statement'])
    hit = sum(1 for x in a if norm(x) in ps)
    if hit: leak.append([r['instance_id'], hit, len(a)])
stats['leak_rule'] = 'an added line of the gold patch, at least 12 characters after stripping and not a comment, appears verbatim (whitespace ignored) in the problem statement'
stats['leak'] = leak; stats['leak_eligible'] = sum(1 for r in rows if added(r['patch']))
json.dump(stats, open(os.path.join(OUT, 'verified_stats.json'), 'w'), separators=(',', ':'))

# ---- SWE-rebench: score before and after each model's release date ----
s = open(os.path.join(D, 'rebench_payload.txt')).read()
i = s.find('"items":[')
items, _ = json.JSONDecoder().raw_decode(s[i + 8:])
pr = [(m.group(1), m.group(2)) for m in re.finditer(r'\{"problem":"([^"]+)","link":"[^"]*","date":"([0-9-]+)"', s)]
Dd = lambda ms: dt.datetime.utcfromtimestamp(int(ms) / 1000).strftime('%Y-%m-%d')
cnt = lambda a, b: sum(1 for _, d in pr if a <= d < b)
split = []
for x in items:
    if x['agentVersion'] != 'tools': continue
    rs = x['rangeStats']['all']; rel = x['release']['date']
    keys = [(Dd(k.split(':')[0]), Dd(k.split(':')[1]), v) for k, v in rs.items()]
    lo = Dd(x['taskRangeTimestamp']['from']); hi = Dd(x['taskRangeTimestamp']['to'])
    grid = sorted(set([k[0] for k in keys] + [k[1] for k in keys]))
    up = [g for g in grid if g >= rel]
    if not up or rel <= lo or up[0] >= hi: continue
    gb = max(g for g in grid if g <= rel); ga = up[0]
    pre = [v for a, b, v in keys if a == lo and b == gb]; post = [v for a, b, v in keys if a == ga and b == hi]
    if not pre or not post: continue
    n0, n1 = cnt(lo, gb), cnt(ga, hi)
    if n0 < 20 or n1 < 20: continue
    split.append({'m': x['modelName'], 'rel': rel, 'pre': [lo, gb, n0, round(pre[0]['resolvedRate'], 2), round(pre[0]['sem'], 2)],
                  'post': [ga, hi, n1, round(post[0]['resolvedRate'], 2), round(post[0]['sem'], 2)]})
cur = [x for x in items if x['agentVersion'] == 'tools' and Dd(x['taskRangeTimestamp']['to']) == '2026-07-01']
json.dump({'src': 'https://swe-rebench.com/', 'read': '2026-10-04', 'n_problems': len(pr),
           'rule': 'pre: tasks from the start of the model\'s range to the half-month mark at or before its release date; post: from the first half-month mark at or after release to the end of its range; both sides at least 20 tasks. Rates and SEMs as published for each range.',
           'split': split}, open(os.path.join(OUT, 'rebench_split.json'), 'w'), indent=0)
print('lcb', len(qids), 'models', len(models), 'split', len(split), 'leak', len(leak))
