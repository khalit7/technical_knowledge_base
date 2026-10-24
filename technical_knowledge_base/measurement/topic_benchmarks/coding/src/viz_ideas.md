# Visualisation ideas: Coding benchmarks

| Rank | Idea | Score (teach / data / cost) | Placement | Data |
|---|---|---|---|---|
| 1 | HumanEval vs HumanEval+ on real Codex samples (before/after test suites) | 5/5/4 | Reading, animation | Codex paper App. B samples; HumanEval+ v0.1.10 inputs; run in recompute.py |
| 2 | pass@k: Codex estimator vs plug-in, one problem then all draws (before/after estimator) | 5/4/5 | Reading, animation | illustrative draw, exact binomial sums |
| 3 | One SWE-bench task opened, harness run on four candidates | 5/5/3 | Tab | SWE-bench Verified row django__django-11099; regex tests re-run in Python |
| 4 | LiveCodeBench date slider rebuilt, monthly series with markers | 4/5/3 | Tab | performances_generation.json |
| 5 | pass@k curves on real per-problem counts | 4/5/4 | Tab (pass@k lab) | same, models with n = 10 or 4 |
| 6 | Real-SWE grid, drop a task, watch the ranking | 4/5/5 | Reading | Real-SWE page |
| 7 | SWE-rebench before/after release split (a null result) | 4/4/4 | Reading | board's embedded data |
| 8 | Three answers to contamination side by side | 3/4/5 | Reading, cards | sources inline |
| 9 | SWE-bench Pro versions and splits drawn to scale | 3/4/5 | Reading | paper, Scale boards |

Rejected: a SWE-bench Verified saturation chart (the parent's Saturation timeline has it); SchrodingerRepo live transformation (its paper page has it); Phi-Bench replay (its paper page has it); a vendor Codeforces rating chart (ratings not comparable across labs).

What the methodology lacked: a rule for leaderboard data that is visibly broken (DeepSeek-V3's 2025 zeros on LiveCodeBench); here they are excluded where scores are compared and kept, labelled, where only estimators are compared.

## 2026-10-24 rebuild (teaching contract)
| Idea | Kind | Placement | Data |
|---|---|---|---|
| Hero: the pipeline task, model in a harness, tests, score, with one same-model pair per lever | static annotated diagram plus dumbbells | Reading top | published pairs: EvalPlus board (MBPP, MBPP+), Scale V2 blog, SchrodingerRepo Table I, SWE-Bench Pro paper and V1 board |
| SWE-bench probes: SWE-Bench+ 12.47 to 3.97; Illusion 76 vs 53, 35 vs 18 | static dumbbells | Reading, flaws | the two papers |
| pass@k curves on real counts, LiveCodeBench monthly chart, harness stepper | moved from tabs | Reading, beside their claims | unchanged |

Rejected: one model's SWE-bench readings across splits and harnesses (Claude Opus 5, 63.4% to 99.4%): the parent's Same model, many numbers tab owns it; a SWE-bench Figure 1 image: the harness stepper shows the same pipeline on a real task; any photo: nothing physical to show.
