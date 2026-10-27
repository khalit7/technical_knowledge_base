"""Recompute every derived number the page shows from tables.json (transcribed and decoded values) and the
paper's own formulas, and check the paper's in-text claims against its own figures.
Writes inputs/recompute.json (read by mk_paper.py into window.PAPER.rc) and prints a claim-by-claim report.
usage: python3 recompute.py   (build.sh runs it)"""
import json, math, os, statistics
from decimal import Decimal, ROUND_HALF_UP

HERE = os.path.dirname(os.path.abspath(__file__))
TB = json.load(open(os.path.join(HERE, 'tables.json')))
R = {}
rd = lambda x, n=2: float(Decimal(repr(x)).quantize(Decimal(1).scaleb(-n), rounding=ROUND_HALF_UP))
claims = []


def claim(cid, text, ok, detail):
    new = text.startswith('Not stated in the text: ')
    sym = lambda t: t.replace('lambda', 'λ').replace('delta', 'δ').replace('sqrt 2', '√2').replace('-0.0,', '0.0,')
    claims.append({'id': cid, 'claim': sym(text.replace('Not stated in the text: ', '')), 'holds': ok, 'new': new, 'detail': sym(detail)})


# ---- Figure 1 (Section 4.2), decoded ----
F1 = TB['F1']
bars = {(b['config'], b['lr']): b for b in F1['bars_id']}
sp = {(b['config'], b['lr']): b for b in F1['bars_sparsity']}
sc = {}
for s in F1['scatter']:
    if s['config'] == 'untrained baseline': base = s
    else: sc.setdefault(s['config'], []).append(s)
# the scatter's points match the bars' ID accuracy, which identifies each point's learning rate
for cfg, pts in sc.items():
    for p in pts:
        p['lr'] = min(('1e-5', '5e-5'), key=lambda lr: abs(bars[(cfg, lr)]['value'] - p['id']))
ood = {(c, p['lr']): rd(p['ood'] - base['ood']) for c, pts in sc.items() for p in pts}
R['f1'] = {'id': {'%s %s' % k: rd(v['value'], 1) for k, v in bars.items()}, 'id_sem': {'%s %s' % k: v['sem'] for k, v in bars.items()},
           'sparsity': {'%s %s' % k: rd(v['value'], 1) for k, v in sp.items()}, 'ood_change': {'%s %s' % k: v for k, v in ood.items()},
           'baseline_ood': rd(base['ood']), 'baseline_id': rd(base['id'])}
on_best = max(bars[('OnPD F-KL', l)]['value'] for l in ('1e-5', '5e-5')), max(bars[('OnPD R-KL', l)]['value'] for l in ('1e-5', '5e-5'))
off_best = max(bars[('OffPD F-KL', l)]['value'] for l in ('1e-5', '5e-5')), max(bars[('OffPD R-KL', l)]['value'] for l in ('1e-5', '5e-5'))
claim('f1-best', 'Best mean ID accuracy: 72% OnPD, 73% OffPD (§4.2)', rd(max(on_best), 0) == 72 and rd(max(off_best), 0) == 73,
      'decoded %.2f and %.2f' % (max(on_best), max(off_best)))
fk = [bars[(c, l)]['value'] for c in ('OnPD F-KL', 'OffPD F-KL') for l in ('1e-5', '5e-5')]
rk = [bars[(c, l)]['value'] for c in ('OnPD R-KL', 'OffPD R-KL') for l in ('1e-5', '5e-5')]
claim('f1-fkl', 'Forward KL 71 to 73% across rollout policies and learning rates (§4.2)', rd(min(fk), 0) == 71 and rd(max(fk), 0) == 73, 'decoded %.2f to %.2f' % (min(fk), max(fk)))
claim('f1-rkl', 'Reverse KL 35% to 72% (§4.2)', rd(min(rk), 0) == 35 and rd(max(rk), 0) == 72, 'decoded %.2f to %.2f' % (min(rk), max(rk)))
lo = [v for (c, l), v in ood.items() if l == '1e-5']; hi = [v for (c, l), v in ood.items() if l == '5e-5']
claim('f1-ood-lo', 'Mean OOD performance changes by at most 1.3 points at the lower learning rate (§4.2)', max(abs(v) for v in lo) <= 1.35,
      'decoded changes from the untrained baseline (%.2f%%): %s; largest %.2f' % (base['ood'], ', '.join('%+.2f' % v for v in lo), max(abs(v) for v in lo)))
claim('f1-ood-hi', 'OOD drops by 11.2 to 14.0 points at the higher learning rate (§4.2)', abs(-max(hi) - 11.2) < 0.15 and abs(-min(hi) - 14.0) < 0.15,
      'decoded drops %.2f to %.2f (the scatter subtracts one shared baseline; the paper may average per-dataset differences, which explains a gap of about 0.1 point; the largest decoded change at the lower rate is 1.0, inside the stated 1.3)' % (-max(hi), -min(hi)))
sl = [sp[(c, '1e-5')]['value'] for c in ('OnPD F-KL', 'OnPD R-KL', 'OffPD F-KL', 'OffPD R-KL')]
sh = [sp[(c, '5e-5')]['value'] for c in ('OnPD F-KL', 'OnPD R-KL', 'OffPD F-KL', 'OffPD R-KL')]
claim('f1-sparsity', 'Sparsity 85.3 to 89.6% at the lower rate, 51.9 to 60.0% at the higher (§4.2)', (rd(min(sl), 1), rd(max(sl), 1), rd(min(sh), 1), rd(max(sh), 1)) == (85.3, 89.6, 51.9, 60.0),
      'decoded %.2f to %.2f and %.2f to %.2f' % (min(sl), max(sl), min(sh), max(sh)))
ok = all(sp[('OffPD ' + k, l)]['value'] >= sp[('OnPD ' + k, l)]['value'] for k in ('F-KL', 'R-KL') for l in ('1e-5', '5e-5'))
claim('f1-offsparse', 'OffPD at least as sparse as OnPD in every matched comparison (§4.2)', ok, 'four matched pairs checked')

# ---- Figure 3 (Section 5.2), decoded ----
F3 = TB['F3']
acc = F3[0]; dood = F3[1]; spars = F3[2]
fk1 = [r[1] for r in acc['forward 1e-5']]; fk5 = [r[1] for r in acc['forward 5e-5']]
rk1 = [r[1] for r in acc['reverse 1e-5']]; rk5 = [r[1] for r in acc['reverse 5e-5']]
R['f3'] = {'lams': [r[0] + 0.0 for r in acc['forward 1e-5']], 'fkl_range_1e5': rd(max(fk1) - min(fk1)), 'fkl_range_5e5': rd(max(fk5) - min(fk5)),
           'rkl_range_1e5': rd(max(rk1) - min(rk1)), 'rkl_range_5e5': rd(max(rk5) - min(rk5)),
           'rkl_neg_mean_1e5': rd(statistics.mean(rk1[:4])), 'rkl_pos_mean_1e5': rd(statistics.mean(rk1[5:])),
           'fkl_neg_mean_1e5': rd(statistics.mean(fk1[:4])), 'fkl_pos_mean_1e5': rd(statistics.mean(fk1[5:])),
           'rkl_sem_neg_max': max(r[2] for r in acc['reverse 1e-5'][:4]), 'fkl_sem_max': max(r[2] for r in acc['forward 1e-5'] + acc['forward 5e-5'])}
claim('f3-80', 'Forward KL held-out accuracy above 80% across the whole spectrum (§5.2)', min(fk1 + fk5) > 80, 'lowest decoded point %.2f' % min(fk1 + fk5))
claim('f3-5.2', 'Forward KL varies by only 5.2 points at learning rate 1e-5 (§5.2)', rd(max(fk1) - min(fk1), 1) == 5.2, 'decoded %.2f to %.2f, range %.2f' % (min(fk1), max(fk1), max(fk1) - min(fk1)))
claim('f3-rkl', 'At the lower rate reverse KL benefits strongly from student-favoured rollouts (§5.2)', statistics.mean(rk1[5:]) - statistics.mean(rk1[:4]) > 20,
      'mean %.1f%% for lambda > 0 against %.1f%% for lambda < 0' % (statistics.mean(rk1[5:]), statistics.mean(rk1[:4])))
claim('f3-collapse', 'At the higher rate reverse KL is unstable and occasionally collapses (§5.2)', min(rk5) < 5, 'decoded %s' % ', '.join('%.1f' % (v + 0.0) for v in rk5))
claim('f3-fkl5', 'Not stated in the text: forward KL at the higher rate is the most accurate setting on Countdown-3', min(fk5) > max(fk1) - 2,
      'forward KL at 5e-5: %.1f to %.1f against %.1f to %.1f at 1e-5' % (min(fk5), max(fk5), min(fk1), max(fk1)))
dl = [r[1] for k in ('forward 1e-5', 'reverse 1e-5') for r in dood[k]]; dh = [r[1] for k in ('forward 5e-5', 'reverse 5e-5') for r in dood[k]]
R['f3']['ood_lo'] = [rd(min(dl)), rd(max(dl))]; R['f3']['ood_hi'] = [rd(min(dh)), rd(max(dh))]
sl3 = [r[1] for k in ('forward 1e-5', 'reverse 1e-5') for r in spars[k]]; sh3 = [r[1] for k in ('forward 5e-5', 'reverse 5e-5') for r in spars[k]]
R['f3']['sp_lo'] = [rd(min(sl3)), rd(max(sl3))]; R['f3']['sp_hi'] = [rd(min(sh3)), rd(max(sh3))]
claim('f3-lr', 'Forgetting and sparsity move far more with learning rate than with lambda (§5.2)', max(dl) - min(dl) < 4 and min(dl) - max(dh) > 10,
      'OOD change %.1f to %.1f at 1e-5, %.1f to %.1f at 5e-5; sparsity %.1f to %.1f against %.1f to %.1f' % (min(dl), max(dl), min(dh), max(dh), min(sl3), max(sl3), min(sh3), max(sh3)))

# ---- Figure 5 (Section 5.3), decoded ----
F5 = {p['panel']: p['rows_lambda_p1_sem_p10_sem'] for p in TB['F5']}
pos = lambda rows, j: [r[j] for r in rows if r[0] > 0.01]
neg = lambda rows, j: [r[j] for r in rows if r[0] < -0.01]
c3f, c3r, c4f, c4r = F5['Countdown-3 forward'], F5['Countdown-3 reverse'], F5['Countdown-4E forward'], F5['Countdown-4E reverse']
R['f5'] = {
    'c3_p1_pos': {'f': [min(pos(c3f, 1)), max(pos(c3f, 1))], 'r': [min(pos(c3r, 1)), max(pos(c3r, 1))]},
    'c3_p10_pos': {'f': [min(pos(c3f, 3)), max(pos(c3f, 3))], 'r': [min(pos(c3r, 3)), max(pos(c3r, 3))]},
    'c4_gain_p1': {'f': rd(statistics.mean(pos(c4f, 1)) - statistics.mean(neg(c4f, 1))), 'r': rd(statistics.mean(pos(c4r, 1)) - statistics.mean(neg(c4r, 1)))},
    'c4_gain_p10': {'f': rd(statistics.mean(pos(c4f, 3)) - statistics.mean(neg(c4f, 3))), 'r': rd(statistics.mean(pos(c4r, 3)) - statistics.mean(neg(c4r, 3)))},
    'c4_p1_neg': {'f': rd(statistics.mean(neg(c4f, 1))), 'r': rd(statistics.mean(neg(c4r, 1)))},
    'c4_p1_pos': {'f': rd(statistics.mean(pos(c4f, 1))), 'r': rd(statistics.mean(pos(c4r, 1)))},
}
claim('f5-cov', 'For lambda > 0 both directions have similar pass@1 but forward KL has higher pass@10 (§5.3)',
      min(pos(c3f, 3)) > max(pos(c3r, 3)), 'pass@1 forward %.1f to %.1f, reverse %.1f to %.1f (reverse slightly higher); pass@10 forward %.1f to %.1f, reverse %.1f to %.1f'
      % tuple(R['f5']['c3_p1_pos']['f'] + R['f5']['c3_p1_pos']['r'] + R['f5']['c3_p10_pos']['f'] + R['f5']['c3_p10_pos']['r']))
claim('f5-gen', 'On Countdown-4E, lambda > 0 gives 10 to 15% higher pass@k than off-policy rollouts (§5.3)', False,
      'holds for pass@10 in points (mean gain %.1f forward, %.1f reverse) but not for pass@1, where the gain is %.1f and %.1f points (from %.1f%% to %.1f%% forward); "pass@k" covers both'
      % (R['f5']['c4_gain_p10']['f'], R['f5']['c4_gain_p10']['r'], R['f5']['c4_gain_p1']['f'], R['f5']['c4_gain_p1']['r'], R['f5']['c4_p1_neg']['f'], R['f5']['c4_p1_pos']['f']))

# ---- Figures 6 and 26 (RLVR), decoded; the reward is 2 per correct answer, so accuracy = reward / 2 ----
rl = {}
for key in ('F6', 'F26'):
    for p in TB[key]:
        rl['%s %s' % (key, p['panel'])] = {'start': [c['first'] for c in p['curves']], 'peak': [c['peak'] for c in p['curves']],
                                           'peak_step': [c['peak_step'] for c in p['curves']], 'end50': [c['mean_last50'] for c in p['curves']]}
R['rl'] = rl
claim('f6-off', 'OffPD forward-KL checkpoints (1e-5) improve steadily and end highest (§5.3)', min(rl['F6 OffPD F-KL']['end50']) > max(max(v['end50']) for k, v in rl.items() if k.startswith('F6') and 'OffPD F-KL' not in k),
      'mean reward over the last 50 steps %s against at most %.3f for the other 1e-5 settings' % (rl['F6 OffPD F-KL']['end50'], max(max(v['end50']) for k, v in rl.items() if k.startswith('F6') and 'OffPD F-KL' not in k)))
claim('f6-onf', 'Not stated in the text: OnPD forward-KL checkpoints (1e-5), the best Countdown-4E generalisers, never learn in RLVR', max(rl['F6 OnPD F-KL']['peak']) < 0.1,
      'peak reward %s (at most 5%% correct), last 50 steps %s' % (rl['F6 OnPD F-KL']['peak'], rl['F6 OnPD F-KL']['end50']))
claim('f6-rkl', 'Reverse-KL checkpoints (1e-5) improve quickly then collapse (§5.3)', all(p > 2 * e for p, e in zip(rl['F6 OffPD R-KL']['peak'], rl['F6 OffPD R-KL']['end50'])),
      'OffPD reverse peaks %s at steps %s, last 50 steps %s; OnPD reverse peaks %s, last 50 steps %s (one seed holds on)' % (rl['F6 OffPD R-KL']['peak'], rl['F6 OffPD R-KL']['peak_step'], rl['F6 OffPD R-KL']['end50'], rl['F6 OnPD R-KL']['peak'], rl['F6 OnPD R-KL']['end50']))

# ---- Table 6 (Appendix E): the learning rates behind the "RL updates are sparser" checkpoints ----
lrs = lambda st: [float(r[3]) for r in TB['t6'] if r[3] and (r[0] == 'SFT') == st]
sft, rlr = lrs(True), lrs(False)
R['t6'] = {'sft_mean': statistics.mean(sft), 'sft_median': statistics.median(sft), 'rl_mean': statistics.mean(rlr), 'rl_median': statistics.median(rlr), 'n_rl': len(rlr),
           'ratio_median': rd(statistics.median(sft) / statistics.median(rlr), 1)}
claim('t6', 'SFT mean and median 9e-6 and 5e-6; RL and preference mean and median 1.5e-6 and 5e-7 over nine checkpoints (Appendix E)',
      abs(R['t6']['sft_mean'] - 9e-6) < 1e-12 and R['t6']['sft_median'] == 5e-6 and abs(R['t6']['rl_mean'] - 1.5e-6) < 1e-12 and R['t6']['rl_median'] == 5e-7 and len(rlr) == 9,
      'recomputed %.2g, %.2g, %.2g, %.2g over %d' % (R['t6']['sft_mean'], R['t6']['sft_median'], R['t6']['rl_mean'], R['t6']['rl_median'], len(rlr)))

# ---- Theorem C.2's counterexample and Appendix D.5's amplification bound ----
def rkl_grad_two(delta):
    pS, pT = [0.5, 0.5], [delta, 1 - delta]
    r = [math.log(pS[i] / pT[i]) for i in range(2)]; D = sum(pS[i] * r[i] for i in range(2))
    return [pS[i] * (r[i] - D) for i in range(2)]
ex = {}
for d in (0.25, 1e-2, 1e-4, 1e-8):
    g = rkl_grad_two(d); n = math.hypot(*g) / 2
    ex[str(d)] = {'grad': g, 'traj_norm': n, 'formula': math.sqrt(2) / 8 * abs(math.log((1 - d) / d)), 'fkl_traj_norm': math.hypot(0.5 - d, 0.5 - (1 - d)) / 2}
R['c2'] = ex
claim('c2', 'Theorem C.2: the trajectory gradient norm is (sqrt 2 / 8) |log((1 - delta) / delta)| and diverges as delta goes to 0',
      all(abs(v['traj_norm'] - v['formula']) < 1e-12 for v in ex.values()), 'delta 1e-8 gives %.3f; forward KL at the same prefix stays at %.3f' % (ex['1e-08']['traj_norm'], ex['1e-08']['fkl_traj_norm']))
c = 2 * math.log(3)
R['d5'] = {'c': c, 'max_amp_lambda2': math.exp((2 - 1) / 2 * c)}
claim('d5', 'For lambda in [-2, 2] the safeguards cap pairwise-odds amplification at a factor of three (Appendix D.5)', abs(R['d5']['max_amp_lambda2'] - 3) < 1e-12,
      'exp(((2 - 1) / 2) x 2 log 3) = %.6f' % R['d5']['max_amp_lambda2'])

# ---- counts and budgets ----
R['counts'] = {'ood_items': 4 * 200 + 164 + 171 + 14 * 200, 'main_runs': 3 * 2 * 2 * 2 * 3, 'spectrum_runs': 9 * 2 * 2 * 3, 'rlvr_runs': 2 * 2 * 2 * 3,
               'id_eval_items': 600, 'tokens_per_step_cd3_max': 32 * 512}
claim('ood', '3,935 OOD examples across seven benchmarks (Appendix D.1.2)', R['counts']['ood_items'] == 3935, '4 x 200 + 164 + 171 + 14 x 200 = %d' % R['counts']['ood_items'])
claim('rlvr24', '24 RLVR runs (Appendix D.6)', R['counts']['rlvr_runs'] == 24, '2 rollout policies x 2 KL directions x 2 learning rates x 3 distillation seeds')
lens = [float(r[3]) for r in TB['t2'] if r[0] == 'Llama-3.1-8B']
claim('len', 'Average teacher responses of 94 to 135 tokens (§6)', (rd(min(lens), 0), rd(max(lens), 0)) == (94, 135), 'Llama-3.1-8B teachers in Table 2: %s' % lens)
# evaluation noise: one 200-question run at accuracy p has a binomial standard error sqrt(p(1-p)/200)
R['noise'] = {'se_200_at_70': rd(100 * math.sqrt(0.7 * 0.3 / 200)), 'se_600_at_70': rd(100 * math.sqrt(0.7 * 0.3 / 600)), 'se_200_at_7': rd(100 * math.sqrt(0.07 * 0.93 / 200))}
R['claims'] = claims
json.dump(R, open(os.path.join(HERE, 'inputs', 'recompute.json'), 'w'), indent=1)
for c in claims: print('%-12s %-5s %s | %s' % (c['id'], 'yes' if c['holds'] else 'NO', c['claim'][:70], c['detail'][:150]))
