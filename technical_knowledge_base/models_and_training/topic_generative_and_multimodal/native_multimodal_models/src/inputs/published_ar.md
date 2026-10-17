# Published facts: autoregressive and masked image generation over tokens

Checked 2026-10-17 against the arXiv versions named below (fetched through a page-to-text tool that caps verbatim quotes at about 125 characters, so long sentences are quoted as excerpts and the rest is marked "paraphrase"). Every number here is the authors' own (vendor) unless stated otherwise; none of these papers report independent measurements of themselves. Values read from tables are given as table values, not quotes.

---

## 1. DALL-E (Ramesh et al. 2021), arXiv 2102.12092 (latest v2, 26 Feb 2021)

Source: https://ar5iv.labs.arxiv.org/html/2102.12092 (ar5iv renders the latest version)

- Model size 12B: "training a 12-billion parameter autoregressive transformer on 250 million image-text pairs collected from the internet" (v2, Section 1). Vendor.
- 256 text tokens + 1024 image tokens: "We concatenate up to 256 BPE-encoded text tokens with the 32×32=1024 image tokens" (v2, Section 2). Vendor.
- Sequence layout (one stream, text first): "Finally, the text and image tokens are concatenated and modeled autoregressively as a single stream of data." (v2, Section 2.2). Text tokens precede image tokens per the "concatenate ... text tokens with the ... image tokens" sentence above.
- dVAE codebook 8192: "each element of which can assume 8192 possible values" (v2, Section 2.1, the 32x32 grid of image tokens).
- Reranking: "we rerank the samples drawn from the transformer using a pretrained contrastive model" (v2, Section 2.6).
- How many samples: "use reranking with N=512" and "without temperature reduction (i.e., using t=1)" (v2, Section 2.6); "Each of our model samples is the best of 512 as ranked by the contrastive model." (v2, Figure 3 caption). Top 1 of 512 is shown in Figure 3; the paper text does not give a general "keep top-k" number.
- CLIP naming: the paper calls the reranker a "pretrained contrastive model" and cites Radford et al. 2021 (the CLIP paper); the word "CLIP" itself was not found in the fetched text. So "reranked with CLIP" is accurate in substance but is not the paper's wording.
- Effect of N: "Effect of increasing the number of images for the contrastive reranking procedure on MS-COCO captions." (v2, Figure 6 caption).
- Zero-shot MS-COCO: FID "within 2 points of the best prior approach" (v2, Section 3.1). Vendor.
- Human eval vs DM-GAN: "90.0% of the time" (v2, Figure 7 caption); body text says "90% of the time" (Section 3.1). Same number, rounding only. Vendor (their own human study).

---

## 2. Parti (Yu et al. 2022), arXiv 2206.10789 (only v1, 22 Jun 2022)

Source: https://ar5iv.labs.arxiv.org/html/2206.10789

- Sizes: "We train four size variants ranging from 350 million to 20 billion parameters, as detailed in Table 1." (v1, Section 2.2). Table 1 sizes: 350M, 750M, 3B, 20B. The 20B model: 16 encoder layers, 64 decoder layers (v1, Table 1, table values).
- Encoder-decoder: "a standard encoder-decoder Transformer model is trained at the second stage" (v1, Section 2.2).
- Tokenizer: ViT-VQGAN; "learn 8192 image token classes for the codebook" (v1, Section 2.1); "We use 256×256 resolution for the image tokenizer's input and output." (Section 2.1); "the length of image tokens are fixed to 1024" (Section 2.2).
- Headline FID: "a new state-of-the-art zero-shot FID score of 7.23 and finetuned FID score of 3.22 on MS-COCO." (v1, Abstract). Vendor.
- Table 5 row (table values, 20B only): Parti, Autoregressive, MS-COCO zero-shot 7.23, MS-COCO finetuned 3.22, LN-COCO zero-shot 15.97, LN-COCO finetuned 8.39 (v1, Table 5).
- Zero-shot MS-COCO FID by size (table values inside Figure 9, "MS-COCO (zero-shot)"): 350M 14.10, 750M 10.71, 3B 8.10, 20B 7.23 (v1, Figure 9).
- **Text vs table disagreement:** Section 5.3: "For LN-COCO, Parti achieves a finetuned FID score of 8.29." Table 5 and the Introduction give 8.39. Use 8.39 (table) and note the typo if citing LN-COCO.
- Classifier-free guidance scale: "we use guidance scale 1.2 for all above results" (v1, Table 5 caption).
- Reranking: "we sample just 16 images per text prompt for the experiments reported in this paper." and "We rerank each output set based on the alignment score of image and text embedding" (v1, Section 2.4, "Classifier-Free Guidance and Reranking"); the reranker is "a Contrastive Captioners model (CoCa)" (Section 2.4). Appendix C, Figure 24 caption repeats: "Parti model samples 16 images per text prompt and uses a CoCa model".
- Top-k / temperature: UNCONFIRMED. Neither "top-k" nor "temperature" was found in the fetched text (both halves of the page were searched).

---

## 3. LlamaGen (Sun et al. 2024), arXiv 2406.06525 (only v1, 10 Jun 2024)

Source: https://arxiv.org/html/2406.06525v1

- Sizes: "ranging from 111M to 3.1B parameters" (v1, Abstract). Table 1 (table values): B 111M (12 layers, width 768), L 343M (24, 1024), XL 775M (36, 1280), XXL 1.4B (48, 1536), 3B 3.1B (24, 3200).
- Headline FID: "achieving 2.18 FID on ImageNet 256x256 benchmarks" (v1, Abstract). Vendor.
- Best FID with CFG (Table 6, table values): LlamaGen-3B (cfg=1.65), 3.1B, FID 2.18, IS 263.33, Precision 0.81, Recall 0.58. Other rows: LlamaGen-3B (cfg=1.75) FID 2.32, IS 280.10; LlamaGen-3B (cfg=2.00) FID 2.81, IS 311.59; LlamaGen-XXL (cfg=1.75) 1.4B FID 2.34, IS 253.90.
- Resolution caveat: Table 10 caption (paraphrase) says images were generated at 384×384 and resized to 256×256 for evaluation, with top-k=0 (all), top-p=1.0, temperature=1.0. So the 2.18 headline is a 384-generation result evaluated at 256.
- Best FID without CFG (Table 10, table values): LlamaGen-3B, 300 epochs, no CFG, FID 9.380. Same run with cfg 1.65: FID 2.189 (Table 6 rounds this to 2.18, not 2.19). Minor rounding note: 2.189 rounds to 2.19, the paper reports 2.18 (truncated).
- CFG formula on logits (v1, Section 2.3, "Classifier-free guidance"): ℓg = ℓu + s(ℓc − ℓu), with ℓc the conditional logit, ℓu the unconditional logit and s the guidance scale. Training randomly drops the condition and replaces it with a null unconditional embedding (paraphrase).
- Class embedding as first token: the class embedding "is used as the prefilling token embedding" (v1, Section 2.3, "Class-conditional image generation"). Paraphrase of the rest of the paragraph: the class label indexes a learnable embedding, which is the first token; image tokens are then generated next-token style to a fixed length.
- Default sampling: "Since FID is our main metric, we use maximum value as the default top-k value, which is the whole codebook size." (v1, Section 3.2, "Effect of top-k sampling"). Defaults top-k=0 (all), top-p=1.0, temperature=1.0, cfg=2.0 (v1, Figure 3 caption, table/caption values).
- CFG scale used: 2.0 by default in ablations (Figure 3); Table 6 best entries use 2.00 (B, L), 1.75 (XL, XXL), 1.65 (3B); Table 5 comparisons use 1.75.
- Tokenizer: codebook 16384, downsample 16 (v1, Section 3.1). rFID 0.94 is at 384×384 input (576 tokens); at 256×256 (256 tokens) rFID is 2.19 (v1, Table 3, table values).
- Speed with LLM serving: "achieve 326% - 414% speedup" (v1, Abstract; the abstract says "LLM serving frameworks", Table 7 names vLLM).
- Table 7 (table values; seconds for a batch of 16 images at 384×384, of which 8 are the CFG unconditional pass, per caption paraphrase; vLLM): B 111M 7.80 s -> 2.39 s (326%); L 343M 13.72 -> 3.48 (380%); XL 775M 19.76 -> 4.84 (408%); XXL 1.4B 26.38 -> 6.36 (414%). The 3B model is absent because its head size (100) is not supported by vLLM's PagedAttention (paraphrase). Vendor. Note the "speedup %" column equals baseline/vLLM time as a percentage (7.80/2.39 = 3.26x), i.e. "326%" means 3.26x faster, not 4.26x.

---

## 4. MaskGIT (Chang et al. 2022), arXiv 2202.04200 (only v1, 8 Feb 2022)

Source: https://ar5iv.labs.arxiv.org/html/2202.04200

- 8 decoding iterations: "MaskGIT finishes its decoding in 8 iterations compared to the 256 rounds the sequential method takes." (v1, Figure 2 caption); the example "generates an image in T=8 iterations" (Section 3.2). Table 1 "# steps": 8 at 256×256, 12 at 512×512 (table values).
- Mask schedule: "We model the masking procedure by a mask scheduling function" (v1, Section 3.3); "find the cosine function works the best in all of our experiments" (Section 3.3); cosine "slightly edges out square in all scores, making cosine the default in our model" (Section 4.4). Table 3: cosine FID 6.06 at T=10 (table value, ablation). The explicit formula (gamma(r) = cos(pi r / 2)) was UNCONFIRMED in the fetched text; the schedules appear as curves in Figure 8.
- Tokens: codebook of 1024 tokens and 16x downsampling (v1, Section 4.1, paraphrase), which implies a 16×16 = 256-token grid at 256×256 (our arithmetic; matches the "256 rounds" in Figure 2).
- ImageNet 256×256, Table 1 (table values): MaskGIT FID 6.18, IS 182.1, 8 steps. VQGAN (as reported in its own paper) FID 15.78, IS 78.3, 256 steps. VQGAN* (retrained by the MaskGIT authors) FID 18.65, IS 80.4, 256 steps.
- ImageNet 512×512, Table 1 (table values): MaskGIT FID 7.32, IS 156.0, 12 steps; VQGAN* FID 26.52, IS 66.8, 1024 steps.
- Speed-up: "accelerates autoregressive decoding by up to 64x" (v1, Abstract); "MaskGIT significantly accelerates VQGAN by 30-64x" (v1, Section 4.2), the gain growing with token length; Figure 4 is a "Transformer wall-clock runtime comparison between VQGAN" and MaskGIT on a single GPU (caption, paraphrase for the GPU part). Vendor. The baseline is their own VQGAN reimplementation, and the timing is transformer only.
- Independence note: VAR (item 6) later quotes the 18.65 VQGAN number from MaskGIT, so "18.65" in VAR is MaskGIT's retrained baseline, not a new measurement.

---

## 5. Muse (Chang et al. 2023), arXiv 2301.00704 (only v1, 2 Jan 2023)

Source: https://ar5iv.labs.arxiv.org/html/2301.00704

- Efficiency vs autoregressive: "compared to autoregressive models, such as Parti, Muse is more efficient due to the use of parallel decoding" (v1, Abstract). Vs diffusion: "significantly more efficient due to the use of discrete tokens and requiring fewer sampling iterations" (Abstract).
- Decoding steps: "perform inference of 256 tokens using only 24 decoding steps in our base model" (v1, Section 2.8); the super-resolution model uses 8 steps for 4096 tokens (Section 2.8, paraphrase).
- Per-image time: each Figure 1 image "was generated in 1.3s on a TPUv4 chip" (v1, Figure 1 caption).
- Table 3 (table values, per image): Muse-3B 0.5 s at 256×256, 1.3 s at 512×512; Imagen 9.1 s at 256, 13.3 s at 1024; LDM (Stable Diffusion) 3.7 s at 512 (50 steps), 18.5 s (250 steps); Parti-3B 6.4 s at 256. Caption: "Muse, Imagen, and Parti were benchmarked internally on TPUv4 hardware." and "Stable Diffusion/LDM benchmark from ... on A100 GPUs." So the LDM timings are borrowed from another source on different hardware; all others are vendor-measured by the Muse team (Parti and Imagen are Google models, measured internally, not independent).
- FID: "achieves an FID of 7.88 on zero-shot COCO evaluation, along with a CLIP score of 0.32" for the 3B model; the "900M parameter model" sets a state-of-the-art FID of 6.06 on CC3M (v1, Abstract; Table 1 for 6.06). Vendor.
- Sizes: base 632M + super-resolution 268M = about 900M (paraphrase, Section 3 / tables); largest base model 3B. Text encoder: "pre-trained and frozen T5-XXL" with "an additional 4.6B parameters" (Section 1).
- **Text inconsistency:** "For the two text-to-image models, we compared Muse (33B parameters) to that of Stable Diffusion v1.4" (v1, Section 3.2.1). Everywhere else the model is 3B; "33B" is a typo.

---

## 6. VAR (Tian et al. 2024), arXiv 2404.02905 (latest v2, 10 Jun 2024)

Source: https://arxiv.org/html/2404.02905v2

- Next-scale prediction: "coarse-to-fine 'next-scale prediction' or 'next-resolution prediction'" (v2, Abstract); "the autoregressive unit is an entire token map, rather than a single token" (v2, Section 3.2).
- Headline: "improving Frechet inception distance (FID) from 18.65 to 1.73", "inception score (IS) from 80.4 to 350.2", "with around 20x faster inference speed" (v2, Abstract). Vendor. The 18.65 / 80.4 baseline is MaskGIT's retrained VQGAN* (Table 1 marks it "VQGAN†", quoted from MaskGIT).
- Table 1, ImageNet 256×256 (table values; "Wall-clock inference time relative to VAR is reported."): VAR-d30 FID 1.92, IS 323.1, 10 steps, 2.0B params, time 1; VAR-d30-re (rejection sampling) FID 1.73, IS 350.2, 10 steps, time 1; DiT-XL/2 FID 2.27, IS 278.2, 250 steps, 675M, time 45; VQGAN† FID 18.65, time 19; VQGAN FID 15.78, time 24; VQGAN-re FID 5.20, time 24; RQTran. FID 7.55, time 21; RQTran.-re FID 3.80, time 21.
- Note: the headline 1.73 uses rejection sampling ("-re"); without it the best is 1.92.
- "20x" baseline: "VAR is around 20 times faster than VQGAN and ViT-VQGAN" (v2, Section 5.1). Not measured against DiT in the 20x claim (DiT is 45x slower per Table 1, a vendor measurement).
- LlamaGen comparison: UNCONFIRMED; no LlamaGen rows found in v2 Table 1 (LlamaGen appeared the same week).
- Tokenizer: "a shared codebook for all scales with V=4096" (v2, Section 4).
- 10 scales: Table 1 lists 10 steps for VAR models (table value). The concrete scale list (1, 2, 3, 4, 5, 6, 8, 10, 13, 16) is UNCONFIRMED in the paper text (not found in v2 HTML; it lives in the released code). Appendix B only says "Suppose nk=hk=wk for all 1≤k≤K".

---

## 7. MAR (Li et al. 2024), "Autoregressive Image Generation without Vector Quantization", arXiv 2406.11838 (latest v3, 1 Nov 2024)

Source: https://arxiv.org/html/2406.11838v3

- Diffusion loss: "Rather than using categorical cross-entropy loss, we define a Diffusion Loss function to model the per-token probability." (v3, Abstract); "We refer to this loss function as Diffusion Loss." (Section 1). Section 3.2, Eq. 1 (paraphrase): expected squared error between true noise and the noise predicted by a small denoising network conditioned on the timestep and the transformer's output vector z for that token.
- Denoising MLP: "By default, we use 3 blocks and a width of 1024 channels." (v3, Section 4.1); about 21M parameters (Section 5.1, paraphrase).
- Steps: "By default, we use 64 steps in this schedule." (autoregressive / masked steps, Section 4.2); diffusion sampler "(by default, 100)" steps (Section 4.1).
- Best FID: "Our best entry has 1.55 FID and compares favorably with leading systems." (v3, Section 5.3). Table 3 (table values, ImageNet 256×256): MAR-B 208M: 3.48 w/o CFG, 2.31 w/ CFG; MAR-L 479M: 2.60 / 1.78; MAR-H 943M: 2.35 / 1.55. Vendor.
- Speed: "Our MAR model with Diffusion Loss can generate at a rate of << 0.3 second per image" ... "while achieving a strong FID of << 2.0 on ImageNet 256×256" (v3, Section 1; the "<<" is how the HTML renders the symbol, read as "less than"). Figure 7 ("Speed/accuracy trade-off of the generation process"): "We benchmark FID and speed on ImageNet 256×256 using one A100 GPU with a batch size of 256." So 0.3 s is amortised per image in a batch of 256. Vendor.
- Tokenizer: continuous KL-16 from LDM (paraphrase, Section 5; the authors retrained a KL-16 on ImageNet with LDM's code for explorations). Which tokenizer Table 3 uses: UNCONFIRMED in the fetched text.

---

## 8. Emu3 (Wang et al. 2024), arXiv 2409.18869 (only v1, 27 Sep 2024)

Source: https://arxiv.org/html/2409.18869v1

- Claim: "next-token prediction is considered a promising path towards artificial general intelligence" and Emu3 is "surpassing flagship models such as SDXL and LLaVA-1.6" (v1, Abstract). Vendor.
- Tokens per image, codebook: "encode a 4 × 512 × 512 video clip or a 512 × 512 image into 4096 discrete tokens from a codebook of size 32,768" (v1, Section 2.2). Confirmed: 512×512 -> 4096 tokens, codebook 32,768. Compression: "4× compression in the temporal dimension and 8×8 compression in the spatial dimension" (Section 2.2; Table 1 lists 4 × 8 × 8).
- Model size and context: 8B parameters (v1, Table 3, table value); "a context length of 131072 is employed" (Section 2.4, for the video training stage).
- Table 4, text-to-image (table values; "Comparison with state-of-the-art models on text-to-image benchmarks." and "† result is with rewriting."):
  - Emu3: MSCOCO-30K CLIP-I 0.689, CLIP-T 0.313, FID 12.8; GenEval overall 0.66†; DPG-Bench 80.60.
  - Emu3-DPO: 0.680 / 0.312 / 19.3; GenEval 0.64†; DPG-Bench 81.60.
  - SDXL: 0.674 / 0.310 / no FID; GenEval 0.55; DPG-Bench 74.65.
  - DALL-E 3: CLIP-T 0.320; GenEval 0.67†; DPG-Bench 83.50. SD3: GenEval 0.74.
- **Caveat (text vs tables):** Emu3's GenEval win over SDXL (0.66 vs 0.55) uses a prompt rewriter ("employing a rewriter to expand short prompts", Section 3.1.1; GPT-4V is the rewriter, paraphrase). Without the rewriter Emu3 scores 0.54 (v1, Table 7, table value), slightly below SDXL's 0.55 in Table 4. The abstract's "surpassing SDXL" therefore rests on rewritten prompts for GenEval (DPG-Bench 80.60 vs 74.65 is not marked †).
- Human evaluation: Emu3 "outperforms SDXL and is on par with DALL-E 3 and MJ-v5.2" (v1, Section 3.1.2). Numeric scores are in Figure 5 only: UNCONFIRMED as numbers. Vendor (own human study).
- Sampling settings: "we set Top-k to 16,384 and Top-p to 1.0 for image generation" (v1, Appendix B.1). CFG: "The guidance scale is set to 5.0" (MSCOCO), "a guidance scale of 5.5" (GenEval); 5.0 for T2I-CompBench and DPG-Bench (Appendix B.1). Temperature: UNCONFIRMED (not stated).
- Output resolution: "The output resolution for Emu3-DPO is 720 x 720" (Appendix B.1). Token count at 720×720 not stated; at 8×8 compression it would be about 90×90 = 8,100 tokens (our arithmetic, not the paper's).
- Inference cost (time per image, GPU-seconds): UNCONFIRMED, not reported in v1. Note that CFG doubles the forward passes, as for LlamaGen; that is general knowledge, not a quote.

---

## 9. Emu3.5, "Emu3.5: Native Multimodal Models are World Learners", arXiv 2510.26583 (only v1, 30 Oct 2025)

Source: https://arxiv.org/html/2510.26583v1

- Scheme name: "Discrete Diffusion Adaptation (DiDA), which converts token-by-token decoding into bidirectional parallel prediction" (v1, Abstract). Section 4.3.1 (paraphrase): an image's visual tokens are initialised together and refined over several denoising steps; text generation stays autoregressive.
- Speed-up: "accelerating per-image inference by about 20x without sacrificing performance" (v1, Abstract); "achieving 20× acceleration per image without sacrificing quality" (Section 2.1); "DiDA achieves up to 20× faster inference while maintaining comparable performance to the AR baseline" and "DiDA can generate a 4,096-token image in only 10s" (Section 6.8); "accelerates autoregressive prediction by up to 20×" (Section 7). Vendor.
- Table 16 (table values; text-to-image, Emu3.5 34B, 1024×1024, 4,096 generated tokens, seconds per image): AR 512 s (naive) / 120 s (FlagScale); DiDA 22 s (naive) / 10 s (FlagScale). Quality: GenEval 0.86 for both; DPG-Bench 88.26 (AR) vs 87.46 (DiDA); GEdit-Bench-EN 7.59 (AR) vs 7.56 (DiDA).
- **Text vs table:** the table ratios are about 23x (512/22, naive) and 12x (120/10, FlagScale); the text's "about 20x" / "up to 20x" matches neither exactly (our arithmetic). Hardware for Table 16: UNCONFIRMED.
- Systems speed-up (separate from DiDA): FSM scheduler, async handling, state reuse, FP8, "at least 50% speedup on a 4-device setup" (Section 4.3.2).
- Size: 34.1B total (31.2B transformer + 2.9B embeddings), 64 layers, vocabulary 282,926 (v1, Section 2.2, Table 1, table values).
- Training tokens, **abstract vs body:** abstract "over 10 trillion tokens"; Section 3.1 "over 13 trillion" over two stages; Table 2 lists 10.3T + 3.5T.
- Tokenizer: IBQ-based, downsample 16, codebook 131,072, 256-dim codes, 455M parameters (Section 2.3, paraphrase); about 4K tokens for a 1024×1024 image (Section 4.3.1), about a quarter of the tokens Emu3 needs for the same image (Section 2.3).
- Vs Nano Banana: "performance comparable to Gemini 2.5 Flash Image (Nano Banana) on image generation and editing tasks" (Abstract). GEdit-Bench overall 7.59 vs 7.10, ImgEdit 4.41 vs 4.28 (Tables 10--11, table values). Vendor, judged by GPT-4o / GPT-4.1 as automatic raters.

---

## Flags summary

- Parti: LN-COCO finetuned FID 8.29 (Section 5.3 text) vs 8.39 (Table 5, Introduction).
- Muse: "Muse (33B parameters)" in Section 3.2.1 is a typo for 3B.
- LlamaGen: 2.18 headline is generated at 384 then resized to 256; Table 10 gives 2.189. "326%" speedup means 3.26x.
- VAR: headline 1.73 needs rejection sampling (1.92 without); its 18.65 baseline is MaskGIT's retrained VQGAN; the 10 scale sizes are not in the paper text.
- Emu3: beats SDXL on GenEval only with a GPT-4V prompt rewriter (0.66†; 0.54 without vs SDXL 0.55).
- Emu3.5: "about 20x" vs Table 16 ratios of 23x (naive) and 12x (FlagScale); 10T tokens (abstract) vs 13T+ (body).
- DALL-E: reranker is a "pretrained contrastive model" (CLIP by citation, not by name), best of 512.
