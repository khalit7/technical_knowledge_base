# Visualisation ideas: Quantization and Precision

Central question: **how many bits can each number lose before the model's outputs change**, and why the answer depends more on how the scale is shared (and on outliers) than on the bit count.

Existing visuals checked first, so nothing is duplicated:
- Parent root page (Machinery): bytes-per-parameter memory calculator. Linked, not rebuilt.
- QLoRA page: real LLaMA-7B blocks through NF4, FP4, Int4, AF4 (animated), NF4 builder, DQ calculator. Linked; NF4 left out of the block animation here.
- DeepSeek-V3 page: FP8 tile/block granularity on an activation matrix (animated), 14-bit accumulation. Linked from Mixed precision.
- OpenAI page: one MXFP4 block of gpt-oss. Linked.

Scoring (Methodology, section 2): R reproduces a published figure (x2), C computable from public data (x2), P parameter the reader moves, S shows what a sentence cannot, M corrects a misconception, Q measures the central question, N new to the page and the explainers, A animation against the replaced method; build cost subtracted.

| # | Idea | R | C | P | S | M | Q | N | A | cost | score | placement | status |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | **One block of 32 real weights through five scopes, animated** (INT4 per tensor, per channel, per 32; MXFP4; NVFP4), row and block pickers, counters (scale, step, zeroed, levels used, error, bpw), all scopes compared at the last step | 1 | 2 | 2 | 2 | 2 | 2 | 1 | 2 | 1 | 2+4+2+2+2+2+1+2-1 = 16 | Reading, PTQ | built |
| 2 | **Outlier migration, animated**: SmoothQuant against plain W8A8 and AWQ against plain INT4, on a real 16 x 64 activation slice and 8 x 64 weights, α slider, slice and whole-layer errors | 1 | 2 | 2 | 2 | 2 | 2 | 2 | 2 | 2 | 2+4+2+2+2+2+2+2-2 = 16 | Reading, Outliers | built |
| 3 | **One real layer, every scheme**: 17 weight schemes and 6 W8A8 recipes on Qwen2.5-0.5B layer 8 q_proj, error against bits per weight, weight-error toggle (GPTQ and AWQ flip), α curves | 1 | 2 | 1 | 2 | 2 | 2 | 2 | 0 | 2 | 2+4+1+2+2+2+2-2 = 13 | Own tab | built |
| 4 | **Bit explorer**: any value through fp32, tf32, bf16, fp16, E5M2, E4M3, E2M1 (bits, stored value, error, step, edge behaviour), plus inside a shared-scale block (INT8, INT4, MXFP8, MXFP4, NVFP4, NF4), limits table | 2 | 2 | 2 | 2 | 2 | 1 | 1 | 0 | 1 | 4+4+2+2+2+1+1-1 = 15 | Own tab | built |
| 5 | **GGUF block layout to scale** from ggml-common.h structs, block bpw against whole-file bpw | 2 | 2 | 1 | 1 | 1 | 1 | 2 | 0 | 0 | 4+4+1+1+1+1+2 = 14 | Reading, names | built |
| 6 | **Bits per weight against perplexity, two models** (LLaMA-1-7B 2023 against Llama-3-8B current), linear/log | 2 | 2 | 1 | 2 | 2 | 2 | 2 | 0 | 0 | 4+4+1+2+2+2+2 = 17 | Reading, names | built |
| 7 | Format range bars on one log2 axis | 2 | 2 | 0 | 1 | 1 | 1 | 1 | 0 | 0 | 4+4+0+1+1+1+1 = 12 | Reading, formats | built (static) |
| 8 | PTQ vs QAT vs FP8 vs NVFP4 training, published deltas | 1 | 1 | 0 | 0 | 1 | 2 | 1 | 0 | 0 | | Reading, QAT | built as a table, not a chart: rows use different models and metrics, so a chart would splice metrics |
| 9 | Loss-scaling simulator (gradient histogram against fp16 range, S slider) | 0 | 0 | 2 | 2 | 1 | 1 | 1 | 1 | 1 | | | rejected: gradient distributions exist only as figure images (Micikevicius Fig. 3); the explorer's 1e-8 preset makes the point |
| 10 | NF4 codebook on the block animation | | | | | | | | | | | | rejected: owned by the QLoRA page (P-qlora.1, .2) |
| 11 | FP8 tile/block granularity on activations | | | | | | | | | | | | rejected: owned by the DeepSeek-V3 page (P-deepseek_v3.1) |
| 12 | Memory calculator for serving formats | | | | | | | | | | | | rejected: owned by the parent root page |
| 13 | Ternary packing calculator (2 - z against 1.625 and log2 3) | 2 | 2 | 1 | 0 | 1 | 0 | 1 | 0 | 0 | | Reading, ternary | rejected as a widget: two crossovers stated as derived numbers in a sentence |

## Data and formulas
- Weights and activations: Qwen2.5-0.5B (https://huggingface.co/Qwen/Qwen2.5-0.5B), `model.layers.8.self_attn.q_proj` (896 x 896, bf16). Chosen by `probe_layers.py` (inputs/layer_survey.json): largest weight -1.664 at column 5 (64 x the std), activation channel peaks 16 x the median. Calibration text: Pride and Prejudice opening; evaluation: A Tale of Two Cities opening (Gutenberg, public domain), 511 tokens each after dropping position 0 (massive activations, Sun et al. 2024).
- `qformats.py`: formats from specs (OCP FP8 and MX v1.0, NVIDIA NVFP4 blog, QLoRA Appendix E). `quant_lab.py`: whole-layer results (inputs/lab_L8_self_attn_q_proj.json), GPTQ (no lazy batching, 1% damping, static groups with act-order), AWQ grid search, SmoothQuant α sweep. `export_data.py`: the shipped sample (parts/21_js_qdata.js, 26 KB). `check_ref.py` + `check_js.mjs`: JS port equals Python (21,569 values, worst 5.6e-17). `recompute.py` (recompute.txt): every derived number.
- Reproductions, independent: format limits (448, 57,344, 65,504, 6.0, subnormals 2^-9, 2^-16, 2^-24) from bit layouts; GGUF block bpw (HF table) from struct sizes; Q4_K_M promotes exactly half the layers (use_more_bits); 0.61 GB per billion parameters from the README sizes; Bonsai 5.94 GB, 9.1x, 98.2%; NVFP4 3.56x and 1.78x smaller (NVIDIA: about 3.5x and 1.8x).
- Not reproduced, said: the layer results are one layer of one 0.5B model; Q4_K is simplified (no llama.cpp search); NF4 + DQ scale error not modelled.

## What the methodology lacked here
A rule for "measured here" numbers from a real model run offline: they are neither published nor derived. Used a fourth label ("measured here") and kept every script and input.
