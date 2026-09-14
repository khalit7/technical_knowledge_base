# High-Resolution Image Synthesis with Latent Diffusion Models (LDM / Stable Diffusion)

⏱ 9 min read · +~3h 50m resources

- **Authors**: Robin Rombach, Andreas Blattmann, Dominik Lorenz, Patrick Esser, Bjorn Ommer (CompVis, LMU Munich and IWR Heidelberg; Runway ML)
- **Date**: December 2021 (CVPR 2022)
- **Links**: [arXiv 2112.10752](https://arxiv.org/abs/2112.10752) (~45 min) | [code](https://github.com/CompVis/latent-diffusion) (repo, ~20 min for the README and entry path) | [Stable Diffusion repo](https://github.com/CompVis/stable-diffusion) (repo, ~15 min for the README)

## Best resources

- [Jay Alammar, "The Illustrated Stable Diffusion"](https://jalammar.github.io/illustrated-stable-diffusion/) (~25 min): the best visual walkthrough of the full pipeline (text encoder -> UNet in latent space -> VAE decoder); ideal first read before the paper.
- [labml.ai, annotated Stable Diffusion implementation](https://nn.labml.ai/diffusion/stable_diffusion/index.html) (~1h): line-by-line PyTorch of the CompVis code, including the autoencoder, cross-attention UNet, and samplers.
- [Hugging Face, "Stable Diffusion with Diffusers"](https://huggingface.co/blog/stable_diffusion) (~30 min): the practical component-level breakdown (VAE, UNet, scheduler, CLIP text encoder) with runnable code.
- [Sander Dieleman, "Generative modelling in latent space"](https://sander.ai/2025/04/15/latents.html) (~35 min): the modern retrospective on why two-stage latent generative models won, how autoencoder design trades off reconstruction vs modelability, and where the paradigm is heading.

## Problem

Pixel-space diffusion models were state of the art in image synthesis but absurdly expensive: the strongest models took 150-1000 V100 days to train and needed hundreds of sequential UNet evaluations over full-resolution RGB arrays at inference (50k samples in about 5 days on an A100). The root cause is that likelihood-based training spends most of its capacity and compute on imperceptible high-frequency detail. A rate-distortion analysis makes this explicit: most bits of an image encode perceptual minutiae, while the semantic composition costs few bits. Prior two-stage work (VQ-VAE-2, VQGAN + autoregressive transformer, DALL-E) compressed aggressively into a discrete 1D token sequence to feed an AR model, sacrificing detail and ignoring the 2D structure of the latent. The gap: a generative model that skips the imperceptible bits but keeps fidelity, at a compute budget ordinary labs can afford.

## Method

Separate perceptual compression from semantic generation in two independently trained stages.

**Stage 1: perceptual compression autoencoder.** An encoder E maps an RGB image x (H x W x 3) to a latent z = E(x) of shape h x w x c, downsampled spatially by f = H/h = 2^m; a decoder D reconstructs x-tilde = D(z). Trained with a perceptual (LPIPS) loss plus a patch-based adversarial loss (a VQGAN-style recipe), not plain L1/L2, so reconstructions stay on the image manifold instead of going blurry. Two mild regularisations of the latent are explored: **KL-reg** (a very small KL penalty toward N(0, I), a barely-regularised VAE) or **VQ-reg** (a vector-quantisation layer absorbed into the decoder). Crucially the compression is mild (f = 4-8, e.g. 512x512x3 -> 64x64x4 for f = 8) and the latent keeps its 2D spatial layout, unlike VQ-token approaches that flatten to 1D and compress hard. The autoencoder is trained once and reused for every downstream generative model.

**Stage 2: diffusion in latent space.** Standard DDPM machinery, applied to z instead of x: a time-conditional UNet epsilon_theta is trained with the usual noise-prediction MSE

L_LDM = E_{E(x), epsilon ~ N(0,1), t} [ || epsilon - epsilon_theta(z_t, t) ||^2 ]

Since the forward process is fixed, z_t comes cheaply from E during training; at sampling time the chain runs entirely in latent space and a single decoder pass produces the image. Why this is cheap: the UNet operates on a tensor with f^2 fewer spatial positions (16-64x fewer for f = 4-8), so every one of the hundreds of denoising steps costs a fraction of a pixel-space step, while the convolutional UNet still exploits the 2D inductive bias the latent preserves. The ablation over f in {1, 2, 4, 8, 16, 32} shows the sweet spot: f = 1-2 (near pixel space) trains painfully slowly, f = 32 destroys information in stage 1 and caps quality; f = 4-8 gives an FID gap of 38 versus pixel-space diffusion after 2M steps of class-conditional ImageNet at equal compute. All main models train on a single A100.

**Conditioning via cross-attention.** To condition on arbitrary modalities, a domain-specific encoder tau_theta maps the condition y (text prompt, semantic map, layout boxes) to a sequence tau_theta(y) in R^{M x d}, and cross-attention layers inside the UNet attend from flattened intermediate feature maps (queries) to that sequence (keys/values): Attention(Q, K, V) with Q = W_Q phi_i(z_t), K = W_K tau_theta(y), V = W_V tau_theta(y). epsilon_theta and tau_theta are trained jointly. For text, tau_theta is a transformer over BERT tokens. Densely aligned conditions (super-resolution, inpainting, semantic synthesis) instead concatenate the condition to the UNet input channel-wise. Because everything is convolutional, spatially conditioned models trained at 256^2 generalise at inference to about 1024^2.

## Results

- **Unconditional generation**: new SOTA FID 5.11 on CelebA-HQ 256^2, beating GANs and prior likelihood-based models; competitive on FFHQ, LSUN-Churches, LSUN-Bedrooms, with consistently better precision/recall than GANs (mode coverage).
- **Text-to-image**: a 1.45B-parameter KL-reg LDM trained on LAION-400M reaches FID 12.63 on MS-COCO with classifier-free guidance, on par with GLIDE (5B) and Make-A-Scene (4B) at a fraction of the parameters. This model is the direct ancestor of Stable Diffusion.
- **Class-conditional ImageNet 256^2**: FID 3.60 with guidance, beating the pixel-space SOTA ADM while using fewer parameters and far less compute.
- **Efficiency**: versus a matched pixel-space diffusion model, at least 2.7x higher train/sample throughput with at least 1.6x better FID.
- **Dense tasks**: super-resolution competitive with SR3 (better FID, preferred in a user study); inpainting sets a new SOTA on Places (FID 1.50 on 512^2 test crops), beating the specialised LaMa architecture; semantic-map-to-image generalises convolutionally to megapixel landscapes.
- Honest caveats: sampling is still sequential and slower than GANs, and the autoencoder bottlenecks tasks needing pixel-exact precision.

## Why it matters

This is the paper that became **Stable Diffusion**: the August 2022 release was this exact architecture (f = 8 KL-reg autoencoder, cross-attention UNet) retrained at 512^2 on LAION with a frozen CLIP text encoder, and its open weights triggered the consumer generative-AI explosion alongside DALL-E 2 and Midjourney. The deeper contribution is the paradigm: generate in a perceptually compressed latent space and let a cheap decoder handle the last octave of detail. That recipe is now the default for essentially all high-resolution generative modelling: SD 1.x/2.x and SDXL kept the latent UNet; SD3 and FLUX swapped in rectified-flow objectives and MM-DiT transformer backbones but still denoise in a VAE latent; DiT itself (the backbone lineage behind Sora) was developed on ImageNet LDM latents; video (Sora, Veo, Stable Video Diffusion), audio (AudioLDM, Stable Audio), and many 3D and molecule systems all run latent diffusion. The cross-attention conditioning interface became the standard plug for text encoders and, later, for ControlNet-style spatial control and IP-Adapter-style image prompts. It also democratised the field exactly as intended: what took hundreds of V100 days in pixel space became trainable on a single A100, and finetunable by hobbyists.

## Connections

- [DDPM (2020-06)](../2020-06_ddpm/summary.md): supplies the entire diffusion objective and epsilon-prediction UNet; LDM changes only where the chain runs.
- [CLIP (2021-02)](../2021-02_clip/summary.md): this paper uses a BERT-style text transformer, but Stable Diffusion swapped in CLIP's text encoder as tau_theta.
- [ViT (2020-10)](../2020-10_vit/summary.md): the DiT successors replace LDM's UNet with a transformer while keeping its latent space.
- [Attention Is All You Need (2017-06)](../2017-06_attention-is-all-you-need/summary.md): cross-attention conditioning is the transformer's encoder-decoder attention grafted into a UNet.
- Topics: [generative-and-multimodal](../../topics/generative-and-multimodal/summary.md) (diffusion, VAE, text-to-image).
