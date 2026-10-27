#!/usr/bin/env python3
"""Recompute every derived number the page shows. Run from src/. Inputs are in inputs/ (saved source text).
Each block names the source; asserts check that a default lands on the published figure."""

def pct(a, b): return 100 * (b - a) / a

print('# StateM (arXiv 2608.15089, inputs/statem_abs.txt; PDF pp. 1, 4)')
for k, s, n in [('Sol xhigh raw', 424, 445), ('drop 4 flagged', 420, 445), ('drop all 9 flagged', 415, 445),
                ('DeepSeek-V4 Flash full', 392, 445), ('DeepSeek-V4 Flash 88-task core', 392, 440)]:
    print(f'  {k}: {s}/{n} = {100*s/n:.2f}%')
assert round(100*424/445, 2) == 95.28 and round(100*392/445, 2) == 88.09 and round(100*392/440, 2) == 89.09
print(f'  cost ratio 574.68 / 15 = {574.68/15:.1f}x (paper: 38.9x, which implies ${574.68/38.9:.2f}, "approximately $15")')
print(f'  cost ratio 574.68 / 52.22 = {574.68/52.22:.1f}x (paper: 11.0x)')
assert round(574.68/52.22, 1) == 11.0
print(f'  gains: GPT-5.5 xhigh 83.1 -> 92.1 = +{92.1-83.1:.1f} pts; Luna 76.7 -> 85.4 = +{85.4-76.7:.1f}; DeepSeek 82.7 -> 88.1 = +{88.1-82.7:.1f}')

print('# Nvidia AVO (inputs/nvidia_avo_blog.txt)')
print(f'  actions 6,624 vs VISTA 7,542: {100*(1-6624/7542):.1f}% fewer (blog: "approximately 12%")')
assert round(100*(1-6624/7542)) == 12

print('# DiffusionGemma (arXiv 2608.00146, inputs/dgemma_html.txt)')
C, P = 256, 12
print(f'  AR: {C} forward passes for one {C}-token block (1 token per pass)')
for tpf in (3, 4.5, 6):
    print(f'  AR + speculative decoding at {tpf} tokens per pass: {C/tpf:.1f} passes')
print(f'  diffusion: about {P} passes per block (max 48) -> {C/P:.1f} tokens per pass (report: "around 20 TPF" averaged over the suite)')
print(f'  measured: 1,479 vs 303 tok/s = {1479/303:.2f}x (report: "nearly 5x")')
assert round(1479/303, 1) == 4.9
tD, tA = C/1479, C/303
print(f'  time for {C} tokens: diffusion {tD*1000:.0f} ms, AR+MTP {tA*1000:.0f} ms (derived, decode only)')
print(f'  implied time per diffusion pass at {P} passes: {tD/P*1000:.1f} ms (derived)')
for tpf in (3, 6):
    print(f'  implied time per AR+MTP pass at {tpf} TPF: {tA/(C/tpf)*1000:.1f} ms (derived)')
print(f'  pass ratio at 4.5 TPF: {(C/4.5)/P:.1f}x fewer passes, against 4.9x measured speed: each diffusion pass costs about {((C/4.5)/P)/(1479/303):.1f}x an AR+MTP pass (derived, illustrative TPF)')

print('# DeepSeek vision limits (inputs/deepseek_vision_wb20260821.txt; inputs/deepseek_vision.txt)')
print(f'  Aug 2026: 600 images x 384 tokens = {600*384:,} tokens max of image input per request')
print(f'  Oct 2026: 600 images x 1,024 tokens = {600*1024:,}')
assert 600*384 == 230400

print('# Memory prices (inputs/toms_memory.txt, PCPartPicker averages Aug 2025 -> Aug 2026)')
rows = [('DDR5 4800 2x16GB', 90, 425, 372), ('DDR5 5200 2x16GB', 100, 480, 380), ('DDR5 5600 2x16GB', 116, 528, 355),
        ('DDR5 6000 2x16GB', 108, 572, 429), ('DDR5 5600 2x32GB', 191, 1118, 485), ('DDR5 6000 2x32GB', 222, 1272, 473),
        ('DDR4 3200 2x8GB', 63, 163, 159), ('DDR4 3600 2x8GB', 75, 165, 120), ('DDR4 3200 2x16GB', 105, 281, 168),
        ('DDR4 3600 2x16GB', 120, 307, 156), ('DDR4 3200 2x32GB', 222, 614, 177), ('DDR4 3600 2x32GB', 300, 789, 163)]
for k, a, b, p in rows:
    print(f'  {k}: ${a} -> ${b}: {pct(a,b):.1f}% (table {p}%), x{b/a:.2f}')
    assert abs(pct(a, b) - p) < 1.5, k
print(f'  128GB DDR5-6400: $3,399 best US price vs $329 lowest ever = x{3399/329:.2f} (+{pct(329,3399):.0f}%), the source\'s "ten times"')
print(f'  a naive year-ago price from "+500%": 3,399 / (1 + 5) = ${3399/6:.0f} (not stated anywhere in the source)')
print(f'  32GB DDR5-6000: $392 vs $72 lowest ever = x{392/72:.2f}')

print('# Money (inputs/tc_stripe.txt, tc_hf13.txt, fu_nvidia_hf.txt)')
print(f'  OpenRouter: $7.5B reported price / $1.3B May valuation = {7.5/1.3:.1f}x')
print(f'  Hugging Face: $13B reported offers / $4.5B 2023 valuation = {13/4.5:.1f}x; Nvidia deal $12.93B / $4.5B = {12.93/4.5:.1f}x')
print(f'  founders $1.5B + investors $6B = ${1.5+6:.1f}B (NYT via TechCrunch)')
assert 1.5 + 6 == 7.5
