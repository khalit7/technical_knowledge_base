# RocketEval: Efficient Automated LLM Evaluation via Grading Checklist

- **Authors/lab**: Tianjun Wei, Wei Wen, Ruizhi Qiao, Xing Sun, Jianghong Ma
- **Date**: 2025-03-07 (arXiv v1). ICLR 2025.
- **Links**: [arXiv 2503.05142](https://arxiv.org/abs/2503.05142) | [HTML](https://arxiv.org/html/2503.05142v1)
- **Topics**: evaluation-and-llm-judges, benchmarks, inference-and-serving

*Added to the KB 2026-08-31.*

> **Note to self (Khalid).** The general pattern here is worth more than the
> evaluation result: **use a big model once, offline, to write down exactly how to do the
> task, then let a small cheap model execute that written procedure at scale.** RocketEval
> happens to apply it to judging, but the shape is generic. My use case: **Fable as an
> orchestrator that writes the checklist, rubric, or step list, and local Ollama models or
> cheaper API models that execute it.** The economics are the point: the expensive model is
> amortised over the whole run instead of being paid per item. See "The generalisation" below.

## Best resources

- [The paper](https://arxiv.org/abs/2503.05142); Section 3 (method) and Table 4 (cost) are the load-bearing parts.
- Read against [llm-as-judge.md](../../topics/evaluation-and-llm-judges/llm-as-judge.md), whose bias catalogue explains *why* the checklist reformulation works.

## Problem

LLM-as-judge is the only evaluation method that scales, and it is expensive: a frontier judge over a real benchmark costs thousands of dollars per sweep, which prices out per-commit regression gates and makes results non-reproducible when the judge is a moving proprietary endpoint. The obvious fix, swapping in a small open judge, fails badly. The paper's diagnostic is the useful contribution: the gap is **not** knowledge or reasoning in general, it is that lightweight models cannot hold a *comprehensive analysis* of a long response in one pass. Chain-of-thought does not rescue them, because CoT asks the small model to do the very thing it cannot do.

## Method

Three stages, and the trick is that the hard cognitive work moves out of the small model entirely.

1. **Checklist creation (expensive model, once per query).** GPT-4o turns each query into 5-10 **binary** questions capturing the factors that should decide the judgment, told to keep them concise and to include the necessary key content. This is per *query*, not per response, so it is amortised across every model and every rerun evaluated on that benchmark. The benchmark's checklists are a reusable artifact.
2. **Grading (lightweight model, per response).** The small judge answers each checklist item independently with Yes or No. Two design choices carry the result:
   - **Read the probability, not the token.** The score is the normalised likelihood `p̂ = P(Yes) / (P(Yes) + P(No))`, so a hedged 0.55 stays a 0.55 instead of collapsing to a hard Yes. This is what recovers the calibration a small model would otherwise throw away.
   - **Judge items independently.** Because no item sees the previous answers, the usual positional and anchoring biases have no channel to propagate through.
3. **Score prediction, with optional supervision.** Unsupervised: arithmetic mean of the normalised item scores. Supervised: Extremely Randomized Trees fit on whatever human annotations exist, blended as `s = (1-α_r)·s_unsup + α_r·f_sup(p)`, where `α_r` scales with how far the item's score distribution is from uniform. In effect, an item that discriminates well is trusted more, and one that fires the same way on everything is discounted toward the prior.

## Results

Benchmarks: MT-Bench (160 instances), WildBench (1,024), AlpacaEval (805), Arena-Hard (500). Baselines: GPT-4o CoT judging, direct scoring without analysis, a fixed six-question checklist, and Prometheus-7B-v2.0.

- **List-level correlation with Chatbot Arena Elo** is where it wins: Gemma-2-2B reaches **0.965** Spearman, and Mistral-Nemo reaches **0.986**, above GPT-4o's 0.979.
- **Cost**: $27.70 per 1,000 tests with Gemma-2-2B versus $3,400 for the GPT-4o pipeline, a **>50x** reduction.
- **Instance-level agreement is the honest weak spot**: Gemma-2-2B lands at 57.9% unsupervised against GPT-4o's 66.6% and a human-to-human ceiling of 64.7%.

That split is the finding to remember. A 2B judge can rank a leaderboard almost exactly like a frontier judge while still disagreeing with humans on individual items far more often. Ranking a field of models is a much easier statistical problem than adjudicating one response, because per-item noise averages out across hundreds of instances and only the systematic component survives.

## Why it matters

It makes a continuously-run eval affordable. At $27 a sweep you can gate every merge; at $3,400 you sweep quarterly and argue about the results. And because the judge is a small open-weight model with a frozen checklist, the evaluation becomes reproducible in a way a proprietary endpoint never is: same weights, same checklist, same numbers next year.

The deeper lesson is about where to spend capability. The frontier model is used for the part that genuinely needs judgment (deciding what would make an answer good), and that output is a durable artifact. The small model does bounded, verifiable classification against that artifact. This is the same division of labour as a rubric handed to a junior grader.

### The generalisation (added per Khalid's note, 2026-08-30)

Strip out the evaluation framing and the pattern is: **a strong model compiles the task into an explicit, checkable procedure; a weak model executes it.** Conditions for it to work, all visible in this paper:

- The procedure must decompose into **small independent decisions**. Independence is what kills bias propagation and lets a weak model succeed at each piece.
- Each decision should be **binary or low-cardinality**, so you can read a calibrated probability off the logits instead of trusting generated text.
- The compiled artifact must be **reused enough to amortise** the strong model. Per-query-per-benchmark works; per-request would not.
- Aggregate many weak decisions into the final answer, and expect **aggregate quality to beat per-item quality** (0.965 correlation from 57.9% item agreement).

For an orchestrator setup (Fable planning, Ollama or a cheap API executing), that translates to: have the orchestrator emit a checklist, rubric, or explicit step list once, cache it, and have the local model answer constrained questions against it, reading probabilities where the runtime exposes them. Where it will *not* transfer: tasks that need one holistic judgment that cannot be decomposed, tasks where the procedure changes every call so nothing amortises, and open-ended generation, where there is no equivalent of a Yes/No logit to calibrate on.

## Limitations

1. Checklist creation depends on a powerful, in this case proprietary, model. The cheap pipeline has an expensive prerequisite.
2. The win concentrates in list-level ranking; instance-level agreement stays below the human-to-human ceiling.
3. Sub-1B judges barely improve, so there is a floor to how small the executor can be.
4. The supervised variant needs labelled data, which most private benchmarks lack.
5. English-language benchmarks only.

## Connections

- [llm-as-judge.md](../../topics/evaluation-and-llm-judges/llm-as-judge.md): this is a concrete answer to the position/verbosity/self-preference bias catalogue, removing the channel rather than correcting for it. It also sits next to the juries/PoLL result: both say many cheap decisions beat one expensive one.
- [production-eval-engineering.md](../../topics/evaluation-and-llm-judges/production-eval-engineering.md): the cost profile is what makes a per-commit regression gate realistic.
- [Constitutional AI](../2022-12_constitutional-ai/summary.md): same shape one level up, a written rubric standing in for human judgment.
- [Demystifying Agent Skills](../2026-08_agent-skills/summary.md): a checklist here is a procedural anchor there. Both find that writing the procedure down explicitly is what transfers.
- Speculative decoding in [inference-techniques.md](../../topics/inference-and-serving/inference-techniques.md) is the same economic idea in a different layer: cheap model proposes, expensive process verifies. RocketEval inverts which side is expensive.
