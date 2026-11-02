"""Recompute every derived number the page quotes from the paper, from tables.json and inputs/ (stdlib only).

  python3 recompute.py      (build.sh runs it after mk_tables.py) -> inputs/recompute.json

Each check: name, where in the paper (anchor), the paper's printed value, ours, whether they agree, and how.
"agree" means equal at the paper's printed precision unless the 'how' says otherwise.
"""
import json, math, os, statistics as st

HERE = os.path.dirname(os.path.abspath(__file__))
T = json.load(open(os.path.join(HERE, 'tables.json')))
MB = json.load(open(os.path.join(HERE, 'inputs', 'mbppplus_heldout_curves.json')))['runs']
P = T['pairs']
C = []


def chk(name, at, paper, ours, agree, how):
    C.append({'name': name, 'at': at, 'paper': paper, 'ours': ours, 'agree': bool(agree), 'how': how})


r2 = lambda v: round(v + 1e-12, 2)
r3 = lambda v: round(v + 1e-12, 3)
sel = lambda task, model, opt='adamw': [p for p in P if p['task'] == task and p['model'] == model and p['opt'] == opt]

# ---- Table 2 means and standard deviations from the 25 released pairs ----
T2 = {(r['task'], r['model']): r for r in T['table2']}
rows = [('rg:zebra_puzzles', '1.7B', 'adamw', ('Zebra puzzles', '1.7B'), 2),
        ('rg:knights_knaves', '1.7B', 'muon', ('Knights-and-knaves, Muon', '1.7B'), 3),
        ('mbppplus', '1.7B', 'adamw', ('MBPP+ (held-out 224)', '1.7B'), 3),
        ('humanevalplus', '1.7B', 'adamw', ('HumanEval+', '1.7B'), 3),
        ('math', '0.6B', 'adamw', ('MATH, levels 3–5', '0.6B'), 3),
        ('gsm8k', '0.6B', 'adamw', ('GSM8K', '0.6B'), 3)]
for task, model, opt, key, d in rows:
    ps = sel(task, model, opt); t2 = T2[key]
    n = [p['nearest'] for p in ps]; f = [p['faircast'] for p in ps]
    if task == 'rg:zebra_puzzles':
        f = T['zebra_fc_runs']['vals']  # four Fair Cast runs: three pairs plus the repeat of seed 0
    rd = (lambda v: round(v + 1e-12, d))
    ours = '%s ± %s / %s ± %s' % (rd(st.mean(n)), rd(st.stdev(n)), rd(st.mean(f)), rd(st.stdev(f)))
    paper = '%s / %s' % (t2['nearest'], t2['faircast'])
    ok = all(abs(a - b) < 0.6 * 10 ** -d for a, b in ((st.mean(n), t2['nm']), (st.stdev(n), t2['nsd']), (st.mean(f), t2['fm']), (st.stdev(f), t2['fsd'])))
    chk('Table 2, %s %s: mean ± sample s.d. (nearest / Fair Cast)' % key, 'S7.T2', paper, ours, ok,
        'from the per-seed endpoints in the code repository (results/TABLE2_PAIRS.md); sample standard deviation (n - 1)')

# single-seed Table 2 rows equal their pair
for task, model, opt, key in [('rg:knights_knaves', '0.6B', 'adamw', ('Knights-and-knaves', '0.6B')), ('rg:knights_knaves', '1.7B', 'adamw', ('Knights-and-knaves', '1.7B')),
                              ('rg:knights_knaves', '4B', 'adamw', ('Knights-and-knaves', '4B')), ('games:nim', '1.7B', 'adamw', ('Nim', '1.7B')),
                              ('rg:string_manipulation', '1.7B', 'adamw', ('String manipulation', '1.7B')), ('math_l5', '1.7B', 'adamw', ('MATH, level 5', '1.7B')),
                              ('math', '1.7B', 'adamw', ('MATH, levels 3–5', '1.7B'))]:
    p = sel(task, model, opt)[0]; t2 = T2[key]
    chk('Table 2, %s %s: the single pair' % key, 'S7.T2', '%s / %s (%s)' % (t2['nearest'], t2['faircast'], t2['delta']),
        '%.3f / %.3f (%+.1f)' % (p['nearest'], p['faircast'], p['delta']), abs(p['nearest'] - t2['nm']) < 1e-9 and abs(p['faircast'] - t2['fm']) < 1e-9, 'same run in both tables')

# ---- the 25-pair tally ----
D = [p['delta'] for p in P]
ahead, within, behind = sum(d > 1 for d in D), sum(abs(d) <= 1 for d in D), sum(d < -1 for d in D)
chk('Matched seed-pairs: ahead by more than 1 point / within 1 / behind', 'S7.SS3', '18 / 6 / 1 of 25', '%d / %d / %d of %d' % (ahead, within, behind, len(D)),
    (ahead, within, behind, len(D)) == (18, 6, 1, 25), 'counted from the 25 released pairs; +1.0 (Nim) counts as within one point')
chk('Mean endpoint difference over the 25 pairs', 'S7.SS3', '+6.1 points', '%+.1f points' % st.mean(D), abs(st.mean(D) - 6.1) < 0.05, 'mean of the Delta column')
chk('Median endpoint difference', 'S7.SS3', 'not printed (repository: +3.1)', '%+.1f points' % st.median(D), abs(st.median(D) - 3.1) < 0.05, 'derived')
nz = [p['delta'] for p in P if p['task'] != 'rg:zebra_puzzles']
chk('Mean without the three zebra pairs', 'S7.SS3', 'not printed', '%+.1f points (22 pairs)' % st.mean(nz), True, 'derived: the three zebra pairs contribute %.1f of the %.1f summed points' % (sum(D) - sum(nz), sum(D)))
alt = [(p['delta'] if not (p['task'] == 'rg:zebra_puzzles' and p['seed'] == 0) else round(100 * (0.34 - p['nearest']), 1)) for p in P]
chk('Mean if the zebra seed-0 pair used the repeated Fair Cast run (0.34)', 'S7.SS2', 'not printed', '%+.1f points' % st.mean(alt), True,
    'derived: the released pair uses the first seed-0 run (0.623); the repeat ended at 0.34')
neg = sum(d < 0 for d in D); pos = sum(d > 0 for d in D)
sign_p = sum(math.comb(pos + neg, k) for k in range(0, neg + 1)) / 2 ** (pos + neg) * 2
chk('Sign test over the pairs (two-sided)', 'S7.SS3', 'not printed', '%d positive, %d negative, %d zero; p = %.4f' % (pos, neg, len(D) - pos - neg, sign_p), True,
    'derived; treats pairs as independent, which they are not quite (same training-prompt sequence within a configuration, several seeds per task)')

# ---- noise: standard error of one endpoint difference ----
se = lambda n: 100 * math.sqrt(2 * 0.25 / n)
chk('Standard error of one endpoint difference at 512 / 128 problems', 'S9', 'about 3 / 6 points', '%.1f / %.1f points' % (se(512), se(128)), True,
    'sqrt(2 p (1 - p) / n) at p = 0.5, two independent evaluations; the paper does not say how it computed its figure')
chk('Same, at the 224 held-out MBPP+ problems and 164 HumanEval+ problems', 'S6', 'not printed', '%.1f / %.1f points' % (se(224), se(164)), True, 'derived as above')
small = sum(1 for p in P if abs(p['delta']) < se(min(p['n_eval'], 224 if p['task'] == 'mbppplus' else p['n_eval'])))
chk('Pairs whose difference is smaller than one standard error of a difference', 'S9', 'not printed', '%d of 25' % small, True,
    'derived; MBPP+ pairs use the 224 (or 121) held-out problems actually scored, not the 512 in the n_eval column')

# ---- MBPP+ pairs against the released held-out curves ----
mb = {'p6_mbpp_cast': ('mbppplus', 0, 'nearest'), 'p6_mbpp_srste': ('mbppplus', 0, 'faircast')}
for s in (1, 2, 3):
    mb['p18_mbpp_cast_s%d_e512' % s] = ('mbppplus', s, 'nearest'); mb['p18_mbpp_sr_s%d_e512' % s] = ('mbppplus', s, 'faircast')
okm = True; worst = 0
for run, (task, seed, arm) in mb.items():
    h = MB[run]['heldout']; last = h[max(h, key=int)]
    p = [q for q in P if q['task'] == task and q['seed'] == seed][0]
    worst = max(worst, abs(r3(last) - p[arm])); okm &= abs(r3(last) - p[arm]) < 1e-9
chk('MBPP+ pair endpoints against the released held-out curves (8 runs)', 'S7.T2', 'the 8 MBPP+ endpoints', 'largest difference %.3f' % worst, okm,
    'results/mbppplus_heldout_curves.json, last checkpoint, held-out subset (121 problems for seed 0, 224 otherwise)')

# ---- dead zone arithmetic ----
u = lambda w: 2.0 ** (math.floor(math.log2(abs(w))) - 7)
chk('bf16 gap u at |w| = 0.02 and the round-to-nearest threshold u/2', 'S3', 'u = 2^(floor(log2|w|) - 7) ≈ |w|/128', 'u = %.3g, u/2 = %.3g (|w|/u = %.0f)' % (u(0.02), u(0.02) / 2, 0.02 / u(0.02)), True,
    'definition; |w|/u lies between 128 and 256 within each power of two, so "u ≈ |w|/128" is the upper end')
chk('Average u / |w| for weights spread evenly in log scale', 'S3', '≈ 1/128', '1/%.0f' % (128 * math.log(2) / 0.5), True,
    'derived: the mean of 2^-f over f uniform in [0, 1) is 1/(2 ln 2) = 0.72, so the average gap is about |w|/177')
chk('Steps for a steady update to cross the dead zone, |w| = 0.02, update 5e-7 per step', 'S3', 'τ ≈ u/(2|Δ|): 50 to 200 steps', '%.0f steps' % (u(0.02) / 2 / 5e-7), True,
    'tau formula of section 3 at illustrative values (the paper does not print the update distribution)')
chk('FP16 sampler: dead zone shrinks', 'S7.SS7', 'eightfold', '%d times' % 2 ** (10 - 7), True, 'fp16 keeps 10 significand bits, bf16 7')

# ---- cost ----
c = T['cost']
chk('Stochastic-rounding export as a share of one optimizer step', 'S7.SS7', 'below 0.1%', '%.3f%% to %.3f%%' % (100 * c['sr_ms'] / 1000 / c['step_s'][0], 100 * c['sr_ms'] / 1000 / c['step_s'][1]), True, '21.7 ms against 31 to 130 s')
efs = 100 * c['ef_ms'] / 1000 / c['step_s'][0]
chk('Error-feedback export as a share of one optimizer step', 'S7.SS7', 'below 0.1%', '%.3f%% to %.3f%%' % (efs, 100 * c['ef_ms'] / 1000 / c['step_s'][1]), efs < 0.1,
    '37.2 ms against 31 to 130 s: just above 0.1% at the fastest step; negligible either way')
chk('Error-feedback residual memory at 1.72B parameters', 'S7.SS7', '6.9 GB', '%.2f GB' % (c['params_b'] * 4), abs(c['params_b'] * 4 - 6.9) < 0.05, 'one fp32 (4-byte) residual per parameter, decimal GB')
chk('Delta-sync compression lost: changed weights per step 2 to 15% (Fair Cast) against 0.4 to 0.5% (nearest)', 'S9', '5 to 30 times less', '%.0f to %.1f times' % (2 / 0.5, 15 / 0.4), True,
    'the ratio of the printed ranges spans 4 to 37.5; the paper rounds it to 5 to 30')

# ---- Table 3 and section 7.4 ----
t3 = {r['arm']: r['vals'] for r in T['table3']['rows']}
he = t3['HumanEval+, round-to-nearest']; cd = t3['Countdown (500 steps), round-to-nearest']; fc = t3['HumanEval+, Fair Cast']
chk('Finer-than-bf16 exports of round-to-nearest masters: points lost against bf16', 'S7.T3', '"30 to 40 points worse" (text)',
    'HumanEval+: fp16 %.1f, FP8 via fp16 %.1f; Countdown: fp16 %.1f, FP8 via fp16 %.1f' % (he[0] - he[1], he[0] - he[3], cd[0] - cd[1], cd[0] - cd[3]), False,
    'only HumanEval+ reaches the range (42.0 and 30.4); Countdown loses 11.7 in both, from a lower base')
chk('Fair Cast master: spread across the four formats', 'S7.T3', 'same model in every format', '%.1f points (64.6 to 61.0)' % (max(fc) - min(fc)), True, 'max minus min of the row')
mg = T['master_gap']
chk('Largest master-against-served gap (HumanEval+, step 99)', 'S7.SS4', 'up to 50 points', '%.1f points' % (mg['he_served'] - mg['he_master']), True, '59.8 minus 9.1')
chk('Zebra: Table 2 delta', 'S7.T2', '+24', '%+.1f' % (100 * (st.mean(T['zebra_fc_runs']['vals']) - st.mean([p['nearest'] for p in sel('rg:zebra_puzzles', '1.7B')]))), True,
    'difference of the means of 4 and 3 runs')
mf = 100 * (0.727 - 0.672)
chk('MATH levels 3 to 5 at 1.7B, step 150 of the 300-step run', 'S7.T2', '+5.5', '%+.1f' % mf, abs(mf - 5.5) < 0.05, '0.727 minus 0.672')
lf = T['list_functions']
chk('List functions: EMA export against round-to-nearest', 'S7.SS5', 'above round-to-nearest on both seeds', '%+.1f and %+.1f points' % tuple(100 * (v - lf['nearest']) for v in lf['ema005']), True, '0.707 and 0.709 against 0.668')
chk('Contributions say the lag helps on "the one task"; the conclusion says "two configurations"', 'S10', 'one (§1, §7.5) / two (§10)', 'one reported (list functions)', False,
    'section 7.5 reports only list functions; the second configuration is not named')

json.dump({'checks': C, 'n': len(C), 'agree': sum(c['agree'] for c in C),
           'pairs': {'ahead': ahead, 'within': within, 'behind': behind, 'mean': round(st.mean(D), 2), 'median': st.median(D),
                     'mean_no_zebra': round(st.mean(nz), 2), 'mean_alt': round(st.mean(alt), 2), 'zebra_sum': round(sum(D) - sum(nz), 1), 'sum': round(sum(D), 1),
                     'pos': pos, 'neg': neg, 'sign_p': sign_p, 'small': small}},
          open(os.path.join(HERE, 'inputs', 'recompute.json'), 'w'), indent=1, ensure_ascii=False)
print('recompute: %d checks, %d agree' % (len(C), sum(c['agree'] for c in C)))
for c in C:
    if not c['agree']:
        print('  differs:', c['name'], '|', c['paper'], '|', c['ours'])
