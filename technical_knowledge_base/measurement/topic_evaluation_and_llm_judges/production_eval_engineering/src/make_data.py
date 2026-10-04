"""Build inputs/gate_data.json: one real model swap through a golden-set gate.
Champion claude-v1, challenger claude-instant-v1, on MT-Bench (80 questions x 2 turns, 8 categories of 10),
graded 1 to 10 by GPT-4 (single-answer grading, prompt single-v1 / single-v1-multi-turn), as released by LMSYS.
Raw inputs (downloaded to RAW, not committed):
  https://huggingface.co/spaces/lmsys/mt-bench/resolve/main/data/mt_bench/question.jsonl
  https://huggingface.co/spaces/lmsys/mt-bench/resolve/main/data/mt_bench/model_judgment/gpt-4_single.jsonl
  https://huggingface.co/spaces/lmsys/mt-bench/resolve/main/data/mt_bench/model_answer/claude-v1.jsonl
  https://huggingface.co/spaces/lmsys/mt-bench/resolve/main/data/mt_bench/model_answer/claude-instant-v1.jsonl
Run: uv run --with tiktoken python3 make_data.py RAW
Judge tokens are counted with tiktoken cl100k_base (GPT-4's tokenizer) on the released judge prompt and judgment text
(the short system prompt is not counted)."""
import json, sys, os, collections
import tiktoken
RAW = sys.argv[1]
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'inputs', 'gate_data.json')
A, B = 'claude-v1', 'claude-instant-v1'
enc = tiktoken.get_encoding('cl100k_base')
Q = {}
for l in open(os.path.join(RAW, 'question.jsonl')):
    q = json.loads(l); Q[q['question_id']] = q
J = {}
for l in open(os.path.join(RAW, 'gpt-4_single.jsonl')):
    r = json.loads(l)
    if r['model'] in (A, B): J[(r['model'], r['question_id'], r['turn'])] = r
ANS = {}
for m in (A, B):
    for l in open(os.path.join(RAW, 'ans_%s.jsonl' % m)):
        a = json.loads(l); ANS[(m, a['question_id'])] = a['choices'][0]['turns']
# mean score per model over all valid graded turns (reproduces the leaderboard figures)
means = {}
for m in (A, B):
    v = [r['score'] for k, r in J.items() if k[0] == m and r['score'] >= 0]
    means[m] = {'mean': round(sum(v) / len(v), 4), 'n': len(v)}
items = []
jtok = {'prompt': 0, 'completion': 0, 'calls': 0}
for qid in sorted(Q):
    q = Q[qid]
    for t in (1, 2):
        ra, rb = J[(A, qid, t)], J[(B, qid, t)]
        for r in (ra, rb):
            jtok['prompt'] += len(enc.encode(r['user_prompt'])); jtok['completion'] += len(enc.encode(r['judgment'])); jtok['calls'] += 1
        it = {'q': qid, 't': t, 'c': q['category'], 'p': q['turns'][t - 1][:110],
              'a': ra['score'], 'b': rb['score'],
              'la': len(ANS[(A, qid)][t - 1]), 'lb': len(ANS[(B, qid)][t - 1])}
        if rb['score'] >= 0 and rb['score'] < ra['score'] and ra['score'] - rb['score'] >= 3:
            it['jb'] = rb['judgment'][:320]
        items.append(it)
# every model's 160 grades for the Gate designer tab, encoded one character per graded turn:
# chr(97 + 2*score - 2) ('a' = 1, 'c' = 2, ..., 's' = 10; half points land on the odd letters), '.' = judgment failed to parse (score -1)
order = [(qid, t) for qid in sorted(Q) for t in (1, 2)]
allm = collections.defaultdict(dict)
for l in open(os.path.join(RAW, 'gpt-4_single.jsonl')):
    r = json.loads(l); allm[r['model']][(r['question_id'], r['turn'])] = r['score']
def enc_s(d):
    return ''.join('.' if d[k] < 0 else chr(97 + int(round(2 * d[k])) - 2) for k in order)
models = sorted(allm, key=lambda m: -sum(v for v in allm[m].values() if v >= 0) / sum(1 for v in allm[m].values() if v >= 0))
fail = [dict(model=m, q=k[0], t=k[1]) for m in models for k in order if allm[m][k] < 0]
bad = J[(B, 128, 2)]['judgment']
out = {'champion': A, 'challenger': B, 'judge': 'gpt-4 single-answer grading, 1 to 10', 'means': means,
       'judge_tokens': jtok, 'items': items,
       'order': order, 'models': [[m, enc_s(allm[m])] for m in models], 'parse_failures': fail,
       'failed_judgment_tail': bad[-300:], 'failed_judgment_len': len(bad)}
json.dump(out, open(OUT, 'w'), separators=(',', ':'))
print(OUT, os.path.getsize(OUT), means, jtok)
