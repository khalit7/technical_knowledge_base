# Attention Is All You Need (Transformer)

⏱ 9 min read · +~5h 35m resources

- **Authors/lab**: Vaswani, Shazeer, Parmar, Uszkoreit, Jones, Gomez, Kaiser, Polosukhin (Google Brain / Google Research / U. Toronto)
- **Date**: June 2017 (NeurIPS 2017)
- **Links**: [arXiv:1706.03762](https://arxiv.org/abs/1706.03762) (~45 min) | [tensor2tensor code](https://github.com/tensorflow/tensor2tensor) (repo, ~20 min for the README and entry path)

### Best resources

- [The Illustrated Transformer](https://jalammar.github.io/illustrated-transformer/) (Jay Alammar) (~30 min): still the canonical visual walkthrough of Q/K/V, multi-head attention, and the encoder-decoder data flow.
- [The Annotated Transformer](https://nlp.seas.harvard.edu/annotated-transformer/) (Harvard NLP, 2022 revision) (~1h 30m): the paper reimplemented line by line in PyTorch; the fastest route from equations to working code.
- [3Blue1Brown: Attention in transformers, visually explained](https://www.3blue1brown.com/lessons/attention) (~30 min): the best geometric intuition for what attention heads actually compute.
- [Karpathy: Let's build GPT from scratch](https://www.youtube.com/watch?v=kCc8FmEb1nY) (~2h): builds a decoder-only Transformer from an empty file; makes the causal-masking and multi-head mechanics concrete.

### Problem

In 2017, sequence transduction (translation especially) was dominated by RNN/LSTM encoder-decoders, sometimes augmented with attention, and by convolutional alternatives (ByteNet, ConvS2S). RNNs compute hidden state h_t from h_{t-1}, so training cannot parallelize across the time dimension; this caps batch utilization and makes long sequences expensive. Convolutional models parallelize but need O(n/k) or O(log n) layers to connect distant positions, so long-range dependency paths stay long. The question: can attention alone, with no recurrence and no convolution, carry an entire sequence model?

### Method

The Transformer is an encoder-decoder built purely from attention, position-wise MLPs, residual connections, and layer normalization.

**Scaled dot-product attention.** Queries and keys of dimension d_k, values of dimension d_v, computed as matrices:

```javascript
Attention(Q, K, V) = softmax(QK^T / sqrt(d_k)) V
```

The 1/sqrt(d_k) scaling is the load-bearing detail: for random q, k with unit-variance components, q.k has variance d_k, so unscaled logits push the softmax into saturated, tiny-gradient regions as d_k grows. Dot-product attention is chosen over additive (Bahdanau) attention because it compiles to a single matmul.

**Multi-head attention.** Rather than one attention over d_model = 512 dims, project Q, K, V h = 8 times with learned matrices W_i^Q, W_i^K (d_model x d_k) and W_i^V (d_model x d_v), with d_k = d_v = d_model / h = 64; run attention per head in parallel; concat the h outputs and project with W^O (hd_v x d_model). Total FLOPs match single-head full-width attention, but heads can attend to different subspaces and positions simultaneously (single-head averaging blurs this; ablations show 1 head costs about 0.9 BLEU).

**Block layout (post-LN).** Encoder: N = 6 identical layers, each with two sub-layers, (1) multi-head self-attention, (2) position-wise FFN; every sub-layer is wrapped as LayerNorm(x + Sublayer(x)) with dropout on the sub-layer output. Decoder: N = 6 layers with three sub-layers, (1) causally masked self-attention (illegal connections set to -inf before the softmax so position i sees only positions <= i), (2) cross-attention where Q comes from the decoder and K, V from the encoder output, (3) the FFN. The FFN is FFN(x) = max(0, xW_1 + b_1)W_2 + b_2 applied identically at every position, with d_ff = 2048 (a 4x expansion). Input/output embeddings and the pre-softmax projection share one weight matrix, scaled by sqrt(d_model).

**Positional encoding.** With no recurrence, order must be injected: fixed sinusoids PE(pos, 2i) = sin(pos / 10000^(2i/d_model)) and cos for odd dims, added to the embeddings. Chosen because PE(pos+k) is a linear function of PE(pos), which should make relative-offset attention learnable; learned absolute embeddings performed identically in ablations.

**Training.** WMT 2014, BPE/word-piece vocab (37K shared EN-DE, 32K EN-FR); Adam with beta_2 = 0.98 and the now-famous warmup-then-inverse-sqrt LR schedule (4000 warmup steps); residual and embedding dropout 0.1; label smoothing 0.1 (hurts perplexity, helps BLEU); base model 65M params trained 12 hours on 8 P100s, big model 213M params for 3.5 days. Inference: beam 4, length penalty 0.6, checkpoint averaging.

**Why self-attention wins (Section 4).** Per layer: self-attention is O(n^2 d) but with O(1) sequential operations and O(1) maximum path length between any two positions; recurrence is O(n d^2) with O(n) sequential steps and O(n) paths. When n < d (typical for sentence-level BPE), self-attention is also cheaper per layer, and the constant-length gradient paths are what make long-range dependencies learnable.

### Results

- **WMT 2014 EN-DE**: 28.4 BLEU (big), beating all prior single models and ensembles by over 2 BLEU; even the base model beat everything published at a fraction of the training FLOPs (3.3 x 10^18 for base vs about 10^19 to 10^21 for competitors).
- **WMT 2014 EN-FR**: 41.8 BLEU (big), new single-model SOTA at under 1/4 the training cost of the previous best.
- **English constituency parsing**: a 4-layer Transformer hits 91.3 F1 on WSJ-only (beating BerkeleyParser) and 92.7 F1 semi-supervised, with almost no task-specific tuning; evidence the architecture generalizes beyond translation.
- Ablations: too many heads hurts as well as too few; shrinking d_k hurts; bigger models are better; dropout is essential at this data scale.

### Why it matters

This is the architecture paper of the deep learning era. Removing recurrence made training embarrassingly parallel across sequence length, which is what allowed compute scaling to be spent on model and data size rather than wall-clock sequentiality; every frontier LLM (GPT, Claude, Llama, Gemini, DeepSeek), plus BERT-style encoders, ViT, CLIP, Whisper, and most of diffusion's backbone work descends from this design.

What modern stacks changed since 2017 is a useful checklist of the paper's non-load-bearing choices:

- **Pre-LN instead of post-LN** (norm before the sub-layer) for stable training without warmup sensitivity; LayerNorm itself usually replaced by RMSNorm.
- **RoPE instead of sinusoidal absolute encodings** (rotary embeddings applied inside attention), plus interpolation/YaRN tricks for context extension.
- **SwiGLU/GeGLU FFNs instead of ReLU**, bias terms dropped.
- **Decoder-only, not encoder-decoder**: GPT-style causal LMs won for generation; cross-attention survives mainly in multimodal adapters and encoder-decoder holdouts (T5, Whisper).
- **Attention efficiency**: MQA/GQA and MLA shrink the KV cache; FlashAttention makes exact attention IO-aware; the O(n^2) cost the paper acknowledged is now the central serving bottleneck (PagedAttention, sliding windows, sparse/linear hybrids like Mamba).
- **Regularization**: label smoothing and heavy dropout largely dropped at pretraining scale; the warmup + decay LR schedule survives in cosine form.
What survived untouched: scaled dot-product attention itself, multi-head projections, residual + norm wrapping, the 4x FFN expansion as default, and weight-tied embeddings.

### Connections

- BERT (2018): the encoder stack alone, pretrained bidirectionally.
- GPT-3 (2020) and Scaling Laws (2020): the decoder stack scaled; the parallelism this paper unlocked is what made those curves reachable.
- RoFormer/RoPE (2021): replaces the sinusoidal positional encoding.
- FlashAttention (2022) and vLLM/PagedAttention (2023): attack the attention memory/IO costs this architecture created.
- ViT (2020): the same encoder applied to image patches.
- Mamba (2023): the main post-Transformer attempt to remove the O(n^2) attention core.
- Topics: `topics/ml-fundamentals` (sequence-model history, attention), `topics/llm-training-and-post-training` (positional encodings, LR schedules), `topics/llms` (ancestor of every model family covered).
