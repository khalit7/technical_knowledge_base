#!/usr/bin/env python3
"""Every derived number in the 2026-10-19 issue and its visuals, recomputed from the figures the sources state.
Run from src/; fails on any mismatch."""
def close(a, b, tol=0.05): assert abs(a - b) <= tol, (a, b)
# Haiku 5.5 against Haiku 4.5 (Anthropic): $0.10/$0.50 up to 100K against $1/$5
close(1 - 0.10 / 1.0, 0.90); close(1 - 0.50 / 5.0, 0.90)            # "90% below"
# Sonnet 5.5 cache read cut: $0.20 -> $0.10
close(1 - 0.10 / 0.20, 0.50)
# Nebius on-demand price rises (Uvik index citing Nebius)
close((4.50 - 3.85) / 3.85 * 100, 16.9, 0.1)   # "+17%"
close((5.40 - 4.50) / 4.50 * 100, 20.0, 0.1)
# Terminal-Bench 4.0 on Vals: GPT-6.1 Sol $1.72 per test against Opus 5.5 $13.20, "about an eighth"
close(13.20 / 1.72, 7.67, 0.01)
# Cost chart stats (Artificial Analysis, $ per index task)
close(0.84 / 0.26, 3.23, 0.01)                 # Muse Spark Open "3.2x the cost" of DeepSeek 1017
assert 45 - 39 == 6
close(5.98 / 0.72, 8.31, 0.01)                 # GPT-6.1 Sol "8.3x cheaper" than Opus 5.5
assert 58 - 52 == 6
# ARC-AGI-3 harness gains (ARC Prize): adapter minus standard
gains = [99.95 - 62.7, 96.2 - 52.7, 97.5 - 49.8]
close(gains[0], 37.25, 0.001); close(gains[1], 43.5, 0.001); close(gains[2], 47.7, 0.001)
close(sum(gains) / 3, 42.8, 0.02)              # "+42.8 points" average
assert 55 - 42 == 13                           # Argon standard run: 13 of 55 tasks stopped early
# OpenAI math repository: 300 of 719 top-line results formalised
close(300 / 719 * 100, 41.7, 0.05)             # "about 42%"
# Gemini 4 Argon price after 30 November doubles: $2/$10 -> $4/$20
assert (4, 20) == (2 * 2, 10 * 2)
# Mistral Large 4 HN: largest model thread (2,043) above Argon's 1,705 and 1,466
assert 2043 > 1705 > 1466
# Micron: quarterly revenue $54.23B against $11.32B a year earlier
close(54.23 / 11.32, 4.79, 0.01)
print('all derived numbers check')
