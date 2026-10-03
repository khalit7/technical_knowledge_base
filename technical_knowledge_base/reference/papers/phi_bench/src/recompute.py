"""Recompute every derived number on the page from tables.json and write inputs/recompute.json.
Each check prints PASS or FAIL; a check that is expected to fail (a contradiction the page reports) says so.
usage: python3 recompute.py   (build.sh runs it, after mk_tables.py)"""
import json, math

T = json.load(open('tables.json'))
M, CATS = T['models'], T['cats']
checks, out = [], {}


def ck(name, ok, detail, expect=True):
    checks.append({'name': name, 'ok': bool(ok) == expect, 'raw': bool(ok), 'detail': detail})


def reward(s, ref):
    """The paper's performance reward (and the package's v2 curve): 0 at or below the reference, 1 at ref squared."""
    if ref <= 1 or s <= ref: return 0.0
    return min(1.0, math.log(s / ref) / math.log(ref))


# 1. Figure 4 counts
F4 = T['F4']
rows = {k: sum(v) for k, v in F4.items()}
colsum = [F4['KFC'][i] + F4['LHI'][i] + F4['E2EO'][i] for i in range(9)]
ck('Figure 4 rows sum to 55 KFC, 20 LHI, 10 E2EO (85)', rows == {'KFC': 55, 'LHI': 20, 'E2EO': 10}, rows)
ck('Figure 4 category totals equal the leaderboard counts A..I', colsum == [19, 11, 6, 28, 7, 3, 2, 5, 4], colsum)
out['cat_n'] = colsum

# 2. Full score from Table 2 categories weighted by task count, and from Table 3 formats
full_cat, full_fmt = {}, {}
for m in M:
    v = T['T2'][m]
    full_cat[m] = sum(n * x for n, x in zip(colsum, v[:9])) / 85
    k, l, e, f = T['T3'][m]
    full_fmt[m] = (55 * k + 20 * l + 10 * e) / 85
ck('Table 2 Full = task-weighted mean of its nine categories (within 0.05)', all(abs(full_cat[m] - T['T2'][m][9]) < 0.05 for m in M),
   {m: round(full_cat[m], 3) for m in M})
ck('Table 3 Full = (55 KFC + 20 LHI + 10 E2EO) / 85 (within 0.01)', all(abs(full_fmt[m] - T['T3'][m][3]) < 0.01 for m in M), {m: round(full_fmt[m], 3) for m in M})
ck('Table 2 and Table 3 Full columns agree', all(T['T2'][m][9] == T['T3'][m][3] for m in M), '')
out['full_cat'] = full_cat; out['full_fmt'] = full_fmt

# 3. Category claims (Main Results)
best = {c: max(M, key=lambda m: T['T2'][m][i]) for i, c in enumerate(CATS)}
ck('Claude Opus 5 leads five of nine categories', sum(1 for c in CATS if best[c] == 'Claude Opus 5') == 5, best)
ck('Kimi K3 best on Inference & Serving and System Optimization; Qwen3.7 Max on Hardware & Edge; GLM 5.2 on System Assurance',
   best['Inference & Serving'] == 'Kimi K3' and best['System Optimization'] == 'Kimi K3' and best['Hardware & Edge'] == 'Qwen3.7 Max' and best['System Assurance'] == 'GLM 5.2', '')
he = {m: T['T2'][m][5] for m in M}
ck('"even the best-performing model achieved only 5.4%" on Hardware & Edge: 5.4 is Qwen3.7 Max (7th overall); Claude Opus 5 scores 3.9',
   he['Qwen3.7 Max'] == 5.4 and he['Claude Opus 5'] == 3.9, he)
out['best_cat'] = best

# 4. Leaderboard (released data, 4 decimals) against the paper's tables
lbt = T['lb_max_topics']
ck('Leaderboard topic matrix rounds to Table 2 (72 cells, within 0.051)', all(abs(lbt[m][i] * 100 - T['T2'][m][i]) <= 0.051 for m in M for i in range(9)),
   [(m, CATS[i], lbt[m][i], T['T2'][m][i]) for m in M for i in range(9) if abs(lbt[m][i] * 100 - T['T2'][m][i]) > 0.051])

# 5. Format claims (Table 3)
ck('Claude Opus 5 first in every format', all(T['T3']['Claude Opus 5'][j] == max(T['T3'][m][j] for m in M) for j in range(3)), '')
ck('LHI below KFC for every model', all(T['T3'][m][1] < T['T3'][m][0] for m in M), '')
ck('E2EO is the highest-scoring format for the top four models', all(T['T3'][m][2] > max(T['T3'][m][0], T['T3'][m][1]) for m in M[:4]), '')

out['lhi_drop'] = {m: 1 - T['T3'][m][1] / T['T3'][m][0] for m in M}
ck('LHI is 22% to 45% below KFC across the eight models', 0.22 <= min(out['lhi_drop'].values()) < 0.225 and 0.45 <= max(out['lhi_drop'].values()) < 0.455, {m: round(v, 3) for m, v in out['lhi_drop'].items()})

# 6. Figure 5: reasoning effort. The caption and text say 20 LHI tasks; the max-effort points equal the 30-task mix of LHI and E2EO
F5 = T['F5']
mix = {m: (20 * T['T3'][m][1] + 10 * T['T3'][m][2]) / 30 for m in ['Claude Opus 5', 'Kimi K3', 'GPT 5.6 Sol']}
ck('Figure 5 max-effort points do not equal Table 3 LHI, though the text says 20 LHI problems', all(abs(F5[m][4] - T['T3'][m][1]) < 0.01 for m in mix),
   {m: (F5[m][4], T['T3'][m][1]) for m in mix}, expect=False)
ck('Figure 5 max-effort points equal (20 LHI + 10 E2EO) / 30 from Table 3 (within 0.01)', all(abs(F5[m][4] - mix[m]) < 0.011 for m in mix), {m: round(mix[m], 3) for m in mix})
ck('Leaderboard says the effort study used 30 tasks', T['lb_effort_n'] == 30, T['lb_effort_n'])
kl = 1 - F5['Kimi K3'][0] / F5['Kimi K3'][4]
gl = 1 - F5['GPT 5.6 Sol'][0] / F5['GPT 5.6 Sol'][4]
ol = 1 - F5['Claude Opus 5'][0] / F5['Claude Opus 5'][4]
ck('Kimi K3 loses about 45% at low effort', abs(kl - .45) < .01, round(kl, 4))
out['effort_loss'] = {'Kimi K3': kl, 'GPT 5.6 Sol': gl, 'Claude Opus 5': ol}
out['effort_mix'] = mix
ck('All three models best at max effort', all(F5[m][4] == max(x for x in F5[m] if x is not None) for m in mix), '')
gpt = F5['GPT 5.6 Sol']
ck('GPT 5.6 Sol not monotone in effort (high below medium)', gpt[2] < gpt[1], gpt)

# 7. Figures 6 and 8 (decoded) against the leaderboard's iteration data and the text
ser = T['lb_iter']['series']
key = {'opus-5': 'Claude Opus 5', 'sonnet-5': 'Claude Sonnet 5', 'kimi-k3': 'Kimi K3', 'glm-5.2': 'GLM 5.2', 'deepseek': 'DeepSeek V4Pro', 'qwen3.7': 'Qwen3.7 Max', 'qwen3.8': 'Qwen3.8 Max', 'gpt-5.6': 'GPT 5.6 Sol'}
diff = []
for k, m in key.items():
    fig = {int(round(r)): v for r, v in T['F6'][m]}
    for i, v in enumerate(ser[k]):
        if v is None:
            if (i + 1) in fig: diff.append((m, i + 1, 'fig has', fig[i + 1]))
        elif abs(fig.get(i + 1, -9) - v) > 6e-4: diff.append((m, i + 1, fig.get(i + 1), v))
ck('Figure 6 decoded = leaderboard best-so-far series (192 points), except one', len(diff) == 1, diff)
out['f6_vs_lb'] = diff
op = {int(round(r)): v for r, v in T['F8']['pts']} if False else {int(round(p[0])): p[1] for p in T['F8']['Claude Opus 5']['pts']}
ck('Text: Opus BPB 1.3646 -> 1.3932 after the schedule change, then 1.3248 with warmup-stable-decay (Figure 8 rounds 5, 7, 8)',
   abs(op[5] - 1.3646) < 6e-4 and abs(op[7] - 1.3932) < 6e-4 and abs(op[8] - 1.3248) < 6e-4, (op[5], op[6], op[7], op[8]))
f6 = {m: min(v for r, v in T['F6'][m]) for m in M}
ck('Opus has the lowest final BPB on the iteration task', min(f6, key=f6.get) == 'Claude Opus 5', f6)
opus1 = T['F6']['Claude Opus 5'][0][1]
beats = [m for m in M if m != 'Claude Opus 5' and f6[m] > opus1]
out['opus_first_beats_final_of'] = beats
ck('24 rounds plotted, beyond the 16-submission cap of the main evaluation', len(T['F6']['Claude Opus 5']) == 24 and 'forced for 20' in T['lb_iter']['blurb'], len(T['F6']['Claude Opus 5']))
out['f8_failed'] = {m: v['failed'] for m, v in T['F8'].items()}

# 8. What those BPBs are worth under the task's own reward (a3-moe-train-budget, frozen constants from the released package)
a3 = T['a3']
r_of = lambda bpb: reward(a3['baseline_bpb'] / bpb, a3['ref'])
out['a3_reward_final'] = {m: r_of(f6[m]) for m in M}
out['a3_reward_at_oracle'] = r_of(a3['oracle_bpb'])
out['a3_reward_at_ceiling'] = r_of(a3['ceiling_bpb'])
out['a3_reward_at_floor'] = r_of(a3['floor_bpb'])
out['a3_bpb_full_marks'] = a3['baseline_bpb'] / a3['ref'] ** 2
out['a3_bpb_zero_line'] = a3['baseline_bpb'] / a3['ref']
ck('a3 reference anchor = baseline / oracle median', abs(a3['baseline_bpb'] / a3['oracle_bpb'] - a3['ref']) < 1e-9, a3['baseline_bpb'] / a3['oracle_bpb'])
ck('Full marks on a3 need BPB below the anti-spoof floor (unreachable)', out['a3_bpb_full_marks'] < a3['floor_bpb'], round(out['a3_bpb_full_marks'], 4))
ck('Only Claude Opus 5 scores above zero on a3 in Figure 6', [m for m in M if out['a3_reward_final'][m] > 0] == ['Claude Opus 5'], {m: round(v, 4) for m, v in out['a3_reward_final'].items()})
first = next((r for r, v in T['F6']['Claude Opus 5'] if r_of(v) > 0), None)
out['a3_opus_first_positive_round'] = first

# 9. Reward curve anchors (SCORING.md's worked example kv-traffic-sol, ref 2.5799)
ref = 2.5799320719769216
ck('kv-traffic-sol: tie scores 0, ref^1.5 scores 0.5, ref^2 scores 1', reward(ref, ref) == 0 and abs(reward(ref ** 1.5, ref) - .5) < 1e-12 and reward(ref ** 2, ref) == 1, (ref ** 1.5, ref ** 2))
r1 = lambda s, ref: min(1, .5 * math.log(s) / math.log(ref)) if s > 1 else 0
ck('v2 curve = max(0, 2 v1 - 1) for speedups 1.01..100', all(abs(reward(s, ref) - max(0, 2 * r1(s, ref) - 1)) < 1e-12 for s in [1.01 * 1.05 ** i for i in range(95)]), '')

# 10. Package facts
tasks = T['tasks']
perf = [t for t in tasks if t['cls'] == 'p']
out['n_perf'] = len(perf); out['n_impl'] = len(tasks) - len(perf)
out['n_cpu_only'] = sum(1 for t in tasks if t['gpu'] == 0)
refs = sorted(t['ref'] for t in perf)
out['ref_min'], out['ref_max'], out['ref_median'] = refs[0], refs[-1], (refs[38])
ck('77 performance tasks, 8 implementation tasks', (len(perf), len(tasks) - len(perf)) == (77, 8), '')
ck('Every reference speedup at least 1.15 (quality control)', refs[0] >= 1.15, refs[0])
by = {}
for t in tasks: by.setdefault((t['b'], t['cls']), []).append(t['sub'])
out['by_bench_class'] = {'%s/%s' % k: [len(v), max(v)] for k, v in by.items()}
ck('Only LHI and E2EO performance tasks allow 16 submissions (26 tasks); all implementation tasks single-submission',
   sum(len(v) for k, v in by.items() if max(v) == 16) == 26 and all(max(v) == 1 for k, v in by.items() if k[1] == 'i'), out['by_bench_class'])
tm = {}
for b, s in T['timeouts']: tm.setdefault(b, []).append(s)
out['timeouts_h'] = {b: sorted(set(x / 3600 for x in v)) for b, v in tm.items()}
out['timeouts_total_h'] = sum(s for b, s in T['timeouts']) / 3600

# 11. Error modes (Figure 7, decoded)
F7 = T['F7']
for m in M: ck('Figure 7 class counts sum to n for ' + m, sum(F7[m]['count'].values()) == F7[m]['n'], F7[m])
py = {m: F7[m]['count']['Python runtime error'] / F7[m]['n'] for m in M}
out['py_share'] = py
ck('Python runtime errors more than half for most models (5 of 8)', sum(1 for m in M if py[m] > .5) == 5, {m: round(v, 3) for m, v in py.items()})
ck('Opus has the lowest Python share and CUDA execution is its largest class', min(py, key=py.get) == 'Claude Opus 5' and max(F7['Claude Opus 5']['count'], key=F7['Claude Opus 5']['count'].get) == 'CUDA execution error', '')
rank = lambda xs: [sorted(xs, reverse=True).index(x) + 1 for x in xs]
e = [F7[m]['n'] for m in M]; s = [T['T3'][m][3] for m in M]
re_, rs = rank(e), rank(s)
rho = 1 - 6 * sum((a - b) ** 2 for a, b in zip(re_, rs)) / (8 * 63)
out['spearman_errors_score'] = rho
ck('More errors goes with higher score, but not cleanly: GLM 5.2 (5th) has the most errors, GPT 5.6 Sol (4th) has 96', max(M, key=lambda m: F7[m]['n']) == 'GLM 5.2', {m: F7[m]['n'] for m in M})

# 12. Standard-error bounds: rewards lie in [0, 1], so a mean m over n tasks has SD at most sqrt(m(1-m)) and SE at most sqrt(m(1-m)/n)
se = lambda m, n: math.sqrt(max(m, 0) * (1 - m) / n)
out['se_full'] = {m: 100 * se(T['T3'][m][3] / 100, 85) for m in M}
out['se_cat'] = {m: [100 * se(T['T2'][m][i] / 100, colsum[i]) for i in range(9)] for m in M}
out['se_fmt'] = {m: [100 * se(T['T3'][m][j] / 100, [55, 20, 10][j]) for j in range(3)] for m in M}
gap = T['T3']['Claude Opus 5'][3] - T['T3']['Kimi K3'][3]
out['gap_opus_kimi'] = gap; out['gap_opus_kimi_se'] = math.hypot(out['se_full']['Claude Opus 5'], out['se_full']['Kimi K3'])
out['gap_kimi_qwen'] = T['T3']['Kimi K3'][3] - T['T3']['Qwen3.8 Max'][3]

# 13. High effort leaderboard against max
hi = {r['m']: r['total'] for r in T['lb_high']}
out['high_rank'] = sorted(hi, key=hi.get, reverse=True)
ck('Leaderboard high-effort table omits Qwen3.8 Max and runs Qwen3.7 Max on 9 E2EO tasks', 'Qwen3.8 Max' not in hi and any(r['n_e2e'] == 9 for r in T['lb_high']), list(hi))

# 14. Sources
ck('2,260 papers + 1,852 artifacts = 4,112 sources', 2260 + 1852 == 4112, '')

out['checks'] = checks
json.dump(out, open('inputs/recompute.json', 'w'), indent=1)
for c in checks: print('PASS' if c['ok'] else 'FAIL', c['name'], '' if c['ok'] else c['detail'])
print(sum(c['ok'] for c in checks), 'of', len(checks), 'checks as expected')
print('a3 rewards', {m: round(v, 4) for m, v in out['a3_reward_final'].items()}, 'oracle', out['a3_reward_at_oracle'], 'ceiling', round(out['a3_reward_at_ceiling'], 4), 'floor', round(out['a3_reward_at_floor'], 4), 'full marks bpb', round(out['a3_bpb_full_marks'], 4), 'first positive round', first)
print('spearman', rho, 'se_full', {m: round(v, 2) for m, v in out['se_full'].items()}, 'gap', gap, out['gap_opus_kimi_se'])
print('effort loss', out['effort_loss'], 'high rank', out['high_rank'], 'timeouts', out['timeouts_h'], out['timeouts_total_h'], 'cpu', out['n_cpu_only'], 'ref', out['ref_min'], out['ref_median'], out['ref_max'], 'opus first beats', beats)
