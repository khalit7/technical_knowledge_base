# Z.ai (Zhipu): GLM

⏱ 8 min read · +3h resources

Last updated: 2026-08-31 (rewritten: ARC, the architecture choices and the RL stack are now explained rather than named). Per-model pages to follow; this page maps the family.

### Best resources

- [GLM-4.5 tech report](https://arxiv.org/abs/2508.06471) (~1h 30m): the ARC (agentic, reasoning, coding) design brief and training stack.
- [Z.ai blog](https://z.ai/blog) (docs, ~30 min for the recent release posts): primary source for GLM-5.x releases.
- [Z.ai (Wikipedia)](https://en.wikipedia.org/wiki/Z.ai) (~10 min): corporate lineage from Tsinghua's ChatGLM to today.
- [GLM-5.2 analysis (Labellerr)](https://www.labellerr.com/blog/glm-5-2-open-weight-ai-model/) (~15 min): current flagship vs closed rivals.
- [Z.ai HuggingFace org](https://huggingface.co/zai-org) (docs, ~15 min for the flagship model cards): MIT-licensed weights.

### ARC: what the design brief actually commits to

**ARC** is [Z.ai](http://z.ai/)'s name for building one model that is simultaneously good at three things that usually pull apart: **agentic** behaviour (long-horizon tool use, browsing, staying coherent over hundreds of steps), **reasoning** (deliberate multi-step problem solving), and **coding**. The reason this is a design brief and not marketing is that the three genuinely conflict in post-training. Heavy reasoning training pushes a model to deliberate before answering, which costs latency and can degrade instruction following; agentic training rewards short decisive actions and tool calls rather than long internal monologue; coding wants exact, formatted, non-chatty output. The usual industry answer is separate specialised checkpoints, which is operationally expensive for the customer.

GLM's answer is a single set of weights with hybrid thinking modes, meaning the caller selects deliberate or direct behaviour through the prompt template rather than by loading a different model, plus a post-training pipeline that trains the three capability families and then reconciles them (train specialists, then unify) rather than hoping one mixed run balances them. What it buys is one deployment covering an entire agentic workload. What it costs is the same thing Alibaba conceded when it split Qwen3-2507 back into Instruct and Thinking checkpoints: a unified model tends to give up a little at the top end of each mode.

### Architecture: a conventional MoE, with deliberate shape choices

GLM-5.2 is a 744B-total, roughly 40B-active mixture of experts, and GLM-5.3-Flash a 320B/18B one; the ratio (about 1 in 18 parameters active) is the standard modern bet that quality tracks total parameters while decode speed tracks active parameters. Several of the choices around that are worth naming because they are deliberate and were reported as such.

**Dense-first blocks.** The first layers are ordinary dense feed-forward layers rather than MoE, a pattern GLM shares with DeepSeek. Early layers compute generic, low-level features that every token needs, so routing them buys little specialisation while adding real risk: routers are least stable early in the network and early in training, and a bad early routing decision propagates through the whole stack.

**Depth over width, and more attention heads.** The GLM-4.5 report describes preferring a deeper, narrower model to a shallower, wider one at fixed parameter count, and using more attention heads than the hidden size would conventionally imply. Their reported finding is the interesting part: the extra heads did not improve pretraining loss but did improve reasoning benchmarks, which is a reminder that loss is a proxy, not the objective, and that architecture choices can buy capability that the loss curve does not show.

**MTP (multi-token prediction) layers.** Extra lightweight heads predict more than one future token during training. That gives a denser supervision signal per forward pass, and at inference the same heads serve as a built-in draft model for speculative decoding, so you get the speedup without training and hosting a separate draft model. For a lab whose entire strategy is price, a free multiple on decode throughput is directly a margin.

**Muon-family optimizers.** Muon replaces AdamW's per-parameter second-moment rescaling with an update that orthogonalises the momentum matrix (a few Newton-Schulz iterations) before applying it, so the step pushes across the whole spectrum of directions instead of being dominated by a few. It buys better loss per token and a smaller optimizer state; it costs a few extra matmuls per step and a much shorter safety record than AdamW, which is why Moonshot's qk-clip work on taming its instabilities matters to everyone adopting it.

### slime: RL infrastructure built for the agentic case

[Z.ai](http://z.ai/) open-sourced **slime**, their RL training system, and it is arguably as strategically important as the weights. The problem it exists to solve: in agentic RL, a single rollout is an entire episode of tool calls, and episode lengths are wildly long-tailed. One trajectory might take three tool calls and another three hundred. Classic synchronous on-policy RL has to wait for the whole batch of rollouts to finish before the training step, so the accelerators sit idle waiting for the slowest trajectory, and utilisation collapses exactly when episodes get interesting.

slime decouples the two: a rollout engine generates trajectories continuously into a buffer, and the trainer consumes them without waiting for the batch to complete. The cost is staleness, since the data was generated by a slightly older policy than the one being updated, which makes the update off-policy and requires importance correction or a bounded staleness window to stay stable. The benefit is that GPU utilisation stops being hostage to the longest episode, which is what makes agentic RL affordable enough to run at the cadence [Z.ai](http://z.ai/) runs it. This is the same architectural lesson as prefill/decode disaggregation in serving: when two coupled phases have different profiles, decouple them and buffer between.

### The pricing strategy is the product

From GLM-4.6 onward the commercial move has been to put frontier-class open weights under MIT (the most permissive licence in common use: use, modify, redistribute, sell, with only attribution) and then undercut everyone on hosted price. The **GLM Coding Plan** at roughly $3/month is the sharpest version: it exposes an endpoint that is API-compatible with Claude Code, so an existing agentic coding setup switches to it by changing a base URL and a key rather than by rewriting a harness. The target is not really benchmark leadership, it is the economics of the subscription products the model is being pointed at.

GLM-5.3-Flash extends that to multimodal: list pricing of $0.15 per million input tokens and $0.50 per million output is roughly a tenth of GLM-5.2, at a claimed improvement over it, with weights on Hugging Face under MIT. The strategic argument, and it is the same one they have been making for a year, is that a paid multimodal API tier is hard to defend against a model of that class that anyone can download and serve themselves.

The **Ox Alpha** episode is worth remembering as a pattern rather than a fact about one model: GLM-5.3-Flash was on evaluation platforms as an unattributed stealth model the week before launch, collecting third-party scores from people who did not know whose model they were rating, and was claimed once the numbers were in. Anonymous pre-release evaluation removes brand effects from human preference voting, and it also means a disappointing run can simply never be claimed, so treat "topped the arena as a stealth model" as a number selected after the fact.

### Lineage

- **ChatGLM-6B / GLM-130B (2022-2023)**: Tsinghua KEG spinoff. GLM-130B was one of the first open bilingual 100B models, and ChatGLM-6B, small enough to fine-tune and run locally, seeded China's local-LLM scene.
- **GLM-4 (2024)**: commercial catch-up generation, first agentic features.
- **GLM-4.5 (Jul 2025)**: repositioned around **ARC** in one model: 355B/32B MoE plus a 106B Air variant, hybrid thinking modes, MIT license. The moment GLM became a serious open contender, and the tech report is the best single document on this line.
- **GLM-4.6 (Oct 2025) / 4.7 (late 2025)**: coding-focused iterations; the GLM Coding Plan (~$3/month, Claude Code-compatible endpoint) made it the value option for agentic coding and a genuine competitive lever.
- **GLM-5 (early 2026)**: ~745B-parameter generation targeting frontier parity.
- **GLM-5.2 (Jun 2026)**: current open flagship: 744B total / ~40B active MoE, 1M-token context, MIT license. Beat GPT-5.5 on FrontierSWE (an agentic software-engineering benchmark scored by whether the produced patch actually passes tests) at roughly one sixth the cost; topped the open-weight division of the Artificial Analysis index (a composite of several public benchmarks) and led Design Arena and frontend-code arenas, which are human preference votes on generated interfaces.
- **GLM-5.3 (Aug 14, 2026)**: incremental update, reported as roughly 6x coding gains over 5.2 from post-training alone, with no architecture change, and a claimed #1 on CyberGym (an agentic security benchmark) at 84.5%.
- **GLM-5.3-Flash (Aug 26, 2026)**: added 2026-08-31. The line's first natively multimodal model and its most strategically aggressive release. 320B total / 18B active MoE, 1,048,576-token context, image *and video* input with text output, MIT licence, weights on Hugging Face. [Z.ai](http://z.ai/) claims it beats GLM-5.2 across its own evaluation suite while costing roughly a tenth as much: list pricing $0.15 input / $0.50 output per million tokens, with a $0.075 input promotion running to Sep 9. It had been on evaluation platforms the week before as the unattributed stealth model **Ox Alpha**. [Announcement](https://docs.z.ai/release-notes/new-released) (~10 min), [SiliconANGLE](https://siliconangle.com/2026/08/26/z-ai-open-sources-ox-alpha-model-as-glm-5-3-flash/) (~10 min)
- Corporate: IPO'd in Hong Kong (2026) as the "first LLM stock" wave hit China, which is context for the pricing aggression: market share now is the story being sold.

### Current models (Aug 2026)

| Model | Params | Notes |
| --- | --- | --- |
| GLM-5.3 / GLM-5.2 | 744B / 40B active | Open-weight quality leader per AA v4.x, MIT, 1M ctx |
| GLM-5.3-Flash | 320B / 18B active | Natively multimodal (image + video in), 1M ctx, MIT, $0.15/$0.50 per Mtok; shipped Aug 26 2026, ex-"Ox Alpha" |
| GLM-4.7-Air class | ~100B | Cheap self-hostable tier |
| GLM Coding Plan | service | Claude Code-compatible agentic coding value play |

### Cross-links

- [Mixture-of-Experts (MoE) models](../moe-models.md), [Reasoning models and test-time compute](../reasoning-models.md).
- Direct rivals: [DeepSeek](../deepseek/overview.md), [Moonshot AI: Kimi](../moonshot-kimi/overview.md), [MiniMax](../minimax/overview.md).

<details>
<summary>2026-08-31: previous version of this page (superseded)</summary>

Last updated: 2026-08-31. Per-model files to follow; this page maps the family.

Best resources: [GLM-4.5 tech report](https://arxiv.org/abs/2508.06471): the ARC (agentic, reasoning, coding) design brief and training stack. [Z.ai blog](https://z.ai/blog): primary source for GLM-5.x releases. [Z.ai (Wikipedia)](https://en.wikipedia.org/wiki/Z.ai): corporate lineage from Tsinghua's ChatGLM to today. [GLM-5.2 analysis (Labellerr)](https://www.labellerr.com/blog/glm-5-2-open-weight-ai-model/): current flagship vs closed rivals. [Z.ai HuggingFace org](https://huggingface.co/zai-org): MIT-licensed weights.

Lineage: **ChatGLM-6B / GLM-130B (2022-2023)**: Tsinghua KEG spinoff; GLM-130B was one of the first open bilingual 100B models; ChatGLM-6B seeded China's local-LLM scene. **GLM-4 (2024)**: commercial catch-up generation, first agentic features. **GLM-4.5 (Jul 2025)**: repositioned around **ARC** (agentic + reasoning + coding) in one model: 355B/32B MoE + 106B Air variant, hybrid thinking modes, MIT license; the moment GLM became a serious open contender. **GLM-4.6 (Oct 2025) / 4.7 (late 2025)**: coding-focused iterations; the GLM Coding Plan (~$3/month Claude Code-compatible endpoint) made it the value option for agentic coding and a genuine competitive lever. **GLM-5 (early 2026)**: ~745B-parameter generation targeting frontier parity. **GLM-5.2 (Jun 2026)**: current open flagship: 744B total/~40B active MoE, 1M-token context, MIT license. Beat GPT-5.5 on FrontierSWE at roughly one sixth the cost; topped the open-weight division of the Artificial Analysis index and led Design Arena/frontend-code arenas. **GLM-5.3 (Aug 14, 2026)**: incremental update, reported as roughly 6x coding gains over 5.2 from post-training alone, and a claimed #1 on CyberGym at 84.5%. **GLM-5.3-Flash (Aug 26, 2026)**: added 2026-08-31. The line's first natively multimodal model and its most strategically aggressive release. 320B total / 18B active MoE, 1,048,576-token context, image *and video* input with text output, MIT licence, weights on Hugging Face. [Z.ai](http://z.ai/) claims it beats GLM-5.2 across its own evaluation suite while costing roughly a tenth as much: list pricing $0.15 input / $0.50 output per million tokens, with a $0.075 input promotion running to Sep 9. It had been on evaluation platforms the week before as the unattributed stealth model **Ox Alpha**, which is worth noting as a pattern: shipping anonymously first to collect clean third-party scores, then claiming the model once the numbers are in. The strategic read is unchanged from GLM-4.6 onward, only sharper: put frontier-class capability under MIT at a price that makes a paid multimodal API tier hard to defend. [Announcement](https://docs.z.ai/release-notes/new-released), [SiliconANGLE](https://siliconangle.com/2026/08/26/z-ai-open-sources-ox-alpha-model-as-glm-5-3-flash/)

Training approach highlights: "Slime" RL infrastructure (open-sourced): asynchronous agentic RL rollouts feeding reasoning + tool-use training; hybrid thinking with controllable depth. MIT licensing everywhere plus rock-bottom serving prices: strategy is to commoditise agentic coding against Anthropic/OpenAI subscriptions. Muon-family optimizers and MTP layers per recent reports; dense-first blocks like DeepSeek. IPO'd in Hong Kong (2026) as the "first LLM stock" wave hit China.

</details>
