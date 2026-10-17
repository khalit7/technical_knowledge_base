# Reading and Further reading: visual ideas

The question the topic keeps returning to: what does one sample cost (network passes, tokens), and what does it buy in quality, for each way of generating or reading an image? The root gives intuition; the lab tabs hold the measured visuals, so the Reading tab keeps few visuals of its own (Topic: rl lesson, 2026-10-04: one or two per idea at most).

## Built

| # | Idea | Placement | Why it earns its place | Data |
|---|---|---|---|---|
| R1 | **One image, made three ways** (animation, play/pause/step/scrub/speed): one Fashion-MNIST test image produced by an autoregressive model (49 tokens of 4 x 4 pixels), DDIM diffusion (50 steps) and Euler flow (8 steps), with running pass counters and a guidance toggle that doubles them; a small chart of image share against noise share (diffusion's variance-preserving curve against flow's straight line) | Section 1 | The before/after of the topic's central trade on one input: sequential tokens, many denoising passes, few straight steps. Every frame is exact arithmetic (the path each sampler follows when its model knows the answer), labelled as such, so nothing is faked; trained samples are in the labs | Fashion-MNIST test index 1 (MIT); DDPM linear betas 1e-4 to 0.02, T = 1000; DDIM timesteps 980..0; x_t = (1-t)x0 + t eps |
| R2 | **Families on one screen** (comparison table: how a sample is made, passes per sample, likelihood, failure, where used) | Section 0 | The comparison a root page owns | Sections 1 to 3 sources |
| R3 | **Predict then reveal** (5 drills: tokens against diffusion passes; latent compression 48x; FID comparability; plus the cost card's counts) | Sections 1, 2, 9 | Belief elicitation before the number | Chameleon 1,024 tokens; SD v1 shapes; clean-fid, LDM's 7.76 vs 7.77 |
| R4 | **Pipeline strips** (text encoder, denoiser, decoder; image, encoder, projector, LLM) | Sections 4, 6 | The two architectures of the topic as one line each, with component sizes | CompVis README (860M U-Net, 123M text encoder) |
| R5 | **What one text-to-image sample costs, counted** (calculator: resolution, latent channels, steps, guidance, seconds per pass) | Section 10 | Answers the interview design question with arithmetic: passes = steps x (1 or 2), latent and DiT token counts, attention growth; the only measured input is seconds per pass (default from the Diffusion lab when it exists) | Derived; diffusers v0.41.0 pipeline lines 785, 788, 1037, 1055 |
| R6 | **FID's small-sample bias, run** (numpy, 64-d Gaussians, same distribution, n = 500 to 50,000) | Mistakes | A cheap run that shows the mechanism behind "compare FIDs only at equal n": 3.33 at 500 samples, 0.033 at 50,000, true value 0 | `fid_bias.py`, measured on M1 Pro CPU |

## Rejected

- A schedule (SNR) explorer, a forward-noising slider, a guidance strip, a patch animation, a token-budget calculator: each is a lab tab's own visual (Diffusion, Vision, VLM labs); the Reading tab links them.
- A 2-D flow-particles animation: the Flow lab's (and the maths page already has 2-D toy diffusion).
- An ELBO or KL calculator: owned by the maths page's ELBO lab.
- A model timeline: the Model map's.
- A "trained model's denoising trajectory" beside R1: would duplicate the Diffusion lab; listed in todo.md as an optional addition once the lab's recorded trajectory exists.
- Animating a VLM's image tokens entering the LLM: the VLM lab's planned before/after.

## What the methodology lacked here

The root of a topic taught from zero needs one visual that frames the whole comparison before any family is explained; R1 does that with exact arithmetic instead of a trained model, which keeps it honest without waiting for the labs. Labelling "exact path when the model knows the answer" against "a trained model's sample" was the key to using it.
