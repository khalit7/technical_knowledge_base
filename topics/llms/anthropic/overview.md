# Anthropic: Claude family

Last updated: 2026-08-24. Per-model files to follow; this page maps the family.

## Best resources

- [Anthropic Claude release timeline](https://hidekazu-konishi.com/entry/anthropic_claude_model_release_timeline.html): dated family tree of every Claude release.
- [Claude model docs](https://docs.anthropic.com/en/docs/about-claude/models): current lineup, context windows, pricing.
- [Extended thinking docs](https://docs.anthropic.com/en/docs/build-with-claude/extended-thinking): budgeted and interleaved thinking, the family's signature API surface.
- [Constitutional AI paper](https://arxiv.org/abs/2212.08073): the alignment approach underneath every Claude.
- [Claude models explained (Toloka)](https://toloka.ai/blog/claude-models-explained/): tier-by-tier guide including the 2026 Fable/Mythos additions.

## Lineage

- **Claude 1/2 (2023)**: founded by ex-OpenAI safety leadership; Constitutional AI
  (RLAIF against a written constitution) instead of pure RLHF; early 100K context.
- **Claude 3 (Mar 2024)**: the three-tier naming (Haiku/Sonnet/Opus). Claude 3.5 Sonnet
  (Jun 2024) became the developer favourite and shipped computer use (Oct 2024).
- **Claude 3.7 Sonnet (Feb 2025)**: first *hybrid* reasoning model: one checkpoint,
  optional extended thinking with a user-set token budget.
- **Claude 4 (May 2025) -> 4.1 -> 4.5 wave (2025)**: Opus 4/4.1, Sonnet 4/4.5, Haiku 4.5;
  relentless agentic-coding focus (SWE-bench leadership, Claude Code), memory tools,
  1M-context beta, interleaved thinking between tool calls. Opus 4.5 (Nov 2025) closed
  the year on top of coding benchmarks.
- **2026, the Mythos class**: Fable 5 and Mythos 5 (June 2026) established a new tier
  *above* Opus; Fable 5 (Jun 9) is the generally available Mythos-class model. Sonnet 5
  landed end of June, Opus 5 on Jul 24 at near-Fable capability for half the price.

## Current lineup (Aug 2026)

| Model | Role | Context | Price (in/out per 1M) |
|---|---|---|---|
| Haiku 4.5 | Fast, cheap | 200K | $1/$5 |
| Sonnet 5 | Balanced default | 1M | $2/$10 |
| Opus 5 | Complex agentic work | 1M | $5/$25 |
| Fable 5 | Most capable (Mythos class) | 1M | $10/$50 |

Opus 5 leads public intelligence rankings (AA index ~63) with Fable 5 at ~62; Claude
holds the quality lead for agentic coding, while Fable 5 is the pick for writing and
creative work. All weights closed; architecture undisclosed.

## Training approach highlights

- Constitutional AI / RLAIF remains the alignment backbone, now combined with RLVR-style
  training for reasoning and heavy agentic RL (long-horizon tool-use environments).
- Extended thinking is budgeted (`budget_tokens`) and interleaved: the model reasons
  between tool calls with variable depth, which is why Claude harnesses (Claude Code)
  dominate long-horizon coding evals like SWE-bench and Terminal-Bench.
- Anthropic publishes unusually detailed system cards, alignment evaluations, and
  interpretability research (circuit tracing, introspection) rather than architecture.
- Revenue skews to API/enterprise and coding, versus OpenAI's consumer skew.

## Cross-links

- [../reasoning-models.md](../reasoning-models.md): extended/interleaved thinking in context.
- Rivals: [../openai/overview.md](../openai/overview.md), [../google-gemini/overview.md](../google-gemini/overview.md).
- Harness side: [topics/agentic-harnesses](../../agentic-harnesses/) for Claude Code.
