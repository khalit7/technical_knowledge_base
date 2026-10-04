"""Recompute every number the Judge bias lab shows, independently of mk_data.py where possible.
usage: python3 recompute.py RAW   (RAW = folder with the downloads; see arenahard.py, alpaca.py, mtbench.py)
Reads parts/31_js_bias_data.js and checks it against fresh counts from the raw files."""
import json, os, sys, re, glob, math
H = os.path.dirname(os.path.abspath(__file__)); RAW = sys.argv[1]
js = open(os.path.join(H, '..', 'parts', '31_js_bias_data.js')).read()
D = json.loads(js[js.index('=') + 1:].rstrip().rstrip(';'))
ok = 0; bad = 0
def chk(name, got, want, tol=0.05):
    global ok, bad
    if abs(got - want) <= tol: ok += 1
    else: bad += 1; print('MISMATCH', name, got, want)
# 1. dice gold with floating-point DP (independent of the exact Fraction code)
p = [1.0]
for _ in range(100):
    q = [0.0] * (len(p) + 6)
    for i, c in enumerate(p):
        for f in range(1, 7): q[i + f] += c / 6
    p = q
cdf = 0; lo = hi = None
for s, v in enumerate(p):
    cdf += v
    if lo is None and cdf >= 0.025: lo = s
    if hi is None and cdf >= 0.975: hi = s
G = D['dice']['gold']
chk('gold lo', G['lo'], lo, 0); chk('gold hi', G['hi'], hi, 0)
chk('gold cover', G['cover'], 100 * sum(p[lo:hi + 1]), 0.01); chk('cand cover', G['cand_cover'], 100 * sum(p[347:354]), 0.05)
sd = math.sqrt(100 * 35 / 12); chk('normal half-width', 33.47, 1.96 * sd, 0.005); chk('wrong half-width', 3.35, 1.96 * sd / 10, 0.005)
# 2. the ten verdicts of the dice pair, straight from the raw judgment files, and the jury tallies
RV = {'A>>B': 2, 'A>B': 1, 'A=B': 0, 'B>A': -1, 'B>>A': -2, 'A<B': -1, 'A<<B': -2}  # a few judges wrote A<B
votes = {}
for j in D['dice']['judges']:
    rec = [json.loads(l) for l in open(os.path.join(RAW, 'ah', j['id'], 'claude-3-opus-20240229.jsonl')) if D['dice']['uid'] in l]
    rec = [r for r in rec if r['uid'] == D['dice']['uid']][0]
    sc = [g['score'] for g in rec['games']]
    assert sc == j['scores'], (j['id'], sc)
    votes[j['id']] = (-RV[sc[0]], RV[sc[1]])          # + favours the candidate
sg = lambda x: (x > 0) - (x < 0)
flat = [sg(x) for v in votes.values() for x in v]
chk('verdicts for baseline', flat.count(-1), 5, 0); chk('verdicts for candidate', flat.count(1), 5, 0)
comb = {k: (sg(a) if sg(a) == sg(b) else 0) for k, (a, b) in votes.items()}
chk('swap-checked ties', list(comb.values()).count(0), 3, 0)
chk('Sonnet right', comb['claude-3-5-sonnet-20240620'], -1, 0); chk('Opus own family', comb['claude-3-opus-20240229'], 1, 0)
# 3. position consistency of each Arena-Hard judge, recounted with a different reduction (per-file loop, string compare)
for row in D['pos'][1]['rows']:
    n = c = 0
    for f in glob.glob(os.path.join(RAW, 'ah', row['j'], '*.jsonl')):
        for l in open(f):
            g = json.loads(l)['games']
            if len(g) != 2 or g[0].get('score') not in RV or g[1].get('score') not in RV: continue
            n += 1; c += sg(-RV[g[0]['score']]) == sg(RV[g[1]['score']])
    chk('consistency ' + row['j'], row['c'], round(100 * c / n, 1), 0.051); chk('n ' + row['j'], row['n'], n, 0)
# 4. MT-Bench released pair file consistency
n = c = 0
for l in open(os.path.join(RAW, 'gpt-4_pair.jsonl')):
    r = json.loads(l); n += 1; c += r['g1_winner'] == r['g2_winner'] and r['g1_winner'] != 'error'
chk('mt consistency', D['pos'][2]['rows'][0]['c'], round(100 * c / n, 1), 0.051)
# 5. AlpacaEval raw win rates from annotations
for k in ['concise', 'verbose']:
    a = json.load(open(os.path.join(RAW, 'ae', 'gpt4_1106_preview_%s.ann.json' % k)))
    w = 100 * sum(float(x['preference']) - 1 for x in a) / len(a)
    chk('alpaca raw ' + k, D['length']['alpaca'][k]['raw'], w, 0.006)
A = D['length']['alpaca']
chk('raw gap', 41.4, A['verbose']['raw'] - A['concise']['raw'], 0.05); chk('lc gap', 9.7, A['verbose']['lc'] - A['concise']['lc'], 0.05)
chk('ocean concise p', D['ocean']['concise']['p_win'], 0.0000394, 0.000001); chk('ocean verbose p', D['ocean']['verbose']['p_win'], 0.999997, 0.000001)
# 6. self-preference means shown in the text
sp = {r['j']: r for r in D['selfp']['ah']['rows']}
chk('opus same', sp['claude-3-opus-20240229']['same'], 4.5, 0.05); chk('opus other', sp['claude-3-opus-20240229']['other'], 1.5, 0.05)
chk('gpt4t same', sp['gpt-4-1106-preview']['same'], 1.7, 0.05); chk('gpt4t other', sp['gpt-4-1106-preview']['other'], -6.1, 0.05)
for r in sp.values():  # each cell: own minus mean of the other four
    for c in r['cells']:
        others = [sp[k]['cells'][[x['m'] for x in sp[k]['cells']].index(c['m'])]['own'] for k in sp if k != r['j']]
        chk('cell %s %s' % (r['j'][:10], c['m'][:10]), c['d'], c['own'] - sum(others) / 4, 0.06)
mt = {r['m']: r for r in D['selfp']['mt']['rows']}
chk('mt gpt-4 lift', 13.0, mt['gpt-4']['gpt4'] - mt['gpt-4']['human'], 0.05); chk('mt claude lift', 10.5, mt['claude-v1']['gpt4'] - mt['claude-v1']['human'], 0.05)
print('ok', ok, 'bad', bad)
