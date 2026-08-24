# Megatron-LM: Training Multi-Billion Parameter Language Models Using Model Parallelism

- **Authors/lab**: Mohammad Shoeybi, Mostofa Patwary, Raul Puri, Patrick LeGresley, Jared Casper, Bryan Catanzaro (NVIDIA)
- **Date**: September 2019 (arXiv v1; v4 March 2020)
- **Links**: [arXiv 1909.08053](https://arxiv.org/abs/1909.08053) | [code (NVIDIA/Megatron-LM)](https://github.com/NVIDIA/Megatron-LM)

## Best resources

- [The Ultra-Scale Playbook, tensor parallelism section](https://huggingface.co/spaces/nanotron/ultrascale-playbook?section=tensor_parallelism) (HF/nanotron, 2025): the clearest modern walkthrough of column/row parallel linears, with communication-cost analysis and profiles
- [How to Train Really Large Models on Many GPUs?](https://lilianweng.github.io/posts/2021-09-25-train-large/) (Lilian Weng): situates Megatron-style tensor parallelism among the other parallelism and memory-saving techniques
- [Megatron-LM GitHub repo](https://github.com/NVIDIA/Megatron-LM): the living codebase (now Megatron-Core); the reference implementation of everything in the paper

## Problem

By 2019 the useful frontier of language models (BERT-large 336M, GPT-2 1.5B) had hit the memory wall of a single accelerator: weights plus Adam optimizer state plus activations no longer fit on a 32GB V100, even with activation checkpointing. Existing model-parallel options either meant pipeline parallelism with its bubble overhead and optimizer complications (GPipe, PipeDream), or general distributed tensor frameworks that required rewriting the model for a custom compiler (Mesh-TensorFlow, FlexFlow). The gap: a way to split a transformer layer itself across GPUs that is simple enough to implement in native PyTorch with a handful of communication ops, no new compiler or framework.

## Method

The core idea is **intra-layer model parallelism (tensor parallelism, TP)**: partition the weight matrices of each transformer layer across GPUs, choosing the split directions so that nonlinearities never see partial sums, which reduces synchronisation to a few all-reduces per layer.

**MLP block.** The block computes `Z = Dropout(GeLU(X A) B)` with `A: H x 4H`, `B: 4H x H`. Two ways to split the first GEMM across 2 GPUs:

1. Split `A` along rows and `X` along columns: `X = [X1, X2]`, `A = [A1; A2]`, so `XA = X1 A1 + X2 A2`. But GeLU is nonlinear, `GeLU(X1 A1 + X2 A2) != GeLU(X1 A1) + GeLU(X2 A2)`, so this forces an all-reduce **before** the GeLU.
2. Split `A` along columns: `A = [A1, A2]`, giving `[Y1, Y2] = [GeLU(X A1), GeLU(X A2)]`. The GeLU applies independently to each shard; no sync needed.

Megatron picks option 2 (**column-parallel** first GEMM), then splits `B` along rows (**row-parallel** second GEMM): `B = [B1; B2]`, so GPU i computes `Y_i B_i` and the full output is `Y1 B1 + Y2 B2`, recovered by a single all-reduce. The general recipe: column-split the layer that feeds a nonlinearity, row-split the layer that follows it, and the elementwise nonlinearity lives entirely between them with zero communication.

**The f and g operators.** The whole scheme is packaged as two conjugate autograd functions inserted around each block:

- `f`: identity in the forward pass, all-reduce of gradients in the backward pass (placed at the block input, since each GPU needs the full `X` but the input-gradient contributions must be summed)
- `g`: all-reduce in the forward pass, identity in the backward pass (placed at the block output, summing the row-parallel partials)

Each is about four lines of PyTorch. A transformer layer needs exactly **4 all-reduces total**: 2 in forward (one `g` per block) and 2 in backward (one `f` per block), covering both the attention and MLP sub-blocks.

**Self-attention block.** Multi-head attention is embarrassingly parallel over heads. The Q, K, V projection matrices are split column-wise so that each GPU holds the full projections for a subset of heads; softmax, the attention-weighted sum over V, and attention dropout for those heads run entirely locally. The output projection is split row-wise and consumes the local head outputs directly, followed by the `g` all-reduce. Same fused 2-GEMM pattern, same single forward sync.

**Embeddings and loss.** The input embedding `E: H x v` is split along the vocabulary dimension `E = [E1, E2]` (each GPU looks up the tokens it holds; an all-reduce merges), and since input/output embeddings are tied, the output GEMM is parallel too. Naively all-gathering the logits would communicate `b x s x v` elements (huge, since v is around 50k), so instead the parallel GEMM is fused with the cross-entropy loss and only the `b x s` scalar losses are communicated.

**Redundant compute over communication.** LayerNorm, dropout, and residual connections are cheap, so their parameters and computation are duplicated on every GPU rather than computed once and broadcast. Each model-parallel worker optimises its own parameter shard; every value is either local or duplicated, so no optimizer-state communication is ever needed.

Practical details: mixed precision with dynamic loss scaling, activation checkpointing after every layer, residual-branch weights scaled by `1/sqrt(2N)`, vocabulary padded to a multiple of `128 x TP-degree` for efficient GEMMs. TP is orthogonal to data parallelism (and to pipeline parallelism), so it composes: 8-way TP within a DGX-2H node (NVSwitch, 300 GB/s GPU-to-GPU) times 64-way DP across nodes.

**Second contribution (often forgotten)**: BERT-style models degrade when scaled past 336M with the original post-LN architecture; rearranging layer normalisation and residual connections (moving LN to the block inputs, an early pre-LN result) makes 1.3B and 3.9B BERT train stably with monotonic downstream gains.

## Results

- **8.3B-parameter GPT-2** trained on 512 V100s with 8-way TP x 64-way DP: **15.1 PFLOP/s sustained, 76% weak-scaling efficiency** against a strong 1.2B single-GPU baseline that itself hits 39 TFLOP/s (30% of peak). Pure 8-way model parallelism alone retains 77% efficiency.
- **GPT-2 SOTA (zero-shot)**: WikiText103 perplexity 10.81 (prior SOTA 15.79), LAMBADA accuracy 66.51% (prior 63.24%). Bigger models converge faster and to lower perplexity throughout training.
- **BERT at 3.9B** (with the LN rearrangement): SOTA on RACE test (90.9% vs prior 89.4%), plus dev-set SOTA on MNLI, QQP, and SQuAD 1.1/2.0 among BERT-style models; without the rearrangement, models above 336M destabilise or underperform.

The headline meaning: a model 5x larger than GPT-2 was trainable at good efficiency with only a few communication primitives added to vanilla PyTorch, and the extra scale translated directly into accuracy.

## Why it matters

- **Tensor parallelism became a standard axis.** The DP/TP/PP/EP decomposition that every modern training stack speaks (the "3D parallelism" framing) traces its TP axis to this paper. The column-then-row split with conjugate f/g operators is still the canonical formulation, and the same recipe is standard at inference time (`tensor_parallel_size` in vLLM, TensorRT-LLM, SGLang).
- **The codebase outlived the paper.** Megatron-LM evolved into Megatron-Core, the backbone of NVIDIA's large-model training stack and of many frontier runs: Turing-NLG 17B (cited in the paper's own v4), MT-NLG 530B, Nemotron, plus countless forks (it also fed into DeepSpeed's Megatron-DeepSpeed).
- **Follow-up work completed the picture.** Narayanan et al. 2021, "Efficient Large-Scale Language Model Training on GPU Clusters Using Megatron-LM" ([arXiv 2104.04473](https://arxiv.org/abs/2104.04473)), combined this TP with pipeline parallelism and an interleaved 1F1B schedule (PTD-P), reaching 502 PFLOP/s on 3072 A100s; the pair of papers defines the classic pre-training scaling playbook.
- **It fixed the mental model for communication cost**: TP's per-layer all-reduces on activations demand high-bandwidth interconnect, which is why TP degree is conventionally capped at the NVLink domain (8 GPUs per node) while DP and PP cross nodes; that placement rule comes straight from this paper's setup.
- The pre-LN observation for BERT scaling anticipated the now-universal pre-norm transformer.

## Connections

- Papers in this KB: [2017-06_attention-is-all-you-need](../2017-06_attention-is-all-you-need/) (the layer structure being partitioned), [2018-10_bert](../2018-10_bert/) (the architecture whose LN placement it fixes), [2019-10_zero](../2019-10_zero/) (the contemporaneous memory-side alternative: ZeRO shards optimizer state under data parallelism instead of partitioning layers), [2020-05_gpt-3](../2020-05_gpt-3/) (trained with model parallelism at the scale this line of work enabled), [2024-07_llama-3](../2024-07_llama-3/) (4D parallelism, TP included, in a modern frontier run), [2024-12_deepseek-v3](../2024-12_deepseek-v3/) (notable for engineering around TP and dropping it in favour of EP/PP/ZeRO-1)
- Topics: [llm-training-and-post-training](../../topics/llm-training-and-post-training/) (distributed training: the TP axis), [inference-and-serving](../../topics/inference-and-serving/) (TP as the default multi-GPU serving strategy), [hardware](../../topics/hardware/) (NVLink/NVSwitch bandwidth as the TP constraint)
