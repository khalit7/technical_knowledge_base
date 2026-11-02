#!/usr/bin/env python3
"""Every derived number in the 2026-11-02 issue and its visuals, recomputed from the figures the sources state.
Run from src/; fails on any mismatch."""
def close(a, b, tol=0.05): assert abs(a - b) <= tol, (a, b)
# Open-weight gap on Artificial Analysis: v4.3.2 Opus 5.5 58 vs Kimi K3.1 Pro 55; v5 launch 58 vs 46; with Carbon 59 vs 46
assert 58 - 55 == 3 and 58 - 46 == 12 and 59 - 46 == 13
# Alphabet Q3: operating cash flow 42.3 minus purchases of property and equipment 51.4 = free cash flow -9.1 ($B)
close(42.3 - 51.4, -9.1, 0.001)
# Cursor marketplace window: 2:27am to 1:35pm PT = 11 h 08 min, "about 11 hours"
assert (13 * 60 + 35) - (2 * 60 + 27) == 668
# Fair Cast matched seed-pairs: 18 ahead + 6 level + 1 behind = 25
assert 18 + 6 + 1 == 25
# Anthropic S-1: H1 2026 revenue 16,286 includes Q2 11,555, so Q1 4,731
assert 16286 - 11555 == 4731
# Meta: $25B forward sale + $12.5B mandatory convertible = $37.5B
close(25 + 12.5, 37.5, 0.001)
# Postgres: 1,169 commits against 724, about 61% more (stated as counts only)
close((1169 - 724) / 724 * 100, 61.5, 0.1)
# Rounding animation: bf16 spacing near 0.03 is 2^-13; an update of 1e-6 a step first moves a round-to-nearest copy at step 62
import math
ulp = 2 ** -13; assert 2 ** -6 <= 0.03 < 2 ** -5 and ulp == 2 ** -6 * 2 ** -7
assert math.ceil((ulp / 2) / 1e-6) == 62
close(ulp, 0.000122, 0.000001)
print('all derived numbers check')
