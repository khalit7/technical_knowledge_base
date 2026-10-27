"""Reduce the released RocketEval data (fetched by fetch_data.sh into a cache dir) to the small inputs/released.json
the page and recompute.py read. Nothing here is estimated: every number is counted from the released files.
usage: sh fetch_data.sh /tmp/rocketeval_cache && python3 mk_data.py /tmp/rocketeval_cache"""
import ast, csv, json, math, os, sys
from collections import Counter
C = sys.argv[1] if len(sys.argv) > 1 else '/tmp/rocketeval_cache'
HERE = os.path.dirname(os.path.abspath(__file__))
P = lambda f: os.path.join(C, f)
L = lambda x: ast.literal_eval(x) if isinstance(x, str) else x
ok = lambda x: x is not None and x == x
jl = lambda f: [json.loads(l) for l in open(P(f))]
SHORT = {'gpt-4-turbo-2024-04-09': 'GPT-4 Turbo', 'claude-3-opus-20240229': 'Claude 3 Opus', 'Meta-Llama-3-70B-Instruct': 'Llama 3 70B',
         'claude-3-sonnet-20240229': 'Claude 3 Sonnet', 'reka-core-20240501': 'Reka Core', 'mistral-large-2402': 'Mistral Large',
         'Meta-Llama-3-8B-Instruct': 'Llama 3 8B', 'dbrx-instruct@together': 'DBRX', 'Llama-2-70b-chat-hf': 'Llama 2 70B',
         'gemma-7b-it': 'Gemma 7B', 'Llama-2-7b-chat-hf': 'Llama 2 7B', 'gemma-2b-it': 'Gemma 2B'}
test = json.load(open(P('wildbench_test.json'))); train = json.load(open(P('wildbench_train.json')))
out = {'source': 'Released data: huggingface.co/datasets/Joinn/RocketEval (wildbench score/gpt-4o, checklist, judgment) and github.com/Joinn99/RocketEval-ICLR config/rankings; MT-Bench human judgments from huggingface.co/datasets/lmsys/mt_bench_human_judgments'}
# 1. GPT-4o's released WildBench grades of the 12 test models, on the queries all 12 have
S, use = {}, {}
for t in test:
    rows = json.load(open(P('score_%s.json' % t['name'])))
    S[t['name']] = {r['session_id']: int(float(r['score'])) for r in rows}
    pt = ct = 0
    for r in rows:
        m = L(r['meta_data']); pt += m['usage']['prompt_tokens']; ct += m['usage']['completion_tokens']
    use[t['name']] = [len(rows), pt, ct]
Q = sorted(set.intersection(*[set(v) for v in S.values()]))
enc = lambda s: 'A' if s == 10 else str(s)
out['test'] = [{'name': t['name'], 'short': SHORT[t['name']], 'elo': round(t['rating'], 2), 'lo': round(t['lower'], 2), 'hi': round(t['upper'], 2),
                'g': ''.join(enc(S[t['name']][q]) for q in Q), 'n': use[t['name']][0], 'tin': use[t['name']][1], 'tout': use[t['name']][2]} for t in test]
out['nq'] = len(Q)
# 2. the supervised head's weight alpha per query, from the 10 training models' GPT-4o grades (score.py kl_uniform_weight)
T = {t['name']: {r['session_id']: int(float(r['score'])) for r in json.load(open(P('score_%s.json' % t['name'])))} for t in train}
QT = sorted(set.intersection(*[set(v) for v in T.values()]))
def alpha(labels, k=10):
    h = [c / len(labels) for c in Counter(labels).values()]
    kl = sum(p * math.log(p * k) for p in h)
    return (math.log(k) - kl) / math.log(k)
al = [alpha([T[m][q] for m in T]) for q in QT]
out['alpha'] = {'n': len(al), 'hist': [sum(1 for a in al if i / 10 <= a < (i + 1) / 10 or (i == 9 and a == 1)) for i in range(10)],
                'mean': round(sum(al) / len(al), 4), 'median': round(sorted(al)[len(al) // 2], 4), 'zero': sum(1 for a in al if a == 0),
                'distinct': dict(Counter(len(set(T[m][q] for m in T)) for q in QT)), 'train': [t['name'] for t in train]}
# 3. checklists: items per query
ck = {r['session_id']: L(r['checklist']) for r in jl('wildbench_checklist_checklist.jsonl')}
out['ck_len'] = dict(sorted(Counter(len(v) for v in ck.values()).items())); out['ck_n'] = len(ck)
# 4. the three released WildBench judgments: per response, the soft (Eq. 1, mean x 9 + 1) and hard (Yes/No) scores beside GPT-4o's grade
J = [('Qwen2.5-0.5B', 'wildbench_judgment_Qwen2.5-0.5B-Instruct_Meta-Llama-3-8B-Instruct.jsonl', 'Meta-Llama-3-8B-Instruct'),
     ('Qwen2.5-3B', 'wildbench_judgment_Qwen2.5-3B-Instruct_Meta-Llama-3-8B-Instruct.jsonl', 'Meta-Llama-3-8B-Instruct'),
     ('Llama-3-8B', 'wildbench_judgment_Llama-3-8B-Instruct_gpt-4-turbo-2024-04-09.jsonl', 'gpt-4-turbo-2024-04-09')]
out['judges'] = []
for name, f, model in J:
    gs = {r['session_id']: int(float(r['score'])) for r in json.load(open(P('score_%s.json' % model)))}
    rows, allp, none, nresp = [], [], 0, 0
    for r in jl(f):
        p0 = L(r['norm_probability']); nresp += 1; none += sum(not ok(x) for x in p0)
        p = [x for x in p0 if ok(x)]
        if not p or r['session_id'] not in gs: continue
        allp += p
        rows.append([round(sum(p) / len(p) * 9 + 1, 2), round(sum(x > 0.5 for x in p) / len(p) * 9 + 1, 2), gs[r['session_id']]])
    out['judges'].append({'judge': name, 'model': SHORT[model], 'rows': rows, 'items': len(allp), 'none': none, 'responses': nresp,
                          'hist': [sum(1 for x in allp if i / 20 <= x < (i + 1) / 20 or (i == 19 and x == 1)) for i in range(20)]})
# 5. four real gradings for the replay (query, GPT-4o checklist, Llama 3 8B's answer, both Qwen judges, GPT-4o's grade and verdict)
Qx = {r['session_id']: r for r in jl('wildbench_query.jsonl')}
Rx = {r['session_id']: r for r in jl('wildbench_response_Meta-Llama-3-8B-Instruct.jsonl')}
j5 = {r['session_id']: L(r['norm_probability']) for r in jl(J[0][1])}; j3 = {r['session_id']: L(r['norm_probability']) for r in jl(J[1][1])}
G = {r['session_id']: r for r in json.load(open(P('score_Meta-Llama-3-8B-Instruct.json')))}
out['samples'] = []
for sid in ['8a814e3a2ca24a27', '5bbf66b50b484f55', 'f41bb5bf57c8481c', 'd0668eb3f96047d4']:
    g = L(G[sid]['parsed_result'])
    out['samples'].append({'id': sid, 'tag': Qx[sid].get('primary_tag'), 'q': L(Qx[sid]['conversation_input'])[-1]['content'].strip(),
                           'resp': L(Rx[sid]['output'])[0].strip(), 'ck': ck[sid], 'p05': [round(x, 3) for x in j5[sid]], 'p3': [round(x, 3) for x in j3[sid]],
                           'g': int(float(G[sid]['score'])), 'gs': g.get('strengths', ''), 'gw': g.get('weaknesses', '')})
# 6. MT-Bench: the only human-judged pairs whose released RocketEval judgments exist (gpt-4, claude-v1, vicuna-13b-v1.2)
H = list(csv.DictReader(open(P('mt_human.csv'))))
def mt_scores(j, M):
    D = {}
    for m in M:
        for r in jl('mt_j_%s_%s.jsonl' % (j, m)):
            p = [x for x in r['norm_probability'] if ok(x)]
            q = int(r['session_id'][7:].split('turn')[0]); t = int(r['session_id'].split('turn')[1]) + 1
            D[(m, q, t)] = sum(p) / len(p) * 9 + 1 if p else None
    return D
G4 = {(r['model'], r['question_id'], r['turn']): r['score'] for r in jl('gpt4_single.jsonl')}
def agree(M, D):
    a = n = 0
    for r in H:
        if not (r['model_a'] in M and r['model_b'] in M): continue
        x = D.get((r['model_a'], int(r['question_id']), int(r['turn']))); y = D.get((r['model_b'], int(r['question_id']), int(r['turn'])))
        if x is None or y is None or x < 0 or y < 0: continue
        d = x - y; pred = 'tie' if abs(d) < 0.1 else ('model_a' if d > 0 else 'model_b'); n += 1; a += pred == r['winner']
    return [n, a]
def hh(M):
    g = {}
    for r in H:
        if not (r['model_a'] in M and r['model_b'] in M): continue
        w = r['winner'] if r['winner'] == 'tie' else (r['model_a'] if r['winner'] == 'model_a' else r['model_b'])
        g.setdefault((r['question_id'], tuple(sorted([r['model_a'], r['model_b']])), r['turn']), []).append((r['judge'], w))
    a = n = 0
    for v in g.values():
        for i in range(len(v)):
            for k in range(i + 1, len(v)):
                if v[i][0] != v[k][0]: n += 1; a += v[i][1] == v[k][1]
    return [n, a]
M3, M2 = ['gpt-4', 'claude-v1', 'vicuna-13b-v1.2'], ['gpt-4', 'claude-v1']
out['mt'] = {'votes_all': len(H), 'ties_all': sum(r['winner'] == 'tie' for r in H),
             'three': {'votes': sum(1 for r in H if r['model_a'] in M3 and r['model_b'] in M3), 'ties': sum(1 for r in H if r['model_a'] in M3 and r['model_b'] in M3 and r['winner'] == 'tie'),
                       'q05': agree(M3, mt_scores('Qwen2.5-0.5B-Instruct', M3)), 'q3': agree(M3, mt_scores('Qwen2.5-3B-Instruct', M3)), 'hh': hh(M3)},
             'two': {'q05': agree(M2, mt_scores('Qwen2.5-0.5B-Instruct', M2)), 'q3': agree(M2, mt_scores('Qwen2.5-3B-Instruct', M2)), 'gpt4': agree(M2, G4), 'hh': hh(M2)},
             'hh_all6': hh(['gpt-4', 'claude-v1', 'vicuna-13b-v1.2', 'gpt-3.5-turbo', 'alpaca-13b', 'llama-13b'])}
json.dump(out, open(os.path.join(HERE, 'inputs', 'released.json'), 'w'), separators=(',', ':'), ensure_ascii=False)
print('released.json', os.path.getsize(os.path.join(HERE, 'inputs', 'released.json')), 'bytes; queries', len(Q), 'alpha', out['alpha']['mean'], out['alpha']['median'], out['alpha']['zero'], 'mt', out['mt'])
