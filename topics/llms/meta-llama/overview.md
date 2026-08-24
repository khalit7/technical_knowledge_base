# Meta: Llama and Meta Superintelligence Labs

Last updated: 2026-08-24. Per-model files to follow; this page maps the family.

## Best resources

- [Llama 3 paper](https://arxiv.org/abs/2407.21783) and repo [summary](../../../papers/2024-07_llama-3/summary.md): the most detailed open frontier training report ever published; still the reference for dense-at-scale.
- [Llama 4 announcement](https://ai.meta.com/blog/llama-4-multimodal-intelligence/): Scout/Maverick architecture details.
- [VentureBeat on Muse Spark](https://venturebeat.com/technology/goodbye-llama-meta-launches-new-proprietary-ai-model-muse-spark-first-since): the closed-source pivot.
- [Zuckerberg's superintelligence memo coverage](https://www.theverge.com/meta/717033/meta-superintelligence-labs-ai-mark-zuckerberg): MSL formation context.

## Lineage

- **Llama 1 (Feb 2023)**: research release (leaked), proved Chinchilla-style small-model
  overtraining; spawned the local-LLM ecosystem (llama.cpp).
- **Llama 2 (Jul 2023)**: first commercially licensed open weights + RLHF chat models.
- **Llama 3 / 3.1 (2024)**: dense 8B/70B/405B on 15T+ tokens; 405B was the first open
  model to approach GPT-4 class. 3.2 added vision and small on-device models; 3.3 70B
  distilled 405B quality.
- **Llama 4 (Apr 2025)**: pivot to MoE and native multimodality: Scout (109B/17B active,
  10M-token claimed context via iRoPE), Maverick (400B/17B active). Poorly received
  (benchmark-gaming controversy, weak real-world coding); the 2T Behemoth teacher never
  shipped.
- **Reorg (mid 2025)**: Meta Superintelligence Labs (MSL) formed under Alexandr Wang
  (Scale AI) after a $14B+ talent raid; TBD Lab took over frontier work; Llama's open
  roadmap stalled.
- **Muse Spark (Apr 2026)**: first MSL frontier model, *closed weights*, returning Meta
  to frontier-competitive performance at the cost of its open identity. Next up:
  "Avocado" (text/coding+reasoning LLM) and "Mango" (image/video), with talk of open
  releases of some variants but nothing frontier-open shipped since Llama 4.

## Training approach highlights

- Llama 3's report documented the full stack: data curation and dedup at 15T-token
  scale, annealing, scaling-law-driven mixture tuning, 16K-GPU training with FSDP/4D
  parallelism, DPO+PPO post-training. Required reading for practitioners.
- Llama 4 trained on ~30T multimodal tokens, early-fusion multimodality, FP8 compute,
  iRoPE (interleaved layers without positional encoding) for extreme context.
- MSL-era training details (Muse Spark, Avocado) are undisclosed.

## Current status (Aug 2026)

| Model | Status |
|---|---|
| Muse Spark | Closed frontier model, Meta AI products |
| Avocado / Mango | In development, H1-2026 targets slipped |
| Llama 4 Scout/Maverick | Last open weights; still widely served |
| Llama 3.x | Legacy but still the most-deployed open family by install base |

Strategic read: Llama's retreat handed open-weights leadership to China (DeepSeek, Qwen,
Moonshot, Zhipu) and Mistral; Llama 3.1/3.3 remain default bases in many fine-tuning
stacks purely through incumbency.

## Cross-links

- [../moe-models.md](../moe-models.md): Llama 4's MoE configs.
- Open-weights successors: [../deepseek/overview.md](../deepseek/overview.md), [../qwen/overview.md](../qwen/overview.md), [../mistral/overview.md](../mistral/overview.md).
