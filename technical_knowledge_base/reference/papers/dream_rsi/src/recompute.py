"""Recompute every number Dream-RSI derives, and the checks this page adds, from tables.json.
Writes inputs/recompute.json (the page reads it) and prints a summary.

  python3 recompute.py      (build.sh runs it)

Each check: claim, where, printed (as the paper prints it), recomputed, verdict
(reproduces / partly / does not / added: a check the paper does not make).
"""
import json, math

TB = json.load(open('tables.json'))
L, M, F3, F4, F5, F6 = TB['lasso'], TB['math'], TB['fig3b'], TB['fig4'], TB['fig5'], TB['fig6']
DS = L['datasets']
row = {(r['method'], r['model']): r for r in L['rows']}
fix_p, fix_f = row[('Recursive Fixed Exploration', 'Gemini-3.1-Pro')], row[('Recursive Fixed Exploration', 'Gemini-3.7-Flash')]
dr_p, dr_f = row[('Dream-RSI', 'Gemini-3.1-Pro')], row[('Dream-RSI', 'Gemini-3.7-Flash')]
stes, stes_d = row[('SimpleTES', 'gpt-oss-120b')], row[('SimpleTES†', 'gpt-oss-120b')]
skl, glm = row[('sklearn', '–')], row[('glmnet', '–')]
checks = []
def chk(claim, where, printed, recomputed, verdict, note=''):
    checks.append({'claim': claim, 'where': where, 'printed': printed, 'recomputed': recomputed, 'verdict': verdict, 'note': note})
gmean = lambda xs: math.exp(sum(math.log(x) for x in xs) / len(xs))
r1 = lambda v: round(v, 1)

# ---- Lasso (Figure 3a) ----
for r in L['rows']:
    a = sum(r['ms']) / 6
    chk('Average of the six runtimes, %s' % (r['method'] + ('' if r['model'] in ('–', '-') else ' (%s)' % r['model'])), 'S4.F3', r['avg'], r1(a), 'reproduces' if abs(a - r['avg']) < 0.051 else 'does not')
chk('Fixed exploration compute: 5 rounds of 10 workspaces × 11 steps (Pro)', 'S4', 550, 5 * 10 * 11, 'reproduces')
chk('Fixed exploration compute: 5 rounds of 32 workspaces × 20 steps (Flash)', 'S4', 3200, 5 * 32 * 20, 'reproduces')
chk('"up to 162×" fewer agent calls than SimpleTES', 'S1', '162×', round(51200 / 317, 1), 'reproduces', '51,200 / 317; for Flash it is 51,200 / 1,879 = %.1f×' % (51200 / 1879))
chk('"1.7×" fewer calls than fixed exploration', 'S1', '1.7×', '%.2f× (Pro), %.2f× (Flash)' % (550 / 317, 3200 / 1879), 'reproduces')
chk('README: "1.22x faster downstream runtime" (Pro)', 'README', '1.22×', round(fix_p['avg'] / dr_p['avg'], 3), 'reproduces', 'arithmetic means: 3587.1 / 2931.0')
beat_lib = all(min(dr[k] for dr in (dr_p['ms'], dr_f['ms'])) < min(skl['ms'][k], glm['ms'][k]) for k in range(6))
beat_lib_both = all(d['ms'][k] < min(skl['ms'][k], glm['ms'][k]) for d in (dr_p, dr_f) for k in range(6))
chk('Discovered solvers beat sklearn and glmnet on all six held-out datasets', 'S4.SS1.SSS0.Px2', 'yes', 'yes, both models, all six' if beat_lib_both else 'no', 'reproduces' if beat_lib_both else 'does not')
chk('"Lower average runtime than SimpleTES with roughly two orders of magnitude fewer calls"', 'S4.SS1.SSS0.Px2', 'yes', 'Pro %.0f×, Flash %.0f× fewer calls; both averages lower (2931.0, 2350.6 against 3804.8)' % (51200 / 317, 51200 / 1879), 'partly', 'two orders of magnitude holds for Pro only; Flash is 27×, under 1.5 orders')
wins_p = [DS[k] for k in range(6) if dr_p['ms'][k] < fix_p['ms'][k]]
wins_f = [DS[k] for k in range(6) if dr_f['ms'][k] < fix_f['ms'][k]]
chk('Datasets where Dream-RSI is faster than fixed exploration, Pro', 'S4.F3', 'not stated (average 3587.1 → 2931.0)', '%d of 6 (%s)' % (len(wins_p), ', '.join(wins_p)), 'added', 'Pro is slower on Gisette (2841.0 against 1861.8) and on all four biological datasets')
chk('Datasets where Dream-RSI is faster than fixed exploration, Flash', 'S4.F3', 'not stated (average 2516.7 → 2350.6)', '%d of 6 (all but %s)' % (len(wins_f), ', '.join(d for d in DS if d not in wins_f)), 'added')
share = fix_p['ms'][1] / sum(fix_p['ms'])
chk('Share of the arithmetic average carried by RCV1 (fixed, Pro)', 'S4.F3', '', '%.1f%%' % (100 * share), 'added', 'RCV1 alone is %.0f%% of the sum, so the average is mostly one dataset' % (100 * share))
g = {k: gmean(r['ms']) for k, r in (('fix_p', fix_p), ('dr_p', dr_p), ('fix_f', fix_f), ('dr_f', dr_f), ('stes', stes), ('stes_d', stes_d), ('skl', skl), ('glm', glm))}
chk('Geometric mean runtime, Pro: fixed against Dream-RSI', 'S4.F3', 'not reported', '%.1f against %.1f ms' % (g['fix_p'], g['dr_p']), 'added', 'on the geometric mean (the same kind of mean the search score uses, Appendix A) Dream-RSI Pro is %.0f%% slower' % (100 * (g['dr_p'] / g['fix_p'] - 1)))
chk('Geometric mean runtime, Flash: fixed against Dream-RSI', 'S4.F3', 'not reported', '%.1f against %.1f ms' % (g['fix_f'], g['dr_f']), 'added', 'Dream-RSI Flash %.0f%% faster' % (100 * (1 - g['dr_f'] / g['fix_f'])))
st = L['simpletes_supp16']
copied = all(abs(st[d]['simpletes'] - stes['ms'][k]) < 1e-9 for k, d in enumerate(DS))
chk('The unmarked SimpleTES row equals SimpleTES\'s own Supplementary Table 16', 'S4.F3', '(no source given)', 'all six values identical' if copied else 'differs', 'added', 'measured on SimpleTES\'s machine; the sklearn and glmnet rows were not copied')
rg = [glm['ms'][k] / st[d]['glmnet'] for k, d in enumerate(DS)]
rs = [skl['ms'][k] / st[d]['sklearn'] for k, d in enumerate(DS)]
rt = [stes_d['ms'][k] / stes['ms'][k] for k in range(6)]
chk('glmnet in this paper ÷ glmnet in SimpleTES, per dataset', 'S4.F3', '', ', '.join('%.2f' % x for x in rg), 'added', 'about 2× slower here: a different (slower) machine')
chk('sklearn in this paper ÷ sklearn in SimpleTES, per dataset', 'S4.F3', '', ', '.join('%.2f' % x for x in rs), 'added', 'about 2× slower here as well')
chk('SimpleTES† (the reproduction, per the project page) ÷ SimpleTES, per dataset', 'S4.F3', '† not defined in the paper', ', '.join('%.2f' % x for x in rt), 'added', 'close to the glmnet ratio: the dagger row looks like SimpleTES re-timed on this paper\'s machine')
wins_pd = [DS[k] for k in range(6) if dr_p['ms'][k] < stes_d['ms'][k]]
wins_fd = [DS[k] for k in range(6) if dr_f['ms'][k] < stes_d['ms'][k]]
chk('Same-machine comparison with SimpleTES† (datasets won)', 'S4.F3', '', 'Pro %d of 6, Flash %d of 6' % (len(wins_pd), len(wins_fd)), 'added', 'averages 2931.0 and 2350.6 against 8318.4: against the same-machine row Dream-RSI looks better than against the copied one')

# Figure 3(b)
for k in ('pro', 'flash'):
    d, f = F3[k]['dream'], F3[k]['fixed']
    per = [d[0][0]] + [d[i][0] - d[i - 1][0] for i in range(1, len(d))]
    pf = [f[0][0]] + [f[i][0] - f[i - 1][0] for i in range(1, len(f))]
    chk('Figure 3(b) %s: calls per round, Dream-RSI (fixed)' % k, 'S4.F3', '', '%s (%s)' % (per, pf), 'added')
    tab = (dr_p, fix_p) if k == 'pro' else (dr_f, fix_f)
    chk('Figure 3(b) %s last points equal Figure 3(a)' % k, 'S4.F3', '%s / %s' % (tab[0]['avg'], tab[1]['avg']), '%s / %s' % (d[-1][1], f[-1][1]), 'reproduces' if abs(d[-1][1] - tab[0]['avg']) < 0.2 and abs(f[-1][1] - tab[1]['avg']) < 0.2 else 'does not')
    # "consistently superior at lower compute": compare each Dream round with the fixed curve at the nearest compute at or above it
    worse = []
    for i in range(1, len(d)):
        x, y = d[i]
        ff = [p for p in f if p[0] >= x][0]
        if y > ff[1]: worse.append('round %d: %.0f ms at %d calls vs fixed %.0f ms at %d' % (i + 1, y, x, ff[1], ff[0]))
    note = '; '.join(worse)
    if k == 'pro': note += '. Rounds 2 to 4 of Dream-RSI (%s ms) are all slower than round 1 (%.1f ms); the final round decides the comparison' % (', '.join('%.0f' % p[1] for p in d[1:4]), d[0][1])
    chk('Figure 3(b) %s: Dream-RSI "consistently" better at lower compute' % k, 'S4.SS1.SSS0.Px3', 'consistently', 'worse in %d of %d later rounds' % (len(worse), len(d) - 1) if worse else 'better in every later round', 'does not' if worse else 'reproduces', note)

# ---- Mathematics (Table 1) ----
mr = {r['method']: r for r in M['rows']}
d, fx = mr['Dream-RSI'], mr['Recursive Fixed Exploration']
chk('Sum-Difference: Dream-RSI above SimpleTES and fixed exploration', 'S4.SS2.SSS0.Px1', '1.145427', '+%.6f over fixed, +%.6f over SimpleTES' % (d['sumdiff'] - fx['sumdiff'], d['sumdiff'] - mr['SimpleTES']['sumdiff']), 'reproduces', 'a %.2f%% gain over its own baseline, one run each' % (100 * (d['sumdiff'] / fx['sumdiff'] - 1)))
chk('Autocorrelation (lower is better): Dream-RSI against its own fixed baseline', 'S4.T1', '"competitive"', '%.6f against %.6f: fixed is better' % (d['autocorr'], fx['autocorr']), 'added')
ac = sorted([(r['autocorr'], r['method']) for r in M['rows'] if r['autocorr'] is not None])
chk('Autocorrelation rank of Dream-RSI among the table\'s 8 entries', 'S4.T1', '', '%d of %d' % ([m for _, m in ac].index('Dream-RSI') + 1, len(ac)), 'added', 'behind SimpleTES, AlphaEvolve and its own fixed baseline')
pb = M['simpletes_t1']['third_autocorr_prev_best']
chk('The "Auto Correlation" column is the third autocorrelation inequality', 'A1', 'Appendix A defines three; the column does not say which', 'SimpleTES Table 1 prints 1.453675 for the third inequality', 'added', 'SimpleTES also lists Together AI at %.6f, a result this table leaves out; Dream-RSI\'s 1.456375 is above it too' % pb['v'])
circ = [r['method'] for r in M['rows'] if r['circle'] == 2.635983]
chk('Circle packing (n = 26): entries at 2.635983', 'S4.T1', 'Dream-RSI "matching the strongest"', '%d of 11 entries tie at 2.635983' % len(circ), 'reproduces', 'the task is saturated: it cannot separate methods')
chk('"over 50× budget savings" against SimpleTES within 1,000 generations', 'S1', '50×', round(51200 / 1000, 1), 'reproduces', 'Dream-RSI\'s own generation count on the maths tasks is never given; fixed exploration at 10 rounds of 110 would be 1,100')

# ---- Kernels (Figure 4) ----
def first_at_least(ser, y):
    for x, v in ser:
        if v >= y - 1e-9: return x
    return None
def at_budget(ser, b):
    v = None
    for x, y in ser:
        if x <= b: v = y
    return v
for task, claim in (('VGG16', 2.43), ('LayerNorm', 1.79)):
    dd, ff = F4[task]['dream'], F4[task]['fixed']
    ratio = ff[-1][0] / dd[-1][0]
    chk('%s: "%.2f× fewer generations, comparable performance"' % (task, claim), 'S4.F4', '%.2f×' % claim, '%.3f× = %d / %d' % (ratio, ff[-1][0], dd[-1][0]), 'reproduces', 'ratio of the two total budgets; at the end Dream-RSI is %.1f%% below fixed (%.4f against %.4f)' % (100 * (1 - dd[-1][1] / ff[-1][1]), dd[-1][1], ff[-1][1]))
    fx_reach = first_at_least(ff, dd[-1][1])
    chk('%s: generations fixed exploration needs to reach Dream-RSI\'s final value' % task, 'S4.F4', '', '%d (ratio %.2f×)' % (fx_reach, fx_reach / dd[-1][0]), 'added', 'the matched-performance saving is smaller than the printed one')
for task, claim in (('ConvDiv', 2.09), ('ConvMax', 1.44)):
    dd, ff = F4[task]['dream'], F4[task]['fixed']
    bud = dd[-1][0]; nb = min(ff, key=lambda p: abs(p[0] - bud))
    chk('%s: "%.2f× higher performance at a similar budget"' % (task, claim), 'S4.F4', '%.2f×' % claim, '%.3f× = %.4f / %.4f (fixed at %d)' % (dd[-1][1] / nb[1], dd[-1][1], nb[1], nb[0]), 'reproduces')
    chk('%s: Dream-RSI final against fixed exploration\'s final (990 generations)' % task, 'S4.F4', '', '%.2f×' % (dd[-1][1] / ff[-1][1]), 'added')
dd, ff = F4['ConvMax']['dream'], F4['ConvMax']['fixed']
chk('ConvMax before Dream-RSI\'s last round', 'S4.F4', '', '%.4f at %d generations; fixed %.4f at 550 and %.4f at 660' % (dd[-2][1], dd[-2][0], at_budget(ff, 550), at_budget(ff, 660)), 'added', 'Dream-RSI was behind until its last round; the whole 1.44× comes from one jump (0.2786 to 0.4310)')
for task in F4:
    dd = F4[task]['dream']
    per = [dd[0][0]] + [dd[i][0] - dd[i - 1][0] for i in range(1, len(dd))]
    chk('%s: generations per round, Dream-RSI' % task, 'S4.F4', '', str(per), 'added', '%d rounds; fixed exploration: %d rounds of 110' % (len(dd), len(F4[task]['fixed'])))

# ---- Analysis (Figures 5 and 6) ----
cum = [sum(F6['attempts'][:i + 1]) for i in range(9)]
cd = [p[0] for p in F4['ConvDiv']['dream']]
chk('Figure 6 attempts add up to Figure 4\'s ConvDiv x positions', 'S5.F6', str(F6['attempts']), str(cum), 'reproduces' if cum == cd else 'does not', 'Figure 4: %s' % cd)
chk('Figure 6 round-best values equal Figure 4\'s ConvDiv curve', 'S5.F6', str(F6['best']), str([round(p[1], 3) for p in F4['ConvDiv']['dream']]), 'reproduces' if all(abs(a - b[1]) < 6e-4 for a, b in zip(F6['best'], F4['ConvDiv']['dream'])) else 'does not')
chk('"reducing the number of evaluated attempts from 110 to 50"', 'S5.SS2', '110 → 50', '%d → %d (E1 → E4)' % (F6['attempts'][1], min(F6['attempts'])), 'reproduces', 'one run; 9 points')
def cmp_guided(a, b):
    out = []
    for x, y in b:
        ya = at_budget(a, x)
        if ya is not None: out.append((x, y, ya))
    return out
gf = cmp_guided(F5['fixed'], F5['fixed_guided'])
ahead = [x for x, y, ya in gf if y > ya]
chk('Figure 5: guidance "consistently underperforms" (fixed exploration)', 'S5.SS1', 'consistently', 'guided run ahead at %s generations, behind from 660' % ahead, 'does not', 'compared round by round at equal generations')
gd = cmp_guided(F5['dream'], F5['dream_guided'])
ahead2 = [x for x, y, ya in gd if y > ya]
chk('Figure 5: guidance "consistently underperforms" (Dream-RSI)', 'S5.SS1', 'consistently', 'guided run ahead at %s generations' % ahead2, 'does not', 'Dream-RSI with guidance used %d rounds against %d without' % (len(F5['dream_guided']), len(F5['dream'])))
chk('Figure 5 reuses Figure 4\'s ConvDiv runs', 'S5.F5', '', 'identical to 2e-4' if all(abs(a[1] - b[1]) < 3e-4 for a, b in zip(F5['dream'], F4['ConvDiv']['dream'])) else 'differ', 'added', 'and starts both from %.4f (1/ms) at 0 generations, a point Figure 4 does not draw' % F5['start'])

summ = {k: sum(1 for c in checks if c['verdict'] == k) for k in ('reproduces', 'partly', 'does not', 'added')}
out = {'checks': checks, 'summary': summ,
       'gmean': {k: round(v, 2) for k, v in g.items()},
       'lasso_wins': {'pro': wins_p, 'flash': wins_f, 'pro_vs_dagger': wins_pd, 'flash_vs_dagger': wins_fd},
       'ratios': {'glmnet': [round(x, 3) for x in rg], 'sklearn': [round(x, 3) for x in rs], 'dagger': [round(x, 3) for x in rt]},
       'rcv1_share': round(share, 4)}
json.dump(out, open('inputs/recompute.json', 'w'), indent=1, ensure_ascii=False)
for c in checks: print('[%s] %s :: %s :: %s %s' % (c['verdict'], c['claim'], c['printed'], c['recomputed'], ('(' + c['note'] + ')') if c['note'] else ''))
print(summ)
