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

## 2026-10-23 rebuild (teaching contract; Model formats folded in)
- **Built: hero figure** (`26_js_lo_hero.js`, static): Qwen3-4B Q4_K_M+i on this 16 GB M1 Pro. Memory to scale (weights 2.49 GB measured file, F16 KV at 40,960 tokens 6.04 GB derived, GPU working set 12.7 GB measured, macOS share), then bytes read per token with the ceilings 200/2.49 = 80 and 200/8.53 = 23 tok/s against the measured 43.2. One picture for fit and speed, the page's two questions.
- **Moved inline:** speed against size (section 1, beside the bandwidth claim), quality against size (section 5), every-file table (closed block in section 5), all llama-server lab runs (closed blocks in sections 1, 6, 8), and from Model formats the conversion map (section 3; default node now GGUF BF16, two routes, one lossless and one lossy). The Quant ladder and llama-server lab tabs and the Model formats Conversion map tab are gone.
- **Kept as tabs:** Fit and speed (a calculator used across sections 1, 2 and 9) and File explorer (a dataset view of three real files, used across section 3).
- **Absorbed from Model formats** (its viz_ideas.md is in `formats/viz_ideas.md`): repo bar, dtype bits widget, pickle machine stepper, safetensors hex, GGUF file map, Q4_K_M type mix bars, Q4_K block decode (closed), GGUF block against MLX groups, ONNX operator bars (closed), load-time bars, file sizes (closed).
- **Rejected:** a second memory calculator in Reading (the hero plus the Fit and speed tab cover it); redrawing the Q4_K super-block twice (the block animation teaches it; the hand decode is a closed block).

## 2026-11-12 rollout (split layout, 3D stages v2, explained and autoplaying animations)
- **Built, 3D (renderer v2, `25_js_s3.js`):** Fig. 1 hero `40_js_sc_hero.js` (replaces the static SVG hero `26_js_lo_hero.js`, removed): the M1 Pro's 16 GB unified pool to scale, the GPU working set, Qwen3-4B Q4_K_M+i weights and full-context F16 KV, flows from the bytes each token reads to the GPU, ceilings 80 and 23 against the measured 43.2. Fig. 2 `41_js_sc_stack.js`: the stack table turned into two stacks of glass layers (file, kernels with back-end chips, engine, server, apps), one Ollama request down and tokens back up. Fig. 3 `42_js_sc_bw.js`: four Qwen3-1.7B files as boxes as tall as the GB each token reads, each beside its ceiling and its measured speed, then the 16,000-token KV cache stacked on Q4_K_M. Fig. 4 `43_js_sc_mem.js`: a Mac's one pool against a PC's system RAM, PCIe link and 32 GB card; the file crossing the link once; a 43 GB model spilling 11 GB of layers to system RAM.
- **Step lists added** to the quantised-block, pickle (three modes; the 13 key opcodes of the checkpoint grouped into 8 stretches) and cache-reuse animations; their captions moved into the lists (the block animation keeps one line of the chosen format's own numbers).
- **Widget, not animation:** the File explorer's field walk (long-replay rule b: a reader-driven inspector over three files, no autoplay, no step list).
- **Kept 2D:** the speed and quality scatters (log axes, many files), the slots sweep (bars plus a line), the dtype bit strips, the repo and GGUF byte maps, the MLX group layout, the conversion map, the loading bars, the type-mix bars, the Fit and speed calculator: all read best flat. The 3D figures carry the spatial ideas (memory pools, the stack, bytes against speed side by side).
- **Rejected:** a 3D quantised block (the 32 weights against their levels is a flat plot; depth would hide the error bars); a 3D slots picture (the batching sibling owns slots and paging and already draws block pools in 3D); a photo of an M1 Pro or RTX 5090 board (no openly licensed image found that shows something the figures do not: the unified pool is a package-level fact a die photo does not make visible).
