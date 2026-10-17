# Visualisations: built and rejected (Local and on-device inference)

Method: `.claude/skills/explainer-page/visuals/choosing.md`. The reader is new to serving; every visual must teach one mechanism on real data from this laptop, or do the page's arithmetic for him. Scores: teaching value / real data / not already on a sibling (each 1-5).

## Built
| Visual | Where | Score | Data | Why it earns its place |
|---|---|---|---|---|
| One block of 32 real weights through Q8_0, Q4_0, Q4_K, IQ4_XS, Q2_K (before/after, step animation: weights, scale, snap to levels, stored bytes, read back with error) | Reading s3 | 5/5/5 | the real block from the F16 GGUF and the stored scales and codes decoded from the quantized GGUFs made here (`scripts/blocks.py`, gguf-py dequantizer) | Quantization from zero needs a picture of "scale + codes"; the same input under five formats is the before/after the method asks for; the levels drawn per format make K-quant sub-scales and the non-uniform IQ4 table visible |
| Cache reuse off against on, same edited prompt (step animation, bars to scale in tokens) | Reading s5 | 5/5/5 | measured token counts and prompt times from `srvlab.py reuse` | The difference between prefix caching and KV shifting is a mechanism in steps; the measured counts make it concrete |
| Quality against size scatter (KLD log, PPL, same-top, p99; filled = imatrix) | Quant ladder tab | 5/5/4 | 2 models x ~18 files + MLX (llama-perplexity, mlxq.py) | The core trade of local inference; extends the parent's 3-point KLD bench to a full ladder |
| Speed against size with the bandwidth ceiling | Quant ladder tab | 5/5/4 | llama-bench tg/pp of every file | Shows the ceiling and where files fall below it (dequant arithmetic) |
| Sortable table of every file | Quant ladder tab | 3/5/5 | same | Lookup |
| Fit and speed calculator (memory bar, decode estimate, prefill where calibrated, check against measured) | Fit and speed tab | 5/4/4 | parent planner model shapes from config.json; vendor bandwidths; measured bits per weight and efficiency | Answers "will it fit, how fast" for a dual 5090 box and Macs; shows its residual against this laptop |
| Slots sweep chart | Reading s5 | 4/5/5 | srvlab slots | Concurrency against per-user speed on llama-server |
| Stack diagram (two engines, four products) | Reading s0 | 4/3/5 | source reading | Orients the page |

## Rejected
- A token-by-token decode animation of bandwidth: the parent's prefill/decode animation already shows it; linked instead.
- A GGUF byte layout explorer: owned by the Model formats sibling.
- A KV cache quantization chart: measured by the batching sibling (q8_0/q4_0 perplexity); linked.
- A price/performance chart of consumer GPUs: prices are volatile and not the page's subject; specs table instead.
- Animating Ollama's process tree: a static description with source lines teaches the same.

## What the methodology lacked
Nothing structural; the useful addition was "reuse the parent's planner functions for model shapes" so the fit tab cannot disagree with the Capacity planner.
