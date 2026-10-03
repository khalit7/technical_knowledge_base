"""Every derived number on the QLoRA page: memory accounting, double quantisation, Elo arithmetic, and the checks of
the paper's own tables. Stdlib only; build.sh runs it. Writes inputs/recompute.json (read by mk_paper.py into
window.PAPER.rc) and prints each claim with its verdict.
"""
import json, math, os
from statistics import NormalDist

HERE = os.path.dirname(os.path.abspath(__file__))
T = json.load(open(os.path.join(HERE, 'tables.json')))
FIG = json.load(open(os.path.join(HERE, 'inputs', 'fig_points.json')))
R = {'claims': []}


def claim(cid, text, where, paper, ours, verdict, how):
    R['claims'].append({'id': cid, 'text': text, 'where': where, 'paper': paper, 'ours': ours, 'verdict': verdict, 'how': how})


# ---------- LLaMA-1 shapes (config.json of huggyllama/llama-7b, -13b, -30b, -65b; vocabulary 32,000) ----------
LLAMA = {'7B': (4096, 11008, 32), '13B': (5120, 13824, 40), '33B': (6656, 17920, 60), '65B': (8192, 22016, 80)}
V = 32000


def counts(k, r=64):
    h, f, L = LLAMA[k]
    lin = L * (4 * h * h + 3 * h * f)
    other = 2 * V * h + L * 2 * h + h          # input embedding, output head, two RMSNorms per layer, final norm
    lora = L * r * (4 * (h + h) + 3 * (h + f))  # A (r x in) and B (out x r) on all seven linear layers
    return lin, other, lora


R['llama'] = {}
for k in LLAMA:
    lin, other, lora = counts(k)
    R['llama'][k] = {'linear': lin, 'other': other, 'total': lin + other, 'lora_r64_all': lora}
P65 = R['llama']['65B']['total']

# ---------- full 16-bit finetuning, 65B: ">780 GB" (§1) ----------
full12 = P65 * 12 / 1e9   # BF16 weights 2 + BF16 gradients 2 + FP32 Adam moments 8
full16 = P65 * 16 / 1e9   # plus FP32 master weights (mixed precision as ZeRO counts it)
R['full_ft_65B_GB'] = {'12B_per_param': full12, '16B_per_param': full16}
claim('mem780', 'Regular 16-bit finetuning of LLaMA 65B needs more than 780 GB of GPU memory', '§1', '>780 GB',
      '%.0f GB at 12 bytes per parameter (BF16 weights and gradients, FP32 Adam moments); %.0f GB at 16 bytes' % (full12, full16),
      'reproduces (one accounting)', 'parameters %s x bytes; the paper gives no accounting, and 12 bytes is the one that lands just above 780' % format(P65, ','))

# ---------- double quantisation (§3) ----------
dq_before = 32 / 64
dq_after = 8 / 64 + 32 / (64 * 256)
R['dq'] = {'before_bits': dq_before, 'after_bits': dq_after, 'saved_bits': dq_before - dq_after,
           'saved_GB_65B': (dq_before - dq_after) * P65 / 8 / 1e9}
claim('dq127', 'Double quantisation cuts the constants from 0.5 to 0.127 bits per parameter (0.373 saved)', '§3', '0.5 -> 0.127, 0.373',
      '%.4f -> %.4f, saved %.4f' % (dq_before, dq_after, dq_before - dq_after), 'reproduces', '32/64 and 8/64 + 32/(64 x 256)')
claim('dq3gb', 'which saves about 3 GB on a 65B model', '§1', 'about 3 GB',
      '%.2f GB (all %s parameters); %.2f GB counting only the quantised linear weights' % (R['dq']['saved_GB_65B'], format(P65, ','), (dq_before - dq_after) * R['llama']['65B']['linear'] / 8 / 1e9),
      'reproduces', '0.373 bits x parameters / 8')

# ---------- QLoRA memory (Figure 6 labels against a recount) ----------
R['mem'] = {}
f6 = FIG['figure6']
for k in LLAMA:
    lin, other, lora = counts(k)
    base_dq = lin * (4 + dq_after) / 8 + other * 2
    base_nodq = lin * (4 + dq_before) / 8 + other * 2
    R['mem'][k] = {'base_nf4_dq_MB': base_dq / 1e6, 'base_nf4_noDQ_MB': base_nodq / 1e6, 'adapters_MB': lora * 2 / 1e6,
                   'weight_grad_MB': lora * 2 / 1e6, 'adam32_MB': lora * 8 / 1e6,
                   'fig6_model_MB': f6['model_MB'][k], 'fig6_adapters_MB': f6['adapters_MB'][k], 'fig6_optimizer_MB': f6['optimizer_MB'][k],
                   'fig6_total_GB': f6['totals_GB'][k], 'adapters_ratio': f6['adapters_MB'][k] / (lora * 2 / 1e6),
                   'optimizer_over_adapters': f6['optimizer_MB'][k] / f6['adapters_MB'][k]}
claim('f6adapt', 'Figure 6 adapter memory (r = 64 on every linear layer, BF16)', 'Figure 6, App. G', '288 / 450 / 877.5 / 1,440 MB',
      ' / '.join('%.0f' % R['mem'][k]['adapters_MB'] for k in LLAMA) + ' MB by recount',
      'does not reproduce', 'every printed label is exactly 0.90 of the recount (%s); the optimizer label is exactly 4 x the adapter label (8 bytes per parameter for 32-bit Adam against 2 for BF16), so the labels share one count, 10%% below r = 64 on all seven matrices' % ', '.join('%.3f' % R['mem'][k]['adapters_ratio'] for k in LLAMA))
claim('f6model', 'Figure 6 model memory (the 4-bit base)', 'Figure 6, §2', '5,046 / 8,476 / 19,302 / 37,074 MB (and 5,048 MB in §2 for 7B)',
      ' / '.join('%.0f' % R['mem'][k]['base_nf4_dq_MB'] for k in LLAMA) + ' MB for NF4 + DQ weights with 16-bit embeddings, head and norms',
      'does not reproduce', 'the printed values are 1,000 to 1,900 MB above a weights-only recount; the paper does not say what else the bar holds (the CUDA context and buffers are likely), and §2 and Figure 6 differ by 2 MB for the same 7B model')
claim('lora26', 'LoRA weights equal to 0.2% of LLaMA 7B take 26 MB', '§2', '26 MB', '%.1f MB (0.2%% of %s parameters in BF16)' % (0.002 * R['llama']['7B']['total'] * 2 / 1e6, format(R['llama']['7B']['total'], ',')),
      'reproduces', '0.002 x parameters x 2 bytes')
claim('fit48', '65B finetuning fits in under 48 GB', 'Abstract, Figure 6', '<48 GB; Figure 6 total 45.0 GB', '45.0 GB total printed for batch 1, 512 tokens, gradient checkpointing',
      'consistent', 'Figure 6 total; larger batches or longer sequences add activation memory, which paging absorbs')
claim('fit24', '33B trains on a 24 GB consumer GPU (under 12 hours)', 'Abstract, §5.3', '24 GB', 'Figure 6 prints 24.7 GB for 33B, and Appendix G says it "does not quite fit" without paged optimizers',
      'qualified by the paper itself', 'Figure 6 against the abstract')

# ---------- Elo arithmetic (§5.2, Table 7, §6.2) ----------
pw = lambda d: 1 / (1 + 10 ** (-d / 400))
R['elo'] = {'p100': pw(100), 'slope10': 10 * math.log(10) / 1600, 'g65_vs_gpt4_human': pw(1023 - 1176), 'g33_vs_gpt4_human': pw(1009 - 1176)}
claim('elo65', 'An Elo of 1100 against 1000 means an expected win rate of about 65%', '§5.2', 'about 65%', '%.1f%%' % (100 * pw(100)), 'reproduces (rounded up)', '1 / (1 + 10^(-100/400))')
claim('elo15', 'Each 10-point Elo difference is about 1.5% of win rate', 'Table 7 caption', 'about 1.5%', '%.2f%% near even odds, less far from it' % (100 * R['elo']['slope10']), 'reproduces', 'derivative of the logistic at 0: 10 ln 10 / 1600')
claim('elo30', 'Against GPT-4, Guanaco 65B and 33B have an expected win probability of 30% (human Elo)', '§5.3', '30%', '%.1f%% and %.1f%%' % (100 * R['elo']['g65_vs_gpt4_human'], 100 * R['elo']['g33_vs_gpt4_human']), 'reproduces (rounded)', 'Table 7 human column: 1023 and 1009 against 1176')
# "1348 vs 1176 ... an additional 20% probability of winning against an opponent": for which opponents?
opp = [x for x in range(600, 1601) if pw(1348 - x) - pw(1176 - x) >= 0.20]
best = max(range(600, 1601), key=lambda x: pw(1348 - x) - pw(1176 - x))
R['elo']['plus20_range'] = [opp[0], opp[-1]] if opp else None
R['elo']['plus20_max'] = [best, pw(1348 - best) - pw(1176 - best)]
claim('elo20', 'GPT-4 judging itself 1348 against humans 1176 is an additional 20% probability of winning', '§6.2', '20%',
      'at most %.1f%% (against an opponent rated %d); 20%% or more only against opponents rated %d to %d; against ChatGPT (human 916) %.1f%%' % (
          100 * R['elo']['plus20_max'][1], best, opp[0], opp[-1], 100 * (pw(1348 - 916) - pw(1176 - 916))),
      'depends on the opponent', 'difference of two logistic win probabilities')

# ---------- the paper's tables checked against each other ----------
def cell(tid, row, col):
    t = T[tid]
    return t['rows'][[r[0] for r in t['rows']].index(row)][t['cols'].index(col)]

t4 = T['t4']
for r in t4['rows']:
    vals = r[1:9]; m = sum(vals) / 8
    R.setdefault('t4_means', {})[r[0]] = m
claim('t4mean', 'Table 4 mean column (NF4 + DQ 53.1, BFloat16 53.0)', 'Table 4', '53.0 / 52.2 / 53.1',
      ' / '.join('%.2f' % R['t4_means'][r[0]] for r in t4['rows']), 'does not reproduce (NF4 + DQ)',
      'mean of the eight printed cells: NF4 + DQ comes to 52.99, which rounds to 53.0, a hair below BFloat16 (53.04), not above it')
fp4_behind = sum(1 for j in range(1, 9) if t4['rows'][1][j] < t4['rows'][0][j])
R['t4_fp4_behind_cells'] = fp4_behind
gaps = [round(t4['rows'][0][j] - t4['rows'][1][j], 1) for j in range(1, 9) if t4['rows'][1][j] < t4['rows'][0][j]]
claim('t4fp4', 'FP4 is consistently one percentage point behind both', 'Table 4 caption', 'consistently ~1 point',
      'FP4 is below BFloat16 in %d of 8 cells, by %.1f to %.1f points; above it at 13B Alpaca (+0.1) and 65B FLAN v2 (+0.8); mean gap 0.8' % (fp4_behind, min(gaps), max(gaps)),
      'holds on average, not consistently', 'cell by cell')
t3 = T['t3']
R['t3_gap_11b'] = {r[0]: r[6] for r in t3['rows']}
claim('t3_11b', 'Adapter methods replicate full 16-bit finetuning on Super-NaturalInstructions', 'Table 3, §4', 'replicate',
      'at T5-11B every adapter row (60.7 to 60.9) is 1.1 to 1.3 RougeL below full finetuning (62.0), the only size where the gap is outside the spread of the other rows; NF4 + DQ was not run on RoBERTa-large (dash)',
      'holds up to 3B; not at 11B', 'Table 3 cells')
t6 = T['t6']
for r in t6['rows']:
    a, b, m = r[4], r[5], r[6]
    if abs((a + b) / 2 - m) > 0.051:
        R.setdefault('t6_mean_mismatch', []).append(r[0] + ' ' + r[1])
dup = [(x[0] + ' ' + x[1], y[0] + ' ' + y[1]) for i, x in enumerate(t6['rows']) for y in t6['rows'][i + 1:] if x[4:] == y[4:]]
R['t6_duplicates'] = dup
claim('t6dup', 'Table 6: Open Assistant 33B and Vicuna 13B', 'Table 6', '91.2 / 98.7 / 94.9 / 4.5 for both', 'identical in all four score columns',
      'suspect: likely a copy error', 'row comparison; the released files have no Open Assistant ratings to check against')
g7 = cell('t6', 'Guanaco', '7B') if False else None
gu7 = [r for r in t6['rows'] if r[0] == 'Guanaco' and r[1] == '7B'][0][6]
al13 = [r for r in t6['rows'] if r[0] == 'Alpaca' and r[1] == '13B'][0][6]
al7 = [r for r in t6['rows'] if r[0] == 'Alpaca' and r[1] == '7B'][0][6]
claim('g7alp', 'Guanaco 7B (5 GB) beats a 26 GB Alpaca model by more than 20 percentage points', '§1 (and "nearly 20 points" in §5.3)', '>20 points',
      '%.1f points over Alpaca 13B (which Table 6 lists at 10 GB, 4-bit); %.1f over Alpaca 7B (5 GB)' % (gu7 - al13, gu7 - al7),
      'does not reproduce', 'Table 6 means; no 26 GB Alpaca appears in Table 6, and §5.3 itself says "nearly 20"')
claim('g33vic', 'Guanaco 33B is three percentage points better than Vicuna 13B', '§5.3', '3 points', '%.1f points (97.8 against 94.9), with 95%% CIs of 4.4 and 4.5' % (97.8 - 94.9), 'reproduces, inside the noise', 'Table 6')
t1 = T['t1']; t7 = T['t7']
t1d = {r[0]: r[2] for r in t1['rows']}
mism = []
for r in t7['rows']:
    nm = r[0].replace('-', ' ').replace('ChatGPT 3.5 Turbo', 'ChatGPT').replace('Vicuna 13B', 'Vicuna 13B')
    for k, v in t1d.items():
        if k.replace('-', ' ') == nm and v != r[3]: mism.append((k, v, r[3]))
R['t1_t7_mismatch'] = mism
claim('t1t7', 'Table 1 is the GPT-4-judged Vicuna column of Table 7', 'Tables 1 and 7', 'same tournament', 'all ratings agree except ' + '; '.join('%s: %s in Table 1, %s in Table 7' % m for m in mism) + '; Table 1 also lists Guanaco 7B at 6 GB, Tables 6 and 13 at 5 GB',
      'one rating and one size disagree', 'cell by cell')
# Table 12/13 against Table 1: Bard above Guanaco 13B in the direct comparison, below it in Elo
claim('t13', 'Table 13 orders Bard above Guanaco 13B; Table 1 puts Guanaco 13B (916) above Bard (902)', 'Tables 1, 12, 13', 'both', 'Table 12: Bard beats Guanaco 13B by a net 0.12 head to head, yet scores lower Elo, because Elo also counts results against the other systems',
      'not a contradiction, but the caption of Table 1 reads it as one', 'Table 12 cell')
# Table 10 and 11 means
t10 = T['t10']
for r in t10['rows']:
    R.setdefault('t10_means', {})[r[0]] = sum(r[1:5]) / 4
t11 = T['t11']
R['t11_row_means'] = {r[0]: sum(r[1:10]) / 9 for r in t11['rows'] if r[0] != 'Mean'}
claim('t11', 'Table 11 means (39.28, 39.16, 40.02)', 'Table 11', '39.28 / 39.16 / 40.02', ' / '.join('%.2f' % v for v in R['t11_row_means'].values()), 'reproduces', 'mean of the nine printed cells per row')
# Table 8: CrowS-Pairs averages: LLaMA, GPT-3, OPT columns are weighted by category size (from the LLaMA paper); is Guanaco's?
crows_n = {'Gender': 262, 'Religion': 105, 'Race/Color': 516, 'Sexual orientation': 84, 'Age': 87, 'Nationality': 159, 'Disability': 60, 'Physical appearance': 63, 'Socioeconomic status': 172}
t8 = T['t8']
R['t8'] = {}
for j, col in enumerate(t8['cols'][1:], start=1):
    rows = [r for r in t8['rows'] if r[0] != 'Average']
    simple = sum(r[j] for r in rows) / len(rows)
    w = sum(r[j] * crows_n[r[0]] for r in rows) / sum(crows_n[r[0]] for r in rows)
    R['t8'][col] = {'simple': simple, 'weighted': w, 'printed': [r for r in t8['rows'] if r[0] == 'Average'][0][j]}
claim('t8avg', 'Table 8 averages', 'Table 8', '66.6 / 67.2 / 69.5 / 43.5',
      '; '.join('%s: simple %.1f, weighted %.1f' % (k, v['simple'], v['weighted']) for k, v in R['t8'].items()),
      'mixed averaging', 'the three baseline columns match the category-size-weighted average (sizes from Nangia et al. 2020), Guanaco matches the simple average; the weighted Guanaco figure is in the table')

# ---------- NF4 (Appendix E) ----------
from dtypes import nf4_code, APPENDIX_E
nf = nf4_code()
R['nf4'] = {'code': nf, 'maxdiff_appendix_e': max(abs(a - b) for a, b in zip(nf, APPENDIX_E)), 'offset_guess': 1 - (1 / 64 + 1 / 60)}
claim('nf4e', 'The NF4 values of Appendix E', 'Appendix E, Eq. 4', '16 values', 'reproduced to %.1e by bitsandbytes\' create_normal_map (quantiles at even steps from 0.5 to 0.9677083, 8 positive, 7 negative, one zero); Eq. 4 as printed averages neighbouring quantiles and cannot produce them (its end terms are the quantiles at 0 and 1, which are infinite)' % R['nf4']['maxdiff_appendix_e'],
      'reproduces from the code, not from Eq. 4', 'dtypes.py; 0.9677083 equals 1 - (1/64 + 1/60) to the seven printed digits, the mean of 1 - 1/32 and 1 - 1/30 (our observation, not stated by the authors)')

json.dump(R, open(os.path.join(HERE, 'inputs', 'recompute.json'), 'w'), indent=1)
if __name__ == '__main__':
    for c in R['claims']:
        print('%-8s %-34s %s' % (c['id'], c['verdict'], c['ours'][:150]))
