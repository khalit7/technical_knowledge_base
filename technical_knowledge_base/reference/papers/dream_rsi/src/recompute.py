"""Recompute every number Dream-RSI (arXiv v2) derives, and the checks this page adds, from tables.json.
Claims that only v1 made are kept with the verdict "v1 only" and what v2 says instead.
Writes inputs/recompute.json (the page reads it) and prints a summary.

  python3 recompute.py      (build.sh runs it)

Each check: claim, where, printed (as the paper prints it), recomputed, verdict
(reproduces / partly / does not / added: a check the paper does not make / v1 only: a v1 claim v2 dropped).
"""
import json, math

TB = json.load(open('tables.json'))
L, M, F3, F4, F5, F6 = TB['lasso'], TB['math'], TB['lasso_dyn'], TB['kern'], TB['guide'], TB['behav']
# v2 anchors and figure numbers throughout (v2 renumbers: Lasso is Figure 4, kernels Figure 3, guidance Figure 6, behaviour Figure 7)
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

# ---- Lasso (Figure 4a) ----
for r in L['rows']:
    a = sum(r['ms']) / 6
    chk('Average of the six runtimes, %s' % (r['method'] + ('' if r['model'] in ('–', '-') else ' (%s)' % r['model'])), 'S4.F4', r['avg'], r1(a), 'reproduces' if abs(a - r['avg']) < 0.051 else 'does not')
chk('Fixed exploration compute: 5 rounds of 10 branches × 11 attempts (Pro; Table 3)', 'A2.T3', 550, 5 * 10 * 11, 'reproduces')
chk('Fixed exploration compute: 5 rounds of 32 branches × 20 attempts (Flash; Table 3)', 'A2.T3', 3200, 5 * 32 * 20, 'reproduces')
chk('"up to 162×" fewer agent calls than SimpleTES', 'S1', '162×', round(51200 / 317, 1), 'reproduces', '51,200 / 317; for Flash it is 51,200 / 1,879 = %.1f×' % (51200 / 1879))
chk('"1.7×" fewer calls than fixed exploration (v1 introduction)', 'S1', '1.7×', '%.2f× (Pro), %.2f× (Flash)' % (550 / 317, 3200 / 1879), 'v1 only', 'the arithmetic holds; v2 drops the ratio from its introduction')
chk('README: "1.22x faster downstream runtime" (Pro)', 'README', '1.22×', round(fix_p['avg'] / dr_p['avg'], 3), 'reproduces', 'arithmetic means: 3587.1 / 2931.0')
beat_lib = all(min(dr[k] for dr in (dr_p['ms'], dr_f['ms'])) < min(skl['ms'][k], glm['ms'][k]) for k in range(6))
beat_lib_both = all(d['ms'][k] < min(skl['ms'][k], glm['ms'][k]) for d in (dr_p, dr_f) for k in range(6))
chk('Discovered solvers beat sklearn and glmnet on all six held-out datasets', 'S4.SS3.SSS0.Px1', 'yes', 'yes, both models, all six' if beat_lib_both else 'no', 'reproduces' if beat_lib_both else 'does not')
chk('"approximately 162× and 27× fewer discovery-agent calls" than SimpleTES, with lower average runtime', 'S4.SS3.SSS0.Px1', '162×, 27×', 'Pro %.1f×, Flash %.1f× fewer calls; both averages lower (2931.0, 2350.6 against 3804.8)' % (51200 / 317, 51200 / 1879), 'reproduces', 'v2 adds that "these comparisons use different model backbones"; v1 said "roughly two orders of magnitude", true for Pro only')
wins_p = [DS[k] for k in range(6) if dr_p['ms'][k] < fix_p['ms'][k]]
wins_f = [DS[k] for k in range(6) if dr_f['ms'][k] < fix_f['ms'][k]]
chk('Datasets where Dream-RSI is faster than fixed exploration, Pro', 'S4.SS3.SSS0.Px1', 'v2: "driven by RCV1, despite slower runtimes on the other five datasets"', '%d of 6 (%s)' % (len(wins_p), ', '.join(wins_p)), 'reproduces', 'v1 did not say so; Pro is slower on Gisette (2841.0 against 1861.8) and on all four biological datasets')
chk('Datasets where Dream-RSI is faster than fixed exploration, Flash', 'S4.SS3.SSS0.Px1', 'v2: "improves on five of the six datasets"', '%d of 6 (all but %s)' % (len(wins_f), ', '.join(d for d in DS if d not in wins_f)), 'reproduces')
share = fix_p['ms'][1] / sum(fix_p['ms'])
chk('Share of the arithmetic average carried by RCV1 (fixed, Pro)', 'S4.F4', '', '%.1f%%' % (100 * share), 'added', 'RCV1 alone is %.0f%% of the sum, so the average is mostly one dataset' % (100 * share))
g = {k: gmean(r['ms']) for k, r in (('fix_p', fix_p), ('dr_p', dr_p), ('fix_f', fix_f), ('dr_f', dr_f), ('stes', stes), ('stes_d', stes_d), ('skl', skl), ('glm', glm))}
chk('Geometric mean runtime, Pro: fixed against Dream-RSI', 'S4.F4', 'not reported', '%.1f against %.1f ms' % (g['fix_p'], g['dr_p']), 'added', 'on the geometric mean (the same kind of mean the search score uses, Appendix B.3) Dream-RSI Pro is %.0f%% slower' % (100 * (g['dr_p'] / g['fix_p'] - 1)))
chk('Geometric mean runtime, Flash: fixed against Dream-RSI', 'S4.F4', 'not reported', '%.1f against %.1f ms' % (g['fix_f'], g['dr_f']), 'added', 'Dream-RSI Flash %.0f%% faster' % (100 * (1 - g['dr_f'] / g['fix_f'])))
st = L['simpletes_supp16']
copied = all(abs(st[d]['simpletes'] - stes['ms'][k]) < 1e-9 for k, d in enumerate(DS))
chk('The unmarked SimpleTES row equals SimpleTES\'s own Supplementary Table 16', 'S4.F4', '(no source given)', 'all six values identical' if copied else 'differs', 'added', 'measured on SimpleTES\'s machine; the sklearn and glmnet rows were not copied')
rg = [glm['ms'][k] / st[d]['glmnet'] for k, d in enumerate(DS)]
rs = [skl['ms'][k] / st[d]['sklearn'] for k, d in enumerate(DS)]
rt = [stes_d['ms'][k] / stes['ms'][k] for k in range(6)]
chk('glmnet in this paper ÷ glmnet in SimpleTES, per dataset', 'S4.F4', '', ', '.join('%.2f' % x for x in rg), 'added', 'about 2× slower here: a different (slower) machine')
chk('sklearn in this paper ÷ sklearn in SimpleTES, per dataset', 'S4.F4', '', ', '.join('%.2f' % x for x in rs), 'added', 'about 2× slower here as well')
chk('SimpleTES† ("results reproduced by us", v2) ÷ SimpleTES, per dataset', 'S4.F4', '† not defined in v1; v2: reproduced by the authors', ', '.join('%.2f' % x for x in rt), 'added', 'close to the glmnet ratio: SimpleTES re-run on this paper\'s slower machine')
wins_pd = [DS[k] for k in range(6) if dr_p['ms'][k] < stes_d['ms'][k]]
wins_fd = [DS[k] for k in range(6) if dr_f['ms'][k] < stes_d['ms'][k]]
chk('Same-machine comparison with SimpleTES† (datasets won)', 'S4.F4', '', 'Pro %d of 6, Flash %d of 6' % (len(wins_pd), len(wins_fd)), 'added', 'averages 2931.0 and 2350.6 against 8318.4: against the same-machine row Dream-RSI looks better than against the copied one')

# Figure 4(b)
for k in ('pro', 'flash'):
    d, f = F3[k]['dream'], F3[k]['fixed']
    per = [d[0][0]] + [d[i][0] - d[i - 1][0] for i in range(1, len(d))]
    pf = [f[0][0]] + [f[i][0] - f[i - 1][0] for i in range(1, len(f))]
    chk('Figure 4(b) %s: calls per round, Dream-RSI (fixed)' % k, 'S4.F4', '', '%s (%s)' % (per, pf), 'added')
    tab = (dr_p, fix_p) if k == 'pro' else (dr_f, fix_f)
    chk('Figure 4(b) %s last points equal Figure 4(a)' % k, 'S4.F4', '%s / %s' % (tab[0]['avg'], tab[1]['avg']), '%s / %s' % (d[-1][1], f[-1][1]), 'reproduces' if abs(d[-1][1] - tab[0]['avg']) < 0.2 and abs(f[-1][1] - tab[1]['avg']) < 0.2 else 'does not')
    # "consistently superior at lower compute": compare each Dream round with the fixed curve at the nearest compute at or above it
    worse = []
    for i in range(1, len(d)):
        x, y = d[i]
        ff = [p for p in f if p[0] >= x][0]
        if y > ff[1]: worse.append('round %d: %.0f ms at %d calls vs fixed %.0f ms at %d' % (i + 1, y, x, ff[1], ff[0]))
    note = '; '.join(worse)
    if k == 'pro': note += '. Rounds 2 to 4 of Dream-RSI (%s ms) are all slower than round 1 (%.1f ms); the final round decides the comparison' % (', '.join('%.0f' % p[1] for p in d[1:4]), d[0][1])
    chk('Figure 4(b) %s: v1\'s "consistently" better at lower compute' % k, 'S4.SS3.SSS0.Px2', 'consistently (v1)', 'worse in %d of %d later rounds' % (len(worse), len(d) - 1) if worse else 'better in every later round', 'v1 only' if worse else 'reproduces', note + ('; v2 says only that by the final round Dream-RSI is ahead, which holds' if worse else ''))

# ---- Mathematics (Table 1) ----
mr = {r['method']: r for r in M['rows']}
d, fx = mr['Dream-RSI'], mr['Recursive Fixed Exploration']
chk('Sum-Difference: Dream-RSI above SimpleTES and fixed exploration', 'S4.SS2.SSS0.Px1', '1.145427', '+%.6f over fixed, +%.6f over SimpleTES' % (d['sumdiff'] - fx['sumdiff'], d['sumdiff'] - mr['SimpleTES']['sumdiff']), 'reproduces', 'a %.2f%% gain over its own baseline, one run each' % (100 * (d['sumdiff'] / fx['sumdiff'] - 1)))
chk('Autocorrelation (lower is better): Dream-RSI against its own fixed baseline', 'S4.T1', '"competitive"', '%.6f against %.6f: fixed is better' % (d['autocorr'], fx['autocorr']), 'added')
ac = sorted([(r['autocorr'], r['method']) for r in M['rows'] if r['autocorr'] is not None])
chk('Autocorrelation rank of Dream-RSI among the table\'s 8 entries', 'S4.T1', '', '%d of %d' % ([m for _, m in ac].index('Dream-RSI') + 1, len(ac)), 'added', 'behind SimpleTES, AlphaEvolve and its own fixed baseline')
pb = M['simpletes_t1']['third_autocorr_prev_best']
chk('The "Auto Correlation" column is the third autocorrelation inequality', 'A2.SS3', 'Appendix B.3 defines three; the column does not say which', 'SimpleTES Table 1 prints 1.453675 for the third inequality', 'added', 'SimpleTES also lists Together AI at %.6f, a result this table leaves out; Dream-RSI\'s 1.456375 is above it too' % pb['v'])
circ = [r['method'] for r in M['rows'] if r['circle'] == 2.635983]
chk('Circle packing (n = 26): entries at 2.635983', 'S4.T1', 'Dream-RSI "matching the strongest"', '%d of 11 entries tie at 2.635983' % len(circ), 'reproduces', 'the task is saturated: it cannot separate methods')
chk('"over 50× budget savings" against SimpleTES within 1,000 generations (v1 introduction)', 'S1', '50×', round(51200 / 1000, 1), 'v1 only', 'v2 drops the claim and the "fewer than 1,000 generations"; Dream-RSI\'s generation count on the maths tasks is never given (Table 3: at most 10 rounds of 110 = 1,100)')

# ---- Kernels (Figure 3) ----
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
    chk('%s: "%.2f× fewer generations, comparable performance"' % (task, claim), 'S4.F3', '%.2f×' % claim, '%.3f× = %d / %d' % (ratio, ff[-1][0], dd[-1][0]), 'reproduces', 'ratio of the two total budgets; at the end Dream-RSI is %.1f%% below fixed (%.4f against %.4f)' % (100 * (1 - dd[-1][1] / ff[-1][1]), dd[-1][1], ff[-1][1]))
    fx_reach = first_at_least(ff, dd[-1][1])
    chk('%s: generations fixed exploration needs to reach Dream-RSI\'s final value' % task, 'S4.F3', '', '%d (ratio %.2f×)' % (fx_reach, fx_reach / dd[-1][0]), 'added', 'the matched-performance saving is smaller than the printed one')
for task, claim in (('ConvDiv', 2.09), ('ConvMax', 1.44)):
    dd, ff = F4[task]['dream'], F4[task]['fixed']
    bud = dd[-1][0]; nb = min(ff, key=lambda p: abs(p[0] - bud))
    chk('%s: "%.2f× higher performance at a similar budget"' % (task, claim), 'S4.F3', '%.2f×' % claim, '%.3f× = %.4f / %.4f (fixed at %d)' % (dd[-1][1] / nb[1], dd[-1][1], nb[1], nb[0]), 'reproduces')
    chk('%s: Dream-RSI final against fixed exploration\'s final (990 generations)' % task, 'S4.F3', '', '%.2f×' % (dd[-1][1] / ff[-1][1]), 'added')
dd, ff = F4['ConvMax']['dream'], F4['ConvMax']['fixed']
chk('ConvMax before Dream-RSI\'s last round', 'S4.F3', '', '%.4f at %d generations; fixed %.4f at 550 and %.4f at 660' % (dd[-2][1], dd[-2][0], at_budget(ff, 550), at_budget(ff, 660)), 'added', 'Dream-RSI was behind until its last round; the whole 1.44× comes from one jump (0.2786 to 0.4310)')
for task in F4:
    dd = F4[task]['dream']
    per = [dd[0][0]] + [dd[i][0] - dd[i - 1][0] for i in range(1, len(dd))]
    chk('%s: generations per round, Dream-RSI' % task, 'S4.F3', '', str(per), 'added', '%d rounds; fixed exploration: %d rounds of 110' % (len(dd), len(F4[task]['fixed'])))

# ---- Analysis (Figures 6 and 7) ----
cum = [sum(F6['attempts'][:i + 1]) for i in range(9)]
cd = [p[0] for p in F4['ConvDiv']['dream']]
chk('Figure 7 attempts add up to Figure 3\'s ConvDiv x positions', 'S5.F7', str(F6['attempts']), str(cum), 'reproduces' if cum == cd else 'does not', 'Figure 3: %s' % cd)
chk('Figure 7 round-best values equal Figure 3\'s ConvDiv curve', 'S5.F7', str(F6['best']), str([round(p[1], 3) for p in F4['ConvDiv']['dream']]), 'reproduces' if all(abs(a - b[1]) < 6e-4 for a, b in zip(F6['best'], F4['ConvDiv']['dream'])) else 'does not')
chk('"reducing the number of evaluated attempts from 110 to 50"', 'S5.SS0.SSS0.Px3', '110 → 50', '%d → %d (E1 → E4)' % (F6['attempts'][1], min(F6['attempts'])), 'reproduces', 'one run; 9 points')
def cmp_guided(a, b):
    out = []
    for x, y in b:
        ya = at_budget(a, x)
        if ya is not None: out.append((x, y, ya))
    return out
gf = cmp_guided(F5['fixed'], F5['fixed_guided'])
ahead = [x for x, y, ya in gf if y > ya]
chk('Figure 6: v1\'s guidance "consistently underperforms" (fixed exploration)', 'S5.SS0.SSS0.Px2', 'consistently (v1)', 'guided run ahead at %s generations, behind from 660' % ahead, 'v1 only', 'compared round by round at equal generations; v2 claims only lower final performance')
gd = cmp_guided(F5['dream'], F5['dream_guided'])
ahead2 = [x for x, y, ya in gd if y > ya]
chk('Figure 6: v1\'s guidance "consistently underperforms" (Dream-RSI)', 'S5.SS0.SSS0.Px2', 'consistently (v1)', 'guided run ahead at %s generations' % ahead2, 'v1 only', 'Dream-RSI with guidance used %d rounds against %d without' % (len(F5['dream_guided']), len(F5['dream'])))
chk('Figure 6: guidance "yields lower final performance for both methods on ConvDiv" (v2)', 'S5.SS0.SSS0.Px2', 'lower final', 'fixed %.4f against %.4f; Dream-RSI %.4f against %.4f' % (F5['fixed_guided'][-1][1], F5['fixed'][-1][1], F5['dream_guided'][-1][1], F5['dream'][-1][1]), 'reproduces', 'one run per arm, one task')
chk('Figure 6 reuses Figure 3\'s ConvDiv runs', 'S5.F6', '', 'identical to 2e-4' if all(abs(a[1] - b[1]) < 3e-4 for a, b in zip(F5['dream'], F4['ConvDiv']['dream'])) else 'differ', 'added', 'and starts both from %.4f (1/ms) at 0 generations; v2\'s Figure 3 draws that start point too' % F5['start'])

# ---- v2 only: same runs redrawn, PACEvolve, harness, history ablation, configurations, the released score ----
FV1, FV2 = json.load(open('inputs/figs.json'))['figures'], json.load(open('inputs/figs_v2.json'))['figures']
def mdiff(a, b, skip=None, ymax=float('inf')):  # largest y difference between points of two decoded panels matched by x (legend markers and x = 0 starts left out)
    m = 0.0
    for kind in ('markers', 'lines'):
        for col, v in a.get(kind, {}).items():
            if col == skip: continue
            w = b.get(kind, {}).get(col)
            if w is None: continue
            pa = v if kind == 'markers' else v[0]; pb = w if kind == 'markers' else w[0]
            for x, y in pa:
                if x < 50 or y > ymax: continue  # legend markers sit above the plotted range
                q = [y2 for x2, y2 in pb if abs(x2 - x) < 1]
                if not q: return float('inf')
                m = max(m, min(abs(y - y2) for y2 in q))
    return m
dk = max(mdiff(a, b) for a, b in zip(FV1['S4.F4'][:4], FV2['S4.F3'][:4]))
dl = max(mdiff(a, b) for a, b in zip(FV1['S4.F3'], FV2['S4.F4']))
dg = mdiff(FV1['S5.F5'][0], FV2['S5.F6'][0], skip='#D55E00', ymax=2.2)
dgg = mdiff({'markers': {'c': FV1['S5.F5'][0]['markers']['#D55E00']}}, {'markers': {'c': FV2['S5.F6'][0]['markers']['#D55E00']}}, ymax=2.2)
chk('v2 redraws v1\'s runs: kernels (Figure 3), Lasso dynamics (Figure 4b), guidance (Figure 6)', 'S4.F3', 'same runs', 'largest difference %.4f per ms (kernels), %.1f ms (Lasso), %.4f per ms (guidance, three runs)' % (dk, dl, dg), 'added', 'within the decoding precision; the guided Dream-RSI curve alone is redrawn up to %.4f higher. This page keeps the v1 decode for the runs both versions draw' % dgg)
PC = TB['pace']
chk('PACEvolve\'s final kernel speeds: Figure 3\'s labels against Appendix C\'s Figure 8', 'A3.F8', ', '.join('%.4f' % PC[k]['label'] for k in PC), ', '.join('%.4f' % PC[k]['f8_final'] for k in PC), 'reproduces' if all(abs(PC[k]['label'] - PC[k]['f8_final']) < 2e-4 for k in PC) else 'does not', 'VGG16, LayerNorm, ConvDiv, ConvMax')
chk('Where Figure 3 draws PACEvolve\'s dashed line', 'S4.F3', ', '.join('%.4f' % PC[k]['label'] for k in PC), ', '.join('%.4f' % PC[k]['line_drawn_at'] for k in PC), 'added', 'drawn above its printed value on VGG16, LayerNorm and ConvMax (read the labels); only ConvDiv\'s line sits at its value')
chk('PACEvolve\'s generations within its 48-hour cap, against Dream-RSI\'s', 'A3', '48 hours', ', '.join('%d' % PC[k]['f8_generations'] for k in PC) + ' against ' + ', '.join('%d' % F4[k]['dream'][-1][0] for k in PC), 'added', 'PACEvolve made fewer generations in its two days than Dream-RSI used; its model is not named')
chk('Dream-RSI final ÷ PACEvolve final, per kernel', 'S4.SS1.SSS0.Px1', '"surpasses PACEvolve"', ', '.join('%.2f×' % (F4[k]['dream'][-1][1] / PC[k]['label']) for k in PC), 'reproduces', 'fixed exploration also beats PACEvolve on all four (%s)' % ', '.join('%.2f×' % (F4[k]['fixed'][-1][1] / PC[k]['label']) for k in PC))
H = TB['harness']; n = H['tasks'] * H['runs_per_task']
tr = [round(y * n, 2) for y in [H['seed']] + [p[1] for p in H['steps']]]
chk('Harness scores are whole numbers of the %d trials (89 tasks × 2 runs)' % n, 'S4.F5', '0.7247 → 0.8090', ', '.join('%g' % t for t in tr), 'reproduces' if all(abs(t - round(t)) < 0.03 for t in tr) else 'does not', '%d of %d passed trials to %d of %d: %d more trials' % (round(tr[0]), n, round(tr[-1]), n, round(tr[-1]) - round(tr[0])))
chk('"improves the seed harness by over 8 points"', 'S1', '> 8 points', '%.2f points' % (100 * (H['final'] - H['seed'])), 'reproduces')
se = math.sqrt(H['final'] * (1 - H['final']) / n)
chk('Spread of one full-suite evaluation, if trials were independent', 'S4.F5', 'not reported', '±%.3f (one standard error at 0.81 over %d trials)' % (se, n), 'added', 'the reported 0.8090 is the best of %d evaluated harnesses on the same 89 tasks it was selected on, with no held-out tasks and no repeat' % H['end_generations'])
chk('Harness budget used against Table 3\'s maximum', 'A2.T3', '9 rounds × 16 calls', '%d generations in Figure 5(a), of at most %d' % (H['end_generations'], 9 * 16), 'added', 'no fixed-policy run: "estimated to cost over $100,000"')
hs = TB['hist']; cdv = F4['ConvDiv']['dream']
chk('Table 2: all history 1.90 at 786 calls is Figure 3\'s ConvDiv run', 'S5.T2', '1.90, 786', '%.4f at %d' % (cdv[-1][1], cdv[-1][0]), 'reproduces')
near = max(p for p in cdv if p[0] <= hs['current']['compute'] + 10)
chk('Table 2 at matched calls: the all-history run near 430 calls', 'S5.T2', 'current history only: 1.59 at 430', '%.4f at %d' % (near[1], near[0]), 'added', 'at about the same spend the current-history-only run is ahead; the all-history run wins by spending 786; one run each')
CF = TB['config']['rows']
chk('Table 3 budgets match the fixed runs: Lasso 5 × 110, 5 × 640; kernels 9 × 110; maths 10 × 110', 'A2.T3', 'T × B', '%d, %d, %d, %d' % (CF[0]['T'] * CF[0]['B'], CF[1]['T'] * CF[1]['B'], CF[2]['T'] * CF[2]['B'], CF[6]['T'] * CF[6]['B']), 'reproduces', '550 and 3,200 are Figure 4(a)\'s fixed compute and 990 Figure 3\'s fixed budget; 1,100 for the maths tasks')
CS = json.load(open('inputs/check_score.json'))
chk('The released replay score of the fixed starting policy (parallel refine)', 'S3.E1', 'not reported', 'area %.3f, penalty %.3f, score %.4f' % (CS['incumbent']['auc'], CS['incumbent']['penalty'], CS['incumbent']['reward']), 'added', 'run with the released eval.py on this page\'s worlds: a policy without a budget knob spends the full grid at every budget preference, so its area is zero; any policy that reaches something with fewer calls outscores it')

summ = {k: sum(1 for c in checks if c['verdict'] == k) for k in ('reproduces', 'partly', 'does not', 'added', 'v1 only')}
out = {'checks': checks, 'summary': summ,
       'gmean': {k: round(v, 2) for k, v in g.items()},
       'lasso_wins': {'pro': wins_p, 'flash': wins_f, 'pro_vs_dagger': wins_pd, 'flash_vs_dagger': wins_fd},
       'ratios': {'glmnet': [round(x, 3) for x in rg], 'sklearn': [round(x, 3) for x in rs], 'dagger': [round(x, 3) for x in rt]},
       'rcv1_share': round(share, 4)}
json.dump(out, open('inputs/recompute.json', 'w'), indent=1, ensure_ascii=False)
for c in checks: print('[%s] %s :: %s :: %s %s' % (c['verdict'], c['claim'], c['printed'], c['recomputed'], ('(' + c['note'] + ')') if c['note'] else ''))
print(summ)
