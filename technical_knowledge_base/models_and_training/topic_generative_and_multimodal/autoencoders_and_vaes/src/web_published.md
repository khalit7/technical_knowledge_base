# Published numbers: autoencoders, VAEs, image tokenizers

All entries checked 2026-10-17. Quotes are verbatim from the arXiv PDF text (pdftotext) or arXiv HTML of the version named. "Vendor" = the authors' own claim about their own model (all paper numbers are this unless marked independent). rFID = reconstruction FID.

## A. Image tokenizers

### A1. VQ-VAE (van den Oord et al. 2017), arXiv 1711.00937v2
- ImageNet 128x128x3 -> 32x32x1 discrete latents, K = 512. CONFIRMED.
- Quote: "we can model x = 128 × 128 × 3 images by compressing them to a z = 32 × 32 × 1 discrete space (with K=512) via a purely deconvolutional p(x|z). So a reduction of 128×128×3×8 / 32×32×9 ≈ 42.6 in bits." (Sec 4.2). Figure 2 caption: "ImageNet 128x128x3 images, right: reconstructions from a VQ-VAE with a 32x32x1 latent space, with K=512."
- Downsampling factor 4 (128 -> 32). 9 bits per code = log2(512).
- No rFID reported (paper predates rFID use).
- URL: https://arxiv.org/abs/1711.00937v2

### A1b. VQ-VAE-2 (Razavi et al. 2019), arXiv 1906.00446v1
- ImageNet 256x256: two-level hierarchy, bottom 64x64 (factor 4), top 32x32 (further factor 2). Codebook size 512, codebook dimension 64 (both levels; FFHQ-1024 uses three levels 32x32, 64x64, 128x128).
- Quote: "For 256 × 256 images, we use a two level latent hierarchy. As depicted in Fig. 2a, the encoder network first transforms and downsamples the image by a factor of 4 to a 64 × 64 representation ... scales down the representations by a factor of two, yielding a top-level 32 × 32 latent map". Table 5 (Appendix A.2): "Latent layers 32 × 32, 64 × 64 ... Codebook size 512 ... Codebook dimension 64", "β (commitment loss coefficient) 0.25".
- Uses EMA codebook updates: "As proposed in [37], we use the exponential moving average updates for the codebook, as a replacement for the codebook loss".
- rFID: VQGAN paper Table 5 (2012.09841v3) lists VQVAE-2 at "64 × 64 & 32 × 32, 512, n/a, ∼ 10" (FID/val n/a, FID/train about 10). Third party number, as reported by Esser et al.
- URL: https://arxiv.org/abs/1906.00446v1

### A2. DALL-E dVAE (Ramesh et al. 2021), arXiv 2102.12092v2
- 256x256 RGB -> 32x32 = 1024 tokens, codebook 8192, downsample 8, gumbel-softmax relaxation. CONFIRMED.
- Quote: "We train a discrete variational autoencoder (dVAE) to compress each 256×256 RGB image into a 32 × 32 grid of image tokens, each element of which can assume 8192 possible values. This reduces the context size of the transformer by a factor of 192". "We instead use the gumbel-softmax relaxation (Jang et al., 2016; Maddison et al., 2016), replacing the expectation over qφ with one over qφτ".
- Training lore (Appendix A.2): "The KL weight β is increased from 0 to 6.6 over the first 5000 updates. Bowman et al. (2015) use a similar schedule based on the sigmoid function." and "The relaxation temperature τ is annealed from 1 to 1/16 over the first 150,000 updates. Using a linear annealing schedule for this typically led to divergence." Also: "We divide the overall loss by 256 × 256 × 3, so that the weight of the KL term becomes β/192".
- rFID: VQGAN Table 5 lists DALL-E at 32x32, 8192: FID/val 32.01, FID/train 33.88 (measured by Esser et al., so independent of OpenAI).
- URL: https://arxiv.org/abs/2102.12092v2

### A3. VQGAN / taming transformers (Esser et al. 2021), arXiv 2012.09841v3
- f = 16, |Z| = 1024 default and 16384 for the big ImageNet model, code dim nz = 256 (Table 7 in the appendix: "c-IN (big) 48 1400 256 16384" with columns nlayer, params[M], nz, |Z|).
- Quote on default: "usually set |Z|= 1024"; on ImageNet: "GAN with dim Z = 16384 and f = 16".
- rFID from VQGAN's own Table 5, "FID on ImageNet between reconstructed validation split and original validation (FID/val) and training (FID/train) splits." Note the column labelled "Codebook Size" is the latent grid and "dim Z" is the number of codes:

| Model | latent grid | codes | FID/val | FID/train |
|---|---|---|---|---|
| VQVAE-2 | 64x64 & 32x32 | 512 | n/a | ~10 |
| DALL-E | 32x32 | 8192 | 32.01 | 33.88 |
| VQGAN | 16x16 | 1024 | 7.94 | 10.54 |
| VQGAN | 16x16 | 16384 | 4.98 | 7.41 |
| VQGAN* | 32x32 | 8192 | 1.49 | 3.24 |
| VQGAN | 64x64 & 32x32 | 512 | 1.45 | 2.78 |

  Footnote: "∗ trained with Gumbel-Softmax reparameterization as in [59, 29]." Resolution is ImageNet 256x256 (the 16x16 rows are f = 16 at 256).
- Codebook usage: appendix figure caption says the plot shows "effective size of the VQGAN's codebook, i.e. it describes how many entries of the codebook with dim Z = 16384 are actually used." (No single usage percentage quoted in text; later papers report about 3% to 8% usage for VQGAN-16384: see LlamaGen entry A9.)
- URL: https://arxiv.org/abs/2012.09841v3

### A4. ViT-VQGAN (Yu et al. 2021), arXiv 2110.04627v3
- 256x256 -> 32x32 = 1024 tokens (patch 8, so f = 8), codebook 8192, factorized lookup codes of dim 32 (default; 8 and 16 tried), l2-normalised. CONFIRMED.
- Quotes: "encoding a 256×256 resolution image into a 32×32=1024 token sequence"; "Factorized codes. We introduce a linear projection from the output of the encoder to a low-dimensional latent variable space for code index lookup (e.g., reduced from a 768-d vector to a 32-d or 8-d vector per code) and find it has an immediate boost of codebook usage." "l2-normalized codes. We also apply l2 normalization on the encoded latent variables ze(x) and codebook latent variables e ... the Euclidean distance of l2-normalized latent variables ... evolves to the cosine similarity". Commitment β "set to 0.25 in all our experiments".
- No EMA: the paper does not use EMA codebook updates (no "moving average" in text); it relies on factorized + l2-normalised codes for usage.
- rFID, Table 3 ("FID between reconstructed validation split and original validation split"): ViT-VQGAN ImageNet 32x32, 8192: 1.28; CelebA-HQ 4.66; FFHQ 3.13. Same table repeats VQGAN 16x16/1024: 7.94, 16x16/16384: 4.98, VQGAN* (gumbel) 32x32/8192: 1.49, VQGAN** (hierarchical) 1.45, DALL-E dVAE 32.00 (VQGAN paper said 32.01).
- Table 4 ablation (ImageNet, codebook 8192; "codebook usage is calculated as the percentage of used codes given a batch of 256 test images averaged over the entire test set"), latent dim vs FID / usage, Base-Base ViT, StyleGAN disc: dim 256: FID 3.68, usage 4%; 128: 2.77, 14%; 64: 2.50, 37%; 32: 1.55, 96%; 16: 1.50, 95%; 8: 1.52, 96%; 4: 3.68, 96%. Removing l2-norm (dim 32): FID 5.44, usage 2%. CNN encoder/decoder: FID 2.26, usage 63%. Small enc + Large dec: FID 1.28 (this is the 1.28 in Table 3; Base-Base is 1.55, so text and tables agree once you match rows).
- Quote: "factorized codes with low-dimensional latent variables consistently achieve better reconstruction quality when the latent dimension is reduced from 256 to 16 or 8. Moreover, removing l2-normalization leads to much worse results."
- URL: https://arxiv.org/abs/2110.04627v3

### A5. Parti (Yu et al. 2022), arXiv 2206.10789v1
- ViT-VQGAN tokenizer, 256x256 -> 32x32 = 1024 tokens, codebook 8192. CONFIRMED.
- Quotes: "We first train a ViT-VQGAN-Small configuration (8 blocks, 8 heads, model dimension 512, and hidden dimension 2048 ... with about 30M total parameters), and learn 8192 image token classes for the codebook." "we freeze the tokenizer's encoder and codebook, and finetune a larger-size tokenizer decoder (32 blocks, 16 heads, model dimension 1280, and hidden dimension 5120, with about 600M total parameters). We use 256×256 resolution for the image tokenizer's input and output." "the length of image tokens are fixed to 1024 (i.e., 32×32 latent codes from a 256 × 256 input image)".
- Lore: they found "visual pixelation patterns" and "ill-conditioned weight matrices of the output projection layer before the sigmoid activation function. As a fix, we remove the final sigmoid activation layer and the logit-laplace loss".
- URL: https://arxiv.org/abs/2206.10789v1

### A6. MaskGIT (Chang et al. 2022), arXiv 2202.04200v1, and MUSE (Chang et al. 2023), arXiv 2301.00704v1
- MaskGIT: VQ tokenizer, f = 16, codebook 1024; 256x256 -> 16x16 = 256 tokens (512x512 -> 1024 tokens).
  Quote: "For each dataset, we only train a single autoencoder, decoder, and codebook with 1024 tokens on cropped 256x256 images for all the experiments. The image is always compressed by a fixed factor of 16, i.e. from H × W to a grid of tokens in the size of h × w, where h=H/16 and w=W/16." Also "the image token length, e.g. 256 or 1024". No rFID given in MaskGIT for its own tokenizer (UNCONFIRMED in MaskGIT itself; MAGVIT-v2 Table 5(b) lists "MAGVIT" tokenizer at ImageNet 128x128 rFID 2.65).
- MUSE: two VQGANs, codebook 8192. Base: f = 16 on 256x256 -> 16x16 = 256 tokens. Super-res: f = 8 on 512x512 -> 64x64 = 4096 tokens.
  Quotes: "We train two VQGAN models: one with downsampling ratio f = 16 and the other with downsampling ratio f = 8. We obtain tokens for our base model using the f = 16 VQGAN model on 256×256 pixel images, thus resulting in tokens with spatial size 16 × 16. We obtain the tokens for our super-resolution model using the f = 8 VQGAN model on 512 × 512 images, and the corresponding token has spatial size 64 × 64." "We use a CNN model with 19 ResNet blocks and a quantized codebook of size 8192 for the tokenization. Larger codebook sizes did not result in performance improvements." Appendix A.2 table: "Codebook size 8192", "Perceptual loss weight 0.05", "Adversarial loss weight 0.1".
- URLs: https://arxiv.org/abs/2202.04200v1 , https://arxiv.org/abs/2301.00704v1

### A7. MAGVIT-v2 (Yu et al. 2023), arXiv 2310.05737v3
- LFQ (lookup-free quantization), codebook K = 2^18 (about 262K), binary latents of dimension log2 K = 18, token index from signs.
  Quotes: "LFQ is used, which eliminates the codebook embedding, to increase the default codebook size to K = 2^18." "With Ci = {-1, 1}, the arg min can be computed by the sign function". "a large codebook (2^18 ≈262K), the token factorization ... is applied using two heads with each predicting from a codebook of size 2^9."
- Video tokenizer setting (Appendix A.2): "Video input: 17 frames ... 128 × 128 resolution", "Latent shape: 5 × 16 × 16", "Vocabulary size: 2^18", "Entropy loss weight: 0.1".
- rFID: Table 5(b) "Image tokenization on ImageNet 128×128": MAGVIT 2.65 (LPIPS 0.1292); + LFQ 2.48; + large vocabulary 1.34; + up/downsampler 1.21; + deeper model 1.20; + adaptive normalization 1.15 (LPIPS 0.0685). No ImageNet 256 rFID for the image tokenizer in the main text (UNCONFIRMED; Open-MAGVIT2, A16, gives a reproduction at 256).
- Headline claim (generation, vendor): "FID 3.41 vs. 1.79 when generating images at the 256×256 resolution" (abstract, LM vs prior diffusion), and "FID=1.91 vs. 2.65" at 512.
- URL: https://arxiv.org/abs/2310.05737v3

### A8. FSQ (Mentzer et al. 2023), arXiv 2309.15505v2
- Each channel bounded and rounded to L levels; codebook = product of levels. Table 1: "Recommended sets of FSQ levels L to approximately match a given codebook size |C|": 2^8 [8,6,5]; 2^10 [8,5,5,5]; 2^12 [7,5,5,5,5]; 2^14 [8,8,8,6,5]; 2^16 [8,8,8,5,5,5].
- Usage claim: "The codebook usage is very high for FSQ (≈100% for most models), without relying on any auxiliary losses." "FSQ uses almost all codewords for a codebook size of 2^14 =16k, without employing any tricks. At the same time, VQ starts dropping below 50% usage for codebooks larger than 2^11 and is not able to utilize more than 2^10 codewords for larger codebooks. In contrast, for FSQ usage continues growing with more than 2^15 codewords utilized for a codebook of size 2^16."
- rFID: VQ "reconstruction FID achieves a minimum at 2^11 codes"; FSQ keeps improving with codebook size (Fig. 3a; numbers only in the plot, so exact values UNCONFIRMED).
- MaskGIT comparison, table in Figure 4 ("MaskGIT results on ImageNet 256", ADM TF suite FID against train):

| Model | Source | CFG | Sampling FID | Precision | Recall | Usage |
|---|---|---|---|---|---|---|
| MaskGIT (VQ) | Ours | 0.1 | 4.509 | 0.860 | 0.465 | 81% |
| MaskGIT (FSQ) | Ours | 0.2 | 4.534 | 0.864 | 0.453 | 100% |
| MaskGIT (VQ) | GitHub | - | 4.916 | 0.836 | 0.489 | |
| ADM | | 1.5 | 4.59 | 0.83 | 0.52 | |

  Headline: comparable FID (4.534 vs 4.509) with 100% vs 81% usage. Also: "We find that Li < 5 leads to subpar performance."
- URL: https://arxiv.org/abs/2309.15505v2

### A9. LlamaGen (Sun et al. 2024), arXiv 2406.06525v1
- VQ tokenizer, downsample 16 (and 8), codebook 16384, code dim 8, l2-normalised codebook. rFID 2.19 at ImageNet 256 (16x16 = 256 tokens), usage 97.0%. CONFIRMED from Tables 2 to 4.
- Quote: "Following [Yu et al. 2021], we use ℓ2-normalization to codebook vectors, low codebook vector dimension C, and large codebook size K." Metric definitions: "r-FID, reconstruction-FID on 256×256 ImageNet 50k validation set. The codebook usage is calculated as the percentage of used codes in the queue of size 65536 over the whole codebook size."
- Table 2 (f = 16, ImageNet 256 val 50k): (a) code dim: 256: rFID 9.21, usage 0.29%; 32: 3.22, 20.9%; 8: 2.19 (PSNR 20.79, SSIM 0.675), 97.0%; 4: 9.88, 82.0%. (b) codebook size: 4096: 3.02, 100.0%; 8192: 2.91, 75.0%; 16384: 2.19, 97.0%; 32768: 2.26, 85.0%.
- Table 3 ("Number of tokens to represent the image ... The reconstructed image is always resized to 256×256"): f16: 256px 256 tokens rFID 2.19; 384px 576 tokens 0.94; 512px 1024 tokens 0.70. f8: 256px 1024 tokens 0.59 (PSNR 24.45, SSIM 0.813, usage 97.6%); 384px 2304 tokens 0.37; 512px 4096 tokens 0.39.
- TEXT VS TABLE DISAGREEMENT: the abstract's "0.94 rFID and codebook usage of 97%" is the f16 tokenizer fed 384x384 inputs (576 tokens), not the 256x256 setting (2.19). And the text says "increasing the number of tokens to 576 (24×24) could largely improve the image quality from 2.43 to 0.99 rFID", while Table 3 gives 2.19 to 0.94.
- Table 4 (ImageNet 256 val 50k / COCO 5k), rFID: VQGAN f16 1024 codes 8.30; VQGAN f16 16384 codes 4.99; MaskGIT f16 1024 2.28; LlamaGen f16 2.19; VQGAN-OpenImages f8 dim 4 16384 codes 1.19; ViT-VQGAN 1.28; LlamaGen f8 0.59; SD-VAE (continuous f8 c4) 0.74 (PSNR 25.68); SDXL-VAE 0.68 (PSNR 26.04); OAI-Decoder 0.81. These third-party rows are LlamaGen's own measurements (independent of the original authors), except MaskGIT and ViT-VQGAN which have "-" for PSNR/SSIM (copied numbers).
- URL: https://arxiv.org/abs/2406.06525v1

### A10. Chameleon (Chameleon Team 2024), arXiv 2405.09818v2
- 512x512 -> 1024 tokens (32x32, so f = 16), codebook 8192. CONFIRMED.
- Quote: "We train a new image tokenizer based on Gafni et al. (2022), which encodes a 512 × 512 image into 1024 discrete tokens from a codebook of size 8192. For training this tokenizer, we use only licensed images. Given the importance of generating human faces, we up-sample the percentage of images with faces during pre-training by 2 times. A core weakness of our tokenizer is in reconstructing images with a large amount of text, therefore upper bounding the capability of our models, when it comes to heavy OCR-related tasks."
- So: faces were up-weighted (2x), text is the stated weakness. Vocabulary "65,536, which includes the 8192 image codebook tokens".
- URL: https://arxiv.org/abs/2405.09818v2

### A11. Emu3 (Wang et al. 2024), arXiv 2409.18869v1 (arXiv HTML)
- Based on SBER-MoVQGAN-270M; codebook 32,768; code (latent) size 4; compression 4x8x8 (time x height x width). 512x512 image -> 4096 tokens = 64x64. CONFIRMED.
- Quote: "We train the vision tokenizer based on SBER-MoVQGAN, which can encode a 4 × 512 × 512 video clip or a 512 × 512 image into 4096 discrete tokens from a codebook of size 32,768. Our tokenizer achieves 4× compression in the temporal dimension and 8×8 compression in the spatial dimension". Table 1: "Pretrained Weights SBER-MoVQGAN-270M, Codebook Size 32768, Latent Size 4, Compression 4 × 8 × 8".
- Table 2 video reconstruction (Pexels, 3,172 videos; LPIPS/PSNR/SSIM): 128: 0.099/21.71/0.630; 256: 0.109/21.59/0.622; 512: 0.112/22.69/0.690; 720: 0.110/24.30/0.771. No rFID given.
- URL: https://arxiv.org/abs/2409.18869v1 (html: https://arxiv.org/html/2409.18869v1)

### A12. Janus (Wu et al. 2024), arXiv 2410.13848v1
- Two encoders: understanding = SigLIP-Large-Patch16-384; generation = LlamaGen VQ tokenizer, codebook 16,384, downsample 16. Images 384x384, so 24x24 = 576 generation tokens (derived, not stated as a number).
- Quotes: "For multimodal understanding, we use the SigLIP [92] encoder to extract high-dimensional semantic features from images." "For visual generation tasks, we use the VQ tokenizer from [73] to convert images into discrete IDs." ([73] = Sun et al., arXiv:2406.06525, LlamaGen.) "we select SigLIP-Large-Patch16-384 [92]. The generation encoder has a codebook of size 16, 384 and downsamples images by a factor of 16." "All images are resized to 384 × 384 pixels."
- Ablation (Table 5) shows a single VQ tokenizer for both tasks (Exp A) scoring far lower on understanding than SigLIP + VQ (Exp D), e.g. first metric column (POPE) 60.1 vs 87.0.
- URL: https://arxiv.org/abs/2410.13848v1

### A13. TiTok (Yu et al. 2024), arXiv 2406.07550v1
- 1-D tokenizer: 256x256 image -> 32 tokens (TiTok-L-32), codebook 4096; also 64 (B-64) and 128 (S-128) tokens. Patch size 16 in the ViT encoder.
- Abstract: an image "can be reduced to just 32 discrete tokens, a significant reduction from the 256 or 1024 tokens obtained by prior methods."
- Table 1 ("ImageNet-1K 256 × 256 generation results evaluated with ADM"), tokenizer rFID: TiTok-L-32: 32 tokens, 4096 codes, rFID 2.21; TiTok-B-64: 1.70; TiTok-S-128: 1.71. Same table: Taming-VQGAN 256 tokens / 1024 codes 7.94; RQ-VAE 256 / 16384 3.20; MaskGIT-VQGAN 256 / 1024 2.28; ViT-VQGAN 1024 / 8192 1.28; LDM VAE (f4) "4096×3" 0.27; SD VAE (f8) "1024×4" 0.62.
- Quote: "using merely 32 tokens, TiTok-L-32 achieves a rFID of 2.21, comparable to the well trained VQGAN from MaskGIT [9] (rFID 2.28), while using 8× smaller latent representation size."
- Code dimension 16 for TiTok (from IBQ Table 1 column "Codebook Dim 16"; not re-checked in TiTok's own text).
- Lore: TiTok-L-32 baseline 6.59 rFID; two-stage training with "decoder fine-tuning" brings it to 2.21 (Sec 4.3 ablation).
- URL: https://arxiv.org/abs/2406.07550v1

### A14. VAR (Tian et al. 2024), arXiv 2404.02905v2
- Multi-scale residual VQ-VAE, one shared codebook V = 4096, spatial downsample 16 on 256x256 (final scale 16x16), trained on OpenImages.
- Quote: "We use a shared codebook for all scales with V = 4096. Following the baseline [30], our tokenizer is also trained on OpenImages [49] with the compound loss (5) and a spatial downsample ratio of 16×." Also: "a shared codebook Z is utilized across all scales".
- Scales list: NOT in the paper text (UNCONFIRMED there). The official code gives `patch_nums=(1, 2, 3, 4, 5, 6, 8, 10, 13, 16),   # 10 steps by default` and `V=4096, Cvae=32` (code dim 32) in models/__init__.py at commit 78b95394fc5896192e3a003e4b295f8ea743c48f: https://github.com/FoundationVision/VAR/blob/78b95394fc5896192e3a003e4b295f8ea743c48f/models/__init__.py . Total tokens = 1+4+9+16+25+36+64+100+169+256 = 680 (my arithmetic).
- rFID of the VAR tokenizer: not stated in the paper (UNCONFIRMED).
- URL: https://arxiv.org/abs/2404.02905v2

### A15. Cosmos tokenizer (NVIDIA 2025), arXiv 2501.03575v3
- Discrete tokenizers use FSQ with 6 dims, levels (8, 8, 8, 5, 5, 5): vocabulary 64,000 (exactly 8x8x8x5x5x5, not 65,536). Continuous tokenizers: plain AE (not VAE), latent dim 16.
- Quote: "We employ the vanilla autoencoder (AE) formulation to model the continuous tokenizer's latent space. For discrete tokenizers, we adopt the Finite-Scalar-Quantization (FSQ) ... The latent dimension for the continuous tokenizers is 16, whereas for the discrete tokenizers, it is 6, which represents the number of the FSQ levels, which are (8, 8, 8, 5, 5, 5). This configuration corresponds to a vocabulary size of 64,000."
- Compression rates offered: image 8x8 and 16x16 (CI8x8, CI16x16, DI8x8, DI16x16); video 4x8x8, 8x8x8, 8x16x16 (time x H x W), e.g. "Cosmos-0.1-Tokenizer-DV4×8×8", "DV8×16×16".
- Table 8 (discrete image tokenizers; MS-COCO 2017 / ImageNet-1K; PSNR, SSIM, rFID), ImageNet rFID: Open-MAGVIT2 16x16 2.701; LlamaGen 8x8 1.403; LlamaGen 16x16 1.657; Cosmos-0.1 DI8x8 1.265; DI16x16 2.518. (These LlamaGen/Open-MAGVIT2 numbers differ from those papers' own, because of NVIDIA's evaluation protocol; vendor-run comparison.) Paper oddity: the "Cosmos-Tokenize1-DI...-360p" rows list Quantization "AE", which looks like a table typo.
- Table 7 (continuous image), ImageNet rFID: FLUX-Tokenizer 8x8 VAE 1.229 (PSNR 20.09); Cosmos-0.1 CI8x8 0.689 (PSNR 28.83); CI16x16 1.031. Vendor measurements.
- URL: https://arxiv.org/abs/2501.03575v3

### A16. Open-MAGVIT2 (Luo et al. 2024), arXiv 2409.04410v3, and IBQ (Shi et al. 2024), arXiv 2412.02692v2
- Open-MAGVIT2: LFQ, codebook 2^18 = 262,144, 100% usage. Table (image tokenizers): "Open-MAGVIT2-I-In1k 2D 16 × 16 16 256 × 256 262144 1.17 22.64 100%" (rFID 1.17, PSNR 22.64, ImageNet 256, f16); an f8 row reads "Open-MAGVIT2-I-In1k 2D 32 × 32 8 128 × 128 262144 0.34 27.02 100%" (columns: tokens, ratio, train resolution, codebook size, rFID, PSNR, usage; the table does not say the evaluation resolution for this row, so treat 0.34 with care). Text: "our open-source replication achieves the closest reconstruction performance stated in MAGVIT-v2 (1.18 vs. 1.15 rFID on ImageNet 128×128)". Abstract (pretrained on large data): "significantly outperforming Cosmos on zero-shot benchmarks (1.93 vs. 0.78 rFID on ImageNet original resolution)". Note: IBQ Table 1 lists Open-MAGVIT2 16,384 codes 1.58 and 262,144 codes 1.17.
- IBQ (index backpropagation quantization; all codes get gradients): IBQ Table 1 ("Reconstruction performance of different tokenizers on 256 × 256 ImageNet 50k validation set"): IBQ 16,384 codes, dim 256: rFID 1.37, LPIPS 0.2235, usage 96%; IBQ 262,144 codes, dim 256: rFID 1.00, LPIPS 0.2030, usage 84%. Same table gives codebook usage for others: VQGAN 1,024 codes 44%; VQGAN 16,384 codes 5.9% (reproduced VQGAN* 5.3%, rFID 3.98); LlamaGen dim 256 0.29%, dim 8 97%; VQGAN-LC 100,000 codes 99%.
  Quote: "VQGAN [11] has a 44% usage for 1024 codebook size, while a 5.9% usage for 16,384 codebook size."
  TABLE TYPO: IBQ Table 3 lists the largest codebook as "262,122"; Table 1 says 262,144.
- URLs: https://arxiv.org/abs/2409.04410v3 , https://arxiv.org/abs/2412.02692v2

### A17. RQ-VAE (Lee et al. 2022), arXiv 2203.01941v2
- Residual quantization depth D = 4, shared codebook K = 16,384; 256x256x3 -> 8x8x4 codes (f = 32, 64 positions x 4 codes = 256 codes).
- Quotes: "we can represent a 256×256 image as 8×8 resolution of the feature map"; "vert 256×256×3 RGB images into 8×8×4 codes"; "each depth d, a single shared codebook C is used for every quantization depth."
- Table 4 ("Comparison of FIDs between ImageNet validation images and their reconstructed images according to codebook size and the shape of code map H × W × D"; "∗ denotes 50 epochs of training"): VQ-GAN 16x16x1, 16,384: 4.90; VQ-GAN 8x8x1: 16,384: 17.95; 65,536: 17.66; 131,072: 17.09; RQ-VAE 8x8x2: 10.77; 8x8x4: 4.73; 8x8x4*: 3.20; 8x8x8: 2.69; 8x8x16: 1.83.
- Quote: "increasing the quantization depth D is more effective to improve the reconstruction quality than increasing the codebook size K. Here, we remark that RQ-VAE with D = 1 is equivalent to VQ-GAN."
- URL: https://arxiv.org/abs/2203.01941v2

## B. Continuous VAEs of image generators

### B1. SD3 (Esser et al. 2024), arXiv 2403.03206v1
- 16-channel VAE, f = 8. Table 3 ("Improved Autoencoders. Reconstruction performance metrics for different channel configurations. The downsampling factor for all models is f = 8."):

| Metric | 4 chn | 8 chn | 16 chn |
|---|---|---|---|
| FID (lower better) | 2.41 | 1.56 | 1.06 |
| Perceptual Similarity (lower better) | 0.85 | 0.68 | 0.45 |
| SSIM | 0.75 | 0.79 | 0.86 |
| PSNR | 25.12 | 26.40 | 28.62 |

  The paper does not name the dataset or resolution for Table 3 (UNCONFIRMED which set). "Perceptual Similarity" values look like LPIPS on a scaled (x10?) axis; the paper does not say (UNCONFIRMED).
- Quote: "Similar to Dai et al. (2023), we find that increasing the number of latent channels d significantly boosts reconstruction performance, see Table 3. Intuitively, predicting latents with higher d is a more difficult task, and thus models with increased capacity should be able to perform better for larger d ... We confirm this hypothesis in Figure 10, where we see that the d = 16 autoencoder exhibits better scaling performance in terms of sample FID. For the remainder of this paper, we thus choose d = 16."
- scaling_factor 1.5305, shift_factor 0.0609 (diffusers convention: z = (latent - shift) * scale). Official repo stabilityai/stable-diffusion-3-medium-diffusers is gated. Non-gated sources:
  (a) diffusers source, scripts/convert_sd3_to_diffusers.py lines 337 to 338 `scaling_factor=1.5305,` `shift_factor=0.0609,` at commit b800f828f3951c4d206e154411bcbfa693cd322e: https://github.com/huggingface/diffusers/blob/b800f828f3951c4d206e154411bcbfa693cd322e/scripts/convert_sd3_to_diffusers.py
  (b) Mirror config: https://huggingface.co/v2ray/stable-diffusion-3-medium-diffusers/blob/d8ed330875e99b78f76dbd1e13f0e2ad117fdf5a/vae/config.json : `"latent_channels": 16`, `"scaling_factor": 1.5305`, `"shift_factor": 0.0609`, `"use_quant_conv": false`, `"use_post_quant_conv": false`, block_out_channels [128, 256, 512, 512] (3 downsamples, f = 8). Same values in ckpt/stable-diffusion-3-medium-diffusers at 17c61f55d12b2a7776e634a0ab6c772bd37a765b. (Third-party mirrors of the gated config.)
  For contrast, the diffusers default for LDM/SD 1.x VAEs: `LDM_VAE_DEFAULT_SCALING_FACTOR = 0.18215` (src/diffusers/loaders/single_file_utils.py line 401, same commit).
- URL: https://arxiv.org/abs/2403.03206v1

### B2. FLUX.1 VAE
- 16 channels, f = 8, scale_factor 0.3611, shift_factor 0.1159. CONFIRMED from two non-Z-Image sources:
  (a) BFL's own reference code, src/flux/util.py (lines 325 to 327 and repeats for each model spec): `z_channels=16,` `scale_factor=0.3611,` `shift_factor=0.1159,` at commit 802fb4713906133fcbd0d8dc5351620ca4773036: https://github.com/black-forest-labs/flux/blob/802fb4713906133fcbd0d8dc5351620ca4773036/src/flux/util.py (vendor source).
  (b) diffusers scripts/convert_flux_to_diffusers.py line 300: `vae = AutoencoderKL.from_config(config, scaling_factor=0.3611, shift_factor=0.1159)` at commit b800f828f3951c4d206e154411bcbfa693cd322e.
  The HF FLUX.1-schnell and FLUX.1-dev repos are click-through gated (API "gated": "auto"), so their vae/config.json could not be fetched anonymously (UNCONFIRMED there).
- BFL also states (FLUX.2 VAE post, B3) that "the FLUX.1 VAE was trained with a 4x larger latent dimensionality and reduced regularization weight" than SD-VAE (4 to 16 channels), because "image-editing applications in FLUX.1 Kontext require high-fidelity reconstructions of inputs".

### B3. FLUX.2 VAE (Black Forest Labs, 2025-11-25; vendor claims throughout)
- Announcement https://bfl.ai/blog/flux-2 (dated November 25, 2025): "FLUX.2 - VAE: A new variational autoencoder for latent representations that provide an optimized trade-off between learnability, quality and compression rate. This model provides the foundation for all FLUX.2 flow backbones". "The FLUX.2 - VAE is available on HF under an Apache 2.0 license" (link goes to huggingface.co/black-forest-labs/FLUX.2-dev). "We re-trained the model's latent space from scratch to achieve better learnability and higher image quality at the same time, a step towards solving the "Learnability-Quality-Compression" trilemma."
- Technical post https://bfl.ai/research/representation-comparison (body is an iframe at https://bfl.ai/techblog/representation-comparison/index.html), "FLUX.2: Analyzing and Enhancing the Latent Space of FLUX – Representation Comparison":
  - Channels: "we follow (Peebles and Xie 2023) and use a 2 × 2 patching for the latent representations of SD, FLUX.1 and FLUX.2 AE ... In this configuration, SD produces 16, FLUX.1 64, FLUX.2 128, and RAE 768 channels per token." So FLUX.2 latent = 32 channels at f = 8 (128 / 4).
  - Config confirms: FLUX.2-klein-4B (Apache-2.0, not gated) vae/config.json at commit e7b7dc27f91deacad38e78976d1f2b499d76a294: `"_class_name": "AutoencoderKLFlux2"`, `"latent_channels": 32`, `"patch_size": [2, 2]`, `"batch_norm_eps": 0.0001`, `"batch_norm_momentum": 0.1`, block_out_channels [128, 256, 512, 512] (f = 8), `"_name_or_path": "black-forest-labs/FLUX.2-dev"`. No scaling_factor/shift_factor keys: normalisation is via a batch-norm on the latents instead (inferred from the batch_norm keys; the config does not explain it). https://huggingface.co/black-forest-labs/FLUX.2-klein-4B/blob/e7b7dc27f91deacad38e78976d1f2b499d76a294/vae/config.json . Also FLUX.2-small-decoder (a3efc24f613ef42d9428af62fdbd6f5fd8856c4a): same encoder, narrower decoder `"decoder_block_out_channels": [96, 192, 384, 384]`.
  - Reconstruction, Table 1 ("Reconstruction metrics of the different autoencoders on the ImageNet validation set. We include the original rFID reported by (Yu et al. 2025) for RAE and SD in parentheses."):

| Model | LPIPS | SSIM | PSNR | rFID |
|---|---|---|---|---|
| RAE | 1.6737 | 0.4962 | 18.8272 | 0.6107 (0.57) |
| SD | 0.9519 | 0.6976 | 25.0520 | 0.6451 (0.62) |
| FLUX.1 | 0.3380 | 0.8893 | 31.1312 | 0.1761 |
| FLUX.2 | 0.2668 | 0.9038 | 31.4632 | 0.1124 |

    (LPIPS values above 1 for RAE mean the column is scaled, probably x10; not stated. Resolution not stated.)
  - Learnability (gFID after flow-matching training, Figure 1 data in page code): FLUX.2 3.70, FLUX.1 10.13, SD 7.73, RAE 3.10. Caption: "While FLUX.1 obtains significant improvements in reconstruction fidelity over the SD AE, it achieves this at the cost of worse learnability. On the other extreme, RAE demonstrates excellent learnability properties but has to trade this improvement for degraded reconstruction capabilities. In contrast, FLUX.2 shows improved learnability over FLUX.1 and SD while simultaneously improving reconstruction capabilities over all of the three other AEs."
  - "we see that REPA consistently improves the performance for all representations."
  - Limitation: "While the FLUX.2 VAE exhibits strong performance in both reconstruction quality and learnability, VAEs that sacrifice reconstruction quality continue to be more learnable."
  - Post oddity: "RepTok reports an even lower rFID of 1.85 compared to RAE's 0.57" (1.85 is a worse, higher rFID; wording is off).
  - How the FLUX.2 VAE was trained differently (e.g. semantic alignment loss): NOT stated in the text I could read (UNCONFIRMED).

### B4. DC-AE, Deep Compression Autoencoder (Chen et al. 2024, ICLR 2025), arXiv 2410.10733v8
- Naming: fXcY = spatial downsample X, Y latent channels. f32c32 (256px -> 8x8x32), f64c128 (512px -> 8x8x128), f128c512.
- Two techniques: "(1) Residual Autoencoding, where we design our models to learn residuals based on the space-to-channel transformed features to alleviate the optimization difficulty of high spatial-compression autoencoders; (2) Decoupled High-Resolution Adaptation, an efficient decoupled three-phase training strategy for mitigating the generalization penalty of high spatial-compression autoencoders."
- Speedup claim (vendor): "on ImageNet 512 × 512, our DC-AE provides 19.1× inference speedup and 17.9× training speedup on H100 GPU for UViT-H while achieving a better FID, compared with the widely used SD-VAE-f8 autoencoder."
- Motivation: "rFID (reconstruction FID) degrades from 0.90 to 28.3 if switching from f8 to f64" (SD-VAE design, ImageNet 256).
- Table 2 ("Image Reconstruction Results"; SD-VAE rows are the SD-VAE design trained at the same latent shape):

| Data | Config | Latent | SD-VAE rFID / PSNR | DC-AE rFID / PSNR / SSIM / LPIPS |
|---|---|---|---|---|
| ImageNet 256 | f32c32 | 8x8x32 | 2.64 / 22.13 | 0.69 / 23.85 / 0.66 / 0.082 |
| ImageNet 256 | f64c128 | 4x4x128 | 26.65 / 18.07 | 0.81 / 23.60 / 0.65 / 0.087 |
| ImageNet 512 | f64c128 | 8x8x128 | 16.84 / 19.49 | 0.22 / 26.15 / 0.71 / 0.080 |
| ImageNet 512 | f128c512 | 4x4x512 | 100.74 / 15.90 | 0.23 / 25.73 / 0.70 / 0.084 |
| FFHQ 1024 | f64c128 | 16x16x128 | 6.62 / 24.55 | 0.23 / 31.04 / 0.83 / 0.061 |
| FFHQ 1024 | f128c512 | 8x8x512 | 179.71 / 18.11 | 0.41 / 31.18 / 0.83 / 0.062 |

  Quote: "on ImageNet 512 × 512, DC-AE improves the rFID from 16.84 to 0.22 for the f64c128 autoencoder and 100.74 to 0.23 for the f128c512 autoencoder."
- URL: https://arxiv.org/abs/2410.10733v8

### B5. SDXL (Podell et al. 2023), arXiv 2307.01952v1
- Same architecture as SD 1.x VAE (4 channels, f = 8), trained from scratch with batch 256 (vs 9) and EMA weights.
- Quote (Sec 2.4): "we train the same autoencoder architecture used for the original Stable Diffusion at a larger batch-size (256 vs 9) and additionally track the weights with an exponential moving average. The resulting autoencoder outperforms the original model in all evaluated reconstruction metrics, see Tab. 3." Caption: "Table 3: Autoencoder reconstruction performance on the COCO2017 [26] validation split, images of size 256 × 256 pixels. Note: Stable Diffusion 2.x uses an improved version of Stable Diffusion 1.x's autoencoder, where the decoder was finetuned with a reduced weight on the perceptual loss [55], and used more compute. Note that our new autoencoder is trained from scratch."

| model | PSNR ("PNSR" in paper) | SSIM | LPIPS | rFID |
|---|---|---|---|---|
| SDXL-VAE | 24.7 | 0.73 | 0.88 | 4.4 |
| SD-VAE 1.x | 23.4 | 0.69 | 0.96 | 5.0 |
| SD-VAE 2.x | 24.5 | 0.71 | 0.92 | 4.7 |

  LPIPS values near 0.9 are far above what others measure for SD-class f8 VAEs (DC-AE Table 2 and IBQ Table 1 report LPIPS around 0.08 to 0.23 for comparable tokenizers); the column is likely scaled x10 or a different variant; the paper does not say (flag). The header typo "PNSR" is in the paper.
- Configs (ungated, pinned): stabilityai/sdxl-vae at 6f5909a7e596173e25d4e97b07fd19cdf9611c76: `"latent_channels": 4`, `"scaling_factor": 0.13025`. stabilityai/sd-vae-ft-mse at 31f26fdeee1355a5c34592e401dd41e45d25a493: `"latent_channels": 4`, no scaling_factor key (so the diffusers default 0.18215 applies).
- URL: https://arxiv.org/abs/2307.01952v1

### B6. LDM (Rombach et al. 2022), arXiv 2112.10752v2
- Table 8: "Complete autoencoder zoo trained on OpenImages, evaluated on ImageNet-Val. † denotes an attention-free autoencoder." Columns f, |Z|, c, R-FID, R-IS, PSNR, PSIM, SSIM. Selected rows (R-FID / PSNR):
  - VQ: f32 |Z| 16384 c16: 31.83 / 17.45; f16 16384 c8: 5.15 / 20.83; f8 16384 c4: 1.14 / 23.07; f8 256 c4: 1.49 / 22.35; f4 8192 c3: 0.58 / 27.43; f4† 8192 c3: 1.06 / 25.21; f4 256 c3: 0.47 / 26.43; f2 2048 c2: 0.16 / 30.85.
  - KL: f32 c64: 2.04 / 22.27; f32 c16: 7.3 / 20.38; f16 c16: 0.87 / 24.08; f16 c8: 2.63 / 21.94; f8 c4: 0.90 / 24.19 (the SD-style config); f4 c3: 0.27 / 27.53; f2 c2: 0.086 / 32.47.
  - Baselines in the same table (not trained on OpenImages despite the caption): VQGAN f16 16384: 4.98 / 19.9; VQGAN f16 1024: 7.94 / 19.4; DALL-E f8 8192: 32.01 / 22.8.
- Figure 1 inset: "ours (f = 4) PSNR: 27.4 R-FID: 0.58; DALL-E (f = 8) PSNR: 22.8 R-FID: 32.01; VQGAN (f = 16) PSNR: 19.9 R-FID: 4.98", caption "Reconstruction FIDs [29] and PSNR are calculated on ImageNet-val."
- URL: https://arxiv.org/abs/2112.10752v2

### B7. Qwen-Image (Qwen Team 2025), arXiv 2508.02324v1 (arXiv HTML)
- VAE: Wan-2.1-VAE architecture, single encoder and two decoders (image, video); encoder frozen, only image decoder fine-tuned on text-rich images. All compared VAEs f = 8 with 16 latent channels.
- Quotes: "we adopt the architecture of Wan-2.1-VAE, freeze its encoder, and exclusively fine-tune the image decoder." "To enhance reconstruction fidelity, particularly for small texts and fine-grained details, we train the decoder on an in-house corpus of text-rich images. The dataset consists of real-world documents (PDFs, PowerPoint slides, posters) alongside synthetic paragraphs". "(2) As reconstruction quality increases, adversarial loss becomes ineffective because the discriminator is unable to provide effective guidance. Based on these observations, we use only reconstruction and perceptual losses". "All compared VAEs operate at an 8x8 compression rate using a latent channel dimension of 16." Evaluation "on the ImageNet-1k ... validation set at 256x256 resolution" plus "an in-house text-rich corpus"; "we evaluate tokenizers using float32."
- Table 2 ("Quantitative Evaluation results of VAE"); params enc/dec, image params enc/dec, ImageNet 256 PSNR/SSIM, Text 256 PSNR/SSIM:

| Model | Params | Image params | ImageNet PSNR / SSIM | Text PSNR / SSIM |
|---|---|---|---|---|
| Wan2.1-VAE | 54M / 73M | 19M / 25M | 31.29 / 0.8870 | 26.77 / 0.9386 |
| Hunyuan-VAE | 100M / 146M | 34M / 50M | 33.21 / 0.9143 | 32.83 / 0.9773 |
| FLUX-VAE | 34M / 50M | 34M / 50M | 32.84 / 0.9155 | 32.65 / 0.9792 |
| Cosmos-CI-VAE | 31M / 46M | 31M / 46M | 32.23 / 0.9010 | 30.62 / 0.9664 |
| SD-3.5-VAE | 34M / 50M | 34M / 50M | 31.22 / 0.8839 | 29.93 / 0.9658 |
| Qwen-Image-VAE | 54M / 73M | 19M / 25M | 33.42 / 0.9159 | 36.63 / 0.9839 |

  Vendor measurement. Biggest gain is on text (36.63 vs 26.77 for the Wan2.1 decoder it started from). No rFID reported.
- URL: https://arxiv.org/abs/2508.02324v1 (html https://arxiv.org/html/2508.02324v1)

### B8. VA-VAE, "Reconstruction vs. Generation: Taming Optimization Dilemma in Latent Diffusion Models" (Yao et al. 2025), arXiv 2501.01423v3
- Claim (abstract): "while increasing the per-token feature dimension in visual tokenizers improves reconstruction quality, it requires substantially larger diffusion models and more training iterations to achieve comparable generation performance." Fix: align the latents with a frozen vision foundation model (VF loss, DINOv2) during VAE training.
- Table 2 ("VF loss Improves Generation Performance"; ImageNet 256, generation FID-10K with LightningDiT), plain LDM VAE rows, rFID / PSNR / LPIPS / SSIM, then gFID B / L / XL:
  - f16d16: 0.49 / 26.10 / 0.132 / 0.72; 16.24 / 9.49 / 8.28
  - f16d32: 0.26 / 28.59 / 0.089 / 0.80; 22.62 / 12.86 / 10.92
  - f16d64: 0.17 / 31.03 / 0.055 / 0.88; 36.83 / 20.73 / 17.24
  - with VF loss (DINOv2): f16d32: 0.28 rFID; gFID 15.82 / 9.82 / 8.22. f16d64: 0.14; 24.00 / 14.95 / 11.98.
  Caption: "As dimensionality increases, we observe that (1) higher dimensions improve reconstruction but reduce generation quality, highlighting an optimization dilemma within the latent diffusion framework; (2) VF Loss significantly enhances generative performance in high-dimensional tokenizers with minimal impact on reconstruction."
- FIGURE VS TABLE: Figure 1 shows "f16d16 rFID=0.49 gFID=20.3; f16d32 rFID=0.29 gFID=28.7; f16d64 rFID=0.18 gFID=45.8" and "VAE (f16d32) rFID=0.43 gFID=21.20 ... VA-VAE (f16d32) rFID=0.27 gFID=16.53". These do not match Table 2 exactly (different training setting for the figure); use Table 2 for a clean comparison.
- Headline (vendor): "state-of-the-art (SOTA) performance on ImageNet 256×256 generation with an FID score of 1.35" and "an FID score of 2.11 in just 64 epochs".
- URL: https://arxiv.org/abs/2501.01423v3

## C. VAE training lore

### C1. Bowman et al. 2016, "Generating Sentences from a Continuous Space", arXiv 1511.06349v4
- Collapse: "This causes the model to initially learn to ignore z and go after low hanging fruit, explaining the data with the more easily optimized decoder. Once this has happened, the decoder ignores the encoder and little to no gradient signal passes between the two, yielding an undesirable stable equilibrium with the kl cost term at zero. We propose two techniques to mitigate this issue."
- KL annealing: "KL cost annealing In this simple approach to this problem, we add a variable weight to the kl term in the cost function at training time. At the start of training, we set that weight to zero, so that the model learns to encode as much information in z as it can. Then, as training progresses, we gradually increase this weight, forcing the model to smooth out its encodings and pack them into the prior. We increase this weight until it reaches 1, at which point the weighted cost function is equivalent to the true variational lower bound." "This can be thought of as annealing from a vanilla autoencoder to a vae." (Figure 2 uses a sigmoid schedule.)
- Word dropout: "We do this by randomly replacing some fraction of the conditioned-on word tokens with the generic unknown word token unk. This forces the model to rely on the latent variable z to make good predictions." "This technique is parameterized by a keep rate k ∈ [0, 1]."
- URL: https://arxiv.org/abs/1511.06349v4

### C2. Kingma et al. 2016, IAF, arXiv 1606.04934v2, Appendix C.8 "Objective with Free Bits"
- Quote: "We divide the latent dimensions into the K groups/subsets within which parameters are shared (e.g. the latent feature maps, or individual dimensions if no parameter are shared across dimensions). We then use the following objective, which ensures that using less than λ nats of information per subset j (on average per minibatch M) is not advantageous:"
  L̃λ = E_{x∼M} E_{q(z|x)} [log p(x|z)] − Σ_{j=1}^{K} maximum(λ, E_{x∼M} [D_KL(q(z_j|x) || p(z_j))])   (Eq. 15)
- "We experimented with λ ∈ [0, 0.125, 0.25, 0.5, 1, 2, 4, 8] and found that values in the range λ ∈ [0.125, 0.25, 0.5, 1, 2] resulted in more than 0.1 nats improvement in bits/pixel on the CIFAR-10 benchmark."
- Motivation in the same section: "At the start of training, the likelihood term log p(x|z) is relatively weak, such that an initially attractive state is where q(z|x) ≈ p(z)."
- URL: https://arxiv.org/abs/1606.04934v2

### C3. Chen et al. 2017, Variational Lossy Autoencoder, arXiv 1611.02731v2
- Quote: "Here we present a simple but often-neglected observation that this phenomenon arises not just due to optimization challenges and instead even if we can solve the optimization problems exactly, the latent code should still be ignored at optimum for most practical instances of VAE that have intractable true posterior distributions and sufficiently powerful decoders. It is easiest to understand this observation from a Bits-Back Coding perspective of VAE."
- And: "if the p(x|z) could model pdata(x) without using information from z, then it will not use z, in which case the true posterior p(z|x) is simply the prior p(z) and it's usually easy to set q(z|x) to be p(z) to avoid incurring an extra cost DKL(q(z|x)||p(z|x)). And it's exactly the case when a powerful decoding distribution is used like an RNN autoregressive distribution".
- They also used free bits: "0.01 nats/data-dim free bits (Kingma et al., 2016) was found to be effective in dealing with the problem of all the latent code being ignored early in training."
- URL: https://arxiv.org/abs/1611.02731v2

### C4. delta-VAE and lagging inference networks
- Razavi et al. 2019, "Preventing Posterior Collapse with delta-VAEs", arXiv 1901.03416v1: "Our proposed δ-VAEs achieve this by constraining the variational family for the posterior to have a minimum distance to the prior." URL: https://arxiv.org/abs/1901.03416v1
- He et al. 2019, "Lagging Inference Networks and Posterior Collapse in Variational Autoencoders", arXiv 1901.05534v2: "We find that during the initial stages of training the inference network fails to approximate the model's true posterior, which is a moving target. As a result, the model is encouraged to ignore the latent encoding and posterior collapse occurs." Fix: "we aggressively optimize the inference network before performing each model update." URL: https://arxiv.org/abs/1901.05534v2

### C5. beta-VAE (beta > 1)
- Original: Higgins et al., ICLR 2017, https://openreview.net/forum?id=Sy2fzU9gl (not on arXiv; OpenReview blocked automated fetch behind a browser check, so the original wording is UNCONFIRMED here).
- Verbatim from the follow-up by the same group, Burgess et al. 2018, "Understanding disentangling in β-VAE", arXiv 1804.03599v1: "β-VAE is a modification of the variational autoencoder (VAE) framework [22, 33] that introduces an adjustable hyperparameter β to the original VAE objective: L(θ, φ; x, z, β) = E_qφ(z|x)[log pθ(x|z)] − β DKL(qφ(z|x) || p(z)) (5). Well chosen values of β (usually β > 1) result in more disentangled latent representations z. When β = 1, the β-VAE becomes equivalent to the original VAE framework." URL: https://arxiv.org/abs/1804.03599v1
- Note for the page: image-generator VAEs (SD, FLUX) go the other way, with a tiny KL weight (beta << 1; LDM 2112.10752v2 Sec 3: "The first variant, KL-reg., imposes a slight KL-penalty towards a standard normal on the learned latent"; Appendix G: "To obtain high-fidelity reconstructions we only use a very small regularization for both scenarios, i.e. we either weight the KL term by a factor ∼ 10−6 or choose a high codebook dimensionality |Z|."). DALL-E dVAE used β = 6.6 on a per-pixel-normalised loss (A2).

### C6. Blau and Michaeli 2018, "The Perception-Distortion Tradeoff", arXiv 1711.06077v4
- Quote (abstract): "we prove mathematically that distortion and perceptual quality are at odds with each other. Specifically, we study the optimal probability for correctly discriminating the outputs of an image restoration algorithm from real images. We show that as the mean distortion decreases, this probability must increase (indicating worse perceptual quality). As opposed to the common belief, this result holds true for any distortion measure, and is not only a problem of the PSNR or SSIM criteria. We also show that generative-adversarial-nets (GANs) provide a principled way to approach the perception-distortion bound."
- URL: https://arxiv.org/abs/1711.06077v4

### C7. LPIPS (Zhang et al. 2018), arXiv 1801.03924v2
- What it is: deep features from a pretrained net (SqueezeNet, AlexNet, VGG), unit-normalised per channel, scaled per channel by learned weights, squared L2, averaged spatially, summed over layers. Quote: "We extract feature stack from L layers and unit-normalize in the channel dimension ... We scale the activations channelwise by vector wl ∈ R^Cl and compute the l2 distance. Finally, we average spatially and sum channel-wise. Note that using wl = 1 ∀l is equivalent to computing cosine distance."
- Linear calibration: "For the lin configuration, we keep pre-trained network weights F fixed, and learn linear weights w on top. This constitutes a "perceptual calibration" of a few parameters in an existing feature space." Variants lin, tune, scratch: "Overall, we refer to these as variants of our proposed Learned Perceptual Image Patch Similarity (LPIPS) metric."
- Dataset (BAPPS): "a large-scale, highly varied, perceptual similarity dataset, containing 484k human judgments"; 2AFC (two-alternative forced choice) on 64 × 64 patches, plus JND (same/not same).
- Repo README (richzhang/PerceptualSimilarity, master, checked 2026-10-17): "By default, net='alex'. Network alex is fastest, performs the best (as a forward metric), and is the default." "For backpropping, net='vgg' loss is closer to the traditional "perceptual loss"." "The current version is 0.1." (branch not pinned to a commit.)
- URL: https://arxiv.org/abs/1801.03924v2

### C8. rFID as used in tokenizer papers
- LlamaGen (2406.06525v1): "The image reconstruction quality is measured by r-FID, reconstruction-FID on 256×256 ImageNet 50k validation set."
- RQ-VAE (2203.01941v2): "We measure the rFID, which is FID between original images and reconstructed images, on ImageNet validation data."
- VQGAN (2012.09841v3) Table 5 caption: "FID on ImageNet between reconstructed validation split and original validation (FID/val) and training (FID/train) splits."
- Caveat: not all papers use val vs val. FSQ (2309.15505v2) uses "the well established ADM TensorFlow Suite ..., which computes FID from 50k reconstructions w.r.t. the training set." So rFID across papers is not always comparable (also resolution, resize, and FID implementation differ; Cosmos Table 8 re-measures LlamaGen f16 at 1.657 vs LlamaGen's own 2.19).

### C9. VQ-VAE EMA codebook update, arXiv 1711.00937v2 Appendix A.1
- Quote: "As mentioned in Section 3.2, one can also use exponential moving averages (EMA) to update the dictionary items instead of the loss term from Equation 3". "The optimal value for ei has a closed form solution, which is simply the average of elements in the set ... This update is typically used in algorithms such as K-Means. However, we cannot use this update directly when working with minibatches. Instead we can use exponential moving averages as an online version of this update:" N_i(t) := N_i(t−1) γ + n_i(t)(1 − γ); m_i(t) := m_i(t−1) γ + Σ_j z_i,j(t)(1 − γ); e_i(t) := m_i(t) / N_i(t), "with γ a value between 0 and 1. We found γ = 0.99 to work well in practice."
- VQ-VAE-2 (1906.00446v1) uses EMA too: "As proposed in [37], we use the exponential moving average updates for the codebook, as a replacement for the codebook loss". Commitment β = 0.25 (VQ-VAE-2 Table 5; also ViT-VQGAN "β ... set to 0.25 in all our experiments").

### C10. sdxl-vae-fp16-fix (madebyollin), HF card at commit 207b116dae70ace3637169f1ddd2434b91b3a8cd
- Quote: "SDXL-VAE-FP16-Fix is the SDXL VAE*, but modified to run in fp16 precision without generating NaNs." "SDXL-VAE generates NaNs in fp16 because the internal activation values are too big". "SDXL-VAE-FP16-Fix was created by finetuning the SDXL-VAE to: 1. keep the final output the same, but 2. make the internal activation values smaller, by 3. scaling down weights and biases within the network". "There are slight discrepancies between the output of SDXL-VAE-FP16-Fix and SDXL-VAE, but the decoded images should be close enough for most purposes."
- Config at same commit: `"scaling_factor": 0.13025`, `"force_upcast": false` (the original stabilityai/sdxl-vae config keeps scaling_factor 0.13025). License MIT. Independent (community) fix, not Stability.
- URL: https://huggingface.co/madebyollin/sdxl-vae-fp16-fix/blob/207b116dae70ace3637169f1ddd2434b91b3a8cd/README.md

## Flags summary (text vs table, oddities)
- LlamaGen: abstract "0.94 rFID" is the 384px/576-token setting; text "2.43 to 0.99" vs Table 3 "2.19 to 0.94".
- VA-VAE: Figure 1 numbers differ from Table 2.
- IBQ: Table 3 "262,122" vs Table 1 "262,144".
- Cosmos Table 8: "Tokenize1-DI" rows labelled "AE" quantization.
- SDXL Table 3 and SD3 Table 3 LPIPS-like columns look scaled (values near 0.5 to 0.96); FLUX.2 post LPIPS up to 1.67 is also scaled. Not explained by the authors.
- VQGAN Table 5 column "Codebook Size" is really the latent grid; "dim Z" is the number of codes. DALL-E rFID 32.01 (VQGAN, LDM) vs 32.00 (ViT-VQGAN).
- FLUX.2 post: "RepTok reports an even lower rFID of 1.85 compared to RAE's 0.57" (1.85 is worse).
- MaskGIT's own tokenizer rFID (2.28) appears only in later papers (TiTok, LlamaGen, IBQ), not in MaskGIT.
