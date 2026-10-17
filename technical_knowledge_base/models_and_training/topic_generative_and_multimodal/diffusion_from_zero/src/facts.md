# Diffusion from zero: verified facts (2026-10-17; also appended to the shared FACTS file under "dz")

## Source lines, diffusers v0.41.0 (pinned clone, commit 086bf9578c0f)
- schedulers/scheduling_ddim.py: 103 `def rescale_zero_terminal_snr` (Lin et al. Algorithm 1; shift so the last sqrt(abar) is 0, scale so the first is unchanged); 210 `rescale_betas_zero_snr: bool = False`; 286 variance `(beta_prod_t_prev / beta_prod_t) * (1 - alpha_prod_t / alpha_prod_t_prev)`; 481 `std_dev_t = eta * variance ** (0.5)`; 488 `pred_sample_direction = (1 - alpha_prod_t_prev - std_dev_t**2) ** (0.5) * pred_epsilon`.
- schedulers/scheduling_dpmsolver_multistep.py: 222 solver_order 2, 227 algorithm_type "dpmsolver++", 228 solver_type "midpoint", 224 to 225 thresholding False / dynamic_thresholding_ratio 0.995; 982 to 992 the 2M midpoint update (h, r0, D0, D1, x_t).
- schedulers/scheduling_euler_discrete.py: 278 init_noise_sigma (max sigma for linspace/trailing spacing), 345 `sample = sample / ((sigma**2 + 1) ** 0.5)`, 551 `rho = 7.0`, 755 churn gamma, 772 to 786 the Euler step.
- schedulers/scheduling_edm_euler.py: 92 sigma_data 0.5; 210 c_noise = 0.25 log sigma; 236 c_skip; 239 c_out (default branch); 596 c_in.
- schedulers/scheduling_lcm.py: 565 to 566 c_skip / c_out boundary scalings; 221 timestep_scaling 10.0; 211 original_inference_steps 50.
- pipelines/stable_diffusion/pipeline_stable_diffusion.py: 69 `def rescale_noise_cfg`, 86 to 91 its body, 1057 applied when guidance_rescale > 0; 713 initial latents times init_noise_sigma.
- training_utils.py: 82 compute_snr; 632 EMAModel decay 0.9999 default (635 use_ema_warmup False, 636 inv_gamma 1.0, 637 power 2/3).
- examples/text_to_image/train_text_to_image.py: 973 to 976 offset noise (`noise += args.noise_offset * torch.randn((B, C, 1, 1))`); 1028 to 1034 Min-SNR weights (divided by SNR for epsilon, by SNR + 1 for v).

## Derived (runs/recompute.py, float64)
- Linear 1e-4..0.02: sqrt(abar_999) 0.006353, SNR < 1 from t = 259 (74.1% of steps noise-dominated); cosine: 0.702 at t = 500, SNR < 1 from 496 (50.4%); SD scaled-linear: sqrt(abar_999) 0.068265, SNR_999 0.004682, SNR < 1 from 354 (64.6%). These equal the Diffusion lab's numbers and Lin et al.'s quoted values.
- Brightness leak: SD 1.5 per-channel mean over 64 x 64 = 4,096 values keeps SNR 19.18 at t = 999 (the per-value SNR of t = 52); offset noise 0.1 drops it to 0.457, 0.05 to 1.71. Tiny model (32 x 32, linear): 0.041.
- sigma ranges: linear 0.0100 to 157.4; SD 1.5 0.0292 to 14.61. Ten Karras sigmas (rho 7) on SD's range in out/recompute.json.
- Zero-terminal-SNR rescale makes abar_999 exactly 0 for every schedule; SNR < 1 then from 258 (linear), 496 (cosine), 337 (SD).
- Loss weights in clean-image units: eps = SNR, v = SNR + 1, x0 = 1, Min-SNR = min(SNR, 5), EDM = 1/sigma_data^2 + 1/sigma^2 = 4 + SNR (sigma_data 0.5, lambda = -2 ln sigma).

## Published (transcribed with table and page in inputs/published.json; read 2026-10-17 from the arXiv PDFs and ar5iv)
- DDIM Table 1 CIFAR-10 FID (S = 10/20/50/100/1000): eta 0: 13.36/6.84/4.67/4.16/4.04; eta 1: 41.07/18.36/8.01/5.78/4.73.
- EDM: CIFAR-10 1.79 cond / 1.97 uncond at 35 NFE (deterministic Heun); ImageNet-64 pretrained ADM 2.64 deterministic (NFE 79) to 1.55 stochastic (NFE 511), Figure 6 labels 2.66; retrained 2.23 to 1.36; ln sigma ~ N(-1.2, 1.2^2); rho 7; S_churn 30/80/80/40.
- Lin et al.: phi = 0.7 (0.5 to 0.75 works); SD terminal SNR 0.004682; CFG form x_neg + w (x_pos - x_neg), w = 7.5.
- Guidance interval: SD-XL used sigma in (0.28, 5.42], w = 16, 50% of 32 Heun steps, picked visually (no FID); EDM2-XXL ImageNet-512 FID 1.81 to 1.40 with (0.19, 1.61], w = 2.0, 6 of 32 steps; EDM2-S 2.23 to 1.68 with (0.28, 2.90].
- Autoguidance: ImageNet-512 EDM2-S 2.23 (CFG) to 1.34 (guided by XS trained 1/16 as long); EDM2-XXL 1.81 to 1.25 (guided by M, T/3.5); ImageNet-64 EDM2-S 1.01 (XS, T/8).
- Progressive distillation CIFAR-10 FID 9.12/4.51/3.00/2.57 at 1/2/4/8 steps. Consistency distillation CIFAR-10 3.55/2.93, ImageNet-64 6.20/4.70. LCM Table 1 (LAION-Aes 6+, 512) 35.36/13.31/11.10/11.84 at 1/2/4/8 steps; LCM-LoRA 67.5M trainable on SD 1.5. ADD-M 1 step COCO FID-5k 19.7. DMD 2.62, DMD2 1.28 ImageNet-64 one step.
- Min-SNR: 3.4x faster convergence, gamma 5. Hoogeboom: SNR x (64/d)^2. Offset noise blog 2023-01-30, offset 0.1. CFG paper: (1 + w) eps_c - w eps_u; p_uncond 0.1 and 0.2 about equal. Imagen dynamic thresholding p = 99.5 (appendix figure caption). Meng et al.: "at least 10-fold" (abstract) vs 20x fewer steps (Figure 1 caption).
- SD-Turbo and SDXL-Turbo model cards name ADD as their training method; the ADD paper itself names its models ADD-M and ADD-XL.

## Measured on Apple M1 Pro (MPS, torch 2.14.1, diffusers 0.41.0)
See out/*.json; the numbers quoted on the page are listed in out/page_data.json under "f" and checked by runs/check_data.py.
- Measured tiny model (df_ddpm_eps_4000, N 1,000, floor 18.93): DDIM eta 0/0.5/1 at 50 steps FD 112.7/59.75/62.3, at 250 108.2/59.25/39.7. DPM-Solver++ 2M SDE 20 steps 42.2 (best at 20-50 calls); UniPC 50 106.6; Heun 50 (99 NFE) 106.2, fails at 2-4 steps (FD 1652.8, 1003.0); DPM++ Karras sigmas 10 steps 58.0 but 1568 at 4; Euler ancestral == DDPM. DDPM + x0 clip 50 steps 70.7 (no help). Raw weights vs EMA: DDIM 50 141.95 vs 112.71, DDPM 50 86.97 vs 62.3. Bugs (DDIM 50): cosine abar 1284.8, integer t 1065.6, Euler without init_noise_sigma 1339.5 (diversity 0.69).
- Resumed to 8,000 steps (887 s): DDIM 10/50/250 76.0/41.6/40.4 vs DDPM 105.8/44.3/22.6; DDPM 1000 20.1. DDIM now wins at 10 steps.
- Guidance (DDIM 50): interval t 82-578 (24 of 50 steps) best FD 29.08 at s 3 (acc 92.5%); CFG rescale 0.7 ~ no change (s 7.5 FD 179.3 vs 187.05); autoguidance with TinyUNet base16 1,000 steps (alone FD 985.3) w 1.5 FD 24.15, diversity 28.22, acc 86.2%; DDPM + CFG s 2 FD 91.05 acc 98.5%.
- SD 1.5 (seed 0, lighthouse, 25 DPM++): rescale 0.7 saturation at s 20 0.608 -> 0.602 (clipped 9.5% -> 10.9%); interval (0.28, 5.42] = 19 of 25 steps guided, s 20 saturation 0.43, 14.1 s vs 15.75 s; zero-terminal-SNR flag on the eps model -> all-black image (NaN); LCM-LoRA (cf2fced, openrail++) sharp at 1-8 steps (4 steps 2.05 s vs DPM 2.95 s) but drops the lighthouse; LCM at guidance 2 saturation 0.81.
