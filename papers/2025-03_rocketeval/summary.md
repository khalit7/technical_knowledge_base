# RocketEval: Efficient Automated LLM Evaluation via Grading Checklist

⏱ 14 min read · +~1h 15m resources

- **Authors**: Tianjun Wei, Wei Wen, Ruizhi Qiao, Xing Sun, Jianghong Ma
- **Date**: 2025-03-07 (arXiv v1). Published at ICLR 2025.
- **Links**: [arXiv:2503.05142](https://arxiv.org/abs/2503.05142) (~45 min) | [HTML full text](https://arxiv.org/html/2503.05142v1) (same paper) | [OpenReview (ICLR 2025)](https://openreview.net/forum?id=zJjzNj6QUe) (~30 min)
- **Topics**: evaluation-and-llm-judges, llms

*Added to the KB 2026-08-31.*

## Best resources

- [The paper](https://arxiv.org/abs/2503.05142) (~45 min). Section 3 (the method) and Table 4 (the cost table) are the load-bearing parts; the diagnostic experiments in Section 2 are what make the method non-obvious.
- [OpenReview thread](https://openreview.net/forum?id=zJjzNj6QUe) (~30 min) for the ICLR 2025 reviews, which press hardest on the instance-level agreement numbers.
- Read it against the KB's [LLM-as-judge](../../topics/evaluation-and-llm-judges/llm-as-judge.md) page, whose bias catalogue explains *why* the reformulation works.

## Problem

LLM-as-judge is the only evaluation method that scales, and it is expensive. A frontier judge over a real benchmark costs thousands of dollars per sweep, which prices out per-commit regression gates, leaks private prompts to a third party, and makes results irreproducible when the judge is a moving proprietary endpoint. The obvious fix, swapping in a small open-weight judge, fails badly in practice, and the interesting question is why.

## Method

### The diagnosis, which is half the contribution

The paper's Section 2 experiments are worth more than the headline. Lightweight judges fail for two measurable reasons, and neither is a general reasoning deficit.

- **Uncertainty.** Asked to grade the same WildBench item three times, Qwen2-1.5B disagrees with itself on more than 50% of items. The generated verdict token is close to a coin flip on anything not obvious.
- **Positional and anchoring bias.** Inconsistency rises monotonically with the number of preceding checklist questions in the context. Earlier answers contaminate later ones.
- **The gap is analysis, not reasoning.** This is the key result. Qwen2-1.5B with chain-of-thought reaches 36.4% agreement, *below* its 40.1% from direct scoring: asking a small model to reason about a long response makes it worse, because comprehensive analysis is precisely what it cannot do. Hand the same small model GPT-4o's analysis and let it only pass judgment, and agreement jumps to 70.3%. The small model can apply a judgment criterion; it cannot construct one.

So the design goal follows directly: never ask the small model to analyse. Ask it only closed questions whose analysis has already been done for it.

### 1. Checklist creation (powerful model, once per query)

GPT-4o turns each *query* into an instance-specific checklist of 5 to 10 **binary** questions, prompted for relevance to the query, ability to discriminate between candidate responses, and mutual independence. Two things matter here. First, the checklist is conditioned on the query, not on any response, so it is generated once and reused for every model and every rerun evaluated on that benchmark; the cost is amortised, and the checklist becomes a durable, inspectable, version-controllable artifact. Second, the criteria are now written down in advance rather than improvised per response, which is what makes the judgment auditable at all.

### 2. Grading (lightweight model, per response)

The small judge answers each checklist item **independently**, with prefix caching over the shared query and response prefix keeping this cheap. Two design choices carry the result.

- **Read the probability, not the token.** The score for an item is the normalised likelihood `p̂ = P(Yes) / (P(Yes) + P(No))` taken from the logits, not the sampled Yes/No string. A hedged 0.55 stays a 0.55 instead of collapsing to a hard Yes. This is what recovers the calibration that a small model's discrete verdict throws away, and it directly addresses the uncertainty problem above: the uncertainty is preserved as a number instead of being resolved arbitrarily.
- **Independence removes the bias channel.** Because no item sees the answers to the others, positional and anchoring bias have no path to propagate. The reformulation eliminates the bias rather than correcting for it after the fact, which is the structurally better fix.

### 3. Score prediction and item reweighting

Unsupervised, the final score is the mean of the normalised item scores. Where human annotations exist, an Extremely Randomized Trees regressor is fit on the vector of item scores against the human labels, so items that actually discriminate get weight and items that fire identically on every response are discounted. The supervised and unsupervised scores are blended as `s = (1 - α_r)·s_unsup + α_r·f_sup(p)`, with `α_r = (ε - KL(P_r || P_ideal)) / ε`, so the supervised head is trusted in proportion to how well-spread the available annotation distribution is against a uniform ideal. Sparse or degenerate labels pull the system back toward the plain mean instead of letting a badly fit regressor take over.

## Results

Benchmarks: MT-Bench (80 multi-turn queries with human annotations across six test models) and WildBench (1,024 real user queries). Baselines: GPT-4o and GPT-4 CoT judging, direct scoring without analysis, a fixed six-question checklist (helpfulness, relevance, accuracy, depth, creativity, detail), Claude-3.5-Sonnet, and the fine-tuned judge Prometheus-7B-v2.0.

- **List-level correlation with human preference (Chatbot Arena Elo) is where it wins.** Gemma-2-2B reaches **0.965** Spearman on WildBench, comparable to GPT-4o's own **0.979**. Mistral-Nemo reaches **0.986**, above GPT-4o, and Llama-3-8B ties it at 0.979.
- **Cost.** 1,000 WildBench tests cost **$27.70** with Gemma-2-2B and **$71.40** with Llama-3-8B, against **$3,400** for the GPT-4o pipeline: the **>50x** reduction of the abstract, and closer to 100x at the 2B end.
- **Instance-level agreement is the honest weak spot.** On MT-Bench, Gemma-2-2B goes from 37.9% with CoT prompting to **57.9%** with RocketEval, a large lift, but still short of GPT-4o's 66.6% and of the 64.7% human-to-human ceiling. The supervised variant does not fix this (57.3%).

That split is the finding to remember. A 2B judge can rank a leaderboard almost exactly like a frontier judge while still disagreeing with humans on individual responses far more often than humans disagree with each other. Ranking a field of models is a much easier statistical problem than adjudicating one response, because per-item noise averages out over hundreds of instances and only the systematic component survives.

### What the paper does not establish

1. That the pipeline is cheap end to end. Checklist creation still depends on a powerful, here proprietary, model. The cheap pipeline has an expensive prerequisite, and the privacy argument only holds for the response side, not the query side.
2. That a small judge can replace a frontier judge for **instance-level** decisions. It cannot, on these numbers. Anything that acts on a single verdict (a per-PR gate that blocks on one failing case, an RLAIF preference label) is out of scope for what is demonstrated here.
3. That it holds outside English, or outside chat-style open-ended response evaluation. Both benchmarks are English chat benchmarks.
4. That it holds below roughly 2B. Sub-1B judges improve much less, so there is a floor to how small the executor can be.
5. That the supervised reweighting is available in practice. It needs labelled data that most private benchmarks do not have, and it is the unsupervised variant that carries the headline result anyway.

## Why it matters

It makes a continuously-run eval affordable. At $27 a sweep you can gate every merge; at $3,400 you sweep quarterly and argue about the results. And because the judge is a small open-weight model reading a frozen checklist, the evaluation becomes reproducible in a way a proprietary endpoint never is: same weights, same checklist, same numbers next year. The checklist itself is reviewable by a human, which is more than can be said for a frontier judge's opinion.

The deeper lesson is about where to spend capability. The frontier model is used only for the part that genuinely needs judgment, deciding what would make an answer good, and that output is a durable artifact. The small model does bounded, verifiable classification against that artifact, and the aggregate of many such classifications is better than any of them individually. It is the same division of labour as a rubric handed to a junior grader, and the same reason rubrics exist.

## Connections

- **[LLM-as-judge](../../topics/evaluation-and-llm-judges/llm-as-judge.md)** (evaluation-and-llm-judges): a concrete answer to the position, verbosity and self-preference bias catalogue, removing the channel rather than debiasing after the fact. It sits next to the juries/PoLL result: both say many cheap decisions beat one expensive one.
- **[Production eval engineering](../../topics/evaluation-and-llm-judges/production-eval-engineering.md)** (evaluation-and-llm-judges): the cost profile is what makes a per-commit regression gate realistic; the instance-level number is why you gate on aggregates, not single cases.
- **[Constitutional AI](../2022-12_constitutional-ai/summary.md)** (Papers): the same shape one level up, a written rubric standing in for human judgment at training time rather than eval time.
- **[Demystifying Agent Skills](../2026-08_agent-skills/summary.md)** (Papers): a checklist here is a procedural anchor there. Both find that writing the procedure down explicitly is what transfers, and that the artifact beats the model's improvisation.
- **[StateM](../2026-08_statem/summary.md)** and **[JIT-Agent](../2026-08_jit-agent/summary.md)** (Papers): the same "expensive artifact, cheap execution" economics in the harness layer, where an expensive run produces a runbook or a synthesised harness that a cheaper model then executes.
- **[Speculative decoding](../../topics/inference-and-serving/inference-techniques.md)** (inference-and-serving): the same economics inverted, cheap model proposes and expensive process verifies, rather than expensive model specifies and cheap model executes.

---

## Note to self

> **Khalid, 2026-08-30.** In his words:
>
> > "And make a note to self on the page of the paper saying this could be use more generally for using a bigger model to guide the small model on how to do the task exactly. My example use case for this is using fable as an orchestrator to local ollama models or cheaper api models"
>
> The general pattern, stated plainly: **a bigger model writes an exact specification of the task, and a smaller model executes that specification.** Checklist grading is one instance of it; the evaluation framing is incidental. Intended use case: **Fable as the orchestrator, writing the spec, over local Ollama models or cheaper API models that execute it.**

*Everything above in the callout is Khalid's. The commentary below is mine (Claude), added when the page was written on 2026-08-31.*

### Where the pattern transfers

The paper supplies the conditions, and they are more restrictive than the idea sounds.

- **The task must decompose in advance into small, independent, verifiable sub-questions.** Independence is not a nicety here; it is what removes the bias channel and what lets each sub-answer be cheap. If the orchestrator cannot write the decomposition before seeing the executor's work, there is nothing to hand over.
- **The sub-decisions should be binary or low-cardinality**, so the runtime can expose a calibrated probability instead of a sampled token. Ollama does expose logprobs, so the `P(Yes)/(P(Yes)+P(No))` trick is available locally; most hosted chat APIs make this awkward or impossible, which quietly removes the single most important part of the method.
- **The expensive artifact must be reused across many cheap calls.** This is the whole economic argument. Per-query-per-benchmark amortises over every model and every rerun. A spec written fresh for each individual request amortises over nothing, and you have simply paid the big model plus the small model to do one job.
- **Expect aggregate quality to exceed per-item quality.** 0.965 list-level correlation out of 57.9% item agreement is the shape to plan for: design the system so the answer you act on is an aggregate.

### Where it does not

- **Tasks that cannot be decomposed ahead of time**, which includes most open-ended generation. There is no equivalent of a Yes/No logit for "write this well", and no checklist that specifies a good essay without writing it.
- **Tasks where the executor cannot reliably answer the sub-questions even given the spec.** The 70.3% number is the ceiling this method reaches by importing analysis, not 100%. A spec does not confer a capability the small model lacks; it only removes the need for one it lacks.
- **Anything acting on a single verdict.** The instance-level result is the direct warning against using this shape for per-item gating or for generating preference labels.
- **Cases where the orchestrator has to see each input anyway** to write the spec. Then the big model is already paying per item and the small model is pure overhead.

### Neighbours already in this KB

Worth reading together, because they are the same "expensive artifact, cheap execution" shape at different layers: **StateM** (an expensive adaptation run produces a versioned state-machine runbook that a cheap model then follows to frontier scores at 1/38 the cost), **JIT-Agent** (a trained 27B model synthesises a harness that a cheaper executor runs), **Demystifying Agent Skills** (the written procedure as procedural anchor, including its 10% misapplication failure mode, which is the failure mode to expect from a spec the executor half-understands), and **distillation** in llm-training-and-post-training, which is the weights-level version of the same trade: pay the big model once, run the small one forever. The difference worth holding onto is that distillation moves the capability into the weights and cannot be inspected or edited afterwards, while a checklist or a runbook stays a text artifact you can read, diff, and fix.
