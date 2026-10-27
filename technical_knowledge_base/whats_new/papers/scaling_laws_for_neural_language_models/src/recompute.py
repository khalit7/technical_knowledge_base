"""Recompute every derived number this page shows from the constants the paper prints.

  python3 recompute.py        (build.sh runs it; writes inputs/recompute.json)

Sources: Kaplan et al. 2020, arXiv HTML v1 (https://arxiv.org/html/2001.08361v1); anchors in brackets.
Chinchilla (Hoffmann et al. 2022, https://arxiv.org/html/2203.15556v1) only where marked.
Each entry: value, the formula, and what the paper prints for it (if anything).
"""
import json, math, os

HERE = os.path.dirname(os.path.abspath(__file__))
PFD = 1e15 * 24 * 3600                       # one PF-day in FLOPs [S1.SS3]
# Table 5 [A1.T5] and Eq. 1.1-1.4 [S1.SS2]
aN, Nc = 0.076, 8.8e13
aD, Dc = 0.095, 5.4e13
aC, Cc = 0.057, 1.6e7
aCm, Ccm = 0.050, 3.1e8
aB, Bs = 0.21, 2.1e8
aS, Sc = 0.76, 2.1e3
# Table 2 [S4.T2]: the joint L(N, D) fit
t2 = dict(aN=0.076, aD=0.103, Nc=6.4e13, Dc=1.8e13)
# Table 6 [A1.T6]: compute-efficient allocation, C_min in PF-days
Ne, pN, Be, pB, Se, pS, De, pD = 1.3e9, 0.73, 2.0e6, 0.24, 5.4e3, 0.03, 2e10, 0.27

R = {}
def put(k, v, how, paper=None, at=None):
    R[k] = dict(v=v, how=how, paper=paper, at=at)

put('pfday', PFD, '1e15 x 24 x 3600', '8.64e19', 'S1.SS3')
put('double_N', 2 ** -aN, '2^-0.076', '0.95', 'S1.SS2')
put('tenx_N', 10 ** -aN, '10^-0.076')
put('tenx_D', 10 ** -aD, '10^-0.095')
put('tenx_C', 10 ** -aCm, '10^-0.050')
put('N_over_D_exp', aN / aD, 'alpha_N / alpha_D with Eq. 1.1-1.2 (0.076 / 0.095)', '0.74', 'S1.SS2')
put('N_over_D_exp_t2', t2['aN'] / t2['aD'], 'alpha_N / alpha_D with Table 2 (0.076 / 0.103)', '0.74', 'S4.T2')
put('eight_x', 8 ** 0.74, '8^0.74: data growth for an 8x bigger model', 'roughly 5x', 'S1.SS1')
# Eq. 1.8 / 6.4 / B.7: alpha_C^min = 1/(1/aS + 1/aB + 1/aN)
acm = 1 / (1 / aS + 1 / aB + 1 / aN)
put('alphaCmin_pred', acm, '1/(1/0.76 + 1/0.21 + 1/0.076)', '0.054 in Eq. 6.4, 0.052 in Eq. B.7 (same formula)', 'S6.E4')
acm77 = 1 / (1 / aS + 1 / aB + 1 / 0.077)
put('alphaCmin_pred_t3', acm77, 'same with Table 3\'s alpha_N = 0.077', None, 'S5.T3')
put('pN_pred', acm / aN, 'alpha_C^min / alpha_N (Eq. 1.7)', '0.71 in Eq. 6.5', 'S6.E5')
put('pN_pred_054', 0.054 / aN, '0.054 / 0.076: what Eq. 6.5 used', '0.71', 'S6.E5')
put('pB_pred', acm / aB, 'alpha_C^min / alpha_B', '0.24 (empirical)', 'S1.SS2')
put('pS_pred', acm / aS, 'alpha_C^min / alpha_S', '0.03 (empirical)', 'S1.SS2')
put('B_L_exp', 1 / aB, '1/alpha_B: B_crit is proportional to L^-4.8', '4.8', 'S6.SS1')
put('pB_from_L', aCm / aB, 'alpha_C^min x 1/alpha_B = 0.050 x 4.76', '0.24', 'S6.SS1')
put('Bcrit_13pct', 1 - 2 ** -aB, '1 - 2^-0.21: loss drop that doubles B_crit', '13%', 'S5.F10')
for L in (2.0, 2.3, 3.0, 4.0):
    put('Bcrit_L%.1f' % L, Bs / L ** (1 / aB), 'B_* / L^(1/0.21), B_* = 2.1e8 tokens', '1-2M tokens at convergence for the largest models' if L == 2.3 else None, 'S5.E3')
put('L_N15B', (Nc / 1.5e9) ** aN, '(8.8e13 / 1.5e9)^0.076: Eq. 1.1 at the largest model')
# Overfitting: Eq. 4.3 with Table 2; what threshold gives D >= 5e3 N^0.74 (Eq. 4.4)
k = t2['aD'] * t2['Nc'] ** (-t2['aN'] / t2['aD']) * t2['Dc']   # small-dL expansion: dL ~ k N^0.74 / D
put('overfit_k', k, 'alpha_D Nc^-(aN/aD) Dc: dL ~ k N^0.74 / D for small dL (Eq. 4.3, Table 2)')
put('overfit_thresh', k / 5e3, 'k / 5e3: the relative penalty Eq. 4.4 tolerates', 'Eq. 4.4 quotes a seed variation of 0.02 in the loss', 'S4.E4')
put('wt2_tokens_ok_N', (2.29e10 / 5e3) ** (1 / 0.74), '(2.29e10/5e3)^(1/0.74): largest N Eq. 4.4 allows on WebText2', 'models smaller than 1e9 train with minimal overfitting', 'S4.SS2')
# Training budget of the standard run [S2.SS2]
std = 2.5e5 * 512 * 1024
put('std_tokens', std, '2.5e5 steps x 512 x 1024 tokens')
put('std_epochs', std / 2.29e10, 'standard run tokens / 2.29e10 WebText2 tokens')
put('warm_frac', 3000 / 2.5e5, '3000 warmup steps / 2.5e5 steps')
put('warm_tokens', 3000 * 512 * 1024, '3000 x 2^19 tokens of warmup')
# Section B.3: converge (f' = 2%) against compute-efficient (f = aN/aS)
f, fp = aN / aS, 0.02
nr = ((1 + f) / (1 + fp)) ** (1 / aN); sr = ((1 + 1 / f) / (1 + 1 / fp)) ** (1 / aS)
put('f_eff', f, 'alpha_N / alpha_S', 'about 10%', 'A2.E5')
put('B12', nr, '((1+f)/(1+f\'))^(1/alpha_N)', '2.7', 'A2.E12')
put('B13', sr, '((1+1/f)/(1+1/f\'))^(1/alpha_S)', '0.13', 'A2.E13')
put('B14', nr * sr, 'B12 x B13', '0.35', 'A2.E14')
put('B13_inv', 1 / sr, '1 / B13', '7.7x fewer parameter updates', 'A2.SS3')
# Section B.4: suboptimal sizes (Eq. B.16, B.17)
def excess(r):   # r = N / N_eff
    return r * (1 + aS / aN * (1 - r ** -aN)) ** (-1 / aS)
def steps(r):
    return (1 + aS / aN * (1 - r ** -aN)) ** (-1 / aS)
put('B16_0.6', excess(0.6), 'Eq. B.16 at N = 0.6 N_eff', '20% more compute', 'A2.E16')
put('B16_2.2', excess(2.2), 'Eq. B.16 at N = 2.2 N_eff', '20% more compute', 'A2.E16')
put('B17_2.2', steps(2.2), 'Eq. B.17 at N = 2.2 N_eff', '45% fewer steps', 'A2.E17')
# Find where excess = 1.2 on each side
def solve(fn, lo, hi, tgt):
    for _ in range(200):
        m = (lo + hi) / 2
        if (fn(m) - tgt) * (fn(lo) - tgt) > 0: lo = m
        else: hi = m
    return (lo + hi) / 2
put('B16_lo', solve(excess, 0.4, 1.0, 1.2), 'Eq. B.16 = 1.2 below N_eff')
put('B16_hi', solve(excess, 1.0, 10, 1.2), 'Eq. B.16 = 1.2 above N_eff')
# Eq. 6.7: data at the critical batch, one epoch: D = 2 C_min / (6 N(C_min))
put('eq67_pref', 2 * PFD / (6 * Ne), '2 x 8.64e19 / (6 x 1.3e9): prefactor of Eq. 6.7 from Table 6\'s N_e', '4e10 tokens in Eq. 6.7; D_e = 2e10 in Table 6', 'S6.E7')
put('eq67_exp', 1 - pN, '1 - 0.73', '0.26 in Eq. 6.7, 0.27 in Table 6', 'S6.E7')
put('eq66_exp', 0.74 * pN, '0.74 x 0.73', '0.54', 'S6.E6')
put('LD_C_exp', aD * (1 - pN), '0.095 x 0.27: L(D(C_min)) exponent', '0.03', 'S6.SS3')
# Eq. 6.8: intersection of L(C_min) and L(D(C_min)) with the printed constants
def cross(pref, ex):
    # (Ccm/C)^aCm = (Dc/(pref C^ex))^aD, solve for ln C
    x = (aCm * math.log(Ccm) - aD * (math.log(Dc) - math.log(pref))) / (aCm - aD * ex)
    C = math.exp(x); return C, (Ccm / C) ** aCm, Ne * C ** pN, pref * C ** ex
for nm, pref, ex in (('printed', 4e10, 0.26), ('table6', 2 * PFD / (6 * Ne), 0.27)):
    C, L, N, D = cross(pref, ex)
    put('cross_%s' % nm, dict(C=C, L=L, N=N, D=D), 'L(C_min) = L(D(C_min)) with D = %.3g C^%.2f' % (pref, ex), 'C* ~ 1e4 PF-days, N* ~ 1e12, D* ~ 1e12, L* ~ 1.7', 'S6.E8')
put('L_at_1e4', (Ccm / 1e4) ** aCm, 'L(C_min) at 1e4 PF-days', '1.7', 'S6.E8')
put('N_at_1e4', Ne * 1e4 ** pN, '1.3e9 x 1e4^0.73', '1e12', 'S6.E8')
# Table 1 / Eq. 2.1 shapes from Figure 5 and section 3.2
for nl, d in ((48, 1600), (6, 4288), (207, 768), (2, 128)):
    put('N_%d_%d' % (nl, d), 12 * nl * d * d, '12 n_layer d_model^2', None, 'S2.E1')
put('ctx_frac_gpt2', 1024 / (12 * 1600), 'n_ctx / (12 d_model) for (48, 1600): attention share of forward FLOPs', None, 'S2.SS1')
put('tok_per_word', 2.29e10 / 1.62e10, '2.29e10 tokens / 1.62e10 words', '1.4 tokens per word', 'S6.SS3')
# Chinchilla comparison (Hoffmann et al. 2022)
def kaplan_N(C_flops):     # Table 6 with C_min = C / 2 (critical batch), as Chinchilla D.4 does
    return Ne * (C_flops / 2 / PFD) ** pN
put('kaplan_N_1e21', kaplan_N(1e21), '1.3e9 x (1e21 / 2 / 8.64e19)^0.73', '4.68 billion (Chinchilla, Appendix D.4)', 'chinchilla:A4.SS4')
for nm, C in (('gpt3', 3.14e23), ('gopher', 5.76e23), ('llama3', 3.8e25)):
    put('kaplan_N_' + nm, kaplan_N(C), 'Table 6 at C_min = C/2')
    put('chin_N_' + nm, math.sqrt(C / 120), 'sqrt(C / (6 x 20)): 20 tokens per parameter')
put('gpt3_C', 6 * 175e9 * 300e9, '6 x 175e9 x 300e9', '3.14e23 (GPT-3, Table D.1)', 'gpt3')
E, A_, B_, al, be = 1.69, 406.4, 410.7, 0.34, 0.28
Lch = lambda N, D: E + A_ / N ** al + B_ / D ** be
G = (al * A_ / (be * B_)) ** (1 / (al + be))
put('chin_a', be / (al + be), 'beta / (alpha + beta), Chinchilla Eq. 4', '0.46', 'chinchilla:S3.SS3')
for nm, C in (('gopher', 5.76e23),):
    Nk = kaplan_N(C); Nc3 = G * (C / 6) ** (be / (al + be))
    put('chin_loss_kaplanN_' + nm, Lch(Nk, C / (6 * Nk)), 'Chinchilla Approach 3 loss at Kaplan\'s N')
    put('chin_loss_chinN_' + nm, Lch(70e9, C / (6 * 70e9)), 'Chinchilla Approach 3 loss at 70B')
    put('chin_loss_gopher', Lch(280e9, 300e9), 'Chinchilla Approach 3 loss at 280B, 300B tokens')
    put('chin_N3_' + nm, Nc3, 'Chinchilla Eq. 4 optimum', '40B', 'chinchilla:S3.F4')
json.dump(R, open(os.path.join(HERE, 'inputs', 'recompute.json'), 'w'), indent=1)
for k_, v in R.items():
    print('%-22s %s   [%s] paper: %s' % (k_, v['v'] if isinstance(v['v'], dict) else '%.4g' % v['v'], v['how'], v['paper']))
