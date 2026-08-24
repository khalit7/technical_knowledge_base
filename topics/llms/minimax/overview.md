# MiniMax

Last updated: 2026-08-24. Per-model files to follow; this page maps the family.

## Best resources

- [MiniMax-01 paper](https://arxiv.org/abs/2501.08313): lightning (linear) attention at 456B scale, the family's founding architecture bet.
- [MiniMax M1 paper](https://arxiv.org/abs/2506.13585): hybrid-attention reasoning + the CISPO RL algorithm.
- [MiniMax M3 launch coverage (Fireworks)](https://fireworks.ai/blog/minimax-m3-launch) and [M3 spec roundup (Morph)](https://www.morphllm.com/minimax-m3): current flagship.
- [MiniMax HuggingFace org](https://huggingface.co/MiniMaxAI): weights and tech reports.

## Lineage

- **MiniMax-Text-01 / VL-01 (Jan 2025)**: 456B/45.9B-active MoE with **lightning
  attention** (linear) in a 7:1 hybrid; first production-scale linear-attention LLM,
  4M-token context claim.
- **M1 (Jun 2025)**: open reasoning model on the same hybrid backbone; introduced
  **CISPO** (clipped importance-sampling policy optimization); ~$0.53M claimed RL cost.
- **M2 (Oct 2025)**: notable architecture reversal: dropped linear attention for full
  GQA (efficient-attention quality gaps at scale in reasoning/agentic regimes), 230B/10B
  active, positioned as the cheap fast agentic model; M2.5/M2.7 iterations followed.
- **M3 (Jun 2026)**: current flagship: 428B total/~22B active MoE, GQA backbone plus
  **MiniMax Sparse Attention (MSA)**, a block-sparse operator with a "KV outer gather Q"
  access pattern (finer-grained than DSA/MoBA); 1M-token context (512K guaranteed on
  their platform); first open model combining frontier-ish coding, 1M context, and
  native multimodality (text, image, video) in one system. Cheapest capable open
  frontier option.

## Training approach highlights

- The lab most willing to bet on attention architecture, and to publicly reverse when
  quality regressed: linear (01/M1) -> full (M2) -> learned sparse (M3). Their reports
  are the best documentation of *why* efficient attention is hard at frontier quality.
- RL innovations (CISPO) and cost transparency; ships weights with permissive licenses
  and very low API prices.
- Consumer-facing revenue (Talkie/Hailuo video, companion apps) funds the model line;
  Hong Kong IPO (2026) alongside Zhipu.

## Current models (Aug 2026)

| Model | Params | Notes |
|---|---|---|
| M3 | 428B / 22B active | 1M ctx, native multimodal, budget frontier pick |
| M2.x | 230B / 10B active | Fast cheap agentic workhorse |
| Hailuo video, speech models | n/a | Adjacent multimodal product lines |

## Cross-links

- [../_comparisons/llm-architecture-gallery.md](../_comparisons/llm-architecture-gallery.md): lightning/MSA among attention variants.
- [../moe-models.md](../moe-models.md).
- Rivals: [../zhipu-glm/overview.md](../zhipu-glm/overview.md), [../deepseek/overview.md](../deepseek/overview.md).
