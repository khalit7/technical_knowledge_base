# Other notable providers

Last updated: 2026-08-24. Per-model files to follow; this page maps the long tail that
matters. One section per provider; promotion to its own folder happens if a line becomes
central.

## Best resources

- [Amazon Bedrock model catalog 2026](https://hidekazu-konishi.com/entry/amazon_bedrock_model_catalog_2026.html): the clearest view of Nova and the aggregator landscape.
- [Phi-4 tech report](https://arxiv.org/abs/2412.08905): the synthetic-data small-model recipe.
- [Cohere research](https://cohere.com/research): Command/Aya/North primary sources.
- [NVIDIA Nemotron pages](https://developer.nvidia.com/nemotron): hybrid Mamba-transformer production models.
- [LLM Architecture Gallery](https://sebastianraschka.com/llm-architecture-gallery/): covers most of the models below with fact sheets.

## Microsoft: Phi (and MAI)

Small-model specialists: Phi-1/2/3 proved "textbook-quality" synthetic + heavily filtered
data lets 3-14B models punch far above weight; Phi-4 (14B, Dec 2024) hit 84.8% MMLU and
beat much larger models on math, with Phi-4-mini (3.8B) and Phi-4-reasoning variants
following. Still the default local/edge dense family in 2026. Separately, Microsoft's MAI
team trains in-house frontier models (MAI-1 line) to reduce OpenAI dependence, while
Azure serves everyone's models. MIT-licensed weights.

## Amazon: Nova

Closed in-house family on Bedrock: Nova Micro/Lite/Pro/Premier (Dec 2024) plus
speech-to-speech (Sonic) and agentic browser (Act) lines; the Nova 2 generation
(Lite, Sonic, and siblings) is current, with Premier retired in favour of Nova 2 Lite.
Competent mid-tier, priced aggressively; strategically Amazon matters more as the
aggregator (Bedrock) and as Anthropic's compute partner (Trainium "Project Rainier")
than as a frontier lab.

## Cohere: Command, Aya, North

Enterprise-first: Command R/R+ pioneered RAG-grounded citation training; Command A
(Mar 2025, 111B dense) targets private-deployment agentic/multilingual enterprise work
on 2 GPUs. Cohere Labs' Aya line leads open multilingual research (Aya 23/Expanse/
Vision; Tiny Aya, Feb 2026, 3.35B, 70+ languages, phone-capable). North is the secure
agent platform; North Mini Code (Jun 2026, 30B-A3B MoE) is their first open agentic
coding model. The bet: data sovereignty and on-prem beats raw benchmark position.

## NVIDIA: Nemotron

Open models as GPU demand generation: Nemotron 3 Nano/Super/Ultra line; the Nano models
are **Mamba-2 hybrid** architectures (SSM blocks with sparse attention layers) cutting
KV cache from hundreds of KiB to a few KiB per token, ideal for high-throughput agents.
Also ships open post-training datasets and reward models (HelpSteer), and Llama-Nemotron
distills. See [Mamba paper](../../../papers/2023-12_mamba/summary.md).

## IBM: Granite

Granite 4 (2025-2026): small hybrid Mamba/transformer enterprise models (3B-32B,
Apache 2.0), ISO-certified governance story, strong function calling per size; the
"boring but deployable" option for regulated industries.

## Liquid AI: LFM

Non-transformer "liquid" architectures; LFM2/LFM2.5 target edge deployment with strong
per-FLOP quality; part of the broadening post-transformer fringe alongside SSM hybrids
and text-diffusion experiments.

## Other names worth recognising

- **Tencent Hunyuan, Baidu ERNIE, ByteDance Seed/Doubao, Ant Ling/Ring, StepFun,
  01.AI**: the rest of China's open/closed mix; Hunyuan and Seed-OSS ship competitive
  open weights, Doubao dominates Chinese consumer usage.
- **Arcee AI Trinity Large (400B, 2026)**: rare US startup open-weight frontier attempt.
- **Prime Intellect INTELLECT line**: decentralised training proofs of concept.
- **TII Falcon**: early open-weights pioneer, now including Falcon-H hybrid SSMs.
- **HuggingFace SmolLM3**: fully-documented small model, good NoPE/data reference.
- **Nous Research Hermes**: post-training specialists on open bases.
- **Reka, AI21 (Jamba SSM-hybrid), Upstage Solar**: niche but recurrent in evals.

## Cross-links

- [../summary.md](../summary.md) for where these sit in the overall taxonomy.
- [../_comparisons/llm-architecture-gallery.md](../_comparisons/llm-architecture-gallery.md): fact sheets for Nemotron, Granite, LFM, SmolLM3, Trinity.
