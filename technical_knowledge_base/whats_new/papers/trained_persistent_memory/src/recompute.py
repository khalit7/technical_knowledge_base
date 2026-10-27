"""Recompute every derived number the page shows from the paper's printed tables (tables.json), the Flan-T5-XL
config (inputs/flan_t5_xl_config.json), LoCoMo's released data (inputs/locomo_stats.json, from locomo_stats.py) and the
write-rule simulation check (inputs/check_sim.json, from check_sim.py). Writes inputs/recompute.json; build.sh runs it.
usage: python3 recompute.py"""
import json, math, os

HERE = os.path.dirname(os.path.abspath(__file__))
J = lambda p: json.load(open(os.path.join(HERE, p)))
TB = J('tables.json'); CFG = J('inputs/flan_t5_xl_config.json'); LS = J('inputs/locomo_stats.json')
SIM = J('inputs/check_sim.json') if os.path.exists(os.path.join(HERE, 'inputs/check_sim.json')) else None
R = {}
n = TB['t3']['n']; N = sum(n)
R['n_total'] = N
R['share_lag_ge_128'] = (n[3] + n[4]) / N
R['share_lag_ge_256'] = n[4] / N

# ---- Table 3: the Mean column, n-weighted means, isotonic pooling, rankings, standard-error bounds ----
t3 = {}
for sc in ('x1', 'x10'):
    rows = []
    for r in TB['t3'][sc]:
        v = r['v'][:5]; printed = r['v'][5]
        unw = sum(v) / 5; wtd = sum(a * b for a, b in zip(v, n)) / N
        runs = sum(1 for i in range(4) if v[i] == v[i + 1] and v[i] > 0)
        se = [math.sqrt(max(p / 100 * (1 - p / 100), 0) / k) * 100 for p, k in zip(v, n)]
        se_mean = math.sqrt(max(wtd / 100 * (1 - wtd / 100), 0) / N) * 100
        rows.append(dict(m=r['m'], buckets=v, printed_mean=printed, unweighted_mean=round(unw, 3), weighted_mean=round(wtd, 3),
                         mean_matches_unweighted=abs(unw - printed) < 0.011, pooled_pairs=runs,
                         se_upper=[round(x, 2) for x in se], se_upper_weighted_mean=round(se_mean, 2)))
    t3[sc] = rows
R['t3'] = t3
def best(sc, key):
    rs = [r for r in t3[sc] if 'Baseline' not in r['m']]
    return max(rs, key=key)['m']
R['best'] = {sc: dict(printed_mean=best(sc, lambda r: r['printed_mean']), weighted_mean=best(sc, lambda r: r['weighted_mean']),
                      short_lag=best(sc, lambda r: r['buckets'][0]), long_lag=best(sc, lambda r: r['buckets'][4])) for sc in ('x1', 'x10')}

# ---- Table 5: F1 levels implied by Tax and Benefit (baseline mean F1 6.44%) ----
base = TB['t5']['base_f1']; t5 = []
for r in TB['t5']['rows']:
    tx1, b1, tx10, b10 = r['v']
    f0_1, fm_1, f0_10, fm_10 = base - tx1, base + b1, base - tx10, base + b10
    t5.append(dict(m=r['m'], F0_1x=round(f0_1, 2), Fmem_1x=round(fm_1, 2), gain_1x=round(fm_1 - f0_1, 2),
                   F0_10x=round(f0_10, 2), Fmem_10x=round(fm_10, 2), gain_10x=round(fm_10 - f0_10, 2),
                   ratio_of_means_1x=round((fm_1 - f0_1) / (100 - f0_1) * 100, 2), ratio_of_means_10x=round((fm_10 - f0_10) / (100 - f0_10) * 100, 2)))
R['t5'] = t5
R['t5_tax_groups'] = {'delegated (M.1, M.3, M.6)': sorted({r['v'][0] for r in TB['t5']['rows'] if r['m'][:3] in ('M.1', 'M.3', 'M.6')}) + sorted({r['v'][2] for r in TB['t5']['rows'] if r['m'][:3] in ('M.1', 'M.3', 'M.6')}),
                      'explicit (M.2, M.4, M.5)': sorted({r['v'][0] for r in TB['t5']['rows'] if r['m'][:3] in ('M.2', 'M.4', 'M.5')}) + sorted({r['v'][2] for r in TB['t5']['rows'] if r['m'][:3] in ('M.2', 'M.4', 'M.5')})}
b10 = [r['v'][3] for r in TB['t5']['rows']]; taxes = [r['v'][k] for r in TB['t5']['rows'] for k in (0, 2)]
R['t5_ranges'] = dict(benefit_10x=[min(b10), max(b10)], tax=[min(taxes), max(taxes)])

# ---- Table 4: K1 = K30 - dK ----
R['t4'] = [dict(m=r['m'], K30=r['v'][0], dK=r['v'][1], K1=round(r['v'][0] - r['v'][1], 2)) for r in TB['t4']['rows']]
R['t4_best_K30'] = max(R['t4'], key=lambda r: r['K30'])['m']; R['t4_best_dK'] = max(R['t4'], key=lambda r: r['dK'])['m']

# ---- Table 2: parameter counts recounted from Flan-T5-XL's config ----
d = CFG['d_model']; L = CFG['num_decoder_layers']; total = 2849757184  # Hugging Face safetensors count for google/flan-t5-xl
dh1, dh10 = 256, 810
P = {'M.1': d * d, 'M.2': 4 * d * d + L, 'M.3': d * d, 'M.4': 2 * d * dh1, 'M.5': 3 * d * d + d * 2 * d + d, 'M.6': d * d}
R['params'] = {k: dict(count=v, millions=round(v / 1e6, 2), pct_of_backbone=round(v / total * 100, 3)) for k, v in P.items()}
R['params']['M.4_at_10x'] = dict(count=2 * d * dh10, millions=round(2 * d * dh10 / 1e6, 2))
R['backbone'] = dict(d_model=d, layers=L, total=total)
R['dh_ratio'] = round(dh10 ** 2 / dh1 ** 2, 2)
R['bank_bytes'] = dict(x1=64 * d * 4, x10=640 * d * 4, x10_MB=round(640 * d * 4 / 1e6, 2), x10_MiB=round(640 * d * 4 / 2 ** 20, 2))

# ---- decay of the write rules at the paper's gamma ----
g = 0.95
R['decay'] = {str(l): g ** l for l in (1, 20, 31, 32, 64, 128, 256, 395, 600)}
R['window'] = 1 / (1 - g)
R['lag_below_bf16'] = math.ceil(math.log(2 ** -8) / math.log(g))
R['gamma_for_1pct_at_256'] = round(0.01 ** (1 / 256), 4)

# ---- LoCoMo ----
R['locomo'] = {k: LS[k] for k in ('conversations', 'qa_total', 'sessions_min', 'sessions_max', 'turns_min', 'turns_max', 'turns_mean', 'categories', 'last_three_conversations', 'share_all', 'overlap_last20')}

# ---- the paper's own claims, checked ----
x10 = {r['m'][:3]: r for r in t3['x10']}; x1 = {r['m'][:3]: r for r in t3['x1']}
C = []
def claim(text, where, ok, note): C.append(dict(claim=text, where=where, ok=bool(ok), note=note))
claim('The Mean column of Table 3 averages the five buckets', 'Table 3', all(r['mean_matches_unweighted'] for sc in t3 for r in t3[sc]),
      'every printed Mean is the unweighted mean of the five buckets (to rounding), so the 52 questions under lag 64 count for 40% of it although they are 8% of the 639')
claim('M.4 Hebbian leads at 10x with the best mean (11.6%)', '§6.4', R['best']['x10']['printed_mean'].startswith('M.4'),
      'M.3 KV Ext has the best printed mean at 10x (12.05 against 11.60). Weighted by questions per bucket M.4 does lead (10.60 against 10.17), and it has the best long-lag score (10.32); either gap is inside the noise')
claim('M.3 KV Ext achieves the highest short-lag recall at 10x (15.6%)', '§6.4', R['best']['x10']['short_lag'].startswith('M.3'),
      'M.4 Hebbian is higher at 0-31 (15.86 against 15.58)')
claim('M.6 Slot achieves the highest terminal K30 = 9.7%', '§6.5', R['t4_best_K30'].startswith('M.6'),
      'M.2 XAttn (11.04) and M.4 Hebbian (10.62) are higher; M.6 has the highest dK')
claim('1x ordering M.2 > M.6 > M.4 >> M.5 > M.1 ~ M.3 ~ baseline', '§6.4', x1['M.2']['printed_mean'] > x1['M.6']['printed_mean'] > x1['M.4']['printed_mean'] > x1['M.5']['printed_mean'] > x1['M.1']['printed_mean'] >= x1['M.3']['printed_mean'], 'by the printed means')
claim('M.2 and M.6 short-lag recall above 17% at 1x, long-lag about 9% and 7%', '§6.4', x1['M.2']['buckets'][0] > 17 and x1['M.6']['buckets'][0] > 17, '17.85 and 17.21; 9.02 and 7.08')
claim('M.4 nearly flat at about 9.3% at 1x', '§6.4', abs(x1['M.4']['printed_mean'] - 9.3) < 0.1, '9.51 to 9.23')
claim('All six methods positive net benefit at 10x, range +1.8 to 6.3%', '§7.2', min(b10) > 0 and round(min(b10), 1) == 1.8 and round(max(b10), 1) == 6.3, '1.83 to 6.26')
claim('Adapter tax modest, 2 to 4% across all conditions', '§7.2', 2 <= min(taxes) and max(taxes) <= 4.25, 'taxes run 2.38 to 4.23 F1 points: right, rounded. But against a baseline F1 of 6.44 that is a loss of 37% to 66% of what the model answered before')
claim('At most 640 slots, about 5 MB at float32', '§7.4', abs(R['bank_bytes']['x10_MB'] - 5) < 0.3, '640 x 2048 x 4 bytes = %.2f MB (%.2f MiB)' % (R['bank_bytes']['x10_MB'], R['bank_bytes']['x10_MiB']))
claim('M.2 adds about 16.8M parameters (0.6%)', '§4.2, Table 2', abs(R['params']['M.2']['millions'] - 16.8) < 0.05, '4 x 2048^2 + 24 = %d (%.2f%% of 2.85B)' % (P['M.2'], R['params']['M.2']['pct_of_backbone']))
claim('M.3 adds about 4.2M (0.1%)', '§4.3', abs(R['params']['M.3']['millions'] - 4.19) < 0.01, '2048^2 = 4,194,304 (0.15%)')
claim('M.4 adds 1.0M; M.5 21.0M', 'Table 2', abs(R['params']['M.4']['millions'] - 1.05) < 0.01 and abs(R['params']['M.5']['millions'] - 20.97) < 0.01,
      'M.4: 2 x 2048 x 256; M.5: 3 x 2048^2 + 2048 x 4096 + 2048 (no output projection). At 10x, M.4 has 2 x 2048 x 810 = 3.3M')
claim('The 10x Hebbian memory is 10x the capacity of 1x', '§6.4', abs(R['dh_ratio'] - 10) < 0.1, '810^2 / 256^2 = %.2f: d_h was chosen so the matrix has 10x the entries' % R['dh_ratio'])
claim('Methods that succeed at both scales use write mechanisms that are inherently more selective (attention-coupled for M.2)', '§6.4', False,
      'M.2 uses the identical attention-coupled write as M.1, M.3 and M.5 (Table 1, Eqs. 7, 10, 15, 23); only its read differs')
claim('Methods with learned selective writes (M.2, M.4, M.6)', '§7.1', False, 'Sec. 5 says the write-side projections get no gradient and stay at their random initialisation')
claim('Methods with explicit gating (M.5, M.6)', '§7.2', False, 'M.6 has no gate (Eqs. 24 to 30)')
claim('A stateless baseline accumulates dK = 5.6% because more context is injected into the current prompt', '§6.5', False,
      'the equal-input principle (§6.2) gives the baseline only the current turn; K1 = 0 and K30 = 5.57 means the answerable question set changed, not the baseline')
claim('Trained on the public training split of LoCoMo', '§6.2', False,
      'LoCoMo releases 10 conversations as an evaluation benchmark with no training split; the 639 test questions match the last three conversations (conv-48, 49, 50) to within 4 per bucket')
R['claims'] = C
R['claims_ok'] = sum(c['ok'] for c in C); R['claims_n'] = len(C)
if SIM: R['sim'] = dict(worst_rel_diff=SIM['worst_max_rel_diff'], claims=SIM['claims'])
json.dump(R, open(os.path.join(HERE, 'inputs', 'recompute.json'), 'w'), indent=1)
print('recompute: claims ok %d of %d; best at 10x %s' % (R['claims_ok'], R['claims_n'], R['best']['x10']))
