# OpenAI: GPT family

⏱ 9 min read · +2h 40m resources

Last updated: 2026-08-31 (explanation pass: every named model, architecture and acronym below now says what it is and what it changes; time estimates added). Per-model files to follow; this page maps the family.

## Best resources

- [GPT-5.6 announcement](https://openai.com/index/gpt-5-6/) (10 min): current flagship line, the three tiers and how OpenAI positions them against each other.
- [OpenAI model release timeline](https://hidekazu-konishi.com/entry/openai_gpt_model_release_timeline.html) (~20 min): the cleanest dated lineage of every GPT/o/Codex release. Use it as a reference table, not a read.
- [Learning to reason with LLMs](https://openai.com/index/learning-to-reason-with-llms/) (12 min): the o1 post that started the reasoning era. Read it for one claim: accuracy scales with RL training compute and, separately, with how long the model is allowed to think at inference.
- [gpt-oss model card](https://openai.com/index/introducing-gpt-oss/) (15 min): the only architecture disclosure OpenAI has made since GPT-2.
- [GPT-3 paper](https://arxiv.org/abs/2005.14165) (~1h 30m) and repo summary: where the scaling bet was proven. It is 75 pages and mostly evaluation tables; the first 25 pages carry the argument.

## Lineage

**GPT-1, GPT-2, GPT-3 (2018-2020): the scaling bet.** All three are decoder-only transformers trained on plain next-token prediction, and what is interesting is how little changed between them other than size and data. GPT-2 (1.5B) showed that one unsupervised objective produced usable zero-shot behaviour on tasks nobody trained for. GPT-3 (175B, dense, meaning every parameter participates in every token) established **in-context learning**: you specify a task by putting examples in the prompt, with no gradient update at all. That single property is what turns one served checkpoint into a general product, and it is why the paper is called "Language models are few-shot learners". GPT-3 also anchored the scaling-law era, in which loss moves predictably with compute, so the research question shifted from architecture search to how to allocate a compute budget.

**InstructGPT and ChatGPT (2022): the post-training stack.** A pretrained base model completes text; it does not follow instructions, because nothing in the objective asked it to. InstructGPT introduced the three-stage recipe that the whole field still uses. First, supervised fine-tuning on human-written demonstrations. Second, a **reward model**: a copy of the network with a scalar head, trained on human rankings of pairs of outputs, so preference becomes a differentiable score. Third, **RLHF (Reinforcement Learning from Human Feedback)**, in practice PPO, optimising the policy against that reward model with a KL penalty back toward the SFT checkpoint to stop it drifting into degenerate text that scores well and reads badly. The result that changed the field: a 1.3B InstructGPT was preferred by humans to the 175B base model, which reframed alignment as a way to gain capability rather than a tax on it.

**GPT-4 to GPT-4o (2023-2024): multimodality and unit cost.** GPT-4 (Mar 2023) was the first frontier release whose report disclosed essentially nothing about parameters, architecture or data, and the first shipped with a long system card documenting a refusal policy as a product surface. Its practical contribution was reliability on long-form reasoning plus image input. GPT-4 Turbo cut price and lengthened context. **GPT-4o** ("omni", May 2024) put audio and vision into one model instead of pipelining speech recognition, a text model and speech synthesis, which is what collapsed voice latency to conversational range and made interruption, tone and non-speech audio cues possible at all. GPT-4.1 (Apr 2025) was an API-only line tuned for long-context and instruction-following workloads rather than for chat.

**The o-series (Sep 2024 onward): buying accuracy with inference compute.** o1, o3 and o4-mini are trained with large-scale RL on problems whose answers can be checked automatically, so the reward is correctness rather than a human's preference. What the model learns is to emit a long internal **chain of thought** before answering, and the learned behaviour looks like search: it backtracks, checks its own steps, and reframes a problem that is not working. Two things are distinctive. The chain of thought is hidden from the API caller but billed as reasoning tokens, so accuracy became a per-request purchase. And accuracy rises with the thinking budget, which added a second scaling axis, inference compute, alongside pretraining compute. Everything in the family after this point is organised around managing that axis.

**GPT-5 (Aug 2025): routing as architecture.** GPT-5's signature is a system, not a network: a fast non-reasoning model, a reasoning model, and a real-time router that decides per request how much thinking to spend. That is an economic decision expressed as architecture, because most traffic does not need reasoning and reasoning tokens dominate cost when it is applied indiscriminately. GPT-5.1 (Nov 2025) split the two sides back out as Instant and Thinking after users objected to being routed opaquely and unpredictably; GPT-5.5 followed. The **Codex** variants (GPT-5-Codex, GPT-5.1-Codex-Max) are the same line post-trained for long-horizon agentic coding: tuned to run for hours inside a harness, calling tools, reading diffs and recovering from failed edits, rather than to produce a good answer in one shot.

**GPT-5.6 (Jul 2026): the current family.** Three tiers, named rather than numbered. **Sol** takes the hardest work and is the line's workhorse and best coding model; **Terra** is the balanced tier; **Luna** is the fast and cheap one. All three share a 1.05M-token context window and a 128K maximum output. API pricing per 1M tokens: Sol $5/$30, Terra $2.50/$15, Luna $1/$6. The bare `gpt-5.6` alias routes to Sol.

- Added 2026-08-24: OpenAI cut GPT-5.6 Sol developer pricing by more than 20% (announced Aug 21, in effect until at least Nov 21), days after OpenRouter cut its Sol pricing by 50%; separately, Roboflow's evaluation calls Sol the best vision model OpenAI has shipped. [Reuters](https://www.reuters.com/technology/openai-cuts-developer-pricing-frontier-gpt-56-sol-model-by-more-than-20-2026-08-21/) (4 min), [Roboflow](https://blog.roboflow.com/openai-gpt-5-6/) (8 min)

**gpt-oss-120b and gpt-oss-20b (Aug 2025): the one open window.** The first open weights since GPT-2, Apache 2.0 licensed, and the only place OpenAI's actual design choices are visible. Both are **MoE (Mixture of Experts)** models, where the feed-forward block is replaced by many expert FFNs of which a router selects a few per token, so total parameters and per-token compute decouple: 120b holds 117B parameters and activates roughly 5.1B per token, 20b holds 21B and activates 3.6B. They ship **MXFP4**-native, a 4-bit microscaled float format in which a small block of values shares one exponent scale; the expert weights are trained and released in it rather than quantised afterwards, which is why 120b fits on a single 80GB card and 20b fits in 16GB with no quality cliff from post-hoc compression. Reasoning effort is set in the system prompt (low, medium, high) instead of by shipping separate checkpoints. The attention stack is conventional modern practice, which is itself the useful signal about what OpenAI considers settled: **GQA (Grouped-Query Attention)**, where several query heads share one key/value head so the KV cache shrinks by the sharing factor at almost no quality cost; **RoPE (Rotary Position Embedding)** extended with **YaRN**, which rescales the rotation frequencies by wavelength so a model trained at short context extrapolates to long ones with a short fine-tune instead of a retrain; alternating sliding-window and full-attention layers, so most layers cost attention linear in sequence length and only a minority pay the quadratic price; no QK-norm (normalising queries and keys before the dot product, a common large-scale stability trick, which this recipe evidently does not need); and learned **attention sinks**, per-head bias logits that give the softmax somewhere to dump probability mass when no token deserves it, which is what keeps long-context and streaming generation from degenerating.

## Training approach highlights

**What is public.** Frontier data is not. The pillars that are known: very large web crawl plus licensed corpora, heavy use of synthetic data (model-generated training data filtered and graded by other models), and the RLHF family applied at a scale nobody else had in the early years.

**RLVR and deliberative alignment.** The o-series and GPT-5 lines are trained with large-scale **RLVR (Reinforcement Learning from Verifiable Rewards)**: RL on tasks where a program decides whether the answer is right, such as maths with a checker or code with a test suite. Because the grader is code rather than a learned reward model, it cannot be gamed by writing text that a judge finds persuasive, which is what let RL run far longer without reward hacking than RLHF ever could. On top of that sits **deliberative alignment**: the model is trained to reason explicitly over a written safety specification before answering, so a refusal is the outcome of reasoning about a rule rather than a memorised reflex to surface features of the prompt. The practical effect is that jailbreak resistance and overrefusal improve together, which they normally trade off against.

**The router as the family's system design.** The fast model plus reasoning model plus real-time depth selection is the one architectural idea OpenAI talks about openly, and current efficiency messaging leads with fewer thinking tokens for the same score. Read that as a claim about cost per solved task rather than about benchmark ceilings; it is the metric that matters once accuracy is something you buy per request.

**Architecture visibility.** Flagship weights are closed and dense-versus-MoE is unconfirmed, though MoE is assumed universally given the pricing and latency structure. gpt-oss is the only window, and it looks like a conventional modern MoE, which suggests the flagships differ from public practice in data, RL and scale rather than in block design.

## Current models (Aug 2026)

| Model | Role | Notes |
|---|---|---|
| GPT-5.6 Sol | Flagship reasoning/coding | SOTA-competitive across coding, knowledge work, cyber, science; AA index ~61 |
| GPT-5.6 Terra | Balanced default | ChatGPT mainline |
| GPT-5.6 Luna | Fast/cheap | High-volume and latency-sensitive |
| Codex line | Agentic coding | Drives Codex CLI/cloud agents |
| gpt-oss 120b/20b | Open weights | Apache 2.0, runs on 80GB/16GB respectively |

The **AA index** in that table is the Artificial Analysis Intelligence Index, a composite of a fixed public benchmark suite covering reasoning, maths, code and knowledge, published on one 0-100 scale. It is useful for coarse cross-lab ranking and useless for deciding whether a model suits a specific workload, because the mixture is theirs and not yours.

Position: still the largest consumer distribution by a wide margin (ChatGPT); on pure capability the top is shared with Anthropic (Opus 5 and Fable 5, the Mythos-class line) and contested by xAI's Grok 4.6 and Google's Gemini 3.1.

## Cross-links

- [../reasoning-models.md](../reasoning-models.md) for the o-series' role in test-time compute, and for how hidden chains of thought compare with Anthropic's budgeted, visible thinking.
- [../moe-models.md](../moe-models.md) for gpt-oss MoE configs alongside the other open sparse models.
- Rivals: [../anthropic/overview.md](../anthropic/overview.md), [../google-gemini/overview.md](../google-gemini/overview.md), [../xai-grok/overview.md](../xai-grok/overview.md).
