"""Recompute every derived number the page shows. Run: python3 recompute.py"""
import json
KiB, MiB, GiB = 1024, 2**20, 2**30
cfg = lambda f: json.load(open('inputs/cfg/' + f))

print('== KV cache per token (BF16, 2 bytes), from config.json')
def kv_tok(L_attn, nkv, hd, b=2): return 2 * L_attn * nkv * hd * b
q = cfg('Qwen_Qwen3-30B-A3B.json'); l = cfg('unsloth_Llama-3.1-70B.json')
n = cfg('nvidia_NVIDIA-Nemotron-3-Nano-30B-A3B-BF16.json'); g = cfg('ibm-granite_granite-4.0-h-small.json')
s = cfg('nvidia_Nemotron-3-Super-120B-A12B-BF16-MTPv2.json')
pat = n['hybrid_override_pattern']; nA, nM, nE = pat.count('*'), pat.count('M'), pat.count('E')
print('Nemotron 3 Nano pattern: attention', nA, 'Mamba-2', nM, 'MoE', nE, 'layers', len(pat))
kq = kv_tok(q['num_hidden_layers'], q['num_key_value_heads'], q['head_dim'])
kl = kv_tok(l['num_hidden_layers'], l['num_key_value_heads'], l['head_dim'])
kn = kv_tok(nA, n['num_key_value_heads'], n['head_dim'])
gA = g['layer_types'].count('attention'); gM = g['layer_types'].count('mamba')
kg = kv_tok(gA, g['num_key_value_heads'], g['hidden_size'] // g['num_attention_heads'])
sp = s['hybrid_override_pattern']; ks = kv_tok(sp.count('*'), s['num_key_value_heads'], s['head_dim'])
for nm, v in [('Qwen3-30B-A3B', kq), ('Llama 3.1 70B', kl), ('Nemotron 3 Nano', kn), ('Granite 4.0-H-Small', kg), ('Nemotron 3 Super', ks)]:
    print(f'  {nm:22s} {v:>8,d} B = {v/KiB:.0f} KiB per token')

print('== Mamba-2 state per sequence (fixed, does not grow with context)')
def mamba_state(nh, hd, ds, ngroups, dconv, ssm_bytes, conv_bytes=2):
    ssm = nh * hd * ds * ssm_bytes
    conv = (nh * hd + 2 * ngroups * ds) * (dconv - 1) * conv_bytes
    return ssm, conv
ssm, conv = mamba_state(n['mamba_num_heads'], n['mamba_head_dim'], n['ssm_state_size'], n['n_groups'], n['conv_kernel'], 4)
per = ssm + conv; tot_n = per * nM
print(f'  Nemotron 3 Nano: SSM {ssm/MiB:.2f} MiB + conv {conv/KiB:.0f} KiB = {per/MiB:.3f} MiB per layer x {nM} = {tot_n/MiB:.1f} MiB')
ssm_g, conv_g = mamba_state(g['mamba_n_heads'], g['mamba_d_head'], g['mamba_d_state'], g['mamba_n_groups'], g['mamba_d_conv'], 2)
print(f'  Granite 4.0-H-Small (bf16 state assumed): {(ssm_g+conv_g)/MiB:.3f} MiB x {gM} = {(ssm_g+conv_g)*gM/MiB:.1f} MiB')
print('  crossover vs Qwen3-30B-A3B (tokens):', round(tot_n / (kq - kn)))
for ctx in [1, 512, 4096, 32768, 131072, 262144, 1048576]:
    a = kq * ctx; b = tot_n + kn * ctx
    print(f'  ctx {ctx:>8,d}: transformer {a/MiB:10.1f} MiB  hybrid {b/MiB:9.1f} MiB  ratio {a/b:5.1f}')

print('== Weight memory: params x bits / 8 (decimal GB)')
def gb(p, bits): return p * bits / 8 / 1e9
print(f'  Bonsai 2 27B ternary 1.76 bit: {gb(27e9,1.76):.2f} GB; 16-bit {gb(27e9,16):.0f} GB; ratio {16/1.76:.2f}x')
print(f'  North Small Translate 218B 4-bit: {gb(218e9,4):.0f} GB (B200 180 GB = 1,440/8; 2 x H100 = 160 GB)')
print(f'  Command A 111B: 16-bit {gb(111e9,16):.0f} GB, 8-bit {gb(111e9,8):.0f} GB vs 2 x 80 GB = 160 GB')
print(f'  North Mini Code 30B 16-bit {gb(30e9,16):.0f} GB vs one H100 80 GB')
print(f'  Hy4 770B 16-bit {gb(770e9,16):.0f} GB vs 1.56 TB on Hugging Face ({1.56e12/770e9:.3f} bytes per parameter)')
print(f'  MiMo-V2.6-Pro 1.02T 16-bit {gb(1.02e12,16):.0f} GB, 8-bit {gb(1.02e12,8):.0f} GB')
print(f'  Tiny Aya 3.35B 4-bit {gb(3.35e9,4):.2f} GB')

print('== Sparsity ratios total/active')
for nm, t, a in [('Hy4 preview', 770, 49), ('Qwen3.8-Flash-Next', 125, 6), ('Step 5 Preview', 600, 27), ('DeepSeek V4 Pro', 1600, 49),
                 ('MiMo-V2.6-Pro', 1020, 42), ('MiMo-V2.6-Flash', 309, 15), ('Naive-N0.5-Flash', 309, 15.5), ('Hunyuan-Large', 389, 52), ('Hy3', 295, 21),
                 ('K2 Horizon 375B', 375, 23), ('North Small Translate', 218, 25), ('North Mini Code', 30, 3), ('Kimi K3', 2800, 104), ('GLM-5', 744, 40)]:
    print(f'  {nm:22s} {t/a:5.1f}x')
print('  open decoder-only >= 600B, active (B):', sorted([('Step 5 Preview', 27), ('Kimi K2', 32), ('DeepSeek V3', 37), ('GLM-5/5.2', 40), ('MiMo-V2.5/2.6-Pro', 42), ('Hy4', 49), ('DeepSeek V4 Pro', 49), ('Qwen3.8 2.4T', 95), ('Kimi K3', 104)], key=lambda x: x[1]))

print('== Prices')
print(f'  Step 5 output vs Kimi K3 output: 2.70/15 = {2.7/15:.0%}')
print(f'  MiMo Pro cache hit / miss: {0.0036/0.435:.2%}')

print('== AA v4.3 (aa_snapshot.json, read 2026-10-01): cheapest cost per task among models scoring >= 40')
aa = json.load(open('../../src/data/aa_snapshot.json'))['rows']
ok = [r for r in aa if r['aa_index'] and r['aa_cost_per_index_task'] and r['aa_index'] >= 40]
for r in sorted(ok, key=lambda r: r['aa_cost_per_index_task'])[:5]:
    print(f"  {r['model']:45s} {r['aa_index']:5.1f} ${r['aa_cost_per_index_task']:.3f}")
op = [r for r in aa if r['lab'] in ('Xiaomi (MiMo)', 'StepFun', 'Tencent (Hunyuan)', 'Institute of Foundation Models', 'Zhipu (Z.ai)', 'Moonshot AI (Kimi)', 'DeepSeek', 'Alibaba (Qwen)', 'MiniMax')]
print('  best open-ish by index:', sorted([(r['aa_index'], r['model']) for r in op], reverse=True)[:5])

print('== INTELLECT-1 (arXiv 2412.01152 Table 2): compute utilisation = 38 min / (38 min + median all-reduce)')
c = 38 * 60
for nm, ar, pub in [('USA', 103, 95.7), ('USA + Europe', 382, 85.6), ('Global', 469, 83.0)]:
    dl = c / (c + ar); step = c / 100; ddp = step / (step + ar * 4)
    print(f'  {nm:13s} DiLoCo {dl:.1%} (published {pub}%)   sync-every-step extrapolation: {ddp:.1%} (step {step:.1f} s, all-reduce {ar*4} s)')
print('  communication reduction: 100 inner steps x 4 (fp32 -> int8) =', 100 * 4)
print(f'  pseudo-gradient per sync: 10B x 1 byte = 10 GB; fp32 every step: 40 GB per step')
print('== SOLAR depth up-scaling: 2 x (32 - 8) =', 2 * (32 - 8), 'layers')
