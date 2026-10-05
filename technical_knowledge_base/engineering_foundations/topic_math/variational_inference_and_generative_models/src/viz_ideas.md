# Visualisation ideas: Variational inference and generative-model maths

The question the page keeps returning to: **how big is the gap between what we can compute (the ELBO, a few network calls) and what we want (log p(x), exact samples), and what closes it?** Every visual measures one such gap or the cost of closing it.

Existing visuals checked first (not rebuilt, linked): Information theory s7 (forward vs reverse KL on two humps), Probability s15 (estimators on x^2), the DDPM paper page (four toy DDPMs, Swiss-roll forward/reverse animation, learned score field, Table 2 ablation), the root's Notation decoder (eq. 14 decoded).

Scores 0 to 2 on: parameter to move, reproduces a stated figure (x2), computable from public data (x2), shows what a sentence cannot, corrects a misconception, measures the central question, absent elsewhere, animation bonus; minus build cost.

| # | Idea | Placement | Score | Status |
|---|---|---|---|---|
| 1 | **Forward then back, three samplers** (DDPM / DDIM inversion / flow inversion) on the same 300 points, coloured by starting moon; counters: on data, on own moon, distance from start, network calls | Reading s14 | 14 | built (the before/after animation; extends the DDPM page's Swiss roll with the invertibility contrast) |
| 2 | **ELBO lab**: model A (Gaussian posterior) and B (two humps), q sliders, identity bar log p = ELBO + gap, gradient ascent with pathwise or score-function estimator, ELBO trace | own tab | 13 | built |
| 3 | **Diffusion lab**: sampler, schedule, steps, class, guidance w, seed; on-data and on-moon rates, spread; log-SNR strip of where steps land | own tab | 13 | built (the strip came from finding that step placement, not straightness, explains few-step quality) |
| 4 | **CAVI animation** on Bishop's Normal-Gamma example: exact posterior shaded, mean-field ellipses round by round | Reading s5 | 11 | built |
| 5 | **Estimator variance by dimension** (pathwise vs score function vs baseline, d = 1, 10, 100) | Reading s6 | 11 | built |
| 6 | **MNIST VAE**: training curves (inline), latent map, decoded grid, reconstructions, measurements, gap split by exact quadrature | Reading s8 + own tab | 12 | built |
| 7 | **Beta sweep table** with per-dimension KL bars (posterior collapse) | Reading s10 | 10 | built |
| 8 | **Schedules**: linear vs cosine abar_t with a t slider and the noised cloud | Reading s12 | 9 | built |
| 9 | **Straightness** of DDIM vs flow-matching trajectories from the same noise | Reading s18 | 9 | built; measured result (flow 0.55 < DDIM 0.73) corrected the draft's claim |
| 10 | Live VAE decoder in the browser (drag z, see the digit) | rejected | | 200k decoder weights (about 270 KB even at 8 bits) for what the 10 x 10 grid shows |
| 11 | Learned score field arrows | rejected | | the DDPM paper page has it |
| 12 | Image-scale diffusion model | rejected | | weights too large for a sandboxed page; 2-D makes every sample checkable |
| 13 | Normalising-flow toy (RealNVP on moons) | rejected | | one section of scope; two checked closed forms carry the idea |

What the methodology lacked here: a rule for toy models whose measurements contradict a textbook claim (straightness). Done as for published figures: show the measurement, explain it, keep the claim only where it holds (conditional paths).
