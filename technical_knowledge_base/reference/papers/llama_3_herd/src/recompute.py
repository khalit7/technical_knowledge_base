"""Recompute every derived number on the Llama 3 Herd page from the paper's tables and figures.
Writes inputs/recompute.json (read by mk_paper.py into window.PAPER.rc) and prints a report.
usage: python3 recompute.py  (stdlib only; needs tables.json and inputs/figs.json)"""
import json, math, os

HERE = os.path.dirname(os.path.abspath(__file__))
T = json.load(open(os.path.join(HERE, 'tables.json')))
F = json.load(open(os.path.join(HERE, 'inputs', 'figs.json')))
num = lambda s: float(str(s).replace(',', '').replace('%', '').rstrip('△⊲♢').strip())
R = {}
lg = math.log10


def linfit(xs, ys):
    n = len(xs); mx = sum(xs) / n; my = sum(ys) / n
    a = sum((x - mx) * (y - my) for x, y in zip(xs, ys)) / sum((x - mx) ** 2 for x in xs)
    return a, my - a * mx


def nelder(f, x0, step=0.1, it=4000):
    n = len(x0); S = [list(x0)] + [[x0[j] + (step if j == i else 0) for j in range(n)] for i in range(n)]
    for _ in range(it):
        S.sort(key=f); c = [sum(p[j] for p in S[:-1]) / n for j in range(n)]
        w = S[-1]; r = [c[j] + (c[j] - w[j]) for j in range(n)]
        if f(r) < f(S[0]):
            e = [c[j] + 2 * (c[j] - w[j]) for j in range(n)]; S[-1] = e if f(e) < f(r) else r
        elif f(r) < f(S[-2]): S[-1] = r
        else:
            k = [c[j] + .5 * (w[j] - c[j]) for j in range(n)]
            if f(k) < f(w): S[-1] = k
            else: S = [S[0]] + [[S[0][j] + .5 * (p[j] - S[0][j]) for j in range(n)] for p in S[1:]]
    S.sort(key=f); return S[0]


# 1. Parameter counts from Table 3 (vocabulary 128,256 from the released config.json; Table 3 prints 128,000)
cfg = {m: dict(zip([r[0] for r in T['t3']['rows']], [r[1][i] if len(r[1]) > i else r[1][0] for r in T['t3']['rows']])) for i, m in enumerate(T['t3']['models'])}
V = json.load(open(os.path.join(HERE, 'inputs', 'config_llama3_1_8b.json')))['vocab_size']
params = {}
for m, c in cfg.items():
    L, d, ff, h, kv = (int(num(c[k])) for k in ('Layers', 'Model Dimension', 'FFN Dimension', 'Attention Heads', 'Key/Value Heads'))
    hd = d // h
    attn = d * d * 2 + 2 * d * kv * hd
    mlp = 3 * d * ff
    layer = attn + mlp + 2 * d
    total = L * layer + 2 * V * d + d
    params[m] = {'L': L, 'd': d, 'ff': ff, 'h': h, 'kv': kv, 'hd': hd, 'attn_per_layer': attn, 'mlp_per_layer': mlp,
                 'per_layer': layer, 'embed_and_head': 2 * V * d, 'total': total,
                 'kv_bytes_per_token_bf16': 2 * L * kv * hd * 2, 'kv_bytes_mha_bf16': 2 * L * h * hd * 2}
R['vocab'] = V
R['params'] = params
N405 = params['405B']['total']

# 2. Training compute: 6ND, and with the attention term (Kaplan et al.: 6 n_layer n_ctx d per token)
D405 = 15.6e12
R['flops_6nd'] = 6 * N405 * D405
R['flops_attn_8k_extra'] = 6 * params['405B']['L'] * 8192 * params['405B']['d'] * D405
R['llama2_70b_flops'] = 6 * 70e9 * 2e12
R['ratio_vs_llama2_70b'] = 3.8e25 / R['llama2_70b_flops']
R['tok_per_param_405b'] = D405 / N405
R['chars_per_token_gain'] = 3.94 / 3.17

# 3. Scaling law (Figure 3): refit the ten compute-optimal points
P = F['fig3_points']
a, b = linfit([lg(c) for c, d in P], [lg(d) for c, d in P])
R['fit'] = {'alpha': a, 'A': 10 ** b, 'resid_max_pct': max(abs(10 ** (b + a * lg(c)) / d - 1) for c, d in P) * 100}
C = 3.8e25
def Dstar(al, A, c=C): return A * c ** al
R['forecast'] = {}
for name, al, A in (('text', 0.53, 0.29), ('legend', 0.537, 0.299), ('refit', a, 10 ** b)):
    D = Dstar(al, A); R['forecast'][name] = {'alpha': al, 'A': A, 'D_at_3.8e25': D, 'N_at_3.8e25': C / (6 * D),
                                             'D_at_4e25': Dstar(al, A, 4e25), 'N_at_4e25': 4e25 / (6 * Dstar(al, A, 4e25))}
# the budget at which the refit law gives the paper's 16.55T
R['C_for_16_55T'] = (16.55e12 / (10 ** b)) ** (1 / a)
R['N_402B_D_16_55T_flops'] = 6 * 402e9 * 16.55e12
R['extrapolation_orders'] = lg(C) - lg(1e22)

# 4. IsoFLOPs (Figure 2): refit each parabola in log10(tokens) and compare its minimum with the drawn one
def quadfit(X, Y):
    S = [[sum(x ** (i + j) for x in X) for j in range(3)] for i in range(3)]
    Tt = [sum(y * x ** i for x, y in zip(X, Y)) for i in range(3)]
    M = [S[i] + [Tt[i]] for i in range(3)]
    for i in range(3):
        p = M[i][i]; M[i] = [v / p for v in M[i]]
        for k in range(3):
            if k != i:
                f = M[k][i]; M[k] = [vk - f * vi for vk, vi in zip(M[k], M[i])]
    return M[0][3], M[1][3], M[2][3]
iso = {}
for (bud, v), (dm, lm) in zip(F['fig2'].items(), F['fig2_minima']):
    X = [lg(t) for t, l in v['points']]; Y = [l for t, l in v['points']]
    c0, c1, c2 = quadfit(X, Y); xm = -c1 / (2 * c2)
    iso[bud] = {'n': len(X), 'c': [c0, c1, c2], 'min_tokens': 10 ** xm, 'min_loss': c0 + c1 * xm + c2 * xm * xm,
                'drawn_min_tokens': dm, 'drawn_min_loss': lm, 'tok_diff_pct': (10 ** xm / dm - 1) * 100}
R['iso'] = iso
R['iso_max_tok_diff_pct'] = max(abs(x['tok_diff_pct']) for x in iso.values())

# 5. ARC Challenge forecast (Figure 4): stage 1 linear in log10 FLOPs, stage 2 sigmoid in NLL
Lp = F['fig4_left']['scaling_law_models']
a1, b1 = linfit([x for x, y in Lp], [y for x, y in Lp])
nll_pred = a1 * lg(C) + b1
R['arc'] = {'stage1_slope': a1, 'stage1_icpt': b1, 'nll_pred_refit': nll_pred,
            'nll_pred_drawn': F['fig4_left']['prediction'][0][1], 'nll_actual_drawn': F['fig4_left']['llama3_405b'][0][1],
            'acc_pred_drawn': F['fig4_right']['prediction'][0][1], 'acc_actual_drawn': F['fig4_right']['llama3_405b'][0][1]}
# the drawn sigmoid: fit acc = lo + (1 - lo) / (1 + exp(k (x - x0))) to the drawn right-hand curve
curve = F['fig4_right_curve']
sig = lambda p, x: p[2] + (p[3] - p[2]) / (1 + math.exp(p[0] * (x - p[1])))
loss = lambda p: sum((sig(p, x) - y) ** 2 for x, y in curve)
ps = nelder(loss, [40, 1.3, 0.25, 1.0], step=0.5)
R['arc']['sigmoid_drawn'] = {'k': ps[0], 'x0': ps[1], 'lo': ps[2], 'hi': ps[3], 'rms': math.sqrt(loss(ps) / len(curve))}
# our own sigmoid fit to the 7 scaling-law points and 4 Llama 2 points (the inputs the paper names)
pts = F['fig4_right']['scaling_law_models'] + F['fig4_right']['llama2_models']
loss2 = lambda p: sum((sig(p, x) - y) ** 2 for x, y in pts) + (0 if 0 <= p[2] <= .3 and p[3] <= 1 else 1e3)
po = nelder(loss2, ps[:], step=0.3)
R['arc']['sigmoid_refit'] = {'k': po[0], 'x0': po[1], 'lo': po[2], 'hi': po[3], 'rms': math.sqrt(loss2(po) / len(pts))}
# the same, with the floor fixed at chance (0.25, four choices) and the ceiling at 1.0: only k and x0 free
loss3 = lambda q: sum((sig([q[0], q[1], .25, 1.0], x) - y) ** 2 for x, y in pts)
pf = nelder(loss3, [38, 1.27], step=0.2)
R['arc']['sigmoid_fixed'] = {'k': pf[0], 'x0': pf[1], 'lo': .25, 'hi': 1.0, 'rms': math.sqrt(loss3(pf) / len(pts))}
R['arc']['acc_at_refit_nll_fixed_sigmoid'] = sig([pf[0], pf[1], .25, 1.0], nll_pred)
R['arc']['acc_at_actual_nll_fixed_sigmoid'] = sig([pf[0], pf[1], .25, 1.0], 1.19)
R['arc']['acc_at_pred_drawn_sigmoid'] = sig(ps, R['arc']['nll_pred_drawn'])
R['arc']['acc_at_refit_nll_refit_sigmoid'] = sig(po, nll_pred)
R['arc']['pretrained_arc_c_t12'] = [r for r in T['t12']['rows'] if r[0] == 'Llama 3 405B'][0][3]
R['arc']['best_llama2_point'] = max(F['fig4_right']['llama2_models'], key=lambda p: p[1])

# 6. Table 4: mesh products, tokens per batch, MFU against the H100 SXM dense BF16 peak (989.4 TFLOP/s)
PEAK = 989.4
t4 = []
for r in T['t4']['rows']:
    g, tp, cp, pp, dp, sl, bdp = (int(num(x)) for x in r[:7])
    t4.append({'gpus': g, 'product': tp * cp * pp * dp, 'tokens_per_batch': dp * bdp * sl, 'tflops': num(r[8]),
               'mfu_stated': num(r[9]), 'mfu_recomputed': num(r[8]) / PEAK * 100})
R['t4'] = t4
R['t4_v1_row3_product'] = 8 * 16 * 16 * 4
R['peak_bf16'] = PEAK

# 7. Table 5: interruptions
rows5 = T['t5']['rows']
cnt = sum(int(r[2]) for r in rows5); pct = sum(num(r[3]) for r in rows5)
gpu_pct = sum(num(r[3]) for r in rows5 if r[1] == 'GPU'); gpu_cnt = sum(int(r[2]) for r in rows5 if r[1] == 'GPU')
hw_cats = ('GPU', 'Host', 'Network', 'Unplanned Maintenance')
R['t5'] = {'sum_counts': cnt, 'sum_pct': pct, 'gpu_pct_stated_sum': gpu_pct, 'gpu_count': gpu_cnt,
           'gpu_pct_from_counts': gpu_cnt / 419 * 100, 'faulty_gpu_pct_from_count': 148 / 419 * 100,
           'faulty_gpu_count_from_pct': 0.301 * 419, 'hw_pct_stated_sum': sum(num(r[3]) for r in rows5 if r[1] in hw_cats),
           'hw_pct_no_network': sum(num(r[3]) for r in rows5 if r[1] in ('GPU', 'Host', 'Unplanned Maintenance')),
           'hw_count_share_no_network': sum(int(r[2]) for r in rows5 if r[1] in ('GPU', 'Host', 'Unplanned Maintenance')) / 419 * 100,
           'hw_count_share_with_network': sum(int(r[2]) for r in rows5 if r[1] in hw_cats) / 419 * 100,
           'row_check': [[r[0], int(r[2]) / 419 * 100, num(r[3])] for r in rows5]}
R['interrupt'] = {'all_per_day': 466 / 54, 'unexp_per_day': 419 / 54, 'hours_between_all': 54 * 24 / 466, 'hours_between_unexp': 54 * 24 / 419}

# 8. The training run: batch ramp, steps, GPU hours (model card)
M = 2 ** 20
ramp = [(0, 252e6, 4 * M, 4096), (252e6, 2.87e12, 8 * M, 8192), (2.87e12, D405, 16 * M, 8192)]
steps = [(t1 - t0) / b for t0, t1, b, s in ramp]
R['ramp'] = {'steps': steps, 'total_steps': sum(steps), 'cosine_steps': 1.2e6}
R['gpu_hours_405b'] = 30.84e6
R['eff_tflops_per_gpu'] = 3.8e25 / (30.84e6 * 3600) / 1e12
R['eff_mfu'] = R['eff_tflops_per_gpu'] / PEAK * 100
R['days_on_16k'] = 30.84e6 / 16384 / 24
R['days_ideal_16k_400tf'] = 3.8e25 / (16384 * 400e12) / 86400
R['long_ctx_share'] = 800e9 / D405

# 9. Table 2 with 95% CIs. The paper prints CIs for code, tool use and long context (Tables 18, 21, 22);
# for the rest, CI = 1.96 sqrt(S(1-S)/N) (the paper's own formula, Section 5.1.1) with N from the benchmark's paper.
NB = {'MMLU (5-shot)': 14042, 'MMLU (0-shot, CoT)': 14042, 'MMLU-Pro (5-shot, CoT)': 12032, 'IFEval': 541,
      'GSM8K (8-shot, CoT)': 1319, 'MATH (0-shot, CoT)': 5000, 'ARC Challenge (0-shot)': 1172, 'GPQA (0-shot, CoT)': 448,
      'MGSM (0-shot, CoT)': 2750}
ci = lambda s, n: 196 * math.sqrt(s / 100 * (1 - s / 100) / n)
R['bench_n'] = NB
R['check_ci'] = {'ARC-C 96.1 (T12, printed 1.1)': ci(96.1, 1172), 'GSM8K 89.0 (T12, printed 1.7)': ci(89.0, 1319),
                 'MATH 53.8 (T12, printed 1.4)': ci(53.8, 5000), 'HumanEval 89.0 (T18, printed 4.8)': ci(89.0, 164)}
R['quality_n_from_ci'] = 1.96 ** 2 * .952 * .048 / .091 ** 2

# 10. Post-training mixes and the long-context share of SFT tokens
t7 = T['t7']['rows']
R['t6_sum'] = sum(num(r[1]) for r in T['t6']['rows'] if r[0] != 'Total')
R['t7_sum'] = sum(num(r[1]) for r in t7 if r[0] != 'Total')
tot_tok = sum(num(r[1]) * num(r[3]) for r in t7 if r[0] != 'Total')
R['t7_token_share'] = {r[0]: num(r[1]) * num(r[3]) / tot_tok * 100 for r in t7 if r[0] != 'Total'}
R['t7_weighted_tokens'] = tot_tok / 100

# 11. Human evaluations (Figure 17): margins and whether the 95% CIs overlap
he = {}
for k, rows in T['f17']['panels'].items():
    he[k] = [{'row': r['row'], 'margin': r['win'] - r['loss'], 'separated': r['win_ci'][1] < r['loss_ci'][0] or r['loss_ci'][1] < r['win_ci'][0]} for r in rows]
R['heval'] = he

json.dump(R, open(os.path.join(HERE, 'inputs', 'recompute.json'), 'w'), indent=1)
if __name__ == '__main__':
    p = params['405B']
    print('params', {m: round(v['total'] / 1e9, 2) for m, v in params.items()}, 'B; 405B per layer', p['per_layer'], 'KV/token', p['kv_bytes_per_token_bf16'])
    print('6ND %.3e  +attn@8K %.3e  vs Llama2-70B x%.1f  tok/param %.1f' % (R['flops_6nd'], R['flops_attn_8k_extra'], R['ratio_vs_llama2_70b'], R['tok_per_param_405b']))
    print('fit', R['fit']); print('forecast', json.dumps(R['forecast'], indent=0)); print('C for 16.55T %.3e' % R['C_for_16_55T'], '402Bx16.55T %.3e' % R['N_402B_D_16_55T_flops'])
    print('iso max token diff %.2f%%' % R['iso_max_tok_diff_pct'])
    print('arc', json.dumps(R['arc'], indent=0))
    print('t4', t4); print('t5', {k: v for k, v in R['t5'].items() if k != 'row_check'}); print('interrupt', R['interrupt'])
    print('ramp', R['ramp'], 'eff tflops %.0f mfu %.1f days16k %.1f ideal %.1f' % (R['eff_tflops_per_gpu'], R['eff_mfu'], R['days_on_16k'], R['days_ideal_16k_400tf']))
    print('ci checks', R['check_ci'], 'QuALITY N', R['quality_n_from_ci'])
    print('t6', R['t6_sum'], 't7', R['t7_sum'], R['t7_token_share'])
    print('heval', json.dumps(he)[:800])
