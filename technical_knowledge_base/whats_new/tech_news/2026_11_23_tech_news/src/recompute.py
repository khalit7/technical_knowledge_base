#!/usr/bin/env python3
"""Every derived number in the 2026-11-23 issue and its visuals, recomputed from the figures the sources state.
Run from src/; fails on any mismatch."""
import math
def close(a, b, tol=0.05): assert abs(a - b) <= tol, (a, b)
# GPT-6.2 Astra: $10/$50 (GPT-6 Astra) to $8/$40 is 20% on both
close((10 - 8) / 10, 0.20, 1e-9); close((50 - 40) / 50, 0.20, 1e-9)
# AA v5.0.1 read 23 Nov: Fable 65, Astra 62, Neon 61: three points behind, four points across the top three; cost spread 6.6x
assert 65 - 62 == 3 and 65 - 61 == 4
assert round(26.54 / 4.00, 1) == 6.6
assert round(4.00 / 26.54 * 7) == 1  # "about a seventh"
# ARC-AGI-3 standard harness: Fable 81.2 - Astra 70.3 = 10.9
close(81.2 - 70.3, 10.9, 1e-9)
# Vals: Fable 71.31 - Neon 70.87 = 0.44; top five within 1.2 (71.31 - 70.14 = 1.17)
close(71.31 - 70.87, 0.44, 1e-9); assert 71.31 - 70.14 <= 1.2
# Neon $3/$15 is twice Hydrogen's $1.50/$7.50
assert 3 == 2 * 1.50 and 15 == 2 * 7.50
# The frontier of the cost chart: Sol, Astra, Fable
M = [('Fable 5.2', 65, 26.54), ('Astra', 62, 4.00), ('Neon', 61, 6.44), ('Carbon', 60, 7.76), ('Opus 5.5', 59, 10.04), ('Sol', 57, 1.01)]
front = sorted([a for a in M if not any(b != a and b[1] >= a[1] and b[2] <= a[2] and (b[1] > a[1] or b[2] < a[2]) for b in M)], key=lambda m: m[2])
assert [m[0] for m in front] == ['Sol', 'Astra', 'Fable 5.2'], front
# Anthropic IPO: 956,351,354 + 23,648,646 = 980M shares at $83 = $81.3B; first-day close 97.17 vs 83 = +17%
assert 956351354 + 23648646 == 980000000
close(980e6 * 83 / 1e9, 81.3, 0.06); close(97.17 / 83 - 1, 0.17, 0.005)
# Budget internalization: AIME mean length at 64K, 27.32K to 4.97K for Qwen3.5-4B
assert round(27.32, 1) == 27.3 and round(4.97, 1) == 5.0
# Pool animation, illustrative distribution: at T=2 the tail holds most of the mass, at T=1 little; top-nsigma's set is scale invariant
Z = [10, 9.4, 9.1, 8.6] + [6.6 - 3.4 * (i - 4) / 25 for i in range(4, 30)]
def probs(T):
    e = [math.exp(z / T) for z in Z]; et = (128000 - 30) * math.exp(-4.5 / T); s = sum(e) + et; return [v / s for v in e], et / s
p1, t1 = probs(1); p2, t2 = probs(2)
assert t1 < 0.05 and t2 > 0.8 and p1[0] > 0.35, (t1, t2, p1[0])
import statistics
def nsig(T, n=1.0):  # top-nsigma: keep logits within n standard deviations of the top one
    z = [v / T for v in Z]; sd = statistics.pstdev(z); return [i for i, v in enumerate(z) if v >= max(z) - n * sd]
assert nsig(1) == nsig(2)  # dividing every logit by T scales the gaps and the deviation alike
print('all derived numbers check')
