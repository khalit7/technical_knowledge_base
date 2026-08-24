# Moonshot AI: Kimi

Last updated: 2026-08-24. Per-model files to follow; this page maps the family.

## Best resources

- [Kimi K2 tech report](https://arxiv.org/abs/2507.20534): MuonClip optimizer, agentic data synthesis, 1T-scale MoE training.
- [Kimi K3 overview (HF community)](https://huggingface.co/blog/ResterChed/kimi-k3-model-overview-mxfp4-quantization-open-wei): current flagship specs and MXFP4 details.
- [Kimi Linear paper](https://arxiv.org/abs/2510.26692): Kimi Delta Attention, the hybrid linear-attention design K3 productionised.
- [Moonshot HuggingFace org](https://huggingface.co/moonshotai): weights and model cards.
- [Interconnects on Kimi](https://www.interconnects.ai/): recurring deep coverage of Moonshot's role in open weights.

## Lineage

- **Kimi chat / K1.5 (2023-2025)**: long-context consumer assistant in China; K1.5 was
  an early RL reasoning model.
- **Kimi K2 (Jul 2025)**: breakout release: 1T total/32B active MoE (384 experts, 8
  active + 1 shared), MLA attention, trained on 15.5T tokens with **MuonClip** (Muon
  optimizer + qk-clip against logit explosions, zero loss spikes at 1T scale); modified
  MIT license. Best open agentic/coding model of its moment.
- **K2 Thinking (Nov 2025)**: reasoning variant with native INT4 quantization-aware
  training; interleaved thinking + tool calls over hundreds of steps; briefly ahead of
  closed flagships on HLE/BrowseComp-style agentic evals.
- **K2.5 / K2.6 / K2.7 Code (early 2026)**: multimodal (K2.5), then rapid capability
  and coding-focused updates (K2.6 Apr, K2.7 Code Jun).
- **Kimi K3 (Jul 2026)**: current flagship and the strongest open-weight model overall:
  2.8T total/104B active, **Stable LatentMoE** (896 experts, 16 active), **Kimi Delta
  Attention** (hybrid linear attention from Kimi Linear) plus **Attention Residuals**
  (selective cross-depth representation retrieval), 1M context, native vision, shipped
  as a native MXFP4 checkpoint under modified MIT. Reported 81.2 FrontierSWE, 88.3
  Terminal-Bench; second only to Fable 5 / GPT-5.6 Sol on GDPval-style rankings.

## Training approach highlights

- Optimizer research as an edge: Muon/MuonClip proved a non-AdamW optimizer at trillion
  scale and pushed token efficiency; widely copied since.
- Attention research productionised fast: Kimi Linear (KDA 3:1 hybrid) went from paper
  (Oct 2025) to flagship backbone (K3) in under a year.
- Agentic data synthesis + joint RL (verifiable rewards plus self-critique rubric
  rewards) for tool-use ability; thinking variants trained for interleaved reasoning.
- Low-precision-native releases (INT4, then MXFP4) so trillion-scale weights stay
  deployable; modified MIT license (attribution clause for very large deployments).

## Current models (Aug 2026)

| Model | Params | Notes |
|---|---|---|
| Kimi K3 | 2.8T / 104B active | Open frontier leader; 1M ctx, vision, MXFP4 |
| K2.7 Code | K2-scale | Coding specialist |
| K2 Thinking / K2.5 | 1T / 32B | Previous generation, still served |
| Kimi Linear 48B | research | KDA hybrid attention testbed |

## Cross-links

- [../moe-models.md](../moe-models.md): K2/K3 expert configs and sparsity trend.
- [../_comparisons/llm-architecture-gallery.md](../_comparisons/llm-architecture-gallery.md): KDA among the attention variants.
- Rivals: [../deepseek/overview.md](../deepseek/overview.md), [../qwen/overview.md](../qwen/overview.md), [../zhipu-glm/overview.md](../zhipu-glm/overview.md).
