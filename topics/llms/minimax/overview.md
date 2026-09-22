# MiniMax

⏱ 5 min read · +2h 55m resources

Per-model pages to follow; this page explains the family.

### What MiniMax is

MiniMax is a Shanghai lab, funded largely by consumer products (the Talkie companion app and the Hailuo video models), whose model line is defined by one running experiment: how far the quadratic softmax attention of a standard transformer can be replaced by something cheaper without losing frontier quality. It has taken the strongest positions here, shipped them at production scale, and publicly reversed them when they did not hold, which makes its tech reports the best available evidence on where efficient attention actually breaks, worth more than the models themselves to anyone deciding what to serve.

### Best resources

- [MiniMax-01 paper](https://arxiv.org/abs/2501.08313) (1h 30m, long tech report): lightning (linear) attention at 456B scale, the family's founding architecture bet.
- [MiniMax M1 paper](https://arxiv.org/abs/2506.13585) (45 min): hybrid-attention reasoning plus the CISPO RL algorithm.
- [MiniMax M3 launch coverage (Fireworks)](https://fireworks.ai/blog/minimax-m3-launch) (~10 min) and [M3 spec roundup (Morph)](https://www.morphllm.com/minimax-m3) (~10 min): current flagship.
- [MiniMax HuggingFace org](https://huggingface.co/MiniMaxAI) (model cards and reports, ~20 min for the flagship cards): weights and tech reports.

### The attention story, which is the whole point of this lab

#### Lightning attention (MiniMax-01, M1): linear cost, compressed memory

Standard attention computes softmax(QK^T)V, and the softmax sitting between the two matrix products is what forces the N-by-N score matrix to be materialised and makes cost quadratic in sequence length. **Linear attention** removes the softmax and applies a feature map to Q and K separately, so the product becomes associative and can be reassociated as Q(K^T V). The N-by-N object disappears, leaving a d-by-d state matrix. Two consequences are the entire attraction: prefill cost becomes linear in sequence length rather than quadratic, and, more importantly for serving, decoding becomes a recurrence in which each new token updates the fixed-size state matrix and reads from it, so there is **no KV cache growing with context at all** and memory per sequence is constant whether the context is 8K or 4M.

**Lightning attention** is MiniMax's IO-aware implementation, a kernel-engineering contribution rather than a new mathematical form. Naive linear attention is theoretically cheap but empirically slow: the recurrent state update is a sequential cumulative sum along the sequence, serialising the very dimension GPUs want to parallelise. Lightning attention tiles the sequence into blocks and splits the computation in two: within a block, attention is computed the conventional quadratic way (cheap, because the block is small, and fully parallel), while across blocks the linear recurrence carries the state forward. That removes the cumsum bottleneck and keeps the working set in SRAM, in the spirit of FlashAttention, so the linear FLOP count actually turns into linear wall-clock time.

The cost is what the compression implies. A fixed d-by-d state is a lossy summary of everything seen so far, so anything requiring exact recall of a specific earlier token (retrieval from a long document, in-context lookup of a definition, copying an identifier) degrades in a way perplexity does not reveal. MiniMax-01 therefore shipped a **7:1 hybrid**: seven lightning-attention layers then one full softmax attention layer, repeating. The linear layers do the cheap bulk mixing while the periodic full-attention layers restore exact addressing, and one layer in eight keeps the KV cache and the quadratic term affordable. At 456B total parameters with 45.9B active, this was the first production-scale linear-attention LLM, and the source of the 4M-token context claim.

#### M2's reversal: back to full attention

M2 (Oct 2025) dropped linear attention entirely and returned to plain GQA (grouped-query attention: several query heads share one key/value head, so the KV cache shrinks by the group factor while quality stays close to full multi-head attention). This is the most useful single data point the lab has produced. Their account: the quality gap from efficient attention widens precisely in the regimes that had become the product, long reasoning chains where the model must reliably refer back to its own earlier steps, and agentic loops where the context is full of tool outputs that must be quoted exactly. Both are exact-recall workloads, where a compressed recurrent state is weakest. Paying the quadratic cost was the cheaper trade at that point, and M2 was positioned on speed and price (230B total, 10B active) rather than on context length.

#### MSA (MiniMax Sparse Attention, M3): keep exact lookup, skip most of the pairs

M3 takes the third route. **Sparse attention** keeps the softmax and keeps exact token-to-token lookup but computes only a selected subset of query-key pairs, so cost scales with the number of selected blocks rather than with the square of the sequence length. Unlike linear attention, nothing is compressed away: if the right block is selected, the retrieval is exact. The difficulty moves into selection (choosing which blocks matter, cheaply, and in a way that trains end to end) and into kernels (a selected set is irregular, and irregular memory access is what GPUs are worst at).

MSA is MiniMax's block-sparse operator for this. Its distinguishing features, per their description, are the granularity of selection and a **"KV outer, gather Q" access pattern**: instead of iterating over queries and gathering the KV blocks each one selected, the kernel iterates over KV blocks on the outer loop and gathers the queries that selected that block. The KV tile is loaded once and reused across every query that needs it, turning a scattered gather into contiguous work, which is what makes finer-grained selection affordable rather than merely expressible. The neighbouring designs are **DSA (DeepSeek Sparse Attention)**, a small fast indexer scoring and selecting top-k tokens per query, and **MoBA (Mixture of Block Attention)** from Moonshot, MoE-style gating applied to attention by routing each query to its top-k KV blocks. MSA is the finer-grained of the three by MiniMax's account.

In M3 that gives 1M-token context (512K guaranteed on their own platform) at a serving cost far below a dense-attention model of the same size, on a 428B total / roughly 22B active MoE backbone with GQA plus MSA. The arc across three generations is the general lesson: compressing history into a fixed state (linear) buys the most and costs recall; selecting which history to attend to (sparse) buys less but preserves exactness; and full attention remains the quality reference that both are measured against.

### Lineage

- **MiniMax-Text-01 / VL-01 (Jan 2025)**: 456B total / 45.9B active MoE with lightning attention in a 7:1 hybrid with full attention; first production-scale linear-attention LLM, 4M-token context claim.
- **M1 (Jun 2025)**: open reasoning model on the same hybrid backbone, and the origin of **CISPO (Clipped Importance-Sampling Policy Optimization)**. The problem is specific to RL on long reasoning traces: PPO- and GRPO-style objectives clip the probability ratio between new and old policy, and that clipping disproportionately zeroes the gradient on low-probability tokens, which in a reasoning trace are exactly the pivot tokens ("however", "wait", "instead") that redirect the chain of thought. CISPO instead clips the importance-sampling weight while keeping every token's gradient contribution alive, so the tokens that matter most to reasoning are not silently dropped from the update. RL cost for M1 was reported at roughly $0.53M, the kind of number nobody else publishes.
- **M2 (Oct 2025)**: the architecture reversal described above; full GQA, 230B total / 10B active, positioned as the cheap fast agentic model; M2.5 and M2.7 iterations followed.
- **M3 (Jun 2026)**: current flagship; 428B total / ~22B active MoE, GQA backbone plus MSA, 1M-token context (512K guaranteed on their platform), and the first open model combining frontier-adjacent coding, 1M context and native multimodality (text, image, video) in one system. It was the cheapest capable open frontier option at release and is now one of several: GLM-5.3-Flash undercuts it at flash tier, and StepFun's Step 5 Preview undercuts both on output price, though that model's weights are only promised rather than published.

### Training approach highlights

- The architecture arc, linear (01, M1) to full (M2) to learned sparse (M3), is the lab's signature: the reversal is more informative than the original claim.
- RL innovation (CISPO) plus cost transparency; ships weights under permissive licences at very low API prices, which is how a lab without frontier brand recognition buys attention.
- Consumer revenue (Talkie companion apps, Hailuo video) funds the model line, which is why it can price the API near cost; Hong Kong IPO in 2026 alongside Zhipu.

### Current models

| Model | Params | Notes |
| --- | --- | --- |
| M3 | 428B / 22B active | 1M ctx, native multimodal; a budget frontier pick, no longer the only one |
| M2.x | 230B / 10B active | Fast cheap agentic workhorse |
| Hailuo video, speech models | n/a | Adjacent multimodal product lines |

### Cross-links

- [LLM Architecture Gallery (rasbt) and the architectural deltas that matter](../_comparisons/llm-architecture-gallery.md): lightning/MSA among attention variants.
- [Mixture-of-Experts (MoE) models](../moe-models.md).
- Rivals: [Zhipu: GLM](../zhipu-glm.md), [DeepSeek](../deepseek/overview.md).
