#!/usr/bin/env python3
"""Every derived number in the 2026-10-26 issue and its visuals, recomputed from the figures the sources state.
Run from src/; fails on any mismatch."""
def close(a, b, tol=0.05): assert abs(a - b) <= tol, (a, b)
# Kimi K3.1 Pro on Artificial Analysis v4.3.2: 55 against Opus 5.5's 58, "three points from the top"
assert 58 - 55 == 3
# Cost chart stats ($ per index task, Artificial Analysis): Opus 5.5 5.98, K3.1 Pro 1.98, DeepSeek 1017 0.26
close(5.98 / 1.98, 3.0, 0.05)                 # "3.0x cheaper"
assert 55 - 45 == 10                           # "+10 points" over the open leader
close(1.98 / 0.26, 7.6, 0.05)                  # "7.6x the cost of DeepSeek 1017"
# Vals Terminal-Bench 4.0 cost per test: K3.1 Pro $4.57 against Opus 5.5 $13.20 (stated, ratio not printed)
assert 4.57 < 13.20
# Cloudflare code review: $2.43 to $0.77 per review, "68%"
close((2.43 - 0.77) / 2.43 * 100, 68.3, 0.1)
# vLLM push-based KV transfer: TTFT 1,744 ms to 540 ms ("up to 3x better")
close(1744 / 540, 3.23, 0.01)
# TorchTPU validation: 4,821 of 4,917 models run, "98%"
close(4821 / 4917 * 100, 98.0, 0.1)
# Qwen3-Coder persona study: 1,144 exploitable of 1,840 apps overall (70% and 59% are per-persona rates)
close(1144 / 1840 * 100, 62.2, 0.1)
# Fable 5.1 image messages: 39 of 50 recovered (78%)
close(39 / 50 * 100, 78.0, 0.01)
# UK AISI incident: 9 of 43 runs
close(9 / 43 * 100, 20.9, 0.1)
# GRAFT animation (paper figures): penalty 25.9% undetected; GRAFT 38.5% before ablation, 1.6% after; task score 79.2 vs 60.2
assert 38.5 > 25.9 > 1.6; close(79.2 - 60.2, 19.0, 0.001)
print('all derived numbers check')
