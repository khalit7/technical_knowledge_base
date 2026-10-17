# Diffusion from zero: visual ideas, built and rejected

The question the page keeps returning to: given one trained denoiser, which decisions around it (schedule, target, sampler, guidance, distillation) change the samples, and how do you see each one's effect? Visuals were chosen to make each decision's effect measurable on the same model, and not to repeat the root's Diffusion lab (forward-process strip, SNR chart, error by timestep, the same noise through 1 to 50 steps, steps against quality, guidance strip, SD steps gallery and time split are linked, not rebuilt).

Scores 0 to 2 on: parameter the reader controls / reproduces a published or lab figure (x2) / computable from public data or our runs (x2) / shows what a sentence cannot / corrects a misconception / measures the page's question / absent from the lab and the paper pages; plus 2 for a before/after animation; minus build cost.

## Built
| # | Visual | Where | Score | Notes |
|---|---|---|---|---|
| 1 | **Exact-score toy, animated: the same 160 noise values through DDIM (ODE) and DDPM (stochastic)** over the noisy density p_t, counters for step, sigma, committed share, distance to truth | Reading, section 1 | 15 | Before/after on one input (Khalid's preferred pattern). The toy has a closed-form denoiser, so it is a perfect model; JS port checked against gmm_toy.py to 3e-15. |
| 2 | **Toy with a hedging knob** (tau, eta, steps): histogram against the true density, distance, mass between bumps | Reading, section 4 | 15 | Reproduces the tiny model's "DDIM plateaus, DDPM keeps improving" with a known cause; the page's explanation of the lab's surprising result. |
| 3 | **Loss weighting on the lambda axis**: eps, x0, v, Min-SNR, EDM, normalised share of the loss | Reading, section 3 | 11 | Derived from formulas (Kingma and Gao 2023's framing); toggles the two schedules. |
| 4 | **Sampler workbench tab**: 12 samplers x 1 to 1,000 steps on one checkpoint, strips, FD/accuracy/diversity against NFE, the 8,000-step model, timestep walks | Own tab | 14 | Reuses the lab's recordings for DDPM/DDIM/DPM/Euler and adds eight samplers; same noise and scoring. |
| 5 | **Schedule designer tab**: preset or custom beta range, zero terminal SNR, offset noise, resolution shift; ln SNR chart, counters, the running example noised, and the per-image mean tiles (the brightness leak made visible) | Own tab | 13 | Defaults reproduce the lab's derived numbers independently (check_toy.mjs against recompute.py). |
| 6 | **Guidance explorer tab**: SD 1.5 image sets (scale x rescale, interval, negative prompts, zero terminal SNR, few steps) with saturation; tiny-model accuracy-against-FD curves for CFG, rescale, interval, DDPM, autoguidance | Own tab | 13 | Accuracy against FD shows the trade-off as a curve rather than two separate charts. |
| 7 | **CFG rescale before/after** and **LCM-LoRA against DPM-Solver++ at equal steps** | Reading, sections 5 and 6 | 12 | Real SD 1.5 images at 256 px. |
| 8 | **Bug strips**: the same ten noises sampled correctly and with four real bugs | Reading, Mistakes | 11 | Real bad outputs, as the brief asks. |
| 9 | Predict-then-reveal: ODE vs SDE with an exact model; the brightness of the mean; the hedging model | Reading | 10 | |

## Rejected
- Rebuilding the lab's trajectory animation, schedule strip or SNR chart: linked instead.
- A live in-browser U-Net sampler: 4 MB of weights (the lab rejected it for the same reason).
- Training a min-SNR or v/EDM-weighted model to compare weightings: a 15-minute run per variant at one seed would show noise, not the published effect; the published ablations are cited.
- Training a zero-terminal-SNR v-model fine-tune of SD 1.5: hours of GPU; the failure of the flag alone on the epsilon model is the cheap, instructive run.
- SD-Turbo / ADD run: a second 2 GB model for a lesson LCM-LoRA already shows; published numbers instead.
- An animated SD denoising trajectory: per-step VAE decodes and many images; the toy and tiny-model strips teach the coarse-to-fine lesson.
- EDM's stochastic churn sweep on the tiny model: the eta sweep already measures "how much fresh noise helps".

## What the methodology lacked
A rule for toys that stand in for a real model: here the exact-score toy is only useful because it reproduces the measured pattern of the real model (plateau of the ODE sampler under hedging). The page says which parts transfer and checks the toy's JS against Python.
