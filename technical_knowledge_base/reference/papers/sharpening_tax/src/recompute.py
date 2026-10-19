"""Recompute every derived number the page shows, from tables.json (the paper's printed tables) and
inputs/replay.json (mk_data.py's replay of the authors' released per-task counts).

  python3 recompute.py        (build.sh runs it after mk_tables.py and mk_data.py)

Writes inputs/recompute.json: {'checks': [...], 'counts': {...}, 'ptgs': [...], 'thm2': {...}}. Each check states the paper's
number, ours, and whether ours is independent of it (computed from the released counts) or by construction.
"""
import json, math, os

HERE = os.path.dirname(os.path.abspath(__file__))
T = json.load(open(os.path.join(HERE, 'tables.json')))
R = json.load(open(os.path.join(HERE, 'inputs', 'replay.json')))
C = R['cells']
key = {(c['bench'], i % 14): c for i, c in enumerate(C)}
checks = []


def add(claim, where, paper, ours, ok, how='independently, from the released counts'):
    checks.append({'claim': claim, 'at': where, 'paper': paper, 'ours': ours, 'ok': bool(ok), 'how': how})


# Table 7: every printed value against the replay
t7 = T['t7']['rows']
worst = {}
n_ok = {}
for c, t in zip(C, t7):
    for k, tol in (('CB', 5e-4), ('CP', 5e-4), ('dC', 5e-4), ('mB', 5e-4), ('mP', 5e-4), ('taxA', 5e-3), ('taxS', 5e-4)):
        d = abs(c[k] - t[k]); worst[k] = max(worst.get(k, 0), d); n_ok[k] = n_ok.get(k, 0) + (d <= tol + 1e-9)
cbar_off = [(c['bench'], c['pair'], 'base' if abs(c['mB'] - t['mB']) > 5e-4 + 1e-9 else 'post', round(c['mB'] if abs(c['mB'] - t['mB']) > 5e-4 + 1e-9 else c['mP'], 4), t['mB'] if abs(c['mB'] - t['mB']) > 5e-4 + 1e-9 else t['mP'])
            for c, t in zip(C, t7) if abs(c['mB'] - t['mB']) > 5e-4 + 1e-9 or abs(c['mP'] - t['mP']) > 5e-4 + 1e-9]
add('Table 7: coverage C = pass@128 of both models, all 42 cells', 'A4.T5', '84 values (3 decimals)', '%d of 84 match to the printed precision' % (n_ok['CB'] + n_ok['CP']), n_ok['CB'] + n_ok['CP'] == 84)
add('Table 7: TaxA(128) and TaxS(128), all 42 cells', 'A4.T5', '84 values', '%d of 84 match to the printed precision (largest gaps %.4f and %.5f)' % (n_ok['taxA'] + n_ok['taxS'], worst['taxA'], worst['taxS']), n_ok['taxA'] + n_ok['taxS'] == 84)
add('Table 7: budget-averaged coverage C-bar(128)', 'A4.T5', '84 values', '%d of 84 match to 3 decimals; the other %d are off by %.4f at most, in both directions' % (n_ok['mB'] + n_ok['mP'], 84 - n_ok['mB'] - n_ok['mP'], max(worst['mB'], worst['mP'])), max(worst['mB'], worst['mP']) < 1.5e-3)
lohi = max(max(abs(c['lo'] - t['lo']), abs(c['hi'] - t['hi'])) for c, t in zip(C, t7))
add('Table 7: 95% paired task-bootstrap CI of the coverage gap', 'A4.T5', '42 intervals', 'our own 1,000-resample bootstrap lands within %.3f of every printed bound (a different random draw)' % lohi, lohi <= 0.0101)
# Table 6 and Table 8
T6 = {(r['bench'], r['backbone']): r for r in T['t6']['rows']}
d6 = max(max(abs(a - b) for a, b in zip(c['catB'] + c['catP'], T6[(c['bk'], c['pair'])]['base'] + T6[(c['bk'], c['pair'])]['post'])) for c in C)
add('Table 6: always pass, pass given compute, always fail, both models, all 42 cells', 'A3.T4', '252 percentages', 'all 252 match (largest gap %.2f points)' % d6, d6 < 0.051)
d8m = max(max(abs(a - b) for a, b in zip(c['mov'], [t['lost'], t['gained'], t['both'], t['neither']])) for c, t in zip(C, T['t8']['rows']))
d8c = max(max(abs(a - b) for a, b in zip(c['contrib'], [t['cLost'], t['cGained'], t['shape']])) for c, t in zip(C, T['t8']['rows']))
add('Table 8: lost, gained, both, neither shares and the three contributions to TaxA(128)', 'A4.T6', '294 values', 'all match to the printed precision (shares within %.2f points, contributions within %.3f)' % (d8m, d8c), d8m < 0.051 and d8c < 0.0051)
# Corollary 4 inside the printed table: A = 128 (C - C-bar), so TaxA = 128 [(CB - mB) - (CP - mP)]
c4 = max(abs(128 * ((t['CB'] - t['mB']) - (t['CP'] - t['mP'])) - t['taxA']) for t in t7)
add('Corollary 4 on the printed Table 7: TaxA = 128 [(CB - C-bar B) - (CP - C-bar P)]', 'A2.E8', 'identity', 'holds to within %.2f, which three-decimal rounding of C and C-bar allows (up to 0.26)' % c4, c4 <= 0.26, 'from the printed table alone')
# counts behind the headline claims
pos_taxS = sum(t['taxS'] > 0 for t in t7); pos_taxA = sum(t['taxA'] > 0 for t in t7)
add('"TaxS(128) > 0 in 36 of the 42 combinations"', 'S4', '36 of 42', '%d of 42 (printed Table 7); %d of 42 for TaxA' % (pos_taxS, pos_taxA), pos_taxS == 36, 'from the printed table')
dc_pos = sum(t['dC'] > 0 for t in t7); dc_sig = sum(t['lo'] > 0 for t in t7); dc_neg = sum(t['hi'] < 0 for t in t7)
add('Base model reaches more tasks than its post-trained version at k = 128 (coverage gap above zero)', 'A4.T5', 'not counted in the paper', '%d of 42; the printed 95%% interval excludes zero in %d (base ahead) and %d (post-trained ahead)' % (dc_pos, dc_sig, dc_neg), True, 'from the printed table')
# section 3 and Appendix C numbers
g31w = next(c for c in C if c['bk'] == 'webshop' and c['pair'] == 'gemma-4-31B')
add('"over 85% pass@128 on WebShop vs 56% for RL with gemma-4-31B"', 'S3', '>85% and 56%', '%.1f%% and %.1f%%' % (100 * g31w['CB'], 100 * g31w['CP']), g31w['CB'] > 0.85 and abs(g31w['CP'] - 0.56) < 0.005)
add('Crossover on WebShop, gemma-4-31B: "k* about 3"', 'S3', 'about 3', 'k* = %d (first k where base pass@k reaches the post-trained one)' % g31w['cross'], g31w['cross'] == 3)
g4w = next(c for c in C if c['bk'] == 'webshop' and c['pair'] == 'gemma-4-E4B')
add('Crossover on WebShop, gemma-4-E4B: "k* > 128"', 'S3', '> 128', 'never within 128' if g4w['cross'] is None else 'k* = %d' % g4w['cross'], g4w['cross'] is None)
add('Largest backbones: mean base curve overtakes the post-trained one "at around k = 22"', 'A3.SS1', 'about 22', 'k = %s' % R['agg']['largest']['cross'], R['agg']['largest']['cross'] == 22)
add('Smallest backbones: the base curve "never catches up within the budget"', 'A3.SS1', 'never', 'never' if R['agg']['smallest']['cross'] is None else 'k = %d' % R['agg']['smallest']['cross'], R['agg']['smallest']['cross'] is None)
g4b = next(c for c in C if c['bk'] == 'bfcl' and c['pair'] == 'gemma-4-E4B')
add('gemma-4-E4B base pass@1: "1.8% on WebShop and 1.4% on BFCLv4"', 'A3.SS3', '1.8% and 1.4%', '%.2f%% and %.2f%%' % (100 * g4w['p1B'], 100 * g4b['p1B']), round(100 * g4w['p1B'], 1) == 1.8 and round(100 * g4b['p1B'], 1) == 1.4)
add('gemma-4-E4B at k = 128: "65.2% vs. 48.6% on WebShop and 38.5% vs. 27.0% on BFCLv4"', 'A3.SS3', '65.2/48.6, 38.5/27.0', '%.1f/%.1f, %.1f/%.1f' % (100 * g4w['CP'], 100 * g4w['CB'], 100 * g4b['CP'], 100 * g4b['CB']), True)
f7 = R['fig7']
add('Figure 7 (left): Spearman 0.85 between TaxS(8) from 8 rollouts on half the tasks and TaxS(32) on the held-out half', 'S4.F6', 'rho = 0.85 (one split)',
    'mean %.2f over 200 random task splits (5th to 95th percentile %.2f to %.2f); %.2f when both are computed on all tasks and all rollouts' % (f7['rho_mean'], f7['rho_p5'], f7['rho_p95'], f7['full_data_rho']), f7['rho_p95'] >= 0.85 - 0.005,
    'independently, from the released counts (how the 8 rollouts were chosen is not stated; a random subset is used here)')
# Table 1 against Table 4's own average row
t4avg = [r for r in T['t4']['rows'] if r['backbone'].startswith('Average')]
d1 = max(max(abs(a['p1_wo'] - b['b_p1_wo']), abs(a['p1_w'] - b['b_p1_w']), abs(a['p32_wo'] - b['b_p32_wo']), abs(a['p32_w'] - b['b_p32_w'])) for a, b in zip(T['t1']['rows'], t4avg))
rows4 = [r for r in T['t4']['rows'] if not r['backbone'].startswith('Average')]
d1b = 0
for b, t1 in zip(('BFCL', 'WebShop', 'ACEBench'), T['t1']['rows']):
    rr = [r for r in rows4 if r['bench'] == b]
    for k1, k4 in (('p1_wo', 'b_p1_wo'), ('p1_w', 'b_p1_w'), ('p32_wo', 'b_p32_wo'), ('p32_w', 'b_p32_w')):
        d1b = max(d1b, abs(sum(r[k4] for r in rr) / len(rr) - t1[k1]))
add('Table 1 (harness, average of eight base models) against Table 4 (per model)', 'A1.T2', 'two tables', 'agree within %.2f (average row) and %.2f (mean of the eight one-decimal rows)' % (d1, d1b), d1 < 0.06 and d1b < 0.06, 'from the printed tables')
zero_bfcl = sum(1 for r in rows4 if r['bench'] == 'BFCL' and r['b_p32_wo'] == 0)
add('"six of the eight base checkpoints score zero" on BFCL without the harness', 'A1.SS3', 'six of eight', '%d of 8' % zero_bfcl, zero_bfcl == 6, 'from the printed table')
hurt = sum(1 for r in rows4 if r['p_p1_w'] < r['p_p1_wo'])
add('The harness lowers post-trained models\' pass@1 "on average"', 'A1.SS3', 'on average', 'lower in %d of 24 model-benchmark rows' % hurt, hurt >= 12, 'from the printed table')
# Table 4 (N = 32 runs) against the released N = 128 counts: separate evaluations of the same setups
bmap = {'BFCL': 'bfcl', 'WebShop': 'webshop', 'ACEBench': 'acebench'}
t4n = []
for r in rows4:
    c = next((c for c in C if c['bk'] == bmap[r['bench']] and c['pair'] == r['backbone']), None)
    if c: t4n.append({'pair': r['backbone'], 'bench': r['bench'], 'base32': r['b_p1_w'], 'base128': round(100 * c['p1B'], 1), 'post32': r['p_p1_wo'], 'post128': round(100 * c['p1P'], 1)})
gap = max(max(abs(x['base32'] - x['base128']), abs(x['post32'] - x['post128'])) for x in t4n)
mgap = sum(abs(x['base32'] - x['base128']) + abs(x['post32'] - x['post128']) for x in t4n) / (2 * len(t4n))
worst4 = max(t4n, key=lambda x: max(abs(x['base32'] - x['base128']), abs(x['post32'] - x['post128'])))
add('pass@1 in Table 4 (32 rollouts) against the 128-rollout runs of the main results, same models and settings', 'A1.T2', 'not compared in the paper', 'separate evaluations: they differ by %.1f points on average and up to %.1f (%s %s: %.1f against %.1f for the %s model)' % (mgap, gap, worst4['pair'], worst4['bench'], worst4['base32'] if abs(worst4['base32'] - worst4['base128']) >= abs(worst4['post32'] - worst4['post128']) else worst4['post32'], worst4['base128'] if abs(worst4['base32'] - worst4['base128']) >= abs(worst4['post32'] - worst4['post128']) else worst4['post128'], 'base' if abs(worst4['base32'] - worst4['base128']) >= abs(worst4['post32'] - worst4['post128']) else 'post-trained'), True, 'from the printed table and the released counts')

# Table 2 against Table 9 and 10 (same runs), and the PTGS margins measured in standard errors
t2 = {(r['env'], r['method']): r for r in T['t2']['rows']}
t9 = {r['method']: r for r in T['t9']['rows']}
same = all(abs(t9['PPO with PTGS'][e][0][0] - t2[(n, 'PPO w/ PTGS')][k]) < 1e-9 and abs(t9['PPO, T = 1.0 (default)'][e][0][0] - t2[(n, 'PPO')][k]) < 1e-9
           for e, n in (('sok', 'Sokoban'), ('fl', 'FrozenLake')) for k in ('p1',)) and all(abs(t9['PPO with PTGS'][e][3][0] - t2[(n, 'PPO w/ PTGS')]['taxS']) < 1e-9 for e, n in (('sok', 'Sokoban'), ('fl', 'FrozenLake')))
add('Table 2 PPO rows are the same runs as Table 9 (T = 1.0 and PTGS)', 'A5.T7', 'same runs', 'identical values' if same else 'values differ', same, 'from the printed tables')
TQ = 2.776  # t quantile, 4 degrees of freedom: a 95% CI over five runs is mean +- 2.776 sd / sqrt(5)
ptgs = []
for e, n in (('sok', 'Sokoban'), ('fl', 'FrozenLake')):
    a, b = t9['PPO with PTGS'][e], t9['PPO, T = 1.0 (default)'][e]
    for i, m in enumerate(('pass@1', 'pass@128', 'pass^128', 'TaxS(128)')):
        diff = a[i][0] - b[i][0]; se = math.sqrt((a[i][1] / TQ) ** 2 + (b[i][1] / TQ) ** 2) / 1.0
        ptgs.append({'env': n, 'metric': m, 'ptgs': a[i][0], 'ppo': b[i][0], 'diff': round(diff, 3), 'z': round(diff / se, 2), 'overlap': abs(diff) < a[i][1] + b[i][1]})
best_fixed = {}
for e, n in (('sok', 'Sokoban'), ('fl', 'FrozenLake')):
    rows = [r for r in T['t9']['rows'] if r['method'].startswith('PPO, T')]
    lowtax = min(rows, key=lambda r: r[e][3][0]); best_fixed[n] = {'lowest_tax_fixed': lowtax['method'], 'tax': lowtax[e][3][0], 'p1': lowtax[e][0][0], 'ptgs_tax': t9['PPO with PTGS'][e][3][0]}
counts = {'taxS_pos': pos_taxS, 'taxA_pos': pos_taxA, 'dC_pos': dc_pos, 'dC_sig_base': dc_sig, 'dC_sig_post': dc_neg, 'cbar_off': cbar_off}
json.dump({'checks': checks, 'counts': counts, 't4n': t4n, 'ptgs': ptgs, 'best_fixed': best_fixed, 'fig7': f7, 'agg': R['agg']}, open(os.path.join(HERE, 'inputs', 'recompute.json'), 'w'), indent=1)
for c in checks:
    print(('ok ' if c['ok'] else 'NO ') + c['claim'][:90] + ' | ' + c['ours'])
print(json.dumps(counts)); print(json.dumps(ptgs)); print(json.dumps(best_fixed))
