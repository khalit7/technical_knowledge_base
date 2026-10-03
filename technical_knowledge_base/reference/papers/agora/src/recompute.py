"""Recompute every derived number the page shows from the paper's printed numbers (v4), the decoded Figure 2,
and our Stage A rebuild (model/stage_a.json, model/noise.json). Writes inputs/recompute.json.
usage: python3 recompute.py   (build.sh runs it)"""
import json, math, os
H = os.path.dirname(os.path.abspath(__file__))
J = lambda p: json.load(open(os.path.join(H, p))) if os.path.exists(os.path.join(H, p)) else None
TB = J('tables.json'); F2 = J('inputs/fig2_daily.json'); SA = J('model/stage_a.json') or {}; NZ = J('model/noise.json') or {}
R, CHK = {}, []


def check(name, got, want, tol):
    ok = abs(got - want) <= tol
    CHK.append({'what': name, 'got': got, 'paper': want, 'ok': ok})
    return got


RAND, BEST, GPT2 = 3.3923, 1.899044, 1.0
# 1. the headline: fraction of the random-to-GPT-2 gap closed
R['gap_closed'] = check('gap closed (3.3923 - 1.899044) / (3.3923 - 1.0), paper 62%', (RAND - BEST) / (RAND - GPT2), 0.62, 0.005)
R['gap_closed_if_gpt2_is'] = {str(g): (RAND - BEST) / (RAND - g) for g in (0.95, 1.0, 1.02, 1.05)}
# 2. how the descent is shared out (Table 4)
rows = TB['t4']['rows']
desc = RAND - BEST
R['share_by_milestone'] = [{'bpb': r['bpb'], 'share': (RAND - r['bpb']) / desc} for r in rows]
R['share_18th'] = check('first 18 scored contributions (1.9304) share of the descent, paper about 98%', (RAND - 1.9304) / desc, 0.98, 0.005)
R['share_first_two_improvements'] = (RAND - 2.1284) / desc          # unigram then bigram: already 84.6%
R['third_best_for_93pct'] = RAND - 0.93 * desc                      # what "first three improvements = 93%" implies
R['remaining_after_18th'] = 1.9304 - BEST
R['since_may2'] = {'from': 1.9054, 'to': 1.8990, 'drop': 1.9054 - 1.8990, 'share': (1.9054 - 1.8990) / desc}
R['last_step'] = {'over_previous_best': 3e-7, 'over_parent': 9e-6, 'cross_hw_typical': 5e-4, 'cross_hw_max': 1.2e-3,
                  'ratio_typical_to_last': 5e-4 / 3e-7}
# 3. counts in sections 4.2 to 4.6
R['h100_models'] = {'total': check('Opus 866 + GPT-5.5 276 + GPT-5.4 143 = 1,285', 866 + 276 + 143, 1285, 0),
                    'opus_share': 866 / 1285, 'gpt55_share': 276 / 1285, 'gpt54_share': 143 / 1285}
R['accounts'] = check('13 workers 1,699 + 4 other records = 1,703', 1699 + 4, 1703, 0)
R['a100_share'] = (1699 - 1285) / 1699
R['tag_sum'] = 1124 + 284 + 203 + 165 + 1                        # 1,777 > 1,703: tags overlap
R['cross_edges'] = 115 / 144
R['ancestors_verified'] = 40 / 144
R['verif_pairs'] = check('141 distinct pairs + 24 repeats = 165', 141 + 24, 165, 0)
R['new_best_followed'] = 194 / 232
R['edges_per_node'] = 1894 / 1703
R['pairs_v1_v4'] = {'v1': [696, 0.63, 0.80], 'v4': [523, 0.76, 0.90], 'v4_filtered': [499, 0.79, 0.90]}
R['gpu_hours_upper'] = 13 * (11 * 24 + 19)                         # every worker on one GPU for the whole run
R['run_hours'] = 11 * 24 + 19
# 4. Figure 2, decoded from the vector PDF: the bars must add back to the printed totals
if F2:
    days = [{k: (round(v) if isinstance(v, float) else v) for k, v in d.items()} for d in F2['days']]
    R['fig2'] = days
    check('Figure 2 bars sum to 1,703', sum(d['total'] for d in days), 1703, 0)
    check('Figure 2 verification bars sum to 165', sum(d['verifications'] for d in days), 165, 0)
    check('Figure 2: April 30 has 49 contributions', days[4]['total'], 49, 0)
    R['fig2_verif_before_may3'] = sum(d['verifications'] for d in days[:7])
    R['fig2_verif_from_may3'] = sum(d['verifications'] for d in days[7:])
    R['fig2_days_over_160'] = sum(d['total'] >= 160 for d in days)
# 5. Eq. 3 with the deployed constants: can an untested idea outrank the leader?
def U(q, n, N, rho, C=15.0, D=1.0): return 100 * q + C * math.sqrt(math.log(N + 1) / (n + 1)) + 100 * D / math.sqrt(1 + rho)
R['eq3_example'] = {'N': 1000, 'leader': U(1.0, 50, 1000, 30), 'untested_novel': U(0.0, 0, 1000, 0),
                    'leader_D05': U(1.0, 50, 1000, 30, D=0.5), 'untested_D05': U(0.0, 0, 1000, 0, D=0.5)}
# 6. our rebuild (stage_a.py) against the paper's milestones
if SA:
    R['ours'] = SA
    check('uniform over 50,257 tokens on our sample vs random init 3.3923', SA['uniform_bpb'], RAND, 0.05)
    check('GPT-2 small, full context, on our sample vs "about 1.0"', SA['gpt2_bpb'], 1.0, 0.05)
    if 'stage_a_c1' in SA:
        check('one context, rank 671, T = 1 vs Table 4 bigram row 2.1284', SA['stage_a_c1']['ranks']['671']['T1'], 2.1284, 0.02)
    if 'stage_a_c28' in SA:
        c = SA['stage_a_c28']
        check('28 contexts, GPT-2 only, rank 671, paper temperatures vs Table 4 rows 1.9319 to 1.9136', c['ranks']['671']['Tpaper'], 1.9228, 0.05)
        R['ours_share_of_paper_descent'] = (RAND - c['ranks']['671']['Tpaper']) / desc
# timings of our rebuild, from its log
LG = os.path.join(H, 'model', 'stage_a.log')
if SA and os.path.exists(LG):
    import re
    txt = open(LG).read()
    sec = lambda t: int(t[:2]) * 3600 + int(t[3:5]) * 60 + int(t[6:8])
    b0 = re.findall(r'(\d\d:\d\d:\d\d) build c28 \d+ / 50257 (\d+)s elapsed', txt)
    s0 = re.findall(r'(\d\d:\d\d:\d\d) svd c28 C@Omega done (\d+)s', txt)
    sv = re.findall(r'svd c28 done (\d+)s', txt)
    if b0 and s0: R['ours']['build_minutes_c28'] = ((sec(s0[-1][0]) - int(s0[-1][1])) - (sec(b0[0][0]) - int(b0[0][1]))) / 60
    if sv: R['ours']['svd_minutes_c28'] = float(sv[-1]) / 60
if NZ:
    R['noise'] = NZ
R['checks'] = CHK
json.dump(R, open(os.path.join(H, 'inputs', 'recompute.json'), 'w'), indent=1)
for c in CHK: print(('ok  ' if c['ok'] else 'OFF ') + c['what'], round(c['got'], 4) if isinstance(c['got'], float) else c['got'])
print('gap closed %.4f, 18th share %.4f, first two %.4f, third best for 93%% %.4f, since May 2 %.4f (%.2f%%)' % (
    R['gap_closed'], R['share_18th'], R['share_first_two_improvements'], R['third_best_for_93pct'], R['since_may2']['drop'], 100 * R['since_may2']['share']))
