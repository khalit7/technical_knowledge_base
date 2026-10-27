#!/usr/bin/env python3
"""Every derived number shown on the 2026-09-28 page, with asserts on the published ones it reproduces.
Run from src/: python3 recompute.py"""
from math import log10
def pct(new, old): return (new / old - 1) * 100
def near(a, b, tol): assert abs(a - b) <= tol, (a, b)

print('-- Prices (v-price): Anthropic, OpenAI, xAI pages')
P = {'Opus 5 -> 5.5': ([5, 25, 0.5], [4, 20, 0.2]), 'GPT-5.6 Sol -> GPT-6 Sol': ([4, 20, 0.4], [2, 10, 0.2]),
     'GPT-5.6 Luna -> GPT-6 Luna': ([0.2, 1.2, 0.02], [0.1, 0.5, 0.01]), 'Grok 4.6 -> 4.7': ([2, 6, 0.5], [2, 6, 0.5])}
for k, (o, n) in P.items(): print(k, ['%.1f%%' % pct(a, b) for a, b in zip(n, o)])
near(-pct(0.5, 1.2), 58.3, 0.05)            # issue: Luna output down 58.3%
near(-pct(2, 4), 50, 1e-9); near(-pct(4, 5), 20, 1e-9); near(-pct(0.2, 0.5), 60, 1e-9)
def task(q, tin=300e3, ca=0.8, tout=20e3): return (tin * (1 - ca) * q[0] + tin * ca * q[2] + tout * q[1]) / 1e6
o, n = P['Opus 5 -> 5.5']; print('default task Opus 5 $%.3f -> 5.5 $%.3f (%.1f%%)' % (task(o), task(n), pct(task(n), task(o))))
print('AutomationBench: Sol is 9%% of Opus 5 per task -> %.1fx (issue: about nine times; OpenAI table: 11.1x); implied Opus 5 $%.2f' % (1 / 0.09, 0.27 * 11.1))

print('-- Tokens against spend (v-share): Vercel, August')
ratio = ((100 - 14) / (100 - 56)) / (14 / 56); print('closed-to-open price per token %.2fx' % ratio); near(ratio, 7.8, 0.05)
for r in (1, 1 / 1.5, 1 / ratio): print('margin at relative price %.3f: %+.0f%%' % (r, (1 - 1.5 * r) * 100))

print('-- Cost per checked result (v-sci): Anthropic nine loops, The Batch estimate')
lo, hi, hc = log10(2e6 / 2000), log10(22.5e6 / 1000), log10(22.5e6 / 100)
print('route vs swarm %.2f to %.2f orders; against the $100 compute part up to %.2f' % (lo, hi, hc))
near(lo, 3, 0.01); near(hi, 4.35, 0.01); near(hc, 5.35, 0.01)

print('-- Ord (v-ord): N agents = one agent with N^lambda tokens')
L = {'BrowseComp': 0.68, 'SEC-Bench Pro': 0.57, 'Terminal-Bench': 0.48}
t10 = [10 ** l for l in L.values()]; print('10 agents ->', ['%.2fx' % x for x in t10]); near(min(t10), 3.0, 0.05); near(max(t10), 4.8, 0.05)
near(16 ** 0.57, 4.9, 0.05)
need = [100 ** (1 / l) for l in L.values()]; print('agents to match 100x tokens', ['%.0f' % x for x in need]); near(min(need), 873, 1); near(max(need), 14678, 1)
print('4 agents at lambda 0.5: speed-up %.1f at %.1fx compute' % (4 ** .5, 4 ** .5))

print('-- Bits per weight (v-quant): dlab')
near(1.5 / 16 * 100, 9.4, 0.05)
print('35B at 1.5 bpw: %.2f GB (16-bit %.0f GB)' % (35 * 1.5 / 8, 35 * 2))
for p, m in ((125, 24), (550, 128), (125, 64), (550, 64)): print('%dB in %d GB: at most %.2f bits per weight, weights only' % (p, m, 8 * m / p))

print('-- Fusion (v-fusion table): Artificial Analysis Coding Agent Index v1.5')
near((1 - 7.90 / 12.39) * 100, 36, 0.3); print('tokens %.2fx, steps %.2fx' % (9.69 / 5.72, 99.5 / 36.7))

print('-- JitMem (v-jit): efficiency table, ALFWorld, GPT-5.4 executor')
print('memory part of the prompt: ReasoningBank %.1fK, JitMem %.1fK over 9.0K' % (19.7 - 9.0, 9.8 - 9.0))

print('-- Checks quoted in notes')
print('llama.cpp prompt lookup: 165.48/3.98 = %.1fx; 165.48/1.18 = %.0fx' % (165.48 / 3.98, 165.48 / 1.18)); near(165.48 / 1.18, 140, 0.5)
print('Jev cost ratios: Terra %.1fx, Sonnet 5 %.1fx' % (0.06 / 0.0007, 0.12 / 0.0007))
print('"Do not guess": %.1f points, %.0f%% relative' % (70.7 - 20.2, (1 - 20.2 / 70.7) * 100))
print('OpenAI DNS run: alert 10:02:11 to kill 12:34:30 = %d min' % ((12 * 60 + 34.5) - (10 * 60 + 2 + 11 / 60)))
print('vLLM portable layers: 100 - 96.6 = %.1f%% (geometric mean, not a ceiling)' % (100 - 96.6))
print('Akamai: $11.6B / 7 years = $%.2fB a year' % (11.6 / 7))
print('all asserts passed')
