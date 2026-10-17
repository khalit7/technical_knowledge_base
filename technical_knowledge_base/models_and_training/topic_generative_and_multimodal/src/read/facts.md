# Facts verified for the Reading and Further reading tabs

Copied from the topic's shared FACTS file (the rd section, 2026-10-17). Every other fact on the tabs carries its source link inline; facts reused from the paper pages and the maths page keep those pages' sources.

## rd (Reading tab, 2026-10-17)
- diffusers 0.41.0 (installed copy in the shared venv), src/diffusers/pipelines/stable_diffusion/pipeline_stable_diffusion.py: num_inference_steps default 50 (line 785), guidance_scale default 7.5 (line 788), do_classifier_free_guidance = guidance_scale > 1 and unet.config.time_cond_proj_dim is None (line 764), negative/empty prompt encoded when CFG is on (line 454), latents duplicated into a batch of 2 for CFG (line 1037), noise_pred_uncond + guidance_scale * (noise_pred_text - noise_pred_uncond) (line 1055), decode after dividing by vae.config.scaling_factor (line 1085).
- The pinned SD v1.5 vae/config.json (rev 451f4fe...) has NO scaling_factor key; diffusers falls back to the AutoencoderKL class default scaling_factor: float = 0.18215 (models/autoencoders/autoencoder_kl.py line 90, v0.41.0). SD v1.5 scheduler_config.json: PNDMScheduler, scaled_linear, beta 0.00085 to 0.012, 1000 train timesteps, steps_offset 1.
- Chameleon (arXiv 2405.09818 v1 HTML): tokenizer "encodes a 512x512 image into 1024 discrete tokens from a codebook of size 8192"; 7B and 34B models.
- LLaVA (arXiv 2304.08485 v2 HTML, section 4.2): stage 1 on CC3M filtered to 595K pairs, visual encoder and LLM frozen, projection only; stage 2 visual encoder frozen, projection and LLM updated. LLaVA-1.5 (arXiv 2310.03744): CLIP-ViT-L-336px with an MLP projection; "merely 1.2M publicly available data"; "~1 day on a single 8-A100 node"; Table 3: 558K pretrain, 665K finetune. 576 tokens per image = (336/14)^2, derived (not stated in the paper).
- SigLIP (arXiv 2303.15343): SigLiT 84.5% ImageNet zero-shot with four TPUv4 chips in two days.
- DiT (arXiv 2212.09748): FID 2.27 on ImageNet 256x256 (DiT-XL/2); higher Gflops "consistently have lower FID".
- Flamingo: DeepMind blog 28 Apr 2022: starts from Chinchilla 70B, frozen; "an 80B parameter VLM". IDEFICS (HF blog 22 Aug 2023) expands to "Interleaved Cross-attention".
- OpenAI GPT-4o image generation system card addendum, 25 Mar 2025 (Wayback 20250325201732 of the cdn PDF): "Unlike DALL-E, which operates as a diffusion model, 4o image generation is an autoregressive model natively embedded within ChatGPT."
- FLUX.1 [schnell] model card: "12 billion parameter rectified flow transformer", "1 to 4 steps", "latent adversarial diffusion distillation", apache-2.0.
- FID papers: Heusel et al. 2017 (1706.08500); clean-fid Parmar, Zhang, Zhu 2021 (2104.11222) "FID can actually improve if the generated images are also subsequently compressed"; Kynkaanniemi et al. 2022 (2203.06026) ImageNet classes; CMMD Jayasumana et al. (2401.09603, v1 30 Nov 2023) "inconsistent results when varying the sample size".
