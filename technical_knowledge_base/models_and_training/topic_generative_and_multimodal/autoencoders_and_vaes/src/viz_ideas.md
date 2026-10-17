# Visual ideas, built and rejected (av)

The question the page keeps returning to: what does an autoencoder's latent keep, and what makes it easy for a generator to use (rate, distortion, usage, modelability)?

Existing visuals not repeated (the parent's Latent lab owns them): one image through five models, the 2-D latent explorer, random-code FD bars, interpolation, the beta slider, VQ codebook usage plain vs restart, the SD VAE table, the same-PSNR blur, the scaling-factor noising strip and pipeline failures.

## Built
| # | Idea | Where | Score (method questions) | Data |
|---|---|---|---|---|
| AV1 | ELBO-units table and strips: the same VAE with a per-pixel-mean reconstruction, and with Gaussian sigma 1 and 0.1, against the lab's reference; predict-then-reveal on the mean-reduction bug | Reading 2 | corrects a common misconception (2), measured (2), before/after on the same images (2) | e_* runs |
| AV2 | Posterior collapse on images: a PixelCNN-decoder VAE trained four ways (plain, annealing, free bits, no code), table with the shuffle test | Reading 3 and its own tab | the mechanism measured (2), fixes compared on one model (2) | c_* runs |
| AV3 | Collapse tab: KL curves with the annealing weight, decoding test images row by row from their own codes (an animation of the real recorded outputs), KL per dimension | tab Posterior collapse | step animation (2), shows what the KL number means (2) | collapse.json |
| AV4 | Pixel loss vs + LPIPS vs + patch GAN on the same 8 images, a three-step before/after with PSNR, LPIPS, rFD counters | Reading 4 | before/after on one input (2), perception-distortion trade-off made visible (2) | g_* runs |
| AV5 | VQ variants table (plain, restart, EMA, L2, K = 1,024) | Reading 5 | measured, equal budget (2) | quant.json |
| AV6 | 2-D quantizer toy: VQ (plain, restarts), FSQ grid, LFQ quadrants, animated training steps with counters | tab Quantizer playground | step animation against the method replaced (2), shows why FSQ cannot collapse (2); illustrative | computed in the page |
| AV7 | Eleven trained tokenizers: table, usage over training, sorted code frequencies (log), reconstructions, token map | tab Quantizer playground | measured (2), every quantizer on one axis (2) | quant.json |
| AV8 | Published tokenizer table (16 tokenizers, tokens, codes, bits, rFID) and a token calculator | Reading 8 | every input published (2), derived arithmetic (2) | papers |
| AV9 | Tokenizer comparator: nine pretrained autoencoders on the same 16 images: shapes, PSNR, SSIM, LPIPS, per-image table, crops animated through every model, latent statistics and normalisation recipes | own tab | real models, same input (2), before/after crops (2), recipes read from configs (2) | roundtrip.py, metrics.py |
| AV10 | Generator VAE config table (published and read from configs) | Reading 9 | configs (2) | configs |

## Rejected
- Training a tiny VAE at several channel counts and a tiny diffusion model on each to show the reconstruction-generation trade-off: a cheap version would need a generator per latent and its result at toy scale would be noise-level; the published SD3 and VA-VAE tables carry it (Khalid 2026-10-15: published numbers over expensive runs that teach little).
- rFID of the pretrained autoencoders: 16 images give no usable Frechet distance; LPIPS, SSIM and PSNR are shown instead and published rFIDs quoted.
- Running SD3's or FLUX.1-schnell's own VAE: gated repositories (no token); FLUX.1's VAE runs from the Z-Image-Turbo repo, which ships it under Apache 2.0.
- A live in-browser decoder: weights too large for the page budget; recorded outputs are shown.
- Interpolation and latent explorers again: owned by the Latent lab.

## What the methodology lacked
A rule for binding prose numbers to data: here every measured number in the Reading tab is a `data-av` span filled from the embedded records, so a rerun cannot leave stale numbers in the text.
