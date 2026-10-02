# Visualisation ideas: High-Resolution Image Synthesis with Latent Diffusion Models

The question the paper keeps returning to: **how much cheaper is diffusion when the chain runs in a learned latent, and what does the compression cost?** Every visual below either measures that trade (numbers per step, multiply-adds, time, reconstruction quality against f) or shows a mechanism specific to latent diffusion (the autoencoder, the latent, cross-attention). DDPM's own mechanism (the forward and reverse chain, L_simple, the rate-distortion curve) is not rebuilt: the DDPM page runs it, and this page links there.

Scoring (0 to 2 each; reproduce and computable count double; build cost subtracted; +1 when it can be a step-by-step before/after animation).

| # | Idea | Placement | Score | Status |
|---|---|---|---|---|
| P-ldm_stable_diffusion.1 | **Two chains, to scale, animated**: the same prompt generated live by a toy pixel-space DM (32 × 32 × 3) and a toy LDM (8 × 8 × 3 latent of an f = 4 autoencoder), matched parameters and training steps; one cell per number at the same cell size; captions per step; counters for numbers per step, network evaluations, multiply-adds actually performed, time in the browser; the decode step only in latent mode; the checker's verdict at the end | Reading, Idea | 13 | built |
| P-ldm_stable_diffusion.2 | **Generate tab**: prompt chips (colour, shape, position), guidance scale, DDIM steps, samples, seed; both models side by side, each sample graded by a deterministic checker; held-out prompt combinations flagged; measured time and multiply-adds per sample | Own tab | 12 | built |
| P-ldm_stable_diffusion.3 | **Autoencoder explorer**: build an image, see ℰ(x) as latent planes to scale, 𝒟(z), PSNR and whether the checker still reads the same shape; the paper's PSNR for the same f beside it | Reading, Stage 1 | 10 | built |
| P-ldm_stable_diffusion.4 | **Cross-attention maps**: per prompt token, the softmax weights of every latent position, any DDIM step and layer, over the decoded image | Generate tab | 8 | built (labelled as what the toy does, not an explanation) |
| P-ldm_stable_diffusion.5 | **Predict: how much faster is 16× fewer positions?** Reveal: Table 6 ratios (2.9×, 3.7×, 4.9×) against 16, plus the toy's network time measured in the reader's browser | Reading, Idea | 10 | built |
| P-ldm_stable_diffusion.6 | **Predict: what guidance does to FID** (Table 2: 23.31 to 12.63), then the toy's held-out accuracy at s = 1 and 3 | Reading, Conditioning | 9 | built |
| P-ldm_stable_diffusion.7 | **Predict: ImageNet compute against ADM-G** (271 against 962 V100-days) | Reading, Results | 8 | built |
| P-ldm_stable_diffusion.8 | **f sweep from printed tables**: every Table 8 autoencoder (R-FID log, PSNR) against f, KL and VQ, earlier tokenizers marked; Table 13 and 14 batch sizes per f as the measure of cost | Reading, How much compression | 9 | built |
| P-ldm_stable_diffusion.9 | **Checks of the paper's own numbers**: 18 claims recomputed or cross-compared (Table 6's 1.6× fails for one row; Bedrooms overall < generator compute; Churches step counts, iterations, parameters and FID differ between Tables 1, 12, 18 and Figure 30; CelebA 5.11 against 5.15; the "88 × 8 × 32" latent; GLIDE 6B against 3.5B + 1.5B; the SR user study is against the pixel baseline, not SR3) | Tables tab | 10 | built |
| P-ldm_stable_diffusion.10 | Tables 1 to 11 and 18 as printed, sortable, bold kept, derived ratio and A100-day columns | Tables tab | 7 | built |
| P-ldm_stable_diffusion.11 | **Then and now recipe card**: LDM (2021), SD v1, SD 2, DiT, SDXL, SVD, Sora, SD3, FLUX.1; lines for autoencoder, latent, denoiser, objective, text encoder, size, data; counter of lines unchanged | Own tab | 9 | built |
| P-ldm_stable_diffusion.12 | Figure 3 redrawn (pixel space, latent space, conditioning), responsive | Reading, Conditioning | 5 | built |
| P-ldm_stable_diffusion.13 | Rebuilding Figures 6 and 7 (FID against training steps and sampling throughput per f) | | | rejected: the curves are images only and the text prints one number (the 38 FID gap); never read curves |
| P-ldm_stable_diffusion.14 | A toy f sweep of diffusion models (f = 2, 8, 16 trained the same way) | | | rejected for budget: a one-shape 32 × 32 image has a handful of numbers of real content, so the toy could not show f = 16 or 32 losing information the way ImageNet does; the CPU budget went to the f = 4 autoencoder instead |
| P-ldm_stable_diffusion.15 | Rate-distortion plot (Figure 2) | | | rejected: it is DDPM's data and the DDPM page already rebuilds it from its Table 4; linked |
| P-ldm_stable_diffusion.16 | Perceptual and adversarial losses in the toy autoencoder | | | rejected: LPIPS needs a pretrained VGG; a patch GAN would add instability and CPU time for a small visual gain; the toy uses L1 + KL and says so |
| P-ldm_stable_diffusion.17 | Convolutional sampling beyond the training size (Sec. 4.3.2) in the toy | | | runner-up: the toy's prompt names one of nine absolute positions, so a larger canvas has no defined meaning for it |
| P-ldm_stable_diffusion.18 | Latent rescaling (Appendix G, D.1) as a toggle that trains the toy without rescaling | | | runner-up: needs another trained model; carried as a box with the toy's measured 1/σ̂, SD's 0.18215 and FLUX's 0.3611 |
| P-ldm_stable_diffusion.19 | Training-bill or GPU-days tab | | | rejected: a pattern Khalid removed; compute is shown only where it carries the argument (predict 3, Table 18) |

## Data and formulas
- Paper: arXiv HTML v2, `inputs/paper_v2.txt`, tables parsed with bold flags by `parse_tables.py` into `inputs/tables_parsed.json`, `tables.json` by `mk_tables.py`.
- Derived numbers: `recompute.py` (Table 6 ratios, Table 18 conversions at 2.2×, the 5-day check 50,000 / 0.12 s, cross-table consistency).
- Code facts: `inputs/code/` (beta schedule `linspace(sqrt(start), sqrt(end))²`, LDM-4 linear_start 0.0015, linear_end 0.0195; SD v1 0.00085 to 0.012; scale_factor 0.18215; kl_weight 1e-6; BERTEmbedder n_layer 32, n_embed 1280).
- Later systems: `inputs/later_extracts.txt`.

## Inspiration
Polo Club's Diffusion Explainer (the full-size Stable Diffusion loop); Jay Alammar's Illustrated Stable Diffusion (the pipeline diagram); the DeepSeek MLA explainer (to-scale before/after with counters); the DDPM page (a real toy model in the browser, checked against PyTorch).

## What the methodology lacked here
A rule for papers whose mechanism is a *pipeline of two trained models*: the live ingredient needs both stages, and the CPU budget is mostly spent on the first (the autoencoder), not the one the paper is named after. Also a rule for grading generated images without FID: a synthetic domain with a deterministic checker worked, and should be reused for other image-generation papers.
