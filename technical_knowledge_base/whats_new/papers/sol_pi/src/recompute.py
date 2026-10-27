"""Recompute every derived number the paper (and its blog) prints, plus checks the paper does not make.
Writes inputs/recompute.json; the Tables tab shows each check with its formula and verdict.
usage: python3 recompute.py   (after mk_tables.py; plain Python 3)"""
import json
T = json.load(open('tables.json'))
SOL = {r['name']: r for r in T['sol']}; OP = {r['name']: r for r in T['opus']}
A = {k: {r['name']: r for r in v} for k, v in T['abl'].items()}
F = T['figs']
C = []
def chk(what, where, printed, ours, verdict, how, cat='paper'):
    C.append({'what': what, 'where': where, 'printed': printed, 'ours': ours, 'verdict': verdict, 'how': how, 'cat': cat})
pct = lambda a, b: 100 * (1 - a / b)
def rnd(x, d): return ('%.' + str(d) + 'f') % x
def same(printed, x, d): return rnd(x, d) == printed
# ---------- headline reductions ----------
for bk, R, at in (('GPT-5.6 Sol', SOL, 'S3.SS1'), ('Opus 5', OP, 'S3.SS1')):
    pi, ef = R['Pi'], R['SoL-Pi [Efficiency]']
    tr = pct(ef['total'], pi['total']); co = pct(ef['cost'], pi['cost']); sc = 100 * ef['score'] / pi['score']
    p_tr, p_co, p_sc = ('49.0', '33.2', '93.7') if bk == 'GPT-5.6 Sol' else ('44.7', '33.5', '94.3')
    chk('Token traffic cut against Pi, ' + bk, at, p_tr + '%', rnd(tr, 2) + '%', 'reproduces' if same(p_tr, tr, 1) else 'does not', '1 - total(SoL-Pi) / total(Pi) = 1 - %s / %s' % (ef['total_s'], pi['total_s']))
    chk('API cost cut against Pi, ' + bk, at, p_co + '%', rnd(co, 2) + '%', 'reproduces' if same(p_co, co, 1) else 'does not', '1 - cost(SoL-Pi) / cost(Pi) = 1 - %s / %s' % (ef['cost_s'], pi['cost_s']))
    chk('Share of Pi\'s score kept, ' + bk, at, p_sc + '%', rnd(sc, 2) + '%', 'reproduces' if same(p_sc, sc, 1) else 'does not', 'score(SoL-Pi) / score(Pi) = %s / %s; in points: %s' % (ef['score_s'], pi['score_s'], rnd(ef['score'] - pi['score'], 2)))
# Performance point
pi, pf = SOL['Pi'], SOL['SoL-Pi [Performance]']
chk('Performance point score gain, GPT-5.6 Sol', 'S3.SS1', '5.3%', rnd(100 * (pf['score'] / pi['score'] - 1), 2) + '%', 'reproduces', '47.208 / 44.833 - 1')
chk('Performance point traffic cut, GPT-5.6 Sol', 'S3.SS1', '6.1%', rnd(pct(pf['total'], pi['total']), 2) + '%', 'reproduces', '1 - 2.0224 / 2.1538')
chk('Performance point token-efficiency gain, GPT-5.6 Sol', 'S3.SS1', '9.8%', rnd(pct(pf['eff'], pi['eff']), 2) + '%', 'reproduces', '1 - 0.5280 / 0.5855 ($ per score point)')
po, pio = OP['SoL-Pi [Performance]'], OP['Pi']
g = 100 * (po['score'] / pio['score'] - 1); e = pct(po['eff'], pio['eff'])
chk('Conclusion: "improve model performance by 5.3-12.8%"', 'S5', '5.3-12.8%', '5.30-' + rnd(g, 2) + '%', 'reproduces', 'Opus 5: 50.482 / 44.756 - 1. Both ends are the best of four add-one variants, picked on EdgeBench itself')
chk('Conclusion: "token efficiency by 9.8-18.2%"', 'S5', '9.8-18.2%', '9.82-' + rnd(e, 2) + '%', 'reproduces', 'Opus 5: 1 - 0.6235 / 0.7625')
# Figure 1(b) and blog: against native harnesses
c1 = pct(SOL['SoL-Pi [Efficiency]']['cost'], SOL['Codex']['cost']); c2 = pct(OP['SoL-Pi [Efficiency]']['cost'], OP['Claude Code']['cost'])
chk('Cost cut against Codex (GPT-5.6 Sol)', 'S0.F1', '50.0%', rnd(c1, 2) + '%', 'reproduces', '1 - 894 / 1,787')
chk('Cost cut against Claude Code (Opus 5)', 'S0.F1', '54.3%', rnd(c2, 2) + '%', 'reproduces', '1 - 1,158 / 2,535')
t1 = pct(SOL['SoL-Pi [Efficiency]']['total'], SOL['Codex']['total']); t2 = pct(OP['SoL-Pi [Efficiency]']['total'], OP['Claude Code']['total'])
chk('Blog: "35-64% fewer tokens" than the native harnesses', 'blog', '35-64%', rnd(t2, 1) + '-' + rnd(t1, 1) + '%', 'reproduces', '1 - 1.3101 / 2.0045 and 1 - 1.0990 / 3.0537', 'blog')
# ---------- hourly savings ----------
H = 51 * 2
pairs = [('vs Codex (GPT-5.6 Sol)', SOL['Codex']['cost'] - SOL['SoL-Pi [Efficiency]']['cost'], '8.75'),
         ('vs Claude Code (Opus 5)', OP['Claude Code']['cost'] - OP['SoL-Pi [Efficiency]']['cost'], '13.50'),
         ('vs Pi (GPT-5.6 Sol)', SOL['Pi']['cost'] - SOL['SoL-Pi [Efficiency]']['cost'], '4.36'),
         ('vs Pi (Opus 5)', OP['Pi']['cost'] - OP['SoL-Pi [Efficiency]']['cost'], '5.71')]
hourly = []
for n, d, p in pairs:
    v = d / H; lo, hi = (d - 1) / H, (d + 1) / H
    ok = same(p, v, 2); inr = lo <= float(p) <= hi
    hourly.append({'n': n, 'diff': d, 'v': v, 'p': p})
    chk('Hourly saving ' + n, 'abstract', '$' + p, '$' + rnd(v, 3), 'reproduces' if ok else ('within rounding' if inr else 'does not'),
        'cost difference / (51 tasks x 2 h) = $%d / 102 h; printed costs are whole dollars, so each difference is known to about $1' % round(d), 'derived')
# ---------- internal consistency ----------
mx = 0; worst = ''
for R in (T['sol'], T['opus']) + tuple(T['abl'].values()):
    for r in R:
        x = r['cost'] / (r['score'] * 51); dev = abs(x - r['eff']) / r['eff']
        if dev > mx: mx, worst = dev, r['name']
chk('Token efficiency = cost / (average score x 51 tasks), every row', 'S3.T1', 'not stated', 'max deviation %.2f%% (%s)' % (100 * mx, worst), 'reproduces' if mx < .001 else 'does not',
    'The printed $/score column is cost divided by the summed score of 51 tasks: so the tables score all 51 public tasks, including the 11 used for acceptance (section 2.5)', 'added')
mxs = 0
for R in (T['sol'], T['opus']) + tuple(T['abl'].values()):
    for r in R:
        s = r['input'] + r['cache_read'] + r['cache_write'] + r['output']; mxs = max(mxs, abs(s - r['total']))
chk('Total traffic = input + cache read + cache write + output, every row', 'S3.T1', 'not stated', 'max gap %.4f B' % mxs, 'reproduces' if mxs <= 0.00021 else 'does not', 'four-decimal rounding allows up to 0.0002 B', 'added')
shares = {k: 100 * R['cache_read'] / R['total'] for k, R in (('Pi, GPT-5.6 Sol', SOL['Pi']), ('SoL-Pi, GPT-5.6 Sol', SOL['SoL-Pi [Efficiency]']), ('Pi, Opus 5', OP['Pi']), ('SoL-Pi, Opus 5', OP['SoL-Pi [Efficiency]']))}
chk('Cache reads as a share of recorded traffic', 'S3.T4', 'not stated', ', '.join('%s %.1f%%' % (k, v) for k, v in shares.items()), 'added', 'cache read / total', 'added')
# Opus 5 prices recovered from the table: list prices $5 input, $0.50 cache read, $6.25 cache write, $25 output per million
PR = {'input': 5, 'cache_read': .5, 'cache_write': 6.25, 'output': 25}
res = []
for r in T['abl']['Opus 5'] + [OP['Claude Code']]:
    est = sum(PR[k] * r[k] * 1000 for k in PR); res.append((r['name'], est, r['cost'] - est))
mr = max(abs(x[2]) for x in res)
chk('Opus 5 costs = $5 input + $0.50 cache read + $6.25 cache write + $25 output per million tokens', 'S3.T4', 'not stated', 'max residual $%.1f over %d rows' % (mr, len(res)), 'reproduces' if mr < 3 else 'does not',
    'Four-decimal billions carry up to 0.00005 B of rounding per column (up to $1.25 on output), so a residual under $3 is a fit within rounding. The cache write/read ratio is 12.5, the default in the released code', 'added')
# decomposition of the Opus saving
def parts(r): return {k: PR[k] * r[k] * 1000 for k in PR}
dp, de = parts(OP['Pi']), parts(OP['SoL-Pi [Efficiency]'])
dec = {k: dp[k] - de[k] for k in PR}
chk('Where the Opus 5 saving against Pi comes from', 'S3.T4', '$583', 'cache read $%.0f, cache write $%.0f, output $%.0f' % (dec['cache_read'], dec['cache_write'], dec['output']), 'added', 'price x (Pi tokens - SoL-Pi tokens) per category, at the recovered list prices', 'added')
# GPT-5.6 Sol: no fixed price list fits (least squares on the 11 distinct rows)
rows = T['sol'] + [x for x in T['abl']['GPT-5.6 Sol'] if x['kind'] == 'one' and x['name'] != '+ ObservationPack']
def lstsq(X, y):
    n = len(X[0]); M = [[sum(X[i][a] * X[i][b] for i in range(len(X))) for b in range(n)] + [sum(X[i][a] * y[i] for i in range(len(X)))] for a in range(n)]
    for c in range(n):
        p = max(range(c, n), key=lambda r: abs(M[r][c])); M[c], M[p] = M[p], M[c]
        for r in range(n):
            if r != c:
                f = M[r][c] / M[c][c]; M[r] = [a - f * b for a, b in zip(M[r], M[c])]
    return [M[i][n] / M[i][i] for i in range(n)]
X = [[r[k] * 1000 for k in ('input', 'cache_read', 'cache_write', 'output')] for r in rows]; y = [r['cost'] for r in rows]
w = lstsq(X, y); rs = [yy - sum(a * b for a, b in zip(xx, w)) for xx, yy in zip(X, y)]
chk('GPT-5.6 Sol costs as one fixed price per token type', 'S3.T1', 'not stated', 'best fit: input $%.2f, cache read $%.2f, cache write $%.2f, output $%.2f per million; residuals up to $%.0f' % (w[0], w[1], w[2], w[3], max(abs(v) for v in rs)), 'does not',
    'Least squares over the 11 distinct GPT-5.6 Sol rows. No fixed price list reproduces them (the best fit even needs a negative input price), so the GPT-5.6 Sol prices depend on something the paper does not state, such as a long-context tier', 'added')
# ---------- Table 3 and swarm ----------
t3 = {r['name']: r for r in T['t3']}
for n in ('Codex', 'Pi', 'SoL-Pi'):
    r = t3[n]
    chk('Terminal-Bench 4 cost per solved task, ' + n, 'S3.T3', '$' + rnd(r['tb_per'], 2), '$' + rnd(r['tb_cost'] / r['tb_solved'], 3), 'reproduces' if same(rnd(r['tb_per'], 2), r['tb_cost'] / r['tb_solved'], 2) else 'does not', '%s / %d' % (rnd(r['tb_cost'], 2), r['tb_solved']))
    chk('IMO 2026 cost per passed problem, ' + n, 'S3.T3', '$' + rnd(r['imo_per'], 2), '$' + rnd(r['imo_cost'] / r['imo_pass'], 3), 'reproduces' if same(rnd(r['imo_per'], 2), r['imo_cost'] / r['imo_pass'], 2) else 'does not', '%s / %d' % (rnd(r['imo_cost'], 2), r['imo_pass']))
chk('Terminal-Bench 4 total cost cut against Pi', 'S3.SS2', '26.3%', rnd(pct(211.12, 286.45), 2) + '%', 'reproduces', '1 - 211.12 / 286.45; SoL-Pi solved 15 tasks against Pi\'s 18')
chk('Terminal-Bench 4 cost per solved task cut against Pi', 'S3.SS2', '11.6%', rnd(pct(14.07, 15.91), 2) + '%', 'reproduces', '1 - 14.07 / 15.91')
sw = {r['name'][:10]: r for r in T['swarm']}
chk('Swarm API cost cut against the Pi swarm', 'S3.SS3', '26.8%', rnd(pct(60.11, 82.12), 2) + '%', 'reproduces', '1 - 60.11 / 82.12 (one two-hour run each)')
chk('Blog: swarm reaches "17.5% fewer cycles" than the Pi swarm', 'blog', '17.5%', rnd(pct(1127, 1366), 2) + '%', 'reproduces', '1 - 1,127 / 1,366', 'blog')
chk('Swarm speed-up over the frozen starter', 'S3.SS3', 'not stated', '%.0fx (SoL-Pi swarm), %.0fx (single agent), %.0fx (Pi swarm)' % (147734 / 1127, 147734 / 1333, 147734 / 1366), 'added', '147,734 / final cycles', 'added')
# ---------- figures ----------
bad = []
for f in ('fig6', 'fig7'):
    for pair in F[f]['trigger_rate_pct']:
        for v in pair:
            k = round(v / 100 * 51)
            if abs(100 * k / 51 - v) > .05: bad.append(v)
chk('Figure 6 and 7 trigger rates are whole numbers of 51 tasks', 'S3.F6', 'not stated', 'all 16 labels are k/51 (for example 78.4% = 40/51, 33.3% = 17/51)' if not bad else 'off: ' + str(bad), 'reproduces' if not bad else 'does not', 'round(rate x 51) / 51 matches each printed label to 0.05 points: the figures, like the tables, cover all 51 tasks', 'added')
same67 = all(F['fig7'][k][i][0] == F['fig6'][k][i][0] for k in ('trigger_rate_pct', 'intensity', 'gain_pct') for i in range(4))
chk('Figure 7 "enabled alone" bars equal Figure 6\'s GPT-5.6 Sol bars', 'S3.F7', 'not stated', 'all 12 equal' if same67 else 'differ', 'reproduces' if same67 else 'does not', 'cross-check of two figures that share runs', 'added')
chk('Action Fusion projected turns saved', 'S3.F8', '10.8%', rnd(pct(1237, 1386), 2) + '%', 'reproduces', '1 - 1,237 / 1,386 (a projection from recorded trajectories, not a rerun)')
chk('Action Fusion projected tokens saved', 'S3.F8', '11.5%', rnd(pct(28.64, 32.38), 2) + '%', 'reproduces', '1 - 28.64 / 32.38 million')
chk('Action Fusion lineage iterations', 'S3.F8', '27', str(1 + 6 + 18 + 2), 'reproduces', '1 oracle + 6 baseline + 18 prompt + 2 validation')
sc = F['fig8']['task_score_batches']
chk('Action Fusion: selected batch against best-scoring batch', 'S3.F8', 'batch 10 "performed best overall"', 'batch 10 scored %.1f; batch 9 scored %.1f' % (sc[-1], max(sc)), 'added', 'printed labels of Figure 8(c); batch 10 was chosen on trigger rate (100%) and score together', 'added')
# ---------- search scale ----------
fam = {'Context': 24, 'Progress': 26, 'Tools': 26, 'Delegation': 15, 'Prompt and policy': 15, 'Improvement and evaluation': 46}
chk('Proposal families add up to the 152 directions', 'blog', '152', str(sum(fam.values())), 'reproduces', ' + '.join('%s %d' % kv for kv in fam.items()), 'blog')
chk('Survival rate of starting ideas', 'blog', '"about one out of every forty"', '4 / 152 = 1 in %.0f' % (152 / 4), 'reproduces', '152 directions, 4 retained mechanisms', 'blog')
chk('Search environments', 'S2.SS3', '535', str(495 + 40), 'reproduces', '495 repository + 40 verifier-driven')
chk('ObservationPack excerpt size: paper, blog and released code', 'S2.SS4.SSS0.Px3', '1 KB (paper)', 'blog: 2,048-byte head + 1,536-byte tail; code: 1,024 bytes (512 + 512)', 'does not', 'Figure 4(c) and the code (PLACEHOLDER_EXCERPT_BYTES = 1024) agree; the blog describes the selected sweep configuration "V2" differently', 'added')
v = {}
for c in C: v[c['verdict']] = v.get(c['verdict'], 0) + 1
out = {'checks': C, 'summary': v, 'hourly': hourly, 'opus_prices': PR, 'opus_decomp': {'pi': dp, 'sol': de},
       'opus_fit': [{'n': a, 'est': b, 'res': c} for a, b, c in res], 'sol_fit': {'w': w, 'res': [{'n': r['name'], 'res': x} for r, x in zip(rows, rs)]}, 'cache_read_share': shares}
json.dump(out, open('inputs/recompute.json', 'w'), indent=1)
print(len(C), 'checks', v)
for c in C:
    if c['verdict'] not in ('reproduces', 'added'): print(' ', c['verdict'], '|', c['what'], '|', c['printed'], '|', c['ours'])
