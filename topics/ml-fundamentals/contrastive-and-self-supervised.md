# Contrastive and self-supervised learning

⏱ 5 min read · +6h 55m resources

## Best resources

- [Contrastive Representation Learning (Lilian Weng)](https://lilianweng.github.io/posts/2021-05-31-contrastive/) (~50 min): the definitive survey of objectives, from contrastive loss to CLIP.
- [Self-Supervised Representation Learning (Lilian Weng)](https://lilianweng.github.io/posts/2019-11-10-self-supervised/) (~50 min): the broader SSL landscape.
- [SimCLR paper (Chen et al. 2020, arXiv:2002.05709)](https://arxiv.org/abs/2002.05709) (45 min) and [CPC/InfoNCE paper (van den Oord et al. 2018, arXiv:1807.03748)](https://arxiv.org/abs/1807.03748) (45 min): the two foundational objectives.
- [I-JEPA (Assran et al. 2023, arXiv:2301.08243)](https://arxiv.org/abs/2301.08243) (45 min): LeCun-school non-generative SSL.

## Core idea

Learn an embedding space where similar pairs (augmented views of the same image, aligned image/caption pairs) are close and dissimilar pairs are far. Self-supervised: the pairing itself is the label, no human annotation.

## InfoNCE, the workhorse loss

$$
\mathcal{L} = -\log \frac{\exp(\text{sim}(z_i, z_j)/\tau)}{\sum_{k}\exp(\text{sim}(z_i, z_k)/\tau)}
$$

- Cross entropy over one positive against N-1 in-batch negatives; sim is cosine similarity, $\tau$ a temperature.
- Maximises a lower bound on mutual information between views. Needs many negatives, so large batches (or memory banks, MoCo) matter.

## Landmark methods

| Method | Positive pair | Negatives | Notes |
|---|---|---|---|
| SimCLR (2020) | Two augmentations of one image | In-batch | Strong augmentation + projection head + big batch = the recipe |
| MoCo (2019) | Same | Momentum-encoder queue | Decouples negative count from batch size |
| BYOL / SimSiam | Same | **None** | Predictor + stop-gradient (plus EMA target in BYOL) avoids collapse without negatives |
| [CLIP](../../papers/2021-02_clip/summary.md) (2021) | Image and its caption | In-batch, symmetric InfoNCE both directions | Cross-modal contrastive; zero-shot classification via text prompts; the vision encoder feeding most multimodal LLMs |

## Relation to encoder and decoder models (the seed's open question)

The clean way to slice it: **what the training objective forces the model to output** determines the architecture.

- **Contrastive objectives produce encoders.** The target is a single embedding vector per input, compared against other embeddings; nothing is generated token by token, so no decoder is needed. This is why CLIP's image tower, sentence-embedding models (SBERT, SimCSE, retrieval embedders), and reranker backbones are all encoders.
- **Generative objectives need decoders.** Next-token prediction (GPT) or denoising-with-generation (T5) must emit sequences, so they require an autoregressive decoder. Their representations are optimised for producing the next token, not for geometric comparability.
- **[BERT](../../papers/2018-10_bert/summary.md) sits in between**: an encoder trained with a generative-style objective (masked-token prediction) rather than a contrastive one. Its raw embeddings are poor for similarity until contrastively fine-tuned (SimCSE), which is exactly the step that turns "encoder" into "embedding model".
- Practical synthesis in 2026: contrastive learning is the standard **post-training recipe for embedding/retrieval models**, applied on top of an encoder, and increasingly on top of a decoder-only LLM backbone with pooling (E5-Mistral, NV-Embed, Qwen-Embedding): the objective, not the backbone, is what makes it an embedding model. Decoder LLMs are contrastively adapted precisely because their pretraining objective alone does not yield a well-shaped similarity space.

## Modern SSL beyond contrastive (2021 onward)

| Method | Family | Idea |
|---|---|---|
| [DINO](https://arxiv.org/abs/2104.14294) (45 min) / [DINOv2](https://arxiv.org/abs/2304.07193) (90 min) (2021/2023) | Self-distillation | Student matches a momentum teacher's output distribution across views; no negatives; DINOv2 (with curated data) yields frozen features rivalling weakly-supervised models, the default vision backbone for dense tasks. DINOv3 (2025) scales this further |
| [MAE](https://arxiv.org/abs/2111.06377) (45 min) (2021) | Masked reconstruction | Mask 75% of [ViT](../../papers/2020-10_vit/summary.md) patches, reconstruct pixels with a light decoder; BERT-style pretraining for vision, cheap and scalable |
| [I-JEPA](https://arxiv.org/abs/2301.08243) / V-JEPA (2023/2024) | Joint-embedding prediction | Predict *representations* of masked target blocks from a context block, in latent space, not pixels; avoids both negatives and pixel-level reconstruction. LeCun's proposed path toward world models (V-JEPA 2, 2025, extends to video) |

Trend: the field moved from "contrastive vs not" to **joint-embedding methods** (contrastive, distillation, JEPA) vs **masked generative methods** (MAE), with latent-space prediction increasingly favoured for semantic features.

## Cross-links

- InfoNCE is cross entropy: [losses.md](losses.md); temperature and softmax: [activations.md](activations.md)
- Embeddings in retrieval practice: topics/rag-and-retrieval
- ViT/CLIP architectural detail: topics/generative-and-multimodal
