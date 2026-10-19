# Other notable providers: visualisation ideas

Central question: what does each long-tail lab make cheap or possible that a frontier API does not? Visuals are worth building when they make one lab's constraint measurable, or put every lab on the same axes.

Scoring: 0 to 2 per question (parameter to move; reproduces a published figure (x2); computable from public data (x2); shows what a sentence cannot; corrects a misconception; measures the central question; absent elsewhere; animatable against the method it replaced), minus build cost.

## Built (ranked)
1. **Compare labs tab** (score 13). Every lab in one row on the same axes: constraint, headline release, openness/licence, total/active, architecture, price, AA v4.3, evidence. Filter by constraint and openness, sort by any axis, click for the reason to track it. Data: parts/15a_cmp_data.js, each value from the source linked in its Reading section. This is the page-specific requirement (compare on the same axes, not a list). Tab: answers "across all labs, how does Y vary".
2. **Cache animation, transformer vs hybrid** (score 15, inline in Memory per token). One sequence grows from 1 to 1,048,576 tokens through Qwen3-30B-A3B and Nemotron 3 Nano, per layer, to scale, captions per step, counters (cache, ratio, sequences that fit on 1 or 8 H100s), play/pause/step/scrub/speed, on-screen and visible-tab only, paused under reduced motion. Formulas: KV/token = attention layers x KV heads x head_dim x 2 x 2 bytes (Qwen 48x4x128x2x2 = 96 KiB; Nano 6x2x128x2x2 = 6 KiB); Mamba state 64x64x128x4 B + conv (4096+2x8x128)x3x2 B = 2.035 MiB x 23 layers. Configs: https://huggingface.co/Qwen/Qwen3-30B-A3B/blob/main/config.json, https://huggingface.co/nvidia/NVIDIA-Nemotron-3-Nano-30B-A3B-BF16/blob/main/config.json. Reproduces "hundreds of KiB to a few KiB" independently (Llama 3.1 70B 320 KiB). Crossover 533 tokens (recompute.out).
3. **Training-sync animation, sync every step vs DiLoCo** (score 14, inline in Openness). Four nodes on a time axis, INTELLECT-1 Table 2 timings (38 min per 100 inner steps; all-reduce 103/382/469 s), region select. Reproduces 95.7/85.6/83.0% utilisation independently (global computes 82.9, rounding). Sync-every-step side is an extrapolation (4x bytes, time proportional), labelled. https://arxiv.org/abs/2412.01152
4. **Two levers: bits per weight vs active parameters** (score 12, inline in Auditability). Memory = params x bits / 8; compute ≈ 2 x active. Checks published hardware claims: Bonsai 5.94 GB / 9.09x (by construction), Hy4 1.56 TB = 2.03 bytes/param, Command A two GPUs only at 8-bit, NST W4A4 on one B200 or two H100s.
5. **AA v4.3 index vs cost per task** (score 10, inline in Open scale). Long-tail labs highlighted against all others, frontier line. Data: topic-llms/aa_snapshot.json (v4.3, methodology v4.3.2, read 2026-10-01). Shows MiMo-V2.6-Pro on the cost frontier at $0.133.
6. **Scale and sparsity tab** (score 11). Release date vs total (dot area = active), and total vs active with sparsity lines; references grey from release_history.json. Shows Xiaomi and Tencent were open at this scale before their current lines, and the crowded September 2026.

## Rejected
- Price-history, business-ledger, training-bill tabs: excluded by Khalid's DeepSeek decisions; the MiMo RL cost is one number, kept in text.
- Benchmark table per vendor: almost all vendor-only on incomparable versions (TB 2.1 vs 4.0, DeepSWE unversioned); would splice metrics.
- Ternary quantisation animation for Bonsai: the mechanism is one formula; the two-lever chart teaches more.
- Naive SWA/DSA attention-pattern diagram: belongs on the DeepSeek / attention pages; one line suffices here.
- Fugu routing animation: no published routing data; would be illustrative only.

## What the methodology lacked here
A rule for breadth pages with many small subjects: the "same axes" table needs an explicit evidence column (vendor / independent / mixed), and dots for models with missing active counts need a labelled fallback rather than omission.
