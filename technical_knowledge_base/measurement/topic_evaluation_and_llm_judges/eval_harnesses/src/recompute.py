"""Check every number the page states against src/inputs and src/data, and the page's JavaScript against the harnesses' code.

python3 recompute.py   (stdlib + node on PATH). Writes recompute_out.json; exits non-zero on any failure.
"""
import json, os, re, subprocess, sys, math
HERE = os.path.dirname(os.path.abspath(__file__))
INP = os.path.join(HERE, 'inputs'); DAT = os.path.join(HERE, 'data')
ok = []; bad = []
def check(name, cond, detail=''):
    (ok if cond else bad).append((name, detail)); print(('OK  ' if cond else 'BAD ') + name + ('  ' + str(detail) if detail else ''))

runs = json.load(open(os.path.join(DAT, 'runs.json'))); items = runs['items']; S = runs['summary']
ex = json.load(open(os.path.join(DAT, 'extract.json')))

# 1. The harnesses' own aggregates equal the per-sample records
flex = sum(x['lm']['flexible-extract']['exact_match'] for x in items) / 10
strict = sum(x['lm']['strict-match']['exact_match'] for x in items) / 10
check('lm-eval flexible-extract mean', abs(flex - S['lm']['results']['exact_match,flexible-extract']) < 1e-9, flex)
check('lm-eval strict-match mean', abs(strict - S['lm']['results']['exact_match,strict-match']) < 1e-9, strict)
acc = sum(x['in']['score'] == 'C' for x in items) / 10
sc = S['in']['results']['scores'][0]['metrics']
check('Inspect accuracy', abs(acc - sc['accuracy']['value']) < 1e-9, acc)
check('Inspect stderr = sqrt(p(1-p)/(n-1))', abs(math.sqrt(acc * (1 - acc) / 9) - sc['stderr']['value']) < 1e-9, sc['stderr']['value'])
check('lm-eval stderr = sqrt(p(1-p)/(n-1))', abs(math.sqrt(flex * (1 - flex) / 9) - S['lm']['results']['exact_match_stderr,flexible-extract']) < 1e-9)
# 2. Recomputed extraction (harness code) agrees with what each harness logged
for x in items:
    e_lm = [r for r in ex['rows'] if r['id'] == x['id'] and r['run'] == 'lmeval'][0]['extract']
    e_in = [r for r in ex['rows'] if r['id'] == x['id'] and r['run'] == 'inspect'][0]['extract']
    check('item %d lm strict recomputed = logged' % x['id'], e_lm['lmeval_strict'][1] == x['lm']['strict-match']['exact_match'])
    check('item %d lm flex recomputed = logged' % x['id'], e_lm['lmeval_flex'][1] == x['lm']['flexible-extract']['exact_match'])
    check('item %d inspect recomputed = logged' % x['id'], e_in['inspect'][1] == (1.0 if x['in']['score'] == 'C' else 0.0))
# 3. The page's JavaScript extractors equal the harnesses' code on all twenty outputs
js = open(os.path.join(HERE, 'parts', '31_js_same.js')).read()
node = """const window={};const document={getElementById:()=>null,addEventListener:()=>{}};
%s
const rows=%s;const out=[];
for(const r of rows){for(const k of Object.keys(window.HX_EX)){const v=window.HX_EX[k].f(r.text,r.target);out.push([r.id,r.run,k,v[1]])}}
console.log(JSON.stringify(out));""" % (js, json.dumps(ex['rows']))
res = json.loads(subprocess.check_output(['node', '-e', node], text=True))
mism = [(i, run, k, v) for i, run, k, v in res if float(v) != [r for r in ex['rows'] if r['id'] == i and r['run'] == run][0]['extract'][k][1]]
check('JS extractors = harness code on 20 outputs x 6 rules', not mism, mism[:5])
# 4. Bench totals stated by the page are computed in JS from the same rows; record them
tot = {k: [sum(r['extract'][k][1] for r in ex['rows'] if r['run'] == run) for run in ('lmeval', 'inspect')] for k in ex['rows'][0]['extract']}
print('bench totals (lm-eval outputs, Inspect outputs):', tot)
# 5. Clopper-Pearson interval for 1 of 10
def beta_ppf(q, a, b):
    lo, hi = 0.0, 1.0
    def cdf(x):  # binomial identity for integer a, b
        n = a + b - 1
        return sum(math.comb(n, j) * x ** j * (1 - x) ** (n - j) for j in range(a, n + 1))
    for _ in range(100):
        m = (lo + hi) / 2
        lo, hi = (m, hi) if cdf(m) < q else (lo, m)
    return lo
L, U = beta_ppf(0.025, 1, 10), beta_ppf(0.975, 2, 9)
check('Clopper-Pearson 1/10 = 0.3% to 44.5%', round(L * 100, 1) == 0.3 and round(U * 100, 1) == 44.5, (L, U))
# 6. Inspect token usage: logged usage is the padded batch shape
check('Inspect logged usage identical across samples', len({(x['in']['usage']['input'], x['in']['usage']['output']) for x in items}) == 1, items[0]['in']['usage'])
ri = [x['in']['real']['input'] for x in items]; ro = [x['in']['real']['output'] for x in items]
check('real prompt range 2,184 to 2,269', (min(ri), max(ri)) == (2184, 2269), (min(ri), max(ri)))
check('real output range 146 to 493', (min(ro), max(ro)) == (146, 493), (min(ro), max(ro)))
check('logged input = longest real prompt (padding)', items[0]['in']['usage']['input'] == max(ri))
# 7. GSM8K checks
g = json.load(open(os.path.join(DAT, 'gsm8k_checks.json')))
check('GSM8K test identical at both revisions', g['identical'] and g['n'] == [1319, 1319])
check('18 GSM8K answers above 99,999', g['answers_over_5_digits'] == 18 and '114200' in g['examples'])
check('Inspect numeric precision 5 (.5g)', 'precision: int = 5' in open(os.path.join(INP, 'inspect_match.py')).read())
# 8. Counts quoted from the pinned files
pf = open(os.path.join(INP, 'promptfoo_assertions.md')).read()
det = pf[pf.index('### Deterministic'):pf.index('### Model-assisted')]; mod = pf[pf.index('### Model-assisted'):pf.index('## Weighted')]
nd = len(re.findall(r'^\| \[', det, re.M)); nm = len(re.findall(r'^\| \[', mod, re.M))
check('promptfoo 44 deterministic, 17 model-assisted assertions', (nd, nm) == (44, 17), (nd, nm))
sb = open(os.path.join(INP, 'inspect_sandboxes.qmd')).read()
rows = re.findall(r'^\| `([a-z0-9]+)`\s*\|\s*([^|]+)\|', sb, re.M)
built = [r for r, p in rows if 'Built-in' in p]
check('Inspect sandboxes: 2 built in, 7 as packages', len(built) == 2 and len(rows) - 2 == 7, rows)
reg = open(os.path.join(INP, 'lmeval_model_registry_d6de816.txt')).read().split()
check('lm-eval registry: 37 model names', len(reg) == 37, len(reg))
y = open(os.path.join(INP, 'lmeval_gsm8k.yaml')).read()
check('lm-eval gsm8k version 3.0, 5-shot', 'version: 3.0' in y and 'num_fewshot: 5' in y)
check('inspect_evals pins GSM8K revision cc7b047', 'cc7b047b6e5bb11b4f1af84efc572db110a51b3c' in open(os.path.join(INP, 'inspect_evals_gsm8k.py')).read())
check('lm-eval acc_norm divides by characters', 'completion_len = np.array([float(len(i)) for i in choices])' in open(os.path.join(INP, 'lmeval_mc_norm.py')).read())
check('Inspect hf provider samples by default', 'do_sample if do_sample is not None else True' in open(os.path.join(INP, 'inspect_hf_provider.py')).read())
check('HELM maintenance date', 'June 1, 2026' in open(os.path.join(INP, 'helm_maintenance.md')).read())
check('inspect_evals register date 8 May 2026', '8th of May 2026' in open(os.path.join(INP, 'inspect_evals_register.md')).read())
v = json.load(open(os.path.join(INP, 'versions.json')))
for p, ver in [('lm-eval', '0.4.13'), ('inspect-ai', '0.3.276'), ('inspect-evals', '0.23.0'), ('lighteval', '0.13.0'), ('crfm-helm', '0.5.16'), ('unitxt', '1.26.10'), ('braintrust', '0.44.0'), ('evals', '3.0.1.post1')]:
    check('version ' + p, v['pypi'][p]['version'] == ver, v['pypi'][p])
check('promptfoo 0.123.1', v['npm']['promptfoo']['version'] == '0.123.1')
json.dump({'ok': len(ok), 'bad': bad, 'bench_totals': tot}, open(os.path.join(HERE, 'recompute_out.json'), 'w'), indent=1)
print(len(ok), 'ok,', len(bad), 'bad'); sys.exit(1 if bad else 0)
