"""Extract the two real pairs used by the Judge bias lab animations into inputs/pairs.json (small, committed).
RAW = scratch folder holding the downloads described in arenahard.py and alpaca.py.
Pair 1: Arena-Hard-Auto v0.1 prompt uid 4e5a75c6a5fb492ab529fc41d1d669ea, candidate claude-3-opus-20240229
        against the baseline gpt-4-0314, judged in both orders by five released judges.
Pair 2: AlpacaEval 2 instruction 'What is the largest ocean in the world?', gpt4_1106_preview asked to be concise
        and asked to be verbose, each judged by weighted_alpaca_eval_gpt4_turbo against gpt4_1106_preview's default answer.
"""
import json, sys, os, re
RAW = sys.argv[1]; OUT = os.path.join(os.path.dirname(__file__), 'inputs', 'pairs.json')
UID = '4e5a75c6a5fb492ab529fc41d1d669ea'; CAND = 'claude-3-opus-20240229'
J = ['gpt-4-1106-preview', 'claude-3-opus-20240229', 'claude-3-5-sonnet-20240620', 'gemini-1.5-pro-api-0514', 'llama-3-70b-instruct']
q = [json.loads(l) for l in open(os.path.join(RAW, 'ah', 'question.jsonl'))]
q = [x for x in q if x['uid'] == UID][0]
ans = lambda m: [json.loads(l) for l in open(os.path.join(RAW, 'ah', 'ans', m + '.jsonl')) if json.loads(l)['uid'] == UID][0]['messages'][-1]['content']['answer']
p1 = dict(source='https://huggingface.co/datasets/lmarena-ai/arena-hard-auto (data/arena-hard-v0.1)', uid=UID,
          category=q['cluster'], prompt=q['prompt'], baseline='gpt-4-0314', candidate=CAND,
          answer_baseline=ans('gpt-4-0314'), answer_candidate=ans(CAND), judges={})
for j in J:
    for l in open(os.path.join(RAW, 'ah', j, CAND + '.jsonl')):
        x = json.loads(l)
        if x['uid'] != UID: continue
        gs = []
        for g in x['games']:
            gs.append(dict(score=g['score'], judgment=g['judgment'].strip()))
        p1['judges'][j] = gs
pv = {}
for k in ['concise', 'verbose']:
    for r in json.load(open(os.path.join(RAW, 'ae', 'gpt4_1106_preview_%s.ann.json' % k))):
        if r['instruction'] == 'What is the largest ocean in the world?':
            pv[k] = dict(output=r['output_2'], preference=float(r['preference']), baseline=r['output_1'])
p2 = dict(source='https://github.com/tatsu-lab/alpaca_eval/tree/main/results', instruction='What is the largest ocean in the world?',
          judge='weighted_alpaca_eval_gpt4_turbo (gpt-4-1106-preview)', baseline_output=pv['concise']['baseline'],
          concise=dict(output=pv['concise']['output'], p_win=round(pv['concise']['preference'] - 1, 6)),
          verbose=dict(output=pv['verbose']['output'], p_win=round(pv['verbose']['preference'] - 1, 6)))
assert pv['concise']['baseline'] == pv['verbose']['baseline']
json.dump(dict(dice=p1, ocean=p2), open(OUT, 'w'), indent=1, ensure_ascii=False)
print(os.path.getsize(OUT))
for j, g in p1['judges'].items(): print(j, [x['score'] for x in g])
