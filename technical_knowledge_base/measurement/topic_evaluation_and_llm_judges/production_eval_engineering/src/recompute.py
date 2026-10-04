"""Recompute every number the page's JavaScript shows, independently of it, from inputs/gate_data.json.
Run: uv run --with scipy python3 recompute.py   (writes recompute.json; check_core.mjs compares the page's JS to it)."""
import json, math, os, itertools
from scipy import stats
H = os.path.dirname(os.path.abspath(__file__))
D = json.load(open(os.path.join(H, 'inputs', 'gate_data.json')))
CATS = ['writing', 'roleplay', 'reasoning', 'math', 'coding', 'extraction', 'stem', 'humanities']
qcat = {it['q']: it['c'] for it in D['items']}
catOf = [qcat[q] for q, t in D['order']]
dec = lambda s: [None if ch == '.' else (ord(ch) - 97 + 2) / 2 for ch in s]
M = {m: dec(s) for m, s in D['models']}
def mean(a): v = [x for x in a if x is not None]; return sum(v) / len(v)
def paired(A, B, mask=None, conf=.95):
    d = [B[i] - A[i] for i in range(len(A)) if (mask is None or mask(i)) and A[i] is not None and B[i] is not None]
    n = len(d); m = sum(d) / n; sd = math.sqrt(sum((x - m) ** 2 for x in d) / (n - 1)); se = sd / math.sqrt(n)
    t = stats.t.ppf(1 - (1 - conf) / 2, n - 1)   # exact quantile; the page uses a Cornish-Fisher approximation
    return dict(n=n, mean=m, lo=m - t * se, hi=m + t * se, worse=sum(x < 0 for x in d), same=sum(x == 0 for x in d), better=sum(x > 0 for x in d))
def gate(A, B, aggTol=.25, sliceTol=.5, conf=.95, escalate=True, aggSig=False):
    agg = paired(A, B, None, conf)
    aggFail = (agg['mean'] <= -aggTol and agg['hi'] < 0) if aggSig else agg['mean'] <= -aggTol
    sl = {}
    for c in CATS:
        r = paired(A, B, lambda i: catOf[i] == c, conf)
        r['v'] = ('fail' if r['hi'] < 0 else ('escalate' if escalate else 'pass')) if r['mean'] <= -sliceTol else 'pass'
        sl[c] = r
    return agg, 'fail' if aggFail else 'pass', sl
out = {}
A, B = M['claude-v1'], M['claude-instant-v1']
agg, aggV, sl = gate(A, B)
out['swap'] = dict(agg=agg, aggV=aggV, slices=sl, champ_mean=mean(A), chall_mean=mean(B))
# leaderboard check: published 7.90 (Claude-1) and 7.85 (Claude-Instant-1)
sB = sum(x for x in B if x is not None)
out['leaderboard'] = dict(claude_v1=round(mean(A), 3), instant_dropped=round(mean(B), 3), instant_minus1_in=round((sB - 1) / 160, 3), published=[7.90, 7.85])
# judge cost at GPT-4 8K prices, May 2023: $0.03 / 1K prompt, $0.06 / 1K completion
JT = D['judge_tokens']
out['judge'] = dict(calls=JT['calls'], cost=(JT['prompt'] * 30 + JT['completion'] * 60) / 1e6, per_call=(JT['prompt'] * 30 + JT['completion'] * 60) / 1e6 / JT['calls'],
                    tokens_per_call=(JT['prompt'] + JT['completion']) / JT['calls'])
out['parse_failures'] = len(D['parse_failures'])
la = sum(i['la'] for i in D['items']); lb = sum(i['lb'] for i in D['items'])
out['cost_gate'] = dict(prompt_ratio=11.02 / 1.63, completion_ratio=32.68 / 5.51, chars=[la, lb], shorter_pct=100 * (1 - lb / la))
# all ordered pairs at the default settings
n_pass = n_hidden = 0
for a, b in itertools.permutations(M, 2):
    g = gate(M[a], M[b])
    if g[1] == 'pass':
        n_pass += 1
        if any(r['v'] == 'fail' for r in g[2].values()): n_hidden += 1
out['all_pairs'] = dict(pairs=len(M) * (len(M) - 1), agg_pass=n_pass, agg_pass_slice_fail=n_hidden)
# frontier at a 75% prompt share
P = {'gpt-4': (30, 60), 'gpt-3.5-turbo': (2, 2), 'claude-v1': (11.02, 32.68), 'claude-instant-v1': (1.63, 5.51)}
fr = {}
for s in (0.0, 0.75, 0.95):
    pts = {m: (s * p[0] + (1 - s) * p[1], mean(M[m])) for m, p in P.items()}
    fr[str(s)] = sorted(m for m, (c, q) in pts.items() if not any(o != m and pts[o][0] <= c and pts[o][1] >= q and (pts[o][0] < c or pts[o][1] > q) for o in pts))
out['frontier'] = fr
out['t_quantiles'] = {f'{c}_{df}': stats.t.ppf(1 - (1 - c) / 2, df) for c in (.9, .95, .99) for df in (18, 19, 158)}
json.dump(out, open(os.path.join(H, 'recompute.json'), 'w'), indent=1, default=float)
print(json.dumps({k: out[k] for k in ['leaderboard', 'judge', 'parse_failures', 'cost_gate', 'all_pairs', 'frontier']}, indent=1))
print('writing', sl['writing']['mean'], sl['writing']['lo'], sl['writing']['hi'], 'agg', agg['mean'], agg['lo'], agg['hi'])
