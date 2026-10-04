"""Recompute every derived number on the page from inputs/ (stdlib only). Writes recompute_out.json.
The page's JavaScript is checked against this file by check_page.mjs."""
import json, math, os, re, signal, statistics as st
H = os.path.dirname(os.path.abspath(__file__)); I = lambda f: os.path.join(H, 'inputs', f)
out = {}

# ---- pass@k: the Codex paper's estimator (arXiv 2107.03374, Figure 3) and the plug-in it warns against ----
def pass_at_k(n, c, k):
    if n - c < k: return 1.0
    prod = 1.0
    for i in range(n - c + 1, n + 1): prod *= 1.0 - k / i
    return 1.0 - prod
plug = lambda n, c, k: 1.0 - (1.0 - c / n) ** k
def expect(n, p, k, f):  # exact expectation over c ~ Binomial(n, p)
    return sum(math.comb(n, c) * p ** c * (1 - p) ** (n - c) * f(n, c, k) for c in range(n + 1))
out['pk_examples'] = {f'{n},{c},{k}': [pass_at_k(n, c, k), plug(n, c, k)] for n, c, k in [(10, 3, 1), (10, 3, 5), (10, 1, 10), (200, 4, 100), (20, 2, 5), (10, 2, 5)]}
out['pk_bias'] = {f'{n},{p},{k}': [expect(n, p, k, pass_at_k), expect(n, p, k, plug), 1 - (1 - p) ** k] for n, p, k in [(10, 0.1, 5), (20, 0.05, 10), (200, 0.01, 100), (10, 0.3, 5)]}

# ---- LiveCodeBench: pass@k per model from per-problem counts, windows, monthly series ----
L = json.load(open(I('lcb_compact.json')))
dig = lambda ch: int(ch, 20)
pk = {}
for m in L['models']:
    if m['n'] < 2: continue
    n = m['n']; cs = [dig(ch) for ch in m['c']]
    pk[m['m']] = {'n': n, 'unb': [100 * st.mean(pass_at_k(n, c, k) for c in cs) for k in range(1, n + 1)],
                  'plug': [100 * st.mean(plug(n, c, k) for c in cs) for k in range(1, n + 1)]}
out['lcb_passk'] = pk
def window(start, end='9999'):
    res = {}
    idx = [i for i, q in enumerate(L['q']) if start <= q[1] < end]
    for m in L['models']:
        v = [dig(m['c'][i]) / m['n'] for i in idx]
        res[m['m']] = [100 * st.mean(v), len(v)]
    return res
out['lcb_window_2024-08-01'] = window('2024-08-01', '2025-04-08')  # the root's o4-mini 80.2% (454 problems)
out['lcb_window_2023-05-01'] = window('2023-05-01')
def monthly(model, diff):
    m = [x for x in L['models'] if x['m'] == model][0]; acc = {}
    for i, q in enumerate(L['q']):
        if diff and q[2] != diff: continue
        acc.setdefault(q[1][:7], []).append(dig(m['c'][i]) / m['n'])
    return {k: [100 * st.mean(v), len(v)] for k, v in sorted(acc.items())}
out['lcb_monthly_dsv3_m'] = monthly('DeepSeek-V3', 'm')
out['lcb_monthly_gpt4t_m'] = monthly('GPT-4-Turbo-2024-04-09', 'm')
def split(model, cut, end, diff):
    m = [x for x in L['models'] if x['m'] == model][0]; a, b = [], []
    for i, q in enumerate(L['q']):
        if diff and q[2] != diff: continue
        if q[1] >= end: continue
        (a if q[1] < cut else b).append(dig(m['c'][i]) / m['n'])
    return [100 * st.mean(a), len(a), 100 * st.mean(b), len(b)]
out['lcb_split'] = {mm: split(mm, '2024-07-01', '2025-01-01', 'm') for mm in ['DeepSeek-V3', 'GPT-4-Turbo-2024-04-09', 'GPT-4O-2024-08-06', 'Claude-3.5-Sonnet-20241022', 'O4-Mini (High)']}

# ---- HumanEval/31: three Codex-12B samples printed in the Codex paper, Appendix B (temperature 0.8) ----
T = json.load(open(I('humaneval31.json')))
ns = {}; exec(T['prompt'] + T['canonical'], ns); ref = ns['is_prime']
SAMPLES = {
 'c1': "def f(n):\n    for i in range(2, n):\n        if n % i == 0:\n            return False\n    return True\n",
 'c6': "def f(n):\n    prime = True\n    if n == 1:\n        return False\n    for i in range(2, n):\n        if n % i == 0:\n            prime = False\n    return prime\n",
 'c4': "def f(n):\n    if n < 2: return False\n    if n == 2: return True\n    if n%2 == 0: return False\n    return not any(n%k == 0 for k in range(3,int(n**0.5)+1,2))\n"}
class TO(Exception): pass
def _h(*a): raise TO()
signal.signal(signal.SIGALRM, _h)
LIMIT = 1.0
he = {}
for k, src in SAMPLES.items():
    g = {}; exec(src, g); f = g['f']; r = {}
    for lab in ('base', 'plus'):
        res = []
        for x in T[lab]:
            signal.setitimer(signal.ITIMER_REAL, LIMIT)
            try: v = f(x); res.append('p' if v == ref(x) else 'w')
            except TO: res.append('t')
            finally: signal.setitimer(signal.ITIMER_REAL, 0)
        r[lab] = ''.join(res)
    he[k] = r
out['he31'] = {'limit_s': LIMIT, 'ref_base': [ref(x) for x in T['base']], 'ref_plus': [ref(x) for x in T['plus']], 'res': he}

# ---- django__django-11099: the two username-validator tests, re-run with Python's re for each candidate ----
tv = json.load(open(I('swe_django_11099.json')))['validator_tests_at_base']
lists = {}
for name in ('test_unicode_validator', 'test_ascii_validator'):
    body = tv[tv.index('def ' + name):]; body = body[:body.index('v = validators')]
    loc = {}; exec('\n'.join(l.strip() for l in body.splitlines()[1:]), {}, loc)
    lists[name] = [loc['valid_usernames'], loc['invalid_usernames']]
# the test patch adds a trailing-newline username to both invalid lists
lists['test_unicode_validator'][1] = lists['test_unicode_validator'][1] + ['trailingnewline\n']
lists['test_ascii_validator'][1] = lists['test_ascii_validator'][1] + ['trailingnewline\n']
CAND = {'none': (r'^[\w.@+-]+$', r'^[\w.@+-]+$'), 'gold': (r'^[\w.@+-]+\Z', r'^[\w.@+-]+\Z'),
        'issue': (r'\A[\w.@+-]+\Z', r'\A[\w.@+-]+\Z'), 'half': (r'^[\w.@+-]+\Z', r'^[\w.@+-]+$')}  # (ascii, unicode)
dj = {}
for c, (ra, ru) in CAND.items():
    rr = {}
    for name, rx, fl in (('test_ascii_validator', ra, re.ASCII), ('test_unicode_validator', ru, 0)):
        ok = lambda u: re.compile(rx, fl).search(u) is not None  # Django's RegexValidator: search, then raise if no match
        val, inv = lists[name]
        rr[name] = {'valid': [ok(u) for u in val], 'invalid': [not ok(u) for u in inv], 'pass': all(ok(u) for u in val) and all(not ok(u) for u in inv)}
    dj[c] = rr
out['django'] = {'lists': lists, 'cand': CAND, 'res': dj}

# ---- SWE-bench Verified statistics ----
V = json.load(open(I('verified_stats.json')))
out['verified'] = {'n': V['n'], 'difficulty': V['difficulty'], 'django_share': dict(V['repos'])['django/django'] / V['n'],
                   'single_file': V['files']['1'] / V['n'], 'lines_median': st.median(V['lines']), 'f2p_median': st.median(V['f2p']),
                   'p2p_median': st.median(V['p2p']), 'leak': len(V['leak']), 'leak_all': sum(1 for x in V['leak'] if x[1] == x[2]),
                   'years': V['year'], 'created_max': V['created_max']}

# ---- SWE-rebench before and after release ----
R = json.load(open(I('rebench_split.json')))
d = [x['pre'][3] - x['post'][3] for x in R['split']]
out['rebench'] = {'models': len(d), 'higher_before': sum(1 for x in d if x > 0), 'median_diff': st.median(d),
                  'beyond_2se_tasks': sum(1 for x, y in zip(d, R['split']) if abs(x) > 2 * 100 * math.sqrt(sum((v[3] / 100) * (1 - v[3] / 100) / v[2] for v in (y['pre'], y['post'])))),
                  'mean_abs_diff': st.mean(abs(x) for x in d)}

# ---- Real-SWE: per-task passes out of 8 (page read 2026-10-04) ----
txt = open(I('realswe_page_2026-10-04.txt')).read()
tab = txt[txt.index('Task GPT-6 Astra Fable 5.1'):txt.index('Each task had 8 rollouts per model.')]
models = ['GPT-6 Astra', 'Fable 5.1', 'Gemini 3.8 Flash', 'GLM 5.3', 'Muse Spark 1.3', 'Grok 4.6', 'GPT-5.6 Sol', 'Kimi K3']
TASKS = ['Billing schedule migration', 'API keys & environments', 'Multi-region sweep', 'Entitlement overage lines', 'Customer identity migration',
         'API token metering', 'S3 datastore measurement', 'Linearizable scan', 'Tax jurisdiction', 'Analytics stream reducer']
grid = []
for t in TASKS:
    m = re.search(re.escape(t) + r' ((?:\d / 8 ){8})([\d.]+) %', tab)
    grid.append([t, [int(x) for x in re.findall(r'(\d) / 8', m.group(1))], float(m.group(2))])
tot = [sum(g[1][j] for g in grid) for j in range(8)]
out['realswe'] = {'models': models, 'grid': grid, 'rate': [100 * t / 80 for t in tot],
                  'task_rate_check': [abs(100 * sum(g[1]) / 64 - g[2]) < 0.06 for g in grid],
                  'under15': sum(1 for g in grid if g[2] < 15)}
def loo(drop):
    rr = [100 * sum(g[1][j] for i, g in enumerate(grid) if i != drop) / ((len(grid) - 1) * 8) for j in range(8)]
    return [models[j] for j in sorted(range(8), key=lambda j: -rr[j])], rr
out['realswe']['loo_leader'] = {g[0]: loo(i)[0][0] for i, g in enumerate(grid)}

json.dump(out, open(os.path.join(H, 'recompute_out.json'), 'w'), indent=0, default=str)
print('pass@k(10,3,5)=%.4f plug=%.4f' % tuple(out['pk_examples']['10,3,5']))
print('bias n=10 p=.1 k=5', out['pk_bias']['10,0.1,5'])
print('o4-mini window', out['lcb_window_2024-08-01']['O4-Mini (High)'])
print('he31', {k: {l: (v.count('p'), v.count('w'), v.count('t')) for l, v in r.items()} for k, r in he.items()})
print('django', {c: {t: v['pass'] for t, v in r.items()} for c, r in dj.items()})
print('verified', out['verified'])
print('rebench', out['rebench'])
print('realswe', [round(x, 2) for x in out['realswe']['rate']], out['realswe']['task_rate_check'], out['realswe']['under15'], out['realswe']['loo_leader'])
print('lcb split', out['lcb_split'])
for m, v in pk.items(): print(m, 'pass@1 %.1f pass@10 %.1f plug@10 %.1f' % (v['unb'][0], v['unb'][-1], v['plug'][-1]))
