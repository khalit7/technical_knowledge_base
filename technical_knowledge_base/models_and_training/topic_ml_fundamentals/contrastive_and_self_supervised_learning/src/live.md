Here is the result of "fetch" for the Page with URL https://app.notion.com/p/3c65c17b0d0d811db6a7d02d0ee7215c as of 2026-09-22T00:05:55.557Z:
<page url="https://app.notion.com/p/3c65c17b0d0d811db6a7d02d0ee7215c">
<ancestor-path>
<parent-page url="https://app.notion.com/p/3c65c17b0d0d81d796ccc0a293218c57" title="Topic: ml-fundamentals"/>
<ancestor-2-page url="https://app.notion.com/p/3c65c17b0d0d81c7b646e548e65d9446" title="Technical knowledge base"/>
<ancestor-3-page url="https://app.notion.com/p/3b75c17b0d0d8148b63dd36e88459017" title="Me"/>
</ancestor-path>
<properties>
{"title":"Contrastive and self-supervised learning"}
</properties>
<iconMetadata>null</iconMetadata>
<content>
⏱ 5 min read · +6h 55m resources
## Best resources
- [Contrastive Representation Learning (Lilian Weng)](https://lilianweng.github.io/posts/2021-05-31-contrastive/) (\~50 min): the definitive survey of objectives, from contrastive loss to CLIP.
- [Self-Supervised Representation Learning (Lilian Weng)](https://lilianweng.github.io/posts/2019-11-10-self-supervised/) (\~50 min): the broader SSL landscape.
- [SimCLR paper (Chen et al. 2020, arXiv:2002.05709)](https://arxiv.org/abs/2002.05709) (45 min) and [CPC/InfoNCE paper (van den Oord et al. 2018, arXiv:1807.03748)](https://arxiv.org/abs/1807.03748) (45 min): the two foundational objectives.
- [I-JEPA (Assran et al. 2023, arXiv:2301.08243)](https://arxiv.org/abs/2301.08243) (45 min): LeCun-school non-generative SSL.
## Core idea
Learn an embedding space where similar pairs (augmented views of the same image, aligned image/caption pairs) are close and dissimilar pairs are far. Self-supervised: the pairing itself is the label, no human annotation.
## InfoNCE, the workhorse loss
$$
\mathcal{L} = -\log \frac{\exp(\text{sim}(z_i, z_j)/\tau)}{\sum_{k}\exp(\text{sim}(z_i, z_k)/\tau)}
$$
- Cross entropy over one positive against N-1 in-batch negatives; sim is cosine similarity, $`\tau`$ a temperature.
- Maximises a lower bound on mutual information between views. Needs many negatives, so large batches (or memory banks, MoCo) matter.
## Landmark methods
<table header-row="true">
<tr>
<td>Method</td>
<td>Positive pair</td>
<td>Negatives</td>
<td>Notes</td>
</tr>
<tr>
<td>SimCLR (2020)</td>
<td>Two augmentations of one image</td>
<td>In-batch</td>
<td>Strong augmentation + projection head + big batch = the recipe</td>
</tr>
<tr>
<td>MoCo (2019)</td>
<td>Same</td>
<td>Momentum-encoder queue</td>
<td>Decouples negative count from batch size</td>
</tr>
<tr>
<td>BYOL / SimSiam</td>
<td>Same</td>
<td>**None**</td>
<td>Predictor + stop-gradient (plus EMA target in BYOL) avoids collapse without negatives</td>
</tr>
<tr>
<td>CLIP (2021)</td>
<td>Image and its caption</td>
<td>In-batch, symmetric InfoNCE both directions</td>
<td>Cross-modal contrastive; zero-shot classification via text prompts; the vision encoder feeding most multimodal LLMs</td>
</tr>
</table>
## Relation to encoder and decoder models
The clean way to slice it: **what the training objective forces the model to output** determines the architecture.
- **Contrastive objectives produce encoders.** The target is a single embedding vector per input, compared against other embeddings; nothing is generated token by token, so no decoder is needed. This is why CLIP's image tower, sentence-embedding models (SBERT, SimCSE, retrieval embedders), and reranker backbones are all encoders.
- **Generative objectives need decoders.** Next-token prediction (GPT) or denoising-with-generation (T5) must emit sequences, so they require an autoregressive decoder. Their representations are optimised for producing the next token, not for geometric comparability.
- **BERT sits in between**: an encoder trained with a generative-style objective (masked-token prediction) rather than a contrastive one. Its raw embeddings are poor for similarity until contrastively fine-tuned (SimCSE), which is exactly the step that turns "encoder" into "embedding model".
- Practical synthesis in 2026: contrastive learning is the standard **post-training recipe for embedding/retrieval models**, applied on top of an encoder, and increasingly on top of a decoder-only LLM backbone with pooling (E5-Mistral, NV-Embed, Qwen-Embedding): the objective, not the backbone, is what makes it an embedding model. Decoder LLMs are contrastively adapted precisely because their pretraining objective alone does not yield a well-shaped similarity space.
## Modern SSL beyond contrastive (2021 onward)
<table header-row="true">
<tr>
<td>Method</td>
<td>Family</td>
<td>Idea</td>
</tr>
<tr>
<td>[DINO](https://arxiv.org/abs/2104.14294) (45 min) / [DINOv2](https://arxiv.org/abs/2304.07193) (90 min) (2021/2023)</td>
<td>Self-distillation</td>
<td>Student matches a momentum teacher's output distribution across views; no negatives; DINOv2 (with curated data) yields frozen features rivalling weakly-supervised models, the default vision backbone for dense tasks. DINOv3 (2025) scales this further</td>
</tr>
<tr>
<td>[MAE](https://arxiv.org/abs/2111.06377) (45 min) (2021)</td>
<td>Masked reconstruction</td>
<td>Mask 75% of ViT patches, reconstruct pixels with a light decoder; BERT-style pretraining for vision, cheap and scalable</td>
</tr>
<tr>
<td>[I-JEPA](https://arxiv.org/abs/2301.08243) / V-JEPA (2023/2024)</td>
<td>Joint-embedding prediction</td>
<td>Predict *representations* of masked target blocks from a context block, in latent space, not pixels; avoids both negatives and pixel-level reconstruction. LeCun's proposed path toward world models (V-JEPA 2, 2025, extends to video)</td>
</tr>
</table>
Trend: the field moved from "contrastive vs not" to **joint-embedding methods** (contrastive, distillation, JEPA) vs **masked generative methods** (MAE), with latent-space prediction increasingly favoured for semantic features.
## Cross-links
- InfoNCE is cross entropy: <mention-page url="https://app.notion.com/p/3c65c17b0d0d8161a72bc8c572f37d55"/>; temperature and softmax: <mention-page url="https://app.notion.com/p/3c65c17b0d0d819f8049c255e6f206e2"/>
- Embeddings in retrieval practice: <mention-page url="https://app.notion.com/p/3c65c17b0d0d81b89145c37dfe8a3b0b"/>
- ViT/CLIP architectural detail: <mention-page url="https://app.notion.com/p/3c65c17b0d0d817ab6ade318917bff55"/>
</content>
</page>
