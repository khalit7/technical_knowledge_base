# Visualisation ideas: Eval statistics

Central question: **how much can this number move without anything having changed, and how many items does a decision need?** A visual earns its place when it makes an interval or a sample size measurable on real per-item data, or reproduces a published interval, power or coverage figure.

Scores 0 to 2 per question (quantity the reader moves; reproduces a published figure (x2); computable from public data (x2); shows what a sentence cannot; corrects a misconception; measures the central question; absent elsewhere), minus build cost.

## Built

| # | Idea | Placement | Data and formulas | Reproduces | Score |
|---|---|---|---|---|---|
| ES1 | **One comparison, three intervals, same items** (before/after animation): every item a square; model B added; unpaired interval; pairing fades the concordant items and shrinks it; clusters regroup the squares and widen it; verdict. Toggle RACE-H (pass/fail) or MT-Bench (judge grades) | Reading, Pairing | RACE-H run here (2 models, 1,983 questions, 600 passages); MT-Bench GPT-4 grades (claude-v1 vs claude-instant-v1, 159 turns, 80 questions). Miller Eq. 5, 7, 8 | Parent topic's ±9.0 / ±4.4 shape on real data; production handoff's paired interval for the claude pair | 15 |
| ES2 | **Interval lab**: dataset, scoring rule (greedy, one sample, K samples, probability), any of 561 MT-Bench pairs, slice, subset of clusters; six intervals and seven tests | Own tab | same data; bootstrap and sign-flip permutation seeded | recompute.py checks every default row | 14 |
| ES3 | **Sample-size calculator**: pass/fail mode with exact McNemar power and Type-M; general mode (Miller Eq. 9/10) with K, clusters (design effect), slices (Bonferroni); presets with residuals | Own tab | Miller §5; Card et al. App. C; parent topic; old Production example | Miller 969 (residual 0), 13.2 and 7.5 (13.3, 7.6 with exact z; residual shown); Card power 0.25 and Type-M 1.9, n = 2,000 nearly 80% (exact, independent); parent topic 8,242 / 1,955 (by construction); old "3,500" and "high power at 300" shown failing | 15 |
| ES4 | **Small-n intervals**: exact coverage curves of CLT, Wilson, Clopper-Pearson, Bayes against the true rate, any n; average coverage, width, intervals outside [0, 1] | Own tab | binomial sums, no simulation | Bowyer et al.: CLT 92.5% at N = 100 (simulated) against 92.2% exact here | 12 |
| ES5 | **Variance split on real logits**: SE against K (Miller's curve from the measured Var(x) and E[sigma^2], dots from seeded sampling), probability and greedy lines; greedy shifts the mean | Reading, Variance | RACE-H letter probabilities | Miller §3.1 shape on real data | 11 |
| ES6 | **Clustered against naive** table: Miller Table 4 beside this page's RACE-H ratios and MT-Bench ratios | Reading, Clusters | same | RACE-H ratios 0.96 and 1.02 against Miller's 1.10 (independent, different models; does not reproduce, said) | 10 |
| ES7 | **Tests side by side** on the two default comparisons | Reading, Tests | same | | 8 |
| ES8 | **Many slices** calculator: familywise rate, Bonferroni and Sidak levels, item inflation per slice | Reading, Many slices | formulas | parent topic's 64% | 7 |
| ES9 | **MathArena variance split**: per model, item variance against run-to-run variance from 4 runs per problem; SE for 1, 4 and infinitely many runs, and the pooled-answers SE | Reading, Resampling | MathArena released answers (via the Math page's extract) | complements the Math page's 1.7x (not rebuilt) | 9 |
| ES10 | **Judge noise as a variance component**: MT-Bench expert votes, between-judge against between-item variance per model pair | Reading, Judge noise | lmsys/mt_bench_human_judgments | | 9 |

## Rejected

- **Re-run simulator at any benchmark size**: exists on Topic: benchmarks (Reading, Sampling); linked.
- **Exact-interval calculator with benchmark presets and Fisher's test**: exists on Topic: benchmarks, "Same model, many numbers"; the coverage tab links it and adds only what it lacks (coverage).
- **MathArena answers-against-problems interval for every row**: the Math page's "Error bars on 30 problems" owns it; linked, and ES9 shows a different quantity (the variance split).
- **Per-slice gate on MT-Bench**: Production eval engineering's Gate designer owns it; linked with its 67-of-626 figure.
- **Bayesian hierarchical clustered interval (Bowyer's importance sampler) live in the page**: possible but slow and adds little over the coverage tab's message; described with a link to bayes_evals.
- **Seed-variance chart redrawn from Madaan Figure 1**: curves only exist as images; Table 1 values used instead.
- **Signal-to-noise scatter from Heineman et al.**: the 900K-result dataset is large and its figures are images; cited with numbers from the text.
- **Live LLM judge re-grading to measure LLM judge noise**: no model can run in the sandboxed page and an offline frontier judge was out of reach; human expert votes measure the same component on released data.

## What the methodology lacked for this page

A statistics page has no single mechanism that replaced another; the before/after is between two analyses of the same data (unpaired against paired against clustered). The animation pattern still fits when the "method" is the analysis rather than the model. Published figures here are mostly worked examples with fictional inputs (Miller) or simulations (Bowyer, Card): reproducing them exactly by summation, and saying which were simulations, worked better than reading figures.
