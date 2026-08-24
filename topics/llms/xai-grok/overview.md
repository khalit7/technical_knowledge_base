# xAI / SpaceXAI: Grok

Last updated: 2026-08-24. Per-model files to follow; this page maps the family.

## Best resources

- [Grok (Wikipedia)](https://en.wikipedia.org/wiki/Grok_(chatbot)): maintained lineage and corporate history.
- [xAI news](https://x.ai/news): primary source for model releases.
- [VentureBeat on Grok 4.6](https://venturebeat.com/technology/spacexai-debuts-grok-4-6-overtaking-kimi-k3s-performance-and-matching-gpt-5-6-sol-for-worlds-third-best-on-artificial-analysis): current flagship positioning.
- [Grok 4.6 explainer (CometAPI)](https://www.cometapi.com/grok-4-6-release-date/): specs roundup.

## Lineage

- **Grok-1 (Nov 2023)**: built in months; 314B MoE, weights open-sourced Mar 2024
  (Apache 2.0), setting the pattern of open-sourcing previous generations.
- **Grok-1.5 / 2 (2024)**: caught up to GPT-4 class; Grok 2 weights released Aug 2025.
- **Grok 3 (Feb 2025)**: trained on Colossus (Memphis; ~200K H100s, built in 122 days),
  the loudest compute-maximalist bet; added Think mode and DeepSearch.
- **Grok 4 (Jul 2025)**: reasoning-first; Grok 4 Heavy ran parallel multi-agent
  test-time compute; topped ARC-AGI-2 and HLE at launch. Grok 4.1 (Nov 2025) and
  Grok 4.1 Fast (agentic, 2M context) followed; Grok Code Fast targeted coding.
- **Feb 2026**: xAI merged into SpaceX, forming **SpaceXAI** (~$1.25T combined
  valuation); Grok brand retained.
- **Grok 4.6 (Aug 12, 2026)**: current flagship: ~1.5T parameters, built for
  long-running agents, coding, knowledge work, and visual projects; AA intelligence
  ~61, tying GPT-5.6 Sol and overtaking Kimi K3, priced aggressively ($2/$6 per 1M).
- **Grok 5**: in training; target dates (late 2025, Q1, Q2 2026) all slipped.

## Training approach highlights

- Compute scale as the core strategy: Colossus 1/2 expansion toward 1M+ GPUs; fastest
  lab shipping cadence via brute-force iteration.
- Large-scale RL for reasoning (Grok 4 reportedly matched pretraining compute with RL
  compute); multi-agent parallel inference for Heavy tiers.
- Data edge: real-time X (Twitter) firehose integration; DeepSearch agentic browsing.
- Looser alignment posture than rivals; recurring moderation incidents are part of the
  brand's risk profile. Weights closed at the frontier, previous generations sometimes
  opened.

## Current models (Aug 2026)

| Model | Role |
|---|---|
| Grok 4.6 | Flagship; value pick among the frontier five ($2/$6) |
| Grok 4.1 Fast | Cheap agentic workhorse, 2M context |
| Grok Code Fast | Coding at volume |
| Grok 5 | In training, no date |

## Cross-links

- [../reasoning-models.md](../reasoning-models.md): Heavy-style parallel test-time compute.
- Rivals: [../openai/overview.md](../openai/overview.md), [../anthropic/overview.md](../anthropic/overview.md).
- Compute context: [topics/hardware](../../hardware/).
