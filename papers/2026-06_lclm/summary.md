# End-to-End Context Compression at Scale (Latent Context Language Models)

⏱ 9 min read · +3h 45m resources

- **Authors**: Ang Li, Sean McLeish, Haozhe Chen (equal), with Nimit Kalra, Micah Goldblum, Pavel Izmailov, Tom Goldstein and others (NYU, Maryland, Princeton, Columbia, Harvard, LLNL, Modal)
- **Date**: June 2026 (arXiv v1, 8 June 2026)
- **Links**: [arXiv:2606.09659](https://arxiv.org/abs/2606.09659) (~1h 30m) | [code](https://github.com/LeonLixyz/LCLM) (repo, ~20 min for the entry path) | [weights](https://huggingface.co/latent-context) (model cards, ~10 min)

## Best resources

- The paper itself. Sections 5 and 6 are the value; Section 5 is an architecture search that answers the design questions anyone building one of these would otherwise guess at.
- [REFRAG: Rethinking RAG based Decoding](https://arxiv.org/abs/2509.01092) (Meta, 2025) (45 min): the RAG-specific version of the same idea, with precomputable chunk embeddings and an RL policy choosing what to expand; useful as the narrower, more deployable sibling
- [Prompt Compression for Large Language Models: A Survey](https://arxiv.org/abs/2410.12388) (NAACL 2025) (~1h): the map of the field this paper is arguing with, covering the gist / ICAE / AutoCompressor / 500xCompressor / xRAG lineage

## Problem

Long-context inference is bottlenecked by memory, because the KV cache grows with context length. The established fix is **KV cache compression**: prefill normally, then evict entries by some heuristic. It has four practical problems the paper is blunt about. It requires the full context to fit and to be prefilled first, so the expensive part still happens. Query-dependent variants such as SnapKV produce a cache tuned to one question that does not survive a second turn. Methods that evict non-uniformly across heads and layers cannot actually shrink the sequence dimension, so they mask evicted positions instead and forfeit the memory and throughput benefit in a paged-attention engine. And they are largely unsupported in vLLM and SGLang.

The alternative is **soft-token compression**: encode raw tokens into a much shorter sequence of continuous embeddings and hand those to the decoder in place of the context. In principle this is strictly better shaped, since compression is parallelisable, works in standard inference engines, and extends the decoder past its native context length. In practice the existing methods either degraded the base model noticeably or only worked after task-specific finetuning, so they lost to KV cache compression on the accuracy-efficiency frontier. This paper's question is whether that is intrinsic or just a matter of nobody having trained one properly.

## Method

**Architecture.** An encoder maps each contiguous block of N input tokens to a single latent token, a pooling operator aggregates the encoder's hidden states into those latents, an adapter projects from the encoder's hidden dimension to the decoder's, and the decoder consumes the projected latents in place of the original tokens. Note the encoder window W (how many tokens the encoder sees per forward pass) is a separate knob from the compression ratio N.

**The architecture search is the most reusable part.** They pretrain variants from scratch at 38B tokens each, deliberately in a cleanroom so that a pretrained encoder's own conventions do not bias the answer. Four findings:

- **Mean pooling beats token-based pooling.** Appending a special CLS or EOS token per latent and reading its hidden state, which most prior work does, is worse than simply averaging hidden states over each block. Concatenation (stacking the N hidden states into one wide vector, then projecting) is indistinguishable from mean at small scale, and at scale the two swap: concatenation wins at 4x compression, mean wins at 16x.
- **Encoder window size matters more than expected.** Going from W = N (the encoder sees only the block it is compressing, as in prior work) to W = 256 is a large gain, and 1024 adds more. Letting the encoder contextualise over a wide span before pooling is most of what makes the latents good. Overlapping window boundaries so no information is split across passes sounds necessary and is not: it does not improve loss and costs compute.
- **Causal encoder attention beats bidirectional**, consistently. This is a genuinely surprising result given that the encoder runs before decoding and has no autoregressive constraint, and it cuts against the T5Gemma finding that bidirectionality is what makes the encoder worth having.
- **A plain two-layer MLP adapter beats an attention-based adapter**, at less compute, contrary to prior work.

**Training data is the other half.** Three sources mixed. Continual pretraining where each sequence alternates compressed and uncompressed segments marked with memory tags, with loss taken only on the uncompressed tokens, so the model learns to condition on latents at many positions rather than only at the start. Supervised finetuning covering reasoning, long-context instruction following and multi-turn chat. And an auxiliary **reconstruction** task that asks the decoder to reproduce the compressed text verbatim. The reason for mixing is instructive: training on reconstruction alone produces a model that reconstructs perfectly and can do nothing else, and training on next-token prediction alone produces latents that support generation but lose exact-string fidelity.

**Staged training.** Adapter only, then unfreeze the encoder, then unfreeze the decoder at a small learning rate, then SFT. Training everything end to end from the start underperforms, because the decoder starts out unaccustomed to the encoder's output and both sides take large destabilising gradients. This is the same alignment-then-finetune shape as vision-language model training. Parameter-efficient variants that freeze the decoder or use LoRA, which is what most prior work does, substantially underperform full training.

**The models.** Qwen3-Embedding-0.6B encoder plus Qwen3-4B-Instruct decoder, over 350B tokens each, at 4x, 8x and 16x compression.

## Results

**A new Pareto frontier on time to first token against accuracy.** 8.8x faster than KV cache baselines at equal accuracy on RULER at 4K, 5.2x on LongBench at 64K and on LongHealth at 64K. The shape of the win is structural: KV cache methods appear as vertical lines because they prefill the full context regardless of target ratio, so their compression time barely changes, while a higher compression ratio here directly reduces the decoder's work.

**Memory scales differently.** From 4K to 1M tokens, peak memory flattens for the 16x model between 128K and 512K, because encoder activations dominate and the encoder processes fixed windows in batches. Every KV cache baseline runs out of memory at 512K or 1M on a 141GB H200.

**Quality against the uncompressed decoder.** At 4x, RULER 4K is 91.76 against 94.41 uncompressed, LongBench 46.04 against 45.21, GSM8K 91.05 against 93.25. At 16x, RULER 4K drops to 75.06 and GSM8K holds at 81.05, which is the notable one: 16x compression discards 93.75% of the tokens of a short dense maths prompt where nearly every token matters, and most baselines score approximately zero on GSM8K at any ratio.

**The scaling result cuts against the intuition that more understanding effort is what you want.** Scaling the decoder from 4B to 8B lowered pretraining loss much more than scaling the encoder from 0.6B to 4B. Downstream the picture is mixed rather than clean: the 4B encoder wins LongBench, LongHealth and GSM8K while the 0.6B encoder wins every RULER length. Read as a bigger encoder buying better semantic aggregation and worse exact retrieval.

**The agentic use is the most interesting extension.** Segment the input into 512-token chunks, compress each, give them integer ids, and give the model an `EXPAND(i)` tool returning the original text. The agent skims an entire codebase at 16x and expands the segments it needs, substantially improving exact-string retrieval and in some settings matching the uncompressed context. The motivating example is exact: a bug reported in the dashboard login flow may live in an entitlement module that never contains either word, which is precisely where lexical and semantic search fail.

## Why it matters

**It closes a gap that had made the whole soft-token line look like a dead end.** The prior verdict was that encoder-decoder compressors were the right shape but lost on quality. The paper's claim is that this was a training-scale artifact rather than an architectural limit, and the evidence is that fixing the recipe and spending 350B tokens moves the frontier past KV cache compression.

**It is the strongest published argument for a small encoder feeding a large decoder.** Everything else in the compression literature either freezes the decoder or trains an adapter only, and this paper shows both underperform. If you are building an asymmetric reader-writer system, this is the recipe with the most evidence behind it.

**The systems argument is the underrated one.** Soft-token compression preserves the standard KV cache structure, so it composes with vLLM, SGLang and paged attention, while much of the KV cache compression literature does not and reports theoretical cache reduction that no released kernel realises. That distinction, between algorithmic and systems-realisable compression, is worth carrying into any evaluation of this area.

**The causal-encoder result is a live disagreement.** It sits directly against the T5Gemma line, where switching the encoder from causal to bidirectional is worth several points. The two are doing different jobs (compressing to latents versus building a representation for cross-attention), but the tension is not resolved anywhere and is a good thing to be suspicious about.

**Open direction the authors name**: compressing at multiple granularities and allocating capacity by information density, so a model keeps detail where detail exists without needing an explicit expand tool. Also compressing the model's own generated state, chain of thought, tool observations and accumulated history, which is what actually dominates the context budget in long-horizon agents.

## Connections

- `papers/2025-04_t5gemma`: the other route to spending more parameters on reading than writing, restructuring the model rather than compressing the input; note the two disagree on whether the encoder should be causal
- `papers/2026-03_trained-persistent-memory`: the same instinct applied to memory rather than input context, putting state in continuous latents so reads and writes are differentiable
- `papers/2023-09_vllm-pagedattention`: the KV cache layout this paper's baselines are constrained by, and the reason systems-realisability is a real distinction
- `papers/2024-12_deepseek-v3`: MLA compresses the KV cache inside attention, which is the same goal one layer down and composes with this rather than competing
- `papers/2026-08_prime-agent`: the recursive-language-model direction the authors name as naturally compatible, where a compressed working memory is the substrate
- `papers/2023-12_mamba`: the other way to avoid a growing cache, a fixed-size recurrent state, with the same exact-recall cost that shows up here at high compression
- Topics: `topics/inference-and-serving` (KV cache, TTFT, memory), `topics/rag-and-retrieval` (context compression for RAG, REFRAG), `topics/agentic-harnesses` (skim-then-expand as a harness pattern)
