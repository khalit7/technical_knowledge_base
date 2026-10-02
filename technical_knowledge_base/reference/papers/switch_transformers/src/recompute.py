"""Recompute every derived number the page shows, from the paper's own tables and configurations.
Writes inputs/recompute.json (read by mk_paper.py into window.PAPER.rc) and prints a summary.
usage: python3 recompute.py

Conventions (stated on the page):
- Parameters: T5 encoder-decoder, vocabulary 32,128 with the input embedding shared and tied to the output
  (the original T5 convention; 223M for T5-Base comes out only this way), d_kv = 64 so the attention width
  is heads x 64, RMSNorm scales counted, relative position biases (32 buckets per head, one table per stack).
  GEGLU FFN = 3 matrices d x d_ff, ReLU FFN = 2. Expert layers: E copies of the FFN plus a d x E router.
- FLOPs per sequence: Kaplan et al. (2020) forward-pass counting, as the paper's footnote 7 says: 2 FLOPs per
  parameter per token (embeddings excluded), plus 2 n_ctx d_attn per token per attention layer for QK and AV,
  plus the output logits; 512 input tokens and 114 target tokens (T5's span corruption at 15% with mean
  span 3, inherited from Raffel et al. 2019 §3.1.4).
"""
import json, math, os, struct

V = 32128
TI, TO = 512, 114
OUT = {}


def model(d, ff, H, L, E=0, freq=0.0, gated=True, d_kv=64):
    return dict(d=d, ff=ff, H=H, L=L, E=E, freq=freq, gated=gated, d_kv=d_kv)


PAPER = {  # Table 9 as printed
    'T5-Base': model(768, 2048, 12, 12), 'T5-Large': model(1024, 2816, 16, 24), 'T5-XXL': model(4096, 10240, 64, 24),
    'Switch-Base': model(768, 2048, 12, 12, 128, .5), 'Switch-Large': model(1024, 2816, 16, 24, 128, .5),
    'Switch-XXL': model(4096, 10240, 64, 24, 64, .5), 'Switch-C': model(2080, 6144, 32, 15, 2048, 1, gated=False)}
# the most precise printed parameter counts: the text of §4.1 (223M, 739M) and Table 8 (7,410M)
EXACT = {'T5-Base': (223e6, '223M, §4.1'), 'T5-Large': (739e6, '739M, §4.1'), 'Switch-Base': (7410e6, '7,410M, Table 8')}
PRINTED = {'T5-Base': (0.2e9, 124e9), 'T5-Large': (0.7e9, 425e9), 'T5-XXL': (11e9, 6.3e12), 'Switch-Base': (7e9, 124e9),
           'Switch-Large': (26e9, 425e9), 'Switch-XXL': (395e9, 6.3e12), 'Switch-C': (1571e9, 890e9)}
# The released flaxformer gin files (inputs/gin_*.gin) where they differ from Table 9
RELEASED = {'T5-Large': model(1024, 4096, 16, 24, gated=False), 'Switch-Large': model(1024, 4096, 16, 24, 128, .5, gated=False),
            'Switch-XXL': model(4096, 10240, 64, 24, 128, .5), 'Switch-C': model(2080, 6144, 30, 15, 2048, 1, gated=False)}


def count(m):
    d, ff, H, L, E = m['d'], m['ff'], m['H'], m['L'], m['E']
    inner = H * m['d_kv']; ffn = (3 if m['gated'] else 2) * d * ff; att = 4 * d * inner
    sp = int(round(L * m['freq'])) if E else 0
    moe = E * ffn + d * E
    enc = L * att + (L - sp) * ffn + sp * moe
    dec = 2 * L * att + (L - sp) * ffn + sp * moe
    emb = V * d; norms = (2 * L + 1 + 3 * L + 1) * d; rel = 2 * 32 * H
    experts = 2 * sp * E * ffn
    return dict(total=enc + dec + emb + norms + rel, experts=experts, router=2 * sp * d * E, emb=emb, sparse_layers=2 * sp)


def flops(m, router=False):
    d, ff, H, L, E = m['d'], m['ff'], m['H'], m['L'], m['E']
    inner = H * m['d_kv']; ffn = (3 if m['gated'] else 2) * d * ff; att = 4 * d * inner
    sp = int(round(L * m['freq'])) if E else 0
    r = d * E if router else 0
    enc = L * att + L * ffn + sp * r            # one expert per token: the same FFN cost as dense
    dec = 2 * L * att + L * ffn + sp * r
    f = 2 * TI * enc + 2 * TO * dec + 2 * TO * d * V
    f += 2 * L * TI * inner * TI + 2 * L * TO * inner * TO + 2 * L * TO * inner * TI   # enc self, dec self, cross
    return f


rec = {}
for n, m in PAPER.items():
    c = count(m); fl = flops(m); flr = flops(m, True)
    row = dict(params=c['total'], experts_share=c['experts'] / c['total'], flops=fl, flops_router=flr,
               printed_params=PRINTED[n][0], printed_flops=PRINTED[n][1],
               params_vs_printed=c['total'] / PRINTED[n][0] - 1, flops_vs_printed=fl / PRINTED[n][1] - 1)
    if n in EXACT:
        row['exact_params'] = EXACT[n][0]; row['exact_src'] = EXACT[n][1]
        row['params_vs_printed'] = c['total'] / EXACT[n][0] - 1
    if n in RELEASED:
        cr = count(RELEASED[n]); row['released_params'] = cr['total']; row['released_flops'] = flops(RELEASED[n])
        row['released_vs_printed'] = cr['total'] / (EXACT[n][0] if n in EXACT else PRINTED[n][0]) - 1; row['released_flops_vs_printed'] = flops(RELEASED[n]) / PRINTED[n][1] - 1
    if m['E']: row['router_over_expert_flops'] = (m['d'] * m['E']) / ((3 if m['gated'] else 2) * m['d'] * m['ff'])
    rec[n] = row
OUT['recount'] = rec
OUT['ratios'] = {
    'large_over_base_flops_printed': 425 / 124, 'xxl_over_c_flops_printed': 6.3e12 / 890e9,
    'xxl_over_c_flops_recount': rec['Switch-XXL']['flops'] / rec['Switch-C']['flops'],
    'c_over_xxl_params_printed': 1571 / 395,
    'step_speedup_fig4': 450 / 60,
    'pretrain_tokens': 2 ** 20 * 550000, 'xxl_tokens_share_of_t5xxl': 503e9 / (2 ** 20 * 1e6),
    'table2_speed_bf16_over_fp32': 1390 / 1160, 'table1_time_moe1_over_switch1': 80.1 / 62.8,
    'table1_time_t5large_over_switch125': 131.1 / 65.0,
    'distill_teacher_over_student': 3800 / 223, 'distill_student_share': 223 / 3800}

# Table 9 gaps the text quotes (§5.6)
T9 = {'T5-XXL': (-1.147, -1.095), 'Switch-XXL': (-1.086, -1.008), 'Switch-C': (-1.096, -1.043)}
OUT['t9_gaps'] = {'xxl_250k': round(T9['Switch-XXL'][0] - T9['T5-XXL'][0], 3), 'c_250k': round(T9['Switch-C'][0] - T9['T5-XXL'][0], 3),
                  't5xxl_250k_to_500k': round(T9['T5-XXL'][1] - T9['T5-XXL'][0], 3), 'xxl_500k': round(T9['Switch-XXL'][1] - T9['T5-XXL'][1], 3),
                  'c_250k_vs_t5xxl_500k': round(T9['Switch-C'][0] - T9['T5-XXL'][1], 3)}

# Distillation shares (Tables 6 to 8): share = (student - dense) / (teacher - dense)
dense = -1.636
OUT['t6'] = {k: round(100 * (v - dense) / (-1.444 - dense), 1) for k, v in (('distill', -1.631), ('init', -1.598), ('mix', -1.580))}
t7 = [(1.1e9, -1.505, -1.587, 37, 82), (2.0e9, -1.474, -1.585, 32, 90), (3.8e9, -1.444, -1.579, 30, 95), (7.4e9, -1.432, -1.582, 27, 97), (14.7e9, -1.427, -1.578, 28, 99)]
OUT['t7'] = [dict(teacher=p, share=round(100 * (s - dense) / (t - dense), 1), share_printed=sp,
                  compress_223M=round(100 * (1 - 223e6 / p), 1), compress_02B=round(100 * (1 - 0.2e9 / p), 1), compress_printed=cp) for p, t, s, sp, cp in t7]
OUT['t8'] = round(100 * (76.6 - 74.6) / (81.3 - 74.6), 1)
OUT['t8_compress'] = round(100 * (1 - 223 / 7410), 1)
# Table 3: three seeds each; Welch standard error of the mean difference and its t statistic
se = math.sqrt(0.01 ** 2 / 3 + 0.68 ** 2 / 3)
OUT['t3'] = {'diff': round(3.60 - 2.72, 2), 'se': round(se, 3), 't': round((3.60 - 2.72) / se, 2)}
# Table 9: Switch minus its FLOP-matched dense model after 250k and 500k steps
OUT['t9_vs_dense'] = {'base': [round(-1.370 + 1.599, 3), round(-1.306 + 1.556, 3)], 'large': [round(-1.248 + 1.402, 3), round(-1.177 + 1.350, 3)], 'xxl': [round(-1.086 + 1.147, 3), round(-1.008 + 1.095, 3)]}

# Table 5 differences, Switch minus its FLOP-matched T5
T = json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'tables.json')))
t5 = T['T5']; cols = t5['cols'][1:]; R = {r[0]: [float(x) for x in r[1:]] for r in t5['rows']}
OUT['t5_diff'] = {'base': dict(zip(cols, [round(a - b, 1) for a, b in zip(R['Switch-Base'], R['T5-Base'])])),
                  'large': dict(zip(cols, [round(a - b, 1) for a, b in zip(R['Switch-Large'], R['T5-Large'])]))}
OUT['t5_wins'] = {k: sum(1 for v in OUT['t5_diff'][k].values() if v > 0) for k in ('base', 'large')}


# bfloat16: round a float32 to bfloat16 (round to nearest even), as TPUs do
def bf16(x):
    b = struct.unpack('<I', struct.pack('<f', x))[0]
    b = (b + 0x7FFF + ((b >> 16) & 1)) & 0xFFFF0000
    return struct.unpack('<f', struct.pack('<I', b))[0]


def softmax(z):
    m = max(z); e = [math.exp(v - m) for v in z]; s = sum(e); return [v / s for v in e]


# ST-MoE footnote 7: ten logits of 128 and one of 128.5
z = [128.5] + [128.0] * 10
OUT['bf16_example'] = {'top_fp32': softmax(z)[0], 'top_bf16': softmax([bf16(v) for v in z])[0], 'bf16_of_128_5': bf16(128.5),
                       'spacing_at_128': 1.0, 'spacing_at_64': 0.5, 'change': 1 - softmax([bf16(v) for v in z])[0] / softmax(z)[0]}

# load-balancing loss (Eq. 4) at its extremes, per unit alpha
OUT['aux'] = {'uniform': 1.0, 'collapsed_N': 'N', 'note': 'alpha * N * sum f_i P_i: 1 x alpha when f = P = 1/N; N x alpha when every token and all probability go to one expert'}

json.dump(OUT, open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'inputs', 'recompute.json'), 'w'), indent=1)
if __name__ == '__main__':
    for n, r in rec.items():
        s = '%-13s params %9.3fB (printed %7.1fB, %+5.1f%%)  FLOPs %8.1fB (printed %7.0fB, %+5.1f%%)  +router %8.1fB' % (
            n, r['params'] / 1e9, r['printed_params'] / 1e9, 100 * r['params_vs_printed'], r['flops'] / 1e9, r['printed_flops'] / 1e9, 100 * r['flops_vs_printed'], r['flops_router'] / 1e9)
        if 'released_params' in r: s += '  | released %8.3fB (%+5.1f%%) FLOPs %7.1fB (%+5.1f%%)' % (r['released_params'] / 1e9, 100 * r['released_vs_printed'], r['released_flops'] / 1e9, 100 * r['released_flops_vs_printed'])
        print(s)
    for k in ('ratios', 't9_gaps', 't6', 't7', 't8', 't5_diff', 't5_wins', 'bf16_example'):
        print(k, json.dumps(OUT[k]))
    print({n: round(r.get('router_over_expert_flops', 0), 4) for n, r in rec.items()})
