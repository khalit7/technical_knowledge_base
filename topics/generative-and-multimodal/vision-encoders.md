# Vision Encoders: ViT, CLIP, SigLIP, DINO, SAM

⏱ 6 min read · +2h 40m resources

Last updated: 2026-08-24

### Best resources

- Papers: [An Image is Worth 16x16 Words: Transformers for Image Recognition at Scale (ViT)](../../papers/2020-10_vit/summary.md); [Learning Transferable Visual Models From Natural Language Supervision (CLIP)](../../papers/2021-02_clip/summary.md).
- Tschannen et al., [SigLIP 2](https://arxiv.org/abs/2502.14786) (45 min): the current default contrastive encoder family, with the training recipe.
- Meta AI, [DINOv3](https://arxiv.org/abs/2508.10104) (90 min): scaling self-supervised vision to 7B params; read for gram anchoring and dense-feature quality.
- Hugging Face, [Vision Language Models (better, faster, stronger)](https://huggingface.co/blog/vlms-2025) (~25 min): what open VLMs actually plug in as eyes.

### ViT: the substrate

Split the image into fixed patches (16x16), linearly project each patch to a token, add

position embeddings, run a standard transformer encoder. No convolutional inductive bias,

so it needs large-scale pretraining to beat CNNs, but it scales better and unifies vision

with the LLM toolchain. Everything below is a ViT with a different training objective.

Resolution handling matters in practice: fixed-res ViTs need interpolated position

embeddings or native-resolution tricks (NaViT-style patch packing, 2D RoPE) to accept

arbitrary aspect ratios; modern VLM encoders build this in.

### CLIP: contrastive vision-language pretraining

Train an image tower and a text tower on 400M web pairs so matching pairs have high

cosine similarity and mismatched pairs low, via a symmetric InfoNCE loss over the batch.

Results: zero-shot classification by prompt ("a photo of a {class}"), and, more

importantly for 2026, an image embedding space aligned with language, which is why CLIP

towers became the default VLM front-end and the text encoder for early diffusion models.

Weaknesses to cite: bag-of-words behaviour (poor compositionality/spatial relations),

weak OCR at low resolution, needs huge batch sizes because the softmax is over the batch.

### SigLIP and SigLIP 2: the current contrastive default

**SigLIP** replaces CLIP's batch-softmax with an independent sigmoid loss per pair: no

global normalisation, so it trains well at smaller batches and scales cleanly.

**SigLIP 2** (Feb 2025) adds captioning-based pretraining, self-distillation and masked

prediction to fix CLIP-family weaknesses: better dense features, localisation, OCR and

multilingual coverage, plus NaFlex variants that preserve native aspect ratio. SigLIP

encoders are the eyes of PaliGemma, Gemma 3, LLaVA-OneVision and many other open VLMs.

### DINOv2 / DINOv3: self-supervised, no text

Self-distillation (student matches teacher across augmentations) plus masked image

modelling, no captions at all. The result is the best **dense** features available:

segmentation, depth, correspondence from frozen features. **DINOv3** (Aug 2025) scales

to a 7B ViT on 1.7B images and introduces gram anchoring to stop dense features

degrading over long training; it beats specialised models on dense benchmarks with a

frozen backbone. Not language-aligned, so VLMs pair it with a contrastive encoder rather

than use it alone; it dominates in robotics, geospatial, and medical pipelines.

### SAM: promptable segmentation

Segment Anything (2023): a ViT image encoder plus a light mask decoder, promptable with

points/boxes, trained on 1.1B masks. **SAM 2** (2024) extended to video with streaming

memory. **SAM 3** (Nov 2025) added concept prompting: segment every instance matching a

text phrase or exemplar, plus tracking. Used as a data engine (auto-labelling), an

editing tool, and a source of segmentation-aware features; not a general VLM encoder.

### What current VLMs use as eyes (Aug 2026)

- **Contrastive (CLIP/SigLIP 2) towers remain the default front-end** for
  semantics-heavy chat VLMs: language-aligned features connect to an LLM with a small

  projector and little data.

- **In-house ViTs trained end-to-end**: Qwen3-VL (native dynamic resolution, window
  attention, video-aware), InternVL's InternViT-6B: at frontier scale, teams train their

  own encoder rather than take OpenAI/Google checkpoints.

- **Multi-encoder fusion**: Cambrian-1-style stacks combine SigLIP-class (semantics) with
  DINOv3 (dense detail) and sometimes SAM features; recent work (CoME-VL, Scope, 2026)

  selects complementary layers/experts. Motivation: contrastive features are globally

  semantic but spatially coarse; DINO fills the gap.

- **Resolution strategy** matters as much as the encoder: tiling/AnyRes (LLaVA-NeXT,
  InternVL) vs native-resolution patch packing (Qwen-VL); token budget per image is the

  cost lever (typically 64-2000+ visual tokens after a pixel-shuffle or pooling step).

- **Encoder-free** early-fusion models (Fuyu, EVE, Chameleon-style patches straight into
  the LLM) exist and simplify the stack, but as of 2026 encoder-based designs still win

  at comparable compute.

### Interview-ready summary

ViT is the substrate; the objective defines the encoder. CLIP/SigLIP align vision with

language (best for VLM front-ends), DINOv2/v3 learn text-free dense features (best for

spatial tasks), SAM is promptable segmentation (best as a tool/data engine). Modern VLMs

mostly use SigLIP-2-class or in-house native-resolution ViTs, increasingly fused with

DINO features for dense understanding.
