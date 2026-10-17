# Video generation: research facts (for a teaching page, overview depth)

Method: WebFetch of arXiv HTML pages and Hugging Face cards, 2026-10-17. WebFetch passes the page through a summarising model, so quotes are as returned by that tool; spot-check any number before it goes on a page if it is load-bearing. Anything not seen in a source is marked UNCONFIRMED.

## Movie Gen (Meta), arXiv 2410.13720v2 (26 Feb 2025)
Source: https://arxiv.org/html/2410.13720 (shows v2)

1. Autoencoder (TAE, Sec 3.1.1)
- "we compress the input 8x across each of the spatio-temporal dimensions" (T'/T = H'/H = W'/W = 8).
- "We use C=16 in this work" (latent channels).
- Images treated as single-frame videos; strided conv downsampling, spurious output frames discarded (Fig 4). Not described as a causal first-frame scheme in the part read.
- Table 11 (512 px), Frame-wise AE vs TAE: video SSIM 0.9348 vs 0.9093, video PSNR 34.11 vs 32.25, video FID 0.9352 vs 1.4872; image SSIM 0.8877 vs 0.9231, image PSNR 30.83 vs 32.16, image FID 1.7588 vs 0.2873. Text: TAE "achieves a competitive performance to the frame-wise encoder while achieving a 8x higher temporal compression". (Frame-wise baseline uses 8 latent channels per tool summary.)

2. Denoiser
- "A 30B parameter foundation model" (Sec 2). Table 1: 48 layers, model dim 6144, FFN dim 16384, 48 heads, SwiGLU, RMSNorm.
- Patchify (Sec 3.1.3): 3-D conv kernel k_t x k_h x k_w with k_t = 1, k_h = k_w = 2 (patch 1x2x2).
- Attention: "full bi-directional attention instead of causal attention" (full 3-D self-attention over all tokens).
- Text encoders (Sec 3.1.4): UL2, ByT5 (visual text only), "Long-prompt MetaCLIP".
- Position: "factorized learnable positional embedding" (not RoPE).
- Objective (Sec 3.1.2): Flow Matching, MSE between predicted and ground-truth velocity.
- Sampling (Sec 3.4, 3.4.2): "50 steps (emulating 250 linear steps)" linear-quadratic schedule; text CFG 7.5 in comparisons.

3. Spec and tokens
- Sec 3.1.6: "For 768 px training this results in a context length of ~73K tokens" from a "768x768 px video with 256 frames, compressed 8x8x8 through the TAE, and 2x2x1 through patchification." (check: 256/8=32, 768/8/2=48, 32x48x48 = 73,728.)
- Abstract: "a maximum context length of 73K video tokens, corresponding to a generated video of 16 seconds at 16 frames-per-second."
- Base output 768 px; a Spatial Upsampler gives "full HD 1080p" (Sec 2).

4. Training
- Sec 3.2.1: pre-training data O(100M) video-text pairs and O(1B) image-text pairs.
- Stages (Sec 3.2.2, Table 3): 256 px T2I 210k iters (1.94B samples seen); 256 px T2I/V 185k iters (394.8M); 768 px T2I/V 74.5k iters (73.8M). Then finetuning.
- Compute (Sec 3.1.6): "up to 6,144 H100 GPUs". "the majority of our training FLOPs are expended on long-context 768 px training".

5. Evaluation
- Table 6, net win rate (win% minus loss%) of Movie Gen vs Runway Gen3 / LumaLabs / OpenAI Sora / Kling1.5:
  Overall Quality 35.02 / 60.58 / 8.23 / 3.87; Consistency 33.1 / 42.14 / 8.22 / 13.5; Motion Naturalness 19.27 / 29.33 / 4.43 / 0.52; Text-alignment 10.45 / 12.23 / 17.72 / -1.99; Realness 48.49 / 61.83 / 11.62 / 37.09; Aesthetics 38.55 / 48.19 / 6.45 / 26.88.
- Sora comparison used Sora's publicly released prompts and videos; Movie Gen videos chosen from five generations per prompt (selection caveat).
- No VBench, no FVD: paper says "automated metrics such as FVD ... and IS ... do not correlate with human evaluation scores for video quality".

6. Cost of full attention
- Sec 3.1.6: "Due to the quadratic nature of self-attention, which is at the heart of a Transformer block, scaling to very large context lengths requires immense computation (FLOPs)."
- Speed: no inference time stated (UNCONFIRMED / not found).

## CogVideoX (Zhipu / Tsinghua), arXiv 2408.06072v3 (26 Mar 2025; v1 12 Aug 2024)
Sources: https://arxiv.org/html/2408.06072v3 ; https://arxiv.org/abs/2408.06072 ; HF configs https://huggingface.co/THUDM/CogVideoX-5b/raw/main/transformer/config.json , .../vae/config.json , README https://huggingface.co/THUDM/CogVideoX-5b/raw/main/README.md

1. VAE (Sec 2.1)
- 3-D causal VAE, 8x8 spatial x 4 temporal (Fig 4a). 16 latent channels (variant B, Table 1; HF vae config "latent_channels": 16, "temporal_compression_ratio": 4).
- Causal: temporally causal convolution, "all the paddings at the beginning of the convolution space".
- Trained on 17-frame 256x256 clips, then finetuned on 161-frame clips with context parallelism (both 4k+1, but the paper does not state the 4k+1 rule: UNCONFIRMED as a stated rule). The paper does not say the first frame is encoded separately in the VAE.
- Reconstruction, Table 2: Ours flickering 85.5, PSNR 29.1; Open-Sora 92.4 / 28.5; Open-Sora-Plan 90.2 / 27.6 (lower flickering better). Table 1 variant B: flickering 86.3, PSNR 28.7.

2. Denoiser
- "we have completed the CogVideoX training with two sizes: 5 billion and 2 billion". 2B: 30 layers, 32 heads, hidden 1920; 5B: 42 layers, 48 heads, hidden 3072 (Tables 5 to 6 per tool; HF config 5b: num_layers 42, heads 48, head_dim 64).
- Patch: paper gives sequence length "T/q . H/p . W/p" without numbers; "we repeat the first frame of videos and images at the beginning of the sequence" (when q > 1). HF config: "patch_size": 2 (spatial 2x2; temporal patch 1 in the released 5b config: no temporal patch key, so q = 1 there; UNCONFIRMED from paper).
- Attention: "3D text-video hybrid attention" (expert transformer, text and video tokens concatenated, full 3-D attention). Argument: "Previous works ... often employ separated spatial and temporal attention to reduce computational complexity" ... "this separated attention approach requires extensive implicit transmission of visual information"; tool summary also reports that 2D+1D "is not suitable for video generation tasks, which could lead to instability during training".
- Expert Adaptive LayerNorm (separate modulation for vision and text tokens).
- Text encoder: T5 (HF config text_embed_dim 4096, max_text_seq_length 226).
- Position: 3D-RoPE, "We independently apply 1D-RoPE to each dimension of the coordinates", channel split 3/8, 3/8, 2/8 (x, y, t per tool summary).
- Objective: v-prediction with zero SNR, LDM noise schedule; "Explicit Uniform Sampling" of timesteps across data-parallel ranks.
- Steps: 50 (Table 7 "with 50 inference steps"; HF README num_inference_steps=50).

3. Spec
- Paper v3 abstract: "10-second continuous videos ... with a frame rate of 16 fps and resolution of 768 * 1360 pixels" (this is the later CogVideoX1.5 setting).
- Released CogVideoX-5b HF card: 6 seconds, "8 Frames per Second", "720 x 480, no support for other resolutions"; code uses num_frames=49, fps=8. Latent: (49-1)/4+1 = 13 latent frames x 60 x 90 (HF config sample_frames 49, sample_height 60, sample_width 90); with 2x2 patch that is 13 x 30 x 45 = 17,550 video tokens (my arithmetic, not stated in source).

4. Training (Sec 3.4, Table 5)
- ~35M single-shot clips after filtering, average ~6 s; 2B images from LAION-5B and COYO-700M filtered by aesthetics.
- Progressive resolution 256 -> 512 -> 768 (Sec 3.2); Multi-Resolution Frame Pack (Sec 3.1).
- Table 5 stages: 1) 256x384, 6 s, batch 2000, 400k steps; 2) 480x720, 6 s, 1000, 220k; 3) 768x1360, 10 s, 250, 120k; 4) FT 768x1360, 10 s, 100, 10k.
- Compute: not stated (UNCONFIRMED).

5. Evaluation
- Table 3 (VBench-derived + GPT4o-MT): CogVideoX-2B Human Action 96.6, Scene 55.35, Dynamic Degree 66.39, Multiple Objects 57.68, Appearance Style 24.37, Dynamic Quality 57.7, GPT4o-MT 3.09; CogVideoX-5B 96.8, 55.44, 62.22, 70.95, 24.44, 69.5, 3.36. "achieves the best performance in five out of the seven metrics".
- Table 4 human eval vs Kling (100 prompts, score 0/0.5/1 per aspect): Kling Sensory 0.638, Instruction 0.367, Physics 0.561, Cover Quality 0.668, Total 2.17; CogVideoX-5B 0.722, 0.495, 0.667, 0.712, Total 2.74.
- FVD only in ablation figures (Fig 8), no headline FVD.

6. Speed
- Table 7, H800, 50 steps: 5B 480x720 6 s: 113 s (26 GB); 5B 768x1360 5 s: 500 s (76 GB); 2B 480x720 6 s: 49 s (18 GB); 2B 768x1360 5 s: 220 s (53 GB).
- HF README (5b card, columns 2B / 5B): Step = 50, FP/BF16: "Single A100: ~90 seconds, Single H100: ~45 seconds" and "Single A100: ~180 seconds, Single H100: ~90 seconds".

## HunyuanVideo (Tencent), arXiv 2412.03603 (6 versions listed on abs page; HTML fetched without version suffix, so presumably latest v6: version of fetched HTML UNCONFIRMED)
Sources: https://arxiv.org/html/2412.03603 ; HF diffusers config https://huggingface.co/hunyuanvideo-community/HunyuanVideo/raw/main/transformer/config.json ; README https://huggingface.co/tencent/HunyuanVideo/raw/main/README.md

1. VAE (Sec 4.1, Table 1)
- (T+1) x 3 x H x W -> (T/c_t + 1) x C x (H/c_s) x (W/c_s), "c_t=4, c_s=8, and C=16". The (T+1) form means 4k+1 input frames, first frame its own latent (implied by the shape, not said in words).
- "To handle both videos and images, we adopt CausalConv3D."
- Trained from scratch; video:image 4:1; loss L1 + 0.1 LPIPS + 0.05 adversarial + 1e-6 KL. Spatial-temporal tiling at inference.
- Table 1 PSNR (ImageNet 256 / MCL-JCV video): FLUX-VAE (16 ch) 32.70 / n.a.; OpenSora-1.2 (4 ch) 28.11 / 30.15; CogVideoX-1.5 (16) 31.73 / 33.22; Cosmos-VAE (16) 30.07 / 32.76; Ours (16) 33.14 / 35.39.

2. Denoiser
- "we finally set the model size to 13B"; abstract "over 13 billion parameters, making it the largest among all open-source models".
- Table 2: 20 dual-stream blocks + 40 single-stream blocks, dim 3072, FFN 12288, 24 heads, head dim 128.
- Patch: paper says 3-D conv kernel k_t x k_h x k_w (no numbers); HF config "patch_size": 2, "patch_size_t": 1 (patch 1x2x2).
- Attention: "unified Full Attention mechanism", "Dual-stream to Single-stream" (MM-DiT style: text and video tokens processed separately then concatenated).
- Text: decoder-only MLLM text encoder plus bidirectional token refiner; CLIP-Large final token as global guidance (HF config pooled_projection_dim 768, text_embed_dim 4096).
- Position: 3D RoPE, (d_t, d_h, d_w) = (16, 56, 56) (HF config rope_axes_dim [16, 56, 56]).
- Objective: flow matching, logit-normal t, velocity MSE; first-order Euler solver. Shift s = 7 for 50 steps, 17 for under 20 steps (Sec 5). README defaults: --infer-steps 50, --flow-shift 7.0, --video-length 129.

3. Spec
- Training resolution grows "from 256x256x65 to 720x1280x129" (Sec 3.1). README sizes 544x960x129f and 720x1280x129f; peak GPU memory 45 GB and 60 GB on one 80 GB GPU.
- FPS: not stated in paper (UNCONFIRMED; 24 fps commonly used in code, not verified). Eval clips 5 s (Table 3). 129 frames -> 33 latent frames; at 720x1280 latent 90x160, with 1x2x2 patch: 33 x 45 x 80 = 118,800 tokens (my arithmetic, not stated in source).

4. Training
- Video data in five groups for five stages (256p, 360p, 540p, 720p thresholds), ~1M manually annotated finetuning samples; images: one group of billions, one of hundreds of millions.
- Image pretraining: 256 px, then mix-scale 256/512 (Sec 4.5.2). Video: low-res short, low-res long, high-res long, images mixed in (Sec 4.5.3).
- Compute total not stated (UNCONFIRMED).

5. Evaluation (Sec 6.1, Table 3): 1,533 prompts, 60 evaluators, vs five closed models.
- Overall: HunyuanVideo 41.3% (rank 1), CNTopA (API) 37.7%, CNTopB (Web) 37.5%, GEN-3 alpha (Web) 27.4%, Luma1.6 (API) 24.8%, CNTopC (Web) 24.6%.
- Text alignment: 61.8 / 62.6 / 60.1 / 47.7 / 57.6 / 48.4. Motion: 66.5 / 61.7 / 62.9 / 54.7 / 44.2 / 47.2. Visual: 95.7 / 95.6 / 97.7 / 97.5 / 94.1 / 96.3.
- "Notably, HunyuanVideo demonstrated the best overall performance, particularly excelling in motion quality."

6. Speed: text-guidance distillation "approximatively brings 1.9x acceleration". No wall-clock latency in the part of the paper read.

## LTX-Video (Lightricks), arXiv 2501.00103v1 (30 Dec 2024; only version)
Sources: https://arxiv.org/html/2501.00103 ; https://arxiv.org/abs/2501.00103 ; HF VAE config https://huggingface.co/Lightricks/LTX-Video/raw/main/vae/config.json

1. VAE (Sec 2.1, Table 1)
- 32x32x8 spatio-temporal downscaling, 128 latent channels: "resulting in a total compression of 1:192 (twice the typical compression)" (3*32*32*8 / 128 = 192).
- Patchifying moved into the VAE: transformer patchifier 1x1x1. "a pixels-to-tokens ratio of 1:8192 (four times the typical ratio)" (32*32*8 = 8192).
- Causal encoder, first frame encoded as its own latent frame (Fig 4a, per tool summary). HF config: "encoder_causal": true, "decoder_causal": false, "latent_channels": 128.
- Frames: 121 frames generated (Sec 1) = 8k+1; the 8k+1 rule itself is not stated in words (UNCONFIRMED as a stated rule).
- Decoder does the last denoising step: "our VAE decoder is tasked with both latent-to-pixel conversion and the final denoising step"; decoder trained on noise levels in [0, 0.2] (Sec 2.1.1).
- Reconstruction metrics: no numeric table found (Fig 16 qualitative only) (UNCONFIRMED / not reported).

2. Denoiser (Table 1, Sec 2.2 to 2.5)
- 1.9B params, 28 blocks, hidden 2048, FFN factor 4; "Self + Cross" attention (cross-attention to text beat MM-DiT, Sec 2.3).
- Abstract: the compressed latent "enables the transformer to efficiently perform full spatiotemporal self-attention, which is essential for generating high-resolution videos with temporal consistency".
- Text encoder: T5 (paper text as fetched does not name XXL: UNCONFIRMED size).
- Position: RoPE with normalised fractional coordinates, exponential frequency spacing (Sec 2.2.1); RMSNorm and QK-norm.
- Objective: rectified flow, velocity v = eps - z0 (Sec 2.5.1); timestep shift toward higher noise at larger token counts (Sec 2.5.2).
- Image conditioning by per-token timesteps (conditioning tokens at small t_c, Sec 2.4).
- Steps: 20 in the speed claim, 40 in the human survey.

3. Spec and tokens
- 768x512, 24 fps, 5 s (121 frames).
- Tokens for 121 x 768 x 512: not stated in paper. My arithmetic: latent frames (121-1)/8 + 1 = 16, latent grid 16 x 24, so 16 x 16 x 24 = 6,144 tokens (the 1:8192 ratio gives ~5,808 if the first frame is not counted separately).

4. Training: public plus licensed data, aesthetic filtering, low-motion removal, black-bar cropping, re-captioning (Sec 3). Scale and compute not stated (UNCONFIRMED).

5. Evaluation (Sec 4.2, Table 2): 20 participants, 1,000 T2V prompts and 1,000 image-prompt pairs. Win rates T2V / I2V: LTX-Video 85% / 91%; PyramidFlow 51% / 35%; CogVideoX 2B 38% / 47%; Open-Sora Plan 20% / 20%.

6. Speed
- Abstract: "It achieves faster-than-real-time generation, producing 5 seconds of 24 fps video at 768x512 resolution..." (sentence continues; full ending not captured).
- Sec 1: "2 seconds to generate 121 frames at 768x512 pixels and 20 diffusion steps on an Nvidia H100 GPU."

## Wan (Wan 2.1, Alibaba), arXiv 2503.20314v2
Sources: https://arxiv.org/html/2503.20314 (v2 shown) ; HF README https://huggingface.co/Wan-AI/Wan2.1-T2V-1.3B/raw/main/README.md ; config https://huggingface.co/Wan-AI/Wan2.1-T2V-14B-Diffusers/raw/main/transformer/config.json

1. VAE (Sec 4.1)
- Input 1+T frames -> [1 + T/4, H/8, W/8], 16 channels (Sec 4.1.1). 3-D causal VAE; GroupNorm replaced by RMSNorm to keep temporal causality. "the first frame is only spatially compressed to better handle the image data". 127M params.
- Speed: reconstruction "2.5 times faster" than HunyuanVideo's VAE on same hardware (Sec 4.1.4). PSNR only in Fig 7 (a plot; values not extracted: UNCONFIRMED).

2. Denoiser (Sec 4.2)
- 14B and 1.3B. HF 14B config: 40 layers, 40 heads, head dim 128 (dim 5120), FFN 13824, patch_size [1, 2, 2].
- Patchify: 3-D conv kernel (1,2,2) (Sec 4.2.1). Sequence length L = (1 + T/4) x H/16 x W/16; sequences "often reach hundreds of thousands or more" (Sec 4.3.1).
- Full spatio-temporal self-attention (Sec 1); text by cross-attention (Sec 4.2.1); text encoder umT5, 512-token text sequences.
- Attention cost: attention can reach 95% of training time at 1M tokens (Sec 4.3.1, per tool summary; verbatim UNCONFIRMED).
- Position encoding: not found in the part read (UNCONFIRMED in paper; HF config has rope_max_seq_len 1024, so RoPE is used in code).
- Objective: flow matching / rectified flow, x_t = t x1 + (1 - t) x0, velocity target x1 - x0, MSE, logit-normal t (Sec 4.2.2). Steps "typically around 50" (Sec 4.4).

3. Spec
- 480p and 720p; training 5 s clips at 16 fps; "typically 81 frames for 1280x720 video" (Sec 4.2.2). 81 frames -> 21 latent frames; at 1280x720: 21 x 45 x 80 = 75,600 tokens (my arithmetic from the stated L formula).

4. Training
- "billions of images and videos", about O(1) trillion tokens (Sec 1).
- Stages (Sec 4.2.2): 256p T2I pretraining; then joint: (1) 256p images + 192p 16 fps clips, (2) 480p, (3) 720p, 5 s clips; post-training at 480p and 720p (Sec 4.2.3). Example parallel setup 128 GPUs (Fig 11). Total GPU-hours not stated (UNCONFIRMED).

5. Evaluation
- Wan-Bench weighted score (Table 2): Wan 14B 0.724, Sora 0.700, CN-TopA 0.693, Wan 1.3B 0.689, Hunyuan 0.673, Mochi 0.639.
- VBench total (Table 4): Wan 14B 86.22%, Sora 84.28%, Wan 1.3B 83.96%, MiniMax 83.41%, Hunyuan 83.24%.
- Human win rates of Wan 14B (Table 3) vs CN-TopA / CN-TopB / CN-TopC / Runway: Visual Quality 30.6 / 15.9 / 27.8 / 48.1%; Overall Ranking 44.0 / 44.0 / 48.9 / 67.6%.

6. Speed
- 1.3B needs "only 8.19G of VRAM" (Sec 1). HF README: "It can generate a 5-second 480P video on an RTX 4090 in about 4 minutes (without optimization techniques like quantization)."
- Diffusion cache 1.62x (Sec 4.4.2); FP8 GEMM 1.13x in DiT; 8-bit FlashAttention over 1.27x (Sec 4.4.3).

## Mochi 1 preview (Genmo), no paper; HF card
Sources: https://huggingface.co/genmo/mochi-1-preview/raw/main/README.md ; config https://huggingface.co/genmo/mochi-1-preview/raw/main/transformer/config.json ; CLI defaults https://raw.githubusercontent.com/genmoai/mochi/main/demos/cli.py

1. VAE (AsymmVAE): "Our AsymmVAE causally compresses videos to a 128x smaller size, with an 8x8 spatial and a 6x temporal compression to a 12-channel latent space." Table: 362M params, enc base channels 64, dec base channels 128, latent dim 12, spatial 8x8, temporal 6x. (3*8*8*6/12 = 96, not 128: the card's "128x" does not match its own factors by this arithmetic; record as stated.) Reconstruction metrics: none on card (UNCONFIRMED).
2. Denoiser (AsymmDiT): "a 10 billion parameter diffusion model built on our novel Asymmetric Diffusion Transformer (AsymmDiT) architecture. Trained entirely from scratch". Table: 10B, 48 layers, 24 heads, visual dim 3072, text dim 1536, visual tokens 44520, text tokens 256.
- "AsymmDiT jointly attends to text and visual tokens with multi-modal self-attention and learns separate MLP layers for each modality, similar to Stable Diffusion 3. However, our visual stream has nearly 4 times as many parameters as the text stream via a larger hidden dimension. To unify the modalities in self-attention, we use non-square QKV and output projection layers." (full joint attention, MM-DiT style).
- "Mochi 1 simply encodes prompts with a single T5-XXL language model."
- Patch: config "patch_size": 2 (spatial 2x2). Position encoding: not on card (UNCONFIRMED). Objective: not on card (UNCONFIRMED; CLI uses a sigma schedule "linear_quadratic_schedule").
- Steps: CLI default --num_steps 64, cfg 6.0; diffusers example num_inference_steps=64.
3. Spec: "The initial release generates videos at 480p today." CLI defaults width 848, height 480, num_frames 163; diffusers example exports fps=30. 163 frames at 30 fps = 5.4 s (my arithmetic; duration not stated on HF card). Token check (my arithmetic): (163 - 1)/6 + 1 = 28 latent frames, 480/8/2 = 30, 848/8/2 = 53, 28 x 30 x 53 = 44,520, matching the card's "Visual Tokens 44520".
4. Training: not on card (UNCONFIRMED).
5. Evaluation: card says "high-fidelity motion and strong prompt adherence in preliminary evaluation"; no numbers on card (UNCONFIRMED).
6. Hardware: "requires approximately 60GB VRAM when running on a single GPU"; "we recommend using at least 1 H100 GPU"; ComfyUI under 20 GB.

## Wan 2.2 (Alibaba, Jul 2025), HF cards (no arXiv report found for 2.2 at time of search: UNCONFIRMED whether one exists)
Sources: https://huggingface.co/Wan-AI/Wan2.2-TI2V-5B/raw/main/README.md ; https://huggingface.co/Wan-AI/Wan2.2-T2V-A14B/raw/main/README.md ; configs https://huggingface.co/Wan-AI/Wan2.2-TI2V-5B-Diffusers/raw/main/vae/config.json and .../transformer/config.json and .../README.md

1. VAE
- Wan2.2-VAE (used by TI2V-5B): "achieves a T x H x W compression ratio of 4x16x16, increasing the overall compression rate to 64 while maintaining high-quality video reconstruction. With an additional patchification layer, the total compression ratio of TI2V-5B reaches 4x32x32." Config: "z_dim": 48 (latent channels), scale_factor_spatial 16, scale_factor_temporal 4. (3*16*16*4/48 = 64, consistent.)
- The A14B models use the Wan 2.1 VAE (4x8x8, 16 ch) per general knowledge: UNCONFIRMED from the card text read.
- No reconstruction numbers on the cards (UNCONFIRMED).

2. Denoiser
- A14B MoE: "a two-expert design tailored to the denoising process of diffusion models: a high-noise expert for the early stages, focusing on overall layout; and a low-noise expert for the later stages, refining video details. Each expert model has about 14B parameters, resulting in a total of 27B parameters but only 14B active parameters per step". Switch rule: threshold step t_moe "corresponding to half of the SNR_min", switch to the low-noise expert when t < t_moe.
- TI2V-5B dense: config 30 layers, 24 heads x 128 (dim 3072), FFN 14336, in_channels 48, patch (1,2,2) per "additional patchification layer".
- Text encoder umT5 (inherits Wan 2.1; card uses --t5_cpu flag; "umT5" not quoted from 2.2 card: UNCONFIRMED wording). Objective: flow matching inherited from Wan 2.1 (UNCONFIRMED on 2.2 card).
- Steps: diffusers 5B example num_inference_steps = 50, num_frames = 121.

3. Spec
- TI2V-5B: "text-to-video and image-to-video generation at 720P resolution with 24fps"; "the 720P resolution of the Text-Image-to-Video task is 1280*704 or 704*1280". 121 frames at 24 fps = ~5 s. Tokens (my arithmetic): 31 latent frames x (704/32) x (1280/32) = 31 x 22 x 40 = 27,280.
- T2V-A14B: "supports generating 5s videos at both 480P and 720P resolutions".

4. Training data: "Compared to Wan2.1, Wan2.2 is trained on a significantly larger data, with +65.6% more images and +83.2% more videos." Absolute counts not stated (UNCONFIRMED).

5. Evaluation: "On our new benchmark Wan-Bench 2.0, the model surpasses leading commercial models across most key evaluation dimensions" (numbers are in an image, not extracted: UNCONFIRMED).

6. Speed: "Without specific optimization, TI2V-5B can generate a 5-second 720P video in under 9 minutes on a single consumer-grade GPU"; "This command can run on a GPU with at least 24GB VRAM (e.g, RTX 4090 GPU)". A per-GPU "Total time (s) / peak GPU memory (GB)" table exists on the card as an image (values UNCONFIRMED).

## HunyuanVideo 1.5 (Tencent, Nov 2025): HF card + arXiv 2511.18870 (abs page lists v1, v2; HTML fetched without suffix, version UNCONFIRMED, presumably v2)
Sources: https://huggingface.co/tencent/HunyuanVideo-1.5/raw/main/README.md ; https://arxiv.org/html/2511.18870 ; VAE config https://huggingface.co/tencent/HunyuanVideo-1.5/raw/main/vae/config.json ; DiT config https://huggingface.co/tencent/HunyuanVideo-1.5/raw/main/transformer/720p_t2v/config.json

1. VAE
- Card: "an 8.3B-parameter Diffusion Transformer (DiT) with a 3D causal VAE, achieving compression ratios of 16x in spatial dimensions and 4x along the temporal axis." Paper Sec 3.1: "causal 3D transformer architecture designed for joint image-video encoding". Config: latent_channels 32, ffactor_spatial 16, ffactor_temporal 4. (3*16*16*4/32 = 96.)
- No reconstruction PSNR table in the report as read (UNCONFIRMED).

2. Denoiser
- 8.3B; Table 1: 54 dual-stream blocks, dim 2048, FFN 8192, 16 heads, head dim 128. Config: mm_double_blocks_depth 54, mm_single_blocks_depth 0, patch_size [1, 1, 1] (no extra patchify: the 16x VAE does the work), rope_dim_list [16, 56, 56] (3-D RoPE), qk_norm rms.
- Text encoders: "a visual-language multimodal encoder Qwen2.5-VL" and "a multilingual Glyph-ByT5 text encoder" (Sec 3.1).
- Attention: full attention baseline; SSTA (Selective and Sliding Tile Attention) sparse variant, parameter-free. Card: SSTA "prunes redundant spatiotemporal kv blocks ... achieving an end-to-end speedup of 1.87x in 10-second 720p video synthesis compared to FlashAttention-3."
- Objective: flow matching (Sec 4.3 "follow[s] the flow matching paradigm"). Card defaults: --num_inference_steps 50, --video_length 121; diffusers example fps=24. Step-distilled 480p I2V: 8 or 12 steps.
- Optimizer Muon: "attains a lower training loss than AdamW in only half the number of training steps" (Sec 3.1).

3. Spec: 480p and 720p, 5 to 10 s, 24 fps; few-step SR network to 1080p. Tokens (my arithmetic): 121 frames -> 31 latent frames x 45 x 80 at 720p = 111,600 tokens; a 241-frame (10 s) 720p clip -> 61 x 3600 = 219,600 tokens. Not stated in source.

4. Training (Sec 2.1, Sec 4, Table 2)
- "approximately 800 million high-quality video segments remained for pre-training"; over 10M hours of raw video acquired; ~5B images for pretraining.
- Stages: I to II T2I at 256p and 512p; III to VI T2V/I2V/T2I from 256p/16fps to 720p/24fps; VII to VIII continued training at 480p/720p; task ratio "1:6:3" (T2I:T2V:I2V). Post-training: CT, SFT, RLHF (MixGRPO for I2V; DPO then online RL for T2V). Compute not stated (UNCONFIRMED).

5. Evaluation
- GSB protocol (card): 300 text prompts + 300 images, one run per input, no cherry-picking, "over 100 professional assessors".
- Table 5 T2V GSB (HY win rate): vs Wan2.2 +17.12%, Kling2.1 Master +12.6%, Seedance Pro +11.02%, Veo3 -10.32%.
- Table 6 I2V GSB: vs Wan2.2 +12.65%, Kling2.1 Master +9.72%, Seedance Pro -5.77%, Veo3 -3.61%.
- Table 3 (T2V rating) instruction following HY1.5 61.57 vs Veo3 73.77; Table 4 (I2V) 63.05 vs 67.86. No VBench.

6. Speed
- Sec 6: "using 8 NVIDIA H800 GPUs with context parallelism"; Table 7: 5.5070 s/step full vs 2.9475 s/step with SSTA at 241 frames 720p. Table 8 50-step totals 96.78 -> 58.39 (units unlabelled per tool: UNCONFIRMED unit, probably seconds).
- Memory: "a peak memory of 13.6 GB" for 720p 121-frame with offloading and VAE tiling, enabling RTX 4090.
- Card: step-distilled 480p I2V: "a single RTX 4090 can generate videos within 75 seconds" (end-to-end time reduced by 75%).

## LTX-2 (Lightricks), arXiv 2601.03233v1 (6 Jan 2026) "LTX-2: Efficient Joint Audio-Visual Foundation Model"
Sources: https://arxiv.org/html/2601.03233 ; HF https://huggingface.co/Lightricks/LTX-2/raw/main/README.md ; VAE config https://huggingface.co/Lightricks/LTX-2/raw/main/vae/config.json

1. Autoencoders
- Video: paper says latents come from "a spatiotemporal causal VAE encoder" (Sec 3); compression not stated in paper text as read. HF diffusers VAE config: spatial_compression_ratio 32, temporal_compression_ratio 8, latent_channels 128, encoder_causal true, decoder_causal false (same shape as LTX-Video).
- Audio (Sec 3.3): stereo mel-spectrograms at 16 kHz; each latent token about 1/25 s, 128-dim; HiFi-GAN-based vocoder outputs 24 kHz stereo.
- Reconstruction metrics: not found (UNCONFIRMED).

2. Denoiser
- Abstract: "a 14B-parameter video stream and a 5B-parameter audio stream"; Conclusion (Sec 9): "a pretrained 13B video diffusion transformer with a lightweight 3B audio stream"; Table 1: 19B. HF checkpoints named ltx-2-19b-*. (Text and conclusion disagree: both recorded.)
- "asymmetric dual-stream" DiT, bidirectional audio-visual cross-attention in every block (Sec 3.1); video 3-D RoPE, audio 1-D RoPE; cross-modal attention uses only the temporal RoPE component (Sec 3.1.1).
- Text encoder: Gemma3-12B, multi-layer feature extractor, learnable projection, text connector with "thinking tokens" (Sec 3.2).
- Objective: flow matching / rectified flow (App. Fig A1; Sec 2). Guidance: video s_t = 3, s_m = 3; audio s_t = 7, s_m = 3 (Sec 4.1).
- Steps: HF example stage 1 num_inference_steps=40; distilled model "8 steps, CFG=1".

3. Spec
- Base generation ~0.5 MP, then latent upscaling and tiled refinement to 1080p (Sec 4.2); x2 spatial and x2 temporal latent upscalers on HF.
- "up to 20 seconds of continuous video with synchronized stereo audio" (Sec 6.3). HF example: 768 x 512, 121 frames, frame_rate 24.0. 4K: not in paper as read (UNCONFIRMED).
- Tokens (my arithmetic): 768x512x121 -> 16 x 16 x 24 = 6,144 video tokens; 5 s audio at 25 tokens/s ~ 126 audio tokens.

4. Training: subset of LTX-Video data filtered for clips with significant audio, re-captioned (Sec 5). Scale and compute not stated (UNCONFIRMED).

5. Evaluation: human preference "comparable to leading proprietary models" (Sec 6.1, no numbers given). Artificial Analysis (as of 6 Nov 2025): "3rd in Image-to-Video and 4th in Text-to-Video generation" (Sec 6.2).

6. Speed (Sec 6.3, Table 1, NVIDIA H100, 121 frames at 720p): Wan 2.2-14B (video only) 22.30 s/step vs LTX-2 (audio + video) 1.22 s/step; "LTX-2 is approximately 18x faster than Wan 2.2."

## Sora (OpenAI), "Video generation models as world simulators" (Feb 2024)
Source: live page https://openai.com/index/video-generation-models-as-world-simulators/ returned 403; used Wayback snapshot https://web.archive.org/web/20250105124831/https://openai.com/index/video-generation-models-as-world-simulators/ (fetched via curl, text extracted).

- No numbers for parameters, compression factors, patch size, latent channels, steps, data or compute: "Model and implementation details are not included in this report."
- Overview: "we train text-conditional diffusion models jointly on videos and images of variable durations, resolutions and aspect ratios. We leverage a transformer architecture that operates on spacetime patches of video and image latent codes. Our largest model, Sora, is capable of generating a minute of high fidelity video."
- "up to a full minute of high definition video."
- Compression network: "We train a network that reduces the dimensionality of visual data. This network takes raw video as input and outputs a latent representation that is compressed both temporally and spatially. Sora is trained on and subsequently generates videos within this compressed latent space. We also train a corresponding decoder model that maps generated latents back to pixel space."
- Patches: "Given a compressed input video, we extract a sequence of spacetime patches which act as transformer tokens. This scheme works for images too since images are just videos with a single frame." "At inference time, we can control the size of generated videos by arranging randomly-initialized patches in an appropriately-sized grid." "Whereas LLMs have text tokens, Sora has visual patches."
- Objective: "Sora is a diffusion model; given input noisy patches (and conditioning information like text prompts), it's trained to predict the original "clean" patches. Importantly, Sora is a diffusion transformer." (x0-style prediction as worded.) Attention type not stated.
- Scaling: "Sample quality improves markedly as training compute increases." Video panel captions: "Base compute", "4x compute", "32x compute".
- Native size: past approaches "resize, crop or trim videos to a standard size, e.g., 4 second videos at 256x256 resolution" (dash replaced). "Sora can sample widescreen 1920x1080p videos, vertical 1080x1920 videos and everything inbetween." Square-crop ablation: square-crop model "sometimes generates videos where the subject is only partially in view".
- Captions: "We apply the re-captioning technique introduced in DALL.E 3 to videos" and "we also leverage GPT to turn short user prompts into longer detailed captions".
- Images: "up to 2048x2048 resolution", by "arranging patches of Gaussian noise in a spatial grid with a temporal extent of one frame".
- Emergent: 3D consistency, long-range coherence and object permanence, interacting with the world, simulating digital worlds (Minecraft); "purely phenomena of scale".
- Limitations: "it does not accurately model the physics of many basic interactions, like glass shattering."
- No evaluation numbers, no speed claims.

## Veo 3 (Google DeepMind): model card only, no technical report found
Sources: Veo 3 Model Card PDF https://storage.googleapis.com/deepmind-media/Model-Cards/Veo-3-Model-Card.pdf ("Published: May 23, 2025, Updated: Jan 13, 2026"; 6 pages; linked from https://deepmind.google/models/model-cards/veo-3-1-lite/ ) ; Gemini API docs https://ai.google.dev/gemini-api/docs/veo

- Architecture (card, verbatim): "Veo 3 utilizes latent diffusion, which is the de facto standard approach for modern image, audio, and video generative models ... In latent diffusion models, the diffusion process is applied to the temporal audio latents, and the spatio-temporal video latents." No parameter count, autoencoder factors, attention type or text encoder given (all UNCONFIRMED).
- Data: "trained on audio, video, and image data", captions "at different levels of detail, leveraging multiple Gemini models"; "deduplicated semantically". No scale given.
- Hardware/software: "trained using Google's Tensor Processing Units (TPUs)"; "Training was done using JAX and ML Pathways."
- Evaluation (card): MovieGenBench, "1,003 prompts for video and 527 prompts for video+audio"; compared to MovieGen, Kling 2.0, Minimax, Sora Turbo, plus Runway Gen-3, WAN 2.1, MiniMax T2V-01, Kling 2.0 + MMAudio; VBench I2V "355 image+text pairs" vs Runway Gen-4, Kling 2.0 (Pro), WAN 2.1, MiniMax I2V-01. "Veo 3 performed best on overall preference, and for its capability to follow prompts accurately." No numeric win rates in the text (the PDF may hold charts: UNCONFIRMED).
- Spec (Gemini API docs, not the card): Veo 3 and Veo 3 Fast (marked Deprecated): "8 seconds", "720p & 1080p (16:9 only)", "24fps", audio "Natively generates audio with video." Veo 3.1: 4, 6 or 8 s, 720p, 1080p and 4k (1080p/4k 8 s only), 24 fps. Request latency "Min: 11 seconds; Max: 6 minutes (during peak hours)."
- Related: Veo 3.1 Lite card: "Veo 3.1 Lite T2V achieved 54.6% overall win-rate across 1000 prompts" and "I2V achieved 47.2% overall win-rate across 646 prompts" vs Veo 3.1 Fast.

## Factorised-attention papers

### Video Diffusion Models (Ho et al.), arXiv 2204.03458 (abs lists v1, v2; HTML fetched without suffix, presumably v2)
Source: https://arxiv.org/html/2204.03458
- Sec 3: "we change each 3x3 convolution into a 1x3x3 convolution" (space-only 3-D conv). Spatial attention kept; "we insert a temporal attention block that performs attention over the first axis" with spatial axes treated as batch axes. "We use relative position embeddings" in temporal attention. Joint image-video training by "removing the attention operation inside each time attention block" (images appended as extra frames, temporal attention masked). Terms: "factorized space-time attention", "our factorized space-time architecture".
- Data: "We model short segments of 16 frames from this dataset, downsampled to a spatial resolution of 64x64" (UCF101, Sec 4.1).
- Table 1 UCF101 (FID and IS, not FVD): Video Diffusion 16x64x64 FID 295 +/- 3, IS 57 +/- 0.62; TGAN-v2 64x64 FID 3431 +/- 19, IS 26.60 +/- 0.47; real data IS 60.2.
- Table 3 Kinetics-600 FVD: ancestral sampler (512 steps) 68.19; Langevin (256 steps) 66.92. Table 2 BAIR FVD: values not extracted (UNCONFIRMED).

### Latte (Ma et al.), arXiv 2401.03048 (abs lists v1 to v3; HTML fetched without suffix, presumably v3)
Source: https://arxiv.org/html/2401.03048
- Four variants (Sec 3.2, Fig 2): Variant 1 alternates spatial Transformer blocks and temporal Transformer blocks ("interleaved fusion"); Variant 2 "late fusion" (spatial blocks first, then temporal), same number of blocks; Variant 3 factorises attention inside each block, "initially computes self-attention only on the spatial dimension", then temporal; Variant 4 splits multi-head attention, half the heads spatial, half temporal.
- Winner: Variant 1, "performs the best with increasing iterations" (Fig 5f, Sec 4.2). Note: the comparison is a plot (FVD vs iterations), not a table.
- Patch embedding: uniform frame patch embedding won; compression (tubelet-style) frame patch "notably falls behind" (Fig 5a).
- Timestep/class injection: S-AdaLN "significantly better" than "all tokens" (Fig 5b).
- Temporal position embedding: absolute chosen over RoPE, "slightly better results" (Fig 5c).
- Image-video joint training "leads to a significant improvement of FID and FVD"; UCF101 FVD Temporal Mask 589.86 vs Only Video 705.72 (ablation table; table number per tool: Table 5, UNCONFIRMED exact number).
- Table 3 FVD (FaceForensics / SkyTimelapse / UCF101 / Taichi-HD): Latte 34.00 / 59.82 / 477.97 / 159.60; Latte+IMG 27.08 / 42.67 / 202.23 / 97.09. Plain Latte is beaten on some (PVDM SkyTimelapse 55.41, UCF101 343.6; MoCoGAN-HD Taichi-HD 128.1); Latte+IMG is best on all four.

## Summary table (compression = temporal x spatial x spatial; tokens marked * are my arithmetic, not stated in source)

| Model | Params | VAE t x h x w, channels | Patch | Attention | Text encoder | Objective | Default clip | Tokens per clip |
|---|---|---|---|---|---|---|---|---|
| Sora (2024) | not given | "compressed both temporally and spatially" | spacetime patches | not given | GPT-expanded captions | diffusion, predicts clean patches | up to 1 min, up to 1920x1080 | not given |
| Movie Gen | 30B | 8x8x8, 16 ch | 1x2x2 | full bidirectional | UL2 + ByT5 + MetaCLIP | flow matching | 16 s, 16 fps, 768 px (upsampled 1080p) | ~73K (stated) |
| CogVideoX-5B | 5B | 4x8x8, 16 ch, causal | 2x2 (config) | full 3-D, text+video joint | T5 | v-pred, zero SNR | 49 f, 8 fps, 720x480 (released) | 17,550* |
| HunyuanVideo | 13B | 4x8x8, 16 ch, causal | 1x2x2 (config) | full, dual then single stream | MLLM + CLIP-L | flow matching | 129 f, 720x1280 | 118,800* |
| Mochi 1 | 10B | 6x8x8, 12 ch, causal | 2x2 | joint MM self-attn, asymmetric | T5-XXL | UNCONFIRMED | 163 f, 30 fps, 848x480 | 44,520 (stated) |
| LTX-Video | 1.9B | 8x32x32, 128 ch, causal enc | 1x1x1 | full self + cross | T5 | rectified flow | 121 f, 24 fps, 768x512 | 6,144* |
| Wan 2.1 | 14B / 1.3B | 4x8x8, 16 ch, causal | 1x2x2 | full self + cross | umT5 | flow matching | 81 f, 16 fps, 1280x720 | 75,600* |
| Wan 2.2 TI2V-5B | 5B | 4x16x16, 48 ch | 1x2x2 | (as Wan 2.1) | umT5 (UNCONFIRMED wording) | (flow matching, UNCONFIRMED) | 121 f, 24 fps, 1280x704 | 27,280* |
| Wan 2.2 A14B | 27B total, 14B active (2 experts) | (Wan 2.1 VAE, UNCONFIRMED) | | | | | 5 s, 480p/720p | |
| HunyuanVideo 1.5 | 8.3B | 4x16x16, 32 ch, causal | 1x1x1 | full or SSTA sparse | Qwen2.5-VL + Glyph-ByT5 | flow matching | 121 f, 24 fps, 720p | 111,600* |
| LTX-2 | 19B (14B video + 5B audio; conclusion says 13B + 3B) | 8x32x32, 128 ch (config) | | dual-stream, A/V cross-attn | Gemma3-12B | flow matching | up to 20 s with audio | 6,144* at 768x512x121 |
| Veo 3 | not given | "spatio-temporal video latents", "temporal audio latents" | | not given | not given | latent diffusion | 8 s, 24 fps, 720p/1080p (API docs) | not given |

## UNCONFIRMED list (could not confirm from a primary source)
- Sora: every architecture number (none published).
- Veo 3: params, autoencoder, attention, text encoder, data scale, numeric win rates; specs come from Gemini API docs, not the model card.
- Mochi 1: objective, position encoding, training data, evaluation numbers; duration 5.4 s is derived (163 f / 30 fps); the card's "128x" compression does not equal 3*8*8*6/12 = 96.
- CogVideoX: 4k+1 frame rule not stated in words; temporal patch size in paper; compute.
- HunyuanVideo: fps in paper; compute; exact arXiv version of fetched HTML.
- LTX-Video: reconstruction metrics; T5 size; data scale; 8k+1 rule not stated in words.
- Wan 2.1: VAE PSNR values (only in Fig 7); RoPE not quoted from paper (config shows RoPE); verbatim of the 95%-of-time attention claim; GPU-hours.
- Wan 2.2: whether a technical report exists; Wan-Bench 2.0 numbers and the per-GPU speed table (images on card); A14B VAE; absolute data counts.
- HunyuanVideo 1.5: VAE reconstruction table; Table 8 units; compute.
- LTX-2: video VAE factors from paper text (only from HF config); 4K; data scale; numeric human preference.
- Latte: exact table number of the joint-training ablation.
- VDM: BAIR FVD values.
- Most HTML pages were fetched without a version suffix; versions recorded from the header where the tool reported one (Movie Gen v2, CogVideoX v3, LTX-Video v1, Wan v2, LTX-2 v1).
