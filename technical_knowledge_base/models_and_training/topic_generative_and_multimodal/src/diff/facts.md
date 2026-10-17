# Diffusion lab: verified facts (2026-10-17; also appended to the shared FACTS file under "df")

Source lines, diffusers v0.41.0 (pinned clone, commit 086bf9578c0f):
- schedulers/scheduling_ddpm.py: 214 `linear`, 216 `scaled_linear` (linspace of sqrt(beta), squared), 227 `squaredcos_cap_v2` (cosine via betas_for_alpha_bar, line 48); 388 posterior variance; 534 to 535 posterior-mean coefficients; 569 `def add_noise(`, 608 `noisy_samples = sqrt_alpha_prod * original_samples + sqrt_one_minus_alpha_prod * noise`.
- schedulers/scheduling_ddim.py: 209 default `timestep_spacing="leading"`; 357 comment citing arXiv 2305.08891 Table 2; 365 to 370 leading (`arange(0, n) * (T // n)` + steps_offset); 371 to 376 trailing (`round(arange(T, 0, -T/n)) - 1`); 445 prev_timestep; 456 eps to x0; 462 v to x0; 488 direction; 491 `prev_sample = alpha_prod_t_prev ** (0.5) * pred_original_sample + pred_sample_direction`.
- schedulers/scheduling_dpmsolver_multistep.py: 222 `solver_order: int = 2`, 227 `algorithm_type ... = "dpmsolver++"`, 240 `timestep_spacing ... = "linspace"`.
- pipelines/stable_diffusion/pipeline_stable_diffusion.py: 764 `return self._guidance_scale > 1 and self.unet.config.time_cond_proj_dim is None` (so guidance_scale 0 or 1 is the plain conditional model), 1055 CFG line.
- Measured: SD 1.5's config (no timestep_spacing key) gives DDIMScheduler.from_config "leading"; DDIM 1 step uses timestep [1], 4 steps [751, 501, 251, 1]; trailing 4 steps [999, 749, 499, 249]; DPM-Solver++ 1 step [999].

Schedules (derived, float64): linear 1e-4..0.02: sqrt(abar) at t=500 0.279, at 999 0.00635; SNR < 1 from t = 259. Cosine (s = 0.008): sqrt(abar_500) 0.702, SNR < 1 from t = 496. SD scaled-linear 0.00085..0.012: sqrt(abar_999) 0.068 (6.8% of the signal survives), SNR < 1 from t = 354.

Papers: Lin et al. 2023 (arXiv 2305.08891) abstract: Stable Diffusion's flawed schedule "severely limits the model to only generate images with medium brightness"; fixes: zero terminal SNR, v prediction, start from the last timestep, rescale CFG. DDIM (2010.02502) abstract: "10x to 50x faster in terms of wall-clock time compared to DDPMs".

Measured results: out/*.json (Apple M1 Pro, MPS; torch 2.14.1, diffusers 0.41.0). Reading-tab numbers: out/read_numbers.json.
