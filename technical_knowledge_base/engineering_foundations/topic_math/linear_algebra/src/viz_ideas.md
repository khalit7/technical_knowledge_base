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

## 2026-10-24 rebuild to the teaching contract
Built (static, inline, numbers from the same inputs as `recompute.py`; power angles and Newton-Schulz values checked by `check_page.mjs`):
| # | Idea | Kind | Where |
|---|---|---|---|
| 12 | Hero: A as Vᵀ, Σ, U in four panels, with rank, spectral norm and κ read off | static annotated diagram | top |
| 13 | Broadcasting bug: (3, 1) minus (3,) becomes a 3 x 3 table | static diagram | s4 |
| 14 | Rank-1 map: null-space and row-space lines, two inputs landing on one output | static diagram | s5 |
| 15 | Least squares: residuals in data space, and the projection picture in R³ (schematic) | static diagram | s7 |
| 16 | Power iteration: x₀ to x₂ on the plane plus the angle per step (was R3, rejected as an animation; a static fan plus bars carries it) | static chart | s8 |
| 17 | PD level set: ellipse with semi-axes 1/√λ along S's eigenvectors | static diagram | s9 |
| 18 | Ill-conditioned 2x2: true scale, and the gap magnified 1,000 times | before/after on the same system | s11 |
| 19 | Newton-Schulz: singular values of A/‖A‖F climbing to 1 | static chart | s11 |
Moved: the Low-rank lab (#2, #4) from its own tab into Reading section 12, because it explains one mechanism.

## 2026-11-07: the split layout and four 3D stages (renderer v2)
| # | Idea | Kind | Where | Decision |
|---|---|---|---|---|
| 20 | Hero as four glass plates one behind the other (input, after Vᵀ, after ΣVᵀ, after UΣVᵀ = A), the circle's points streaming through, then A in one step and the rank-1 truncation | 3D stage, 6 steps | top (Fig. 1) | built; replaces #12 |
| 21 | The tiny model's W: input plane on the floor, W as a plate, the column space as a tilted plane in R³, the left null line at right angles, then Wᵀ collapsing a cloud of score vectors onto the plane | 3D stage, 5 steps | s5 (Fig. 4) | built; replaces the 2D subspace sketch (its R³ panel was a hand projection) |
| 22 | Least squares in R³, one axis per data point, camera turned so the column space is level; foot, residual at right angles, the QR basis | 3D stage, 5 steps | s7 (Fig. 8) | built; replaces the schematic half of #15 (the data-space half stays 2D beside the problem) |
| 23 | Eckart-Young on a real matrix: GPT-2's 9 x 9 embedding-cosine matrix (section 1's table) as a bar field rebuilt from 1, 2, 3 rank-one layers, then the spectrum | 3D stage, 5 steps | s10 (Fig. 11) | built; new, computed from the page's own data (recompute.py `lr_*`) |
| 24 | Conditioning as a long thin ellipsoid | 3D | s11 | rejected: the page's ill-conditioned example is 2x2, and the two nearly parallel lines (#18) say it flat; no 3x3 ill-conditioned matrix on the page to drive one |
| 25 | A 3x3 SVD (unit sphere to ellipsoid) | 3D | s10 | rejected: the page has no full-rank 3x3 running matrix (its 3x3 examples are rank 2), and inventing one is not allowed; the hero does rotate, stretch, rotate on A |
| 26 | GPT-2 low-rank lab spectra and error against k | kept 2D | s12 | log axes read best flat |
| 27 | Matrix multiplication four ways, SVD against eigen stepper | kept 2D, step lists added | s3, s10 | 2x2 grids and a plane say it all |
Kept 2D and why: the vector, map-preset, broadcasting, rank-1, L1-ball, power-iteration, PD-ellipse, near-singular and Newton-Schulz figures are 2x2 or planar (a plane says it all), the LoRA spectra and the low-rank lab are curves on log or index axes, and the playground is a calculator.
