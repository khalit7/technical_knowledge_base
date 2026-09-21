# MiniMax

⏱ 8 min read · +2h 55m resources

Last updated: 2026-08-31 (explanation rewrite; map first written 2026-08-24). Per-model pages to follow; this page explains the family.

### What MiniMax is

MiniMax is a Shanghai lab, funded largely by consumer products (the Talkie companion app and the Hailuo video models), whose model line is defined by one running experiment: how far the quadratic softmax attention of a standard transformer can be replaced by something cheaper without losing frontier quality. It is the lab that has taken the strongest positions here, shipped them at production scale, and then publicly reversed them when they did not hold. That makes its tech reports the best available evidence on where efficient attention actually breaks, which is worth more than the models themselves to anyone deciding what to serve.

### Best resources

- [MiniMax-01 paper](https://arxiv.org/abs/2501.08313) (1h 30m, long tech report): lightning (linear) attention at 456B scale, the family's founding architecture bet.
- [MiniMax M1 paper](https://arxiv.org/abs/2506.13585) (45 min): hybrid-attention reasoning plus the CISPO RL algorithm.
- [MiniMax M3 launch coverage (Fireworks)](https://fireworks.ai/blog/minimax-m3-launch) (~10 min) and [M3 spec roundup (Morph)](https://www.morphllm.com/minimax-m3) (~10 min): current flagship.
- [MiniMax HuggingFace org](https://huggingface.co/MiniMaxAI) (model cards and reports, ~20 min for the flagship cards): weights and tech reports.

### The attention story, which is the whole point of this lab

#### Lightning attention (MiniMax-01, M1): linear cost, compressed memory

Standard attention computes softmax(QK^T)V, and the softmax sits between the two matrix products, which is what forces the N-by-N score matrix to be materialised and makes cost quadratic in sequence length. **Linear attention** removes the softmax and replaces it with a feature map applied to Q and K separately, so the product becomes associative and can be reassociated as Q(K^T V). The N-by-N object disappears; what remains is a d-by-d state matrix. Two consequences follow, and they are the entire attraction. Prefill cost becomes linear in sequence length rather than quadratic. More importantly for serving, decoding becomes a recurrence: each new token updates the fixed-size state matrix and reads from it, so there is **no KV cache growing with context at all**, and memory per sequence is constant whether the context is 8K or 4M.

**Lightning attention** is MiniMax's IO-aware implementation of that idea, and the "lightning" part is a kernel-engineering contribution rather than a new mathematical form. Naive linear attention is theoretically cheap but empirically slow, because the recurrent state update is a sequential cumulative sum along the sequence, which serialises the very dimension GPUs want to parallelise. Lightning attention tiles the sequence into blocks and splits the computation in two: within a block, attention is computed the conventional quadratic way (cheap, because the block is small, and fully parallel), while across blocks the linear recurrence carries the state forward. That removes the cumsum bottleneck and keeps the working set in SRAM, in the same spirit as FlashAttention, so the linear FLOP count actually turns into linear wall-clock time.

The cost is exactly what the compression implies. A fixed d-by-d state is a lossy summary of everything seen so far, so anything requiring exact recall of a specific earlier token (retrieval from a long document, in-context lookup of a definition, copying an identifier) degrades in a way that perplexity does not reveal. MiniMax-01 therefore shipped a **7:1 hybrid**: seven lightning-attention layers followed by one full softmax attention layer, repeating. The intuition is that the linear layers do the cheap bulk mixing while the periodic full-attention layers restore exact addressing, and one layer in eight is a small enough fraction that the KV cache and the quadratic term stay affordable. At 456B total parameters with 45.9B active, this was the first production-scale linear-attention LLM, and it is where the 4M-token context claim comes from.

#### M2's reversal: back to full attention

M2 (Oct 2025) dropped linear attention entirely and returned to plain GQA (grouped-query attention, where several query heads share one key/value head so the KV cache shrinks by the group factor while quality stays close to full multi-head attention). This is the most useful single data point the lab has produced. Their account is that the quality gap from efficient attention widens precisely in the regimes that had become the product: long reasoning chains, where the model must reliably refer back to its own earlier steps, and agentic loops, where the context is full of tool outputs that must be quoted exactly. Both are exact-recall workloads, which is where a compressed recurrent state is weakest. Paying the quadratic cost was the cheaper trade at that point, and M2 was positioned on speed and price (230B total, 10B active) rather than on context length.

#### MSA (MiniMax Sparse Attention, M3): keep exact lookup, skip most of the pairs

M3 takes the third route. **Sparse attention** keeps the softmax and keeps exact token-to-token lookup, but computes only a selected subset of query-key pairs instead of all of them, so cost scales with the number of selected blocks rather than with the square of the sequence length. Unlike linear attention, nothing is compressed away: if the right block is selected, the retrieval is exact. The difficulty moves into selection (choosing which blocks matter, cheaply, and in a way that trains end to end) and into kernels (a selected set is irregular, and irregular memory access is what GPUs are worst at).

MSA is MiniMax's block-sparse operator for this. Its distinguishing feature, per their description, is the granularity of selection and a **"KV outer, gather Q" access pattern**, which describes the kernel's loop order: instead of iterating over queries and gathering the KV blocks each one selected, it iterates over KV blocks on the outer loop and gathers the queries that selected that block. The KV tile is then loaded once and reused across every query that needs it, turning a scattered gather into contiguous work, which is what makes finer-grained selection affordable rather than merely expressible. For comparison, the two neighbouring designs are **DSA (DeepSeek Sparse Attention)**, which uses a small fast indexer to score and select top-k tokens per query, and **MoBA (Mixture of Block Attention)** from Moonshot, which applies MoE-style gating to attention by routing each query to its top-k KV blocks. MSA is the finer-grained of the three by MiniMax's account.

The result in M3 is 1M-token context (512K guaranteed on their own platform) at a serving cost far below a dense-attention model of the same size, on a 428B total / roughly 22B active MoE backbone with GQA plus MSA. The arc across three generations is worth holding onto as a general lesson: compressing history into a fixed state (linear) buys the most and costs recall; selecting which history to attend to (sparse) buys less but preserves exactness; and full attention remains the quality reference that both are measured against.

### Lineage

- **MiniMax-Text-01 / VL-01 (Jan 2025)**: 456B total / 45.9B active MoE with lightning attention in a 7:1 hybrid with full attention; first production-scale linear-attention LLM, 4M-token context claim.
- **M1 (Jun 2025)**: open reasoning model on the same hybrid backbone, and the origin of **CISPO (Clipped Importance-Sampling Policy Optimization)**. The problem CISPO addresses is specific to RL on long reasoning traces: PPO-style and GRPO-style objectives clip the probability ratio between the new and old policy, and that clipping disproportionately zeroes the gradient on low-probability tokens, which in a reasoning trace are exactly the pivot tokens ("however", "wait", "instead") that redirect the chain of thought. CISPO instead clips the importance-sampling weight while keeping every token's gradient contribution alive, so the tokens that matter most to reasoning are not silently dropped from the update. RL cost for M1 was reported at roughly $0.53M, which is the kind of number nobody else publishes.
- **M2 (Oct 2025)**: the architecture reversal described above; full GQA, 230B total / 10B active, positioned as the cheap fast agentic model; M2.5 and M2.7 iterations followed.
- **M3 (Jun 2026)**: current flagship; 428B total / ~22B active MoE, GQA backbone plus MSA, 1M-token context (512K guaranteed on their platform), and the first open model combining frontier-adjacent coding, 1M context and native multimodality (text, image, video) in one system. The cheapest capable open frontier option.

### Training approach highlights

- The lab most willing to bet on attention architecture and to publicly reverse when quality regressed: linear (01, M1), then full (M2), then learned sparse (M3). Their reports are the best documentation available of *why* efficient attention is hard at frontier quality, and the reversal is more informative than the original claim.
- RL innovation (CISPO) plus cost transparency; ships weights under permissive licences at very low API prices, which is how a lab without frontier brand recognition buys attention.
- Consumer revenue (Talkie companion apps, Hailuo video) funds the model line, which is why it can price the API near cost; Hong Kong IPO in 2026 alongside Zhipu.

### Current models (Aug 2026)

| Model | Params | Notes |
| --- | --- | --- |
| M3 | 428B / 22B active | 1M ctx, native multimodal, budget frontier pick |
| M2.x | 230B / 10B active | Fast cheap agentic workhorse |
| Hailuo video, speech models | n/a | Adjacent multimodal product lines |

### Cross-links

- [LLM Architecture Gallery (rasbt) and the architectural deltas that matter](../_comparisons/llm-architecture-gallery.md): lightning/MSA among attention variants.
- [Mixture-of-Experts (MoE) models](../moe-models.md).
- Rivals: [Z.ai (Zhipu): GLM](../zhipu-glm/overview.md), [DeepSeek](../deepseek/overview.md).

<details>
<summary>2026-08-24: original map (superseded by this rewrite; kept for reference, not counted in the read estimate)</summary>

Last updated: 2026-08-24. Per-model files to follow; this page maps the family.

Lineage: MiniMax-Text-01 / VL-01 (Jan 2025): 456B/45.9B-active MoE with lightning attention (linear) in a 7:1 hybrid; first production-scale linear-attention LLM, 4M-token context claim. M1 (Jun 2025): open reasoning model on the same hybrid backbone; introduced CISPO (clipped importance-sampling policy optimization); ~$0.53M claimed RL cost. M2 (Oct 2025): notable architecture reversal: dropped linear attention for full GQA (efficient-attention quality gaps at scale in reasoning/agentic regimes), 230B/10B active, positioned as the cheap fast agentic model; M2.5/M2.7 iterations followed. M3 (Jun 2026): current flagship: 428B total/~22B active MoE, GQA backbone plus MiniMax Sparse Attention (MSA), a block-sparse operator with a "KV outer gather Q" access pattern (finer-grained than DSA/MoBA); 1M-token context (512K guaranteed on their platform); first open model combining frontier-ish coding, 1M context, and native multimodality (text, image, video) in one system. Cheapest capable open frontier option.

Training approach highlights: The lab most willing to bet on attention architecture, and to publicly reverse when quality regressed: linear (01/M1) to full (M2) to learned sparse (M3). Their reports are the best documentation of why efficient attention is hard at frontier quality. RL innovations (CISPO) and cost transparency; ships weights with permissive licenses and very low API prices. Consumer-facing revenue (Talkie/Hailuo video, companion apps) funds the model line; Hong Kong IPO (2026) alongside Zhipu.

</details>
