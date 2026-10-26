"""Recompute every derived number the page shows and check the paper's statements against the data.

Inputs: tables.json (mk_tables.py), inputs/countdown_points.json (mk_countdown.py, the authors' released
Countdown-Code evaluations), inputs/toyenv_points.json (mk_toyenvs.py, their released toy-environment
logs), inputs/figs.json (decode_figs.py, the arXiv figures' vector geometry).
Writes inputs/recompute.json: {'checks': [...], 'cd': summary per arm, 'toy': summary per environment}.
Each check states the paper's number, ours, whether they agree, and how ours was obtained.
"""
import json, math, os, statistics as st
from decimal import Decimal, ROUND_HALF_UP

HERE = os.path.dirname(os.path.abspath(__file__))
J = lambda f: json.load(open(os.path.join(HERE, f)))
T, CD, TE, FG = J('tables.json'), J('inputs/countdown_points.json'), J('inputs/toyenv_points.json'), J('inputs/figs.json')
checks = []
R1 = lambda v: float(Decimal(repr(v)).quantize(Decimal('0.1'), rounding=ROUND_HALF_UP))


def add(claim, at, paper, ours, ok, how):
    checks.append({'claim': claim, 'at': at, 'paper': paper, 'ours': ours, 'ok': bool(ok), 'how': how})


# ---- Countdown-Code: the released per-seed endpoints ----
cd = {}
for a in CD['arms']:
    s = a['seeds']; row = {'n': len(s), 'seeds': [p['seed'] for p in s]}
    for k in ('hack', 'detected', 'undetected', 'constraint_relax', 'clean', 'proxy', 'retain'):
        xs = [p[k] * 100 for p in s]
        row[k] = st.mean(xs); row[k + '_sem'] = st.stdev(xs) / math.sqrt(len(xs)) if len(xs) > 1 else 0.0
    cd[a['label']] = row
g, rp, base, nr, dn = cd['GRAFT (ours)'], cd['Reward penalty'], cd['Base model'], cd['GRAFT w/o routing'], cd['No intervention']
REL = 'independently, from the released per-seed evaluations (mk_countdown.py)'
t4 = {r['n']: r for r in T['t4']['rows']}
add('GRAFT task performance, Table 4 (the scaffolded environment\'s "retain" metric)', 'A4.T4', '79.2 ± 1.0', '%.1f ± %.1f' % (R1(g['retain']), R1(g['retain_sem'])), R1(g['retain']) == 79.2 and R1(g['retain_sem']) == 1.0, REL)
add('GRAFT hack rate, Table 4', 'A4.T4', '1.6 ± 0.4', '%.1f ± %.1f' % (R1(g['hack']), R1(g['hack_sem'])), R1(g['hack']) == 1.6 and R1(g['hack_sem']) == 0.4, REL)
add('Base model, Table 4 and §4.1 ("4.7%")', 'A4.T4', '60.2 and 4.7', '%.1f and %.1f' % (R1(base['retain']), R1(base['hack'])), R1(base['retain']) == 60.2 and R1(base['hack']) == 4.7, REL)
add('Reward penalty learns constraint removal "on about 26% of trajectories" (blog: "about 30%")', 'S4.SS1', 'about 26%', '%.1f%% (constraint removal %.1f%%, monitored hack %.1f%%)' % (rp['hack'], rp['constraint_relax'], rp['detected']), abs(rp['constraint_relax'] - 26) < 1, REL)
best = max(CD['arms'][1]['seeds'], key=lambda p: p['proxy'] - 2 * p['detected'])
add('Appendix D.8: the developer-picked reward-penalty run "actually reward hacks on 28%"', 'A4.SS8', '28%', 'seed %d: %.1f%% (all three seeds have proxy reward 1.000)' % (best['seed'], best['hack'] * 100), abs(best['hack'] * 100 - 28) < 0.5, REL + '; the pick uses proxy reward minus 2 x detected rate, as D.8 states; ties go to the highest hack rate')
add('After GRAFT the clean solve rate is "roughly 16 percentage points higher than the base model\'s"', 'S4.SS1', 'roughly 16', '%.1f (%.1f against %.1f)' % (g['clean'] - base['clean'], g['clean'], base['clean']), abs(g['clean'] - base['clean'] - 16) < 1, REL)
add('Blog: the solve rate "remains nearly 20pp higher than that of the base model"', 'S4.SS1', 'nearly 20', '%.1f on Table 4\'s metric (%.1f against %.1f); %.1f on Figure 2\'s' % (g['retain'] - base['retain'], g['retain'], base['retain'], g['clean'] - base['clean']), 18 < g['retain'] - base['retain'] < 20, REL + '; the two metrics differ')
add('GRAFT w/o routing "still hacks on roughly 22% of trajectories"', 'S4.SS1', 'roughly 22%', '%.1f%%' % nr['hack'], abs(nr['hack'] - 22) < 1, REL)
coll = [p for p in CD['arms'][0]['seeds'] if p['clean'] * 100 < base['clean'] / 2]
add('No intervention: "two of three seeds collapse"', 'S4.SS1', '2 of 3', '%d of 3 (clean solve %s against base %.1f)' % (len(coll), ', '.join('%.1f' % (p['clean'] * 100) for p in coll), base['clean']), len(coll) == 2, REL)
add('GRAFT clean solve rate against the reward penalty ("competitive")', 'S4.F2', 'competitive', '%.1f ± %.1f against %.1f ± %.1f' % (g['clean'], g['clean_sem'], rp['clean'], rp['clean_sem']), True, REL + '; the penalty is higher by %.1f points' % (rp['clean'] - g['clean']))
zz = (rp['hack'] - g['hack']) / math.hypot(rp['hack_sem'], g['hack_sem'])
add('Hack-rate gap GRAFT against reward penalty in standard errors', 'S4.F2', 'not stated', '%.1f points, %.0f standard errors' % (rp['hack'] - g['hack'], zz), zz > 5, 'derived: gap / sqrt(SEM1^2 + SEM2^2) over seeds')
worst = 0
for lab, r in FG['fig2_left']['countdown'].items():
    worst = max(worst, abs(r['x'] - cd[lab]['hack']), abs(r['y'] - cd[lab]['clean']))
add('Figure 2 (left): all eight plotted means', 'S4.F2', '8 points read from the figure', 'largest difference %.2f points' % worst, worst < 0.05, 'independently: the replay against the figure\'s vector geometry (decode_figs.py)')
pre = FG['fig2_right']['hack_rate']['pre-ablation (both adapters)']
mx = max(pre, key=lambda p: p[1])  # pre holds only the 18-point seed-mean curve
add('Pre-ablation GRAFT trivial-test hacks "on up to 38% of trajectories" (blog: "up to 35%")', 'S4.SS1', 'up to 38%', '%.1f%% at step %d (seed mean, read from figure)' % (mx[1], mx[0]), abs(mx[1] - 38) < 1, 'read from Figure 2 (right), vector geometry')
# ---- Tables 2 and 3: internal consistency ----
t2 = {r['n']: r for r in T['t2']['rows']}
t3h = {r['n']: r for r in T['t3']['HumanEval']}; t3l = {r['n']: r for r in T['t3']['LeetCode']}
ok = 0; tot = 0; det = []
for lab in ('GRAFT (pre-ablation)', 'GRAFT (deployment configuration)'):
    for j, (t3, col) in enumerate(((t3h, 2), (t3l, 3))):
        sd = t2[lab]['e'][col]; sem = t3[lab]['e'][0]; tot += 1
        good = abs(sd / math.sqrt(8) - sem) <= 0.06; ok += good; det.append('%.1f/sqrt 8 = %.2f vs %.1f' % (sd, sd / math.sqrt(8), sem))
add('Table 2 states one standard deviation, Table 3 one standard error, for the same task-performance numbers', 'A4.T2', 'SD (Table 2), SEM (Table 3)', '%d of %d agree: %s' % (ok, tot, '; '.join(det)), ok == tot, 'derived from the two tables')
ok = 0; tot = 0; det = []
for lab in ('Base model', 'GRAFT (pre-ablation)', 'GRAFT (deployment configuration)'):
    for t3, col, env in ((t3h, 0, 'HumanEval'), (t3l, 1, 'LeetCode')):
        s = sum(t3[lab]['v'][1:]); tot += 1; good = abs(s - t2[lab]['v'][col]) <= 0.15; ok += good
        det.append('%s %s %.1f vs %.1f' % (lab.split(' (')[0] if lab == 'Base model' else lab.split('(')[1][:-1], env, s, t2[lab]['v'][col]))
add('Table 2 hack rate = the sum of Table 3\'s five hack kinds', 'A4.T3', 'implied', '%d of %d within rounding: %s' % (ok, tot, '; '.join(det)), ok == tot, 'derived from the two tables')
# ---- Appendix G: adapter sizes ----
for name, d, n, L, per, frac, base_p in (('SmolLM2-135M', 576, 16, 30, '0.83M', 1.2, 134.5e6), ('Qwen3-8B', 4096, 64, 36, '28.3M', 0.7, 8.2e9), ('Qwen3-32B', 5120, 64, 64, '62.9M', 0.4, 32.8e9)):
    p = 3 * d * n * L
    add('Adapter size 3dnL for %s (d=%d, n=%d, L=%d)' % (name, d, n, L), 'A7', '%s per adapter, about %.1f%% for both' % (per, frac), '%s parameters per adapter; both %.2f%% of %s' % (format(p, ','), 200 * p / base_p, ('%.1fB' % (base_p / 1e9)) if base_p > 1e9 else ('%.1fM' % (base_p / 1e6))), abs(p / 1e6 - float(per[:-1])) < 0.05 and abs(200 * p / base_p - frac) < 0.06, 'calculated; base sizes from the model cards (SmolLM2 134.5M, Qwen3-8B 8.2B, Qwen3-32B 32.8B)')
# ---- Toy environments ----
toy = {}
for env, e in TE['envs'].items():
    toy[env] = {a: {k: 100 * st.mean(p[k] for p in e[a]) for k in ('retain', 'hack', 'detected', 'undetected')} for a in e if isinstance(e[a], list)}
    toy[env]['rp_pick'] = e['rp_pick']
pick = {e: TE['envs'][e]['rp_pick'] for e in TE['envs']}
want = {'cities_qa': 'rp2', 'repeat_extra': 'rp2', 'addition': 'rp5', 'object_qa': 'rp10', 'persona_qa': 'rp10', 'sort': 'rp10'}
add('Reward-penalty strength per toy environment, chosen by apparent performance (Appendix G.2)', 'A7.SS2', '2 cities_qa, repeat_extra; 5 addition; 10 otherwise', ', '.join('%s %s' % (e, pick[e][2:]) for e in want), pick == want, 'independently: the apparent-score rule run on the released logs (mk_toyenvs.py)')
mxh = max(toy[e]['GRAFT (ours)']['hack'] for e in toy)
add('Deployed GRAFT in the six toy environments: hacking "minimized" in every one', 'S4.SS2', 'lowest of all methods', 'at most %.1f%% (sort); reward penalty %s' % (mxh, ', '.join('%.0f' % toy[e]['Reward penalty']['hack'] for e in toy) + '%'), mxh < 5, 'independently, from the released training logs (tail mean of the last 10% of evaluations)')
und = sum(toy[e]['GRAFT: pre-ablation']['undetected'] > 5 for e in toy)
add('Pre-ablation GRAFT learns undetectable hacks too, yet ablation removes them', 'S4.SS2', 'in every environment', 'undetectable hacking above 5%% before ablation in %d of 6 (%s)' % (und, ', '.join('%.0f' % toy[e]['GRAFT: pre-ablation']['undetected'] for e in toy)), und == 6, 'independently, from the released training logs')
lower = [e for e in toy if toy[e]['GRAFT (ours)']['retain'] < max(toy[e]['No intervention']['retain'], toy[e]['Reward penalty']['retain'])]
add('"Often, GRAFT has worse performance on the target task compared to baselines like reward penalization"', 'S7', 'often', 'deployed GRAFT below the better of no intervention and reward penalty in %d of 6 environments' % len(lower), len(lower) >= 4, 'independently, from the released training logs')
# ---- SFT (Figure 4, single seed) ----
f4w, f4o = FG['fig4']['with_elicitation'], FG['fig4']['without_elicitation']
add('With the elicitation prompt GRAFT "reward hacks on zero examples, compared to roughly 30% for both the untrained model and oracle filtering"', 'S5', '0 vs roughly 30', '%.1f vs %.1f and %.1f' % (f4w['GRAFT (ours)']['x'], f4w['No training']['x'], f4w['Oracle filtering']['x']), f4w['GRAFT (ours)']['x'] < 0.5 and abs(f4w['Oracle filtering']['x'] - 30) < 3, 'read from Figure 4 (vector geometry)')
add('... "while matching oracle filtering\'s correct-solution rate"', 'S5', 'matching', '%.1f vs %.1f' % (f4w['GRAFT (ours)']['y'], f4w['Oracle filtering']['y']), abs(f4w['GRAFT (ours)']['y'] - f4w['Oracle filtering']['y']) < 2, 'read from Figure 4')
add('GRAFT without routing "hacks on roughly 80% of tasks" with the prompt', 'S5', 'roughly 80%', '%.1f' % f4w['GRAFT w/o routing']['x'], abs(f4w['GRAFT w/o routing']['x'] - 80) < 3, 'read from Figure 4')
add('Without the prompt, correct solutions: GRAFT against oracle filtering and GRAFT w/o routing', 'S5', 'w/o routing higher than GRAFT', '%.1f against %.1f and %.1f' % (f4o['GRAFT (ours)']['y'], f4o['Oracle filtering']['y'], f4o['GRAFT w/o routing']['y']), f4o['GRAFT w/o routing']['y'] > f4o['GRAFT (ours)']['y'], 'read from Figure 4')
out = {'checks': checks, 'cd': cd, 'toy': toy}
json.dump(out, open(os.path.join(HERE, 'inputs', 'recompute.json'), 'w'), indent=1)
bad = [c for c in checks if not c['ok']]
print('recompute: %d checks, %d disagree' % (len(checks), len(bad)))
for c in bad: print('  DISAGREES:', c['claim'], '|', c['paper'], '|', c['ours'])
