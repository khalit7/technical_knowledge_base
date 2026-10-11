# Visualisation ideas: Speculative decoding

The question the page keeps returning to: **when does guessing tokens make a big model faster without changing
what it says, and what does that depend on?** Three quantities answer it: the acceptance rate &alpha;, the cost of a
verification pass against its token count, and the batch size. Every visual below makes one of them measurable,
on real models where possible.

Existing visuals elsewhere (not rebuilt here): the parent's Reading 6 animation (one 12-token answer with and
without a k = 4 draft, illustrative); the parent's Engine bench speculative cost-model calculator; the Gemini and
Gemma page's Leviathan Table 4 calculator; the DeepSeek-V3 paper page's MTP acceptance calculator; the 2026-08-24
tech news animation of speculative against block-diffusion decoding.

Scores 0 to 2 on: parameter the reader moves; reproduces a stated figure; computable from real data; shows what a
sentence cannot; corrects a misconception; measures the central question; absent elsewhere; animation against the
method it replaced (+1). Reproduce and compute count double; build cost subtracted.

| # | Idea | Placement | Data | Score | Status |
|---|---|---|---|---|---|
| 1 | Pass time against tokens in the pass (M1 measured with llama-bench; H100 derived from the parent's planner constants), predict-then-reveal | Reading 1 | llama-bench pp at depth 512, 21 sizes x 5 reps; planner constants | 13 | built |
| 2 | A real answer step by step: accepted guesses green, target tokens blue, step boundaries | Reading 2 | from-scratch MLX speculative runs, k = 4, greedy | 10 | built |
| 3 | The same 16 guesses judged by min(1, p/q) and by sample-and-compare, on real p and q (before/after animation: two exact rules on one input) | Reading 3 | real top-50 distributions at chosen positions (dists.py) | 14 | built |
| 4 | Exactness test table (5 rules, 20,000 samples each, chi-square) and observed-against-expected bars | Reading 3, Rule lab | exact.py, stats.py | 14 | built |
| 5 | Hand-made p and q: exact output distribution per rule, plus a seeded simulation with an in-browser chi-square | Rule lab | none (reader's input) | 11 | built |
| 6 | Text coloured by &alpha; at every position, click for the two distributions | Rule lab | dists.py | 11 | built |
| 7 | Tokens per step against k: formula with measured &alpha; against 72 real runs, predict-then-reveal | Reading 4 | accept.py | 13 | built |
| 8 | Measured server throughput ratio against users (real draft k = 3 and 6, synthetic acceptance lengths) | Reading 5, Crossover lab | llama-server, 70 sessions | 15 | built |
| 9 | Crossover cost model with &alpha;, k, draft cost, context length; M1 measured curve and H100 derived; measured dots overlaid. Does not reproduce the laptop server runs (model 0.84x at 1 user against 0.70x measured with the real draft): the residual is shown, not fitted away | Crossover lab | 1 and 8 | 14 | built |
| 10 | Chain against tree at an equal budget of 8 checked tokens, animated on real positions (before/after) | Reading 7 | tree.py | 12 | built |
| 11 | Drafters on one target: 0.6B draft, EAGLE-3, DFlash, DSpark, five n-gram modes, six prompt kinds | Drafters tab | llama-server runs | 13 | built |
| 12 | Engine support matrix read from source | Reading 8 | source files at pinned tags | 9 | built (table) |
| R1 | Re-animating the parent's 12-token illustrative answer | | | | rejected: exists on the parent; replaced by the real step strip (2) |
| R2 | Leviathan Table 4 calculator | | | | rejected: exists on the Gemini and Gemma page; linked |
| R3 | Plot of published speed-ups of every drafter on one axis | | | | rejected: different models, tasks, hardware and baselines; a chart would imply a comparison the sources do not support (kept as a table with who measured) |
| R4 | MTP heads measured here | | | | rejected: no Qwen3 checkpoint ships MTP heads; the DeepSeek-V3 paper page already has the MTP calculator |
| R5 | Medusa heads trained here | | | | rejected: no engine on this laptop runs Medusa (vLLM only); training heads is a training-page subject |

What the methodology lacked for this page: a rule for **statistical claims about exactness**. The test here states
its sample size, the binning rule (expected count at least 5, the rest pooled), and includes a deliberately broken
rule as a positive control, so a pass means something.
