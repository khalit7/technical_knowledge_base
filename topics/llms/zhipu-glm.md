# Zhipu: GLM

⏱ 8 min read · +3h 25m resources

Per-model pages to follow; this page maps the family.

### Best resources

- [GLM-4.5 tech report](https://arxiv.org/abs/2508.06471) (~1h 30m): the ARC (agentic, reasoning, coding) design brief and training stack.
- [Z.ai blog](https://z.ai/blog) (docs, ~30 min for the recent release posts): primary source for GLM-5.x releases.
- [Z.ai (Wikipedia)](https://en.wikipedia.org/wiki/Z.ai) (~10 min): corporate lineage from Tsinghua's ChatGLM to today.
- [GLM-5.2 analysis (Labellerr)](https://www.labellerr.com/blog/glm-5-2-open-weight-ai-model/) (~15 min): current flagship vs closed rivals.
- [Z.ai HuggingFace org](https://huggingface.co/zai-org) (docs, ~15 min for the flagship model cards): MIT-licensed weights.

### ARC: what the design brief actually commits to

**ARC** is Zhipu's name for building one model that is simultaneously good at three things that usually pull apart: **agentic** behaviour (long-horizon tool use, browsing, staying coherent over hundreds of steps), **reasoning** (deliberate multi-step problem solving), and **coding**. It is a design brief and not marketing because the three genuinely conflict in post-training: heavy reasoning training pushes a model to deliberate before answering, which costs latency and can degrade instruction following; agentic training rewards short decisive actions and tool calls rather than long internal monologue; coding wants exact, formatted, non-chatty output. The usual industry answer is separate specialised checkpoints, operationally expensive for the customer.

GLM's answer is one set of weights with hybrid thinking modes, the caller selecting deliberate or direct behaviour through the prompt template rather than by loading a different model, plus a post-training pipeline that trains the three capability families and then reconciles them (train specialists, then unify) rather than hoping one mixed run balances them. It buys one deployment covering an entire agentic workload, and costs what Alibaba conceded when it split Qwen3-2507 back into Instruct and Thinking checkpoints: a unified model gives up a little at the top end of each mode.

### Architecture: a conventional MoE, with deliberate shape choices

GLM-5.2 is a 744B-total, roughly 40B-active mixture of experts, GLM-5.3-Flash a 320B / 18B one routing 8 of 288 experts per token; the ratio (about 1 in 18 parameters active) is the standard modern bet that quality tracks total parameters while decode speed tracks active parameters. Several choices around it were reported as deliberate.

**Dense-first blocks.** The first layers are ordinary dense feed-forward layers rather than MoE, a pattern shared with DeepSeek. Early layers compute generic, low-level features every token needs, so routing them buys little specialisation while adding real risk: routers are least stable early in the network and early in training, and a bad early routing decision propagates through the whole stack.

**Depth over width, and more attention heads.** The GLM-4.5 report prefers a deeper, narrower model to a shallower, wider one at fixed parameter count, and more attention heads than the hidden size would conventionally imply. The reported finding is the interesting part: the extra heads did not improve pretraining loss but did improve reasoning benchmarks, a reminder that loss is a proxy, not the objective, and that architecture can buy capability the loss curve does not show.

**MTP (multi-token prediction) layers.** Extra lightweight heads predict more than one future token during training: denser supervision per forward pass, and at inference the same heads serve as a built-in draft model for speculative decoding, so the speedup comes without training and hosting a separate draft model. For a lab whose entire strategy is price, a free multiple on decode throughput is margin.

**Muon-family optimizers.** Muon replaces AdamW's per-parameter second-moment rescaling with an update that orthogonalises the momentum matrix (a few Newton-Schulz iterations) before applying it, so the step pushes across the whole spectrum of directions instead of being dominated by a few. It buys better loss per token and a smaller optimizer state, and costs a few extra matmuls per step and a much shorter safety record than AdamW, which is why Moonshot's qk-clip work on taming its instabilities matters to everyone adopting it.

### slime: RL infrastructure built for the agentic case

Zhipu open-sourced **slime**, their RL training system, arguably as strategically important as the weights. In agentic RL a single rollout is an entire episode of tool calls, and episode lengths are wildly long-tailed: one trajectory takes three tool calls, another three hundred. Classic synchronous on-policy RL waits for the whole batch of rollouts before the training step, so accelerators idle on the slowest trajectory and utilisation collapses exactly when episodes get interesting.

slime decouples the two: a rollout engine generates trajectories continuously into a buffer, and the trainer consumes them without waiting for the batch to complete. The cost is staleness, since the data came from a slightly older policy than the one being updated, which makes the update off-policy and needs importance correction or a bounded staleness window to stay stable. The benefit is that GPU utilisation stops being hostage to the longest episode, which is what makes agentic RL affordable at the cadence Zhipu runs it. Same lesson as prefill/decode disaggregation in serving: when two coupled phases have different profiles, decouple them and buffer between.

### The inference stack, built by the model that runs on it

"Toward Recursive Self-Improvement: How GLM Built Its Own Inference Infrastructure" (Sep 2026) is the second piece of infrastructure Zhipu has published rather than merely used, and the more interesting one. It reports a production serving system for GLM-5.3-Flash stood up in 13 days on more than 100,000 Chinese-made accelerators, with a 3.22x end-to-end throughput gain from baseline to launch, largely written by GLM-5.3. Zhipu states plainly that this is not recursive self-improvement and that humans retained control of objectives and boundaries, which is what makes the post worth reading rather than discounting.

The transferable finding is about feedback, not about self-improvement: the bottleneck was the feedback environment rather than the model, and the fix was replacing sparse signals ("the test failed") with three kinds of local verifiable feedback. Correctness, by comparing numerical results across execution paths, which surfaced a TF32 precision bug visible only under particular parallelism strategies. System behaviour, by timeline analysis, which traced a 20% slowdown to the Python global interpreter lock blocking KV-transfer overlap. Performance, by layered testing that shows which constraint actually binds. Neither bug would have surfaced from an end-to-end metric, and the advice generalises past serving: audit what feedback an agent receives after a change, build cheap intermediate validation, define acceptance criteria numerically before starting, and let validated techniques accumulate in a reusable library. [Z.ai](https://z.ai/blog/glm-built-its-inference-infrastructure) (25 min)

### The pricing strategy is the product

From GLM-4.6 onward the commercial move has been to put frontier-class open weights under MIT (the most permissive licence in common use: use, modify, redistribute, sell, with only attribution) and undercut everyone on hosted price. The **GLM Coding Plan** at roughly $3/month is the sharpest version: its endpoint is API-compatible with Claude Code, so an existing agentic coding setup switches by changing a base URL and a key rather than rewriting a harness. The target is not benchmark leadership, it is the economics of the subscription products the model is pointed at.

GLM-5.3-Flash extends that to multimodal: list pricing of $0.15 per million input tokens and $0.50 per million output, roughly a tenth of GLM-5.2, at a claimed improvement over it, with weights on Hugging Face under MIT. The argument, unchanged for a year, is that a paid multimodal API tier is hard to defend against a model of that class that anyone can download and serve themselves.

The strategy has a second-order effect the pricing alone does not capture: GLM bases have become other labs' starting point. **Atria Dawn Preview** (Shanghai AI Laboratory, Sep 2026) is a 744B agentic MoE under MIT built as a post-training layer over the GLM-5.2 base rather than trained from scratch, so a national laboratory reached frontier scale by specialising someone else's open weights, and shipped with no announcement at all. Permissive licensing at the frontier means the base model becomes infrastructure other people build products on, which is worth more strategically than the hosted margin it forgoes.

The **Ox Alpha** episode is worth remembering as a pattern rather than a fact about one model: GLM-5.3-Flash was on evaluation platforms as an unattributed stealth model the week before launch, collecting third-party scores from people who did not know whose model they were rating, and was claimed once the numbers were in. Anonymous pre-release evaluation removes brand effects from human preference voting, and it also means a disappointing run can simply never be claimed, so treat "topped the arena as a stealth model" as a number selected after the fact.

### Lineage

- **ChatGLM-6B / GLM-130B (2022-2023)**: Tsinghua KEG spinoff. GLM-130B was one of the first open bilingual 100B models; ChatGLM-6B, small enough to fine-tune and run locally, seeded China's local-LLM scene.
- **GLM-4 (2024)**: commercial catch-up generation, first agentic features.
- **GLM-4.5 (Jul 2025)**: repositioned around **ARC** in one model: 355B/32B MoE plus a 106B Air variant, hybrid thinking modes, MIT license. The moment GLM became a serious open contender; the tech report is the best single document on this line.
- **GLM-4.6 (Oct 2025) / 4.7 (late 2025)**: coding-focused iterations; the GLM Coding Plan (~$3/month, Claude Code-compatible endpoint) made it the value option for agentic coding and a genuine competitive lever.
- **GLM-5 (early 2026)**: the 744B-class generation targeting frontier parity, and the backbone 5.2 and 5.3 refine rather than replace.
- **GLM-5.2 (Jun 2026)**: current open flagship: 744B total / ~40B active MoE, 1M-token context, MIT license. Beat GPT-5.5 on FrontierSWE (agentic software engineering, scored by whether the patch passes tests) at roughly one sixth the cost; topped the open-weight division of the Artificial Analysis index (a composite of public benchmarks) at release and led Design Arena and frontend-code arenas, which are human preference votes on generated interfaces. That aggregate-index lead has since passed to Moonshot's Kimi K3 on Artificial Analysis' reranked v4.2. What GLM still leads on is narrower and more useful: cost per index point, and private enterprise code, where Real-SWE puts GLM-5.3 at 28.8%, the best open-weight result and ahead of Kimi K3's 18.8%.
- **GLM-5.3 (Aug 14, 2026)**: incremental update, reported as roughly 6x coding gains over 5.2 from post-training alone, with no architecture change, and a claimed #1 on CyberGym (an agentic security benchmark) at 84.5%.
- **GLM-5.3-Flash (Aug 26, 2026)**: the line's first natively multimodal model and its most strategically aggressive release. 320B total / 18B active MoE, 1,048,576-token context, image *and video* input with text output, MIT licence, weights on Hugging Face. Zhipu claims it beats GLM-5.2 across its own evaluation suite at roughly a tenth the cost: list pricing $0.15 input / $0.50 output per million tokens, after a $0.075 input promotion that ran to Sep 9. The architecture, published a week after launch, is what makes the price possible: 8 of 288 experts active per token, 30T multimodal training tokens with multi-token prediction, a **hybrid linear plus sparse attention** stack cutting attention compute to roughly a third of GLM-5.3, and an **IndexPool** step that averages every four lookup vectors before selection, cutting the KV cache to under a quarter of its size at 1M context. That last choice is what makes the advertised million-token window affordable to serve rather than merely available, and it puts the model at 57 on the Artificial Analysis Intelligence Index for about $0.09 per task against roughly $2.03 for a comparably placed closed model. Served entirely on Chinese-made accelerators. It had been on evaluation platforms the week before as the unattributed stealth model **Ox Alpha**. [Announcement](https://docs.z.ai/release-notes/new-released) (~10 min), [SiliconANGLE](https://siliconangle.com/2026/08/26/z-ai-open-sources-ox-alpha-model-as-glm-5-3-flash/) (~10 min)
- Corporate: IPO'd in Hong Kong (2026) as the "first LLM stock" wave hit China, context for the pricing aggression: market share now is the story being sold.

### Current models

| Model | Params | Notes |
| --- | --- | --- |
| GLM-5.3 / GLM-5.2 | 744B / 40B active | MIT, 1M ctx; open-weight leader on cost per index point and on Real-SWE private-codebase tasks |
| GLM-5.3-Flash | 320B / 18B active | Natively multimodal (image + video in), 1M ctx, MIT, $0.15/$0.50 per Mtok; shipped Aug 26 2026, ex-"Ox Alpha" |
| GLM-4.7-Air class | ~100B | Cheap self-hostable tier |
| GLM Coding Plan | service | Claude Code-compatible agentic coding value play |

### Cross-links

- [Mixture-of-Experts (MoE) models](moe-models.md), [Reasoning models and test-time compute](reasoning-models.md).
- Direct rivals: [DeepSeek](deepseek/overview.md), [Moonshot AI: Kimi](moonshot-kimi/overview.md), [MiniMax](minimax/overview.md).
