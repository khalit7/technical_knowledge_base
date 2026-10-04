"""Build the page's MT-Bench data (src/inputs/mtbench_votes.json) from released files.

Raw inputs (downloaded to RAW, not committed; about 70 MB):
  human.parquet   expert and author pairwise votes, 3,355 rows
                  https://huggingface.co/datasets/lmsys/mt_bench_human_judgments (split "human")
  g4pair.parquet  GPT-4 pairwise judgments of the same six models, all 15 pairs, both orders combined
                  (an order disagreement is released as "tie (inconsistent)"), split "gpt4_pair"
  gpt-4_pair.jsonl  the MT-Bench leaderboard run: GPT-4 judging each model against gpt-3.5-turbo,
                  with the verdict of each order (g1 = model_1 shown first, g2 = swapped)
                  https://huggingface.co/spaces/lmsys/mt-bench/resolve/main/data/mt_bench/model_judgment/gpt-4_pair.jsonl
  gpt-4_single.jsonl  GPT-4 single-answer grading, 1 to 10, same space, model_judgment/gpt-4_single.jsonl
Usage: uv run --with pandas --with pyarrow python src/mk_data.py RAW
"""
import json, os, sys, re, collections
import pandas as pd

RAW = sys.argv[1]
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'inputs', 'mtbench_votes.json')
MODELS = ['gpt-4', 'claude-v1', 'gpt-3.5-turbo', 'vicuna-13b-v1.2', 'alpaca-13b', 'llama-13b']
MI = {m: i for i, m in enumerate(MODELS)}

H = pd.read_parquet(os.path.join(RAW, 'human.parquet'))
G = pd.read_parquet(os.path.join(RAW, 'g4pair.parquet'))

def words(conv, turn):
    # the assistant's answer for this turn, exactly as the voter saw it
    asst = [m['content'] for m in conv if m['role'] == 'assistant']
    return len(re.findall(r'\S+', asst[turn - 1])) if len(asst) >= turn else -1

def canon(r):
    a, b = r['model_a'], r['model_b']
    lo, hi = sorted((a, b), key=lambda m: MI[m])
    return (int(r['question_id']), int(r['turn']), MI[lo], MI[hi]), a, b

def verdict(w, a, b, lo):
    # 0 = canonical first model wins, 1 = second wins, 2 = tie
    if w.startswith('tie'):
        return 2
    win = a if w == 'model_a' else b
    return 0 if MI[win] == lo else 1

keys = {}
def key_rec(k):
    if k not in keys:
        keys[k] = {'k': k, 'P': None, 'Pinc': 0, 'sa': None, 'sb': None, 'f': None, 's': None, 'la': None, 'lb': None}
    return keys[k]

for _, r in G.iterrows():
    k, a, b = canon(r)
    rec = key_rec(k)
    rec['P'] = verdict(r['winner'], a, b, k[2])
    rec['Pinc'] = 1 if r['winner'] == 'tie (inconsistent)' else 0

votes = []
voters = {}
for _, r in H.iterrows():
    k, a, b = canon(r)
    rec = key_rec(k)
    la, lb = words(r['conversation_a'], k[1]), words(r['conversation_b'], k[1])
    if MI[a] != k[2]:
        la, lb = lb, la
    rec['la'], rec['lb'] = la, lb
    v = r['judge']
    voters.setdefault(v, len(voters))
    votes.append([k, verdict(r['winner'], a, b, k[2]), voters[v]])

# GPT-4 single-answer grades (1 to 10); the released file grades vicuna-13b-v1.3, not the v1.2 the humans saw
S = {}
for l in open(os.path.join(RAW, 'gpt-4_single.jsonl')):
    j = json.loads(l)
    S[(int(j['question_id']), j['model'], j['turn'])] = j['score']
for k, rec in keys.items():
    sa = S.get((k[0], MODELS[k[2]], k[1])); sb = S.get((k[0], MODELS[k[3]], k[1]))
    if sa is not None and sb is not None and sa >= 0 and sb >= 0:
        rec['sa'], rec['sb'] = sa, sb

# leaderboard run with per-order verdicts (pairs against gpt-3.5-turbo)
for l in open(os.path.join(RAW, 'gpt-4_pair.jsonl')):
    j = json.loads(l)
    m1, m2 = j['model_1'], j['model_2']
    if m1 not in MI or m2 not in MI:
        continue
    lo, hi = sorted((m1, m2), key=lambda m: MI[m])
    k = (int(j['question_id']), int(j['turn']), MI[lo], MI[hi])
    if k not in keys:
        continue
    mp = {'model_1': m1, 'model_2': m2}
    def vv(w):
        if w == 'tie': return 2
        if w not in mp: return None
        return 0 if mp[w] == lo else 1
    g1, g2 = vv(j['g1_winner']), vv(j['g2_winner'])
    if g1 is None or g2 is None:
        continue
    rec = keys[k]
    # f: verdict with the canonical first model shown first; s: with it shown second
    rec['f'], rec['s'] = (g1, g2) if m1 == lo else (g2, g1)

voted = set(k for k, _, _ in votes)
klist = sorted(k for k in keys if k in voted)  # only keys a human voted on
kidx = {k: i for i, k in enumerate(klist)}
K = []
for k in klist:
    r = keys[k]
    n = lambda x: -1 if x is None else x
    K.append([k[0], k[1], k[2], k[3], n(r['P']), r['Pinc'], n(r['sa']), n(r['sb']), n(r['f']), n(r['s']), n(r['la']), n(r['lb'])])
V = [[kidx[k], h, w] for k, h, w in votes]
vnames = sorted(voters, key=voters.get)
out = {
    'about': 'MT-Bench (Zheng et al. 2023) released judgments, built by mk_data.py. keys: [question, turn, model i, model j (i<j), '
             'GPT-4 pair verdict both orders (0 i wins, 1 j wins, 2 tie, -1 none), 1 if that tie is an order disagreement, '
             'GPT-4 single score i, score j (-1 none), leaderboard-run verdict with i shown first, with j shown first (-1 none), '
             'words in i answer, words in j answer]. votes: [key index, human verdict, voter index].',
    'models': MODELS,
    'voters': ['e' if v.startswith('expert') else 'a' for v in vnames],
    'keys': K, 'votes': V,
}
os.makedirs(os.path.dirname(OUT), exist_ok=True)
json.dump(out, open(OUT, 'w'), separators=(',', ':'))
print('keys', len(K), 'votes', len(V), 'voters', len(vnames), 'bytes', os.path.getsize(OUT))
print('keys with order verdicts', sum(1 for x in K if x[8] >= 0), 'with single', sum(1 for x in K if x[6] >= 0))
