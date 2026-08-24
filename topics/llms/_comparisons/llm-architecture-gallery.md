# LLM Architecture Gallery (rasbt) and the architectural deltas that matter

Last updated: 2026-08-24.

## The resource

- **Gallery**: [sebastianraschka.com/llm-architecture-gallery](https://sebastianraschka.com/llm-architecture-gallery/), metadata repo at [github.com/rasbt/llm-architecture-gallery](https://github.com/rasbt/llm-architecture-gallery) (a `models.yml` of per-model fact sheets, Apache 2.0).
- **Companion article**: [The Big LLM Architecture Comparison](https://magazine.sebastianraschka.com/p/the-big-llm-architecture-comparison), the written walkthrough of the same material.

The gallery is a living side-by-side reference of 70+ open(-ish) model architectures with
a diagram per model plus a fact sheet: total/active parameters, decoder type (dense,
sparse MoE, dense/sparse *hybrid*), attention mechanism and layer mix, context length,
**KV-cache bytes per token** (its most useful headline number), positional encoding,
license, and links to configs/tech reports. Coverage runs from DeepSeek V3/V3.2/V4,
Kimi K2-K3, GLM-4.5-5, Qwen3-3.8, MiniMax M2-M3, Mistral Large 3, Llama 4, gpt-oss,
Gemma 3/4, down to OLMo, Phi-4, SmolLM3, and exotic entries (Nemotron 3 Nano, Kimi
Linear, INTELLECT-3).

Use it as the first stop whenever a new open model drops: the diagram plus KV-cache and
MoE numbers tell you 80% of what changed.

## Key architectural deltas across modern open models

The big picture: the GPT-2-style decoder transformer is still recognisably the skeleton;
almost all innovation since is memory and compute efficiency, concentrated in four areas.

### 1. Attention

- **MHA -> GQA**: share K/V heads across query-head groups; the 2023-2024 default
  (Llama 3/4, Qwen3, Gemma, gpt-oss).
- **MLA (multi-head latent attention)**: cache a low-rank latent of K/V and up-project on
  the fly; smaller cache than GQA and slightly better quality in DeepSeek's ablations
  (DeepSeek V2/V3/R1, Kimi K2).
- **Local/global mixing**: sliding-window layers interleaved with full-attention layers
  at ratios like 5:1 (Gemma 3) or 3:1; cuts KV cache with negligible quality loss.
- **Trained sparse attention**: select a top-k of KV blocks per query via a learned
  indexer (DeepSeek V3.2's DSA; V4's compressed CSA/HCA, which drops KV cache to ~2% of
  vanilla; MiniMax M3's MSA). This is what made 1M-token contexts economical in 2026.
- **Linear/hybrid attention**: Qwen3-Next's Gated DeltaNet and Moonshot's Kimi Delta
  Attention mix linear-attention layers with periodic full-attention layers (~3:1);
  Mamba-2 hybrids (NVIDIA Nemotron Nano, IBM Granite 4) push KV cache from ~hundreds of
  KiB to a few KiB per token. See [Mamba paper](../../../papers/2023-12_mamba/summary.md).

### 2. MoE configuration

Trend: few big experts (Mixtral 8x7B top-2, Grok 2's 8 experts) -> many small experts
with high sparsity and usually a shared expert (DeepSeek V3: 256 routed, 8 active + 1
shared; Kimi K2: 384; K3: 896 with 16 active; Qwen3: 128, no shared expert). Some models
keep the first blocks dense for stability (V3, GLM-4.5). Multi-token prediction (MTP)
heads are increasingly standard, mainly to feed speculative decoding. Details in
[../moe-models.md](../moe-models.md).

### 3. Normalisation

RMSNorm everywhere; the differences are placement and extras. Pre-norm is the default;
OLMo 2 uses a post-norm variant (inside the residual) for loss stability; Gemma 3 uses
both pre and post around each block. **QK-norm** (RMSNorm on queries and keys before
RoPE) spread from OLMo 2 / Gemma to most 2025+ models for attention-logit stability;
MiniMax M2 applies it per head.

### 4. Positional encoding

RoPE is near-universal; variants matter for long context: partial RoPE (rotate only a
fraction of head dims, better extrapolation), NoPE on a subset of layers (SmolLM3 every
4th layer; several 2026 models mix RoPE and NoPE across layers), Llama 4's iRoPE
(interleaved no-position global layers), plus YaRN-style scaling for context extension.

## How to read a new model card in 30 seconds

1. Total vs active params: sparsity ratio and serving memory floor.
2. Attention type + layer mix: quadratic, hybrid, or sparse; then
3. KV cache/token x target context: does long context actually fit?
4. Experts (routed, active, shared): routing style and EP requirements.
5. License and whether base (not just instruct) weights shipped.

## Cross-links

- [../summary.md](../summary.md): the provider taxonomy these architectures belong to.
- [../moe-models.md](../moe-models.md), [../reasoning-models.md](../reasoning-models.md).
- Papers: [DeepSeek-V3](../../../papers/2024-12_deepseek-v3/summary.md) (MLA + MoE template), [Mixtral](../../../papers/2024-01_mixtral/summary.md), [Switch Transformer](../../../papers/2021-01_switch-transformer/summary.md), [Llama 3](../../../papers/2024-07_llama-3/summary.md) (the dense counterpoint), [Qwen3](../../../papers/2025-05_qwen3/summary.md), [Mamba](../../../papers/2023-12_mamba/summary.md).
