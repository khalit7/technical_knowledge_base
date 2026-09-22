# LLM-as-judge: design, biases, calibration, reliability

⏱ 11 min read · +9h 35m resources

### Best resources

- [Judging LLM-as-a-Judge with MT-Bench and Chatbot Arena (Zheng et al., 2023)](https://arxiv.org/abs/2306.05685) (45 min): the paper that named the pattern and catalogued position, verbosity and self-enhancement biases.
- [A Survey on LLM-as-a-Judge (Gu et al., 2024, arXiv:2411.15594)](https://arxiv.org/abs/2411.15594) (90 min, survey): the standard survey; taxonomy of judge designs and mitigation strategies.
- [Hamel Husain, Creating an LLM-as-a-Judge That Drives Business Results](https://hamel.dev/blog/posts/llm-judge/) (~35 min): the best practitioner guide; Critique Shadowing methodology for building judges from domain-expert critiques.
- [JudgeBench (ICLR 2025, arXiv:2410.12784)](https://arxiv.org/abs/2410.12784) (45 min): meta-eval on objectively-verifiable hard pairs; best single number for "how good are judges really".
- [Cheating Automatic LLM Benchmarks: Null Models Achieve High Win Rates (arXiv:2410.07137)](https://arxiv.org/abs/2410.07137) (45 min): canonical judge-exploitation result.
- [Justice or Prejudice? Quantifying Biases in LLM-as-a-Judge (arXiv:2410.02736)](https://arxiv.org/abs/2410.02736) (45 min): CALM framework quantifying 12 judge biases.
- [Replacing Judges with Juries / PoLL (Verga et al., arXiv:2404.18796)](https://arxiv.org/abs/2404.18796) (45 min): the jury-of-small-models result.

### Judge design: the three grading modes

- **Pointwise (direct scoring)**: judge scores one output on an absolute scale. For monitoring and gating where you need a per-sample score with no baseline. Weakness: scale drift; a 7/10 today is not a 7/10 next month or on another judge model. Prefer few coarse anchored levels (binary pass/fail, or 1-3 with per-level rubric text) over 1-10; fine-grained scales are noise past about 4 distinguishable levels, and binary forces the rubric author to decide what failure means.
- **Pairwise (preference)**: judge picks A vs B (optionally tie). Higher human agreement than pointwise for open-ended quality, and the right mode for model-swap decisions since the question is inherently comparative. Weakness: position bias (must run both orderings), tie inflation, and O(n^2) cost for ranking many candidates.
- **Rubric / reference-guided**: judge grades against an explicit checklist or a gold reference answer. The most reliable mode when references exist, and it substantially cuts hallucinated judgments on math/code. Structured rubrics also localise failures (which criterion failed), which pairwise cannot. This is the direction of recent work: decomposed per-criterion binary checks aggregated programmatically beat one holistic score.
Practical defaults: chain-of-thought (CoT) before the verdict (reason-then-score, never score-then-justify), structured output for the verdict field, temperature 0, and a fixed judge model + prompt version pinned in the eval config so scores are comparable across runs. Log the judge's rationale; it is your debugging surface.

### The bias catalogue

Confirmed and repeatedly replicated (MT-Bench, CALM, and the 2025-26 reliability literature):

- **Position bias**: pairwise judges favour one slot; judge model choice affects it more than task type or quality gap. GPT-4-class judges still flip verdicts on swap for a noticeable fraction of pairs. Mitigation: evaluate both orders, count disagreements as ties (or resample); never single-order pairwise.
- **Verbosity bias**: longer answers win independent of quality. Mitigation: length-controlled win rates (AlpacaEval 2.0 LC), or explicit rubric criteria penalising padding.
- **Self-preference / self-enhancement**: judges favour outputs from their own family; Panickssery et al. ([arXiv:2404.13076](https://arxiv.org/abs/2404.13076), 45 min) showed a linear relation between a model's self-recognition ability and its self-preference. Mitigation: never judge a model with itself or a sibling when comparing across families; use a disinterested third family or a jury.
- **Sycophancy / authority bias**: confident tone, citations (even fake ones), and assertive framing raise scores.
- **Format exploitation**: the null-model result: a constant, content-free but well-structured response achieved 86.5% LC win rate on AlpacaEval 2.0 and 83.0 on Arena-Hard-Auto by exploiting the judge template's parsing, including embedding instructions that the judge executes. Any judge pipeline that feeds candidate text into a template is prompt-injectable by the candidate. Mitigation: delimit candidate text clearly, instruct the judge to treat it as data, run injection canaries in your judge battery.
- **Truncation blindness** (the plumbing failure mode Khalid has hit personally): if the candidate output is truncated upstream (max_tokens, logging layer, context overflow) the judge grades the stump as a quality failure rather than flagging an artifact. Judges rarely say "this looks cut off" unprompted. Mitigation: assert finish_reason == stop before judging, pass completion metadata to the judge, and add an explicit rubric criterion "is the response complete or truncated" whose failure routes to an infra bucket, not a quality bucket.
**What the catalogue looks like in a shipping claim.** Cohere's North Small Translate reports 83.6 on WMT26 across 50 languages, and 84.36 for an agentic variant, against DeepL NextGen at 81.37 and Google Translate at 68.20. These are the vendor's own measurements with a third party's model, GPT-5.6 Sol, as judge, and that is the common shape of a 2026 benchmark claim rather than an unusual one. Using an outside family disposes of the self-preference bullet above and of nothing else. The questions left are the ones to ask of any claim in this shape: was the judge's training data ever exposed to the outputs of the systems being compared, which would make preference an artefact of familiarity; was the rubric published; were both orderings run; who chose the 50 languages; and is the margin larger than the judge's own noise, because 2.2 points over a named competitor on a judge-scored metric is not obviously outside it. None of this makes the numbers wrong. It makes them unreproducible by anyone outside the vendor, which is a different objection and the one to state.

**Debiasing by construction (checklist grading)**: the mitigations above are post-hoc corrections wrapped around a holistic judgment (swap the order, control for length). RocketEval (ICLR 2025; [RocketEval: Efficient Automated LLM Evaluation via Grading Checklist](../../papers/2025-03_rocketeval/summary.md), [arXiv:2503.05142](https://arxiv.org/abs/2503.05142), 45 min) removes the channel instead: a frontier model compiles each query once into 5 to 10 binary checklist questions, and a small judge answers each question independently. Because no item is graded with sight of the other answers, position and anchoring bias have no channel to propagate through. The score is read from logits as P(Yes)/(P(Yes)+P(No)) rather than from the sampled token, so the judge's uncertainty is preserved instead of collapsed into a verdict. Small judges also do worse when asked to reason first: Qwen2-1.5B reaches 36.4% agreement with CoT versus 40.1% with direct scoring, and 70.3% when handed GPT-4o's analysis. Cost: 1,000 WildBench tests cost $27.70 with Gemma-2-2B versus $3,400 with GPT-4o, at 0.965 Spearman correlation with Arena Elo against GPT-4o's 0.979 (Mistral-Nemo 0.986). Caveat: that is list-level correlation only; instance-level agreement for Gemma-2-2B is 57.9% versus 66.6% for GPT-4o and a 64.7% human-to-human ceiling. Use the pattern for aggregate leaderboards, drift monitoring and distribution-level regression gates, not for adjudicating single items, and note that checklist creation still needs a frontier model to see every query.

### Calibration against human gold

A judge is a measurement instrument; it needs a calibration certificate before its numbers mean anything.

- Build a human-labelled gold slice (a few hundred items) via **Critique Shadowing**: one domain expert makes binary pass/fail judgments with free-text critiques; iterate the judge prompt until judge-vs-expert agreement plateaus; report Cohen's kappa, not raw accuracy, since class balance flatters accuracy; re-check on fresh samples for drift.
- Human agreement is the ceiling: inter-annotator agreement on open-ended tasks is often 75-85%, so a judge at 80% agreement with one human may be at ceiling, not underperforming.
- Judge scores are biased estimators of the human pass rate; recent work formalises correcting the aggregate metric using the judge's measured true-positive and false-positive rates (TPR/FPR) on the gold slice ([How to Correctly Report LLM-as-a-Judge Evaluations, arXiv:2511.21140](https://arxiv.org/abs/2511.21140), 45 min). Report the corrected rate with confidence intervals (CIs), not the raw judge rate.
- Distinguish reliability from validity: a 2026 large-scale study ([arXiv:2606.19544](https://arxiv.org/abs/2606.19544), 45 min) found judges can be highly self-consistent while systematically wrong; consistency metrics alone certify nothing.

### Ensembles and juries

- **PoLL (Panel of LLM evaluators)**: a jury of smaller judges from different families, mean- or vote-aggregated, correlates better with humans than a single GPT-4-class judge at roughly 7-8x lower cost, and washes out intra-family bias. This is the default pattern for production judge batteries.
- **Robust aggregation**: plain mean aggregation is fragile; one contaminated or broken jury member drags the panel arbitrarily (RoPoLL, [arXiv:2606.30931](https://arxiv.org/abs/2606.30931) (45 min), fixes this with a geometric-median aggregate). Practical translation: median or trimmed mean over jurors, and monitor per-juror agreement so a degraded juror is detected.
- **Debate / meta-judge** patterns (ChatEval-style multi-agent debate, a meta-judge adjudicating juror disagreement) buy a few points of accuracy at large cost; worth it only for high-stakes offline audits, not batch scoring.
- Escalation design: cheap juror pass on everything, disagreement or borderline scores escalate to a frontier judge, persistent disagreement escalates to a human. This spends judge budget where the signal is.

### Judge model choice and meta-evals

- **JudgeBench** (hard, objectively-groundable response pairs in knowledge/reasoning/math/code): best frontier judges reach only ~64%; fine-tuned open judge models and reward models cluster at 55-64%. On genuinely hard comparisons, judges are far from solved; do not use judge deltas to adjudicate small quality gaps between strong models.
- **RewardBench 2** ([arXiv:2506.01937](https://arxiv.org/abs/2506.01937), 45 min): stricter reward-model meta-eval on unseen human prompts, best-of-N selection focus; the reference for choosing an RM as scorer.
- Rule of thumb ordering for judge quality: frontier reasoning models > frontier chat models > specialised fine-tuned judges (Prometheus-style) on their trained rubric distribution > small open models. But per-task calibration beats the global ranking: a small judge that agrees 92% with your expert on your task beats a frontier judge at 85%.
- Cost note: reasoning-model judges with long CoT can cost more than the system being evaluated; juries of minis are usually the better cost-accuracy point, with reasoning judges reserved for escalation.

### Fine-tuned judges, reward models, agent-as-judge

Three adjacent instrument families, often confused:

- **Fine-tuned judge models** (Prometheus 2, Glider, Selene, JudgeLM lineage): open models trained on critique/verdict data, cheap at scale and competitive with frontier judges on the rubric distributions they were trained on, but they generalise poorly to novel rubrics; re-validate on your gold slice before trusting them off-distribution.
- **Reward models** (see RewardBench 2): scalar scorers trained on preference data, built for reinforcement learning from human feedback (RLHF) and best-of-N selection. Fast and cheap for ranking many candidates; weaker as explainable evaluators since there is no rationale, and they inherit their preference data's biases (length, format) in concentrated form.
- **Agent-as-judge**: the judge gets tools, executing the candidate's code, checking claims against retrieval, or replaying an agent trajectory step by step. Materially more accurate on agentic/coding tasks where surface reading fails (AJ-Bench-style evaluations), at much higher cost and with a new failure surface, the judge's own tool use. The direction of travel for agent systems: grade trajectories (tool choices, intermediate states), not just final answers.

### Operational checklist

1. Pin judge model version + prompt hash; treat any change as a new instrument requiring recalibration.
2. Both orderings for pairwise; ties on disagreement.
3. Validate finish_reason and length before judging; separate infra-failure bucket.
4. Prompt-injection canaries and null-model canaries in every judge battery run.
5. Kappa vs human gold, recomputed quarterly and on any distribution shift.
6. Different family for judge vs judged; jury with robust aggregation for batch scoring.
7. Report corrected pass rates with CIs; never raw judge score deltas without paired significance (see [Production eval engineering: gates, golden sets, statistics, gold-label auditing](production-eval-engineering.md)).
