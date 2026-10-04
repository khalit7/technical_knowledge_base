"""Arena-Hard-Auto v0.1 recounts from released judgments (Li et al. 2024, arXiv 2406.11939).
Inputs (RAW/ah, not committed): https://huggingface.co/datasets/lmarena-ai/arena-hard-auto
  data/arena-hard-v0.1/model_judgment/<judge>/<model>.jsonl   (500 prompts, each judged twice)
  game 1: Assistant A = baseline gpt-4-0314, B = candidate;  game 2: positions swapped (checked on the prompt text).
Verdict labels A>>B, A>B, A=B, B>A, B>>A. Here every verdict is reduced to its sign (strong = weak), ties count half.
Outputs: inputs/arenahard_summary.json
"""
import json, sys, os, glob, collections, statistics as st
RAW = os.path.join(sys.argv[1], 'ah')
OUT = os.path.join(os.path.dirname(__file__), 'inputs', 'arenahard_summary.json')
RAWV = {'A>>B': 2, 'A>B': 1, 'A=B': 0, 'B>A': -1, 'B>>A': -2, 'A<B': -1, 'A<<B': -2}
FAM = lambda m: ('OpenAI' if m.startswith('gpt') else 'Anthropic' if m.startswith('claude') else
                 'Google' if m.startswith('gemini') else 'Meta' if m.lower().startswith('llama') else 'Other')
NORM = {'Llama-2-70b-chat-hf': 'llama-2-70b-chat', 'Mixtral-8x7B-Instruct-v0.1': 'mixtral-8x7b-instruct-v0.1',
        'Qwen1.5-72B-Chat': 'qwen1.5-72b-chat', 'Yi-34B-Chat': 'yi-34b-chat'}
data = collections.defaultdict(dict)   # judge -> model -> uid -> (raw1, raw2) positional (+ favours A)
for f in glob.glob(os.path.join(RAW, '*', '*.jsonl')):
    judge = os.path.basename(os.path.dirname(f))
    if judge in ('ans',): continue
    model = os.path.basename(f)[:-6]; model = NORM.get(model, model)
    d = {}
    for l in open(f):
        x = json.loads(l)
        g = x['games']
        if len(g) != 2: continue
        s = [gg.get('score') for gg in g]
        if any(v not in RAWV for v in s): continue
        d[x['uid']] = (RAWV[s[0]], RAWV[s[1]])
    data[judge][model] = d
sgn = lambda v: (v > 0) - (v < 0)
def cand(r1, r2):  # candidate-perspective signs: game1 candidate is B, game2 candidate is A
    return -sgn(r1), sgn(r2)
summary = {'judges': {}, 'cells': {}, 'flip_rows': {}}
for j, mods in sorted(data.items()):
    n = cons = prim = rec = 0
    for m, d in mods.items():
        for uid, (r1, r2) in d.items():
            c1, c2 = cand(r1, r2); n += 1
            if c1 == c2: cons += 1
            elif sgn(r1) >= 0 and sgn(r2) >= 0: prim += 1   # leaned to position A both times
            elif sgn(r1) <= 0 and sgn(r2) <= 0: rec += 1
    summary['judges'][j] = dict(n=n, models=len(mods), consistent=round(100 * cons / n, 1),
                                primacy=round(100 * prim / n, 1), recency=round(100 * rec / n, 1), family=FAM(j))
    for m, d in mods.items():
        w = []; w1 = []; w2 = []
        for uid, (r1, r2) in d.items():
            c1, c2 = cand(r1, r2)
            w1.append((c1 + 1) / 2); w2.append((c2 + 1) / 2)
        summary['cells'].setdefault(m, {})[j] = dict(n=len(d), first_order=round(100 * st.mean(w1), 1),
            swapped=round(100 * st.mean(w2), 1), both=round(50 * (st.mean(w1) + st.mean(w2)), 1))
# self-preference: own judge's score minus the mean of the other judges' scores, models judged by all five
judges = sorted(data)
common = [m for m in summary['cells'] if all(j in summary['cells'][m] for j in judges)]
summary['common_models'] = common
sp = {}
for j in judges:
    rows = []
    for m in common:
        own = summary['cells'][m][j]['both']
        oth = st.mean(summary['cells'][m][k]['both'] for k in judges if k != j)
        rows.append(dict(model=m, family=FAM(m), own=own, others=round(oth, 1), delta=round(own - oth, 1)))
    same = [r['delta'] for r in rows if r['family'] == FAM(j)]
    diff = [r['delta'] for r in rows if r['family'] != FAM(j)]
    sp[j] = dict(rows=rows, same_family_mean=round(st.mean(same), 1) if same else None,
                 other_family_mean=round(st.mean(diff), 1) if diff else None)
summary['self_pref'] = sp
json.dump(summary, open(OUT, 'w'), indent=1)
print(json.dumps(summary['judges'], indent=1)); print(common)
for j in judges: print(j, sp[j]['same_family_mean'], sp[j]['other_family_mean'], [(r['model'][:14], r['delta']) for r in sp[j]['rows']])
