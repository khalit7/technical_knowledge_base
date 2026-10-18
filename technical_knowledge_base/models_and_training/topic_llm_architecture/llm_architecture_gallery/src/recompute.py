#!/usr/bin/env python3
"""Recompute every number the page states, and every default the HTML reproduces."""
import math
KiB, MiB, GiB = 1024, 2**20, 2**30
def kv(L, Hkv, dh, b=2): return 2 * L * Hkv * dh * b
out = []
def say(k, v, want=None):
    out.append('%-58s %s%s' % (k, v, '' if want is None else '   (page: %s)' % want))

# Llama 3.1 70B: L=80, Hkv=8, dh=8192/64=128
p = kv(80, 8, 128); say('Llama 3.1 70B KV per token', '%d B = %g KiB' % (p, p / KiB), '327,680 B = 320 KiB')
say('  one 128K request', '%d B = %g GiB' % (p * 131072, p * 131072 / GiB), '40 GiB')
say('  eight requests', '%g GiB' % (8 * p * 131072 / GiB), '320 GiB')
say('  70e9 BF16 weights', '%g GB' % (70e9 * 2 / 1e9), 'roughly 140 GB')
q = kv(80, 64, 128); say('  as MHA (64 KV heads)', '%g KiB/token, %g GiB per 128K request' % (q / KiB, q * 131072 / GiB), '2,560 KiB, 320 GiB')
# Llama 3.1 8B and OLMo 2 7B
say('Llama 3.1 8B KV per token', '%d B = %g KiB' % (kv(32, 8, 128), kv(32, 8, 128) / KiB), '131,072 B = 128 KiB')
say('OLMo 2 7B (MHA, 32 x 32 x 128)', '%g KiB' % (kv(32, 32, 128) / KiB), '512 KiB')
say('GQA head map, Llama 3.1 8B (H=32, Hkv=8)', 'heads 0-3 -> %s' % [i // (32 // 8) for i in range(4)], 'heads 0 to 3 read KV head 0')
# DeepSeek V3 MLA
m = 61 * (512 + 64) * 2; say('DeepSeek V3 MLA per token', '%d B = %.1f KiB' % (m, m / KiB), '70,272 B = 68.6 KiB')
h = 61 * 2 * 128 * 128 * 2; say('  as MHA 128 x 128', '%d B = %g KiB, ratio %.1f' % (h, h / KiB, h / m), '3,997,696 B = 3,904 KiB, 57x')
say('  576 elements as GQA heads of 128', '%.2f KV heads' % (576 / 256), '2.25')
# Gemma 3 27B: 62 layers (52 local W=1024, 10 global), 16 KV heads x 128 -> 8 KiB per layer
pl = 2 * 16 * 128 * 2; say('Gemma 3 27B bytes per layer per token', '%d B' % pl, '8 KiB')
say('  headline per token', '%g KiB' % (62 * pl / KiB), '496 KiB')
gl = 10 * pl * 131072; lo = 52 * pl * 1024
say('  global layers at 128K', '%g GiB' % (gl / GiB), '10 GiB')
say('  windowed layers', '%g MiB' % (lo / MiB), '416 MiB')
say('  total windowed', '%.2f GiB' % ((gl + lo) / GiB), 'about 10.4 GiB')
say('  if all layers full', '%g GiB' % (62 * pl * 131072 / GiB), '62 GiB')
say('  ratio', '%.2f' % (62 * pl * 131072 / (gl + lo)), 'about 6 times')
say('  effective per token', '%.1f KiB' % ((gl + lo) / 131072 / KiB), 'about 83 KiB')
# gpt-oss-120b: 36 layers, 8 KV heads x 64, W=128
pl = 2 * 8 * 64 * 2; say('gpt-oss-120b bytes per layer', '%g KiB' % (pl / KiB), '2 KiB')
say('  headline', '%g KiB' % (36 * pl / KiB), '72 KiB')
g = 18 * pl * 131072; l = 18 * pl * 128
say('  global at 128K', '%g GiB' % (g / GiB), '4.5 GiB'); say('  windowed', '%g MiB' % (l / MiB), '4.5 MiB')
say('  effective per token', '%.1f KiB' % ((g + l) / 131072 / KiB), 'about 36 KiB')
say('  16 requests', '%.1f GiB' % (16 * (g + l) / GiB), 'about 72 GiB')
say('  active share 5.1/117', '%.1f%%' % (5.1 / 117 * 100), '4.4%')
# Qwen3-Next
say('Qwen3-Next 80B-A3B (12 full layers, 2 x 256)', '%d B = %g KiB' % (kv(12, 2, 256), kv(12, 2, 256) / KiB), '24,576 B = 24 KiB')
# Linear state, illustrative shape 32 heads of 128 x 128
st = 32 * 128 * 128; say('Linear-attention state, 32 heads of 128 x 128', '%d numbers per layer' % st)
say('  equals MHA (32 x 128) cache at', '%d tokens' % (st / (2 * 32 * 128)))
say('  equals GQA (8 x 128) cache at', '%d tokens' % (st / (2 * 8 * 128)))
# V4.1-Flash
say('V4.1-Flash 890 B/token x 131,072', '%.1f MiB' % (890 * 131072 / MiB), 'about 111 MiB')
say('  gallery bf16 global cache (3/2+1) x 640 x 2', '%d B = %.3f KiB' % ((3 / 2 + 1) * 640 * 2, (3 / 2 + 1) * 640 * 2 / KiB), 'gallery 3.125 KiB')
# Sparse attention: 128K -> 1M
say('(1M/128K)^2', '%g' % ((1048576 / 131072) ** 2), '64')
# RMSNorm / LayerNorm
x = [1, 2, 3, 4]; ms = sum(v * v for v in x) / 4; r = math.sqrt(ms)
say('RMSNorm (1,2,3,4)', 'ms %.1f rms %.3f -> %s' % (ms, r, tuple(round(v / r, 3) for v in x)), '7.5, 2.739, (0.365, 0.730, 1.095, 1.461)')
mu = 2.5; sd = math.sqrt(sum((v - mu) ** 2 for v in x) / 4)
say('LayerNorm (1,2,3,4)', 'sd %.3f -> %s' % (sd, tuple(round((v - mu) / sd, 3) for v in x)), '1.118, (-1.342, -0.447, 0.447, 1.342)')
say('QK-norm logit bound sqrt(128)', '%.1f' % math.sqrt(128), 'about 11.3')
# RoPE
th = lambda i, base, d: base ** (-2 * i / d)
say('RoPE pair 0, base 500,000, d_h 128', '%g rad/token, turn every %.1f tokens' % (th(0, 5e5, 128), 2 * math.pi / th(0, 5e5, 128)), '1 rad, 6.3 tokens')
say('RoPE pair 63', '%.3g rad/token, turn every %.3g tokens' % (th(63, 5e5, 128), 2 * math.pi / th(63, 5e5, 128)), '2.46e-6, 2.56 million')
rot = lambda a: (math.cos(a), math.sin(a))
q3, k5 = rot(1.5), rot(2.5); say('RoPE example m=3,n=5, theta 0.5', 'q %s k %s dot %.4f cos1 %.4f' % (tuple(round(v, 4) for v in q3), tuple(round(v, 4) for v in k5), q3[0] * k5[0] + q3[1] * k5[1], math.cos(1)), '(0.0707,0.9975), (-0.8011,0.5985), 0.5403')
a, b2 = rot(5), rot(6); say('  m=10,n=12', 'dot %.4f' % (a[0] * b2[0] + a[1] * b2[1]), '0.5403')
# YaRN for gpt-oss: base 150000, d_h 64, s=32, L_orig 4096, alpha 1, beta 32
base, d, s, Lo = 150000, 64, 32, 4096
keep = interp = 0
for i in range(d // 2):
    lam = 2 * math.pi * base ** (2 * i / d); rr = Lo / lam
    if rr > 32: keep += 1
    elif rr < 1: interp += 1
say('gpt-oss YaRN pairs kept / fully interpolated / ramp', '%d / %d / %d of 32' % (keep, interp, 32 - keep - interp))
say('YaRN attention factor 0.1 ln 32 + 1', '%.3f' % (0.1 * math.log(32) + 1))
# Animation layer (illustrative shape: 32 query heads of 128, as Llama 3.1 8B; MLA at DeepSeek V3's latent; linear at Qwen3-Next / Kimi Linear state)
T = 131072
for nm, per in [('MHA 32 KV heads', 2*32*128), ('GQA 8', 2*8*128), ('MQA 1', 2*128), ('MLA 512+64', 576)]:
    say('anim %s numbers/token/layer' % nm, '%d, at 128K %s MiB per layer' % (per, per*2*T/MiB))
say('anim SWA GQA8 W=4096 per layer', '%g MiB fixed' % (2*8*128*2*4096/MiB))
say('anim linear state 32 x 128 x 128', '%d numbers = %g MiB per layer (bf16)' % (32*128*128, 32*128*128*2/MiB))
# Qwen3-Next: 36 Gated DeltaNet layers, 32 value heads x 128 x 128
stq = 36*32*128*128; say('Qwen3-Next fixed state, 36 layers', '%d elements = %g MiB bf16, %g MiB fp32' % (stq, stq*2/MiB, stq*4/MiB))
say('  equals its 24 KiB/token cache at', '%d tokens' % (stq*2/24576))
say('  Qwen3-Next 128K growing cache', '%g GiB' % (24576*T/GiB))
say('  if all 48 layers were full attention', '%g KiB/token' % (48*2*2*256*2/KiB))
stk = 20*32*128*128; say('Kimi Linear KDA state, 20 layers', '%g MiB bf16' % (stk*2/MiB))
say('Kimi Linear MLA layers 7 x 576 x 2', '%d B = %.2f KiB' % (7*576*2, 7*576*2/KiB))
# MiMo-V2-Flash: config 9 global (4 KV heads, K 192, V 128) + 39 SWA (8 KV heads)
mg = 9*4*(192+128)*2; ms = 39*8*(192+128)*2
say('MiMo-V2-Flash from config', '%g KiB (global %d B + sliding %d B)' % ((mg+ms)/KiB, mg, ms), 'gallery 144 KiB')
say('  gallery 144 KiB reconstructed as 48 x 4 x (192+192) x 2', '%g KiB' % (48*4*384*2/KiB))
open(__file__.replace('recompute.py', 'inputs/recompute_page.txt'), 'w').write('\n'.join(out) + '\n')
print('\n'.join(out))
