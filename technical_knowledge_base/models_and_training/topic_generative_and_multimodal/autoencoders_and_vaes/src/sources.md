# Sources and verified facts (av, 2026-10-17)

Source read at pinned versions (shallow clones in the shared setup folder; commits in the root's shared FACTS file):

## diffusers v0.41.0 (086bf9578c0f)
- `src/diffusers/models/autoencoders/vae.py:576` comment "specify legacy=False to fix it" (VectorQuantizer beta bug; quoted on this page, section 8, lines 574 to 576 and 651 to 654); `:644` `min_encoding_indices = torch.argmin(torch.cdist(z_flattened, self.embedding.weight), dim=1)`; `:672` `def get_codebook_entry`.
- `src/diffusers/models/autoencoders/vq_model.py:143` `def decode(self, h, force_not_quantize=False, ...)`: decode quantizes again unless told not to.
- `src/diffusers/pipelines/kandinsky2_2/pipeline_kandinsky2_2.py:315` `image = self.movq.decode(latents, force_not_quantize=True)["sample"]` (Kandinsky's diffusion runs on unquantized MoVQ latents).
- `src/diffusers/models/autoencoders/autoencoder_kl_flux2.py:133` `self.bn = nn.BatchNorm2d(` (128 channels = 4 x 32 latent channels, affine=False, track_running_stats=True).
- `src/diffusers/pipelines/flux2/pipeline_flux2.py:457` `_patchify_latents` (2 x 2 patches to channels); `:617` `image_latents = (image_latents - latents_bn_mean) / latents_bn_std`; `:1023` `latents = latents * latents_bn_std + latents_bn_mean`.
- `src/diffusers/pipelines/qwenimage/pipeline_qwenimage.py:710` `latents_std = 1.0 / torch.tensor(self.vae.config.latents_std)...`; `:713` `latents = latents / latents_std + latents_mean`.
- `src/diffusers/pipelines/flux/pipeline_flux.py:962` `latents = (latents / self.vae.config.scaling_factor) + self.vae.config.shift_factor`.
- `src/diffusers/models/autoencoders/autoencoder_kl.py:64-66` docstring of `force_upcast`; `:94` `force_upcast: bool = True`.

## CompVis/latent-diffusion a506df575647
- `ldm/modules/losses/contperceptual.py:48` `rec_loss = torch.abs(inputs.contiguous() - reconstructions.contiguous())`; `:51` `rec_loss = rec_loss + self.perceptual_weight * p_loss` (per-image LPIPS broadcast to every pixel); `:53` `nll_loss = rec_loss / torch.exp(self.logvar) + self.logvar` (a learned scale); `:57` `torch.sum(weighted_nll_loss) / weighted_nll_loss.shape[0]`; `:60` KL summed per image; `:83` `loss = weighted_nll_loss + self.kl_weight * kl_loss + d_weight * disc_factor * g_loss`; `:32-43` `calculate_adaptive_weight` (gradient-norm ratio at the decoder's last layer, clamped to [0, 1e4], times disc_weight).

## Pretrained autoencoders (Hub API and config.json, 2026-10-17; full commits in `out/tok/*.json`)
- stabilityai/sdxl-vae 6f5909a7e596 (MIT): AutoencoderKL, latent_channels 4, scaling_factor 0.13025.
- madebyollin/sdxl-vae-fp16-fix 207b116dae70 (MIT): same config, `force_upcast: false`.
- Tongyi-MAI/Z-Image-Turbo f332072aa78b (Apache 2.0) `vae/config.json`: AutoencoderKL, latent_channels 16, scaling_factor 0.3611, shift_factor 0.1159, `_name_or_path: "flux-dev"` (the FLUX.1 VAE; FLUX.1-schnell's own repo is gated, same 167.7 MB file size).
- black-forest-labs/FLUX.2-klein-4B e7b7dc27f91d (Apache 2.0) `vae/config.json`: AutoencoderKLFlux2, latent_channels 32, patch_size [2, 2], batch_norm_eps 1e-4, no scaling_factor, `_name_or_path: "black-forest-labs/FLUX.2-dev"`.
- Qwen/Qwen-Image 75e0b4be04f6 (Apache 2.0) `vae/config.json`: AutoencoderKLQwenImage, z_dim 16, 16 latents_mean and latents_std values, temperal_downsample [false, true, true] [sic].
- mit-han-lab/dc-ae-f32c32-sana-1.1-diffusers 6f7b3f3b289a (MIT): AutoencoderDC, latent_channels 32, scaling_factor 0.41407, 6 stages (ResBlock x3, EfficientViTBlock x3).
- amused/amused-512 6f3f309ba188 (OpenRAIL++) `vqvae/config.json`: VQModel, num_vq_embeddings 8192, latent_channels 64, 5 blocks (f = 16), force_upcast true.
- kandinsky-community/kandinsky-2-2-decoder 9ae140d347fe (Apache 2.0) `movq/config.json`: VQModel, num_vq_embeddings 16384, vq_embed_dim 4, norm_type "spatial", 4 blocks (f = 8).
- Gated, not run: black-forest-labs/FLUX.1-schnell (HTTP 401 on vae/config.json without a token), stabilityai/stable-diffusion-3-medium-diffusers, stable-diffusion-3.5-large.

## Papers (checked 2026-10-17)
- FSQ, Mentzer et al., arXiv 2309.15505v2: section 3.1 implicit codebook prod L_i; Table 1 recommended levels (2^8 [8,6,5]; 2^10 [8,5,5,5]; 2^12 [7,5,5,5,5]; 2^14 [8,8,8,6,5]; 2^16 [8,8,8,5,5,5]); heuristic "Use L_i >= 5"; contributions: "codebook usage is very high for FSQ (≈100% for most models), without relying on any auxiliary losses"; "VQ is actually worse for large codebooks". Appendix A.1 code (bound, quantize) ported in `quant/quantizers.py`.
- MAGVIT-v2, Yu et al., arXiv 2310.05737v3: LFQ eq. 2 to 4 (sign, index = sum 2^(i-1) 1{z_i > 0}); entropy penalty eq. 5 E[H(q(z))] - H[E(q(z))]; appendix: entropy loss weight 0.1, annealing factor 3 over 2,000 steps, commitment 0.25; vocabulary 2^18; "a property not observed in current VQ-VAE methods".
- SoundStream, Zeghidour et al., arXiv 2107.03312v1 section III-C: EMA codebook updates, k-means initialisation on the first batch, replacement of codes unassigned for several batches.
- Rotation trick: Fifty et al., arXiv 2410.06424, "Restructuring Vector Quantization with the Rotation Trick" (title and authors from the abstract page; not run here).
- Further paper facts in `web_published.md` (copied from the research notes, every entry with URL and quote).

# Copy of this page's entries in the shared FACTS file
## av (child page Autoencoders and VAEs, 2026-10-17; measured on Apple M1 Pro; files in autoencoders_and_vaes/src/out/)
### Configs read (Hub, pinned)
- FLUX.1 VAE runs from Tongyi-MAI/Z-Image-Turbo f332072aa78b vae/ (Apache 2.0; config _name_or_path "flux-dev"; 16 ch, scaling 0.3611, shift 0.1159); FLUX.1-schnell's own repo is gated (401 without token). BFL flux src/flux/util.py @802fb47 has the same 0.3611/0.1159.
- FLUX.2 VAE: black-forest-labs/FLUX.2-klein-4B e7b7dc27f91d vae/ (Apache 2.0): AutoencoderKLFlux2, 32 latent channels, patch_size [2,2], no scaling_factor; pipeline_flux2.py:617 normalises patchified latents by bn.running_mean/var (diffusers v0.41.0).
- SD3 VAE: 16 ch, scaling 1.5305, shift 0.0609 (diffusers scripts/convert_sd3_to_diffusers.py lines 337-338 @b800f82; official repo gated).
- Qwen-Image vae: z_dim 16, per-channel latents_mean/std (pipeline_qwenimage.py:710-713). DC-AE f32c32 sana-1.1: 32 ch, 0.41407, 312,250,275 params. aMUSEd-512 vqvae: 8,192 codes, f16 (1,024 tokens at 512). Kandinsky 2.2 MoVQ: 16,384 codes, embed dim 4, f8 (4,096 tokens at 512); Kandinsky decodes with force_not_quantize=True (pipeline_kandinsky2_2.py:315).
### Measured
- Tokenizer comparator, 16 colour test images at 512, mean PSNR / SSIM / LPIPS (torchmetrics 1.9.0 alex): SD1.5 31.20/0.903/0.030; SDXL 31.10/0.848/0.038; SDXL fp16-fix (fp16) 31.03/0.848/0.039; FLUX.1 36.28/0.935/0.012; FLUX.2 35.70/0.951/0.009; Qwen-Image 35.11/0.920/0.032; DC-AE (bf16) 30.01/0.798/0.043; aMUSEd VQ 26.70/0.739/0.080; MoVQ 31.24/0.844/0.036. g04 puppy is every model's worst image.
- SDXL VAE (stabilityai/sdxl-vae) in float16: NaN on all 16 images, already in the encoder output. FLUX.1 decoded without adding the shift back: 35.54 dB instead of 36.28.
- Qwen-Image VAE peak MPS ~9,877 MiB for one 512x512 frame (fp32); others 2.3-3.7 GiB.
- Tiny tokenizers (ConvAE 8x8 grid, 5,000 steps): codes used on test / PSNR / rFD(classifier space, 10k recon vs 10k test): VQ plain 118/128, 24.03, 66.4; restart 128, 23.80, 71.3; EMA 128 (perplexity 57.9), 24.17, 59.0; L2-normalised 91, 23.88, 51.9; FSQ[5,5,5] 125/125, 24.09, 57.8; LFQ 7 bits 127 (perp 23.3), 22.02, 114.4; LFQ no entropy 82 (perp 12.6); VQ K=1024 plain 151 (15%), 24.35, 69.1; restart 1,021, 24.23, 62.0; FSQ[8,5,5,5] 996/1000, 25.17, 29.9; LFQ 10 bits 395, 22.56, 81.0. The lab's vq_plain/vq_restart PSNR reproduce exactly.
- + LPIPS on the 128-code restart VQ: PSNR 22.95, LPIPS 0.042, rFD 20.9; + patch GAN from step 2,500: 22.61, 0.043, 28.4 (GAN did not help at toy scale).
- ELBO units (16-d ConvVAE): per-pixel-mean BCE + summed KL: KL 0.00, 0 active units, PSNR 10.93; Gaussian sigma 1: KL 13.2, PSNR 19.61, prior FD 661; sigma 0.1: KL 65.3, PSNR 21.39, prior FD 813.
- PixelCNN-decoder VAE (385,441 params): plain ELBO KL 0.00 (collapsed), anneal (0->1 over 2,500 steps) used ~13 nats at step 400 then collapsed to 0.00, free bits 0.5/dim KL 6.9 with 16 active units and a code worth 5.5 nats, negative ELBO 212.1 vs 206.2 collapsed vs 206.5 no-code.
