# Visualisation ideas: Normalisation and initialisation (2026-10-03)

Central question: which numbers does each tool put on a scale of about 1, when (once, at step zero, or every step), and what breaks when the scale drifts with batch size, depth or training?

Existing visuals to avoid repeating (linked instead): the parent root's "one batch through five 16-layer networks" (per-layer activation spread and gradient size, init pairings), thread 2 (variance pact), the Training lab (init and norm swaps, pre/post, trained live), the Defaults tab (norm, placement, epsilon, init for 21 models), the debugger's loss-spike toy (QK-norm, z-loss, clipping). Paper pages: OLMo 2 (reordered norm + QK-norm curves, block toggle), Attention Is All You Need (Then and now morph), Megatron-LM (LN placement animation), Qwen3 (toy with QK-Norm); Kimi (qk-clip animation); Architecture Gallery (RMSNorm against LayerNorm on an editable vector).

Scoring: Param, Repro x2, Computable x2, Beyond a sentence, Misconception, Central, Absent elsewhere, Anim, minus Cost.

| # | Idea | Param | Repro x2 | Computable x2 | Beyond | Misc. | Central | Absent | Anim | Cost | Score | Decision |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| NI1 | **Which numbers share one mean and variance**: image N x C x H x W and tokens B x T x D, BatchNorm, LayerNorm, InstanceNorm, GroupNorm, RMSNorm; click a number to outline its set; "change example 1" rings outputs that change in other examples | 2 | 2 (x2: torch.nn to 1e-14, by construction of the same formula) | 2 (x2) | 2 | 2 (only BN couples examples; LN in transformers is per token) | 2 | 1 (GroupNorm Fig. 2 is static) | 0 | -1 | 16 | built, Reading section 2 |
| NI2 | **BatchNorm train against inference, animated, with LayerNorm as the "after"**: 5 batches, running stats (PyTorch momentum 0.1, unbiased var), 200-batch summary, inference gap, +3 shift; batch 8, batch 2, LayerNorm | 1 | 2 (x2: BatchNorm1d train/eval and running stats to 1e-14) | 2 (x2) | 2 | 2 (batch 2 gives exactly +-1; momentum conventions) | 2 | 2 | 2 | -1 | 18 | built, Reading section 3 |
| NI3 | **Norm placement, block by block, before/after**: Xiong et al.'s simplified Transformer (post, pre, peri, output norm, DeepNorm, none), stream up, gradient down, compare run, depth 6 to 48, GPT-2 residual init | 2 | 2 (x2: Lemma 2 reproduced independently over 20 seeds) | 2 (x2: autograd to 3e-15) | 2 | 2 (peri/output norm are not post-norm) | 2 | 1 (Megatron page animates the structure, not the numbers) | 2 | -1 | 20 | built, Reading section 5 (toy from the killed agent's partial work, reused) |
| NI4 | **Theorem 1 sweep**: last-block gradient, first/last ratio, final stream against L = 3..48, 5 placements, 5 seeds | 1 | 2 (x2: pre-norm /2.85 against 1/sqrt(L)'s /4; post-norm does not fall) | 2 (x2) | 2 | 1 | 2 | 2 | 0 | -1 | 15 | built, own tab Depth and placement |
| NI5 | **Six released models' residual streams**: BERT (post), GPT-2, SmolLM2, Qwen3 (pre), Gemma 3 (peri), OLMo 2 (output norm): median stream RMS, growth, abs max, first token, max attention logit per layer | 1 | 0 | 2 (x2: real weights, one passage) | 2 | 2 (peri-norm still grows x1,041; OLMo 2 grows x12.8) | 2 | 2 | 0 | -2 | 13 | built, own tab Depth and placement |
| NI6 | **QK-norm ceilings against measured logits, Qwen3-0.6B**: sqrt(d_h) max|g_q| max|g_k| from released gains (184 to 12,897) against 12.5 to 48 reached | 0 | 0 | 2 (x2) | 2 | 2 (QK-norm does not cap at sqrt(d_h) with trained gains) | 1 | 2 | 0 | 0 | 11 | built, Reading section 6 |
| NI7 | **Feature scaling morph on the Wine data**: raw units on equal axes to standardised (or min-max), 20 neighbours of one test wine, all 54 test votes | 1 | 2 (x2: scikit-learn's kNN numbers 75.93 / 94.44 / 94.44, independently in JS) | 2 (x2) | 2 | 2 (and the example's own 35.19% is a shared-PCA artefact) | 1 | 1 | 2 | -1 | 16 | built, Reading section 1 |
| NI8 | **Init calculator**: Var, std, uniform bound, forward and backward per-layer factor and its L-th power for 8 schemes, fan-in/out, ReLU or linear | 2 | 2 (x2: torch.nn.init variances; 20-layer torch MLP factors 0.990 / 0.495 / 0.163) | 2 (x2) | 1 | 2 (PyTorch default is U(+-1/sqrt n), 1/6 of He) | 2 | 1 | 0 | 0 | 16 | built, Reading section 7 |
| NI9 | Per-layer activation variance through a deep MLP for each init | 2 | 2 | 2 | 2 | 1 | 2 | 0 (parent root's five-networks animation) | 1 | -1 | n/a | rejected: on the parent; linked; the calculator gives the closed form instead |
| NI10 | Train a toy transformer to show QK-norm preventing logit growth | 2 | 0 | 2 | 2 | 1 | 1 | 0 (parent's debugger trains exactly this) | 0 | -2 | n/a | rejected: owned by the parent's When training goes wrong tab |
| NI11 | qk-clip per-head animation | | | | | | | 0 (Kimi page) | | | n/a | rejected: on the Kimi page; linked |
| NI12 | muP width-transfer toy (optimal LR against width, SP vs muP) | 2 | 1 | 2 | 2 | 1 | 1 | 2 | 0 | -3 | 8 | rejected for now: a convincing transfer curve needs many widths x learning rates x seeds of real training; the page states Table 3's rules and the paper's result instead |
| NI13 | OLMo 2 init comparison re-drawn (growth exponents) | | | | | | | 0 (OLMo 2 paper page) | | | n/a | rejected: on the paper page; linked |
| NI14 | DyT against LayerNorm on a toy | 1 | 0 | 2 | 1 | 0 | 0 | 2 | 0 | -2 | 4 | rejected: one paragraph carries the 2025 result; a toy would test nothing published |

Data and formulas, with sources:
- Norm formulas: Ioffe and Szegedy 2015 (arxiv.org/abs/1502.03167), Ba et al. 2016 (1607.06450), Ulyanov et al. 2016 (1607.08022), Wu and He 2018 (1803.08494), Zhang and Sennrich 2019 (1910.07467); PyTorch 2.14.1 modules; check `checks/norms_ref.py`.
- Placement toy: Xiong et al. 2020 (2002.04745) setting; DeepNet constants (2203.00555); checks `checks/toy_ref.py` (Lemma 2 reproduced).
- Real models: `real/real_streams.py` (transformers 5.18.0, torch 2.14.1), six Hugging Face checkpoints (Gemma via the unsloth mirror).
- QK ceilings and init numbers: `recompute.py`.
- Wine: `scaling.py` (scikit-learn 1.9.1), reproducing scikit-learn's example and exposing its shared-PCA artefact.

Inspiration: GroupNorm's Figure 2 (the four norms' axes as cubes), the MLA explainer pattern (before/after on one input), Distill-style predict-and-reveal (not used here).

What the methodology lacked for this page: a rule for measurements on finished checkpoints that look like controlled comparisons. The six models differ in size, data and training, so their stream curves are labelled as measurements of checkpoints, not as an ablation of placement; the controlled comparison is the toy.
