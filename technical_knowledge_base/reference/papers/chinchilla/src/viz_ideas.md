# Visualisation ideas: Training Compute-Optimal Large Language Models (Chinchilla, Hoffmann et al. 2022)

Scored 1 to 5 on: teaches more than text (T), faithful to a source (F), cost (C, 5 = cheap). Kind of paper: empirical / scaling (papers.md). The question the page keeps returning to: how should a fixed compute budget be split between parameters and tokens, and how far can the paper's three answers be trusted?

## Built

| Id | Idea | T | F | C | Where | Data and formula |
|---|---|---|---|---|---|---|
| P-chinchilla.1 | **Approach 3 refitted live on the paper's own points**: 245 final losses read from Figure 4's vector graphics (Besiroglu et al.), Huber on log-loss with an L-BFGS that stops like SciPy's, the paper's 4,500-start grid or a 432-start quick grid; toggles for summed against averaged Huber (the bug), outliers, delta, and a hold-out (fit on C ≤ 1e20, score the rest) | 5 | 5 | 2 | Refit Approach 3 tab | `parts/21_js_fit.js`, checked against SciPy by `check_fit.mjs`; reproduces Besiroglu's fit and, with averaging, an early stop near the published a = 0.454 |
| P-chinchilla.2 | **Figure 4 (left) rebuilt**: the extracted runs in (C, N) coloured by loss, iso-loss contours of any fit solved in closed form (D = (B / (ℓ − E − A/N^α))^(1/β), C = 6ND), its frontier and the paper's | 4 | 5 | 4 | Refit tab | Eq. 2 and 4 |
| P-chinchilla.3 | **Residual strip, two fits on the same points** (Besiroglu Figures 3 and 4 rebuilt live), with held-out points hollow | 4 | 5 | 4 | Refit tab | residual = L̂/L − 1 |
| P-chinchilla.4 | **Tokens per parameter on each fit's frontier, 1e18 to 1e26 FLOPs, with a 40-resample in-browser bootstrap band** set against the paper's 0.454 to 0.455 interval | 5 | 5 | 3 | Refit tab | Eq. 4; Besiroglu §3.2 |
| P-chinchilla.5 | **Figure 3 rebuilt from data**: IsoFLOP parabolas (in log N) through the extracted points nearest each of the nine budgets, minima, power law, extrapolation to Gopher's budget (70.9B against Chinchilla's 70B) | 5 | 5 | 4 | The paper tab, Approach 2 | `fit.py` and the page agree: a = 0.507 |
| P-chinchilla.6 | **Before/after animation: Gopher's and Chinchilla's allocation of one budget** walked through the loss decomposition (pick N, the budget fixes D, the model term, the data term, the total against the other choice), with the IsoFLOP curve and its two term curves, stacked reducible-loss bars on one scale, fit selector | 5 | 5 | 3 | The paper tab, Same budget | Besiroglu's or the paper's constants; labelled as extrapolation |
| P-chinchilla.7 | **Learning rate left at the end of a run** for Figure A1's six cycle lengths (1 to 5×): the mechanism behind the Kaplan critique, as arithmetic only | 3 | 5 | 5 | The paper tab, Problem | Appendix B schedule, 10× cosine decay |
| P-chinchilla.8 | **Figures 6 and 7 rebuilt**: per-task Chinchilla minus Gopher, sorted, tap for the task, MMLU or BIG-bench | 3 | 5 | 5 | The paper tab, Results | Tables A6, A7; counts 51/2/4 and 58/4 reproduce |
| P-chinchilla.9 | **Before/after animation: the inference-aware optimum** (Sardana et al.) against Chinchilla's at fixed quality as lifetime inference demand grows; iso-loss curve in (N, D), training and inference FLOPs as bars on one scale | 5 | 5 | 3 | Then and now tab | Sardana Eq. 3, solved by a 1-D search; reproduces their examples with the unrounded constants |
| P-chinchilla.10 | **Tokens per parameter of 11 models, 2020 to 2024**, log scale, with the 20 line | 3 | 5 | 5 | Then and now tab | each model's paper |
| P-chinchilla.11 | **Appendix F FLOP calculator** with term toggles against Table A4's printed ratios (they reproduce only without the embedding and logit terms) | 4 | 5 | 4 | Tables tab | Appendix F formulas, seq 2,048, vocab 32,000 |
| P-chinchilla.12 | **Tables 3 and A3 checked against 6ND** in one table (finds the 175B exponent misprint) and **Table A9 recounted** (13 L d² style count matches all 50 rows within 0.8%) | 3 | 5 | 5 | Tables tab | `recompute.py` |
| P-chinchilla.13 | Three predict-then-reveal questions: 10× compute (3.2× model), runs needed for the published interval (600,000), Llama 3 8B's tokens per parameter (1,875) | 4 | 5 | 5 | The paper tab | Table 2; Besiroglu §3.2; Llama 3 §3 |
| P-chinchilla.14 | **Exponent replication table** (Kaplan, A1 to A3, C4, GitHub, Besiroglu, this page twice, DeepSeek LLM on three datasets, Llama 3, Porian), linking into this page's own refits | 3 | 5 | 5 | Then and now tab | each source's table |

## Rejected

- **Approach 1's training-curve envelope**: the paper released no curves; drawing envelopes from a fitted surface would show the fit, not the method. Text only.
- **Rebuilding the Kaplan-against-Chinchilla allocation animation**: the Scaling Laws page already has it (Then and now); linked instead.
- **Reusing the Scaling Laws toy sweep for an IsoFLOP valley**: its larger model never overtakes the smaller one in 8.4M tokens, so there is no valley; the extracted points have nine.
- **A loss-landscape contour of the Huber objective in (α, β)** to show the flat ridge the optimiser stops on: 5-D, and the slice would depend on the other three parameters; the stop reason and iteration count in the Refit tab say the same more honestly.
- **Benchmark bar charts of Tables 7 to 9**: a table with deltas teaches as much.

## What the methodology lacked for this page

- No rule for data recovered from a figure's vector graphics. That is not reading curves (coordinates are exact up to the axis mapping), so it was used, labelled with its source and stated precision. Suggest adding: "data parsed from vector graphics by a published replication may be used, with its source and precision stated".
- A way to reproduce a *bug*: the averaging bug only shows with the original optimiser's stopping rules, so the JS optimiser copies SciPy's L-BFGS-B tolerances and the page says the exact stopping point is optimiser-dependent.
