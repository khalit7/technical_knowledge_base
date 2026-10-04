"""Build the page's data (parts/30_js_data.js, window.ES) from real released or locally computed per-item results.

Inputs (all in inputs/ unless noted):
  race_qwen25.json, race_qwen3.json  RACE-H test, 600 passages run, first 400 used, every question; next-token probabilities over A-D
                                     (run_race.py, run locally 2026-10-04 on Qwen2.5-0.5B-Instruct and Qwen3-0.6B).
  ../../production_eval_engineering/src/inputs/gate_data.json
                                     LMSYS's released MT-Bench GPT-4 single-answer grades, 34 models x 160 turns.
  ../../../topic_benchmarks/math/src/inputs/matharena_samples.json
                                     every MathArena final answer, AIME 2025, AIME 2026, HMMT February 2026 (CC BY-NC-SA 4.0).
  mt_human.parquet (scratch; https://huggingface.co/datasets/lmsys/mt_bench_human_judgments, split "human")
                                     -> inputs/mt_human_votes.json (written here the first time, then reused).
usage: uv run --with pyarrow python3 mk_data.py [path to mt_human.parquet]
"""
import json, os, sys, collections
H = os.path.dirname(os.path.abspath(__file__))
I = lambda *p: os.path.join(H, 'inputs', *p)
B36 = '0123456789abcdefghijklmnopqrstuvwxyz'
def e2(k):
    return B36[k // 36] + B36[k % 36]

ES = {}
# ---- RACE-H, two small open models, same questions ----
NPASS = 400  # cap: the first 400 passages of the seed-0 shuffle (both runs cover at least these; keeps the offline run near 20 minutes)
R = [json.load(open(I(f))) for f in ['race_qwen25.json', 'race_qwen3.json']]
items0 = [x for x in R[0]['items'] if x['c'] < NPASS]
items1 = [x for x in R[1]['items'] if x['c'] < NPASS]
assert len(items0) == len(items1)
for a, b in zip(items0, items1):
    assert a['c'] == b['c'] and a['g'] == b['g']
sizes = collections.Counter(x['c'] for x in items0)
ES['race'] = {
    'src': 'RACE-H test (ehovy/race), %d of 1,045 passages (first of a seed-0 shuffle), all %d of their questions; zero-shot, next-token probabilities over A-D' % (NPASS, len(items0)),
    'models': ['Qwen2.5-0.5B-Instruct', 'Qwen3-0.6B'],
    'csize': ''.join(B36[sizes[c]] for c in range(len(sizes))),  # questions per passage, in order
    'p': [''.join(e2(round(1000 * x['p'][x['g']])) for x in it) for it in (items0, items1)],  # P(correct letter) x1000
    'g': [''.join('1' if max(range(4), key=lambda j: x['p'][j]) == x['g'] else '0' for x in it) for it in (items0, items1)],
}
# ---- MT-Bench GPT-4 grades (34 models), clusters = the two turns of one question ----
G = json.load(open(os.path.join(H, '../../production_eval_engineering/src/inputs/gate_data.json')))
qcat = {it['q']: it['c'] for it in G['items']}
ES['mtb'] = {'order': G['order'], 'cat': [qcat[q] for q, t in G['order']], 'models': G['models'],
             'src': G['judge'] + '; LMSYS gpt-4_single.jsonl via gate_data.json'}
# ---- MathArena: solves per problem out of the runs ----
M = json.load(open(os.path.join(H, '../../../topic_benchmarks/math/src/inputs/matharena_samples.json')))
ma = []
for c in M['comps']:
    n = len(c['answer_dict'])
    ms = []
    for m in c['models']:
        r, s = m['r'], m['s']
        if '--' in [s[i:i + 2] for i in range(0, len(s), 2)]:
            continue
        sol = ''
        for p in range(n):
            sol += str(sum(1 for k in range(r) if s[2 * (p * r + k):2 * (p * r + k) + 2] == '00'))
        ms.append({'n': m['n'], 'r': r, 's': sol, 'acc': m['acc'], 'ci': m['ci']})
    ma.append({'name': c['name'], 'n': n, 'models': ms})
ES['ma'] = ma
# ---- MT-Bench expert human votes: several judges on the same (question, turn, model pair) ----
HV = I('mt_human_votes.json')
if not os.path.exists(HV):
    import pyarrow.parquet as pq
    t = pq.read_table(sys.argv[1], columns=['question_id', 'model_a', 'model_b', 'winner', 'judge', 'turn']).to_pylist()
    g = collections.defaultdict(lambda: collections.defaultdict(list))
    for r in t:
        a, b = sorted([r['model_a'], r['model_b']])
        w = r['winner']
        v = 1 if w.startswith('tie') else (2 if (w == 'model_a') == (r['model_a'] == a) else 0)
        g[(a, b)][(r['question_id'], r['turn'])].append(v)
    out = []
    for (a, b), its in sorted(g.items(), key=lambda kv: -sum(len(v) for v in kv[1].values())):
        out.append({'a': a, 'b': b, 'items': [[q, tn, ''.join(map(str, v))] for (q, tn), v in sorted(its.items())]})
    json.dump({'src': 'https://huggingface.co/datasets/lmsys/mt_bench_human_judgments (human split, 3,355 votes); vote 2 = first model (alphabetical) wins, 1 = tie, 0 = second wins',
               'pairs': out}, open(HV, 'w'), separators=(',', ':'))
ES['hv'] = json.load(open(HV))
js = '// Real per-item data for Eval statistics, built by src/mk_data.py (see its docstring for sources). Decoders in 31_js_common.js.\n'
js += 'window.ES=' + json.dumps(ES, separators=(',', ':'), ensure_ascii=False) + ';\n'
open(os.path.join(H, 'parts', '30_js_data.js'), 'w').write(js)
print('bytes', len(js.encode()), 'race q', len(items0), 'passages', len(sizes), 'ma', [(c['name'], len(c['models'])) for c in ma])
