# Megatron-LM: visualisation ideas

The question the paper keeps returning to: **how do you split one transformer layer across GPUs so that it costs almost no communication, and does the measured scaling bear that out?** Visuals were chosen to make the split, its communication and the memory that forces it measurable. Scores follow the Methodology (0 to 2 each; reproduces and computable count double; build cost subtracted; +1 for a step animation against the method it replaced).

## Built

| # | Idea | What it shows, what the reader does | Why it helps | Data and sources | Placement | Score |
|---|---|---|---|---|---|---|
| P-megatron_lm.1 | Split a layer across GPUs, animated (Megatron against Option 1) | One MLP block forward and backward on 2/4/8 GPUs; each lane is one GPU, each bar what it holds per token, to scale (4H per lane); counters for collectives, bytes sent, link time, GeLU work; model, GPUs, link and micro-batch controls | The paper's whole idea as a before/after: 2 collectives of H against 4 collectives of 5H all-reduced plus 5H all-gathered; the GeLU on all 4H on every GPU in Option 1 | §3, Eq. 2 and 3, Figure 3a; ring all-reduce cost; Option 1's backward collectives derived (labelled) | Own tab (live ingredient) | 13 |
| P-megatron_lm.2 | Predict, then a live split of real matrices | Option 1 without its sync: guess the error; then real seeded matrices multiplied three ways (columns, rows with GeLU before the sum, rows with all-reduce), with GeLU, ReLU or no nonlinearity | Shows the nonlinearity is the whole reason for the sync: with none, both splits are exact | Eq. 1 to 3 | Reading, Idea | 11 |
| P-megatron_lm.3 | Memory per GPU against t | Stacked bars (optimizer state and weights, checkpointed inputs, one recomputed layer) for t = 1 to 16 against the 32 GB line, per Table 1 model | Reproduces Table 1's model-parallel GPU column (1, 2, 4, 8) independently | ZeRO §3.1 (16 B per parameter), Korthikanti et al. 2022 Table 2 activation formulas | Reading, Problem | 11 |
| P-megatron_lm.4 | Communication-only scaling model against Figure 5 and Table 8 | Measured bars against a model charging only for all-reduces at 39 TFLOP/s; link switch (NVSwitch 300, 150 each way, InfiniBand per GPU); recomputation toggle | Does not reproduce, said plainly: communication explains about 11 of the 23 points lost at 8 GPUs; over InfiniBand efficiency falls to about 23%, the reason TP stays in one server | Figure 5 (PDF labels), Table 8, Narayanan et al. Eq. 3 | Split tab | 10 |
| P-megatron_lm.5 | LayerNorm placement, (a) against (b), animated | Four sub-blocks stacked one by one; the residual path coloured; counter of LayerNorms on that path (a: one per sub-block, b: none) | Corrects the old page's "moving LN to the block inputs": both put LN at the input; the difference is where the residual is taken | Figure 7 (structure), Xiong et al. 2020 for why it matters (beyond the paper) | Reading, BERT (predict reveal) | 9 |
| P-megatron_lm.6 | 76% or 74% box, Figure 5 bars in a predict question | The abstract's 76% is 15.1 / (512 × 39) = 75.6%; Figure 5 and §5.1.1 say 74% | Two of the paper's own numbers disagree; both shown with their arithmetic | Abstract, §5.1.1, Figure 5 | Reading, Results; Tables tab | 9 |
| P-megatron_lm.7 | Throughput implied by Table 2's epoch times | Per-model PFLOP/s and per-GPU TFLOP/s from days per epoch, and total training days | 13.8 PFLOP/s for the trained 8.3B against the headline 15.1 (a different, 32-head configuration); 6.5% below Figure 5's 74% | Table 2, §5.2, Narayanan et al. Eq. 3 | Tables tab | 8 |
| P-megatron_lm.8 | GPU-group picker for Figure 8 | 512 GPUs drawn as 32 servers; pick a GPU, see its 8-GPU model-parallel group (inside one server) and its 64-GPU data-parallel group (across all) | Makes the hybrid grouping and the in-server placement concrete | Appendix B.1, Figure 8 | Reading, With data parallel | 7 |
| P-megatron_lm.9 | Logit all-gather against fused loss | b, s, v controls; bytes on a log scale: b × s × v against b × s (paper) and 3 × b × s (current code) | 51,200× fewer elements; checks the paper's count against Megatron-Core's three all-reduces | §3; cross_entropy.py | Reading, Embeddings | 7 |
| P-megatron_lm.10 | Then and now: parallel layouts 2019 to 2026 | Step animation: one server coloured by the axis inside it, degrees of TP, CP, PP, EP, DP per run (dashed where not stated) | TP of 8 inside the server survives everywhere except DeepSeek-V3's training, where EP takes its place | Narayanan et al., MT-NLG, Korthikanti et al., Llama 3 Table 4, DeepSeek-V3 §3.2 and §3.4.1, GPT-3 §2.3, vLLM, TensorRT-LLM | Own tab | 9 |
| P-megatron_lm.11 | Tables rebuilt | Table 1 and 4 recounts (all reproduce independently), Table 5 sortable by column with distance from the best other single model or ensemble, Table 3 bars, Tables 6 to 8 | RACE's 90.9% is the ensemble (single 89.5%) | arXiv HTML v4 tables | Tables tab | 8 |

## Rejected

| # | Idea | Why not |
|---|---|---|
| P-megatron_lm.12 | A trained toy model split across simulated GPUs | Nothing to learn: the split is exact arithmetic, shown more directly by the real-matrix demo; training would add size and time without teaching anything new |
| P-megatron_lm.13 | Validation perplexity curves (Figure 6) and BERT loss curves (Figure 7) redrawn | Only images of curves, no printed values; the method forbids reading curves. Described in words instead (9.27 final perplexity is printed in the text) |
| P-megatron_lm.14 | Whole-layer Option 1 (row split for attention too) | The paper only discusses Option 1 for the MLP; extending it to attention would invent a design the paper does not describe |
| P-megatron_lm.15 | Pipeline-bubble simulator | Belongs to pipeline papers and is already built on the DeepSeek page (D5); linked through Then and now instead |
| P-megatron_lm.16 | Training-bill or cost tab | A pattern Khalid removed; the paper gives no cost |

## What the methodology lacked here

- A figure missing from the arXiv HTML (Figure 5) can still be exact: the PDF's text layer holds its bar labels. Worth a line in the method: check the PDF text before calling a figure image-only.
- For a systems paper the "does not reproduce" box is the most useful output of the cost model: a simple, sourced model that explains part of the measured loss, with the rest attributed to the paper's own stated causes, teaches more than a fitted model that matches.
