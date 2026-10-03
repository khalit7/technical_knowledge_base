# Visualisation ideas: Scaling calculator (tab t-scale)

The question the tab returns to: what does a pretraining run cost, and what should that compute have bought? Scored 0 to 2 on the methodology's questions (moves with a parameter, reproduces a published figure, computable from public data, shows what a sentence cannot, corrects a misconception, measures the central question, absent elsewhere, animatable); reproduction and computability count double.

## Built

| # | Visual | What it shows | Reproduces | Where |
|---|---|---|---|---|
| SC-1 | **Calculator**: N (dense or MoE active and total), D, attention term with shape, accelerator (A100, H100, H800, B200), BF16 or FP8 peak, MFU, GPUs, $/GPU-hour (illustrative), scaling-law fit; outputs 6ND (+attention), tokens per parameter, GPU-hours, GPU-days, wall-clock days, rental cost, Approach 3 optimum, 20-rule optimum, Kaplan's allocation, predicted loss (Chinchilla, Kaplan labelled), and a residual box against the preset's published figures with the implied MFU | Llama 3.1 405B's 3.8e25 independently; GPT-3's 3.14e23 by construction; OLMo 2's three FLOP figures | Calculator section |
| SC-2 | **Presets against published**: 13 models, 6ND and +attention against published FLOPs, GPU-hours at the lab's stated MFU (else 40%) against published hours, implied MFU, an explanation per row | 6 of 7 FLOP figures within 3%; no GPU-hours figure reproduces, all shown | Presets section |
| SC-3 | **Before/after animation: one budget, three allocations** (Kaplan 2020, Chinchilla, Llama-3-8B-style over-training) on the IsoFLOP curve, with bars to scale for N, D, reducible loss split into model and data terms, serving FLOPs per token; ticks show the other two allocations; last step gives the break-even inference tokens. Two budgets (Gopher's, Llama 3 405B's), any fit | Kaplan's 4.68B at 1e21 (method check); Approach 3's 40B at Gopher's budget | Own section |
| SC-4 | **Lifetime compute along the iso-loss curve** (Sardana et al.): training-only and training + 2N·D_inf against N, with this model, the Chinchilla-optimal and the inference-aware optimum; D_inf slider | Sardana's three §2 examples, within the fit's rounding | Inference section |
| SC-5 | **Tokens per parameter against compute**: frontier of each fit (unrounded, rounded, Besiroglu) and the 20 line, presets as dots, current model ringed | Approach 3's 59 at Gopher's budget; rounded constants' 93 | Two answers section |

## Rejected

- **Dollar costs of real runs**: owned by the Price list tab; this tab links to it.
- **GPU memory calculator (weights, optimiser state, activations)**: a different question (does it fit, not what it costs); belongs to a parallelism page.
- **Wall-clock with failure rates and checkpoint overhead**: only Llama 3 publishes interruption counts; a model with one data point would be fitted by construction.
- **MoE-specific scaling law (loss against active and total parameters)**: no fit across labs with published constants comparable to Chinchilla's; the page labels the dense fit's use for MoE instead.
- **IsoFLOP sweep of many budgets as a separate chart**: the animation's IsoFLOP curve and SC-5 already show the valley and the frontier; a second chart would repeat them.
- **Back-solving MFU so presets land on published GPU-hours**: hides the accounting differences the residuals are there to show (methodology: no fudging).
- **Energy and CO2 per run**: labs report it inconsistently (OLMo 2 gives only 391 MWh for two models together); out of the tab's question.
