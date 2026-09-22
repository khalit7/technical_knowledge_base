# Production eval engineering: gates, golden sets, statistics, gold-label auditing

⏱ 11 min read · +4h 35m resources

### Best resources

- [Adding Error Bars to Evals (Evan Miller, Anthropic, arXiv:2411.00640)](https://arxiv.org/abs/2411.00640) (45 min): the statistical framework: central-limit-theorem (CLT) confidence intervals (CIs), clustered standard errors (SEs), paired tests, power analysis. Read first.
- statsforevals.com (~30 min): companion resources adapting that framework to small (20-100 item) developer evals.
- [Hamel Husain's evals FAQ](https://hamel.dev/blog/posts/evals-faq/) (~40 min): the best condensed practitioner answers on golden sets, CI gates, and error analysis.
- [Braintrust: practical guide to LLM evaluation and regression testing](https://www.braintrust.dev/articles/llm-evaluation-guide) (~25 min): representative of the current offline/online split as implemented by tooling.
- [Do Large Language Model Benchmarks Test Reliability? / PlatinumBench (arXiv:2502.03461)](http://platinum-bench.csail.mit.edu/) (45 min): label-error rates in standard benchmarks and what cleaning them changes.
- [How to Correctly Report LLM-as-a-Judge Evaluations (arXiv:2511.21140)](https://arxiv.org/abs/2511.21140) (45 min): bias-correcting judge-derived metrics.

### Regression gates and promotion paths

The promotion path for any change (prompt edit, model swap, retrieval change, tool change) is a fixed sequence, each stage cheaper than the failure it prevents:

1. **Offline gate on frozen golden sets** (minutes, in CI): pass/fail thresholds per capability slice, not one aggregate. Gate on paired deltas vs the current champion, with significance (below), plus hard floors on safety slices. Any golden-set edit is itself a reviewed change; score history must be re-baselined when the set changes.
2. **Cost/latency budget gate**: tokens per request, p95 latency, projected spend. A model swap that wins quality but 3x cost fails promotion unless explicitly waived.
3. **Shadow deployment**: candidate runs on mirrored production traffic, responses logged not served. Score champion against candidate on the same requests (paired by construction) with the judge battery; diff distributions per intent/segment. Shadow catches distribution gaps golden sets cannot, because real traffic is uglier than curated sets. For agentic systems shadow full trajectories, not single turns.
4. **Canary / A/B with auto-rollback**: small live percentage, guardrail metrics (error rates, refusal rates, user feedback, task completion) with automated rollback triggers, then progressive rollout.
Champion/challenger framing keeps this honest: the incumbent config is the champion; nothing ships without beating it through all gates. Keep every config (prompt hash, model version, judge version, dataset version) pinned and logged so any score is reproducible.

### Golden sets

- Composition: a representative slice of real traffic (deduplicated, scrubbed of personally identifiable information (PII)), regression cases (every production incident becomes a test), adversarial/edge cases, and safety canaries. 100-500 items per surface is the practical range; smaller sets gate only large effects (see statistics), larger sets rot.
- Each item: input, expected behaviour (reference answer, rubric, or programmatic checks), metadata tags (intent, difficulty, source incident). Tags are what make per-slice gating possible.
- Lifecycle: golden sets decay through product drift, traffic drift and gradual leakage into prompts/finetunes. Refresh on a schedule from recent traffic and error analysis; version them like code; hold out a never-published split if the vendor might train on your traffic.
- Error analysis is the engine that grows them: read raw transcripts of failures (Hamel's core discipline), cluster failure modes, convert clusters into new tagged golden items and judge rubric criteria.

### Offline vs online

Offline evals catch anticipated regressions; online metrics catch what your golden set could not imagine. Both are required, and they disagree routinely.

- Online instruments: sampled judge scoring of live traces (async, out of request path), implicit signals (retry rate, edit distance of user corrections, abandonment, escalation-to-human rate), explicit feedback, and business/task-completion metrics.
- Treat offline-online divergence as an alarm on the offline set: if a candidate wins offline and loses online, the golden set or judge is miscalibrated for current traffic; feed the divergent segment back into the golden set.
- Online judge scoring inherits every judge failure mode from [LLM-as-judge: design, biases, calibration, reliability](llm-as-judge.md) plus sampling bias (which traffic you sample) and label lag; report online judge metrics with the same true-positive and false-positive rate (TPR/FPR) corrections.

### Statistical rigour

The central failing of eval practice is reporting point deltas without noise quantification. The Miller framework, adapted:

- **Question-level variance**: eval score = mean over items; standard error of the mean (SEM) = s/sqrt(n). With n=100 binary items at p around 0.7, SEM is about 4.6 points: a "2-point regression" on a 100-item set is noise. With n=1000 it is 1.4 points. Rule of thumb for binary metrics: detectable effect at 95%/80% power is roughly 2.8 * sqrt(2p(1-p)/n); invert for the n you need. Detecting a 2-point drop near p=0.7 needs roughly n=3500 paired-free; far fewer paired (next point).
- **Paired tests**: always compare models on the same items and test the per-item differences (paired t-test / McNemar for binary). Item difficulty is shared, so pairing removes most variance; typical correlations cut required n by 3-10x. This is the single highest-value practice for regression gates.
- **Sampling variance of generation**: nondeterministic decoding means the same model rescores differently; estimate by K resamples per item and use the variance decomposition (between-item + within-item/K). For small golden sets, K=3-5 resamples materially tightens CIs.
- **Clustered errors**: items generated from shared sources/templates are not independent; use clustered standard errors or you will overstate significance.
- **Multiple comparisons**: gating 20 slices at p<0.05 fires falsely all the time; use stricter per-slice alpha or hierarchical gating (aggregate first, slices as diagnostics).
- Small-set reality: a 50-item gate can only detect large regressions; be explicit about the minimum detectable effect of each gate instead of pretending sensitivity you don't have. Escalate borderline gate results to more samples or human review rather than re-running until green.

#### Worked example: sizing a model-swap gate

Champion passes 78% of a 300-item golden set. You care about regressions of 5+ points.

- Unpaired: SE of the difference is sqrt(2 * 0.78 * 0.22 / 300) = 3.4 points; a 5-point drop is only 1.5 SE: the gate cannot reliably see it. You would need roughly n = 16 * 0.17 / 0.05^2 = 1100 items.
- Paired (score both models on the same 300 items, McNemar on discordant pairs): if the models disagree on ~15% of items (typical for a same-tier swap), the effective n is the ~45 discordant items but the variance of the paired delta shrinks by the agreement rate; in practice a 5-point true regression is detected with high power at n=300. Pairing turned an underpowered gate into a working one at zero extra labelling cost.
- Add K=3 generations per item for both models if decoding is nondeterministic; report the delta CI from the paired bootstrap over items.
The general lesson: state each gate's minimum detectable effect next to its threshold, and get sensitivity from pairing and resampling before buying it with more labels.

### Cost-performance frontiers

Model selection is a Pareto problem: plot quality (calibrated eval score) against cost per request and latency across candidate models and configs; only frontier points are candidates. Practical additions: cascades/routing (a cheap model with escalation on low confidence or judge-flagged outputs often dominates any single point), quality-per-dollar as the gate metric for cost-sensitive surfaces, and re-running the frontier on every pricing or model-version change, since frontiers shift monthly. Judge cost is part of the frontier: jury-of-minis batteries exist precisely because scoring at production scale with frontier judges inverts the economics.

### Gold-label auditing and gold-error-aware scoring

Your gold labels are wrong at rates that dominate small deltas. Northcutt et al. found pervasive test-set label errors across ML benchmarks; MMLU-Redux re-annotated 5,700 MMLU questions across all 57 subjects and estimates that about 6.5% contain an error of some kind, counting wrong gold labels together with unanswerable, ambiguous and multiple-correct-answer items, so the wrong-gold-label rate on its own is lower than that headline ([Are We Done with MMLU?, arXiv:2406.04127](https://arxiv.org/abs/2406.04127), 45 min; the virology subset runs at 57%). About 5% of GSM8K items are wrong, and PlatinumBench found that after cleaning, a majority of residual "model failures" on many benchmarks were label noise. Consequences: ceiling effects are artificial, model rankings can flip by 10-15 points on cleaned sets, and a regression gate can fail a genuinely better model for disagreeing with wrong gold. The per-benchmark rates, and the expert re-grading of six physics suites that generalises them, are in [Knowledge and reasoning benchmarks: MMLU family, GPQA, HLE, ARC-AGI](../benchmarks/knowledge-and-reasoning.md).

The generic pattern (gold-error-aware consensus scoring), applicable to any internal golden set:

1. Never treat gold as infallible; store a confidence/provenance field per label.
2. Route model-vs-gold disagreements through a consensus battery: multiple strong, family-diverse models (or judges with retrieval/tools) re-answer the item independently; strong consensus against gold flags the label, not the model.
3. Human-adjudicate flagged items; the output is a corrected label or an "ambiguous, exclude from gating" tag: ambiguity is a valid label state and forcing it corrupts metrics.
4. Score with error-awareness: report metrics on the platinum (verified) subset for gating, full set for tracking; or down-weight low-confidence labels.
5. Make it continuous: every gate failure triggers label audit of the failing items before the failure is believed. In mature systems, disagreement mining doubles as golden-set quality control and as discovery of genuinely hard items.
This is the same machinery as judge calibration pointed at the dataset instead of the judge: the eval system has three fallible components (model, judge, gold) and any observed delta must be attributed to one of them before action.
