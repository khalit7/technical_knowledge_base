# Visualisation ideas: Attention Is All You Need

The question the paper keeps returning to: **what does removing recurrence buy, and which of the pieces that replace it are load-bearing?** Every visual below either runs a piece of the mechanism on real numbers or rebuilds one of the paper's own tables.

Scoring follows `html_utils/interactive-html-ideas.md` section 2 (0 to 2 each; reproduces and computable count double; build cost subtracted; plus one for "can be a step-by-step animation against the method it replaced"). Two criteria were added for paper pages (see `PAPER_METHOD.md`): **R** = runs the paper's own mechanism on real weights or real random numbers (not an illustration), **P** = supports a predict-then-reveal question.

## Built

| # | Idea | Placement | Score | Why |
|---|---|---|---|---|
| 1 | **Live toy Transformer** (encoder-decoder built as §3, trained offline as §5 at d_model 24, 35,184 parameters; three variants) with composer, checked translation, step-by-step greedy decoding, every attention map, the best-matching cross-attention head drawn as alignment lines, an in-browser test, training curves | Own tab, Run a Transformer | 15 (R 2, P 2, anim 1) | The upgrade the method was asked for. Inspired by [Polo Club's Transformer Explainer](https://poloclub.github.io/transformer-explainer/) ([paper](https://arxiv.org/abs/2408.04619)), which runs GPT-2; here the model must fit inside a sandboxed page, so it is trained to fit. Cross-attention on a verb-final target language shows the crossing alignment the paper's translation relies on, and the paper's own appendix ([Figures 3 to 5](https://arxiv.org/html/1706.03762v7#Sx1.F3)) is the precedent for showing maps. |
| 2 | **Before/after on real weights**: no positional encoding, one head | Run tab | 14 | The no-position model gives *identical* output for any reordering of the source (provable: permutation-equivariant encoder, order-blind cross-attention), and measures 3.6% against 100%; one head scores the same as four on this task, which is said plainly against the paper's 0.9 BLEU. |
| 3 | **RNN against self-attention, same 11-word sentence, animated** with Table 1 counters (sequential steps, path length, multiply-adds at d = 512, work in parallel); self-attention lines are the toy model's real layer-1 weights | Reading, Idea | 13 | Khalid's DeepSeek-MLA pattern: the method replaced and the new one on the same input, to scale. |
| 4 | **√d<sub>k</sub> predict-then-reveal** with real random vectors: measured variance of q·k, largest weight, largest softmax gradient, scaled against unscaled, d<sub>k</sub> 4 to 1,024 | Reading, attention | 12 (R, P) | Turns the paper's footnote 1 into something you can see break. |
| 5 | **Then and now morph**: 2017 decoder layer to a 2026 one in 8 sourced steps, parameters and KV cache recounted at d = 512 | Own tab | 12 | A before/after animation for the "what changed" list; each step links its paper and KB page. Corrected two claims of the old page (4× FFN, tied embeddings) with configs. |
| 6 | **Table 2 rebuilt**: BLEU against training FLOPs, log x, EN-DE / EN-FR; label placer avoids overlaps | Tables tab | 11 | Reproduces 3.3e18 and 2.3e19 independently from the footnote method. |
| 7 | **Table 3 rebuilt** with deltas, sort by loss, BLEU or PPL; plus a predict question in Reading | Tables tab, Reading | 11 (P) | Which ablation hurt most (2 layers, -2.1) is a good belief-elicitation question. |
| 8 | **Parameter recount** of base and every Table 3 row, with a vocabulary slider | Tables tab | 10 | Does not reproduce exactly: 63.1M against 65M with V = 37,000; the shortfall scales with d_model; big comes out above. Shown, not fitted. |
| 9 | **Table 1 calculator**: log-log cost per layer against n for four layer types, crossover at n = d | Tables tab | 9 | The n < d argument made movable. |
| 10 | **LR schedule (Equation 3)** with warmup and d_model controls, peak (d · warmup)<sup>-0.5</sup> | Reading, training | 8 | Peak 6.99e-4 derived (the paper does not print it). |
| 11 | **Positional encoding heatmap and offset curve** (PE<sub>p</sub> · PE<sub>p+k</sub> for three p coincide) | Reading, positions | 7 | Shows "depends only on the offset" directly. |
| 12 | **Block diagram** (Figure 1 redrawn at measured width) | Reading, block | 6 | Needed to follow the text; static. |
| 13 | **Table 4 bars** | Tables tab | 5 | Small; completes the tables. |

## Rejected

- **Live GPT-2 or any pretrained model**: too large for a 300 KB page with no network; a trained toy with an exact checkable task teaches more here.
- **A model trained on real WMT data**: at toy size it would translate badly and its errors would not be checkable; the synthetic task makes every answer verifiable by rule.
- **Beam search visual**: the paper uses beam 4, but on this task greedy is already exact; a beam tree would show nothing.
- **Unscaled-attention model variant** (train without 1/√d<sub>k</sub>): at d<sub>k</sub> = 6 the effect is negligible, so the random-vector demo shows it better.
- **Training-bill or compute-history tab**: patterns Khalid removed.
- **Interactive BLEU explainer**: belongs to an evaluation page.
- **Checkpoint-averaging visual**: no data in the paper to rebuild it.

## Data and formulas

- Paper: [arXiv HTML v7](https://arxiv.org/html/1706.03762v7) (anchors S1 to S7, S3.F1, S3.E1, S3.E2, S5.E3, S4.T1, S6.T2, S6.T3, S6.T4, Sx1.F3 to F5), extracts in `inputs/`. v1, v2 abstracts say 41.0 for EN-FR; v5 and later 41.8 (the v7 §6.1 text still says 41.0); both shown.
- Parameters: `recompute.py` `params()`; FLOPs = hours × 3,600 × 8 × 9.5e12; lrate = d<sup>-0.5</sup> min(s<sup>-0.5</sup>, s · w<sup>-1.5</sup>).
- Modern configs: Hugging Face raw config.json for Llama 3.2 1B and Llama 3.1 8B (unsloth mirrors; Meta's repos are gated), Qwen3 0.6B and 8B, DeepSeek-V3. Quotes from GPT-2, GPT-3, PaLM, Liu et al. 2018, Xiong et al. 2020, Zhang and Sennrich 2019, Shazeer 2020, Ainslie et al. 2023 in `inputs/modern_extracts.txt`.
- Inspiration: Polo Club's Transformer Explainer (live model in the browser), Distill's [Communicating with Interactive Articles](https://distill.pub/2020/communicating-with-interactive-articles/) (predict-then-reveal, details on demand, models and simulations), Bycroft's [LLM Visualization](https://bbycroft.net/llm), Jay Alammar's Illustrated Transformer (what is already drawn, so not repeated).

## What the methodology lacked for this page

1. **A "real model" criterion.** The scoring rewarded reproducing published numbers but had no place for running the mechanism itself; for an architecture paper that is the most valuable visual. Added as R.
2. **Belief elicitation.** Nothing rewarded asking the reader to commit to a prediction; added as P, with a generic widget (`11_js_ui.js`).
3. **Paper anchors.** Topic pages cite sources; a paper page should point into the paper itself at section, table and equation level. The `ax:` macro and margin labels do that.
4. **Honesty for trained artefacts**: report held-out accuracy, overlap with the training stream (49% of sentences from the training distribution occur in training; 0.2% of uniformly drawn ones), quantisation effect, and a JS-against-PyTorch check, all on the page.
