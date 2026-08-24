# OpenAI: GPT family

Last updated: 2026-08-24. Per-model files to follow; this page maps the family.

## Best resources

- [GPT-5.6 announcement](https://openai.com/index/gpt-5-6/): current flagship line and positioning.
- [OpenAI model release timeline](https://hidekazu-konishi.com/entry/openai_gpt_model_release_timeline.html): the cleanest dated lineage of every GPT/o/Codex release.
- [Learning to reason with LLMs](https://openai.com/index/learning-to-reason-with-llms/): the o1 post that started the reasoning era.
- [gpt-oss model card](https://openai.com/index/introducing-gpt-oss/): the open-weight offshoot's architecture details.
- [GPT-3 paper](https://arxiv.org/abs/2005.14165) and repo [summary](../../../papers/2020-05_gpt-3/summary.md): where the scaling bet was proven.

## Lineage

- **GPT-1/2/3 (2018-2020)**: decoder-only pretraining at scale; GPT-3 (175B dense)
  established in-context learning.
- **InstructGPT -> ChatGPT (2022)**: RLHF turned base models into assistants; OpenAI
  invented the modern post-training stack.
- **GPT-4 (Mar 2023) -> GPT-4 Turbo -> GPT-4o (May 2024)**: multimodal, cheaper, faster;
  4o added native voice. GPT-4.1 (Apr 2025) served long-context API workloads.
- **o-series (Sep 2024 - 2025)**: o1, o3, o4-mini; large-scale RL on hidden chain of
  thought, the first production reasoning models.
- **GPT-5 (Aug 2025)**: unified the fast and reasoning lines behind a real-time router
  that decides per request how much to think. GPT-5.1 (Nov 2025) split Instant/Thinking;
  GPT-5.5 followed; Codex variants (GPT-5-Codex, 5.1-Codex-Max) specialised for
  long-horizon agentic coding.
- **GPT-5.6 (Jul 2026)**: current family, three tiers named Sol (hardest work, the
  "workhorse" and best coding model), Terra (balanced), Luna (fast/cheap). All three:
  1.05M-token context, 128K max output. API pricing per 1M tokens: Sol $5/$30, Terra
  $2.50/$15, Luna $1/$6. The `gpt-5.6` alias routes to Sol.
  - Added 2026-08-24: OpenAI cut GPT-5.6 Sol developer pricing by more than 20%
    (announced Aug 21, in effect until at least Nov 21), days after OpenRouter cut its
    Sol pricing by 50%; separately, Roboflow's evaluation calls Sol the best vision
    model OpenAI has shipped.
    [Reuters](https://www.reuters.com/technology/openai-cuts-developer-pricing-frontier-gpt-56-sol-model-by-more-than-20-2026-08-21/),
    [Roboflow](https://blog.roboflow.com/openai-gpt-5-6/)
- **gpt-oss-120b / gpt-oss-20b (Aug 2025)**: first open weights since GPT-2; Apache 2.0
  MoE models (117B/5.1B active and 21B/3.6B active), MXFP4-native, adjustable reasoning
  effort, sliding-window + full attention interleave.

## Training approach highlights

- Little is public about frontier data; known pillars are massive web + licensed corpora,
  heavy synthetic data, and RLHF descendants at scale.
- The o-series/GPT-5 line is trained with large-scale RL on verifiable tasks plus
  deliberative alignment (reasoning over written safety specs during training).
- The router architecture (fast model + reasoning model + real-time depth selection) is
  the family's signature system design; efficiency messaging now leads with fewer
  thinking tokens for the same score.
- Closed weights, dense-vs-MoE unconfirmed for flagships (MoE assumed universally);
  gpt-oss is the only architectural window OpenAI has opened, and it looks like a
  conventional modern MoE (GQA, RoPE + YaRN, QK-norm-free, attention sinks).

## Current models (Aug 2026)

| Model | Role | Notes |
|---|---|---|
| GPT-5.6 Sol | Flagship reasoning/coding | SOTA-competitive across coding, knowledge work, cyber, science; AA index ~61 |
| GPT-5.6 Terra | Balanced default | ChatGPT mainline |
| GPT-5.6 Luna | Fast/cheap | High-volume and latency-sensitive |
| Codex line | Agentic coding | Drives Codex CLI/cloud agents |
| gpt-oss 120b/20b | Open weights | Apache 2.0, runs on 80GB/16GB respectively |

Position: still the largest consumer distribution (ChatGPT); on pure capability the top
is shared with Anthropic (Opus 5/Fable 5) and contested by Grok 4.6 and Gemini 3.1.

## Cross-links

- [../reasoning-models.md](../reasoning-models.md) for the o-series' role in test-time compute.
- [../moe-models.md](../moe-models.md) for gpt-oss MoE configs.
- Rivals: [../anthropic/overview.md](../anthropic/overview.md), [../google-gemini/overview.md](../google-gemini/overview.md), [../xai-grok/overview.md](../xai-grok/overview.md).
