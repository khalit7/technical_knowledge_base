#!/usr/bin/env python3
"""Every derived number in the 2026-11-16 issue and its visuals, recomputed from the figures the sources state.
Run from src/; fails on any mismatch."""
def close(a, b, tol=0.05): assert abs(a - b) <= tol, (a, b)
# Fable 5.2 price cut: $10/$50 to $8/$40 is 20% on both
close((10 - 8) / 10, 0.20, 1e-9); close((50 - 40) / 50, 0.20, 1e-9)
# Fable 5.2 65 vs Carbon 60 on AA v5.0.1: five points; open-closed gap 65 - 46 = 19; earlier 58 - 46 = 12, 59 - 46 = 13
assert 65 - 60 == 5 and 65 - 46 == 19 and 58 - 46 == 12 and 59 - 46 == 13
# Hydrogen $1.50 / $7.50 is twice Gemini 3.8 Flash's introductory $0.75 / $3.75
assert 1.50 == 2 * 0.75 and 7.50 == 2 * 3.75
# Muse Ember $0.14 per task against Haiku 5.5 $0.41: about a third
close(0.14 / 0.41, 1 / 3, 0.02)
# Dense rewards: budget 12.25M tokens; 584 GRPO updates, 50 MC updates; tokens per iteration and the rollout share
B = 12.25e6
close(B / 584, 20976, 1); close(B / 50, 245000, 1)
assert round(B / 584 / 1000) == 21 and round(B / 50 / 1000) == 245
assert 584 // 2 == 292 and 50 // 2 == 25 and 584 - 50 == 534
close(0.09 * B / 50 / (B / 584), 1.05, 0.01)  # the MC iteration's trained-on completions are about one GRPO iteration
# Team-GRPO retained fraction of a pairwise bonus: (K-m)/(m(K-1)), m=2
from fractions import Fraction as Fr
assert [Fr(K - 2, 2 * (K - 1)) for K in (2, 4, 8)] == [0, Fr(1, 3), Fr(3, 7)]
# Anthropic: Q2 operating income 974 to Q3 operating loss 567 ($M)
assert 974 + 567 == 1541
print('all derived numbers check')
