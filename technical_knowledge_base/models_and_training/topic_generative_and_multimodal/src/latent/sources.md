# Latent lab: sources and verified facts (2026-10-17)

Source read at pinned versions (shallow clones in the shared setup folder; commits in the shared FACTS file):

- diffusers v0.41.0 (086bf9578c0f):
  - `src/diffusers/models/autoencoders/autoencoder_kl.py:90` `scaling_factor: float = 0.18215,` (used because SD 1.5's vae/config.json has no scaling_factor key).
  - `src/diffusers/models/autoencoders/vae.py:690` `class DiagonalGaussianDistribution`; `:694` `self.logvar = torch.clamp(self.logvar, -30.0, 20.0)`; `:711` `x = self.mean + self.std * sample` (the reparameterisation).
  - `src/diffusers/models/autoencoders/vae.py:568` `class VectorQuantizer`; `:574-576` comment "due to a bug the beta term was applied to the wrong term. for backwards compatibility we use the buggy version by default, but you can specify legacy=False to fix it."; `:651-654` the two loss formulas (legacy: `torch.mean((z_q.detach() - z) ** 2) + self.beta * torch.mean((z_q - z.detach()) ** 2)`); `:594` init `uniform_(-1.0 / self.n_e, 1.0 / self.n_e)`.
  - `src/diffusers/pipelines/stable_diffusion/pipeline_stable_diffusion_img2img.py:771` `init_latents = self.vae.config.scaling_factor * init_latents`; `:1142` decode divides by it. `pipeline_stable_diffusion.py:1085` decode divides by it (shared FACTS).
- CompVis/latent-diffusion main a506df575647 (2022-07-27):
  - `configs/autoencoder/autoencoder_kl_32x32x4.yaml:8-12` `LPIPSWithDiscriminator`, `disc_start: 50001`, `kl_weight: 0.000001`, `disc_weight: 0.5`; `embed_dim: 4`, `ch_mult: [1,2,4,4]`.
  - `ldm/modules/losses/contperceptual.py:48-83` L1 + perceptual_weight * LPIPS, learned logvar, KL, adaptive-weighted hinge GAN loss after disc_start; `:32-42` calculate_adaptive_weight.
  - `ldm/models/diffusion/ddpm.py:489` `self.register_buffer('scale_factor', 1. / z.flatten().std())` (scale_by_std on the first batch).

Papers (checked 2026-10-17):
- VQ-VAE: van den Oord, Vinyals, Kavukcuoglu 2017, arXiv:1711.00937 (loss eq. 3, beta 0.25).
- Jukebox: Dhariwal et al. 2020, arXiv:2005.00341, section 3.1 "Random restarts for embeddings": "when the mean usage of a codebook vector falls below a threshold, we randomly reset it to one of the encoder outputs from the current batch."
- Ghosh, Sajjadi, Vergari, Black, Schoelkopf, "From Variational to Deterministic Autoencoders", arXiv:1903.12436 (v4 May 2020): ex-post density estimation; RAE samples "comparable to, or better than, those of VAEs" (abstract).
- Burda, Grosse, Salakhutdinov 2015, arXiv:1509.00519: active units (Cov of E[z|x] above 0.01).
- DDIM: Song, Meng, Ermon, arXiv:2010.02502: section 5.3 interpolation in x_T; Appendix D.5 uses spherical linear interpolation.
- LPIPS: Zhang et al. 2018, arXiv:1801.03924. VQGAN: Esser, Rombach, Ommer 2020, arXiv:2012.09841.
- Chameleon tokenizer (shared FACTS, rd): 512x512 -> 1024 tokens, codebook 8192, arXiv:2405.09818.
- LDM paper page (Notion 3c65c17b0d0d81bb98adc0daf8462cb6): KL weight about 1e-6; rescaling by component-wise std (Appendix G, D.1).
