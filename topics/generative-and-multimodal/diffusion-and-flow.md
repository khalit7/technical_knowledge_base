# Diffusion and Flow Models

Last updated: 2026-08-24

## Best resources

- Lilian Weng, [What are Diffusion Models?](https://lilianweng.github.io/posts/2021-07-11-diffusion-models/): canonical derivation of DDPM, DDIM, guidance; updated with progressive distillation and consistency models.
- Yang Song, [Generative Modeling by Estimating Gradients of the Data Distribution](https://yang-song.net/blog/2021/score/): the score-based/SDE view that unifies diffusion.
- Meta AI, [Flow Matching Guide and Code](https://arxiv.org/abs/2412.06264): the reference text for flow matching, with code.
- Sander Dieleman's blog, [sander.ai](https://sander.ai/): the best running commentary on diffusion research (guidance, distillation, latents, "diffusion is spectral autoregression").
- Papers in this repo: [DDPM](../../papers/2020-06_ddpm/summary.md), [Latent diffusion](../../papers/2021-12_latent-diffusion/summary.md).

## Core idea (from the notes, tightened)

**Forward process**: take an image and apply n noising steps, each adding Gaussian noise,
until x_n is (approximately) pure noise. With the standard schedule you can jump to any
step t in closed form: x_t = sqrt(alpha_bar_t) * x_0 + sqrt(1 - alpha_bar_t) * eps.

**Reverse process**: train a network to invert one step at a time. DDPM's key
simplification: instead of predicting x_{t-1} directly, predict the noise eps that was
added, with a plain MSE loss; the sampler reconstructs the previous step from that. If n
is small (large noising steps) the per-step posterior is far from Gaussian and training
gets harder; classic DDPM used n = 1000.

**Backbone**: originally a U-Net, chosen because it preserves input dimensions while
compressing to a bottleneck and reconstructing, with skip connections carrying detail.
This is no longer SOTA; transformers replaced it (see DiT below).

## The modernisation path

1. **DDPM (2020)**: eps-prediction, 1000-step ancestral sampling. Works, painfully slow.
2. **DDIM (2020)**: reinterprets the same trained model as a deterministic ODE; sampling
   in 20-50 steps with no retraining, plus invertibility (enables editing/inversion).
3. **Score/SDE view (2021)**: diffusion = learning the score (gradient of log density) of
   noised data; forward SDE has a reverse SDE and an equivalent probability-flow ODE.
   This framing is why arbitrary ODE solvers (Heun, DPM-Solver++) apply.
4. **Latent diffusion (2021)**: run diffusion in the latent space of a KL-regularised VAE
   (typically 8x spatial downsample) instead of pixel space. 10-100x cheaper; this is
   Stable Diffusion and essentially every production model since.
5. **DiT (2022)**: replace the U-Net with a transformer over latent patches, conditioning
   via adaLN-zero on timestep and class/text. Scales cleanly with compute; every current
   frontier image/video model is a DiT variant (often MMDiT: joint text-image streams,
   as in SD3/FLUX).
6. **Flow matching / rectified flow (2022-23, default by 2024-25)**: instead of noising
   schedules and eps-prediction, define a straight-line interpolation
   x_t = (1 - t) * x_0 + t * noise and regress the constant velocity v = noise - x_0.
   Same family as diffusion (a different path parameterisation) but simpler to implement,
   more stable to train, and straighter paths mean fewer sampling steps. SD3 and FLUX are
   rectified-flow MMDiTs; this is the current default objective for new image/video/audio
   models.

## Conditioning and guidance

- **Classifier-free guidance (CFG)**: train with the text condition randomly dropped
  (~10%), then at sampling extrapolate: pred = uncond + w * (cond - uncond). w around
  3-7 trades diversity for prompt adherence; too high causes oversaturation. Costs 2x
  model evals per step; guidance distillation bakes w into the weights.
- Text conditioning enters via cross-attention (SD1/2, U-Net era) or joint attention over
  concatenated text and image tokens (MMDiT). Text encoders: CLIP text towers and/or T5;
  newer models (Qwen-Image, FLUX.2) use LLM/VLM embeddings for better prompt following.

## Samplers and few-step distillation

- **Samplers**: DPM-Solver++ and EDM-style Heun get good quality in 15-30 NFEs from any
  trained model. Karras's EDM paper is the clean design-space treatment of schedules,
  parameterisation, and samplers.
- **Distillation to few steps** (the interesting frontier):
  - Progressive distillation: repeatedly halve the number of steps a student needs.
  - Consistency models / LCM: learn a direct map from any point on the trajectory to the
    endpoint; 1-4 steps.
  - Adversarial distillation (ADD/SDXL-Turbo, FLUX schnell): add a GAN loss so 1-4 step
    outputs stay sharp.
  - Rectified-flow reflow and shortcut/MeanFlow-style models: straighten or average the
    velocity field so few steps are accurate by construction.
  Real-time (sub-second) generation and streaming video rely on these.

## Current landscape (Aug 2026)

**Image**
- **FLUX.2** (Black Forest Labs, Nov 2025): rectified-flow MMDiT, frontier open-weight
  quality, strong text rendering. FLUX.1 [dev] remains the local workhorse.
- **SD3.5** (Stability): MMDiT + triple text encoder; middle weight, permissive-ish
  licence. SDXL still has the deepest LoRA/ControlNet ecosystem.
- **Qwen-Image**: best open model for readable in-image text.
- Frontier LLM-native image generation (GPT-image, Gemini's native image gen) competes at
  the top for instruction-following edits; internally hybrid AR + diffusion decoding.

**Video**
- Closed leaders: **Seedance 2.0** (ByteDance, Feb 2026) and **Kling 3 / O3** top quality
  rankings; **Veo 3.1** leads on cinematic quality with native 48kHz audio; Runway
  Gen-4.5, Hailuo 2.3, Luma Ray 3.2 in the chasing pack. OpenAI deprecated **Sora 2**
  (consumer app ended April 2026, API shutdown Sept 2026).
- Open weights: **Wan 2.6/2.7** (Alibaba) is the serious open line; HunyuanVideo and
  LTX-Video for lighter/faster use.
- Architecture is uniform: causal 3D VAE compressing space and time, DiT over
  spatio-temporal latent patches, flow-matching objective, heavy distillation for speed.

## Interview-ready summary

Diffusion learns to reverse gradual noising; modern practice is: compress with a VAE,
train a transformer (DiT) on latents with a flow-matching objective, condition text via
joint attention, sample with CFG in 20-30 steps or distill to 1-4. Flow matching won
because it is the same math with straighter paths and simpler code.
