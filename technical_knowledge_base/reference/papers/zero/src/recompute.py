"""Recompute every number of the ZeRO paper that the page reproduces, from the paper's own formulas.

  python3 recompute.py        (build.sh runs it; writes inputs/recompute.json and prints a report)

Units: the paper's GB is 10^9 bytes (16 x 7.5e9 = 120e9 is its 120 GB); Psi is a parameter count; communication
volumes are in elements, as in the paper's Section 7 (multiply by 2 bytes for fp16).
"""
import json, math, os

HERE = os.path.dirname(os.path.abspath(__file__))
TB = json.load(open(os.path.join(HERE, 'tables.json')))
out = {}

# ---- Section 3.1: model states of mixed-precision Adam ----
def states(psi, nd, stage, k=12):
    """Per-device model-state bytes: Figure 1 and Sections 5.1 to 5.3."""
    if stage == 'dp': return (2 + 2 + k) * psi
    if stage == 'os': return 2 * psi + 2 * psi + k * psi / nd
    if stage == 'os_g': return 2 * psi + (2 + k) * psi / nd
    if stage == 'os_g_p': return (2 + 2 + k) * psi / nd
    raise ValueError(stage)

out['gpt2'] = {'fp16_weights_GB': 2 * 1.5e9 / 1e9, 'model_states_GB': 16 * 1.5e9 / 1e9}
out['fig1'] = {s: round(states(7.5e9, 64, s) / 1e9, 2) for s in ('dp', 'os', 'os_g', 'os_g_p')}
out['trillion_dp1024_GB'] = 16e12 / 1024 / 1e9

# ---- Table 1: every cell, with how the printed value was rounded ----
t1 = TB['t1']; cells = []; nmatch = 0; ntrunc = 0
for mi, (mname, psi) in enumerate(zip(t1['models'], t1['psi'])):
    for ri, nd in enumerate(t1['nd']):
        for si, st in enumerate(('os', 'os_g', 'os_g_p')):
            printed = t1['cells'][ri][mi * 3 + si]
            v = states(psi, nd, st) / 1e9
            p = float(printed); dec = len(printed.split('.')[1]) if '.' in printed else 0
            rnd = abs(round(v, dec) - p) < 1e-9 or abs(v - p) < 0.5 * 10 ** -dec + 1e-9
            trunc = abs(math.floor(v * 10 ** dec + 1e-9) / 10 ** dec - p) < 1e-9
            ok = rnd or trunc
            nmatch += ok; ntrunc += (trunc and not rnd)
            cells.append({'model': mname, 'nd': nd, 'stage': st, 'printed': printed, 'computed': round(v, 4),
                          'how': 'rounded' if rnd else ('truncated' if trunc else 'MISMATCH'), 'fits32': v <= 32})
out['t1'] = {'cells': cells, 'match': nmatch, 'n': len(cells), 'truncated': ntrunc}

# bold cells = the smallest DP degree at which each model and stage fits a 32 GB V100 (model states only)
first = {}
for c in cells:
    key = (c['model'], c['stage'])
    if c['fits32'] and key not in first: first[key] = c['nd']
out['t1']['first_fit'] = {'%s|%s' % k: v for k, v in first.items()}
bold = {(b[0], b[1]): b[2] for b in t1['bold']}
out['t1']['bold_is_first_fit'] = all(first.get(k) == v for k, v in bold.items()) and len(bold) == len(first)

# ---- Table 2: max theoretical model size on 32 GB V100s (model states only), Nd = GPUs / MP ----
t2 = TB['t2']; rows = []; ok2 = 0; n2 = 0
for r in t2['rows']:
    mp, gpus = r['mp'], r['gpus']; nd = gpus // mp
    comp = {'baseline': 32e9 / 16 * mp, 'os': 32e9 / (4 + 12 / nd) * mp, 'os_g': 32e9 / (2 + 14 / nd) * mp, 'os_g_p': 32e9 * nd / 16 * mp}
    row = {'mp': mp, 'gpus': gpus, 'nd': nd}
    for k, v in comp.items():
        pv = r[k]; pb = float(pv[:-1]) * (1e12 if pv.endswith('T') else 1e9)
        dec = len(pv[:-1].split('.')[1]) if '.' in pv else 0
        unit = 1e12 if pv.endswith('T') else 1e9
        good = abs(round(v / unit, dec) - pb / unit) < 1e-9 or abs(math.floor(v / unit * 10 ** dec + 1e-9) / 10 ** dec - pb / unit) < 1e-9
        # the paper scales its rounded 64-GPU (MP 1) value by MP: 7.6B x 4 = 30.4B rather than 30.57B
        v1 = {'baseline': 32 / 16, 'os': 32 / (4 + 12 / nd), 'os_g': 32 / (2 + 14 / nd), 'os_g_p': 32 * nd / 16}[k]
        scaled = abs(round(round(v1, 1) * mp, 1) - pb / 1e9) < 1e-6
        how = 'exact' if good else ('rounded 64-GPU value x MP' if scaled else 'MISMATCH')
        row[k] = {'printed': pv, 'computed_B': round(v / 1e9, 3), 'ok': good or scaled, 'how': how}; ok2 += (good or scaled); n2 += 1; nsc = out.setdefault('_t2_scaled', 0); out['_t2_scaled'] = nsc + (scaled and not good)
    row['measured_ratio'] = round(float(r['meas_os'][:-1]) / (comp['os'] / 1e9), 3)
    row['measured_baseline_ratio'] = round(float(r['meas_base'][:-1]) / (comp['baseline'] / 1e9), 3)
    rows.append(row)
out['t2'] = {'rows': rows, 'match': ok2, 'n': n2, 'scaled': out.pop('_t2_scaled')}

# ---- Section 7: communication volume per rank, in units of Psi elements ----
def comm(stage, n, exact=False):
    f = (n - 1) / n if exact else 1
    return {'dp': 2, 'os': 2, 'os_g': 2, 'os_g_p': 3}[stage] * f
out['comm'] = {'dp': 2, 'os_g': 2, 'os_g_p': 3, 'ratio': 1.5, 'exact_ring_n64': round(comm('dp', 64, True), 4)}

# ---- Section 3.2 and footnote 3: activations ----
def act_elems(h, b, s, L): return 12 * h * b * s * L
g = dict(h=1600, b=32, s=1024, L=48)
a = act_elems(**g)
ck = g['h'] * g['b'] * g['s'] * g['L'] * 2  # one fp16 checkpoint (the block input) per layer
one_layer = a * 2 / g['L']
out['act'] = {
    'gpt2_full_GB': round(a * 2 / 1e9, 1),                      # paper: "about 60 GB"
    'gpt2_ckpt_inputs_GB': round(ck / 1e9, 2),                  # checkpoints only
    'gpt2_ckpt_plus_one_layer_GB': round((ck + one_layer) / 1e9, 2),  # plus one layer recomputed
    'gpt2_sqrt_elems_GB': round(math.sqrt(a) * 2 / 1e9, 6),     # literal "square root" reading
    'paper_ckpt_GB': 8,
}
h, L = 8192, 125
ck100 = h * 32 * 1024 * L
out['act100'] = {'elements_e9': round(ck100 / 1e9, 1), 'fp16_GB': round(ck100 * 2 / 1e9, 1), 'fp16_GiB': round(ck100 * 2 / 2 ** 30, 1),
                 'pa16_fp16_GB': round(ck100 * 2 / 16 / 1e9, 2), 'pa16_1byte_GB': round(ck100 / 16 / 1e9, 2),
                 'paper_s32_GB': 60, 'paper_s61_GB': 33, 'paper_s61_pa_GB': 2}
out['buffers'] = {'1.5B_fp32_GB': 1.5e9 * 4 / 1e9, '3B_fp32_GB': 3e9 * 4 / 1e9}
# Section 8: Megatron all-reduces per block: 2 forward + 2 recompute + 2 backward, each 2 x message (s x h per sample)
out['pa_comm'] = {'megatron_per_block': 12, 'pa_extra': 1, 'ratio_pct': round(100 / 12, 1)}

# ---- Section 9: compute gap ----
ratio = 1e12 / 330e6
out['gap'] = {'ratio': round(ratio), 'days_at_3000x': round(67 * 3000 / 60 / 24, 1), 'days_at_exact': round(67 * ratio / 60 / 24, 1)}

# ---- Results arithmetic ----
V100_PEAK = 125  # TFLOPS, fp16 tensor core (NVIDIA V100 whitepaper, the paper's ref [24])
out['results'] = {'aggregate_PF': 400 * 38 / 1000, 'pct_peak_38': round(38 / V100_PEAK * 100, 1), 'pct_peak_5': round(5 / V100_PEAK * 100, 1),
                  'size_vs_20B': round(170 / 20, 1), 'size_vs_40B': round(170 / 40, 2), 'tnlg_pct_peak': round(41.4 / V100_PEAK * 100, 1),
                  'nvswitch_vs_ib': round(300 / 12.5)}

# ---- Model configurations: recount parameters from layers and hidden size ----
V, S = 50257, 1024
def params(L, h, emb=True): return 12 * L * h * h + 13 * L * h + ((V + S) * h if emb else 0)
cf = []
for r in TB['configs']:
    p = params(r['layers'], r['hidden'])
    core = 12 * r['layers'] * r['hidden'] ** 2
    near = min((p, core), key=lambda q: abs(q / 1e9 - r['size_B']))
    cf.append({**r, 'recount_B': round(p / 1e9, 2), 'core_B': round(core / 1e9, 2),
               'off_pct': round(100 * (near / 1e9 - r['size_B']) / r['size_B'], 1), 'nearer': 'with embeddings' if near == p else '12 L h^2 only'})
out['configs'] = cf
t4 = []
for r in TB['t4']:
    for L in r['layers']:
        t4.append({'label': r['label'], 'fig': r['fig'], 'layers': L, 'hidden': r['hidden'], 'recount_B': round(params(L, r['hidden']) / 1e9, 2)})
out['t4'] = t4

# ---- Figure 3 runs (Table 6): model-state memory per GPU with Pos+g at MP 16 ----
psi60 = params(75, 8192)
out['fig3'] = [{'gpus': g_, 'nd': g_ // 16, 'states_GB': round(states(psi60 / 16, g_ // 16, 'os_g') / 1e9, 2), 'batch': b_, 'total': t_}
               for g_, b_, t_ in ((64, 16, 64), (128, 48, 384), (256, 48, 768), (400, 64, 1600))]
# ---- Figure 6 (Table 7 configs): model states per GPU at MP 16, Nd 25 (400 GPUs) ----
out['fig6'] = []
for c, size, L, h_, st in (('C1', 40, 50, 8192, 'os'), ('C2', 60, 132, 6144, 'os'), ('C3', 50, 62, 8192, 'os_g'), ('C4', 140, 175, 8192, 'os_g'), ('C5', 150, 187, 8192, 'os_g')):
    p = params(L, h_)
    out['fig6'].append({'c': c, 'size_B': size, 'recount_B': round(p / 1e9, 1), 'states_GB': round(states(p / 16, 25, st) / 1e9, 1), 'stage': st})

# ---- Then and now: MT-NLG counts 20 bytes per parameter ----
out['mtnlg'] = {'TB_at_20': 530e9 * 20 / 1e12, 'TB_at_16': 530e9 * 16 / 1e12}

json.dump(out, open(os.path.join(HERE, 'inputs', 'recompute.json'), 'w'), indent=1)
if __name__ == '__main__':
    print('Figure 1:', out['fig1'])
    print('Table 1: %d of %d cells reproduce (%d only when truncated); bold = first fit: %s' % (out['t1']['match'], out['t1']['n'], out['t1']['truncated'], out['t1']['bold_is_first_fit']))
    for c in cells:
        if c['how'] != 'rounded': print('   ', c)
    print('Table 2: %d of %d cells (%d via the rounded 64-GPU value times MP)' % (out['t2']['match'], out['t2']['n'], out['t2']['scaled']))
    for r in rows: print('   MP %d: measured/theory Pos %.3f, baseline %.3f' % (r['mp'], r['measured_ratio'], r['measured_baseline_ratio']))
    print('activations:', out['act']); print('100B checkpoints:', out['act100'])
    print('gap:', out['gap']); print('results:', out['results'])
    for r in cf: print('   config', r['fig'], r['size_B'], r['layers'], r['hidden'], '->', r['recount_B'], '(%+.1f%%)' % r['off_pct'])
    for r in t4: print('   table 4', r)
    print('fig3:', out['fig3']); print('fig6:', out['fig6'])
