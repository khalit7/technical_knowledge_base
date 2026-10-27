"""Every derived number the page quotes about the paper's own evidence.   python3 recompute.py -> inputs/recompute.json"""
import json, math
T = json.load(open('tables.json'))
pc = lambda s: float(s.rstrip('%'))
BM = T['bench']; N = T['bench_n']
out = {}
# ---- Figure 1: the G = 4 example, recomputed from its printed rewards ----
f = [97, 99, 100, 98]; c = [0, 1, 0, 5]
mean = lambda a: sum(a) / len(a)
std = lambda a: math.sqrt(sum((x - mean(a)) ** 2 for x in a) / len(a))
z = lambda a: [(x - mean(a)) / std(a) for x in a]
grpo = z([x + y for x, y in zip(f, c)])
Af, Ac = z(f), z(c)
gdpo = [x + y for x, y in zip(Af, Ac)]
def sa(g, s1=0.98, s2=0.02, norm=False):
    a = [(1 - s1) ** g * x + (1 - s2) ** g * y for x, y in zip(Af, Ac)]
    return z(a) if norm else a
out['fig1'] = {'rewards_format': f, 'rewards_correct': c, 'grpo': grpo, 'gdpo': gdpo, 'Af': Af, 'Ac': Ac,
               'sa_g1_unnormalised': sa(1), 'sa_g1_eq1': sa(1, norm=True), 'sa_g05_unnormalised': sa(0.5), 'sa_g05_eq1': sa(0.5, norm=True),
               'printed': {'grpo': [-1.41, 0.00, 0.00, 1.41], 'gdpo': [-2.07, 0.20, 0.61, 1.25], 'sa': [-0.74, -0.23, -0.69, 1.65]}}
# which gamma, and with or without Eq. 1, reproduces the printed SA-MRPO row
best = min(((abs(max(abs(a - b) for a, b in zip(sa(g / 100, norm=n), out['fig1']['printed']['sa']))), g / 100, n) for g in range(0, 301) for n in (False, True)))
out['fig1']['fit'] = {'max_err': best[0], 'gamma': best[1], 'eq1_applied': best[2]}
# gamma above which rollout 3 (perfect format, zero correctness) turns negative, at the printed saturations
out['fig1']['flip_gamma_r3'] = math.log(-Ac[2] / Af[2]) / math.log(0.02 / 0.98)
out['fig1']['flip_gamma_r2'] = math.log(-Ac[1] / Af[1]) / math.log(0.02 / 0.98)
# effective weight ratio format : correctness at the printed saturations
out['ratio'] = {str(g): (0.02 / 0.98) ** g for g in (0.25, 0.5, 0.75, 1.0)}
# ---- one rollout out of 8 fails a nearly solved binary objective ----
g8 = [1] * 7 + [0]
out['seven_of_eight'] = {'fail': z(g8)[-1], 'pass': z(g8)[0]}
# ---- Table 1 ----
t1 = T['T1']['rows']; wins = []; deltas = {}
for name, gi, si in (('7B, 3 objectives', 1, 2), ('3B, 2 objectives', 4, 5), ('3B, 3 objectives', 6, 7)):
    d = {b: round(pc(t1[b][0][si]) - pc(t1[b][0][gi]), 1) for b in BM}
    e = {b: round(pc(t1[b][1][si]) - pc(t1[b][1][gi]), 1) for b in BM}
    deltas[name] = {'acc': d, 'exceed': e, 'wins': sum(v > 0 for v in d.values()),
                    'avg_gdpo': round(mean([pc(t1[b][0][gi]) for b in BM]), 2), 'avg_sa': round(mean([pc(t1[b][0][si]) for b in BM]), 2),
                    'exceed_up': sum(v > 0 for v in e.values()), 'exceed_down': sum(v < 0 for v in e.values())}
    wins.append(deltas[name]['wins'])
out['T1'] = {'deltas': deltas, 'wins_total': sum(wins), 'comparisons': 15}
# gains counted in problems
out['T1']['aime_problems_7b'] = 5.0 * N['AIME24'] / 100
# eval-sampling standard error of a pass@1 mean over 16 samples per problem, upper bound (every problem at the mean rate)
def se_upper(p, n, k=16): return 100 * math.sqrt(p * (1 - p) / (n * k))
out['se_eval_upper'] = {b: {'at': pc(t1[b][0][2]), 'se_one': se_upper(pc(t1[b][0][2]) / 100, N[b]), 'se_diff': math.sqrt(2) * se_upper(pc(t1[b][0][2]) / 100, N[b])} for b in BM}
# ---- Table 2 ----
t2 = T['T2']['rows']
out['T2'] = {'avg_sa': mean([float(t2[b][0]) for b in BM]), 'avg_gdpo': mean([float(t2[b][2]) for b in BM]),
             'avg_len_sa': mean([float(t2[b][1]) for b in BM]), 'avg_len_gdpo': mean([float(t2[b][3]) for b in BM]),
             'delta_check': {b: round(float(t2[b][0]) - float(t2[b][2]), 1) == float(t2[b][4]) for b in BM},
             'len_ratio': {b: float(t2[b][1]) / float(t2[b][3]) for b in BM},
             'amc_problems': 9.2 * N['AMC23'] / 100}
# R1-Distill-Qwen-7B as released (DeepSeek-R1 paper, Table 5): AIME 2024 pass@1 55.5, MATH-500 92.8
out['T2']['r1_distill_7b'] = {'AIME24': 55.5, 'MATH500': 92.8}
# ---- Table 3 ----
t3 = T['T3']['rows']
out['T3'] = {b: {'pass': round(pc(t3[b][0][2]) - pc(t3[b][0][1]), 1), 'bug': round(pc(t3[b][1][2]) - pc(t3[b][1][1]), 1)} for b in t3}
# ---- Table 4 ----
t4 = T['T4']['rows']
avg4 = [round(mean([pc(t4[b][0][i]) for b in BM]), 2) for i in range(6)]
ex4 = [round(mean([pc(t4[b][1][i]) for b in BM]), 2) for i in range(6)]
same0 = all(t4[b][0][1] == t1[b][0][4] and t4[b][1][1] == t1[b][1][4] for b in BM)
same25 = all(t4[b][0][2] == t1[b][0][5] and t4[b][1][2] == t1[b][1][5] for b in BM)
out['T4'] = {'avg_acc': avg4, 'avg_exceed': ex4, 'gamma0_equals_T1_GDPO2obj': same0, 'gamma025_equals_T1_SA2obj': same25,
             'best_gamma_by_avg': T['T4']['cols'][1 + max(range(5), key=lambda i: avg4[1 + i])],
             'aime_best': T['T4']['cols'][1 + max(range(5), key=lambda i: pc(t4['AIME24'][0][1 + i]))]}
# ---- share of the advantage a near-saturated binary objective draws at gamma = 0 ----
# per-group z-scores have sum of squares G in every group where the objective varies (0 elsewhere), so with equal
# weights the length objective's share of the advantage's sum of squares is (mixed-length groups)/(both kinds).
def share(p_over, mixed_c, G=8):
    ml = 1 - (1 - p_over) ** G - p_over ** G
    return ml / (ml + mixed_c)
out['share'] = {'mixed_len_at_0.2pct': 1 - 0.998 ** 8, 'share_at_0.2pct_mixedc_0.6': share(0.002, 0.6),
                'mixed_len_at_1pct': 1 - 0.99 ** 8, 'share_at_1pct_mixedc_0.6': share(0.01, 0.6)}
# ---- steps: one epoch of DeepScaleR (40,315 problems, as released) at batch 256 ----
out['steps_per_epoch'] = 40315 / 256
json.dump(out, open('inputs/recompute.json', 'w'), indent=1)
if __name__ == '__main__':
    print(json.dumps({k: out[k] for k in ('fig1',)}, indent=0)[:1400])
    print('T1', {k: (v['wins'], v['avg_gdpo'], v['avg_sa'], v['exceed_up'], v['exceed_down']) for k, v in out['T1']['deltas'].items()}, out['T1']['wins_total'])
    print('T2', out['T2']); print('T3', out['T3']); print('T4', out['T4']); print('share', out['share']); print('se', out['se_eval_upper']); print('ratio', out['ratio'], out['seven_of_eight'], out['steps_per_epoch'])
