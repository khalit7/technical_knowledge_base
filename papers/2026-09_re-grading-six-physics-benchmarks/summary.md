# Re-grading six physics benchmarks: most model failures were the test's fault

⏱ 3 min read · +25m resources

arXiv 2609.13009, 14 September 2026. Surfaced through TLDR AI's edition of the same day.

### The claim

Six widely used physics benchmarks were re-graded by people who know the physics. A large share of the items where frontier models were scored wrong turned out to be defective rather than hard: answer keys that were simply incorrect, questions admitting more than one defensible reading, and automated graders that marked correct answers wrong because of formatting or unit handling. With those items corrected, frontier model performance on these suites is close to saturated.

### Why this is the most useful eval result of the window

It inverts the usual reading of a benchmark gap. The standard inference from "the model scored 62%" is that the remaining 38% measures something the model cannot do. This says a substantial part of that residual measures something the benchmark got wrong, and that the error is concentrated precisely in the hard tail everyone quotes. Anyone who owns an evaluation framework now has to treat the residual as a mixture of model failure and item defect, and has no way to separate the two without expert re-grading.

The authors' own conclusion follows from it: the answer is not another leaderboard built on the same pipeline, but harder exams written by humans who can be held to the answer key.

### Caveats

Physics, six suites. Nothing here establishes the same defect rate in code, mathematics or agentic benchmarks, though the failure modes named (key errors, ambiguity, grader bugs) are not physics-specific and there is no obvious reason they would be rarer elsewhere. The "near-saturated" conclusion is a claim about these six suites after correction, not about physics reasoning in general.

### Connections

Belongs next to the rule on [Topic: benchmarks](../../topics/benchmarks/summary.md) that a harness-sensitive number reported without a named harness carries no information. This is a third sensitivity on the same axis: a benchmark number carries no information without knowing the defect rate of the items it is scored on. Read alongside Goodfire's activation-level reward-hacking monitors and the Vals AI Legal Research Bench result from the same window, both of which say the measurement apparatus, not the model, was the thing that moved.
