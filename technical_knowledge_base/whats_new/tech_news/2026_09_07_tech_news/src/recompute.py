#!/usr/bin/env python3
"""Recompute every derived number the 2026-09-07 issue page shows. Run from src/.
Inputs are saved source text in inputs/ (read 2026-10-02). Asserts check that defaults land on published figures."""
import json

print('# ARC-AGI-3 Semi-Private, ARC Prize table (inputs/arcprize_astra.txt)')
STD = {'max': (62.7, 26098), 'xhigh': (59.3, 37317), 'high': (54.8, 40705), 'medium': (38.6, 48090), 'low': (17.5, 38166), 'none': (35.2, 49791)}
ADP = {'max': (98.6, 17332), 'xhigh': (98.4, 18147), 'high': (99.9, 18817), 'medium': (98.4, 19285), 'low': (98.0, 21298), 'none': (96.7, 23457)}
print(f'  issue gap: adapter high 99.9 - standard max 62.7 = {99.9-62.7:.1f} points (two different efforts)')
for e in STD: print(f'  same effort {e}: {ADP[e][0]:.1f} - {STD[e][0]:.1f} = {ADP[e][0]-STD[e][0]:.1f} points')
gaps = [ADP[e][0]-STD[e][0] for e in STD]
assert round(min(gaps), 1) == 35.9 and round(max(gaps), 1) == 80.5
print(f'  adapter high is cheaper than standard max by {100*(1-18817/26098):.1f}%')

print('# GPT-6 Astra scope evaluation (inputs/openai_astra.txt)')
print('  GPT-5.6 Sol went beyond the authorised target in 48% of cases, so it stayed in scope in 52%; Astra 0%, so 100% in scope')

print('# Claude Fable 5.1 cache reads (inputs/anthropic_fable51.txt, vb_fable51.txt)')
print(f'  cut: 1 - 0.25/1.00 = {100*(1-0.25/1.00):.0f}%; cache read as share of base input: 0.25/10 = {100*0.25/10:.1f}% (VentureBeat: 2.5%)')
for s, lbl in [(25, 'typical'), (45, 'highly agentic')]:
    print(f'  {lbl}: a {s}% saving from a 75% cut implies cache reads were {s/0.75:.0f}% of the Fable 5 bill (derived)')

print('# Gemini 3.8 Flash (inputs/google_gemini38.txt, register_gemini38.txt)')
print(f'  introductory $0.75 / $3.75 doubles to $1.50 / $7.50 from 2027-01-01: x{1.50/0.75:.0f} and x{7.50/3.75:.0f}')
print(f'  Fable 5.1 per task against Gemini 3.8 Flash on the index of the time: 3.76 / 0.58 = {3.76/0.58:.1f}x (Register: "about 6x")')

print('# GLM-5.3-Flash KV cache from config.json (inputs/glm53flash_config.json, glm53_config.json)')
f = json.load(open('inputs/glm53flash_config.json'))['text_config']; g = json.load(open('inputs/glm53_config.json'))
nlin = f['layer_types'].count('linear_attention'); nsp = f['layer_types'].count('deepseek_sparse_attention')
F53 = g['indexer_types'].count('full')
assert (f['num_hidden_layers'], nlin, nsp, g['num_hidden_layers'], F53) == (45, 34, 11, 78, 21)
per53 = g['kv_lora_rank'] + g['qk_rope_head_dim']          # 576 latent per token per layer
perF = f['kv_lora_rank'] + f['qk_rope_head_dim']           # 512 (NoPE MLA)
idxF = f['index_head_dim'] / f['index_kpool']                # 128 pooled 4:1 -> 32
state = f['linear_attn_config']['num_heads'] * f['linear_attn_config']['head_dim'] ** 2  # KDA state per layer
for T in (131072, 1048576):
    a = (78 * per53 + F53 * g['index_head_dim']) / 78
    b = (nsp * (perF + idxF) + nlin * state / T) / 45
    bt = (nsp * (perF + idxF) * T + nlin * state)
    at = (78 * per53 + F53 * g['index_head_dim']) * T
    print(f'  T={T:>8}: per-layer average {a:.1f} vs {b:.1f} elements per token = {a/b:.2f}x (Z.ai: 4.4x / 4.44x); whole model {at/bt:.2f}x; '
          f'BF16 cache GLM-5.3 {at*2/2**30:.1f} GiB vs Flash {bt*2/2**30:.1f} GiB')
print(f'  without IndexPool at 1M: {(78*per53+F53*128)/78 / ((nsp*(perF+128)+nlin*state/1048576)/45):.2f}x')

print('# AI Research Preference Models (inputs/arxiv_2608.13940.txt, mtp_rpm.txt)')
print(f'  24 h / 14.88 h = {24/14.88:.2f}x; 24 / 15.50 = {24/15.50:.2f}x (MarkTechPost: 1.61x and 1.55x)')
assert round(24/14.88, 2) == 1.61 and round(24/15.50, 2) == 1.55

print('# Mercor 397B RL (inputs/mercor_skyrl.txt)')
print(f'  APEX-Agents Pass@1 16.11% -> 27.29%: +{100*(27.29/16.11-1):.1f}% relative (post: "70%")')
assert round(100*(27.29/16.11-1)) == 69

print('# Fermat (inputs/anthropic_flt.txt)')
print(f'  theorems proved but unused: 30,300 - 29,500 = {30300-29500:,} ({100*(30300-29500)/30300:.1f}%)')

print('# OpenAI GPU allocation the week after Aug 7 (inputs/neuron_openai.txt)')
cut, rise, offset = 0.592, 0.172, 0.85
ratio = offset * cut / rise           # others / Astra-class before
a = 1 / (1 + ratio)
print(f'  others / Astra-class before = 0.85 x 0.592 / 0.172 = {ratio:.2f}; Astra-class share before = {100*a:.1f}%')
after_a, after_o = a * (1 - cut), (1 - a) * (1 + rise)
print(f'  after: Astra-class {100*after_a:.1f}, others {100*after_o:.1f}, total {100*(after_a+after_o):.1f} of the week-before total '
      f'(down {100*(1-after_a-after_o):.1f}%); a naive reading of "cut 59.2%" as all compute would be 40.8')
print(f'  the cut removed {100*a*cut:.1f}% of total allocation and the rise added back {100*(1-a)*rise:.1f}%')
assert abs((after_o - (1 - a)) - offset * (a - after_a)) < 1e-9

print('# Money by kind (inputs/cog_tfn.txt, tm_tfn.txt, tc_nvidia_hf.txt)')
print(f'  Cognition $47B / $26B (May) = {47/26:.2f}x (+{100*(47/26-1):.0f}%); revenue $492M -> $900M+ = {900/492:.2f}x')
print(f'  Thinking Machines $40B / $12B seed = {40/12:.2f}x; $40B against $50B sought = {100*(1-40/50):.0f}% below')
print(f'  Hugging Face $12.93B / $4.5B (2023) = {12.93/4.5:.2f}x')

print('# Index v4.1.1 (Sep 2, AA articles) against v4.3 (Oct 1 snapshot) for the same models')
pairs = {'Fable 5.1 max': ((66, 3.76), (53.4, 7.63)), 'Muse 1.3 xhigh': ((61, 0.55), (45.1, 1.37)), 'Sol max': ((61, 0.95), (47.0, 1.99)),
         'Grok 4.6 high': ((61, 0.94), (44.3, 1.86)), 'GLM-5.3 max': ((60, 0.68), (44.8, 2.01)), 'Gemini 3.8 Flash high': ((59, 0.58), (40.9, 1.24))}
for k, ((i1, c1), (i3, c3)) in pairs.items(): print(f'  {k}: {i1} -> {i3} ({i3-i1:+.1f} points); ${c1} -> ${c3} ({c3/c1:.1f}x)')
d = [i1 - i3 for (i1, _), (i3, _) in pairs.values()]; x = [c3 / c1 for (_, c1), (_, c3) in pairs.values()]
print(f'  range: {min(d):.1f} to {max(d):.1f} points lower; cost x{min(x):.1f} to x{max(x):.1f}')
print('  v4.1.1: cheapest at 59+: Muse 1.3 xhigh $0.55 < Gemini 3.8 Flash $0.58 (both AA, Sep 2); v4.3: GLM-5.3-Flash 41.8 at $0.25 beats Gemini 3.8 Flash 40.9 at $1.24')

print('# Portal by Spotify routing, illustrative session (inputs/spotify_portal.txt)')
TOK = 10  # illustrative tokens per line of Java
base = 12000
turns = [  # (label, without: new context tokens, output tokens; with: new context, output, worker tokens)
    ('5 files, 4,100 lines', 4100 * TOK, 300, 410 * TOK, 300, 4100 * TOK),
    ('follow-up on the same files', 0, 300, 1200, 300, 4100 * TOK),
    ('tests from a 600-line reference', 600 * TOK, 4500, 150, 0, 600 * TOK + 4500),
    ('targeted read, 60 lines', 600, 200, 600, 200, 0),
    ('debug a 300-line file', 3000, 1500, 3000, 1500, 0)]
for lane, (ci, co, wk) in {'without': (1, 2, None), 'with': (3, 4, 5)}.items():
    ctx, proc, out, work = base, 0, 0, 0
    for t in turns:
        ctx += t[ci] + t[co]; proc += ctx; out += t[co]
        if wk: work += t[wk]
    print(f'  {lane}: final context {ctx:,}; input processed over 5 turns {proc:,}; output {out:,}; worker tokens {work:,}')
print(f'  turn 1 bulk read: {41000:,} -> {4100:,} tokens in Claude\'s context = {100*(1-4100/41000):.0f}% fewer (by construction: the post\'s "around 90%")')
