# Beyond attention: visualisation ideas

The question the page keeps returning to: **what does a fixed-size state keep that a KV cache would, and what does
keeping less buy?** Scores as in the explainer-page skill (quantity moved 0-2, reproduces a published figure 0-2 x2,
public data 0-2 x2, shows what a sentence cannot 0-2, corrects a misconception 0-2, measures the central question 0-2,
absent elsewhere 0-2, animatable 0-1; minus build cost).

## Built
| # | Idea | Where | Score | Notes |
|---|---|---|---|---|
| ba.1 | **One state, five write rules** (before/after on the same 12 writes): softmax cache, linear, decay, delta, gated delta; state heat map, read-back cosines per word, d_k 4/8/16/32 | Reading s3 | 2+0+4+2+2+2+2+1-1 = 14 | exact arithmetic, illustrative random vectors; JS equals src/state/state_rules.py (check_data.mjs, 200 cosines) |
| ba.2 | **The same request token by token**: attention model against a hybrid, bars to one scale, crossover counters | State vs KV cache | 2+2+4+2+2+2+1+1-1 = 15 | root window.CC + KDA / Qwen3.5 additions; Nemotron-H 8B's 98.8 MiB matches the topic FACTS (by the same formulas) |
| ba.3 | Calculator (model, context, batch, KV and state dtype) and all-model memory-vs-context chart | State vs KV cache | 2+2+4+1+2+2+1+0-1 = 13 | JS equals statecalc.py at 6 contexts for 15 models |
| ba.4 | **Running sequence token strip**, attention against SSM / hybrids / NoPE, animated in chunks with Roxy-piece counters | Recall probes | 2+0+4+2+2+2+2+1-1 = 14 | recorded per-token losses from eval.py |
| ba.5 | Pythia-160M vs Mamba-130M copy and phone-book curves with real failures | Recall probes | 1+2+4+2+2+2+2+0-1 = 14 | reproduces the direction of Jelassi et al. Figure 1c (no printed numbers there) |
| ba.6 | Tiny GPT name recall against distance (mentioned vs control) | Recall probes | 1+0+4+2+1+2+2+0-1 = 11 | |
| ba.7 | MQAR grid (attention, SSM 16, SSM 64, hybrid x pairs) with training curves | Recall probes | 1+2+4+2+1+2+1+0-1 = 12 | direction of Zoology / Mamba-2 Figure 8 at toy scale |
| ba.8 | **Hidden attention maps** of the trained SSM beside real attention maps, same 48 tokens, animated over layers | Inside the trained SSM | 2+0+4+2+2+1+2+1-1 = 13 | Mamba-2 duality made visible on real weights |
| ba.9 | Half-life per head, decay per token for a chosen head | Inside the trained SSM | 2+0+4+2+1+1+2+0-0 = 12 | |
| ba.10 | Hybrid ratio table from configs (recurrent / attention layers, KV per token, state, crossover, total at 128K) | Reading s7 | 0+2+4+1+1+2+1+0-0 = 11 | |
| ba.11 | Loss curves of the equal-budget runs | Reading s9 | 0+0+4+1+1+2+2+0-0 = 10 | |
| ba.12 | Predict-then-reveal: delta-rule capacity, Pythia vs Mamba copy length | Reading | | reveals from data |

## Rejected
| Idea | Why not |
|---|---|
| Attention against recurrent layer, same 8 tokens, cache vs state drawn to scale | The root's Reading section 10 already animates it (parts/25_js_rd_ssm.js); linked instead. |
| Blelloch parallel scan animation; Selective Copying toy; Delta-as-gate widget; hybrid layer stacks | Built on the Mamba paper page (P-mamba.3, .1, .4, .12); linked. |
| Per-layer strips of 2026 hybrids, Gated DeltaNet / KDA rungs on an attention ladder | LLM Architecture Gallery child owns them. |
| Training a 100M-scale SSM vs transformer for perplexity | Hours of MPS for a published result (Waleffe et al., Jamba ablations); the tiny GPT runs show the same direction in minutes. |
| Running Qwen3.5-0.8B (a real Gated DeltaNet hybrid) on the recall probes | Only its config is cached here; worth adding (1.6 GB download, fla kernels absent so the slow torch path): listed as a follow-up, not run. |
| A chunked SSD algorithm animation | Mamba-2's section 6 diagram is clear; the four steps are described in prose; build cost high. |
