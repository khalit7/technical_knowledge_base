# Latent lab: visual ideas, built and rejected

The question the tab keeps returning to: what does a latent keep, and what makes it usable for generation (where the codes are, at what scale)?

## Built
| # | Idea | Where | Why it earns its place | Data |
|---|---|---|---|---|
| LT1 | One image through five models (AE 2, AE 16, VAE 16, VQ-VAE 64 tokens, SD 1.5 VAE), five-step animation, same input, model toggle | section 2 | Before/after on the same input; the bottleneck drawn as what it really holds (2 numbers, 16 means with sigma whiskers, 64 token ids, 4 real 64x64 channels) | eval_lt.py codes, tokens, reconstructions; sd_vae.py latent channels |
| LT2 | Two 2-D latent explorers side by side (AE vs VAE): codes of 600 test images, click or drag to decode (snapped to a precomputed 9x9 grid, the subset of eval_lt.py's 20x20 decodes that fits the size budget), N(0, I) circle, "decodes" view of the whole grid, VAE posterior ellipse of the nearest test image | section 3 | Shows why random codes fail for the AE (scale and gaps) and work for the VAE, by hand | eval_lt.py grids, scatter |
| LT3 | Random-code samples with FD bars and a floor (AE N(0,I), AE fitted Gaussian, VAE prior; 2-d and 16-d) | section 3 | Turns "AE does not generate" into numbers, and shows the honest twist (fitted Gaussian beats the VAE here, as Ghosh et al. 2019 report) | fd_fmnist on 1,000 samples |
| LT4 | Predict-then-reveal: N(0, I) through the 16-d AE (answer: one class, measured share) | section 3 | Corrects the intuition that random codes give noise | measured class shares |
| LT5 | Interpolation: pixels vs AE latent vs VAE latent, animated t with mode toggle and three strips | section 5 | Before/after of the same pair | eval_lt.py |
| LT6 | Beta slider over five recorded runs: reconstructions, prior samples, rate-distortion curve, KL per dimension | section 6 | The trade-off seen and measured | five 16-d VAEs |
| LT7 | Codebook usage (sorted bars, plain vs restart), codes alive over training, the same image as an 8x8 token grid with token highlighting | section 7 | Codebook collapse made visible; an image as tokens | vq.py runs |
| LT8 | SD VAE table for 16 images (PSNR, SSIM fp32/fp16, latent std, posterior sigma) | section 8 | The decoder's ceiling, measured | sd_vae.py |
| LT9 | Same-PSNR comparison: SD reconstruction vs PSNR-matched blur, with SSIM and a deep-feature distance | section 8 | Why perceptual and adversarial losses: pixel error cannot tell sharp from blurry | perc_demo.py |
| LT10 | SNR curves scaled vs raw (computed in-page from SD 1.5's betas and the measured latent power) | section 9 | Shows what the factor does to the schedule | derived |
| LT11 | Noising before/after: same latent, same noise, same t (0, 300, 600, 999), scaled vs raw, decoded, animated over t | section 9 | The mechanism of the scaling bug, seen | sd_vae.py |
| LT12 | Three wrong-factor failures in a real pipeline: decode-side, img2img with SDXL's or no factor, text-to-image decode | section 9 | Debugging skill: what each mistake looks like | sd_scale.py |

## Rejected
- Live in-browser decoder (JS forward pass of the 2-D decoder): about 100k weights, 130+ KB base64 even quantised; a precomputed 20x20 grid gives the same lesson for less (and the brief asked for precomputed grids).
- Encoder activation maps in the walk-through: would add 25+ KB for little; the panels show sizes instead, labelled as such.
- Training an SD-like VAE with LPIPS and a GAN on Fashion-MNIST: LPIPS weights are not installed (no new pip installs), and a discriminator run teaches less than the same-PSNR comparison on the real SD decoder.
- FID (Inception) on the tiny models: Inception never saw grey 28x28 clothing; the topic's classifier-space FD is the more sensitive within-topic measure (root src/data/README.md).
- Loss curves of every run: the logs are in src/latent/runs/ (and in the data part for the beta and VQ runs); a chart would add little to the end-point numbers.

## Size
The lead capped the tab's embedded data at about 120 KB (the root is near its 1.5 MB budget). The data part is 129 KB: grey sprites at 8 grey levels (4-bit PNG palettes), the explorer grids cut from 20x20 to 9x9, 8 samples per strip, 3 interpolation pairs, 3 same-PSNR crops, 4 noising timesteps, colour thumbnails of 64 to 112 px WebP. Everything at full size stays in the scratch outputs and can be re-embedded with make_data.py.

## What the methodology lacked here
A rule for "honest twists": when a measured result contradicts the brief's expected story (a fitted Gaussian on a plain autoencoder beat the VAE), show it next to the expected result with the published work that explains it, rather than choosing settings until the story holds.
