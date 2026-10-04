#!/usr/bin/env python3
"""Check the page's exact binomial maths (parts/34_js_same_a_math.js) against SciPy and statsmodels.

Run: uv run --with scipy --with statsmodels python3 check_calc.py
Runs the page's JavaScript in node on a grid of cases and compares every output.
Also checks the Reading tab's quoted normal-approximation errors (7.3 points on AIME at 80%).
"""
import json, math, os, subprocess, sys
from scipy.stats import beta, fisher_exact, binomtest
from statsmodels.stats.proportion import proportion_confint, confint_proportions_2indep

HERE = os.path.dirname(os.path.abspath(__file__))
JS = os.path.join(HERE, '..', 'parts', '34_js_same_a_math.js')

ns = [10, 30, 51, 66, 70, 89, 108, 198, 200, 272, 500, 642, 2500, 14042]
grid = []
for n in ns:
    for frac in (0.0, 0.05, 0.3, 0.5, 0.744, 0.9, 1.0):
        k = round(frac * n)
        for dk in (1, 3, int(0.05 * n) + 1):
            kb = min(n, k + dk)
            grid.append((n, k, kb))

node = r"""
const fs=require('fs');eval(fs.readFileSync(process.argv[1],'utf8'));
const M=globalThis.SMC;const grid=JSON.parse(fs.readFileSync(0,'utf8'));
const out=grid.map(([n,k,kb])=>{const z=M.Z[0.95];
  const [lo,hi]=M.discRange(k,kb,n);const d=lo+2*Math.floor((hi-lo)/4);const b=(d+(k-kb))/2,c=(d-(k-kb))/2;
  return {cp:M.cp(k,n,0.05),cp99:M.cp(k,n,0.01),wil:M.wilson(k,n,z),fis:M.fisher(k,n,kb,n),fis2:M.fisher(k,n,kb,Math.max(1,n-3)>=kb?n-3:n),
    nc:M.newcombe(kb,n,k,n,z),b,c,mcn:M.mcnemar(b,c),pw:M.pairedWald(c,b,n,z)}});
process.stdout.write(JSON.stringify(out));
"""
res = json.loads(subprocess.run(['node', '-e', node, JS], input=json.dumps(grid), capture_output=True, text=True, check=True).stdout)

worst = {}
def chk(name, a, b, tol):
    e = abs(a - b)
    worst[name] = max(worst.get(name, 0), e)
    if e > tol:
        print('MISMATCH', name, a, b); return False
    return True

ok = True
for (n, k, kb), r in zip(grid, res):
    for lev, key in ((0.05, 'cp'), (0.01, 'cp99')):
        lo = 0.0 if k == 0 else beta.ppf(lev / 2, k, n - k + 1)
        hi = 1.0 if k == n else beta.ppf(1 - lev / 2, k + 1, n - k)
        ok &= chk(key + '_lo', r[key][0], lo, 1e-9); ok &= chk(key + '_hi', r[key][1], hi, 1e-9)
    wl, wh = proportion_confint(k, n, alpha=0.05, method='wilson')
    ok &= chk('wilson', r['wil'][0], wl, 1e-9); ok &= chk('wilson', r['wil'][1], wh, 1e-9)
    ok &= chk('fisher', r['fis'], fisher_exact([[k, n - k], [kb, n - kb]]).pvalue, 1e-9)
    nb2 = n - 3 if max(1, n - 3) >= kb else n
    ok &= chk('fisher_unequal_n', r['fis2'], fisher_exact([[k, n - k], [kb, nb2 - kb]]).pvalue, 1e-9)
    if not (k == 0 and kb == 0) and not (k == n and kb == n):
        lo, hi = confint_proportions_2indep(kb, n, k, n, method='newcomb', compare='diff', alpha=0.05)
        ok &= chk('newcombe', r['nc'][0], lo, 1e-9); ok &= chk('newcombe', r['nc'][1], hi, 1e-9)
    b, c = int(r['b']), int(r['c'])
    pm = 1.0 if b + c == 0 else binomtest(b, b + c, 0.5).pvalue
    ok &= chk('mcnemar', r['mcn'], pm, 1e-9)
    d = (c - b) / n; se = math.sqrt(max(0, (b + c) - (b - c) ** 2 / n)) / n
    ok &= chk('paired_wald', r['pw'][0], d - 1.959963984540054 * se, 1e-12)

# the Reading tab's quoted figures (normal approximation): AIME 30 at 80% -> 7.3 points
se_aime = math.sqrt(0.8 * 0.2 / 30) * 100
print('AIME 30 items at 80%%: standard error %.2f points (Reading tab: 7.3)' % se_aime)
for n, p, q in ((198, 0.9, 4.2), (500, 0.7, 4.0)):
    print('n=%d at %.0f%%: 1.96 x SE = %.2f points (Reading tab quotes plus or minus %.1f)' % (n, p * 100, 1.96 * math.sqrt(p * (1 - p) / n) * 100, q))
# worked numbers quoted on the page
print('TB-Science, Fable 5.1, 37 vs 30 of 70: Fisher p = %.3f' % fisher_exact([[37, 33], [30, 40]]).pvalue)
print('cases checked:', len(grid), 'worst absolute errors:', {k: '%.1e' % v for k, v in worst.items()})
print('ALL OK' if ok else 'FAILURES')
sys.exit(0 if ok else 1)
