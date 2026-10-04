"""MT-Bench (Zheng et al. 2023) recounts from released files.
Inputs (downloaded to RAW, not committed; URLs below):
  gpt-4_pair.jsonl  https://huggingface.co/spaces/lmsys/mt-bench/resolve/main/data/mt_bench/model_judgment/gpt-4_pair.jsonl
     (GPT-4 judge, each model against gpt-3.5-turbo, both orders: g1 = model_1 shown first, g2 = swapped; winners mapped back to model names)
  human + gpt4_pair parquet  https://huggingface.co/datasets/lmsys/mt_bench_human_judgments
Outputs: inputs/mtbench_summary.json
"""
import json, sys, collections, os
RAW = sys.argv[1]
OUT = os.path.join(os.path.dirname(__file__), 'inputs', 'mtbench_summary.json')
rows = [json.loads(l) for l in open(os.path.join(RAW, 'gpt-4_pair.jsonl'))]
def pos(rs):
    c = collections.Counter()
    for r in rs:
        a, b = r['g1_winner'], r['g2_winner']
        if 'error' in (a, b): c['error'] += 1
        elif a == b: c['consistent'] += 1
        # g1: model_1 is in position A; g2: model_2 is in position A
        elif (a, b) in [('model_1', 'model_2'), ('model_1', 'tie'), ('tie', 'model_2')]: c['first'] += 1
        else: c['second'] += 1
    n = sum(c.values())
    return dict(n=n, **{k: c[k] for k in ['consistent', 'first', 'second', 'error']},
                pct={k: round(100 * c[k] / n, 1) for k in ['consistent', 'first', 'second', 'error']})
out = {'released_pair_file': {'all': pos(rows)}}
for t in [1, 2]:
    out['released_pair_file']['turn%d' % t] = pos([r for r in rows if r['turn'] == t])
# only non-math prompts (pair-v2), as in Table 2's open questions
out['released_pair_file']['general_prompt'] = pos([r for r in rows if r['judge'][1].startswith('pair-v2')])
out['released_pair_file']['math_reference_prompt'] = pos([r for r in rows if r['judge'][1].startswith('pair-math')])
# exact flips (winner A in one order, winner A in the other): strict flips
strict = collections.Counter((r['g1_winner'], r['g2_winner']) for r in rows)
out['released_pair_file']['strict_flips'] = {'first': strict[('model_1', 'model_2')], 'second': strict[('model_2', 'model_1')]}

# self-enhancement: GPT-4 judge vs humans on identical (question, turn, pair)
import pandas as pd
H = pd.read_parquet([os.path.join(RAW, f) for f in os.listdir(RAW) if f.startswith('human-')][0])
G = pd.read_parquet([os.path.join(RAW, f) for f in os.listdir(RAW) if f.startswith('gpt4_pair-')][0])
def winrates(D):
    w = collections.Counter(); g = collections.Counter()
    for _, r in D.iterrows():
        if r['winner'] not in ('model_a', 'model_b'): continue  # win rate without ties, as in the paper's Figure 2
        win = r['model_a'] if r['winner'] == 'model_a' else r['model_b']
        for m in (r['model_a'], r['model_b']): g[m] += 1
        w[win] += 1
    return {m: dict(wins=w[m], games=g[m], rate=round(100 * w[m] / g[m], 1)) for m in sorted(g)}
out['win_rate_no_ties'] = {'human': winrates(H), 'gpt4_pair': winrates(G),
                           'n_human_votes': int(len(H)), 'n_gpt4_votes': int(len(G))}
# Matched: only (question, turn, pair) keys that humans also judged
key = lambda r: (r['question_id'], r['turn'], tuple(sorted((r['model_a'], r['model_b']))))
hk = set(key(r) for _, r in H.iterrows())
Gm = G[[key(r) in hk for _, r in G.iterrows()]]
out['win_rate_no_ties']['gpt4_pair_matched'] = winrates(Gm)
out['win_rate_no_ties']['n_gpt4_matched'] = int(len(Gm))
json.dump(out, open(OUT, 'w'), indent=1)
print(json.dumps(out, indent=1)[:3000])
