"""Recompute every derived number the page shows from the paper's printed values (tables.json) and write
inputs/recompute.json, printing each check with its verdict. usage: python3 recompute.py"""
import json, math
T = json.load(open('tables.json'))
f = lambda s: None if s in ('-', '') else float(s.replace(',', ''))
R, checks = {}, []
def chk(name, ours, paper, ok, how, where):
    checks.append({'name': name, 'ours': ours, 'paper': paper, 'ok': ok, 'how': how, 'at': where}); print(('OK  ' if ok else ('..  ' if ok is None else 'XX  ')) + name, ours, '|', paper)

# --- Eq. 12: TPS = TPF / t_fwd
tps = 19.74 / 13.56e-3
chk('Throughput from Eq. 12', '%.0f TPS' % tps, '1456 TPS', round(tps) == 1456, 'TPF 19.74 / t_fwd 13.56 ms', 'S6.E12')
chk('Speed-up over Gemma 4 AR', '%.2f x' % (tps / 204), '7.1x', round(tps / 204, 1) == 7.1, '1,456 / 204 TPS', 'S6')
chk('Speed-up over Gemma 4 AR with MTP', '%.2f x' % (tps / 303), '4.8x', round(tps / 303, 1) == 4.8, '1,456 / 303 TPS', 'S6')
chk('Table 3 speed against MTP', '%.2f x' % (1479 / 303), '"nearly 5x" (Section 7)', 1479 / 303 < 5, '1,479 / 303 TPS', 'S7')
tf = 19.74 / 1479 * 1000
chk('Per-step time implied by Table 3', '%.2f ms' % tf, '13.56 ms (Section 6)', abs(tf - 13.56) < 0.3, '19.74 / 1,479 TPS; Table 3 averages per benchmark, Section 6 uses a 4,096-token prompt', 'S7.T3')
R['tps_eq12'] = round(tps); R['tps_t3'] = 1479; R['tfwd_t3'] = round(tf, 2)
# --- Figure 11
F = T['f11']; ar_other = round(F['tot_ar'] - sum(F['ar'][:6]), 2); dg_other = round(F['tot_dg'] - sum(F['dg'][:6]), 2)
F['ar'][6] = ar_other; F['dg'][6] = dg_other
for i, op in enumerate(F['ops'][:6]):
    r = F['dg'][i] / F['ar'][i]
    chk('Figure 11 ratio, ' + op, '%.2f x' % r, F['ratio'][i] + 'x', abs(r - float(F['ratio'][i])) < 0.051, '%.2f / %.2f ms' % (F['dg'][i], F['ar'][i]), 'S6.F11')
chk('Figure 11 ratio, Other (derived segments)', '%.2f / %.2f ms = %.1f x' % (dg_other, ar_other, dg_other / ar_other), '2.1x', abs(dg_other / ar_other - 2.1) < 0.3, 'totals minus printed segments; the unprinted Other values are derived', 'S6.F11')
chk('Figure 11 total ratio', '%.2f x' % (F['tot_dg'] / F['tot_ar']), '3.2x', abs(F['tot_dg'] / F['tot_ar'] - 3.2) < 0.06, '12.63 / 4.01 ms (the printed labels are themselves rounded)', 'S6.F11')
chk('Text: "other operations are at most 2x slower"', 'Other is %.1fx' % (dg_other / ar_other), 'Figure 11 prints Other x2.1', False, 'the text and the figure differ by a rounding; the figure prints 2.1x', 'S6')
chk('Text: attention "4x slower"', '%.2f x' % (1.84 / 0.45), 'Figure 11 prints x4.1', True, 'same number rounded', 'S6')
R['f11'] = F
# end-to-end overhead
chk('AR end-to-end time per token', '%.2f ms' % (1000 / 204), '4.01 ms GPU + about 1 ms CPU (Section 6)', abs(1000 / 204 - 4.01 - 1) < 0.2, '1,000 / 204 TPS', 'S6')
chk('DiffusionGemma end-to-end time per step', '%.2f ms' % (13.56 - 12.63), 'about 1 ms of CPU overhead', abs(13.56 - 12.63 - 1) < 0.2, '13.56 - 12.63 ms', 'S6')
mtp = 1.40 / 303 * 1000
chk('Gemma 4 MTP: time per forward pass implied', '%.2f ms' % mtp, 'faster than one plain AR step (4.90 ms end to end)', False,
    '1.40 TPF / 303 TPS; a verify pass of 5 tokens plus the drafter cannot be cheaper than a 1-token step on the same setup; Table 3 says MTP TPS and TPF were measured on SPEED-Bench, not on the 7 benchmarks', 'S7.T3')
R['mtp_ms'] = round(mtp, 2)
# --- MoE experts
exp_unique = 128 * (1 - (1 - 8 / 128) ** 256)
chk('Unique experts per 256-token canvas if routing were independent and uniform', '%.2f of 128' % exp_unique, '84 measured on PG-19', None, '128 x (1 - (120/128)^256)', 'S6')
R['exp_unique'] = exp_unique
R['moe_ratio_experts'] = 84 / 8; R['moe_ratio_time'] = 4.66 / 1.08
# --- Table 4
rows = T['t4']['rows']
def col(i, think=True): return [f(r['v'][2 * i + (0 if think else 1)]) for r in rows]
dns_t, dns_n = col(3), col(3, False)
R['dns_mean_think'] = sum(dns_t) / len(dns_t); R['dns_mean_nothink'] = sum(dns_n) / len(dns_n)
chk('Mean effective denoising steps, Table 4, thinking', '%.1f' % R['dns_mean_think'], '"approximately 12" (Section 3.3)', abs(R['dns_mean_think'] - 12) < 1.5, 'mean of 15 benchmarks', 'S7.T4')
chk('Mean effective denoising steps, Table 4, no-think', '%.1f' % R['dns_mean_nothink'], '"approximately 12"', abs(R['dns_mean_nothink'] - 12) < 1.5, 'mean of 15 benchmarks', 'S7.T4')
# TPS = tokens / E2E per benchmark; TPF vs tokens/forwards
t4 = []
for r in rows:
    v = [f(x) for x in r['v']]
    sc, tpf, tps_, dns, fw, tok, e2e = v[0::2]
    ms = tpf / tps_ * 1000
    pred = 256 / (dns + 1)  # Eq. 10 for full canvases: 256K / (K*DNS + K - 1) -> 256 / (DNS + 1) as K grows
    t4.append(dict(b=r['b'], tok_over_e2e=tok / e2e, tps=tps_, ms_per_fwd=ms, tok_over_fw=tok / fw, tpf=tpf, dns=dns, tpf_from_dns=pred))
R['t4'] = t4
dev = max(abs(x['tok_over_e2e'] / x['tps'] - 1) for x in t4)
chk('Table 4: Total Tokens / E2E Time equals TPS', 'within %.1f%% on all 15' % (100 * dev), 'TPS column', dev < 0.06, 'per benchmark, think', 'S7.T4')
lo = min(x['ms_per_fwd'] for x in t4); hi = max(x['ms_per_fwd'] for x in t4)
R['ms_range'] = [lo, hi]
chk('Table 4: implied time per forward pass, TPF / TPS', '%.1f to %.1f ms' % (lo, hi), '13.56 ms at a 4,096-token prompt', None, 'varies with context length, as Section 6 says', 'S7.T4')
r_ = [x['tok_over_fw'] / x['tpf'] for x in t4]
chk('Table 4: Total Tokens / Total Forwards against TPF', '%.2f to %.2f of TPF' % (min(r_), max(r_)), 'TPF column', False,
    'ratio of averages is below the printed TPF on every benchmark: TPF is presumably averaged per sample (an average of ratios), which the paper does not say', 'S7.T4')
R['tokfw_ratio'] = [min(r_), max(r_)]
# --- forwards against the AR baseline
t3 = {r['b']: r['v'] for r in T['t3']['rows']}
dg_fw = f(t3['Average Total Tokens'][0]) / f(t3['Tokens Per Forward (TPF)'][0])
g_fw = f(t3['Average Total Tokens'][4]) / f(t3['Tokens Per Forward (TPF)'][4])
chk('Forward passes, DiffusionGemma against Gemma 4 AR (MTP)', '%.0f against %.0f = %.1f%%' % (dg_fw, g_fw, 100 * dg_fw / g_fw), '"less than 5%"', dg_fw / g_fw < 0.05, 'Average Total Tokens / TPF, Table 3', 'S5')
chk('Forward passes against plain AR decoding of the same answers', '%.1f%%' % (100 * dg_fw / f(t3['Average Total Tokens'][4])), '"less than 5%"', None, '203 / 7,207', 'S5')
R['fw'] = [dg_fw, g_fw]
chk('Answer length against Gemma 4', '%.2f' % (4001 / 7207), '"concise" (Section 5; the 2x is against the SFT checkpoint)', None, '4,001 / 7,207 tokens', 'S7.T3')
# --- quality
bench = [r for r in T['t3']['rows'] if r['b'] not in ('Output Speed (TPS)', 'Tokens Per Forward (TPF)', 'Average Total Tokens', 'Codeforces ELO')]
gaps = [(r['b'], f(r['v'][0]) - f(r['v'][4])) for r in bench if f(r['v'][0]) is not None and f(r['v'][4]) is not None]
R['gaps'] = gaps; R['gap_mean'] = sum(g for _, g in gaps) / len(gaps)
between = [r['b'] for r in bench if None not in (f(r['v'][0]), f(r['v'][2]), f(r['v'][4])) and not (min(f(r['v'][0]), f(r['v'][4])) <= f(r['v'][2]) <= max(f(r['v'][0]), f(r['v'][4])))]
chk('AR mode between TD and Gemma 4 (thinking)', '%d of %d benchmarks; exceptions: %s' % (len(bench) - len(between), len(bench), ', '.join(between) or 'none'), '"squarely between" (Section 3.5)', len(between) <= 1, 'Table 3 columns 1, 3, 5', 'S7.T3')
between_n = [r['b'] for r in bench if None not in (f(r['v'][1]), f(r['v'][3]), f(r['v'][5])) and not (min(f(r['v'][1]), f(r['v'][5])) <= f(r['v'][3]) <= max(f(r['v'][1]), f(r['v'][5])))]
chk('AR mode between TD and Gemma 4 (no-think)', '%d of %d; exceptions: %s' % (len(bench) - len(between_n), len(bench), ', '.join(between_n) or 'none'), '"squarely between"', len(between_n) <= 2, 'Table 3 columns 2, 4, 6', 'S7.T3')
R['between_x'] = between; R['between_nx'] = between_n
# noise: binomial standard errors on benchmarks of known size
SIZES = {'GPQA Diamond': 198, 'GSM8K': 1319, 'HumanEval': 164, 'IFEval': 541, 'AIME 2026': 30}
se = []
for b, n in SIZES.items():
    v = t3[b]; a, g = f(v[0]) / 100, f(v[4]) / 100
    s = math.sqrt(a * (1 - a) / n + g * (1 - g) / n) * 100
    se.append(dict(b=b, n=n, td=f(v[0]), base=f(v[4]), gap=round(100 * (g - a), 1), se=round(s, 1), z=round((g - a) * 100 / s, 1)))
R['se'] = se
for x in se: print('   noise', x)
# --- other ratios
chk('Against Mercury 2 (OpenRouter estimate)', '%.2f x' % (1479 / 600), '"roughly 2.5x"', abs(1479 / 600 - 2.5) < 0.1, '1,479 / 600 TPS', 'S7')
chk('Against Mercury 2 at its own reported speed', '%.2f x' % (1479 / 1000), 'Inception reports about 1,000 TPS on Blackwell (Appendix E)', None, '1,479 / 1,000', 'A5')
chk('Against LLaDA 2.1 Flash', '%.2f x' % (1479 / 375), '"roughly 4x" (Notion page)', abs(1479 / 375 - 4) < 0.2, '1,479 / 375 TPS; LLaDA on 8 x B200 in bfloat16', 'S7.T3')
# Figure 12: extrapolate the printed total-throughput ratio
tot = [float(x) for x in T['f12']['total']]
per_doubling = [tot[i + 1] / tot[i] for i in range(4)]
g = math.exp(sum(math.log(x) for x in per_doubling[1:]) / 3)
c_par = 16 * 2 ** (math.log(1 / tot[-1]) / math.log(g))
R['f12_per_doubling'] = per_doubling; R['f12_g'] = g; R['f12_cpar'] = c_par
chk('Figure 12 crossover', 'measured points stop at c = 16 (ratio 1.35); the ratio falls by x%.2f per doubling, which reaches 1.0 at c = %.0f' % (g, c_par), '"around 32 concurrent requests"', 24 < c_par < 40, 'geometric mean of the last three per-doubling ratios of the printed labels; an extrapolation, not a measurement', 'S6.F12')
chk('Figure 12 at c = 1 against the headline', '4.11 x at 16 TPF on PG-19', '4.8 x at 19.74 TPF (Section 6)', None, 'different task and TPF; 4.8 x 16 / 19.74 = %.2f' % (4.8 * 16 / 19.74), 'S6.F12')
# Sudoku and PubMedQA; Table 7 caption
chk('Sudoku steps', '%.1f x fewer' % (40.65 / 10.72), '40.65 to 10.72 (Table 5)', True, '', 'S8.T5')
chk('PubMedQA steps after finetuning', '18.09 to 31.57 (up %.0f%%)' % (100 * (31.57 / 18.09 - 1)), 'not discussed', None, 'finetuning does not always cut steps', 'A3.T6')
chk('Table 7 caption: "Both LoRA recipes ... train for 2,000 steps"', 'Sudoku (LoRA) row says 8,000', 'caption 2,000', False, 'the caption and the table disagree', 'A3.T7')
R['checks'] = checks
json.dump(R, open('inputs/recompute.json', 'w'), indent=1)
print(len(checks), 'checks,', sum(c['ok'] is True for c in checks), 'agree,', sum(c['ok'] is False for c in checks), 'do not,', sum(c['ok'] is None for c in checks), 'context')
