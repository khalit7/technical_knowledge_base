# Training Infrastructure: visualisation ideas

The question the page keeps returning to: **how much of a big run's wall-clock time becomes training, and what infrastructure buys the rest back?** Failures arrive in proportion to cluster size; each costs a restart plus the work since the last checkpoint; each checkpoint costs a pause. Every design on the page (async saves, in-memory tiers, hot spares, replica groups) moves one of those three terms.

## What already exists (so this page does not repeat it)

| Where | Visual | Consequence here |
|---|---|---|
| Llama 3 paper page, Reading | Table 5 bars with the 30.1% misprint found; predict "how often did the job stop" | Linked; Reading lists the counts in one sentence and carries the corrected 64.0% |
| Llama 3 paper page, Run the 16K-GPU job | 54-day replay at 466/54 per day with checkpoint interval, restart and pause sliders, automated against manual (+2 h); I* = √(2s/λ); 4D rank mapper with the 3,072-GPU pods | Linked. The animation here is one day across four recovery designs, and the calculator varies cluster size and failure rate, which the replay fixes at Llama 3 |
| Root, What goes wrong table | One row: 419 interruptions, >90% effective time | Linked; this page owns the detail |
| Root, Price list and Scaling calculator | Dollars, GPU-hours, FLOPs | Linked; the calculator here converts lost ETTR into GPU-hours only |
| Distributed Training | Parallelism animation, layout calculator, framework list by parallelism | Linked; the framework list here is about operating a job |

## Candidates, scored

Scores 0 to 2: parameter to move (Q), reproduces a published figure (R, ×2), computable from public data (C, ×2), shows what a sentence cannot (S), corrects a misconception (M), measures the central question (X), absent elsewhere (A), step animation against the method it replaced (N); build cost subtracted (B).

| # | Idea | Q | R×2 | C×2 | S | M | X | A | N | −B | Total | Decision |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | **Goodput calculator**: GPUs (log, 64 to 262,144), failure rate per 1,000 server-days (Llama 3 3.79 derived, Meta RSC-1 6.50, RSC-2 2.34), checkpoint pause (presets 5 min, 148.8 s, 10 s, 6.3 s), restart, optimal or fixed interval; MTBF, Young/Daly interval, ETTR, GPU-hours lost split into pauses, rework, restarts; ETTR against GPUs (your settings, 5 min, 10 s; Llama 3 and ByteRobust points) and against interval; checkpoint size and write floor | 2 | 4 (Meta's 1.8 h and 0.23 h independently; Llama 3's 419 by construction; >90% by construction; Meta's 12,000-GPU "~10 s" sentence for restarts of 5 to 10 min) | 4 | 2 | 2 (MTBF is a property of the job; restart, not checkpoint, dominates at 131K) | 2 | 1 (the Llama page fixes N and the rate) | 0 | −2 | 15 | **built, own tab** ("across all cluster sizes, how does goodput change") |
| 2 | **One day of a 16,384-GPU run, four ways**: the same 8 seeded failures (Llama 3 rate, causes drawn from Table 5) through synchronous, asynchronous, in-memory plus hot spare, and torchft replica groups; lanes to scale on 24 h, lost work recoloured red when a failure hits, zoom on each failure, counters per design, a caption per failure naming each lane's checkpoint and loss | 1 | 2 (simulated day lands near the formula's 69.5 / 85.3 / 93.2 / 99.8%) | 4 | 2 | 2 (async is not free: a failure during the background write falls back one checkpoint) | 2 | 2 | 2 | −2 | 15 | **built, Reading** (the before/after) |
| 3 | **The stack, with one failure walked through it**: eight clickable layers (what each owns, sourced), a 7-step walk of an HBM3 error, toggle to torchft where steps 3 to 7 change | 0 | 0 | 2 | 2 | 1 (gang scheduling; all GPUs stop, not one) | 1 | 2 | 2 | −1 | 9 | **built, Reading**, compact; no numbers, so no timings invented |
| 4 | Table 5 as an interactive chart | 1 | 2 | 4 | 1 | 1 | 1 | 0 (built twice on the Llama 3 page) | 0 | −1 | 9 | rejected: duplicate; linked |
| 5 | Cluster topology to scale (NVLink domain, 3,072-GPU pods, 1:7 oversubscription; rail-optimised fabric) | 1 | 2 | 4 | 2 | 0 | 0 (not the central question) | 0 (Llama page rank mapper draws the pods) | 0 | −2 | 7 | rejected: belongs to Topic: hardware and the Llama 3 page |
| 6 | Framework comparison matrix | 0 | 0 | 1 | 0 | 0 | 0 | 0 | 0 | 0 | 1 | rejected: a list reads as well (as on Distributed Training) |
| 7 | 54-day replay at any cluster size | 2 | 2 | 4 | 1 | 1 | 2 | 0 | 1 | −2 | 11 | rejected: the Llama page replays 54 days; #1 covers scale analytically and #2 shows the mechanism |
| 8 | Async checkpoint timeline per rank (D2H copy, background write, overlapping persists) | 1 | 2 (IBM 148.8 → 6.3 s) | 2 | 1 | 1 | 1 | 1 | 1 | −1 | 9 | folded into #2 (the persist window) and the Reading text |

## Data and formulas (recompute.py → recompute.json; check_page.mjs compares the page's JS)

- Llama 3: 419 unexpected and 47 planned in 54 days on up to 16,384 H100s (2,048 servers); Table 5 counts; MTBF 54 × 1440 / 419 = 185.6 min; r_f = 419 / (2,048 × 54) = 3.79 per 1,000 server-days (derived; the job did not always use all 16,384).
- Meta (Kokolis et al., arXiv 2410.21680v2): r_f 6.50 (RSC-1) and 2.34 (RSC-2) per 1,000 node-days; w_cp ≈ 5 min, u0 ≈ 5 to 20 min; E[ETTR] ≈ (1 − N r (u0 + Δt/2)) / (1 + w/Δt); Δt* = √(2w / (N r)); projected MTTF 1.8 h (16,384) and 0.23 h (131,072), reproduced as 1.80 and 0.225 h; empirical 7.9 h for 1,024-GPU jobs (formula: 28.8 h, said).
- Pauses: IBM/PyTorch 148.8 s → 6.3 s for 7B (23.6×); torchtitan 5 to 15× for Llama 3.1 8B. Restarts: Meta's range; ByteRobust warm standby 10.87×, hot update 11.04×.
- Checkpoint size: 12 bytes per parameter (fp32 master + Adam), 405,853,388,800 parameters → 4.87 TB, 297 MB per GPU on 16,384; MT-NLG at 20 Gbps in 42 min implies 11.9 B per parameter (Gemini SOSP §2.2).
- torchft blog arithmetic: 5,145 / 6,249 = 82.3%, × 29.6 / 30 = 81.2% (matches); 268 / 888 = 30.2%, × 18.9 / 30 = 19.0% against the printed 13.4% (shown both).
- OPT-175B: 178,000 GPU-hours wasted / (992 × 24 × 61) = 12.3%.
- Animation: mulberry32 seed 119 (chosen so the day has 8 failures, none within 45 minutes of another or the day's ends, gaps under 7 h); designs and their sources in the page's table.

## Defaults that reproduce published figures

- Meta MTTF 1.8 h and 0.23 h: independently, from r_f = 6.50.
- Llama 3's 419 in 54 days: by construction (rate back-solved).
- Llama 3's >90%: by construction (w = 10 s, u0 = 10 min give 90.6%; the paper gives neither).
- Meta's "ETTR 0.9 at 12,000 GPUs needs ~10 s": 0.92 at u0 = 5 min, 0.89 at 10; partially (the paper does not state its u0).
- Does not reproduce: Meta's empirical 7.9 h for 1,024-GPU jobs (formula 28.8 h); torchft's printed 13.4% (its own figures give 19.0%).

## Inspiration

The MLA explainer's before/after pattern, applied as four lanes of the same input rather than a toggle, since the four designs form a ladder; the Llama 3 page's replay for seeded Poisson arrivals with Table 5 causes; Meta's ETTR model as the calculator's core.

## What the methodology lacked here

A rule for operations pages whose published outcomes are bounds (">90%") without the inputs behind them: the honest default is one setting that clears the bound, labelled by construction, plus a second source whose stated requirement ("~10 s") can be checked against the same formula. Also: when a simulation and its closed form disagree, show both and say why (here, the async persist window the formula ignores).
