# Visualisation ideas: Scaling Laws for Neural Language Models (Kaplan et al. 2020)

Scored 1 to 5 on: teaches more than text (T), faithful to a source (F), cost (C, 5 = cheap). Kind of paper: empirical / scaling (papers.md), but with no released data, so "refit the curve" could not use the paper's runs.

## Built

| Id | Idea | T | F | C | Where | Data and formula |
|---|---|---|---|---|---|---|
| P-scaling_laws_for_neural_language_models.1 | **Toy scaling sweep, refitted live**: 23 real runs (8 sizes, 1.5k to 2.7M non-embedding parameters, WikiText-2 bytes, the paper's LR rule and schedule shape) with L(N) refitted in the browser: pure power law or with an irreducible term, drop smallest/largest, non-embedding vs all parameters, residual strip, extrapolation to 10x | 5 | 5 | 2 | Refit the laws tab | `train.py`, `mk_results.py`; α_N = 0.080 here vs 0.076 in Eq. 1.1 |
| P-scaling_laws_for_neural_language_models.2 | **Learning curves against compute with the lower envelope**, switchable compute accounting (6N, + output layer, + attention) | 4 | 5 | 3 | Refit the laws tab | Table 1 per-token FLOPs; Porian et al. §3.2 for the head |
| P-scaling_laws_for_neural_language_models.3 | **Checkpoint against matched-schedule run** at 1/4 and 1/16 of the budget, plus a 3x learning-rate probe | 5 | 5 | 3 | Refit the laws tab | M4/M16/X3 runs; tests Chinchilla Appendix B at toy scale (it does not reproduce with the paper's LR rule) |
| P-scaling_laws_for_neural_language_models.4 | **"Bigger and stopped early" against "smaller and trained on everything"** at equal compute for every neighbouring pair | 4 | 5 | 3 | Refit the laws tab | `mk_results.py overtake()`; replaces an allocation-exponent fit the toy cannot support |
| P-scaling_laws_for_neural_language_models.5 | **Before/after animation: converge a small model vs stop a big one early**, same target loss, drawn to scale on compute, counters for N, steps, compute, loss | 5 | 5 | 3 | The paper tab, inline | Eq. B.1 to B.3, B.5, B.12 to B.14 with Table 5 constants |
| P-scaling_laws_for_neural_language_models.6 | **Figure 15 rebuilt with exponent sliders and the Eq. 6.7 prefactor toggle** (printed 4e10 vs its own formula's 2.2e10) | 4 | 5 | 4 | The paper tab, inline | Eq. 1.2, 1.3, 6.7, 6.8; shows the crossing's order-of-magnitude sensitivity and the misprint |
| P-scaling_laws_for_neural_language_models.7 | **Figure 1 rebuilt from the fitted equations** with an N/D/C switch and a multiplier slider (loss ratio m^-α) | 3 | 5 | 5 | The paper tab, inline | Eq. 1.1 to 1.3; curves only, no invented points |
| P-scaling_laws_for_neural_language_models.8 | **Figure 9 (left) rebuilt**: L(N, D) at a chosen D with the 2.4% overfitting edge | 4 | 5 | 5 | The paper tab, inline | Eq. 1.5, Table 2, Eq. 4.3 and 4.4 |
| P-scaling_laws_for_neural_language_models.9 | **Critical-batch hyperbola** (S/S_min against E/E_min) with a batch slider | 3 | 5 | 5 | The paper tab, inline | Eq. 5.1 |
| P-scaling_laws_for_neural_language_models.10 | **Then-and-now animation in (N, D) space**: Kaplan's Table 6 path and Chinchilla's 20 tokens/param path stepped through 1e21, GPT-3, Gopher and Llama 3 405B budgets, isoFLOP diagonals, real models plotted, Chinchilla's parametric loss for both allocations | 5 | 5 | 3 | Then and now tab | Table 6 with C_min = C/2 (reproduces Chinchilla D.4's 4.68B), Chinchilla Eq. 2 constants, model N and D from their papers |
| P-scaling_laws_for_neural_language_models.11 | **Table 1 calculator** with presets (GPT-2, Figure 5/6 shapes, GPT-3, the toy) showing embedding share, context share and the uncounted output-layer share | 3 | 5 | 5 | Tables tab | Table 1, Eq. 2.1, 2.2 |
| P-scaling_laws_for_neural_language_models.12 | **Every derived number, checked** (34 rows: reproduces / partly / does not) | 4 | 5 | 4 | Tables tab | `recompute.py` |
| P-scaling_laws_for_neural_language_models.13 | Three predict-then-reveal questions: doubling N (5%), converge vs stop early (a third of the compute), 10x compute (5x model) | 4 | 5 | 5 | The paper tab | Eq. 1.1, B.14, Table 6 |

## Rejected

- **Digitising the paper's figures to refit them**: papers.md forbids reading curves; the paper printed no tables of runs. Replaced by the toy sweep.
- **An allocation exponent from the toy** (crossing method and Chinchilla Approach 3 fits were both tried in `mk_results.py` drafts): the bigger model never overtakes the smaller one inside an 8.4M-token budget, and the parametric fit had 3 to 4% RMS error with E near zero, so any exponent would be an artefact. Shown instead as the overtaking comparison (idea 4).
- **A Porian-style ablation ladder trained at toy scale** (head FLOPs, warmup, tuned LR): would need several sweeps; over the CPU budget. Their published exponents are shown as a table.
- **Context-position power law (Figure 20)**: no data; one sentence in the text instead.

## What the methodology lacked for this page

- No rule for a scaling paper with no released data. Resolution here: draw only the paper's fitted equations (labelled as such) and run a small honest sweep for the "refit" ingredient, reporting where it disagrees.
- A toy can contradict the follow-up literature for reasons of its own (here the LR rule makes matched short schedules worse). The page says so beside the result rather than tuning until it agrees (papers.md honesty rule, applied to a successor paper's claim).
