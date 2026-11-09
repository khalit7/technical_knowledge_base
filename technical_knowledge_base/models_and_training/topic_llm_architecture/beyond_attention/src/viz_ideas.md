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

## 2026-10-23 rebuild (teaching contract)
| Idea | Where | Decision |
|---|---|---|
| Hero grid: every design by how the state forgets and how it writes, shipping layers outlined | Reading top | built (static, HTML grid) |
| Attention against recurrent layer, same 8 tokens, Qwen3-Next shapes (cross at 512) | Reading s1 | moved from the root (retired there; this page owns it) |
| Linear attention's two forms: masked T x T against a d x d state | Reading s2 | built (static) |
| One forget rate per head against one per key channel | Reading s6 | built (static, rates illustrative) |
| Rollback: KV cache drops entries, state restores a snapshot and recomputes | Reading s10 | built (static, follows from the mechanism) |
| ba.2, ba.4, ba.5, ba.8, ba.9 | Reading s7, s9, s8, s4, s4 | moved inline from the lab tabs; ba.6, ba.7, half-lives in closed blocks |

## 2026-11-09 rollout (split layout, renderer v2 stages)
| Idea | Where | Decision |
|---|---|---|
| Recurrence against attention as bricks and glass plates, volumes to scale (Qwen3-Next config), the cache tower reaching the state's height at 512 tokens | Reading s1, Fig. 1 `stg-rec` | built; replaces the 2D stepper (its log chart kept in a closed block) |
| Linear attention as a recurrence: key and value combs, the outer product as a bar field on a glass plate, the query read out, then the masked T x T form | Reading s2, Fig. 2 `stg-lin` | built on the write-rule toy (BA_WR); replaces the static two-forms figure |
| Forget or overwrite: the same 12 writes under linear, decay, delta and gated delta, the delta write in close-up, then d_k 16 | Reading s3, Fig. 3 `stg-wr` | built; the 2D write-rule animation stays as a widget in a closed block (softmax and every key size) |
| Selective scan on the trained ba_ssm head: median decay against measured a_t, the state flowing, a write's surviving share, Mamba-2's mask L | Reading s4, Fig. 4 `stg-scan` | built; the decay explorer moved into a closed block |
| Hybrid layer patterns from 10 configs, cache columns only on attention layers, totals, Falcon-H1 in parallel | Reading s7, Fig. 5 `stg-hyb` | built; the token-by-token race became a context slider in the State vs KV cache tab |
| Pythia against Mamba: cache slabs against one state slab, accuracy columns at 32, 256, 1,000 words and a 40-entry phone book | Reading s8, Fig. 6 `stg-recall` | built; the full curves moved into the probes' closed block |
| The tiny GPT runs as rows of six layers, memory at 256 tokens, signed loss bars against attention (held-out, running sequence, the repeated name) | Reading s9, Fig. 7 `stg-runs` | built |
| Hidden attention maps, running-sequence strip | Reading s4, s9 | kept 2D (heatmap, token strip), now widgets (layer chips, model chips), no autoplay |
| Hero grid, decay granularity, rollback, State vs KV cache tab | s0, s6, s10, t-mem | kept 2D: a taxonomy table, a two-panel comparison of rates (illustrative) and a 16-token strip read best flat; the tab is a reader-driven calculator |
