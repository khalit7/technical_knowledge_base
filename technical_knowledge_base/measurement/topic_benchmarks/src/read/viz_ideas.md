# Reading tab: visual ideas (built and rejected)

Question the Reading tab keeps returning to: how much can one benchmark number mean, given where the benchmark is in its life and what the number leaves out?

Scored 0 to 2 per the Methodology (html_utils/interactive-html-ideas.md section 2); reproducing a figure and being computable count double; animation point added.

| # | Idea | Score | Placement | Status |
|---|---|---|---|---|
| R1 | **Life of a benchmark, then against now, animated**: MMLU (2020: 43.9, 67.5, 86.4, 92.3) and Terminal-Bench-Science 0.1 (2026: 30.0, 52.6, 64.6) stepped through born, discriminates, saturates (MMLU errata band), replaced, then both on one time axis; counters for days, score, headroom, points per 30 days; pace ratio about 29x derived | 13 | Reading, Life of a benchmark | built (Khalid asked for one before/after animation; "a benchmark's life from launch to saturation" was one of his two suggestions) |
| R2 | **Error bars by item count**: presets AIME 30, GPQA Diamond 198, SWE-bench Verified 500, HLE 2,500; true-rate slider; simulated re-runs as ticks against the exact binomial 95% band; stats (one item's worth, SE, ±CI, gap that is not noise) | 12 | Reading, Sampling | built; reproduces the old page's rules of thumb independently (AIME several points: 7.3; GPQA ±4: 4.18; SWE-bench 2 points within noise: ±4.0) |
| R3 | One model, step by step adding conditions (harness, split, version, sampling) | 9 | none | rejected: no single model has published scores under all those conditions on one benchmark, so the steps would splice different models or benchmarks (Methodology: never splice); the measured spreads are the Same model, many numbers tab's job |
| R4 | "Headline decoder" bars, one real spread per condition (62.7/99.9, 22.7/17.8, 38.7/54, 23.9/82.2) | 8 | none | rejected: repeats the Same model, many numbers tab; kept as text with links |
| R5 | Family x status grid | 7 | none | rejected: the Benchmark atlas owns status per benchmark; the Reading families are prose |
| R6 | pass@1 against maj@k simulation | 7 | none | rejected for the root: needs real per-problem solve rates to be more than illustrative; listed for a Math child in for_children/methodology_depth.md |
| R7 | Contamination defence ladder diagram | 5 | none | rejected: a sentence carries it |

What the Methodology lacked here: a rule for comparing two different benchmarks on one axis. Both series are "% of items solved", the same kind of figure, but on different tests; the chart says so in its caption and asks the reader to compare shapes and speeds, not heights.
