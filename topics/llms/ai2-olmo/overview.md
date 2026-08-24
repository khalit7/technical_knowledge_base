# Ai2: OLMo (fully open models)

Last updated: 2026-08-24. Per-model files to follow; this page maps the family.

## Best resources

- [OLMo 2 paper](https://arxiv.org/abs/2501.00656) and repo [summary](../../../papers/2025-01_olmo-2/summary.md): the fully open training-science reference.
- [Olmo 3 blog (Ai2)](https://allenai.org/blog/olmo3): the "model flow" release: data, code, every checkpoint, logs.
- [Interconnects: Olmo 3, America's truly open reasoning models](https://www.interconnects.ai/p/olmo-3-americas-truly-open-reasoning): insider context from the team.
- [Ettin paper](https://arxiv.org/abs/2507.11412): paired encoder/decoder suite trained on the OLMo 2 recipe; the cleanest encoder-vs-decoder controlled comparison.
- [Ai2 HuggingFace org](https://huggingface.co/allenai): all weights, data (Dolma), and tooling.

## Why this family matters

OLMo is the only frontier-adjacent line where *everything* is released: pretraining data
(Dolma), data tooling, training code, intermediate checkpoints, logs, and post-training
recipes (Tulu). It is the reference stack for understanding how models are actually
trained, and the base for reproducible research (e.g. Ettin, ladder-scaling studies).

## Lineage

- **OLMo 1 (Feb 2024)**: first fully open 7B; established the Dolma data pipeline.
- **OLMoE (2024)**: fully open small MoE (1B active).
- **OLMo 2 (Nov 2024 - Mar 2025)**: 7B/13B/32B on up to ~5-6T tokens; documented
  training-stability fixes (post-norm variant, QK-norm), two-stage curriculum with
  Dolmino annealing mix; 32B claimed first fully open model to beat GPT-3.5/GPT-4o-mini
  class. Tulu 3 post-training (SFT -> DPO -> RLVR) shipped alongside.
- **Molmo**: open VLM line proving small open multimodal can match much bigger closed
  models.
- **OLMo 3 (Nov 2025)**: the "model flow" release: Base/Instruct/**Think** at 7B/32B;
  first fully open 32B reasoning model with the entire RL pipeline (Dolci data, OlmoRL)
  public; Think 32B matched Qwen3-32B on math/code/reasoning with ~6x fewer training
  tokens.
- **OLMo 3.1 (2026)**: extended-RL Think 32B and Instruct 32B checkpoints, Ai2's most
  performant to date.
- **Ettin (Jul 2025, JHU collaboration)**: paired encoders and decoders (17M-1B) trained
  identically on the OLMo 2 recipe; shows encoders win MLM/retrieval, decoders win
  generation, and cross-objective continued training does not close the gap. Useful when
  choosing embedding vs generative backbones.

## Training approach highlights

- Radical transparency as the product: every claim reproducible; checkpoints per stage
  make it the standard testbed for interventions (data ablations, RL variants).
- Efficiency over scale: competitive quality at 6x fewer tokens via data curation
  (Dolma 3, Dolmino/Dolci mixes) and staged curricula.
- US-origin fully open matters politically: the Western answer to Chinese open weights
  for auditable government/regulated deployments.

## Current models (Aug 2026)

| Model | Notes |
|---|---|
| OLMo 3.1 Think/Instruct 32B | Best fully open reasoning/instruct models |
| OLMo 3 7B family | Small fully open workhorses |
| Molmo | Open VLM line |

## Cross-links

- Training science details belong to [topics/llm-training-and-post-training](../../../topics/llm-training-and-post-training/).
- [../reasoning-models.md](../reasoning-models.md): OLMo 3 Think as open replication.
- Papers: [OLMo 2](../../../papers/2025-01_olmo-2/summary.md), [Ettin](../../../papers/2025-07_ettin/summary.md).
