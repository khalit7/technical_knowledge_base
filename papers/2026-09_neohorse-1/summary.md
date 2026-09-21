# NeoHorse-1: Towards Recursive Self-Improvement via Agentic Post-Training with Routing Harness

⏱ 5 min read · +45m resources

TokenRhythm. Submitted 8 September 2026. 412 Hugging Face upvotes. Models on Hugging Face, code on GitHub.

[arXiv 2609.08183](https://arxiv.org/abs/2609.08183) (45 min)

### Best resources

- [The paper](https://arxiv.org/abs/2609.08183) (45 min).

### Problem

Post-training data for agents is usually curated once, offline, against a fixed task distribution. The serving harness that actually meets the traffic is treated as downstream infrastructure with no say in what the next checkpoint learns. That wastes the one signal a deployed system has that a curated dataset never will: which requests the current model handled badly, and which model in the fleet had to take them. NeoHorse-1's thesis, stated as a loop, is that "what the system learns to do shapes what it learns from next".

### Method

Five components, and the router is the spine.

- **Heterogeneous model pool with intelligent routing.** Requests are routed across service tiers by predicted capability demand rather than by a static rule, so the router is continuously producing a labelled judgement about task difficulty as a side effect of serving.
- **Data curation pipeline.** User interactions become training examples through structural validation, a six-dimensional semantic evaluation, and subscene-level labelling, which is finer-grained than per-conversation labelling and is what makes partial-trajectory supervision possible.
- **Three-stage curriculum.** Supervised fine-tuning is ordered by those routing signals, so difficulty ordering comes from observed traffic rather than from a heuristic.
- **Routing-guided distillation.** Teacher models supervise student responses under progressively harder stages.
- **Capability-guided allocation.** Evaluation feedback is converted directly into training-mixture decisions, which closes the loop back to the pool.

### Results

Across 11 benchmarks spanning agent tasks, tool use, coding and instruction following:

- **4B: macro-average 58.94 to 64.87.**
- **9B: macro-average 65.60 to 69.04.**
- The post-trained 4B substantially narrows the gap to the *base* 9B, which is the economically interesting claim: the routing-derived curriculum buys a large fraction of a size step.

### Why it matters

This is the first published instance of the loop the harness-scaling line has been circling since 2026-08-31: harness and model improving each other, with the harness supplying the training signal rather than merely consuming the weights. `Prime Agent` found that rich harnesses offer affordances models are not trained to use; `JIT-Agent` trained a model to emit harnesses but in a language far poorer than a production one; `Terminal-Universe` supplied environments and `Repo-To-Skill` supplied skills. NeoHorse-1 runs the loop, at 4B and 9B rather than at frontier scale, using routing decisions as the curriculum signal. The honest reading is that this is a demonstration of the mechanism and not evidence that it scales.

### Connections

- `Topic: agentic-harnesses`, the harness-scaling section: the sixth strategy, and the first where the harness is a training-data source rather than a runtime wrapper.
- `Topic: llm-training-and-post-training`: subscene-level labelling and routing-derived curricula belong next to the existing distillation and curriculum material. Read alongside the Dwarkesh decomposition added this week, which finds that data improvements contributed 3.24x more compute-efficiency gain than model improvements between 2019 and 2025, and that small models gain most from data quality: NeoHorse-1 is a mechanism for producing exactly that kind of gain at exactly that scale.
- `Topic: rl`: capability-guided allocation is an allocation policy over training objectives, the same shape as `SA-MRPO`'s saturation-aware reweighting, arrived at from the serving side.
- Reads directly against **Φ-Bench**, which measures whether a model can build its own infrastructure and finds it mostly cannot, and against **MOLE**, which asks what such a loop does when it is subverted.
