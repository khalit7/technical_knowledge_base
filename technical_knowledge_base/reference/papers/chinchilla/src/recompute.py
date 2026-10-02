"""Recompute every derived number the Chinchilla page shows, from the paper's printed values.

  python3 recompute.py          (build.sh runs it; prints the check table, writes inputs/recompute.json)

Each row: id, what, the printed value and where, the recomputed value and formula, and a verdict:
'reproduces' (within the printed precision), 'partly' (close but not within it) or 'does not'.
Fit results from the 245 extracted points come from fit.py (inputs/fit.json) and are reported there.
"""
import json, math, os

HERE = os.path.dirname(os.path.abspath(__file__))
T = json.load(open(os.path.join(HERE, 'tables.json')))
FIT = json.load(open(os.path.join(HERE, 'inputs', 'fit.json')))
R = []


def row(i, what, printed, where, v, formula, ok, note=''):
    R.append({'id': i, 'what': what, 'printed': printed, 'where': where, 'v': v, 'formula': formula, 'ok': ok, 'note': note})


def num(s):
    s = s.replace(',', '').strip()
    m = {'Million': 1e6, 'Billion': 1e9, 'Trillion': 1e12}
    for k, f in m.items():
        if k in s: return float(s.replace(k, '')) * f
    return float(s)


CG = 5.76e23  # Gopher's budget as the paper uses it (from Rae et al. 2021)
# --- Chinchilla and Gopher budgets ---
row('tpp_chin', 'Chinchilla tokens per parameter', '1.4T tokens, 70B parameters', 'S1.T1', 1.4e12 / 70e9, 'D / N', 'reproduces', 'exactly 20')
c_chin = 6 * 70e9 * 1.4e12; c_gop = 6 * 280e9 * 300e9
row('c_chin', 'Chinchilla training compute by 6ND', 'same budget as Gopher, 5.76e23', 'S4', c_chin, '6 × 70e9 × 1.4e12', 'partly',
    '5.88e23, 2% above 5.76e23; with 6ND Gopher comes out at 5.04e23, so by the paper\'s own rule of thumb Chinchilla used 17% more compute than Gopher')
row('c_gop', 'Gopher training compute by 6ND', '5.76e23 (Rae et al. 2021)', 'S3.F2', c_gop, '6 × 280e9 × 300e9', 'partly', 'the 5.76e23 is Gopher\'s own count, which includes attention and embeddings; Appendix F\'s more exact count gives 6.3e23')
# --- shapes: Table 4 parameters from 12 L d^2 and 13 L d^2 ---
for nm, L_, d, Np in (('Chinchilla', 80, 8192, 70e9), ('Gopher', 80, 16384, 280e9)):
    p12 = 12 * L_ * d * d + 32000 * d; p13 = 13 * L_ * d * d + 32000 * d
    row('par_' + nm.lower(), nm + ' parameters from its shape', '%dB' % (Np / 1e9), 'S4.T4', p13,
        '13 n_layer d_model² + 32,000 d_model (12 n_layer d_model² gives %.1fB)' % (p12 / 1e9), 'partly',
        'the usual 12 L d² undercounts by 8%%; one extra d² per layer, as a Transformer-XL relative-position projection would add (Gopher uses relative position encodings, Rae et al. 2021), lands on %.1fB. The paper does not state its count' % (p13 / 1e9))
# Table A9: every model's parameters from its shape, 12 L d^2 + 13 L d^2 bracket
a9 = []
for r in T['a9']['rows']:
    Pm = float(r[0].replace(',', '')); d, ff, kv, h, L_ = [float(x.replace(',', '')) for x in r[1:]]
    att = 4 * d * kv * h; mlp = 2 * d * ff
    p = L_ * (att + mlp) + 32000 * d; p_rel = L_ * (att + mlp + d * kv * h) + 32000 * d
    a9.append([Pm, p / 1e6, p_rel / 1e6])
dev = [abs(x[1] / x[0] - 1) for x in a9]; dev2 = [abs(x[2] / x[0] - 1) for x in a9]
row('a9_count', 'Table A9 parameter counts from each model\'s shape', '50 models, 44M to 16,183M', 'A10.T9', max(dev2),
    'L (4 d·kv·h + 2 d·ffw + d·kv·h) + 32,000 d; max relative error over 50 rows', 'reproduces' if max(dev2) < .03 else 'partly',
    'with the relative-position projection term the counts match to within %.1f%% (median %.1f%%); without it, to within %.1f%%' % (100 * max(dev2), 100 * sorted(dev2)[25], 100 * max(dev)))
# --- Eq. 4 exponents from the printed alpha, beta ---
al, be = 0.34, 0.28
row('eq4_a', 'Approach 3 exponent a = β/(α+β) from the printed α, β', '0.46', 'S3.T2', be / (al + be), '0.28 / (0.34 + 0.28)', 'partly',
    'the rounded constants give 0.452; the unrounded ones in the TeX source (α 0.33917, β 0.28491, Besiroglu et al.) give 0.4565, which rounds to the printed 0.46')
row('eq4_b', 'Approach 3 exponent b = α/(α+β)', '0.54', 'S3.T2', al / (al + be), '0.34 / 0.62', 'partly', 'unrounded: 0.5435')
# --- N_opt at Gopher's budget, Approach 3 ---
for nm, (E, A, B, a_, b_) in (('rounded', (1.69, 406.4, 410.7, 0.34, 0.28)), ('unrounded', (1.6934, 406.401, 410.7228, 0.33917084, 0.2849083))):
    G = (a_ * A / (b_ * B)) ** (1 / (a_ + b_)); aa = b_ / (a_ + b_)
    Nopt = G * (CG / 6) ** aa
    row('nopt3_' + nm, 'Approach 3 optimal size at Gopher\'s budget (%s constants)' % nm, '40B', 'S3.F4', Nopt, 'G (C/6)^a, G = (αA/βB)^(1/(α+β)) (Eq. 4)',
        'reproduces' if abs(Nopt / 40e9 - 1) < .05 else 'partly', '%.1fB; tokens %.2fT, %.0f per parameter' % (Nopt / 1e9, CG / 6 / Nopt / 1e12, CG / 6 / Nopt / Nopt))
# --- loss predictions for Gopher and Chinchilla ---
for nm, (E, A, B, a_, b_) in (('hoff', (1.69, 406.4, 410.7, 0.34, 0.28)), ('epoch', (1.8172, 482.01, 2085.43, 0.3478, 0.3658))):
    Lg = E + A / 280e9 ** a_ + B / 300e9 ** b_; Lc = E + A / 70e9 ** a_ + B / 1.4e12 ** b_
    row('loss_' + nm, 'Predicted loss, Gopher against Chinchilla (%s fit)' % ('the paper\'s' if nm == 'hoff' else 'Besiroglu et al.\'s'), 'not printed', 'A4.SS2', Lg - Lc,
        'L(280B, 300B) - L(70B, 1.4T) = %.4f - %.4f' % (Lg, Lc), 'derived', 'Chinchilla predicted lower by %.3f nats' % (Lg - Lc))
# --- Table 3 and Table A3: FLOPs = 6ND, tokens per parameter, Gopher units ---
for r in T['t3']['rows']:
    N = num(r[0]); C = float(r[1]); D = num(r[3]); gu = r[2]
    gu_v = float(gu.split('/')[1].replace(',', '')) ** -1 if '/' in gu else float(gu)
    row('t3_' + r[0].replace(' ', ''), 'Table 3, %s: 6ND and Gopher units' % r[0], '%s FLOPs, %s tokens, %s Gopher' % (r[1], r[3], gu), 'S3.T3', 6 * N * D / C,
        '6ND / printed FLOPs = %.3f; FLOPs / 5.76e23 = %.4g (printed %s); D/N = %.1f' % (6 * N * D / C, C / CG, gu, D / N),
        'reproduces' if abs(6 * N * D / C - 1) < .03 and abs((C / CG) / gu_v - 1) < .01 else 'partly')
for r in T['a3']['rows']:
    N = num(r[0])
    for k, (ci, di) in (('A2', (1, 2)), ('A3', (3, 4))):
        C = float(r[ci]); D = num(r[di]); q = 6 * N * D / C
        row('a3_%s_%s' % (k, r[0].replace(' ', '')), 'Table A3, %s, %s: 6ND / FLOPs' % (k, r[0]), '%s FLOPs, %s tokens' % (r[ci], r[di]), 'A4.T3', q,
            '6 × N × D / printed FLOPs; D/N = %.1f' % (D / N), 'reproduces' if abs(q - 1) < .03 else ('does not' if abs(q - 10) < .3 else 'partly'),
            '' if abs(q - 1) < .03 else ('misprint: 6ND = %.3g FLOPs, so the printed exponent is one too small' % (6 * N * D) if abs(q - 10) < .3 else '6ND is %.1f%% off the printed FLOPs, more than the rounding of the tokens allows' % (100 * abs(q - 1))))
# --- the text's claims about Table 3 ---
row('txt_175', 'Text: 175B needs 4.41e24 FLOPs and over 4.2T tokens', '4.41e24, 4.2T', 'S3.SS4', 6 * 175e9 * 4.2e12, '6 × 175e9 × 4.2e12', 'partly',
    'self-consistent, but Table 3 (Approach 1) says 3.85e24 and 3.7T, and Table A3 (Approach 2) 4.54e24 and 4.3T; the text matches neither table')
row('txt_280', 'Text: a 280B model is optimal at about 1e25 FLOPs and 6.8T tokens', '1e25, 6.8T', 'S3.SS4', 6 * 280e9 * 6.8e12, '6 × 280e9 × 6.8e12', 'partly',
    '1.14e25; Table 3 gives 9.90e24 and 5.9T, Table A3 (Approach 2) 1.18e25 and 7.1T. 6.8T is 22.7× Gopher\'s 300B tokens; Table 3\'s 5.9T is 19.7×')
row('txt_250x', 'Text: 1e26 FLOPs is "over 250×" Gopher\'s compute', 'over 250×', 'S3.SS4', 1e26 / CG, '1e26 / 5.76e23', 'does not',
    '174×; Table 3\'s 1T-parameter budget, 1.27e26, is 221× (printed 221.3)')
# --- Kaplan comparison ---
row('kap10', 'Kaplan: 10× compute means 5.5× model, 1.8× data', '5.5×, 1.8×', 'S1', 10 ** 0.73, '10^0.73 and 10^0.27 = %.2f' % 10 ** 0.27, 'partly', 'Kaplan\'s exponents give 5.4× and 1.9×')
row('chin10', 'Chinchilla: 10× compute means about 3.2× model and 3.2× data', 'equal scaling', 'S3.T2', 10 ** 0.5, '10^0.5', 'derived', '')
# Kaplan at 1e21 (Appendix D.4)
row('kap1e21', 'Kaplan\'s optimal size at 1e21 FLOPs', '4.68B', 'A4.SS4', 1.3e9 * (1e21 / 2 / 8.64e19) ** 0.73, '1.3e9 × (C/2 / 8.64e19)^0.73 (Kaplan Table 6, C_min = C/2)', 'reproduces', 'the same reading the Scaling Laws page uses')
a2 = FIT['approach2']
q = [x for x in a2['iso'] if x['C'] == 1e21][0]
row('a1_1e21', 'Approach 1\'s optimal size at 1e21 FLOPs', '2.86B', 'A4.SS4', q['N_opt'], 'parabola minimum of the 1e21 IsoFLOP points read from Figure 4 (fit.py)', 'reproduces' if abs(q['N_opt'] / 2.86e9 - 1) < .05 else 'partly',
    'independently, from Approach 2 on the extracted points: %.2fB' % (q['N_opt'] / 1e9))
row('a2_exp', 'Approach 2 exponents', 'a 0.49, b 0.51', 'S3.T2', a2['a'], 'power law through the parabola minima of the nine budgets (fit.py)', 'reproduces' if abs(a2['a'] - .49) < .03 else 'partly',
    'from the points Besiroglu et al. read off Figure 4, not the paper\'s full data: a = %.3f, b = %.3f; at Gopher\'s budget N = %.1fB on %.2fT tokens' % (a2['a'], a2['b'], a2['N_gopher'] / 1e9, a2['D_gopher'] / 1e12))
# --- results deltas ---
row('mmlu', 'MMLU: Chinchilla minus Gopher', '+7.6', 'S4.T6', 67.6 - 60.0, '67.6 - 60.0', 'reproduces', 'the abstract says 67.5%, Table 6 and §4.2.2 say 67.6%')
a6 = [(float(r[1]), float(r[2])) for r in T['a6']['rows']]
w = sum(1 for c, g in a6 if c > g); s = sum(1 for c, g in a6 if c == g); l = sum(1 for c, g in a6 if c < g)
row('mmlu_tasks', 'MMLU tasks better / same / worse than Gopher', '51 / 2 / 4', 'S4.F6', w, 'count over Table A6\'s 57 rows: %d / %d / %d' % (w, s, l), 'reproduces' if (w, s, l) == (51, 2, 4) else 'partly')
mm = sum(c for c, g in a6) / len(a6)
row('mmlu_mean', 'MMLU average from the 57 task scores', '67.6', 'S4.T6', mm, 'unweighted mean of Table A6', 'reproduces' if abs(mm - 67.6) < .06 else 'partly', 'Gopher %.1f (printed 60.0)' % (sum(g for c, g in a6) / len(a6)))
row('mmlu90', 'MMLU tasks above 90%', '4', 'S4.SS2.SSS2', sum(1 for c, g in a6 if c > 90), 'count over Table A6', 'reproduces' if sum(1 for c, g in a6 if c > 90) == 4 else 'partly')
a7 = [(float(r[1]), float(r[2])) for r in T['a7']['rows']]
row('bb_tasks', 'BIG-bench tasks worse than Gopher', '4 of 62', 'S4.F7', sum(1 for c, g in a7 if c < g), 'count over Table A7', 'reproduces' if sum(1 for c, g in a7 if c < g) == 4 and len(a7) == 62 else 'partly')
bm = sum(c for c, g in a7) / len(a7); bg = sum(g for c, g in a7) / len(a7)
row('bb_mean', 'BIG-bench average from the 62 task scores', '65.1 against 54.4', 'S4.SS2.SSS4', bm, 'unweighted mean of Table A7; Gopher %.1f' % bg, 'reproduces' if abs(bm - 65.1) < .06 and abs(bg - 54.4) < .06 else 'partly', 'Gopher\'s %.1f reproduces the printed 54.4; Chinchilla\'s %.1f is 0.6 below the printed 65.1' % (bg, bm))
row('tqa', 'TruthfulQA 0-shot gain', '14.1', 'S4.SS2.SSS5', 43.6 - 29.5, '43.6 - 29.5', 'reproduces')
row('nq', 'Natural Questions, Gopher 5-shot and 64-shot', 'text 21% and 28%; Table 9 24.5% and 28.2%', 'S4.T9', 24.5, 'Table 9', 'does not', 'the text and the table disagree on Gopher\'s 5-shot score')
row('wg', 'Winogender gains, male / female / neutral', '3.2 / 8.3 / 9.2', 'S4.T10', 71.2 - 68.0, '71.2 - 68.0; 79.6 - 71.3 = %.1f; 84.2 - 75.0 = %.1f' % (79.6 - 71.3, 84.2 - 75.0), 'reproduces')
a5 = [(r[0], float(r[1]), float(r[2]), r[3]) for r in T['a5']['rows']]
row('pile', 'Pile subsets where Chinchilla beats Gopher', 'all', 'S4.F5', sum(1 for r in a5 if r[1] < r[2]), 'count over Table A5 (lower bits per byte is better), of %d' % len(a5), 'reproduces' if all(r[1] < r[2] for r in a5) else 'partly')
jl = [r[0] for r in a5 if r[3] != '-' and float(r[3]) < r[1]]
row('pile_j', 'Pile subsets where Jurassic-1 beats Chinchilla', 'dm_mathematics and ubuntu_irc', 'A8.T5', len(jl), ', '.join(jl), 'reproduces' if sorted(jl) == ['dm_mathematics', 'ubuntu_irc'] else 'partly')
# --- data mix ---
pr = [float(r[3].split('%')[0]) for r in T['a1']['rows']]
row('mix', 'MassiveText sampling proportions sum', '100%', 'A1.T1', sum(pr), 'sum of Table A1', 'reproduces')
# --- Table A4: Appendix F's FLOP count against 6ND ---
# Counted as Appendix F lists it, the ratios come out far above the printed ones for small models (the two vocabulary
# terms dominate); leaving out the embedding and logit terms reproduces five of the six printed ratios.
a4 = []
for r in T['a4']['rows']:
    L_, d, ff, h, kq = [float(x) for x in r[1:6]]; s, V = 2048, 32000
    emb = 2 * s * V * d
    att = 2 * 3 * s * d * (kq * h) + 2 * s * s * (kq * h) + 3 * h * s * s + 2 * s * s * (kq * h) + 2 * s * (kq * h) * d
    dense = 2 * s * (d * ff + d * ff); logits = 2 * s * d * V
    Nparam = num(r[0].replace('M', ' Million').replace('B', ' Billion'))
    full = 3 * (emb + L_ * (att + dense) + logits) / (6 * Nparam * s); body = 3 * L_ * (att + dense) / (6 * Nparam * s)
    a4.append([r[0], float(r[6]), full, body])
    row('a4_' + r[0], 'Table A4, %s: Appendix F FLOPs / 6ND' % r[0], r[6], 'A6.T4', body,
        '3 × forward / (6 N × 2,048), sequence 2,048, vocabulary 32,000, N as printed; layers only (with embeddings and logits as listed: %.2f)' % full,
        'reproduces' if abs(body - float(r[6])) < .0075 else 'partly',
        '' if abs(body - float(r[6])) < .0075 else 'printed %s; nearest variant found gives %.3f' % (r[6], body))
# --- Besiroglu et al. ---
row('b_ci', 'Besiroglu: runs needed for Hoffmann\'s 0.001-wide interval', 'nearly 600,000', 'https://arxiv.org/html/2404.10102v2#S3.SS2', 240 * 50 ** 2,
    '(0.05 / 0.001)² × 240', 'reproduces', 'their text multiplies 240 by 2,116 (46²) instead of 2,500, which would give 508,000; either way hundreds of thousands against about 400')
row('b_round', 'Besiroglu: bias from rounding β to 0.28 at D = 1e11', 'about 13%', 'https://arxiv.org/html/2404.10102v2#S3.SS1', (1e11) ** 0.0049 - 1, '(10^11)^0.0049 - 1', 'reproduces')
row('b_a3', 'Besiroglu Table 3 (outliers kept): a from its own α and β', '0.512', 'https://arxiv.org/html/2404.10102v2#A1.T3', 0.452 / (0.345 + 0.452), '0.452 / (0.345 + 0.452)', 'does not',
    'their printed α and β give 0.567; this page\'s refit with outliers kept agrees (0.565), so the printed 0.512 looks like a copy of the main table\'s value')
f = FIT['fits']
row('b_fit', 'Approach 3 refitted on the 240 extracted points', 'E 1.8172, A 482.01, B 2085.43, α 0.3478, β 0.3658', 'https://arxiv.org/html/2404.10102v2#S3.E3', f['sum']['beta'],
    'fit.py: E %.4f, A %.1f, B %.1f, α %.4f, β %.4f' % (f['sum']['E'], f['sum']['A'], f['sum']['B'], f['sum']['alpha'], f['sum']['beta']), 'partly',
    'E and α match to 3 digits; B and β differ by 3% and 0.4%, along the ridge where B and β trade off (the points are stored here to 6 significant figures)')
row('b_mean', 'The averaging bug, refitted', 'Hoffmann a = 0.454 (unrounded)', 'S3.T2', f['mean']['a_exp'], 'fit.py: same grid, Huber averaged instead of summed, SciPy L-BFGS-B defaults', 'derived',
    'stops early at a = %.3f (this page\'s JS optimiser: 0.450), against %.3f when summed' % (f['mean']['a_exp'], f['sum']['a_exp']))
# --- Sardana et al. examples, with the unrounded constants ---
def sard(Nc, Dinf, c):
    E, A, B, a_, b_ = c; G = (a_ * A / (b_ * B)) ** (1 / (a_ + b_)); aa = b_ / (a_ + b_); bb = 1 - aa
    Dc = (Nc / G) ** (bb / aa) / G; l = E + A / Nc ** a_ + B / Dc ** b_
    def tot(N):
        r = l - E - A / N ** a_
        if r <= 0: return float('inf'), None
        D = (B / r) ** (1 / b_); return 6 * N * D + 2 * N * Dinf, D
    lo, hi = math.log(Nc * .05), math.log(Nc)
    for _ in range(200):
        m1 = lo + (hi - lo) / 3; m2 = hi - (hi - lo) / 3
        if tot(math.exp(m1))[0] < tot(math.exp(m2))[0]: hi = m2
        else: lo = m1
    N = math.exp(lo); Tt, D = tot(N); T0 = 6 * Nc * Dc + 2 * Nc * Dinf
    return N, D / Dc, 1 - Tt / T0, T0 - Tt
U = (1.6934, 406.401, 410.7228, 0.33917084, 0.2849083)
for i, (Nc, Di, pr_) in enumerate(((13e9, 2e12, '7B, saves 1.7e22 FLOPs (17%)'), (7e9, 1e11, '6B on 1.18× the data'), (30e9, 1e13, '13.6B on 2.84× the data, 28% fewer FLOPs'))):
    N, rd, sv, sf = sard(Nc, Di, U)
    row('sard%d' % i, 'Sardana et al.: %.0fB-Chinchilla quality, %.0e inference tokens' % (Nc / 1e9, Di), pr_, 'https://arxiv.org/html/2401.00448v2#S2', N,
        'minimise 6ND + 2N·D_inf at the loss of the Chinchilla-optimal %.0fB (unrounded constants)' % (Nc / 1e9), 'partly',
        '%.1fB on %.2f× the data, saves %.2g FLOPs (%.0f%%); with the rounded constants the answers move by 10 to 40%%' % (N / 1e9, rd, sf, 100 * sv))
# --- tokens per parameter of later models ---
for nm, N, D, src in (('GPT-3 175B', 175e9, 300e9, 'S1.T1'), ('Gopher 280B', 280e9, 300e9, 'S1.T1'), ('Llama 2 7B', 7e9, 2e12, 'https://arxiv.org/html/2307.09288v2#S2.SS1'),
                      ('Llama 3 8B', 8e9, 15e12, 'https://arxiv.org/html/2407.21783v3#S3'), ('Llama 3 405B', 405e9, 15.6e12, 'https://arxiv.org/html/2407.21783v3#S3.SS2.SSS1'),
                      ('Gemma 2 9B', 9e9, 8e12, 'https://arxiv.org/html/2408.00118v3#S3'), ('DeepSeek-V3 (37B active)', 37e9, 14.8e12, 'https://arxiv.org/abs/2412.19437')):
    row('tpp_' + nm.split(' (')[0].replace(' ', '_'), nm + ': tokens per parameter', '%.3g tokens, %.3g parameters' % (D, N), src, D / N, 'D / N', 'derived')

ok = {}
for r in R: ok[r['ok']] = ok.get(r['ok'], 0) + 1
json.dump({'rows': R, 'counts': ok, 'a9': a9, 'a4': a4}, open(os.path.join(HERE, 'inputs', 'recompute.json'), 'w'), indent=1)
for r in R: print('%-26s %-11s %-12.5g %s' % (r['id'], r['ok'], r['v'], r['note'][:110]))
print(ok)
