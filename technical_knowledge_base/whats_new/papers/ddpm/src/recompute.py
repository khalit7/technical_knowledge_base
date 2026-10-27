"""Recompute every derived number the page shows, and gather the toy models' measured results.

  python3 recompute.py      (build.sh runs it; plain Python 3, no torch)  -> inputs/recompute.json

Paper numbers come from tables.json (transcribed from https://arxiv.org/html/2006.11239v2) and the
text of §4 and Appendix B; toy numbers from model/*.json written by train.py eval, export.py,
check_forward.py/.mjs and rd.py. Each check prints "ok" or "DIFFERS".
"""
import json, math, os

HERE = os.path.dirname(os.path.abspath(__file__))
TB = json.load(open(os.path.join(HERE, 'tables.json')))
M = lambda f: json.load(open(os.path.join(HERE, 'model', f)))
R = {}
chk = []


def check(name, got, printed, tol):
    ok = abs(got - printed) <= tol
    chk.append({'what': name, 'recomputed': got, 'printed': printed, 'ok': ok})
    print(('ok      ' if ok else 'DIFFERS ') + name, round(got, 6), 'printed', printed)


# ---- schedule (§4): T = 1000, beta linear 1e-4 .. 0.02 ----
T = 1000
beta = [1e-4 + (0.02 - 1e-4) * i / (T - 1) for i in range(T)]
abar = []; p = 1.0
for b in beta: p *= 1 - b; abar.append(p)
aT = abar[-1]
LT = lambda x2: 0.5 * (aT * x2 + (1 - aT) - 1 - math.log(1 - aT)) / math.log(2)   # bits per dim, E[x0^2] = x2
R['schedule'] = {'abar_T': aT, 'sqrt_abar_T': math.sqrt(aT), 'abar_500': abar[499], 'snr_1': abar[0] / (1 - abar[0]), 'snr_T': aT / (1 - aT),
                 'LT_bits_per_dim_x0_0': LT(0), 'LT_bits_per_dim_x0_pm1': LT(1), 'LT_bits_per_dim_x2_0.25': LT(0.25)}
check('L_T about 1e-5 bits/dim (§4) for pixels with E[x0^2] = 0.25', LT(0.25), 1e-5, 1e-5)
# weight of each L_{t-1} relative to L_simple's 1, sigma^2 = beta (Eq. 12)
w = lambda t: beta[t - 1] ** 2 / (2 * beta[t - 1] * (1 - beta[t - 1]) * (1 - abar[t - 1]))
R['weights'] = {'w2': w(2), 'w10': w(10), 'w100': w(100), 'w500': w(500), 'w1000': w(1000), 'ratio_2_to_1000': w(2) / w(1000)}

# ---- Appendix B: training and sampling cost ----
R['cost'] = {'cifar_hours': 800000 / 21 / 3600, 'cifar_ms_per_image': 17 / 256 * 1000,
             'lsun_days': {k: v / 2.2 / 86400 for k, v in {'CelebA-HQ': 0.5e6, 'LSUN Bedroom': 2.4e6, 'LSUN Cat': 1.8e6, 'LSUN Church': 1.2e6}.items()},
             'lsun_s_per_image': 300 / 128}
check('CIFAR10 800k steps at 21 steps/s = 10.6 hours (Appendix B)', R['cost']['cifar_hours'], 10.6, 0.05)

# ---- §4.3 and Table 4: rate and distortion ----
t4 = [[int(a), float(b), float(c)] for a, b, c in TB['T4']['rows']]
check('rate 1.78 + distortion 1.97 = the L_simple model NLL 3.75 (Table 1)', 1.78 + 1.97, 3.75, 0.005)
check('Table 4 final rate 1.77581 rounds to the text\'s 1.78', t4[0][1], 1.78, 0.005)
check('Table 4 final distortion 0.95136 rounds to the text\'s RMSE 0.95', t4[0][2], 0.95, 0.005)
R['rd'] = {'distortion_share': 1.97 / 3.75, 'rate_share_by_tau900': t4[1][1] / t4[0][1], 'rows': t4}
# train/test gap at most 0.03 (§4.3)
R['gaps'] = {'L': 3.70 - 3.69, 'L_simple': 3.75 - 3.72}
check('train/test gap at most 0.03 bits/dim (§4.3), largest of Table 1', max(R['gaps'].values()), 0.03, 1e-9)
R['margins'] = {'fid_vs_stylegan2ada_v1': 3.26 - 3.17, 'fid_ratio_T2': 13.51 / 3.17, 'fid_test_set': 5.24}

# ---- toy models (src/model) ----
rep = M('report.json'); q = M('quant_report.json'); cf = M('check_forward.json'); rd = M('rd.json')
toy = {'cfg': rep['cfg'], 'overlap_test_in_train': rep['overlap_test_in_train'], 'real': rep['real_data_reference'], 'variants': {}}
for k, v in rep['variants'].items():
    log = M(k + '_log.json')
    toy['variants'][k] = {
        'test_bpd': v['test_bpd'], 'train_bpd': v['train_bpd'], 'test_bpd_btilde': v['test_bpd_sigma_btilde'], 'rate_bpd': v['rate_bpd'], 'dist_bpd': v['distortion_L0_bpd'],
        'LT_bpd': v['LT_bpd'], 'beta': v['samples_sigma_beta'], 'btilde': v['samples_sigma_btilde'],
        'quant': q['variants'][k], 'js': cf['variants'][k],
        'loss': [float('%.4g' % r['loss']) for r in log], 'test_curve': [[r['step'], round(r['test_bpd'], 4)] for r in log if 'test_bpd' in r],
        'secs': log[-1]['sec'], 'rd': {'rate': rd['variants'][k]['rate'], 'dist': rd['variants'][k]['dist']},
        'per_t': rd['variants'][k]['per_t_bits_per_dim_every10']}
    chk.append({'what': k + ': rate + distortion = bound (toy)', 'recomputed': v['rate_bpd'] + v['distortion_L0_bpd'], 'printed': v['test_bpd'], 'ok': abs(v['rate_bpd'] + v['distortion_L0_bpd'] - v['test_bpd']) < 1e-3})
toy['tau'] = rd['tau']; toy['bits'] = q['bits']; toy['gauss_max_abs'] = cf['gauss_max_abs']
R['toy'] = toy
R['checks'] = chk
json.dump(R, open(os.path.join(HERE, 'inputs', 'recompute.json'), 'w'), separators=(',', ':'))
print('wrote inputs/recompute.json', sum(c['ok'] for c in chk), 'of', len(chk), 'checks ok')
