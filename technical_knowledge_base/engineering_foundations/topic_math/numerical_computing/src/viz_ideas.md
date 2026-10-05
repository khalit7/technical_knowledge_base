# Visualisation ideas: Numerical computing for ML (2026-10-05)

Central question: **what does a finite grid of numbers do to a computation, and which rearrangement keeps it finite and accurate?** (range: overflow and underflow; precision: rounding, cancellation, summation; order: non-associativity and determinism). Existing visuals elsewhere, not rebuilt: the root Gradient lab's overflow and log-sum-exp panel (top-logit slider, float32 and float64), the Quantization and precision page's Bit explorer (block formats MXFP4, NVFP4, NF4, INT) and One real layer tab, the DeepSeek-V3 paper page's FP8 tile scaling and accumulation animation, the FlashAttention paper page's kernel run.

Scores 0 to 2 on: moving quantity, reproduces a source, computable from public data (counts double), shows what a sentence cannot, corrects a misconception, measures the central question, absent elsewhere, animation; minus build cost.

| # | Idea | Score | Placement | Status |
|---|---|---|---|---|
| 1 | **Softmax before/after animation** on logits (1000, 999, 0), naive against stable, every intermediate as its stored bits, float32, float16 or bfloat16 (counters: finite, inf, NaN) | 14 | Reading s9 | built (the brief's suggested animation); the bf16 mode shows 999 stored as 1000 and p = (0.5, 0.5, 0) |
| 2 | **Float explorer**: any number in 7 formats, flippable bits, neighbours, error, ulp, E4M3 saturating or NaN, add-y absorption | 13 | Own tab | built; differs from the quantization page's Bit explorer by bit flipping, neighbours, TF32/fp64 and arithmetic |
| 3 | **Loss-scale slider over SmolLM2-135M's real gradient histogram** with measured pure-fp16 runs at 7 scales | 14 | Reading s11 | built; reproduces the 2017 paper's "about 5% below 2^-24" independently on a different model (5.0% below 2^-25, 7.2% below 2^-24) |
| 4 | **Naive against Kahan summation animation** in float16 (2048 then ten 0.4s) | 10 | Reading s7 | built |
| 5 | **Summation lab**: 4 algorithms, 3 formats, 5 data kinds, error against N, 20 shuffled orders | 12 | Own tab | built; JS checked against NumPy on the uniform cases |
| 6 | Measured summation table (NumPy/PyTorch, N to 10^6) | 10 | Reading s7 | built; shows Kahan failing in bf16 at 10^6 (n u^2 = 15) |
| 7 | Spacing staircase: ulp against |x| for 6 formats | 9 | Reading s4 | built |
| 8 | Every E4M3 value on a number line (linear and log) | 7 | Reading s3 | built |
| 9 | Decode card (8 values x 4 formats) | 7 | Reading s2 | built |
| 10 | Determinism table: thread counts, 20 orders, MPS index_add_ (20 of 20 distinct) | 9 | Reading s8 | built (measured table) |
| 11 | Lost-updates table on SmolLM2's real weights (fp32 / fp16 / bf16 at three step sizes) | 10 | Reading s11 | built (measured table) |
| R1 | Training-curve comparison fp16 with and without scaling over many steps | 6 | | rejected: one step already shows the mechanism exactly; many steps on a laptop would be slow and noisy |
| R2 | Interactive condition-number calculator for arbitrary f | 5 | | rejected: the table of five worked functions says it; Linear algebra owns matrix conditioning |
| R3 | Block-format (MXFP4/NVFP4) explorer | 4 | | rejected: owned by the quantization page's Bit explorer |
| R4 | GPU split-K reduction simulator | 6 | | rejected: no GPU here to measure; the CPU thread-count and MPS atomics measurements are real |

Data: `inputs/measure_a.py` (bits, constants, summation, order, threads, MPS; output `out_a.json`), `inputs/measure_b.py` (SmolLM2-135M, HuggingFaceTB/SmolLM2-135M, one step on 4 x 128 tokens of Tiny Shakespeare; output `out_b.json`), `inputs/nan_demo.py`; PyTorch v2.14.1 source excerpts in `inputs/pytorch_v2.14.1/`; OFP8 extract in `inputs/ofp8_spec_extract.txt`. Page data `parts/20_js_data.js` made by `mk_data.py`.

What the methodology lacked: a rule for two libraries that legitimately disagree on the same operation (PyTorch saturates an FP8 E4M3 overflow, ml_dtypes returns NaN; the spec allows both): treated like conflicting primary sources, both measured and shown side by side, with the spec clause that permits both.
