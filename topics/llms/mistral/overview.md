# Mistral AI

Last updated: 2026-08-24. Per-model files to follow; this page maps the family.

## Best resources

- [Mixtral paper](https://arxiv.org/abs/2401.04088) and repo [summary](../../../papers/2024-01_mixtral/summary.md): the release that mainstreamed open MoE.
- [Mistral news page](https://mistral.ai/news): primary source; releases come fast and thinly documented elsewhere.
- [Mistral release timeline (BenchLM)](https://benchlm.ai/model-updates/providers/mistral): dated list of all 30+ releases.
- [Mistral models 2026 guide (Serenities)](https://serenitiesai.com/articles/mistral-ai-models-2026-complete-guide): current catalogue walkthrough.

## Lineage

- **Mistral 7B (Sep 2023)**: outperformed Llama 2 13B; sliding-window attention + GQA;
  instantly the default small base.
- **Mixtral 8x7B (Dec 2023) / 8x22B (2024)**: open sparse MoE (top-2 of 8 experts),
  13B-active quality matching much larger dense models; Apache 2.0.
- **2024-2025 diversification**: Mistral Large 1/2 (closed-ish flagship), Small 3.x,
  Medium 3, Codestral (code), Ministral (edge), Pixtral (vision), Voxtral (audio),
  **Magistral** (Jun 2025, Europe's first reasoning model line), **Devstral** (agentic
  coding, SWE-bench-focused small models).
- **Mistral Large 3 (Dec 2025)**: current flagship: the largest open-weight MoE from a
  Western lab, Apache 2.0, frontier-class; the license made it the most permissive
  frontier-adjacent model anywhere.
- **2026**: Small 4 (Mar), Medium 3.5 (Apr), Devstral 2 123B + Devstral Small 2 24B
  (Dec 2025), Shieldstral (3B multimodal safety classifier, Apache 2.0), Robostral
  (robotics/physical AI push), plus a new open-weight frontier model in July early
  access aimed at closing the gap to the top five.

## Training approach highlights

- Punches above its compute class via aggressive distillation, data quality, and MoE;
  publishes weights first, papers occasionally.
- Apache 2.0 as strategy: enterprise/sovereign deals (EU governments, defence, on-prem)
  where permissive licensing and EU jurisdiction beat raw benchmark position.
- Full-stack pivot 2025-2026: Le Chat consumer app, La Plateforme, Mistral Compute
  (sovereign AI infra with Nvidia), robotics models; ~$14B valuation with ASML as
  anchor investor.
- Magistral documented its RLVR recipe (pure RL on their own models, no distillation
  from larger reasoners).

## Current models (Aug 2026)

| Model | Role |
|---|---|
| Mistral Large 3 | Open-weight flagship MoE (Apache 2.0) |
| Medium 3.5 / Small 4 | Price-performance tiers |
| Magistral line | Reasoning |
| Devstral 2 / Small 2 | Agentic coding (open) |
| Codestral, Pixtral, Voxtral, Ministral | Code / vision / audio / edge specialists |
| Shieldstral, Robostral | Safety classifier, robotics |

Position: not a top-five frontier lab on capability, but the leading Western open-weight
provider post-Llama and the EU's strategic champion.

## Cross-links

- [../moe-models.md](../moe-models.md): Mixtral's top-2 routing as the classic design.
- [../meta-llama/overview.md](../meta-llama/overview.md): the open-weights mantle it inherited.
