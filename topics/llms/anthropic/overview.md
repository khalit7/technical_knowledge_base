# Anthropic: Claude family

⏱ 7 min read · +2h 35m resources

Last updated: 2026-09-21 (Fable 5.1 and Mythos 5.1 folded into the lineage and the lineup table; the 2026-08-31 explanation pass made every named model, technique and acronym say what it is and what it changes). Per-model pages to follow; this page maps the family.

### Best resources

- [Anthropic Claude release timeline](https://hidekazu-konishi.com/entry/anthropic_claude_model_release_timeline.html) (~20 min): dated family tree of every Claude release. A reference table rather than a read.
- [Claude model docs](https://docs.anthropic.com/en/docs/about-claude/models) (docs, ~15 min for the core pages): current lineup, context windows, pricing, deprecation dates.
- [Extended thinking docs](https://docs.anthropic.com/en/docs/build-with-claude/extended-thinking) (docs, ~20 min for the core pages): budgeted and interleaved thinking, the family's signature API surface, including how thinking blocks must be passed back across tool calls.
- [Constitutional AI paper](https://arxiv.org/abs/2212.08073) (~1h 30m): the alignment approach underneath every Claude. Long, but the mechanism is in the first third.
- [Claude models explained (Toloka)](https://toloka.ai/blog/claude-models-explained/) (12 min): tier-by-tier guide including the 2026 Fable and Mythos additions.

### Lineage

**Claude 1 and 2 (2023): Constitutional AI.** Anthropic was founded by ex-OpenAI safety leadership, and its founding technical bet was that the expensive human-preference step in RLHF could be replaced by the model itself. **Constitutional AI** runs in two phases. In the supervised phase the model answers, then critiques its own answer against a written constitution (a short, public list of explicit principles) and rewrites it, and the rewritten answers become the fine-tuning data. In the RL phase, preference pairs are labelled by a model choosing which of two responses better satisfies those principles, giving **RLAIF (Reinforcement Learning from AI Feedback)** where RLHF would have used human rankings. What this buys is scale and auditability: preference data stops being the human bottleneck, and the values are a document you can read, diff and argue with rather than an aggregate of contractor judgements. What it costs is that the judge shares the model's blind spots, so the constitution has to carry the work that disagreement between humans used to. Claude 2 also shipped a 100K-token context well ahead of rivals, which is what made document-heavy work the family's early niche.

**Claude 3 (Mar 2024): the three-tier shape.** Haiku, Sonnet and Opus named a size, price and latency ladder produced from one training programme, and that shape is now the industry default. Claude 3.5 Sonnet (Jun 2024) became the developer favourite by beating the larger Opus on code, which was the first clear public demonstration that post-training and data quality had overtaken parameter count for coding. It also shipped **computer use** (Oct 2024): a tool loop in which the model receives screenshots and returns mouse and keyboard actions, the first production API for GUI agents, and the ancestor of the agentic evaluation work that followed.

**Claude 3.7 Sonnet (Feb 2025): hybrid reasoning.** Rather than ship a separate reasoning model, Anthropic put both modes in one checkpoint: the same weights either answer immediately or produce an extended chain of thought first, and the caller sets the **token budget** for that thinking on the request. This is the deliberate counter-design to OpenAI's router. The caller owns the cost and latency decision explicitly instead of delegating it to a classifier they cannot inspect, and because there is only one model there is no capability discontinuity between the fast and slow paths. The cost is that the caller now has to know when a task needs thinking.

**Claude 4 through the 4.5 wave (2025): agentic coding.** Opus 4 and 4.1, Sonnet 4 and 4.5, Haiku 4.5, all pointed at long-horizon tool use rather than single-turn answers. Concretely that meant three things. **Interleaved thinking**: the model reasons between tool calls, not only before the first one, so it can actually respond to what a command returned instead of committing to a plan made blind. **Memory tools**: file-backed notes the model writes and re-reads across a long session, so state survives beyond what fits in context. And a 1M-token context beta for the cases where it does fit. The evaluation target moved with the models, from single-answer benchmarks to SWE-bench (real GitHub issues, scored by whether the repository's own tests pass after the model's patch) and Terminal-Bench (multi-step tasks judged by end state in a real shell), both of which reward recovery from failure rather than first-try correctness. Opus 4.5 (Nov 2025) closed the year on top of the coding benchmarks.

**2026, the Mythos class.** Fable 5 and Mythos 5 (Jun 2026) established a tier above Opus, breaking the three-name ladder for the first time since Claude 3. Fable 5 (Jun 9) is the generally available Mythos-class model. Sonnet 5 landed at the end of June, and Opus 5 on Jul 24 at near-Fable capability for half the price, which is the pattern to expect: the top tier sets the frontier and the tier below absorbs it a quarter later at a fraction of the cost.

**Fable 5.1 and Mythos 5.1 (Sep 1, 2026): one model, two safeguard configurations.** A new packaging idea worth naming: one underlying model shipped twice, Fable 5.1 generally available with production safeguards and Mythos 5.1 the same model under more permissive ones, restricted to vetted cybersecurity and life-sciences organisations. The capability jump is concentrated in long-horizon agentic work: Terminal-Bench-Science 0.1 from 24.7% to 52.6%, Terminal-Bench 4.0 from 42.0% to 55.8%, AutomationBench from 17.1% to 31.4%, CursorBench 3.2.0 at 73.4%. The commercially significant change is a 75% cut to cached input, from $1.00 to $0.25 per million against $10 standard input, which is the line item that dominates any agent re-reading a large prefix every turn. A new Enterprise Frontier Safeguards architecture gives customers custody of their own data. [Anthropic](https://www.anthropic.com/claude-fable-and-mythos-5-1) (6 min), [VentureBeat](https://venturebeat.com/technology/anthropics-claude-fable-5-1-and-mythos-5-1-arrive-with-a-75-cost-reduction-for-fable-cache-reads) (8 min)

### Current lineup (Sep 2026)

| Model | Role | Context | Price (in/out per 1M) |
| --- | --- | --- | --- |
| Haiku 4.5 | Fast, cheap | 200K | $1/$5 |
| Sonnet 5 | Balanced default | 1M | $2/$10 |
| Opus 5 | Complex agentic work | 1M | $5/$25 |
| Fable 5.1 | Most capable (Mythos class); Mythos 5.1 is the same model under permissive safeguards for vetted organisations | 1M | $10/$50, cached input $0.25 |

As of August 2026 Opus 5 led public intelligence rankings (AA index ~63) with Fable 5 at ~62; Fable 5.1 has since taken the lead on long-horizon agentic evaluations, and Real-SWE, the private-codebase benchmark, put it first at 38.8% in September 2026. The **AA index** is the Artificial Analysis Intelligence Index, a composite of a fixed public benchmark suite over reasoning, maths, code and knowledge, reported on one 0-100 scale; treat it as a coarse cross-lab ranking, since the mixture is theirs rather than yours. Claude holds the quality lead for agentic coding, while Fable 5 is the pick for writing and creative work. All weights are closed and the architecture is undisclosed.

### Training approach highlights

**Alignment backbone, plus verifiable rewards.** Constitutional AI and RLAIF remain the base, now combined with **RLVR (Reinforcement Learning from Verifiable Rewards)** for reasoning, where the reward comes from a program that checks the answer (a test suite, a maths grader) rather than from a learned preference model, so it cannot be gamed by producing text a judge likes; and with heavy **agentic RL**, where an episode is a whole task inside a sandboxed environment with real tools and the reward depends on whether the task ended up done. That last one is the expensive part and the likeliest source of the family's agentic lead: the environments, not the objective, are the moat.

**Extended thinking, budgeted and interleaved.** The API takes a `budget_tokens` value that caps the thinking block, and thinking can be interleaved between tool calls with variable depth per step. Two practical consequences for anyone building a harness. Cost per task becomes a dial you set rather than a number you discover, and the thinking blocks must be passed back into subsequent requests to preserve the reasoning chain across tool calls, which is a real constraint on how you build context management. This is why Claude-based harnesses such as Claude Code do well on long-horizon coding evals like SWE-bench and Terminal-Bench: the model is designed to think again after every observation.

**What Anthropic publishes.** Unusually detailed system cards, alignment evaluations and interpretability research, and almost nothing about architecture. The interpretability line is worth knowing by name: **circuit tracing** replaces the model's MLP layers with sparse, human-readable feature approximations and then traces which features actually drove a given output, producing an attribution graph for a single behaviour; the introspection work tests whether a model can accurately report on its own internal states. The practical asymmetry for a practitioner is that you can learn a great deal about what these models do and essentially nothing about how they are built.

**Business shape.** Revenue skews to API, enterprise and coding, against OpenAI's consumer skew, which explains the product priorities: agentic tooling, long context and reliability over voice, image generation and consumer surface area.

### Cross-links

- [Reasoning models and test-time compute](../reasoning-models.md): extended and interleaved thinking in context, and how caller-set budgets compare with OpenAI's hidden router.
- Rivals: [OpenAI: GPT family](../openai/overview.md), [Google DeepMind: Gemini and Gemma](../google-gemini/overview.md).
- Harness side: [Topic: agentic-harnesses](../../agentic-harnesses/summary.md) for Claude Code, where the interleaved-thinking and memory-tool behaviour above actually gets used.
