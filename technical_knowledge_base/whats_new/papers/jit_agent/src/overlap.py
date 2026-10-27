"""Do the released training harnesses (HF dataset JIT-Agent/jit-meta-harness, 2,852 rows) contain the
benchmark test tasks the paper reports on? Matches each test query (from the released repo's dataset/)
against every training task_instruction after normalising whitespace and case: a query counts as found when any of four 60-character windows (start, a third, half, two thirds in) occurs in a training instruction.
usage: python3 overlap.py <scaffolds.jsonl> <JIT repo checkout>   (writes inputs/overlap.json)
  scaffolds.jsonl: https://huggingface.co/datasets/JIT-Agent/jit-meta-harness/resolve/main/train/scaffolds.jsonl (102 MB, not kept)
  repo: git clone --depth 1 https://github.com/bingreeky/JIT  (commit ababa06, 27 Aug 2026)"""
import json, re, sys, glob, os, collections, csv
rows = [json.loads(l) for l in open(sys.argv[1])]
R = sys.argv[2]
norm = lambda s: re.sub(r'\s+', ' ', s).strip().lower()
train = [norm(r['task_instruction']) for r in rows]
blob = '\n'.join(train)
src = collections.Counter()
for r in rows:
    m = re.search(r'/workspace/([A-Za-z_]+)', r['task_instruction'])
    k = m.group(1) if m else ('clawgym' if 'ClawGym task' in r['task_instruction'] else 'other')
    if k.startswith('ps_'): k = 'ps_*'
    src[k] += 1
tests = {}
def add(name, texts): tests[name] = [norm(t) for t in texts if t and len(t) > 40]
add('DeepPlanning-Shopping', [q['query'] for f in sorted(glob.glob(R + '/dataset/deepplanning_shopping/data/level_*_query_meta.json')) for q in json.load(open(f))])
add('DeepPlanning-Travel (en)', [q['query'] for q in json.load(open(R + '/dataset/deepplanning_travel/data/travelplanning_query_en.json'))])
add('DeepPlanning-Travel (zh)', [q['query'] for q in json.load(open(R + '/dataset/deepplanning_travel/data/travelplanning_query_zh.json'))])
add('AgentIF-OneDay', [json.loads(l)['description'] for l in open(R + '/dataset/agentif_oneday/data.jsonl')])
add('OfficeBench', [json.loads(l)['question'] for l in open(R + '/dataset/officebench/data.jsonl')])
add('DeepSearchQA', [r['problem'] for r in csv.DictReader(open(R + '/dataset/deepsearchqa/DSQA-full.csv'))])
out = {'training_rows': len(rows), 'unique_instructions': len(set(train)), 'sources': dict(src.most_common()), 'benchmarks': {}}
for name, qs in tests.items():
    hit = 0; hit_rows = 0
    for q in qs:
        L = len(q); keys = [q[i:i + 60] for i in (0, L // 3, L // 2, 2 * L // 3) if L >= i + 60]
        n = max([blob.count(k) for k in keys] or [blob.count(q)])
        if n: hit += 1; hit_rows += n
    out['benchmarks'][name] = {'test_items': len(qs), 'found_in_training': hit, 'training_rows_matching': hit_rows}
    print(f'{name:28s} {hit:4d} of {len(qs):4d} test queries appear in training ({hit_rows} rows)')
os.makedirs('inputs', exist_ok=True)
json.dump(out, open('inputs/overlap.json', 'w'), indent=1)
print(out['sources'])

# Near-duplicates: share of each test query's word 6-grams found in the closest training instruction (Latin text),
# or character 12-grams for Chinese text.
def grams(s, zh):
    if zh: s = re.sub(r'\s', '', s); return {s[i:i + 12] for i in range(max(0, len(s) - 11))}
    w = re.findall(r'\w+', s); return {' '.join(w[i:i + 6]) for i in range(max(0, len(w) - 5))}
env = {'DeepPlanning-Shopping': 'deepplanning_shopping', 'DeepPlanning-Travel (en)': 'deepplanning_travel', 'DeepPlanning-Travel (zh)': 'deepplanning_travel', 'AgentIF-OneDay': '/workspace/agentif'}
for name, key in env.items():
    zh = 'zh' in name
    tr = [grams(t[t.find('## user request'):] if '## user request' in t else t, zh) for t, r in zip(train, rows) if key in r['task_instruction']]
    best = []
    for q in tests[name]:
        g = grams(q, zh)
        best.append(max(len(g & t) / max(1, len(g)) for t in tr) if g else 0)
    best.sort()
    ws = {re.search(r'/workspace/[\w/]+', r['task_instruction']).group(0) for r in rows if key in r['task_instruction']}
    out['benchmarks'][name].update({'training_rows_same_env': len(tr), 'distinct_workspaces': len(ws), 'max_shared_ngram_share': round(best[-1], 3), 'median_best_shared_ngram_share': round(best[len(best) // 2], 3)})
    print(f'{name:28s} env rows {len(tr)}, workspaces {len(ws)}, best-match shared n-grams: median {best[len(best)//2]:.2f}, max {best[-1]:.2f}')
json.dump(out, open('inputs/overlap.json', 'w'), indent=1)

# Are the DeepPlanning training tasks variants of the test cases they are named after?
# Training workspaces are named like deepplanning_shopping/level1_case10 or deepplanning_travel/travel_zh_1.
# (1) Shopping: each test case has its own product database. For every training row, count the (brand, colour) pairs
#     its request names that exist in its namesake case's database against the average over the other 49 cases of that level.
# (2) Travel: character 4-gram similarity of each training request to its namesake test query against the best other test query.
def req(t):
    i = t.find('## User Request'); t = t[i + 15:] if i >= 0 else t
    return re.split(r'## Workspace', t)[0].strip()
db = {}
for lvl in (1, 2, 3):
    for d in glob.glob(R + '/dataset/deepplanning_shopping/database_level%d/case_*' % lvl):
        ps = [json.loads(l) for l in open(d + '/products.jsonl')]
        db[(lvl, int(d.rsplit('_', 1)[1]))] = {(p['brand'].lower(), p['color'].lower()) for p in ps}
own_hits = other_hits = n_rows = top = 0
for r in rows:
    m = re.search(r'/workspace/deepplanning_shopping/level(\d)_case(\d+)', r['task_instruction'])
    if not m: continue
    lvl, case = int(m.group(1)), int(m.group(2)); q = req(r['task_instruction']).lower()
    if (lvl, case) not in db: continue
    score = lambda k: sum(1 for b, c in db[k] if b in q and c in q)
    others = [score(k) for k in db if k[0] == lvl and k != (lvl, case)]
    s_own = score((lvl, case)); n_rows += 1; own_hits += s_own; other_hits += sum(others) / len(others)
    top += s_own > max(others)
out['shopping_namesake'] = {'rows': n_rows, 'mean_pairs_in_own_case_db': round(own_hits / n_rows, 2), 'mean_pairs_in_other_case_db': round(other_hits / n_rows, 2), 'rows_where_own_case_matches_best': top}
print('Shopping training rows checked', n_rows, 'brand-colour pairs found in own case DB', round(own_hits / n_rows, 2), 'vs other cases', round(other_hits / n_rows, 2), '; own case strictly best in', top)
tq = {('zh', q['id']): q['query'] for q in json.load(open(R + '/dataset/deepplanning_travel/data/travelplanning_query_zh.json'))}
tq.update({('en', q['id']): q['query'] for q in json.load(open(R + '/dataset/deepplanning_travel/data/travelplanning_query_en.json'))})
g4 = lambda s: {s[i:i + 4] for i in range(len(s) - 3)}
TG = {k: g4(re.sub(r'\s', '', v)) for k, v in tq.items()}
n = best = 0; sims = []
for r in rows:
    m = re.search(r'/workspace/deepplanning_travel/travel_(zh|en)_(\d+)', r['task_instruction'])
    if not m: continue
    key = (m.group(1), m.group(2))
    if key not in TG: continue
    g = g4(re.sub(r'\s', '', req(r['task_instruction'])))
    j = lambda k: len(g & TG[k]) / max(1, len(g | TG[k]))
    own = j(key); oth = max(j(k) for k in TG if k[0] == key[0] and k != key)
    n += 1; best += own > oth; sims.append((own, oth))
out['travel_namesake'] = {'rows': n, 'rows_most_similar_to_namesake': best, 'median_own': round(sorted(s[0] for s in sims)[n // 2], 3), 'median_best_other': round(sorted(s[1] for s in sims)[n // 2], 3)}
print('Travel training rows', n, 'most similar to their namesake test query:', best, out['travel_namesake'])
json.dump(out, open('inputs/overlap.json', 'w'), indent=1)

# The worked example: training row in workspace level1_case10 asks for a Uniqlo black XL long-sleeve top, a Bosideng
# navy-blue XL jacket, a Columbia gold XL summer polo and a Zara olive-green XL top. Which level-1 case databases hold all four?
def has(case, brand, color, word):
    for l in open(R + '/dataset/deepplanning_shopping/database_level1/%s/products.jsonl' % case):
        p = json.loads(l)
        if p['brand'].lower() == brand and color in p['color'].lower() and p['size'] == 'XL' and word in (p['name'] + ' ' + p.get('suitable_season', '')).lower(): return True
    return False
items = [('uniqlo', 'black', 'long-sleeve'), ('bosideng', 'navy', ''), ('columbia', 'gold', 'polo'), ('zara', 'olive', '')]
cases = sorted(os.path.basename(d) for d in glob.glob(R + '/dataset/deepplanning_shopping/database_level1/case_*'))
allfour = [c for c in cases if all(has(c, *it) for it in items)]
out['shopping_example'] = {'workspace': 'deepplanning_shopping/level1_case10', 'cases_checked': len(cases), 'cases_with_all_four_items': allfour}
print('level1_case10 example: level-1 cases holding all four requested items:', allfour, 'of', len(cases))
json.dump(out, open('inputs/overlap.json', 'w'), indent=1)
