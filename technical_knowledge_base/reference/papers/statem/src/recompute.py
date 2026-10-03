"""Recompute every derived number the page shows, from tables.json (the paper and the leaderboard extract) and
inputs/deepseek_trials.json (the authors' released 440 DeepSeek trials). Each check prints ok or FAIL; the page
shows the results.  usage: python3 recompute.py   (writes inputs/recompute.json)"""
import json, math, os, collections
HERE = os.path.dirname(os.path.abspath(__file__))
T = json.load(open(os.path.join(HERE, 'tables.json'))); D = json.load(open(os.path.join(HERE, 'inputs', 'deepseek_trials.json')))
LB = T['lb']; C = []; V = {}
def chk(name, got, want, tol=0.005, src=''):
    ok = abs(got - want) <= tol
    C.append({'n': name, 'got': round(got, 4), 'want': want, 'ok': ok, 'src': src}); print(('ok  ' if ok else 'FAIL') + ' ' + name, round(got, 4), want)
    return got
pct = lambda a, b: 100 * a / b
# ---- the paper's own arithmetic ----
chk('424/445 is the 95.28% raw score', pct(424, 445), 95.28, src='§4.2, footnote 1')
chk('420/445 with the four agreed trials zeroed', pct(420, 445), 94.38, src='footnote 1')
chk('415/445 with all nine reward-hacking flags zeroed', pct(415, 445), 93.26, src='footnote 1')
V['all13'] = chk('411/445 with all 13 judge flags zeroed (not in the paper)', pct(411, 445), 92.36, src='PR #142 judge: 424 judged, 13 flagged')
chk('GPT-5.5 harness gain 92.1 - 83.1', 92.1 - 83.1, 9.0, src='§4.2')
chk('GPT-5.6 Sol harness gain 95.28 - 84.9', 95.28 - 84.9, 10.38, src='§4.2')
chk('model-generation shift 84.9 - 83.1', 84.9 - 83.1, 1.8, src='§4.2')
chk('Luna gain 85.4 - 76.7', 85.4 - 76.7, 8.7, src='§4.3')
chk('88/89 five-trial coverage', pct(88, 89), 98.9, tol=0.05, src='§4.2')
chk('DeepSeek 392/445', pct(392, 445), 88.09, src='§4.4')
chk('DeepSeek 392/440 common core', pct(392, 440), 89.09, src='§4.4')
chk('DeepSeek 395/445 descriptive', pct(395, 445), 88.76, src='§4.4')
chk('DeepSeek gain 88.09 - 82.7', 88.09 - 82.7, 5.39, src='§4.4')
chk('adaptation + final run = total spend', 37.02 + 15.20, 52.22, src='§4.4')
V['ratio_final'] = chk('574.68 / 15.20 (paper §4.4: 1/37.8)', 574.68 / 15.20, 37.8, tol=0.05, src='§4.4')
chk('15.20 / 574.68 as a share (paper: 2.65%)', 100 * 15.20 / 574.68, 2.65, tol=0.006, src='§4.4')
chk('574.68 / 52.22 (paper: about 1/11, 11.0x)', 574.68 / 52.22, 11.0, tol=0.05, src='§1, §4.4')
V['intro_389'] = round(574.68 / 38.9, 2)  # the price that would give the Introduction's 38.9x
chk('BusinessBench held-out macro 85.22 - 84.67', 85.22 - 84.67, 0.55, src='Table 1')
chk('BusinessBench held-out micro 85.78 - 84.44', 85.78 - 84.44, 1.34, src='Table 1')
chk('BusinessBench development 91.71 - 86.07', 91.71 - 86.07, 5.64, src='Table 1')
chk('BusinessBench all treated 88.72 - 84.76', 88.72 - 84.76, 3.96, src='Table 1')
chk('subgroup 81.94 - 71.91 printed (dagger: 10.03 after rounding)', 81.94 - 71.91, 10.03, src='Table 1 note')
chk('budget-approval 75.12 - 62.91', 75.12 - 62.91, 12.21, src='Table 1'); chk('machine-operating 100 - 90.79', 100 - 90.79, 9.21, src='Table 1')
chk('refactorbench 77.78 - 80.56', 77.78 - 80.56, -2.78, src='Table 1'); chk('woocommerce 88.89 - 92.59', 88.89 - 92.59, -3.70, src='Table 1')
chk('webarena 88 -> 92 on 25 instances is 22 -> 23 (2 wins, 1 loss)', 25 * 0.92 - 25 * 0.88, 1.0, src='§4.5')
V['fam_mean'] = (75.12 + 100.0) / 2; V['fam_mean0'] = (62.91 + 90.79) / 2
chk('477 eligible minus 72 attendance = 405 treated', 477 - 72, 405, src='§4.5')
# Table 3: how much of the 9.0-point gain the 12 listed tasks carry
t3 = T['t3']['rows']; d3 = sum(r[2] - r[1] for r in t3)
V['t3_trials'] = d3; V['t3_pts'] = round(pct(d3, 445), 2)
chk('Table 3 deltas sum to 35 extra successful trials', d3, 35, src='Table 3')
V['gain_trials'] = round(0.09 * 445, 1)
# ---- leaderboard, like for like ----
V['ref55_raw'], V['ref55_adj'] = LB['45']['raw_acc'], LB['45']['adj_acc']
chk('the paper\'s 83.1% reference is the adjudicated leaderboard score', LB['45']['adj_acc'], 83.15, src='PR #45')
chk('Sol max submission raw 83.37%, $574.68', LB['102']['raw_acc'], 83.37, src='PR #102')
chk('Sol max adjudicated 76.18%', LB['102']['adj_acc'], 76.18, src='PR #102')
V['solmax_drop'] = round(LB['102']['raw_acc'] - LB['102']['adj_acc'], 2)
chk('StateM submission SE 0.87%', LB['142']['raw_se'], 0.87, src='PR #142')
V['binom_se_9528'] = round(100 * math.sqrt(0.9528 * 0.0472 / 445), 2)
# z for the GPT-5.5 gain using binomial SEs (the leaderboard's SEs are task-clustered and smaller or similar)
se = lambda p: math.sqrt(p * (1 - p) / 445)
V['z_gpt55'] = round((0.921 - 0.8315) / math.sqrt(se(0.921) ** 2 + LB['45']['adj_se'] ** 2 / 1e4), 1)
V['z_gpt56'] = round((0.9528 - 0.849) / math.sqrt((LB['142']['raw_se'] / 100) ** 2 + se(0.849) ** 2), 1)
V['se_bb_unpaired'] = round(100 * math.sqrt(2 * 0.85 * 0.15 / 405), 1)
# ---- the released DeepSeek trials ----
R = D['rows']; tasks = D['tasks']
passes = sum(r[2] for r in R); V['ds_pass'] = passes
chk('released artifact: 392 of 440 trials pass', passes, 392, src='artifact README')
per = collections.defaultdict(list)
for r in R: per[tasks[r[0]]].append(r[2])
V['ds_cov'] = sum(1 for v in per.values() if max(v) > 0)
chk('tasks solved at least once (artifact: pass@5 97.73%)', pct(V['ds_cov'], 88), 97.73, src='artifact analysis.md')
V['ds_all5'] = sum(1 for v in per.values() if min(v) > 0); V['ds_zero'] = sorted(t for t, v in per.items() if max(v) == 0)
cost = sum(r[3] for r in R); V['ds_cost'] = round(cost, 2)
chk('recorded API cost of the 440 trials (artifact: $14.27)', cost, 14.27, tol=0.01, src='artifact analysis.md')
V['ds_gap_cost'] = round(15.20 - cost, 2)
tin, tca, tout = sum(r[4] for r in R), sum(r[5] for r in R), sum(r[6] for r in R)
V['ds_in'], V['ds_cache'], V['ds_out'] = tin, tca, tout; V['ds_cache_share'] = round(pct(tca, tin), 2)
chk('cached input tokens 2,099,966,976', tca, 2099966976, tol=0, src='artifact analysis.md')
V['ds_timeouts'] = sum(1 for r in R if r[8] == 1)
chk('AgentTimeoutError trials', V['ds_timeouts'], 10, tol=0, src='artifact README')
V['ds_retries'] = D['job_result']['n_retries']
m = [sum(v) / len(v) for v in per.values()]; mu = sum(m) / len(m)
V['ds_se_task'] = round(100 * math.sqrt(sum((x - mu) ** 2 for x in m) / (len(m) - 1) / len(m)), 2)
V['ds_se_binom'] = round(100 * math.sqrt(0.8909 * 0.1091 / 440), 2)
blk = [r for r in R if r[10] > 0]; nb = [r for r in R if r[10] == 0]
V['blk_n'], V['blk_pass'], V['nb_n'], V['nb_pass'] = len(blk), sum(r[2] for r in blk), len(nb), sum(r[2] for r in nb)
V['blk_share'] = round(pct(len(blk), len(R)), 1)
V['blk_events'] = sum(r[10] for r in R); V['man_events'] = sum(r[11] for r in R); V['gotos'] = sum(r[9] for r in R)
V['final_handoff'] = sum(1 for r in R if D['nodes'][r[12]] == 'handoff')
V['median_sec'] = sorted(r[7] for r in R)[len(R) // 2]
gt = D['gate_tasks']; V['n_gates'] = len(gt); V['gates_one_task'] = sum(1 for v in gt.values() if len(v) == 1)
V['tasks_with_gate'] = len({t for v in gt.values() for t in v})
V['trials_with_gate'] = sum(1 for r in R if r[14])
# Table 3 tasks in the DeepSeek run, and the tasks the judge flagged on the GPT-5.6 submission
V['t3_ds'] = {r[0]: sum(per.get(r[0], [])) for r in t3}
V['t3_flagged'] = sorted(set(r[0] for r in t3) & set(LB['142']['flags']['harness_cheating']))
V['t3_gated'] = sorted(r[0] for r in t3 if any(r[0] in v for v in gt.values()))
V['per_task'] = {t: sum(v) for t, v in sorted(per.items())}
out = {'checks': C, 'v': V}
open(os.path.join(HERE, 'inputs', 'recompute.json'), 'w').write(json.dumps(out, indent=1))
print(sum(c['ok'] for c in C), 'of', len(C), 'checks ok'); print({k: v for k, v in V.items() if k not in ('per_task',)})
