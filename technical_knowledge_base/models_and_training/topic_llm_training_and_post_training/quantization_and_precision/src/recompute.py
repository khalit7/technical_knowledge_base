"""Recompute every derived number the page shows. Plain Python 3 (stdlib): python3 recompute.py > recompute.txt"""
import math
print('== Format constants from bit layouts (sign / exponent / mantissa, IEEE-style bias 2^(e-1)-1)')
F = {'fp32': (8, 23, 0), 'tf32': (8, 10, 0), 'bf16': (8, 7, 0), 'fp16': (5, 10, 0), 'fp8 E5M2': (5, 2, 0), 'fp8 E4M3': (4, 3, 1), 'fp4 E2M1': (2, 1, 2)}
# special: 0 = IEEE (top exponent reserved for inf/NaN); 1 = OCP E4M3 (only S.1111.111 is NaN); 2 = no inf/NaN (E2M1)
for n, (e, m, sp) in F.items():
    bias = 2 ** (e - 1) - 1
    emax = (2 ** e - 2 - bias) if sp == 0 else (2 ** e - 1 - bias)
    mmax = (2 - 2 ** -m) if sp != 1 else (2 - 2 * 2 ** -m)
    mx = 2 ** emax * mmax
    mn = 2.0 ** (1 - bias); sub = 2.0 ** (1 - bias - m)
    print('%-9s bias %3d  max %-12.6g min normal %-10.4g min subnormal %-10.4g eps(1) %-9.4g range %.1f binades' % (n, bias, mx, mn, sub, 2 ** -m, math.log2(mx / sub)))
print('E8M0 scale: 2^-127 .. 2^127, 255 values + NaN, no zero')
print('INT8 symmetric: 255 levels (-127..127), INT4 symmetric 15 levels (-7..7), asymmetric 16 levels')
print()
print('== Bits per weight of block formats (bytes from the ggml-common.h static_asserts, and the format definitions)')
B = {'Q4_0': (18, 32), 'Q4_1': (20, 32), 'Q5_0': (22, 32), 'Q5_1': (24, 32), 'Q8_0': (34, 32), 'Q2_K': (84, 256), 'Q3_K': (110, 256),
     'Q4_K': (144, 256), 'Q5_K': (176, 256), 'Q6_K': (210, 256), 'IQ2_XXS': (66, 256), 'IQ2_XS': (74, 256), 'IQ2_S': (82, 256), 'IQ3_XXS': (98, 256),
     'IQ3_S': (110, 256), 'IQ4_NL': (18, 32), 'IQ4_XS': (136, 256), 'MXFP4 (ggml)': (17, 32), 'TQ1_0': (54, 256), 'TQ2_0': (66, 256)}
for n, (b, w) in B.items(): print('%-13s %3d bytes / %3d weights = %.4f bpw' % (n, b, w, b * 8 / w))
print('MXFP4 (OCP): 4 + 8/32 = %.4f' % (4 + 8 / 32), ' MXFP8: 8 + 8/32 = %.4f' % (8 + 8 / 32))
print('NVFP4: 4 + 8/16 = %.4f (+ one fp32 per tensor)' % (4 + 8 / 16))
print('NF4 blocks of 64 with fp32 absmax: 4 + 32/64 = %.3f; with double quant (8-bit absmax, fp32 per 256 blocks): 4 + 8/64 + 32/(64*256) = %.4f' % (4 + 32 / 64, 4 + 8 / 64 + 32 / (64 * 256)))
print('INT4 g128 with fp16 scale and fp16 zero: 4 + 32/128 = %.3f; g32 fp16 scale (Q4_0) 4 + 16/32 = %.3f' % (4 + 32 / 128, 4 + 16 / 32))
print()
print('== llama.cpp use_more_bits: fraction of layers promoted to Q6_K in Q4_K_M')
for n in (28, 32, 80, 126):
    k = sum(1 for i in range(n) if i < n // 8 or i >= 7 * n // 8 or (i - n // 8) % 3 == 2)
    print('  %3d layers: %d promoted (%.1f%%)' % (n, k, 100 * k / n))
print()
print('== Effective bpw (README, Llama-3.1-8B) and GB per billion parameters')
for n, bpw in (('Q4_K_M', 4.8944), ('Q8_0', 8.5008), ('Q2_K', 3.1593), ('IQ2_XXS', 2.3824)):
    print('  %-8s %.4f bpw = %.3f GB per billion parameters' % (n, bpw, bpw / 8))
print('  README Llama 3.1 Q4_K_M sizes: 8B 4.9 GB, 70B 43.1 GB, 405B 249.1 GB -> per B: %.3f %.3f %.3f (params 8.03, 70.6, 405.9)' % (4.9 / 8.03, 43.1 / 70.6, 249.1 / 405.9))
print('  gap block -> file, Q4_K_M: 4.8944 - 4.5 = %.3f bpw; Q2_K: 3.1593 - 2.625 = %.3f' % (4.8944 - 4.5, 3.1593 - 2.625))
print()
print('== Perplexity deltas: LLaMA-1-7B (llama.cpp, July 2023) against Llama-3-8B (current quantize.cpp)')
A = {'Q2_K': 0.8698, 'Q3_K_M': 0.2437, 'Q4_0': 0.2499, 'Q4_K_S': 0.1149, 'Q4_K_M': 0.0535, 'Q5_K_M': 0.0142, 'Q6_K': 0.0044, 'Q8_0': 0.0004}
C = {'Q2_K': 3.5199, 'Q3_K_M': 0.6569, 'Q4_0': 0.4685, 'Q4_K_S': 0.2689, 'Q4_K_M': 0.1754, 'Q5_K_M': 0.0569, 'Q6_K': 0.0217, 'Q8_0': 0.0026}
for k in A: print('  %-7s %+.4f  %+.4f  ratio %.1fx' % (k, A[k], C[k], C[k] / A[k]))
print('  Q4_0 / Q4_K_S: 7B %.2fx, Llama-3-8B %.2fx' % (A['Q4_0'] / A['Q4_K_S'], C['Q4_0'] / C['Q4_K_S']))
print()
print('== Ternary')
print('  log2(3) = %.4f; five trits per byte: 8/5 = %.3f; with power-of-two groups (TQ1_0): 54*8/256 = %.4f' % (math.log2(3), 8 / 5, 54 * 8 / 256))
print('  BITCOS 2 - z at z = 0.515: %.3f; equals 1.625 at z = %.3f; equals log2 3 at z = %.3f' % (2 - 0.515, 2 - 1.625, 2 - math.log2(3)))
print('  Bonsai 2 27B: 27e9 * 1.76 / 8 = %.2f GB; 16 / 1.76 = %.2fx; 83.9 / 85.4 = %.3f' % (27e9 * 1.76 / 8 / 1e9, 16 / 1.76, 83.9 / 85.4))
print()
print('== Training memory (bytes per parameter, Adam, mixed precision)')
print('  bf16 weights 2 + bf16 grads 2 + fp32 master 4 + fp32 m 4 + fp32 v 4 = 16')
print('== Mixed precision: fp16 underflow threshold 2^-24 = %.3g; loss scale 8 shifts exponents by 3 (2^-27 -> 2^-24)' % 2 ** -24)
print('== NVFP4 pretraining: MXFP4 tokens to match: 1.36T / 1T = +36%')
print('== torchtitan Float8 (Llama 3.1 8B, 8 H100): 9409 / 6674 = %.3f (compile alone baseline); 9409 / 6258 = %.4f (vs eager FSDP)' % (9409 / 6674, 9409 / 6258))
print('== NVFP4 size: 16 / 4.5 = %.2fx smaller than FP16; 8.0 / 4.5 = %.2fx smaller than FP8' % (16 / 4.5, 8 / 4.5))
