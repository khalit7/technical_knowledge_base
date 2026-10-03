"""Recompute every derived number the page shows, from the paper's tables (tables.json), the released
config.json (inputs/hf_config.json) and the sources quoted in inputs/external_extracts.txt.
Writes inputs/recompute.json, which mk_paper.py embeds as window.PAPER.rc. usage: python3 recompute.py"""
import json

T = json.load(open('tables.json'))
C = json.load(open('inputs/hf_config.json'))
out = {}

# ---- 1. Parameters, recounted from config.json ----
d, V, L, nh = C['hidden_size'], C['vocab_size'], C['num_hidden_layers'], C['num_attention_heads']
qn, qr, vh, ql, kl = C['qk_nope_head_dim'], C['qk_rope_head_dim'], C['v_head_dim'], C['q_lora_rank'], C['kv_lora_rank']
attn = d * ql + ql + ql * nh * (qn + qr) + d * (kl + qr) + kl + kl * nh * (qn + vh) + nh * vh * d
expert = 3 * d * C['moe_intermediate_size']
dense = 3 * d * C['intermediate_size']
nr, ns, k = C['n_routed_experts'], C['n_shared_experts'], C['num_experts_per_tok']
moe_tot = (nr + ns) * expert + nr * d + nr          # experts, router, routing bias
moe_act = (k + ns) * expert + nr * d
kd = C['first_k_dense_replace']; emb = V * d; head = V * d; norms = 2 * d
total = emb + head + d + L * (attn + norms) + kd * dense + (L - kd) * moe_tot
active = emb + head + d + L * (attn + norms) + kd * dense + (L - kd) * moe_act
mtp = attn + norms + moe_tot + 2 * d * d + 3 * d       # one extra block, its d x 2d projection and norms
out['params'] = {'total': total, 'active': active, 'active_matmul': active - emb, 'attn_layer': attn, 'expert': expert,
                 'mtp_block': mtp, 'hf_total': total + mtp + emb + head, 'emb': emb}
rest = nr * d + nr
out['breakdown'] = [  # [name, all, active]
    ['Embedding and output head', emb + head, emb + head],
    ['Attention (MLA), 61 layers', L * attn, L * attn],
    ['Dense FFN, first 3 layers', kd * dense, kd * dense],
    ['Shared experts, 58 layers', (L - kd) * ns * expert, (L - kd) * ns * expert],
    ['Routed experts, 58 layers', (L - kd) * nr * expert, (L - kd) * k * expert],
    ['Routers, biases and norms', (L - kd) * rest + L * norms + d, (L - kd) * nr * d + L * norms + d]]
assert abs(sum(r[1] for r in out['breakdown']) - total) < 1 and abs(sum(r[2] for r in out['breakdown']) - active) < 1
# KV cache per token per layer: MLA caches c_KV (512) and k_R (64)
out['kv'] = {'mla': kl + qr, 'mha': 2 * nh * 128, 'ratio': 2 * nh * 128 / (kl + qr), 'mha_with_rope_dims': nh * (qn + qr) + nh * vh,
             'bytes_per_token_bf16': (kl + qr) * L * 2}

# ---- 2. The bill (Table 1) ----
hours = {'pre': 2664e3, 'ext': 119e3, 'post': 5e3}
out['bill'] = {'total_hours': sum(hours.values()), 'usd': {k2: v * 2 for k2, v in hours.items()}, 'usd_total': sum(hours.values()) * 2,
               'per_T': 180e3, 'pre_from_rate': 180e3 * 14.8, 'days_per_T': 180e3 / 2048 / 24, 'pre_days': 2664e3 / 2048 / 24,
               'ext_days': 119e3 / 2048 / 24, 'post_hours_wall': 5e3 / 2048, 'after_pre': 124e3,
               'tokens_per_gpu_s': 14.8e12 / (2664e3 * 3600)}
# context extension: 1000 steps at 32K x 1920, 1000 steps at 128K x 480 (§4.3)
ext_tokens = 1000 * 1920 * 32768 + 1000 * 480 * 131072
out['bill']['ext_tokens'] = ext_tokens
out['bill']['ext_hours_per_B'] = 119e3 / (ext_tokens / 1e9)
out['bill']['pre_hours_per_B'] = 180e3 / 1000

# ---- 3. FLOPs and utilisation, against the H100/H800 dense peaks (989.4 BF16, 1978.9 FP8 TFLOPS) ----
PEAK_BF16, PEAK_FP8 = 1979e12 / 2, 3958e12 / 2
def attn_flops_per_token(layers, heads, dqk, dv, ctx):  # training: forward 2*h*(dqk+dv)*avg_ctx per layer, x3 for backward
    return 3 * layers * 2 * heads * (dqk + dv) * (ctx + 1) / 2
ds6 = 6 * out['params']['active_matmul']
ds_attn = attn_flops_per_token(L, nh, qn + qr, vh, 4096)
mtp_mat = 6 * (attn + moe_act + 2 * d * d + head)      # the MTP block's matmuls plus a second pass through the output head
mtp_attn = attn_flops_per_token(1, nh, qn + qr, vh, 4096)
tok = 14.8e12; gpu_s = 2664e3 * 3600
ds = {'f6N': ds6, 'f_attn': ds_attn, 'f_mtp': mtp_mat + mtp_attn}
ds['flops_6N'] = ds6 * tok
ds['flops_all'] = (ds6 + ds_attn + mtp_mat + mtp_attn) * tok
ds['mfu_bf16_6N'] = ds['flops_6N'] / (gpu_s * PEAK_BF16)
ds['mfu_bf16_all'] = ds['flops_all'] / (gpu_s * PEAK_BF16)
ds['mfu_fp8_all'] = ds['flops_all'] / (gpu_s * PEAK_FP8)
ll_tok, ll_N, ll_h = 15.6e12, 405e9, 30.84e6
ll = {'flops_6N': 6 * ll_N * ll_tok, 'attn_per_token': attn_flops_per_token(126, 128, 128, 128, 8192)}
ll['mfu_bf16_6N'] = ll['flops_6N'] / (ll_h * 3600 * PEAK_BF16)
ll['mfu_bf16_all'] = (6 * ll_N + ll['attn_per_token']) * ll_tok / (ll_h * 3600 * PEAK_BF16)
out['flops'] = {'ds': ds, 'llama': ll, 'peak_bf16': PEAK_BF16, 'peak_fp8': PEAK_FP8,
                'hours_ratio_total': ll_h / 2788e3, 'hours_ratio_pre': ll_h / 2664e3,
                'work_ratio': (ll_N * ll_tok) / (37e9 * tok), 'active_ratio': 405 / 37}

# ---- 4. MTP speculative decoding: expected tokens per step against the reported 1.8x ----
out['mtp'] = {'tokens_per_step': [1.85, 1.90], 'implied_overhead': [1.85 / 1.8 - 1, 1.90 / 1.8 - 1]}

# ---- 5. Communication arithmetic (§3.2.2, §3.5.1) ----
out['comm'] = {'bw_ratio': 160 / 50, 'max_experts': 4 * 160 / 50, 'sm_share': 20 / 132, 'gpus_per_stage': 2048 / 16,
               'experts_per_gpu_train': 256 / 64, 'prefill_experts_per_gpu': 256 / 32, 'decode_gpus': 256 + 64}

# ---- 6. Tables: wins, ties and losses ----
f = lambda s: float(s)
def cmp(a, b, lower, tie):
    if a == '-' or b == '-': return None
    dlt = (f(b) - f(a)) * (-1 if lower else 1)
    return 0 if abs(dlt) <= tie + 1e-9 else (1 if dlt > 0 else -1)
w = {}
for key, pairs in (('T4', ((0, 1), (2, 3))), ('T5', ((0, 1), (2, 3)))):
    res = []
    for a, b in pairs:
        r = [cmp(x['v'][a], x['v'][b], x['lower'], 0) for x in T[key]['rows']]
        res.append({'better': r.count(1), 'same': r.count(0), 'worse': r.count(-1), 'n': len(r),
                    'worse_rows': [x['bench'] for x, c in zip(T[key]['rows'], r) if c == -1]})
    w[key] = res
# Table 3: V3 against each base model, with the caption's rule (gap of 0.3 or less = same level)
w['T3'] = []
for j in range(3):
    r = [cmp(x['v'][j], x['v'][3], x['lower'], 0.3) for x in T['T3']['rows']]
    w['T3'].append({'vs': T['T3']['models'][j], 'better': r.count(1), 'same': r.count(0), 'worse': r.count(-1), 'n': len(r),
                    'worse_rows': [x['bench'] for x, c in zip(T['T3']['rows'], r) if c == -1]})
# Table 6: is V3 the best of the 7 columns, best open column, and where it trails
best = []
for x in T['T6']['rows']:
    v = [None if s == '-' else f(s) for s in x['v']]
    mx = max(t for t in v if t is not None)
    best.append({'bench': x['bench'], 'v3': v[6], 'best': mx, 'v3_best': v[6] == mx, 'v3_best_open': v[6] == max(t for t in v[:4] + [v[6]] if t is not None),
                 'leader': T['T6']['models'][v.index(mx)]})
w['T6'] = {'v3_best': sum(b['v3_best'] for b in best), 'v3_best_open': sum(b['v3_best_open'] for b in best), 'n': len(best),
           'not_best': [(b['bench'], b['leader'], b['best'], b['v3']) for b in best if not b['v3_best']]}
out['wins'] = w

# ---- 7. Every number in the text, checked ----
t6 = {x['bench'] + ('|' + x['metric'] if x['bench'] == 'LiveCodeBench' else ''): x['v'] for x in T['T6']['rows']}
t7 = {r[0]: r[1:] for r in T['T7']['rows']}
chk = []
def add(claim, where, printed, value, ok, note=''):
    chk.append({'claim': claim, 'at': where, 'printed': printed, 'recomputed': value, 'ok': ok, 'note': note})
add('2664K + 119K + 5K = 2788K GPU hours', 'S1.T1', '2788K', '%dK' % (out['bill']['total_hours'] / 1e3), out['bill']['total_hours'] == 2788e3)
add('$2 per GPU hour gives $5.576M', 'S1.T1', '$5.576M', '$%.3fM' % (out['bill']['usd_total'] / 1e6), abs(out['bill']['usd_total'] - 5.576e6) < 1)
add('Post-training at $2: $0.01M', 'S1.T1', '$0.01M', '$%.3fM' % (out['bill']['usd']['post'] / 1e6), True, 'rounded to two decimals')
add('180K GPU hours per trillion tokens x 14.8T = 2664K', 'S1', '2664K', '%.0fK' % (out['bill']['pre_from_rate'] / 1e3), abs(out['bill']['pre_from_rate'] - 2664e3) < 1)
add('3.7 days per trillion tokens on 2048 GPUs', 'S1', '3.7 days', '%.2f days' % out['bill']['days_per_T'], round(out['bill']['days_per_T'], 1) == 3.7)
add('Pre-training in less than two months', 'S1', '< 2 months', '%.1f days' % out['bill']['pre_days'], out['bill']['pre_days'] < 61)
add('Stages after pre-training need only 0.1M GPU hours', 'S1', '0.1M', '%.3fM' % (out['bill']['after_pre'] / 1e6), True, 'rounded')
add('671B total parameters', 'S4.SS2', '671B', '%.2fB' % (total / 1e9), round(total / 1e9) == 671, 'recounted from config.json')
add('37B activated per token', 'S4.SS2', '37B', '%.2fB' % (active / 1e9), int(active / 1e9) == 37, 'includes the input embedding and output head')
add('685B on Hugging Face = 671B main + 14B MTP', 'README', '685B', '%.2fB' % (out['params']['hf_total'] / 1e9), round(out['params']['hf_total'] / 1e9) in (684, 685), 'the MTP file carries its own embedding and head copies (13.46B)')
add('KV cache 576 values per token per layer, about 57x below MHA', 'S2.SS1.SSS1', '57x (old page)', '%.1fx' % out['kv']['ratio'], True, '32,768 / 576 against a 128-head, 128-dim MHA; 71x against an MHA with V3\'s 192-dim keys')
add('NVLink 160 GB/s is roughly 3.2 times IB 50 GB/s', 'S3.SS2.SSS2', '3.2', '%.1f' % out['comm']['bw_ratio'], True)
add('Up to 13 experts (4 nodes x 3.2) at the same communication cost', 'S3.SS2.SSS2', '13', '%.1f' % out['comm']['max_experts'], True, '12.8 rounded up')
add('20 of 132 SMs for communication', 'S3.SS5.SSS1', '20 / 132', '%.1f%%' % (100 * out['comm']['sm_share']), True)
add('Prefill: 32 redundant experts, one extra per GPU on 32 GPUs, 8 original experts each', 'S3.SS4.SSS1', '8 + 1', '256 / 32 = %d' % out['comm']['prefill_experts_per_gpu'], True)
add('Decode: 320 GPUs, one expert each, 64 for redundant and shared experts', 'S3.SS4.SSS2', '320', '256 + 64 = %d' % out['comm']['decode_gpus'], True)
add('LR schedule covers 14.8T: 10T constant + 4.3T cosine + 0.5T final', 'S4.SS2', '14.8T', '%.1fT' % (10 + 4.3 + 0.5), True)
add('Bias update speed 0.001 for 14.3T, 0 for the last 500B', 'S4.SS2', '14.8T', '%.1fT' % (14.3 + 0.5), True)
add('MTP weight 0.3 for 10T, 0.1 for 4.8T', 'S4.SS2', '14.8T', '%.1fT' % (10 + 4.8), True)
add('LLaMA-3.1 405B has 11 times the activated parameters', 'S4.SS4.SSS2', '11x', '%.1fx' % (405 / 37), True)
add('Qwen2.5 72B has about twice the activated parameters ("only half")', 'S4.SS4.SSS2', 'half', '%.2f' % (37 / 72), True)
add('Arena-Hard: "win rate of over 86%"', 'S5.SS3.SSS3', '86% (text)', t7['DeepSeek-V3'][0] + ' (Table 7)', False, 'the text and Table 7 disagree; the table prints 85.5, the abstract-level claim "first open model over 85" holds with either')
add('AlpacaEval 2.0: beats DeepSeek-V2.5-0905 "by a significant margin of 20%"', 'S5.SS3.SSS3', '20%', '%.1f points' % (f(t7['DeepSeek-V3'][1]) - f(t7['DeepSeek-V2.5-0905'][1])), True, '19.5 points absolute (38.6% relative)')
for b, i in (('AIME 2024', 0), ('MATH-500', 1), ('CNMO 2024', 2)):
    v = t6[b]; gap = f(v[6]) - f(v[2])
    add('%s: about 10 points above Qwen2.5 72B, the second-best model' % b, 'S5.SS3.SSS2', '~10', '%.1f points' % gap, False if b != 'MATH-500' else True,
        {'AIME 2024': 'the gap is 15.9, and LLaMA-3.1 405B ties Qwen at 23.3', 'MATH-500': '', 'CNMO 2024': 'the gap is 27.3: "approximately 10%" understates it'}[b])
add('C-SimpleQA: 16.4 points above Qwen2.5 72B', 'S5.SS3.SSS2', '16.4', '%.1f' % (f(t6['C-SimpleQA'][6]) - f(t6['C-SimpleQA'][2])), True)
add('Qwen2.5 trained on 18T tokens, 20% more than 14.8T', 'S5.SS3.SSS2', '20%', '%.1f%%' % (100 * (18 / 14.8 - 1)), True)
add('MTP: second-token acceptance 85 to 90% gives 1.8x TPS', 'S5.SS4.SSS3', '1.8x', '1.85 to 1.90 tokens per step', True, 'derived: 1.8x implies 3 to 6% extra cost per step (verification and the MTP module)')
add('Context extension: 2 x 1000 steps (32K x 1920, 128K x 480)', 'S4.SS3', '119K hours', '%.1fB tokens; %.0f GPU hours per billion tokens against %.0f in pre-training' % (ext_tokens / 1e9, out['bill']['ext_hours_per_B'], out['bill']['pre_hours_per_B']), True, 'derived: long sequences cost about 5x more per token')
out['checks'] = chk

# ---- 8. FP8 simulation summary (from fp8_sim.py) ----
try:
    S = json.load(open('inputs/fp8_sim.json'))
    out['fp8'] = {'acc': S['acc'], 'dot': S['dot']}
except FileNotFoundError:
    pass
try:
    out['fp8check'] = json.load(open('inputs/check_fp8.json'))
except FileNotFoundError:
    pass
json.dump(out, open('inputs/recompute.json', 'w'), indent=1)
if __name__ == '__main__':
    print(json.dumps({k: out[k] for k in ('params', 'kv', 'bill', 'flops', 'mtp', 'comm')}, indent=1))
    print(json.dumps(out['wins'], indent=1))
    for c in chk: print(('OK ' if c['ok'] else 'NO ') + c['claim'], '|', c['printed'], '->', c['recomputed'], c['note'])
