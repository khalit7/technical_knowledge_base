# Mamba: Linear-Time Sequence Modeling with Selective State Spaces

- **Authors**: Albert Gu (CMU) and Tri Dao (Princeton)
- **Date**: December 2023 (arXiv v1; v2 May 2024). Published at COLM 2024.
- **Links**: [arXiv:2312.00752](https://arxiv.org/abs/2312.00752) | [code + checkpoints](https://github.com/state-spaces/mamba)

## Best resources

- [A Visual Guide to Mamba and State Space Models](https://newsletter.maartengrootendorst.com/p/a-visual-guide-to-mamba-and-state) (Maarten Grootendorst): the best intuition-first walkthrough, from RNN/CNN duality through selectivity, with excellent diagrams.
- [The Annotated S4](https://srush.github.io/annotated-s4/) (Sasha Rush): executable notebook covering the S4 lineage Mamba builds on; essential background for the discretization and convolution-mode math.
- [Mamba: The Hard Way](https://srush.github.io/annotated-mamba/hard.html) (Sasha Rush): reimplements the selective scan kernel step by step in Triton; the fastest route to actually understanding the hardware-aware algorithm.
- [State Space Duality (Mamba-2) blog series](https://tridao.me/blog/2024/mamba2-part1-model/) (Tri Dao and Albert Gu): the authors' own follow-up explaining how selective SSMs and attention are two views of the same family of structured matrices.

## Problem

Transformers pay quadratic compute in sequence length during training and hold a KV cache that grows linearly during inference. A long line of subquadratic alternatives (linear attention, Hyena, H3, RWKV, RetNet, and structured state space models like S4) scale better but had never matched attention quality on dense, discrete modalities like language. The paper's diagnosis: all prior efficient SSMs are linear time-invariant (LTI), meaning their dynamics are fixed constants across the sequence, which makes them computable as a global convolution but structurally unable to do content-based reasoning: they cannot decide, per token, what to store or ignore. Synthetic tasks make this concrete: LTI models solve vanilla Copying (constant spacing, pure time-awareness) but fail Selective Copying and Induction Heads, which require content-aware filtering.

## Method

**S4 background.** A structured SSM maps each channel of the input through an N-dimensional latent state: h'(t) = Ah(t) + Bx(t), y(t) = Ch(t). Continuous parameters (delta, A, B) are discretized, typically via zero-order hold (A_bar = exp(delta A)), giving a linear recurrence h_t = A_bar h_{t-1} + B_bar x_t. Because the parameters are constant over time (LTI), the whole sequence output equals a convolution with a precomputable kernel K_bar = (CB_bar, CA_bar B_bar, ...), so S4 trains in parallel via FFT convolution and infers recurrently in O(1) per step. A is structured (diagonal) so the state costs only N numbers per channel; the effective state is D x N per token, far larger than an RNN's, without paying for it.

**Selection mechanism (S6 = S4 + selection + scan).** The core change is tiny: make B, C, and delta functions of the input token. B_t = Linear_N(x_t), C_t = Linear_N(x_t), and delta_t = softplus(parameter + Broadcast(Linear_1(x_t))). These parameters gain a length dimension, so the model becomes time-varying and the convolution trick dies. What it buys: delta generalizes RNN gating (Theorem 1 shows that for N=1 the selective recurrence reduces exactly to a gated RNN h_t = (1-g_t)h_{t-1} + g_t x_t). Large delta resets the state and focuses on the current token; delta near 0 skips it. Selective B controls what enters the state, selective C what leaves it; A stays input-independent because selectivity in delta already makes A_bar = exp(delta A) input-dependent. The model can now filter fillers, and reset state at sequence boundaries, which is why performance improves monotonically with context instead of degrading.

**Hardware-aware selective scan.** Time-varying recurrence cannot use convolutions, and naively materializing the (B, L, D, N) state tensor in HBM is N times more memory traffic than the input itself. The kernel applies three classical tricks: (1) kernel fusion: load (delta, A, B, C) from HBM into SRAM, do the discretization and the recurrence there, write only the (B, L, D) output back; (2) a work-efficient parallel (associative/Blelloch) scan replaces the sequential loop, since the recurrence, while not LTI, is still linear and associative; (3) recomputation: intermediate states are not saved for backward but recomputed when inputs reload, so memory matches a FlashAttention Transformer. Result: the scan beats FlashAttention-2 beyond 2K length and is 20-40x faster than a naive PyTorch scan.

**Mamba block.** Instead of interleaving an SSM block (H3-style) with an MLP block, Mamba fuses them into one homogeneous block, in the spirit of the gated attention unit: expand D by E=2 with input projections, a short causal conv1d plus SiLU on the main branch, the selective SSM, a multiplicative SiLU gate branch, then project back down. Two Mamba blocks match the 12D^2 parameter budget of one attention+MLP pair. Stack with RMSNorm and residuals; no attention, no separate MLP.

## Results

- **Synthetics**: S6 solves Selective Copying (~99.8% vs 18-57% for LTI variants) and Induction Heads with perfect extrapolation from train length 256 to 1M tokens (4000x); every baseline including attention collapses beyond ~2x train length.
- **Language**: first attention-free model to match a strong Transformer++ (LLaMA-recipe) on Pile scaling laws from 125M to 1.3B, with the gap favoring Mamba at 8K context. Mamba-2.8B beats Pythia-2.8B on every zero-shot task in the suite (avg 63.3 vs 59.1) and roughly matches models twice its size; Mamba-3B exceeds Pythia-7B on common-sense reasoning.
- **DNA and audio**: beats HyenaDNA and Transformer++ on human-genome pretraining with 3-4x fewer parameters; perplexity keeps improving out to 1M-token context while HyenaDNA degrades. On speech (SC09), a 6M-param Mamba beats much larger GAN and diffusion baselines.
- **Efficiency**: 4-5x higher inference throughput than a same-size Transformer (no KV cache, so much larger batches); linear-time training.
- **Ablations**: selective delta matters most (its RNN-gate role); increasing state size N from 1 to 16 costs ~1% parameters and buys over 1.0 perplexity, but only when B and C are selective. Real-valued diagonal A works fine for text; complex helps only for continuous modalities like audio.

## Why it matters

Mamba ended the era in which subquadratic meant worse: it showed that a pure recurrent model with input-dependent dynamics can match Transformer quality on language while training in linear time and inferring with O(1) state per step. The conceptual reframing stuck: sequence modeling is context compression, attention is the no-compression extreme (perfect recall, KV cache pain), RNNs are the full-compression extreme, and selectivity is the knob between them. The IO-aware kernel work also cemented the pattern (with FlashAttention) that architecture design and GPU memory-hierarchy design are now the same discipline.

Mamba-2 (2024) introduced state space duality (SSD), showing selective SSMs and masked attention are both special cases of structured semiseparable matrix transforms, which yields simpler, faster kernels built on matmuls and a clean bridge to attention theory. By 2025-26 the practical winner is the hybrid: interleave a minority of full-attention layers (for exact recall) with SSM or linear-attention layers (for cheap length). Production examples include AI21's Jamba line (Mamba + attention + MoE), NVIDIA's Nemotron-H family (Mamba-2 + attention, powering its Nano reasoning models), IBM Granite 4 (Mamba-2 hybrid), and Falcon-H1; frontier labs ship the same idea as linear or sliding-window hybrid layers to cut long-context prefill and KV-cache cost. Pure-SSM models remain rarer because exact long-range retrieval still favors having some attention, but the Mamba recurrence is now standard infrastructure for long context, edge inference, and non-text sequences (DNA, audio, time series, vision backbones).

## Connections

- [2017-06_attention-is-all-you-need](../2017-06_attention-is-all-you-need/): the architecture Mamba positions itself against; Mamba trades exact-recall KV cache for compressed recurrent state.
- [2022-05_flashattention](../2022-05_flashattention/): same author (Dao) and same IO-aware philosophy; the selective scan kernel is the SSM analogue of FlashAttention's tiling and recomputation.
- [2023-09_vllm-pagedattention](../2023-09_vllm-pagedattention/): attacks the KV-cache cost at serving time that Mamba removes architecturally.
- [2024-01_mixtral](../2024-01_mixtral/): MoE, the other big efficiency axis; hybrids like Jamba and Nemotron-H combine both.
- Topics: [ml-fundamentals](../../topics/ml-fundamentals/) (sequence-model history), [llms](../../topics/llms/) (architecture landscape, hybrid models), [inference-and-serving](../../topics/inference-and-serving/) (KV cache, throughput), [cuda-and-gpu-programming](../../topics/cuda-and-gpu-programming/) (kernel fusion, parallel scan, memory hierarchy).
