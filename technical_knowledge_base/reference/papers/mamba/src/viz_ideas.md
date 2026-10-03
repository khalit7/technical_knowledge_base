# Mamba: visualisation ideas

The question the paper keeps returning to: **what does a sequence model keep from its context, and what does keeping it cost?** (attention keeps everything and pays a growing KV cache; an LTI SSM keeps a fixed blur; a selective SSM chooses). Every visual below makes one side of that measurable.

Scores: quantity the reader moves (0 to 2), reproduces a published figure (0 to 2, counts double), computable from public data (0 to 2, counts double), shows what a sentence cannot (0 to 2), corrects a misconception (0 to 2), minus build cost (0 to 2).

## Built

| # | Idea | Placement | Score | Data and formulas |
|---|---|---|---|---|
| P-mamba.1 | **Selective Copying through two trained toy models, animated** (S6 against S4 in the same Mamba block, same input): the sequence, the per-channel Δ heat map of layer 2, layer 1's state grid, the six answers; counters for position, mean Δ on data and on noise, answers right; "new random input" | Reading, Selection | 2+4+4+2+2-2 = 12 | train.py (sc_s6, sc_s4), forward pass in 22_js_model.js checked against PyTorch; reproduces Table 1's direction independently (99.8% against 67.4%; paper 99.8 / 56.4). Caption numbers from probe.py: the toy's Δ is not the textbook gate (mean 0.019 on data and noise) but freezing it drops accuracy to 38% |
| P-mamba.2 | **KV cache against a fixed state, animated** (Transformer and Mamba modes, 12 tokens drawn to scale, then the 2,048-token bars) | Reading, Problem | 2+4+4+2+2-1 = 13 | Pythia-2.8B config (2 × 32 × 2,560 × 2 bytes = 320 KiB per token), Mamba-2.8B config (64 × 5,120 × (16 + 3) × 2 bytes = 11.9 MiB); crossover 38 tokens, 54× at 2,048 (recompute.py) |
| P-mamba.3 | **Sequential loop against the Blelloch scan, animated** on 8 real (Ā, B̄x) pairs, every level of the up-sweep and down-sweep with the combines drawn, final values checked against the loop | Reading, The scan | 2+2+4+2+1-1 = 10 | associative operator (a₁, b₁) then (a₂, b₂) = (a₁a₂, a₂b₁ + b₂); Blelloch 1990 |
| P-mamba.4 | **Δ as a gate**: z slider, Ā = 1 − σ(z), B̄ = σ(z) (Theorem 1, ZOH) against the released code's B̄ = Δ | Reading, Δ as a gate | 2+2+4+2+2-0 = 12 | Appendix C; selective_scan_ref in the code. Corrects: the shipped models are not exactly Theorem 1's gated RNN |
| P-mamba.5 | **HBM traffic of naive vs fused scan** (L, N, D controls) | Reading, The scan | 2+2+4+1+1-0 = 10 | element counts from Appendix D's description; 33× at the Figure 8 setting against a measured 20 to 40× (labelled counted, not measured) |
| P-mamba.6 | **Inference memory and batch size** (tokens, GPU size): sequences that fit for Pythia-2.8B and Mamba-2.8B | Reading, Results | 2+2+4+1+1-0 = 10 | configs, weights 2.8B × 2 bytes; labelled illustrative (no activations) |
| P-mamba.7 | **Block diagram** (H3 / gated MLP / Mamba) with the per-block parameter recount at D = 2,560 | Reading, The block | 1+4+4+1+1-1 = 10 | mamba_simple.py shapes; two blocks = 1.05 × 12D² |
| P-mamba.8 | **Zero-shot average against size** (Mamba, Pythia, RWKV lines; other baselines as open circles) | Reading, Results | 0+4+4+1+1-0 = 10 | Table 3 |
| P-mamba.9 | Three **predict-then-reveal** questions: the LTI layer on Selective Copying (reveal: Table 1 and the toy), extrapolation at 64× (reveal: Table 11 against the toy, which does not reproduce), state size with constant vs selective B, C (reveal: Table 10 chart) | Reading | 1+4+4+2+2-1 = 12 | Tables 1, 10, 11; extrap.json |
| P-mamba.10 | **Run a toy Mamba** tab: Selective Copying editor (click a cell to change its token) with both models' answers and Δ strips, an in-browser test of 500 sequences, induction heads at any length up to 65,536 (Mamba in recurrent mode; attention to 4,096), offline extrapolation chart to 2^20 against Table 11, training curves from the logs | Own tab | 2+4+4+2+2-2 = 12 | train.py, extrap.json; does not reproduce perfect extrapolation (said) |
| P-mamba.11 | **Tables rebuilt**: Table 1 grid with the toy row, Table 11 heat table with toy rows aligned by multiple of the training length, Table 3 sortable with a "minus Pythia" view, best-in-class and twice-the-size checks, binomial z of every 2.8B gap; Tables 6 to 9 bars; Tables 4, 5, 13 (with the sign-changing difference row), 15 (with the % more column); parameter recount of all five checkpoints; 19 claims checked | Own tab | 1+4+4+2+2-1 = 13 | tables.json, recompute.py, inputs/eval_sizes.json |
| P-mamba.12 | **Then and now: layer stacks from the configs** (Transformer++ 2.7B, Mamba 2.8B, Mamba-2 2.7B, Mamba-2 + attention, Jamba, Nemotron-H 8B, Granite 4.0-H-Small, Falcon-H1 7B, Nemotron 3 Nano), one square per layer, with KV cache per token, state per sequence and both at 128K; then memory per sequence for all at a chosen context (log bars, state and cache split) | Own tab | 2+2+4+2+2-1 = 12 | inputs/hybrid_configs.json; Nemotron 3 Nano's 6 KiB per token matches the LLM Architecture Gallery independently |

## Rejected

| # | Idea | Why not |
|---|---|---|
| P-mamba.13 | A toy language model (Mamba against Transformer++ perplexity) | The paper's language claims live at 125M to 2.8B; a 20K-parameter LM would show noise and invite over-reading. The released checkpoints and Table 3 carry it. |
| P-mamba.14 | Redrawing Figures 4, 5, 7, 8 (scaling, DNA, audio, speed curves) | Images only, no printed values; the method forbids reading curves. Described in words with their printed endpoints. |
| P-mamba.15 | Training the toy induction-heads models at length 256 with D = 64 to chase perfect extrapolation | The papers.md rule: do not tune until it reproduces; also the CPU budget. One longer run (20,000 steps) was tried and did not help; reported. |
| P-mamba.16 | A convolution-kernel view of the S4 toy (its K̄ drawn) | Real but secondary to the selection story; the heat map already shows that the LTI layer's Δ is constant. |
| P-mamba.17 | Mamba-3 in the then-and-now morph | No released language-model config of that family was available to compute from; described in text. |

## What the methodology lacked here

- A rule for **interpreting a toy's internals**: the textbook reading of Δ (large on data, near zero on noise) was not what the trained toy learned. The page now measures it (probe.py: mean Δ by token kind, correlation with position, accuracy with Δ, B or C frozen) before captioning, instead of narrating the paper's intuition over real weights.
- A rule for **toy extrapolation claims**: at-length accuracy saturates long before extrapolation does; report the curve, not the in-distribution number.
