# Diffusion lab: visual ideas, built and rejected

Built (tab `t-diff`, parts `32_*`):
- **Forward process, before/after on the same input**: the ten class images and one fixed noise draw, linear schedule row against cosine or SD 1.5 scaled-linear, one timestep slider and a sweep; signal kept and SNR as counters. Computed in the browser from the exact schedule formulas (the noise is drawn from a seeded PRNG, so no noise array is embedded).
- **SNR explorer**: log10 SNR against t for the three schedules, pointer readout; SNR = 1 crossings and the terminal values in the prose.
- **Error by timestep**: validation noise MSE and clean-image MSE per t for the eps and v models (the loss weighting made visible), plus the training curves.
- **Same noise through 1, 4, 20, 50 steps**, animated (play, pause, step, scrub, speed; reduced motion respected), with a toggle between x_t and the model's x0 guess, and a DDPM-20 mode from the same start (stochastic against deterministic).
- **Steps against quality**: FD, accuracy and diversity against steps for DDPM, DDIM, DPM-Solver++ and Euler, with the real-image reference lines; a strip viewer of the same ten noise images for every sampler and step count.
- **eps against v at one step**, and the prediction-type mismatch strip (a measured bug).
- **Guidance strip** on the tiny model (slider and sweep) with accuracy, diversity and FD against scale; the same on SD v1.5 (one prompt, empty prompt to s = 20) and a text-rendering prompt at four scales.
- **SD v1.5 steps gallery** per sampler, with the timesteps each walked (the leading-spacing trap at 1 step).
- **Time split** of one SD image (text encoder, U-Net passes, decode) with steps and guidance controls, against the measured whole-pipeline time.

Rejected:
- A live in-browser denoiser (the 1M-parameter U-Net in JavaScript): about 4 MB of weights in a page budgeted at 1.5 MB; recorded frames show the same thing.
- Training the cosine-schedule model too: the schedule difference is shown exactly by the forward slider and SNR chart; a third 15-minute GPU run would mostly repeat the eps/v comparison.
- An Inception FID column for the tiny model: biased and meaningless for grey 28 x 28 images at N = 1,000 (root Reading section 9); the classifier-space FD is used, with its real-image floor.
- An SD guidance-rescale (Lin et al. 2023, section 3.4) sweep: worth a child page; the root lab keeps one guidance knob.
- An animated SD denoising trajectory: needs per-step VAE decodes (25 more decodes per image) and many more embedded images; the tiny-model trajectory teaches the same coarse-to-fine lesson.
