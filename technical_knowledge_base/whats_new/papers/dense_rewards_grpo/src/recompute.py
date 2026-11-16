"""Recompute every derived number this page quotes from the paper's own tables (tables.json, transcribed by mk_tables.py)
and printed values, and write inputs/recompute.json for the page and its checks.

  python3 recompute.py        (build.sh runs it; exits 1 if a check that should agree does not)

Each check: name, where in the paper (arXiv anchor), the paper's printed value, ours, agree, how.
Checks marked approx compare a derived estimate under a stated simplification (said in `how`), within the tolerance given.
"""
import json, os, sys

HERE = os.path.dirname(os.path.abspath(__file__))
T = json.load(open(os.path.join(HERE, 'tables.json')))
C = []


def chk(name, at, paper, ours, agree, how):
    C.append({'name': name, 'at': at, 'paper': paper, 'ours': ours, 'agree': bool(agree), 'how': how})


def row(tab, method, model=None, block=None):
    for r in T[tab]:
        if r['method'] == method and (model is None or r['model'] == model) and (block is None or r['block'].startswith(block)):
            return r
    raise KeyError((tab, method, model))


def t13(cfg):
    return next(r for r in T['table13'] if r['config'] == cfg)


def t14(cfg):
    return next(r for r in T['table14'] if r['config'] == cfg)


B = 12.25e6
# 1. tokens: 584 and 50 updates in the same budget
per_it = B / 584
chk('Tokens per outcome-only GRPO iteration', 'S2.SS3', '584 updates in B = 12.25M', '%.0f tokens per iteration, %.0f per completion (64 completions, limit 380)' % (per_it, per_it / 64),
    per_it / 64 <= 380, 'B / 584; the mean completion must fit the 380-token limit')
cont = 1 - 50 * per_it / B
chk('Share of the k = 4 budget spent on continuations', 'S2.SS2', '91%', '%.1f%%' % (100 * cont), abs(100 * cont - 91) < 1.5,
    'approx: 1 - 50 x (B / 584) / B, assuming the reward\'s 50 iterations sample rollouts as long as outcome-only GRPO\'s')
# S25 (Appendix C.3.2) prints the updates and continuation shares of all four configurations on the same 12 seeds
S25 = {'outcome-only': (599, 0.0), 'k=1': (163, .70), 'k=2': (92, .83), 'k=4': (50, .91)}
roll = {k: (1 - sh) * B / u for k, (u, sh) in S25.items()}
chk('Rollout tokens per update, S25', 'A3.SS3.SSS2', '599, 163, 92, 50 updates; continuations 70%, 83%, 91%',
    ', '.join('%s %.1fk' % (k, v / 1000) for k, v in roll.items()), max(roll.values()) / min(roll.values()) < 1.2,
    '(1 - continuation share) x B / updates: every configuration should spend about the same on its own 64 rollouts per update (the rewards keep longer completions, since they truncate less)')
hrs = {'k=4': .136, 'k=2': .160, 'k=1': .201}
chk('Hours per run, S25 against Table 13', 'A3.SS3.SSS2', '0.43, 0.20, 0.16, 0.14 h', '%.3f, %.3f, %.3f, %.3f h' % (.431, hrs['k=1'], hrs['k=2'], hrs['k=4']),
    [round(x, 2) for x in (.431, hrs['k=1'], hrs['k=2'], hrs['k=4'])] == [.43, .20, .16, .14], 'Table 13 hours to B, rounded')
# 2. per update against per token
eff_ratio = 1.56 / 0.145
chk('Efficiency per update / per token, k = 4', 'S3.SS3', '1.56x per update, 0.145x per token', 'ratio %.1f against 584 / 50 = %.1f updates' % (eff_ratio, 584 / 50),
    abs(eff_ratio / (584 / 50) - 1) < 0.1, 'approx: the tokens per update are measured on 96 batches at the initial policy, not over training; within 10%')
# 3. hours and time shares, Tables 13 and 14
g, m4, m2, m1 = t14('Outcome-only (L4–5)'), t14('Monte-Carlo, k=4'), t14('Monte-Carlo, k=2'), t14('Monte-Carlo, k=1')
chk('Hours to B, k = 4 and outcome-only', 'A4.T14', '0.136 / 0.431 h (Table 13); 0.14 and 0.43 (§3.2)', '%.3f / %.3f h' % (m4['total'] / 3600, g['total'] / 3600),
    abs(m4['total'] / 3600 - .136) < .001 and abs(g['total'] / 3600 - .431) < .001, 'Table 14 seconds / 3600')
chk('"Trains three times as long"', 'S1', 'three times', '%.2fx' % (g['total'] / m4['total']), 2.9 < g['total'] / m4['total'] < 3.3, 'Table 14 totals')
chk('Outcome-only time on updates', 'S3.SS2', '61%', '%.1f%%' % (100 * g['update'] / g['total']), round(100 * g['update'] / g['total']) == 61, '940 / 1,552 s')
chk('k = 4 time on continuations', 'S3.SS2', '73%', '%.1f%%' % (100 * m4['credit'] / m4['total']), round(100 * m4['credit'] / m4['total']) == 73, 'credit stage (continuations) / total, 357 / 491 s')
sync = [r['total'] - r['select'] - r['generate'] - r['credit'] - r['update'] for r in T['table14']]
chk('Table 14 stages add up', 'A4.T14', 'Total includes the weight sync', 'remainder %d to %d s per run' % (min(sync), max(sync)), all(0 <= s <= 30 for s in sync),
    'total minus the four printed stages: the weight copy to the engine, not printed separately')
ct, cb = t14('Critic, TD form'), t14('Critic, baseline form')
chk('Critic adds to training time', 'S3.SS3', '23 to 24%', '%.1f%% and %.1f%%' % (100 * (ct['total'] / g['total'] - 1), 100 * (cb['total'] / g['total'] - 1)),
    round(100 * (cb['total'] / g['total'] - 1)) == 23 and round(100 * (ct['total'] / g['total'] - 1)) == 24, 'Table 14 totals against outcome-only (L4–5)')
fl, g35 = t14('Critic filter'), t14('Outcome-only (L3–5)')
h1, h2 = [tuple(map(float, t13(c)['hours'].split(' / '))) for c in ('Critic filter', 'Critic filter, Qwen3-0.6B')]
chk('Filter runs take longer', 'S4.SS1', '9 to 14%', '%.1f%% (Qwen2.5-1.5B), %.1f%% (Qwen3-0.6B)' % (100 * (h1[0] / h1[1] - 1), 100 * (h2[0] / h2[1] - 1)),
    round(100 * (h1[0] / h1[1] - 1)) == 14 and round(100 * (h2[0] / h2[1] - 1)) == 9, 'Table 13 hours to B, configuration / base')
chk('Scoring candidates in Table 14', 'A4.T14', '(prefill pass, no tokens)', '%d s of %d (%.0f%%); run %.1f%% longer' % (fl['select'], fl['total'], 100 * fl['select'] / fl['total'], 100 * (fl['total'] / g35['total'] - 1)),
    abs(fl['total'] / g35['total'] - 1 - 0.14) < 0.01, 'Table 14, critic filter against outcome-only on L3–5')
# 4. the three yardsticks (Figure 1 and §3)
eq = {c: t13(c)['time_pts'][0] for c in ('Monte-Carlo, k=4', 'Monte-Carlo, k=2', 'Monte-Carlo, k=1', 'Critic, TD form', 'Critic, baseline form', 'Critic filter')}
chk('Equal-time contrasts quoted in §3 and §4', 'A4.T13', '-7.8, -5.1, -2.2; -1.2, -0.7; +0.5', ', '.join('%+.1f' % v for v in eq.values()),
    [round(v, 1) for v in eq.values()] == [-7.8, -5.1, -2.2, -1.2, -0.7, 0.5], 'Table 13 equal-training-time column')
ups = row('table3', 'k=1 / 2 / 4 , at matched updates')['delta']
chk('Per-update leads, k = 1 / 2 / 4', 'A3.T3', '+1.4 / +1.8 / +1.0 (12 seeds); +1.5 for k = 4 on 5 seeds', ups, ups == '+0.014 / +0.018 / +0.010', 'Table 3 row, exploratory')
# 5. pooled filter gain on Qwen2.5-1.5B from the three studies
st = [row('table3', m, 'Qwen2.5-1.5B, L3–5') for m in ('first study', 'fresh seeds of one study', 'fresh seeds of a third study')]
pool = sum(int(r['n']) * r['pts'][0] for r in st) / sum(int(r['n']) for r in st)
chk('Qwen2.5-1.5B gain over 60 seeds', 'S4.SS1', '+0.8 (60 seeds)', '%+.2f from 12 x 0.9, 24 x 0.8, 24 x 0.7' % pool, round(pool, 1) == 0.8, 'seed-weighted mean of the three studies (rounded inputs)')
# 6. the account: candidates below 1/2
lo = [r for r in T['table8'] if r['cand_v'] < 0.5]; hi = [r for r in T['table8'] if r['cand_v'] >= 0.5]
sig = lambda r: r['pts'][1] is not None and r['pts'][1] > 0
chk('Significant gains by candidates\' mean', 'S4.SS2', '4 of the 5 below 1/2, none of the 7 others', '%d of %d below, %d of %d at or above' % (sum(map(sig, lo)), len(lo), sum(map(sig, hi)), len(hi)),
    (sum(map(sig, lo)), len(lo), sum(map(sig, hi)), len(hi)) == (4, 5, 0, 7), 'Table 8, interval above zero')
ok = sum('✓' in r['pred'] for r in T['table1'])
chk('Preregistered tests that held', 'S4.T1', 'five of six', '%d of %d' % (ok, len(T['table1'])), ok == 5 and len(T['table1']) == 6, 'Table 1 check marks')
# 7. head start in tokens and in time
t11 = {r['setting']: r for r in T['table11']}
sv = [1 - float(t11[s]['tokens'].split(' ')[0]) for s in ('Qwen3-0.6B, L3–5 ( 54 )', 'Qwen2.5-1.5B, L3–5 ( 60 )', 'Qwen3-1.7B, level 5 ( 24 )')]
tv = [1 - float(t11[s]['time'].split(' ')[0]) for s in ('Qwen3-0.6B, L3–5 ( 54 )', 'Qwen2.5-1.5B, L3–5 ( 60 )', 'Qwen3-1.7B, level 5 ( 24 )')]
chk('Head start, tokens against time', 'A2.SS1', '22 to 23% of tokens; 13 to 17% of time', '%.0f to %.0f%%; %.0f to %.0f%%' % (100 * min(sv), 100 * max(sv), 100 * min(tv), 100 * max(tv)),
    (round(100 * min(sv)), round(100 * max(sv)), round(100 * min(tv)), round(100 * max(tv))) == (22, 23, 13, 17), 'Table 11, 1 minus the share needed')
# 8. the gradient test's extrapolation at B
pred, real = [35.9, 31.9, 27.5], [34.3, 29.9, 26.3]
d = [p - r for p, r in zip(pred, real)]
chk('Extrapolation minus reached, at B', 'S3.SS3', 'overestimates by 0.8 to 1.8 points on average over 16 evaluations', 'at B: %s points (k = 1, 2, 4)' % ', '.join('%.1f' % x for x in d),
    all(x > 0 for x in d), 'the printed predictions and results at B; the paper\'s average is over all 16 evaluations, so at B it can differ')
# 9. budgets are multiples of 250,000
Bs = [12.25, 17.25, 21.0, 22.25, 10.0, 8.25]
chk('Budgets rounded up to 250,000 tokens', 'A3.SS1', '12.25, 17.25, 21.0, 22.25, 10.0, 8.25 M', 'all multiples: %s' % all(abs(b * 4 - round(b * 4)) < 1e-9 for b in Bs), all(abs(b * 4 - round(b * 4)) < 1e-9 for b in Bs), 'the calibration rule of C.1')

out = {'checks': C, 'n': len(C), 'agree': sum(c['agree'] for c in C), 'cont_share': {'k4': round(100 * cont, 1)}, 'roll': {k: round(v) for k, v in roll.items()},
       'tokens_per_iter': round(per_it), 'pool_q25': round(pool, 2)}
json.dump(out, open(os.path.join(HERE, 'inputs', 'recompute.json'), 'w'), indent=1, ensure_ascii=False)
for c in C:
    print(('ok  ' if c['agree'] else 'DIFF'), c['name'], '|', c['paper'], '|', c['ours'])
print('recompute: %d of %d agree' % (out['agree'], out['n']))
sys.exit(0 if out['agree'] == out['n'] else 1)
