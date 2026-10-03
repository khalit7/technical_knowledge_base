"""Recompute every derived number the page shows; writes inputs/recompute.json (build.sh runs it first).

Sources: tables.json (the paper's tables), inputs/mamba_configs.json and inputs/hybrid_configs.json (released
configurations), inputs/eval_sizes.json (benchmark split sizes), inputs/later_extracts.txt (later papers' numbers).
"""
import json, math, os

HERE = os.path.dirname(os.path.abspath(__file__))
T = json.load(open(os.path.join(HERE, 'tables.json')))
MC = json.load(open(os.path.join(HERE, 'inputs', 'mamba_configs.json')))['configs']
HC = json.load(open(os.path.join(HERE, 'inputs', 'hybrid_configs.json')))['configs']
EV = json.load(open(os.path.join(HERE, 'inputs', 'eval_sizes.json')))
R = {}
f = lambda v: None if v is None else float(v)

# ---- Table 3: averages, bold marks, "best in class", "twice the size", gaps to Pythia with noise
t3 = T['t3']; cols = t3['cols']; rows = t3['rows']
acc_idx = [2, 3, 4, 5, 6, 7]
avg_ok = []
for r in rows:
    a = sum(f(r['v'][i]) for i in acc_idx) / 6
    avg_ok.append([r['model'], round(a, 2), r['v'][8], abs(round(a, 1) - f(r['v'][8])) < 0.051])
R['t3_avg_check'] = avg_ok
best = []
for b in sorted({r['bucket'] for r in rows}):
    grp = [r for r in rows if r['bucket'] == b]
    mam = [r for r in grp if r['model'].startswith('Mamba')]
    if not mam: continue
    m = mam[0]
    for ci, c in enumerate(cols):
        vals = [(f(r['v'][ci]), r['model']) for r in grp if r['v'][ci] is not None]
        lower = 'ppl' in c
        top = min(v for v, _ in vals) if lower else max(v for v, _ in vals)
        best.append(dict(bucket=b, col=c, mamba=f(m['v'][ci]), best=top, mamba_best=f(m['v'][ci]) == top,
                         tie=[n for v, n in vals if v == top and not n.startswith('Mamba')]))
R['t3_best'] = dict(cells=len(best), mamba_best=sum(x['mamba_best'] for x in best), ties=[x for x in best if x['tie']])
pyth = {130: 'Pythia-160M', 370: 'Pythia-410M', 1000: 'Pythia-1B', 1400: 'Pythia-1.4B', 2800: 'Pythia-2.8B', 7000: 'Pythia-6.9B'}
byname = {r['model']: r for r in rows}
mam = ['Mamba-130M', 'Mamba-370M', 'Mamba-790M', 'Mamba-1.4B', 'Mamba-2.8B']
twice = []
for mm, (b, b2) in zip(mam, [(130, 370), (370, 1000), (1000, 1400), (1400, 2800), (2800, 7000)]):
    a = f(byname[mm]['v'][8]); p2 = f(byname[pyth[b2]]['v'][8])
    twice.append(dict(mamba=mm, avg=a, pythia_next=pyth[b2], pythia_next_avg=p2, matches=a >= p2, diff=round(a - p2, 1)))
R['t3_twice'] = twice
gap = []
for mm, b in zip(mam, [130, 370, 1000, 1400, 2800]):
    p = byname[pyth[b]]
    gap.append(dict(mamba=mm, pythia=pyth[b], avg=round(f(byname[mm]['v'][8]) - f(p['v'][8]), 1)))
R['t3_gap_vs_pythia'] = gap
# binomial standard error of an accuracy difference between two models on the same split, treated as independent
# (an upper bound: both models answer the same questions, so the paired error is smaller)
se = []
m, p = byname['Mamba-2.8B'], byname['Pythia-2.8B']
for ci in acc_idx[:6]:
    c = cols[ci]; n = EV[c]['n']; a, b = f(m['v'][ci]) / 100, f(p['v'][ci]) / 100
    s = math.sqrt(a * (1 - a) / n + b * (1 - b) / n) * 100
    se.append(dict(task=c, n=n, mamba=f(m['v'][ci]), pythia=f(p['v'][ci]), diff=round(f(m['v'][ci]) - f(p['v'][ci]), 1), se=round(s, 2), z=round((f(m['v'][ci]) - f(p['v'][ci])) / s, 1)))
R['t3_noise_28'] = se
R['t3_vs_pythia7b'] = dict(mamba28=f(m['v'][8]), pythia69=f(byname['Pythia-6.9B']['v'][8]))
R['t3_vs_pythia3b'] = round(f(m['v'][8]) - f(p['v'][8]), 1)

# ---- Table 1 (selective copying) and Table 11 (induction heads)
t1 = T['t1']['rows']
lti = [r[3] for r in t1 if r[2] in ('S4', 'Hyena')]
R['t1_lti_range'] = [min(lti), max(lti)]
R['t1_s6'] = [r[3] for r in t1 if r[2] == 'S6']
R['t11_extrap_factor'] = 2 ** 20 // 2 ** 8
R['ih_steps'] = dict(e25=8192 * 25, e50=8192 * 50, e10=8192 * 10)

# ---- ablations: Tables 6, 7, 9, 10
t6 = {(r[0], r[1]): r[2] for r in T['t6']['rows']}
R['t6'] = dict(mamba_s6_vs_s4real=round(t6[('Mamba', 'S4 (real)')] - t6[('Mamba', 'S6')], 2), h3_s6_vs_s4real=round(t6[('H3', 'S4 (real)')] - t6[('H3', 'S6')], 2),
               lti_spread_mamba=round(max(v for (a, l), v in t6.items() if a == 'Mamba' and l != 'S6') - min(v for (a, l), v in t6.items() if a == 'Mamba' and l != 'S6'), 2))
t7 = T['t7']['rows']; base = t7[0][3]
R['t7'] = [dict(sel=''.join('DBC'[i] for i in range(3) if r[i]) or 'none', ppl=r[3], gain=round(base - r[3], 2)) for r in t7]
t10 = T['t10']
R['t10'] = dict(params_pct=round((t10['sel'][-1][1] / t10['sel'][0][1] - 1) * 100, 2), gain_sel=round(t10['sel'][0][2] - t10['sel'][-1][2], 2),
                gain_const=round(t10['const'][0][2] - t10['const'][-1][2], 2))
t9 = T['t9']['rows']
R['t9'] = dict(gain_1=round(t9[0][2] - t9[1][2], 2), gain_64=round(t9[0][2] - t9[-1][2], 2), params_pct_64=round((t9[-1][1] / t9[0][1] - 1) * 100, 2))

# ---- Table 13 (great apes): Mamba 1.4M minus HyenaDNA 1.4M at each length (the sign changes)
h, m14, m7 = [r[2] for r in T['t13']['rows']]
R['t13_diff'] = [round(a - b, 2) for a, b in zip(m14, h)]
R['t13_m7_minus_h'] = [round(a - b, 2) for a, b in zip(m7, h)]

# ---- Table 15 (memory): Mamba over Transformer
R['t15'] = [dict(bs=r[0], tf=r[1], mamba=r[2], more_pct=round((r[2] / r[1] - 1) * 100, 1)) for r in T['t15']['rows']]

# ---- Table 14 and the audio note: 60 s at 16 kHz; 468 x 2048
R['audio'] = dict(minute=60 * 16000, longest=468 * 2048, tokens=[r[0] * r[1] for r in T['t14']['rows']])
R['dna_batch'] = dict(at20=2 ** 24 // 2 ** 20, at10=2 ** 24 // 2 ** 10)


# ---- parameter recount of the released checkpoints from their configs (mamba_simple.py shapes)
def mamba_block(d, N=16, E=2, K=4):
    di = E * d; r = math.ceil(d / 16)
    parts = dict(in_proj=d * 2 * di, conv=di * K + di, x_proj=di * (r + 2 * N), dt_proj=r * di + di, A_log=di * N, D=di, out_proj=di * d, norm=d)
    return parts


rec = []
for name, c in MC.items():
    d, L = c['d_model'], c['n_layer']; V = c['vocab_size']; m8 = c['pad_vocab_size_multiple']
    Vp = V + (m8 - V % m8) % m8
    blk = mamba_block(d); per = sum(blk.values())
    tot = L * per + Vp * d + d   # tied embedding and LM head (one matrix), final norm
    proj = 3 * 2 * d * d          # 3 E D^2 with E = 2
    rec.append(dict(name=name.split('/')[-1], d=d, layers=L, vocab_padded=Vp, per_block=per, proj_share=round(proj / per * 100, 1),
                    blocks=L * per, emb=Vp * d, total=tot, total_m=round(tot / 1e6, 1)))
R['param_recount'] = rec
d = 2560; blk = mamba_block(d)
R['twelve_d2'] = dict(d=d, two_blocks=2 * sum(blk.values()), twelve_d2=12 * d * d, ratio=round(2 * sum(blk.values()) / (12 * d * d), 4),
                      ssm_extra_pct=round((sum(blk.values()) - 6 * d * d - d) / sum(blk.values()) * 100, 1))


# ---- inference memory: KV cache against recurrent state, Pythia-2.8B against Mamba-2.8B (bf16)
def kv_per_token(layers, kv_heads, head_dim, bytes_=2):
    return 2 * layers * kv_heads * head_dim * bytes_


pyth_kv = kv_per_token(32, 32, 80)            # Pythia-2.8B: 32 layers, d 2560 (32 heads x 80); GPT-NeoX config
m28 = MC['state-spaces/mamba-2.8b']; di = 2 * m28['d_model']
state = m28['n_layer'] * (di * 16 + di * 3) * 2   # SSM state D_inner x N plus conv state D_inner x (K-1), bf16
R['mem_28'] = dict(kv_per_token=pyth_kv, state_bytes=state, crossover_tokens=math.ceil(state / pyth_kv), kv_2048=2048 * pyth_kv,
                   ratio_2048=round(2048 * pyth_kv / state, 1))


# ---- the fused scan: HBM traffic in elements (Appendix D's description), at Figure 8's setting
def io(Bt, L, D, N):
    naive = (Bt * L * D + Bt * L * D + 2 * Bt * L * N + D * N) + 2 * Bt * L * D * N   # read x, Delta, B, C, A; write Abar, Bbar
    naive += 2 * Bt * L * D * N + Bt * L * D * N                                           # scan reads Abar, Bbar, writes h
    naive += Bt * L * D * N + Bt * L * N + Bt * L * D                                       # read h and C, write y
    fused = Bt * L * D + Bt * L * D + 2 * Bt * L * N + D * N + Bt * L * D                  # read x, Delta, B, C, A; write y
    return naive, fused


n_, f_ = io(1, 2 ** 14, 1024, 16)
R['io_fig8'] = dict(B=1, L=2 ** 14, D=1024, N=16, naive=n_, fused=f_, ratio=round(n_ / f_, 1))
R['act_bytes'] = dict(attn=12, mlp=20, ssm=16, two_ssm=32)

# ---- hybrids: attention layers, KV per token and recurrent state per sequence (bf16), from the configs
hy = []
def add(name, layers, attn, kv_heads, head_dim, ssm_layers, state_elems, note, src, pattern=''):
    hy.append(dict(name=name, pattern=pattern, layers=layers, attn=attn, ssm=ssm_layers, kv_per_token=kv_per_token(attn, kv_heads, head_dim),
                   state_bytes=ssm_layers * state_elems * 2, note=note, src=src))

c = HC['state-spaces/transformerpp-2.7b']; add('Transformer++ 2.7B', c['n_layer'], len(c['attn_layer_idx']), c['attn_cfg']['num_heads'], c['attn_cfg']['head_dim'], 0, 0, 'all attention', 'state-spaces/transformerpp-2.7b', 'AF' * c['n_layer'])
add('Mamba 2.8B', m28['n_layer'], 0, 0, 0, m28['n_layer'], di * 16 + di * 3, 'all Mamba, N = 16', 'state-spaces/mamba-2.8b', 'm' * m28['n_layer'])
c = HC['state-spaces/mamba2-2.7b']; di2 = 2 * c['d_model']; st2 = di2 * 128 + (di2 + 2 * 128) * 3   # Mamba-2 defaults: d_state 128, ngroups 1
add('Mamba-2 2.7B', c['n_layer'], 0, 0, 0, c['n_layer'], st2, 'all Mamba-2, N = 128', 'state-spaces/mamba2-2.7b', 'M' * c['n_layer'])
c = HC['state-spaces/mamba2attn-2.7b']; na = len(c['attn_layer_idx'])
add('Mamba-2 + attention 2.7B', c['n_layer'], na, c['attn_cfg']['num_heads'], c['attn_cfg']['head_dim'], c['n_layer'] - na, st2, '6 of 64 layers attention', 'state-spaces/mamba2attn-2.7b', ''.join('A' if i in c['attn_layer_idx'] else 'M' for i in range(c['n_layer'])))
c = HC['ai21labs/Jamba-v0.1']; na = c['num_hidden_layers'] // c['attn_layer_period']; dij = c['mamba_expand'] * c['hidden_size']
add('Jamba v0.1 (52B, 12B active)', c['num_hidden_layers'], na, c['num_key_value_heads'], c['hidden_size'] // c['num_attention_heads'], c['num_hidden_layers'] - na,
    dij * c['mamba_d_state'] + dij * (c['mamba_d_conv'] - 1), '1 attention layer in 8; MoE every other layer', 'ai21labs/Jamba-v0.1',
    ''.join(('A' if i % c['attn_layer_period'] == c['attn_layer_offset'] else 'm') + ('E' if i % c['expert_layer_period'] == c['expert_layer_offset'] else 'F') for i in range(c['num_hidden_layers'])))
c = HC['nvidia/Nemotron-H-8B-Base-8K']; pat = c['hybrid_override_pattern']; na = pat.count('*'); nm = pat.count('M')
dih = c['mamba_num_heads'] * c['mamba_head_dim']
add('Nemotron-H 8B', len(pat), na, c['num_key_value_heads'], c['attention_head_dim'], nm, dih * c['ssm_state_size'] + (dih + 2 * c['n_groups'] * c['ssm_state_size']) * (c['conv_kernel'] - 1),
    pat, 'nvidia/Nemotron-H-8B-Base-8K', pat.replace('-', 'F').replace('*', 'A'))
c = HC['ibm-granite/granite-4.0-h-small']; lt = c['layer_types']; na = lt.count('attention'); nm = lt.count('mamba')
dig = c['mamba_n_heads'] * c['mamba_d_head']
add('Granite 4.0-H-Small (32B, 9B active)', len(lt), na, c['num_key_value_heads'], c['hidden_size'] // c['num_attention_heads'], nm,
    dig * c['mamba_d_state'] + (dig + 2 * c['mamba_n_groups'] * c['mamba_d_state']) * (c['mamba_d_conv'] - 1), '%d Mamba-2 : %d attention' % (nm, na), 'ibm-granite/granite-4.0-h-small', ''.join(('A' if t == 'attention' else 'M') + 'E' for t in lt))
c = HC['tiiuae/Falcon-H1-7B-Base']; dif = c['mamba_d_ssm']
add('Falcon-H1 7B', c['num_hidden_layers'], c['num_hidden_layers'], c['num_key_value_heads'], c['head_dim'], c['num_hidden_layers'],
    dif * c['mamba_d_state'] + (dif + 2 * c['mamba_n_groups'] * c['mamba_d_state']) * (c['mamba_d_conv'] - 1), 'attention and Mamba-2 side by side in every layer', 'tiiuae/Falcon-H1-7B-Base', 'PF' * c['num_hidden_layers'])
c = HC['nvidia/NVIDIA-Nemotron-3-Nano-30B-A3B-BF16']; pat = c['hybrid_override_pattern']; na = pat.count('*'); nm = pat.count('M')
din = c['mamba_num_heads'] * c['mamba_head_dim']
add('Nemotron 3 Nano (30B, 3B active)', len(pat), na, c['num_key_value_heads'], c['head_dim'], nm, din * c['ssm_state_size'] + (din + 2 * c['n_groups'] * c['ssm_state_size']) * (c['conv_kernel'] - 1),
    pat, 'nvidia/NVIDIA-Nemotron-3-Nano-30B-A3B-BF16', pat.replace('*', 'A'))
R['hybrids'] = hy

# ---- later controlled comparison (Waleffe et al. 2024, Table 2, 8B on 1.1T tokens)
R['waleffe'] = dict(tf_mmlu5=46.28, mamba_mmlu5=28.00, mamba2_mmlu5=29.19, tf_avg0=67.87, mamba_avg0=68.07, mamba2_avg0=68.56,
                    mmlu5_gap=round(46.28 - 28.00, 2), avg0_gap=round(68.07 - 67.87, 2), t3_mamba2_mmlu5=48.7, t3_tf_mmlu5=50.07)

lx = os.path.join(HERE, 'model', 'long', 'extrap_check.json')
if os.path.exists(lx): R['long_check'] = json.load(open(lx))['acc']
pr = os.path.join(HERE, 'model', 'probe.json')
if os.path.exists(pr): R['probe'] = json.load(open(pr))
cf = os.path.join(HERE, 'model', 'check_forward.json')
if os.path.exists(cf):
    c = json.load(open(cf)); R['check_forward'] = dict(summary=c['summary'], passed=c['pass'])
json.dump(R, open(os.path.join(HERE, 'inputs', 'recompute.json'), 'w'), indent=1)
if __name__ == '__main__':
    print(json.dumps({k: R[k] for k in ('t3_best', 't3_twice', 't3_noise_28', 't10', 't15', 'param_recount', 'twelve_d2', 'mem_28', 'io_fig8', 't13_diff')}, indent=0)[:6000])
    for x in hy: print(x['name'], x['attn'], '/', x['layers'], 'KV/token', x['kv_per_token'], 'state', x['state_bytes'])
