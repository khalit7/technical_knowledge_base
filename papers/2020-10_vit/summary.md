# An Image is Worth 16x16 Words: Transformers for Image Recognition at Scale (ViT)

⏱ 8 min read · +~3h 20m resources

- **Authors/lab**: Alexey Dosovitskiy, Lucas Beyer, Alexander Kolesnikov, Dirk Weissenborn, Xiaohua Zhai, Thomas Unterthiner, Mostafa Dehghani, Matthias Minderer, Georg Heigold, Sylvain Gelly, Jakob Uszkoreit, Neil Houlsby (Google Research, Brain Team)
- **Date**: October 2020 (ICLR 2021)
- **Links**: [arXiv](https://arxiv.org/abs/2010.11929) (~1h) | [code and pretrained models](https://github.com/google-research/vision_transformer) (repo, ~20 min for the README and entry path) | [Google AI blog](https://research.google/blog/transformers-for-image-recognition-at-scale/) (~15 min)

## Best resources

- [Google AI blog: Transformers for Image Recognition at Scale](https://research.google/blog/transformers-for-image-recognition-at-scale/) (~15 min, the same post as the Links line): the authors' own condensed account of the architecture and the data-scale story
- [Yannic Kilcher: paper walkthrough (video)](https://www.youtube.com/watch?v=TrdevFK_am4) (~1h): section-by-section reading with good intuition on inductive bias vs scale
- [lucidrains/vit-pytorch](https://github.com/lucidrains/vit-pytorch) (repo, ~20 min for the README and the base model): minimal reference implementation plus dozens of ViT variants; the fastest way to see how little code the model needs
- [AI Summer: How the Vision Transformer works](https://theaisummer.com/vision-transformer/) (~25 min): diagrams and code snippets for patch embedding, the class token, and position embeddings

## Problem

By 2020 Transformers were the default architecture in NLP, but vision was still ruled by CNNs. Prior attempts to bring self-attention to images either kept the CNN skeleton and swapped in attention blocks, or used specialized local/sparse attention patterns that were hard to run efficiently on accelerators; naive global attention over pixels is quadratic in pixel count and infeasible. The open question: can a plain, unmodified Transformer, with almost no image-specific inductive bias, compete with state-of-the-art CNNs, and under what conditions?

## Method

The core move is to turn an image into a token sequence and then run a completely standard Transformer encoder, reusing NLP architectures (and their efficient implementations) nearly out of the box.

- **Patch embedding**: reshape an image x in R^(HxWxC) into N = HW/P^2 flattened patches of size P^2*C (P = 16 or 32 in practice, 14 for ViT-H), and map each patch to the model width D with a single trainable linear projection E. These patch embeddings are the tokens; sequence length scales as 1/P^2, so smaller patches cost more compute.
- **Class token**: as in BERT, a learnable [class] embedding is prepended to the sequence. Its state at the final layer, z_L^0, is the image representation; an MLP head (one hidden layer for pre-training, a single linear layer for fine-tuning) sits on top for classification.
- **Position embeddings**: standard learnable 1D position embeddings are added to the patch embeddings. 2D-aware variants gave no measurable gain; inspection shows the 1D embeddings learn the 2D grid topology on their own (row/column structure appears in their cosine similarities).
- **Encoder**: alternating multi-head self-attention and GELU MLP blocks, pre-LayerNorm, residual connections after every block. Variants mirror BERT sizing: ViT-Base (12 layers, D=768, 86M params), ViT-Large (24, 1024, 307M), ViT-Huge (32, 1280, 632M). Notation ViT-L/16 means Large with 16x16 patches.
- **Inductive bias, made explicit**: CNNs bake locality, 2D neighborhood structure, and translation equivariance into every layer. In ViT only the MLP is local and translationally equivariant; self-attention is global from layer one. The 2D structure of images enters at exactly two points: cutting the image into patches, and interpolating position embeddings when fine-tuning at higher resolution. Everything else about spatial relations is learned from data.
- **Fine-tuning at higher resolution**: keep patch size fixed, which lengthens the sequence, and 2D-interpolate the pre-trained position embeddings to the new grid; this is standard practice and improves results.
- **Hybrid variant**: feed a ResNet's feature map into the patch projection instead of raw pixels; helps at small compute budgets, and the gap vanishes at scale.

**The data-scale finding** (the real contribution): pre-trained on ImageNet alone (1.3M images), ViT underperforms comparably sized ResNets, and ViT-Large is worse than ViT-Base; the missing convolutional priors hurt. At ImageNet-21k (14M) they are on par. At JFT-300M (303M images), ViT wins outright, and larger ViTs keep pulling ahead. Few-shot probes on JFT subsets from 9M to 300M show the crossover cleanly: ResNets are better below roughly 90M samples and plateau; ViT overtakes beyond it and keeps improving. Large-scale training trumps inductive bias, and learning spatial structure from data becomes not just sufficient but beneficial. On the compute axis, ViT reaches the same transfer accuracy as ResNets with roughly 2-4x less pre-training compute, and shows no saturation within the range tried.

## Results

- **ViT-H/14 pre-trained on JFT-300M**: 88.55% ImageNet top-1, 90.72% ImageNet-ReaL, 94.55% CIFAR-100, 77.63% on the 19-task VTAB suite; state of the art or matching it across the board.
- **Compute**: ViT-H/14 pre-trained in 2.5k TPUv3-core-days vs 9.9k for BiT-L (ResNet152x4) and 12.3k for Noisy Student (EfficientNet-L2); ViT-L/16 on JFT needs only 0.68k core-days and still beats BiT-L on every dataset.
- **Public data only**: ViT-L/16 pre-trained on ImageNet-21k hits 85.30% ImageNet top-1 and can be trained on an 8-core TPUv3 in about 30 days.
- **Interpretability probes**: some attention heads attend across most of the image in the lowest layers (global receptive field from the start), while others stay local, mimicking early conv layers; attention distance grows with depth.
- **Self-supervision preview**: masked patch prediction (BERT-style) gets ViT-B/16 to 79.9% on ImageNet, 2% above training from scratch but 4% behind supervised pre-training; contrastive pre-training left to future work.

## Why it matters

This is the paper that ended CNN dominance in vision at scale. Its deeper lesson generalizes beyond vision: hand-designed inductive bias is a substitute for data, and once data and compute are large enough, a generic architecture that learns structure wins. That aligned vision with the NLP scaling-laws playbook and unified both fields on one architecture, which is what made everything downstream possible:

- **Vision towers of contrastive and multimodal models**: CLIP, ALIGN, and SigLIP use ViT image encoders, and nearly every modern VLM (LLaVA, Qwen-VL, InternVL, Gemini-class models) bolts a ViT-derived vision tower onto an LLM.
- **Self-supervised vision**: the masked patch prediction experiment here foreshadowed MAE and BEiT; DINO/DINOv2 built self-distillation on ViT backbones.
- **Diffusion**: the Diffusion Transformer (DiT) replaced U-Nets with ViT-style backbones operating on latent patches, which is the architecture behind Stable Diffusion 3, Flux, and Sora-style video generators.
- **Practice**: patchify-then-Transformer became the default recipe for any grid-structured modality (images, video, audio spectrograms), and the paper's fine-tuning tricks (resolution increase, position embedding interpolation) are still standard.

## Connections

- [Attention Is All You Need (2017-06)](../2017-06_attention-is-all-you-need/summary.md): the encoder ViT reuses nearly unchanged
- [BERT (2018-10)](../2018-10_bert/summary.md): source of the [class] token, model sizing, and the masked-prediction pre-training idea
- [Scaling Laws for Neural Language Models (2020-01)](../2020-01_scaling-laws/summary.md): the NLP scaling story whose vision counterpart this paper establishes
- [CLIP (2021-02)](../2021-02_clip/summary.md): pairs a ViT image encoder with a text encoder; the main vehicle through which ViT reached multimodal models
- [DDPM (2020-06)](../2020-06_ddpm/summary.md) and [Latent Diffusion (2021-12)](../2021-12_latent-diffusion/summary.md): the diffusion line that later swapped its U-Net for ViT-style DiT backbones
- KB topics: [generative-and-multimodal](../../topics/generative-and-multimodal/summary.md)
