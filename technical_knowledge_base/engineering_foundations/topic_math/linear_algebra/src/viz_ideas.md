# Visualisation ideas: Linear algebra for ML (2026-10-05)

Central question: **what does a matrix do to directions, and how unequal are its stretches?** (rank, norms, eigen and singular values, conditioning and low rank are all answers to it). Existing visuals elsewhere, not rebuilt: LoRA trained live (LoRA paper page), MLA animation (DeepSeek), the tiny model's gradient and curvature bowl (root Gradient lab), attention on real weights (Attention paper page).

Scores 0 to 2 on: moving quantity, reproduces a source, computable from public data (counts double), shows what a sentence cannot, corrects a misconception, measures the central question, absent elsewhere, animation; minus build cost.

| # | Idea | Score | Placement | Status |
|---|---|---|---|---|
| 1 | **Unit circle and grid under A: one step, then SVD rotate-stretch-rotate, then eigen P, Λ, P⁻¹; A and symmetric S = WᵀW** (counters: area, image lengths, angle kept or not) | 13 | Reading s12 | built (the brief's suggested before/after) |
| 2 | **Low-rank lab on real GPT-2 small layer 5**: spectrum against random, Frobenius/spectral/output errors on real inputs, loss at 15 k values, params; all 48 matrices at once | 14 | Own tab | built; corrects the old page's "weights are often effectively low rank" |
| 3 | **Matrix playground** 2x2 picture (SVD scrub, eigen lines) and 3x3 numbers; Newton-Schulz step button | 11 | Own tab | built |
| 4 | **Real LoRA updates' spectra** (two public adapters) and the paper's amplification factor | 12 | Reading s14 + lab | built; the paper's 21.5 does not reproduce at GPT-2 scale (said) |
| 5 | **Matmul four ways animation**, same product, counter of 8 multiplications | 9 | Reading s3 | built |
| 6 | Map presets (columns are where axes land; det as area) | 8 | Reading s2 | built |
| 7 | Four subspaces of the tiny W (input plane, output plane and left null line) | 8 | Reading s6 | built (static) |
| 8 | Unit balls with a loss contour touching L1 at a corner | 7 | Reading s7 | built (static) |
| 9 | float32 normal equations against QR on a Vandermonde fit (77% vs 0.0018%) | 9 | Reading s13 table | built (table, numbers from recompute.py) |
| 10 | Real GPT-2 embedding cosine table with the random-pair baseline 0.27 | 8 | Reading s1 | built |
| 11 | Per-head W_Q W_Kᵀ rank 64 measured | 6 | Reading s15 (number) | built as a measured number |
| R1 | Gram-Schmidt animation | 4 | | rejected: the worked box carries it; low gain over static |
| R2 | PCA scatter explorer | 5 | | rejected: Classical ML owns PCA in practice; the worked 4-point example suffices |
| R3 | Power-iteration animation | 5 | | rejected: the angle sequence in s10 says it; would repeat the SVD figure |
| R4 | Einsum cost calculator | 6 | | belongs to matrix_calculus_and_backprop |
| R5 | Full-network SVD compression with fine-tuning recovery (ASVD, SVD-LLM) | 7 | | rejected: research compression methods would need calibration runs; out of scope, the truncation results already make the point |

Data: `inputs/la_gpt2.py` (GPT-2 small revision 607a30d, WikiText-2 raw test, adapters monsterapi/gpt2_alpaca-lora 368cce4 and harigovind511/GPT2-Guanaco-LoRA 34698cd), output `inputs/gpt2_la.json`; page data `parts/20_js_data.js` made by `mk_data.py`.

What the methodology lacked: a rule for "real data that contradicts a commonly repeated claim" (GPT-2 weights are not low rank by truncation): treated as a correction with the measurement shown, plus the scope (one small model).
