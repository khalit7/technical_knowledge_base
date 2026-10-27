#!/usr/bin/env python3
"""Recompute every derived number the 2026-09-21 page shows. Run from src/. Inputs are in inputs/ (saved source text).
Each block names its source; asserts check that a default lands on the published figure."""
import csv, json, math
from datetime import date

print('# Task horizon (Anthropic RSI report; METR Time Horizon 1.1, inputs/metr_time_horizons.txt)')
h0, t0 = 718.81, date(2026, 2, 5)          # METR: Claude Opus 4.6, 50% horizon in minutes
for name, months in [('Anthropic, about 4 months', 4), ('METR since 2023, 128.744 days', 128.744 / 30.44),
                     ('METR all models, 187.778 days', 187.778 / 30.44), ('earlier trend, 7 months', 7)]:
    out = []
    for label, mins in [('1 working week (40 h)', 2400), ('2 working weeks', 4800)]:
        d = math.log2(mins / h0) * months * 30.44
        out.append(f'{label} after {d:.0f} days')
    print(f'  {name}: ' + '; '.join(out))
print(f'  Anthropic steps: 90/4 = x{90/4:.1f} in a year (doubling every {12/math.log2(90/4):.1f} months); 720/90 = x{720/90:.0f} (every {12/math.log2(8):.1f} months)')
assert round(12 / math.log2(8), 1) == 4.0

print('# Two Lean proofs (OpenAI 8 Sep via Wayback, inputs/openai_navier_stokes.txt; Anthropic 4 Sep, inputs/anthropic_flt_lean.txt)')
print(f'  6B / 300B = {100*6/300:.1f}% (issue: 2%); 6B / 130B = {100*6/130:.1f}% (Navier-Stokes alone)')
assert round(100 * 6 / 300) == 2
print(f'  hours: OpenAI 88 + 17 = {88+17} h; Claude 11 x 24 = {11*24} h; tokens per hour {130/105:.2f}B against {6/264:.3f}B')

print('# Z.ai Figure 1 (inputs/zai_glm_inference_infra.txt): step ratios')
P = [(0, 1.0), (1, 1.21), (2, 1.42), (3, 1.41), (4, 1.97), (5, 2.49), (7, 2.67), (8, 2.67), (9, 2.67), (10, 2.85), (11, 3.01), (13, 3.22)]
steps = [(P[i][0], P[i][1] / P[i-1][1]) for i in range(1, len(P))]
print('  ' + ', '.join(f'day {d}: x{r:.2f}' for d, r in steps))
print(f'  largest step: day {max(steps, key=lambda x: x[1])[0]}; product of steps = {math.prod(r for _, r in steps):.2f}')
assert abs(math.prod(r for _, r in steps) - 3.22) < 1e-9

print('# Vera Rubin (SemiAnalysis, inputs/semianalysis_vera_rubin_agentx.txt)')
R = [(75, 37.94, 44.14, 64.0), (100, 28.47, 21.15, 59.38), (125, 12.01, 2.97, 51.55), (150, 5.14, 1.01, 36.98), (170, 3.92, 0.35, 21.78), (200, 2.73, None, 7.43)]
for tps, sg, trt, vr in R:
    best = max(sg, trt or 0)
    print(f'  {tps} tok/s: Rubin / best GB300 = {vr/best:.2f}x' + (f'; / TRTLLM = {vr/trt:.1f}x' if trt else ''))
assert round(64.0 / 44.14, 2) == 1.45 and round(36.98 / 5.14, 2) == 7.19 and round(21.78 / 3.92, 2) == 5.56
print(f'  per GW at 75 tok/s: revenue {159.5/114.9:.3f}x, profit {149.9/105.3:.3f}x; cost {159.5-149.9:.1f} and {114.9-105.3:.1f} $B')
assert round(159.5 / 114.9, 2) == 1.39 and round(149.9 / 105.3, 2) == 1.42

print('# BITCOS (arXiv 2609.16338, inputs/bitcos_table1.csv)')
trit = math.ceil(128 / 5) * 8 / 128
print(f'  five-trit in 128-weight blocks: ceil(128/5) = {math.ceil(128/5)} bytes, {trit} bits per weight; crossover z = {2-trit}')
assert trit == 1.625
rows = [r for r in csv.reader(l for l in open('inputs/bitcos_table1.csv') if not l.startswith('#'))][1:]
wins = 0
for r in rows:
    z = float(r[2]) / 100
    assert abs((2 - z) - float(r[3])) < 0.0011, r[1]
    wins += (2 - z) < trit
print(f'  2 - z reproduces all {len(rows)} "Symbols" values; BITCOS wins on {wins} of {len(rows)} (paper: 26 of 29)')
assert wins == 26
zmax = max(float(r[2]) for r in rows) / 100
print(f'  sparsest z = {zmax}: 2 - z = {2-zmax:.3f} (paper: 1.485)')
H = lambda z: -z * math.log2(z) - (1 - z) * math.log2((1 - z) / 2)
print(f'  entropy (+ and - equally likely): H(1/3) = {H(1/3):.3f} = log2 3; H(0.5) = {H(0.5):.3f} = 2 - 0.5; H({zmax}) = {H(zmax):.4f}')

print('# Bonsai 2 27B (inputs/bonsai2_27b_whitepaper.txt)')
print(f'  1.585 + 16/128 = {math.log2(3)+16/128:.3f} bits; 26.89B x 1.76 / 8 = {26.89*1.76/8:.2f} GB (5.93 GB stated); FP16 53.8 / 5.93 = {53.8/5.93:.1f}x')

print('# DeepSeek KV per token (inputs/zartbot_dsv41_flash.txt, model card, configs)')
v4 = 21 * (584 + 68) / 4 + 20 * 584 / 128
s1 = 4 * (584 + 68) / 4
s2 = 3 * (584 + 68) / 2 + (584 + 68)
s3 = 3 * (288 + 68) / 2 + (288 + 68)
print(f'  V4-Flash {v4:.2f}; reuse {s1:.0f}; relax m {s2:.0f}; FP4 {s3:.0f} B/token; net {v4/s3:.2f}x')
assert round(v4) == 3514 and s1 == 652 and s2 == 1630 and s3 == 890
v1 = 95 * 2 * 8 * 128 * 2; v3 = 61 * (512 + 64) * 2
print(f'  V1 67B {v1} B ({v1/890:.1f}x, card: 437x); V3 MLA {v3} B ({v3/890:.0f}x)')
assert v1 == 389120 and round(v1 / 890) == 437
for L in (131072, 1048576):
    print(f'  {L} tokens: V4.1-Flash {890*L/1e9:.2f} GB, V4-Flash {v4*L/1e9:.2f} GB, V3 {v3*L/1e9:.1f} GB, V1 {v1*L/1e9:.0f} GB')

print('# Huawei roadmap (inputs/huawei_connect_2025_xu_keynote.txt, huawei_connect_2026_wang_keynote.txt)')
q = lambda y, n: y * 4 + n
print(f'  960DT: Q4 2027 -> Q1 2027 = {q(2027,4)-q(2027,1)} quarters; 960PR: Q4 2027 -> Q3 2027 = {q(2027,4)-q(2027,3)}')
assert q(2027, 4) - q(2027, 1) == 3 and q(2027, 4) - q(2027, 3) == 1

print('# Harness tax (inputs/harnesstax_pairs.json)')
Pp = json.load(open('inputs/harnesstax_pairs.json'))
for b, pairs in [('SWE-bench Lite', [('Claude Code', 'Pi', 2.0), ('Claude Code', 'Codex', 1.6)]), ('Terminal-Bench 2.0', [('Claude Code', 'Pi', 1.5)])]:
    rows = [p for p in Pp if p['bench'] == b]
    models = sorted(set(p['model'] for p in rows))
    for a, c, pub in pairs:
        g = math.exp(sum(math.log(next(p for p in rows if p['model'] == m and p['harness'] == a)['cost_usd_per_rollout'] /
                                  next(p for p in rows if p['model'] == m and p['harness'] == c)['cost_usd_per_rollout']) for m in models) / len(models))
        print(f'  {b}: {a} / {c} cost, geometric mean {g:.2f}x (Arena: {pub}x)')
        assert round(g, 1) == pub

print('# Other checks in the item notes')
print(f'  Astra for Law: 54.0 / 38.7 = {54/38.7:.3f} (OpenAI: 40% relative)')
print(f'  Postgres planner: 1 - 1/1.81 = {100*(1-1/1.81):.1f}% (write-up: 44.7%); untrained failures 99/113 = {100*99/113:.1f}%')
print(f'  Step 5: 2.70 / 15.00 = {100*2.7/15:.1f}% of Kimi K3 output price')
print(f'  Atria Dawn: 744B at 1 byte = 744 GB (FP8, 755.7 GB on HF), at 2 bytes = 1,488 GB (BF16, 1,506.7 GB)')
print(f'  Nous refactor: 1,063,826 -> 698,363 lines = {100*(1-698363/1063826):.1f}% cut; $19,300 / 1,393 = ${19300/1393:.2f} per subagent')
assert round(100 * (1 - 698363 / 1063826), 1) == 34.4
