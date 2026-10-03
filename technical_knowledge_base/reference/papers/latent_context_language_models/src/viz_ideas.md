# Visualisation ideas: End-to-End Context Compression at Scale (LCLM)

The question the paper keeps returning to: **does shrinking the context before the decoder buy time and memory without losing what the model can do, and against what yardstick?** A visual earns its place when it makes that measurable.

Scores 0 to 2 on: parameter the reader moves (P), reproduces a published figure (R, double), computable from public data (C, double), shows what a sentence cannot (S), corrects a misconception (M), measures the central question (Q), absent from the paper and explainers (A), animation of a process or before/after (An). Build cost subtracted (B).

| id | Idea | P | R×2 | C×2 | S | M | Q | A | An | B | Total | Placement | Status |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| P-latent_context_language_models.1 | **Simulate a long prompt** (animation, own tab): the same prompt through LCLM (windows, batched encoder, mean pool, adapter, short prefill) and through KV compression (full prefill, scoring, uneven eviction that masks but does not free) and through no compression; cells to scale (64 per prompt); counters for decoder positions, KV bytes (from the released config), TTFT and peak memory (decoded from Figure 4); context slider 4K to 1M, ratio 4/8/16 | 2 | 4 | 4 | 2 | 2 | 2 | 1 | 2 | 1 | 18 | own tab (the live ingredient) | built |
| P-latent_context_language_models.2 | **N and W are different knobs** explorer: 64-token strip, ratio, window, causal or bidirectional mask, mean / concat / EOS pooling; click a latent to see which tokens can influence it; latent count, encoder passes, adapter width | 2 | 0 | 4 | 2 | 1 | 1 | 2 | 0 | 1 | 11 | Reading, Architecture | built |
| P-latent_context_language_models.3 | **Predict: is KV compression faster than not compressing?** reveal with the decoded Figure 4 TTFT bars at a chosen length | 2 | 4 | 4 | 1 | 2 | 2 | 2 | 0 | 0 | 17 | Reading, Problem | built |
| P-latent_context_language_models.4 | **Pareto panels rebuilt** from vector paths (Figures 1 and 5), with two toggles the paper lacks: the uncompressed decoder at its own measured TTFT, and the 16x point at Table 6's value instead of the figure's | 2 | 4 | 4 | 2 | 2 | 2 | 2 | 0 | 1 | 19 | Tables tab | built |
| P-latent_context_language_models.5 | **Claim table**: each architecture claim against from-scratch loss, at-scale loss and at-scale benchmarks, with a "holds?" verdict (adapter reverses at scale; mean vs concat a tie; window confounded) | 0 | 2 | 4 | 2 | 2 | 1 | 2 | 0 | 0 | 13 | Reading, Architecture search | built |
| P-latent_context_language_models.6 | **Predict: how big are the search's loss gaps?** reveal with Figure 3's call-outs on a zoomed axis (0.002 to 0.022) | 1 | 2 | 2 | 1 | 2 | 1 | 2 | 0 | 0 | 11 | Reading | built |
| P-latent_context_language_models.7 | **A toy LCLM in the browser** (encoder, mean pooling, MLP adapter, decoder, trained from scratch on a key-value task), with a before/after animation: answer from latents against skim, EXPAND, answer; decoder attention shaded; measured ablations (ratio, W = N, EOS, bidirectional, concat) | 2 | 0 | 2 | 2 | 1 | 2 | 2 | 2 | 2 | 11 | own tab | rejected after eight pilot designs: a 2-layer toy never learned retrieval on CPU (logs in `src/model/pilot/`) |
| P-latent_context_language_models.8 | Figure 4 rebuilt (TTFT and memory against context, log scale, the uncompressed line kept) with a decoded data table | 1 | 4 | 4 | 1 | 1 | 2 | 1 | 0 | 0 | 14 | Simulation tab (chart, with a computed KV-cache view), Tables (data) | built |
| P-latent_context_language_models.9 | Token accounting: what "350B tokens each" counts (encoder 164.77B + decoder 185.27B), per stage bar | 0 | 2 | 4 | 1 | 2 | 0 | 2 | 0 | 0 | 11 | Reading, Training | built |

## Rejected

- **Accuracy-per-second "efficiency score"** combining Table 6 and Figure 4: splices two metrics the paper reports separately; rejected by the Methodology rule against splicing.
- **KV cache calculator for other decoders**: belongs to the inference topic and the DeepSeek page (which already animates MLA); here only Qwen3-4B matters.
- **Animated Figure 2 data formats**: the static figure is clear; a details block with Appendix C.4's exact rules carries the numbers.
- **Training-bill tab** (GPU hours for 350B tokens): not in the paper, and a kind of tab Khalid removed elsewhere.
- **Reading TTFT values off the PNG figures**: unnecessary, the e-print has vector PDFs.

## Data and sources

- arXiv HTML v1 (only version): text, tables (`inputs/tables_v1.txt`), anchors.
- arXiv e-print figure PDFs: Figures 1, 4, 5 decoded by `decode_figs.py` (markers by colour and shape, axes from tick marks); every 4x and 8x LCLM point and almost every baseline lands within 0.02 of Table 6.
- Released configs of `latent-context/0.6b-4b-LCLM-16x` (decoder, encoder, adapter safetensors header) for parameter counts (4,021,792,256 + 595,776,512 + 9,181,184) and KV bytes per token (147,456).

## What the Methodology lacked for this page

A rule for figures whose plotted points disagree with the appendix table for one series only: show both, say which panels, and do not pick. And a rule for speed-up claims: always add the "do nothing" yardstick (the uncompressed model's own time) when the baseline is a method that adds work on top of it.

A lesson for papers.md: a trained toy for a retrieval-style mechanism (associative recall through a compressor) can need far more steps than a CPU budget allows at d = 32 to 48; pilot the plain decoder on the raw task first (a few minutes) before building the compressor around it, and drop the toy if even that does not learn.
