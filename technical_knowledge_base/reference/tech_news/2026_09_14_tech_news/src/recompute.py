#!/usr/bin/env python3
"""Recompute every derived number the 2026-09-14 page shows. Run from src/. Inputs are saved in inputs/ and data/.
Asserts check that a default lands on the published figure."""
import json

print('# DeepSeek global KV cache per token (configs: inputs/x_ds_config.txt, inputs/x_ds_v4_config.txt; entry sizes: inputs/x_zartbot.txt)')
v4_main, v4_idx = 448 + 128 + 8, 64 + 4          # V4: 448 FP8 + 64 RoPE dims in BF16 + 8 scale bytes; 128-dim MXFP4 indexer key + scales
v41_main, v41_idx = 512 // 2 + 512 // 16, 128 // 2 + 128 // 32   # V4.1: 512 FP4 values + 1 scale byte per 16; indexer 128 FP4 + scales
assert (v4_main, v4_idx, v41_main, v41_idx) == (584, 68, 288, 68)
# V4-Flash compress_ratios: layers 2..42 alternate 4 (CSA, with indexer) and 128 (HCA, no indexer)
ratios = [0, 0] + [4 if i % 2 == 0 else 128 for i in range(2, 43)]
v4 = sum((v4_main + (v4_idx if r == 4 else 0)) / r for r in ratios if r)
print(f'  V4-Flash: 21 CSA x 652/4 + 20 HCA x 584/128 = {v4:.2f} B/token (report: 3,514)')
assert round(v4) == 3514
reuse = 4 * (v4_main + v4_idx) / 4
relax = 3 * (v4_main + v4_idx) / 2 + (v4_main + v4_idx)
v41 = 3 * (v41_main + v41_idx) / 2 + (v41_main + v41_idx)   # kv_source_layer_ids 2, 8, 14 (ratio 2) and 20 (ratio 1)
print(f'  steps: cross-layer reuse {reuse:.0f}, finer compression {relax:.0f}, FP4 {v41:.0f} B/token (report: 890); 3514/890 = {v4/v41:.2f}x')
assert round(v41) == 890 and round(reuse) == 652 and round(relax) == 1630
v1 = 2 * 95 * 8 * 128 * 2  # DeepSeek LLM 67B: K and V, 95 layers, 8 KV heads, 128 dims, BF16
print(f'  DeepSeek LLM 67B: {v1:,} B/token; / 890 = {v1/890:.1f}x (report: 437x)')
assert round(v1 / 890) == 437
for N in (8192, 32768, 131072, 1048576):
    p4, p41 = N * 43, N * 20 + 128 * 20
    print(f'  prompt {N:>9,}: layer passes {p4:.3e} vs {p41:.3e} ({p41/p4:.3f}); param FLOPs {2*13e9*N:.3e} vs {2*8e9*(N+128):.3e} ({8*(N+128)/(13*N):.3f}); HBM {v4*N/1e6:,.0f} MB vs {v41*N/1e6:,.0f} MB')
print('  persistent cache: (1/2, SWA no longer persisted) x (1/4, global cache) = 1/8 (report: about 1/8, by construction)')

print('# Real-SWE: three readings (data/realswe.json from inputs/wb_realswe_*.txt and the live page)')
D = json.load(open('data/realswe.json'))
pub = {'r1': [38.8, 33.8, 31.2, 28.8, 23.8, 23.8, 18.8, 16.2], 'r2': [38.8, 33.8, 31.2, 28.8, 32.5, 23.8, 18.8, 16.2],
       'r3': [45.00, 46.25, 38.75, 37.50, 32.50, 36.25, 20.00, 26.25]}
def pear(x, y):
    n = len(x); mx = sum(x) / n; my = sum(y) / n
    return sum((a - mx) * (b - my) for a, b in zip(x, y)) / (sum((a - mx) ** 2 for a in x) * sum((b - my) ** 2 for b in y)) ** .5
for k in ('r1', 'r2', 'r3'):
    rs = [sum(row[i] for row in D['r'][k]['pass']) / 80 * 100 for i in range(8)]
    for a, b in zip(rs, pub[k]): assert abs(a - b) < 0.06, (k, a, b)
    low = sum(1 for row in D['r'][k]['pass'] if sum(row) / 64 < 0.15)
    print(f'  {k}: ' + ', '.join(f'{m} {r:.2f}' for m, r in zip(D['models'], rs)) + f'; tasks below 15%: {low}; r(cost, rate) = {pear(D["r"][k]["cost"], rs):.2f}')
print(f'  12 Sep: short rollouts 70/98 = {100*70/98:.1f}% failed, longer 398/542 = {100*398/542:.1f}%; total {98+542} = 10 x 8 x 8')
assert round(100 * 70 / 98, 1) == 71.4 and round(100 * 398 / 542, 1) == 73.4 and 98 + 542 == 640
print(f'  Terminal-Bench 4.0 against Real-SWE (different benchmarks): Fable 55.8 - 38.8 = {55.8-38.8:.1f}, Astra 57.9 - 33.8 = {57.9-33.8:.1f}')
print(f'  SWE-2 on Terminal-Bench 4: {55.8-27.3:.1f} and {57.9-27.3:.1f} points behind Fable 5.1 and GPT-6 Astra')

print('# Hyper-tau-bench and pretraining data (inputs/i22_*, inputs/i26_*)')
print(f'  82.2 / 23.9 = {82.2/23.9:.2f}x; 12.0 / 3.7 = {12.0/3.7:.2f}x')
assert round(82.2 / 23.9, 1) == 3.4 and round(12.0 / 3.7, 2) == 3.24

print('# Cohere megakernel speed-of-light (inputs/i56_*)')
w, kv, bw = 3.3e9 * 2, 0.5e9, 3.35e12
sol = bw / (w + kv)
print(f'  3.35 TB/s / ({w/1e9:.1f} + {kv/1e9:.1f}) GB = {sol:.0f} tok/s (Cohere: about 470); 292 = {100*292/sol:.0f}%, 185 = {100*185/sol:.0f}%, 292/185 = {292/185:.2f}x')
assert round(100 * 292 / sol) == 62 and round(100 * 185 / sol) == 39 and round(292 / 185, 2) == 1.58
kvt = kv / 8192
for C in (32768, 262144):
    print(f'  at {C:,} tokens of context: cache {kvt*C/1e9:.2f} GB, speed-of-light {bw/(w+kvt*C):.0f} tok/s (derived, linear cache)')

print('# Anthropic 2030 scenarios (inputs/x_econ_report_table.txt, Table 3)')
base = 44.4 / 1.324
print(f'  no-AI GDP = 44.4 / 1.324 = ${base:.2f}T (36.3/1.083 = {36.3/1.083:.2f}, 34.1/1.016 = {34.1/1.016:.2f})')
for n, g, l, tl, tk in (('modest', 1.6, 59.4, 0.6, 3.1), ('substantial', 8.3, 56.1, 1.4, 18.9), ('extreme', 32.4, 45.2, 0.5, 81.4)):
    dl = l * (1 + g / 100) / 60 * 100 - 100; dk = (100 - l) * (1 + g / 100) / 40 * 100 - 100
    print(f'  {n}: labour {dl:+.1f}% (Table 3 {tl:+.1f}%), capital {dk:+.1f}% (Table 3 {tk:+.1f}%)')
    assert abs(dk - tk) < 0.06
print('  extreme labour: the shortcut gives -0.3% against Table 3 +0.5% (labour share is of income, not GDP); both "roughly flat"')

print('# RLT (inputs/wb_rlt_20260913.txt): 48 + 48 tied layout')
for t in (1, 5, 6, 8):
    print(f'  after {t} tokens: chain of {48*t} decoder blocks')
for P in (1000, 10000, 100000):
    print(f'  prefill of {P:,} tokens: Transformer 96 sequential layer steps, RLT 48 + 48 x {P:,} = {48+48*P:,}')
