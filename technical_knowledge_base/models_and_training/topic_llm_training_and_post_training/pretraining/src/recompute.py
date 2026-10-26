# Recompute every derived number the Pretraining page shows. Run: python3 recompute.py
# Writes data/recompute.json; the page's parts quote these values.
import json, math
out = {}

# --- Objective: T5 (arXiv 1910.10683v4), GLUE ---
fam = {'BERT-style': 82.96, 'Prefix LM': 80.69, 'Deshuffling': 73.17}           # Table 4
den = {'BERT-style': 82.96, 'MASS-style': 82.32, 'Replace spans': 83.28, 'Drop tokens': 84.44}  # Table 5
rate = {'10%': 82.82, '15%': 83.28, '25%': 83.00, '50%': 81.27}                    # Table 6
span = {'i.i.d.': 83.28, '2': 83.54, '3': 83.49, '5': 83.40, '10': 82.85}          # Table 7
sd = 0.235                                                                           # Table 1 baseline SD
rng = lambda d: round(max(d.values()) - min(d.values()), 2)
out['t5'] = {'family_range': rng(fam), 'denoise_range': rng(den), 'rate_range_10_25': rng({k: v for k, v in rate.items() if k != '50%'}),
             'span_range_2_5': rng({k: v for k, v in span.items() if k in '235'}), 'sd': sd,
             'family_range_sd': round(rng(fam) / sd, 1), 'rate_range_sd': round(rng({k: v for k, v in rate.items() if k != '50%'}) / sd, 1),
             'arch_lm_denoise': 74.70, 'arch_lm_lm': 73.78, 'encdec_denoise': 83.28, 'prefixlm_denoise': 81.82}

# --- Objective counters per 512 tokens (formulas, T5 defaults 15%, mean span 3) ---
n = 512; noise = round(n * 0.15); spans = round(noise / 3)
out['per512'] = {'causal_loss_positions': n, 'mlm_loss_positions': noise,
                 'span_input_len': n - noise + spans + 1, 'span_target_len': noise + spans + 1, 'span_loss_positions': noise + spans + 1}

# --- Scaling ---
out['chinchilla_tpp'] = round(1.4e12 / 70e9, 1)                     # 20
out['llama3_8b_tpp'] = round(15e12 / 8e9)                            # 1,875 (15T, "8B")
out['llama3_8b_tpp_exact'] = round(15e12 / 8.03e9)                   # with 8.03B parameters
out['dwarkesh_ratio'] = round(12.0 / 3.7, 2)                         # 3.24

# --- GPT-3 (Table 2.2; §2.3, Appendix B) ---
g3 = {'Common Crawl': 60, 'WebText2': 22, 'Books1': 8, 'Books2': 8, 'Wikipedia': 3}
out['gpt3'] = {'mix_sum': sum(g3.values()), 'tokens': 300e9, 'cos_end': 260e9, 'warm': 375e6}

# --- OLMo 2 7B (arXiv 2501.00656v3) ---
pt = {'web': 95.2, 'code': 2.1, 'ref': 1.5 + 0.5 + 0.1, 'maths': 0.3 + 0.3}         # Table 10 PT Mix
dol = {'web': 47.2, 'inst': 16.6 + 2.45, 'ref': 5.85 + 7.11, 'maths': 20.8}         # Table 13, 50B
cut = 0.1 + 0.9 * 0.5 * (1 + math.cos(math.pi * 3.90 / 5.0))
out['olmo2'] = {'pt_mix': {k: round(v, 2) for k, v in pt.items()}, 'pt_sum': round(sum(pt.values()), 2),
                'dolmino': {k: round(v, 2) for k, v in dol.items()}, 'dol_sum': round(sum(dol.values()), 2),
                'lr_at_cut_frac': round(cut, 4), 'lr_at_cut': round(3e-4 * cut, 7),
                'warm_tokens': 2000 * 1024 * 4096, 'anneal_share': round(50e9 / (3.90e12 + 50e9) * 100, 2),
                'maths_tokens_pt': round(3.90e12 * 0.006 / 1e9, 1), 'maths_tokens_anneal': round(50e9 * 0.208 / 1e9, 1)}
# Table 11: what the anneal buys, split
t11 = {'ckpt': [69.6, 63.2, 59.8, 28.5], 'ptmix': [74.0, 64.5, 61.8, 27.0], 'new': [75.7, 70.2, 63.1, 46.5]}
names = ['OLMES (MCF)', 'OLMES-Gen', 'MMLU (MCF)', 'GSM*']
split = {}
for i, nm in enumerate(names):
    lr = round(t11['ptmix'][i] - t11['ckpt'][i], 1); dat = round(t11['new'][i] - t11['ptmix'][i], 1)
    split[nm] = {'lr': lr, 'data': dat, 'total': round(lr + dat, 1)}
se = lambda p: math.sqrt(p * (1 - p) / 200) * 100
out['olmo2_t11'] = {'split': split, 'gsm_se_ckpt': round(se(.285), 1), 'gsm_se_new': round(se(.465), 1),
                    'gsm_se_diff_ptmix_ckpt': round(math.hypot(se(.285), se(.27)), 1),
                    'gsm_se_diff_new_ptmix': round(math.hypot(se(.465), se(.27)), 1)}
# Table 9, 7B: before and after mid-training
out['olmo2_t9_7b'] = {'gsm8k': [24.1, 67.5], 'mmlu': [59.8, 63.7], 'avg_gain': 10.6}

# --- SmolLM3 (blog) ---
st = [(8e12, {'web': 85, 'code': 12, 'maths': 3}), (2e12, {'web': 75, 'code': 15, 'maths': 10}), (1.1e12, {'web': 63, 'code': 24, 'maths': 13})]
out['smollm3'] = {'maths_tokens_B': [round(t * m['maths'] / 100 / 1e9) for t, m in st],
                  'maths_total_B': round(sum(t * m['maths'] / 100 for t, m in st) / 1e9),
                  'decay_start_T': round(11.2 * 0.9, 2), 'warm_tokens_B': round(2000 * 2.36e6 / 1e9, 2),
                  'reasoning_mid_B': 35 * 4}

# --- Llama 3 ---
out['llama3'] = {'anneal_405b_share': round(40e6 / 15.6e12 * 100, 6), 'anneal_test_tokens': 40e9}

# --- Speedrun ---
sp = json.load(open('data/speedrun.json'))
rec = [r for r in sp['rows'] if not r['retime']]
out['speedrun'] = {'records': len(rec), 'first_min': rec[0]['min'], 'last_min': rec[-1]['min'], 'last_date': rec[-1]['date'],
                   'speedup': round(rec[0]['min'] / rec[-1]['min'], 1), 'last_seconds': round(rec[-1]['min'] * 60, 1),
                   'end_2025_min': [r['min'] for r in rec if r['date'] <= '2025-12-31'][-1],
                   'muon_step': round((1 - 24.9 / 31.4) * 100, 1), 'tokens_ratio': round(10e9 / 330e6, 1),
                   'rec92_step': round((1 - 0.665 / 1.126) * 100, 1)}
tot = sum(r.get('gain', 0) for r in rec)
out['speedrun']['share'] = {c: round(100 * sum(r.get('gain', 0) for r in rec if r['cat'] == c) / tot, 1)
                            for c in ['arch', 'opt', 'sys', 'attn', 'sched', 'eval', 'mixed']}


# --- Compute and scaling laws (section 3). Constants as the root's Scaling calculator holds them (src/scale), sources:
# Hoffmann et al. 2022 (arXiv 2203.15556) Eq. 10 and its unrounded constants; Besiroglu et al. 2024 (arXiv 2404.10102) refit;
# Kaplan et al. 2020 Table 6 read as Chinchilla Appendix D.4 does (N_opt = 1.3e9 x (C_min / 1 PF-day)^0.73 with C_min = C/2).
FITS = {'hoff': dict(E=1.6934, A=406.401, B=410.7228, al=0.33917084, be=0.2849083),
        'hoffr': dict(E=1.69, A=406.4, B=410.7, al=0.34, be=0.28),
        'besi': dict(E=1.8172, A=482.01, B=2085.43, al=0.3478, be=0.3658)}
PFD = 8.64e19
def loss(f, N, D): return f['E'] + f['A'] / N ** f['al'] + f['B'] / D ** f['be']
def opt(f, C):
    a = f['be'] / (f['al'] + f['be']); G = (f['al'] * f['A'] / (f['be'] * f['B'])) ** (1 / (f['al'] + f['be']))
    N = G * (C / 6) ** a; D = C / 6 / N
    return {'N': N, 'D': D, 'tpp': D / N, 'L': loss(f, N, D), 'a': a}
def kaplan(C): return 1.3e9 * (C / 2 / PFD) ** 0.73
def iso_n(f, L0, k):  # model size whose loss at k tokens per parameter equals L0 (bisection on log N)
    lo, hi = 1e6, 1e15
    for _ in range(200):
        m = math.sqrt(lo * hi)
        lo, hi = (m, hi) if loss(f, m, k * m) > L0 else (lo, m)
    return hi
sc = {'fits': FITS, 'budgets': {}}
for C in (1e21, 5.76e23, 3.8e25):
    sc['budgets']['%.3g' % C] = {k: opt(f, C) for k, f in FITS.items()}
    sc['budgets']['%.3g' % C]['kaplan_N'] = kaplan(C)
fb = FITS['besi']; C0 = 5.76e23; o0 = opt(fb, C0)
gN = 280e9; gD = C0 / 6 / gN
kN = kaplan(C0); kD = C0 / 6 / kN
sc['chin'] = {'C': C0, 'opt': o0, 'chin_L': loss(fb, 70e9, C0 / 6 / 70e9), 'gopher_L': loss(fb, gN, gD), 'gopher_D': gD,
              'kaplan_N': kN, 'kaplan_D': kD, 'kaplan_L': loss(fb, kN, kD),
              'gopher_pen_pct': 100 * (loss(fb, gN, gD) - o0['L']) / o0['L'], 'kaplan_pen_pct': 100 * (loss(fb, kN, kD) - o0['L']) / o0['L']}
C1 = 3.8e25; o1 = opt(fb, C1); lN = 405853388800; lD = 15.6e12
sc['l405'] = {'C': C1, 'opt': o1, 'meta_N': 402e9, 'meta_D': 16.55e12, 'l405_L': loss(fb, lN, lD), 'pen_pct': 100 * (loss(fb, lN, lD) - o1['L']) / o1['L']}
over = {}
for k in (20, 100, 1868, 3642):
    N = iso_n(fb, o0['L'], k); D = k * N; C = 6 * N * D
    over[str(k)] = {'N': N, 'D': D, 'C_ratio': C / C0, 'serve_ratio': N / o0['N'],
                    'breakeven_tokens': (C - C0) / (2 * (o0['N'] - N)) if N < o0['N'] else None}
sc['over'] = over
sc['N_floor'] = (fb['A'] / (o0['L'] - fb['E'])) ** (1 / fb['al'])
sc['six_nd'] = {'l405': 6 * lN * lD, 'smol': 6 * 3075098624 * 11.2e12, 'dsv3_active': 6 * 37e9 * 14.8e12, 'dsv3_total': 6 * 671e9 * 14.8e12,
                'smol_tpp': 11.2e12 / 3075098624, 'smol_vs_chin': 11.2e12 / 3075098624 / 20,
                'smol_mfu': 6 * 3075098624 * 11.2e12 / (384 * 24 * 3600 * 24 * 989.5e12)}
# Sardana et al. 2024 (arXiv 2401.00448), Eq. 3: at the loss of a Chinchilla-optimal model of size Nc, minimise 6ND + 2N*D_inf
# along the iso-loss curve (ternary search on log N). Their examples use Hoffmann et al.'s constants: 'hoff' (unrounded) reproduces them.
def chin_ref(f, Nc):
    a = f['be'] / (f['al'] + f['be']); G = (f['al'] * f['A'] / (f['be'] * f['B'])) ** (1 / (f['al'] + f['be']))
    D = (Nc / G) ** ((1 - a) / a) / G
    return Nc, D, loss(f, Nc, D)
def iso_d(f, L0, N):
    r = L0 - f['E'] - f['A'] / N ** f['al']
    return (f['B'] / r) ** (1 / f['be']) if r > 0 else float('inf')
def sardana(f, Nc, Dinf):
    cN, cD, L0 = chin_ref(f, Nc)
    tot = lambda N: 6 * N * iso_d(f, L0, N) + 2 * N * Dinf
    lo, hi = math.log(Nc * 0.05), math.log(Nc)
    for _ in range(200):
        m1 = lo + (hi - lo) / 3; m2 = hi - (hi - lo) / 3
        if tot(math.exp(m1)) < tot(math.exp(m2)): hi = m2
        else: lo = m1
    N = math.exp(lo); D = iso_d(f, L0, N); T0 = 6 * cN * cD + 2 * cN * Dinf; T = tot(N)
    return {'N': N, 'D': D, 'D_ratio': D / cD, 'chin_N': cN, 'chin_D': cD, 'saving': T0 - T, 'saving_frac': 1 - T / T0}
# their reported answers: 13B quality, 2e12 inference tokens -> 7B, saves 1.7e22 FLOPs (17%); 7B, 1e11 -> 6B on 1.18x the data;
# 30B, 1e13 -> 13.6B on 2.84x the data, 28% fewer FLOPs (section 2). With the rounded constants the answers move by 10 to 40%.
sc['sardana'] = {'%.0fB_%.0e' % (Nc / 1e9, Di): {k: sardana(FITS[k], Nc, Di) for k in ('hoff', 'besi')}
                 for Nc, Di in ((13e9, 2e12), (7e9, 1e11), (30e9, 1e13))}
out['scale'] = sc

json.dump(out, open('data/recompute.json', 'w'), indent=1)
print(json.dumps(out, indent=1))
