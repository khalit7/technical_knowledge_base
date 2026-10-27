# Visualisation ideas: Re-grading six physics benchmarks

Central question: how much of a benchmark's "model failure" is the benchmark's, and how far do the corrected scores themselves deserve trust?

Scores: reproduces a published figure (x2), computable from public data (x2), shows what a sentence cannot, corrects a misconception, measures the central question; minus build cost.

| # | Idea | Placement | Score | Status | Data and formulas |
|---|---|---|---|---|---|
| P-re_grading_six_physics_benchmarks.1 | **Follow the audit**: one square per question through select, grade, audit run, expert labels, exclude or repair, re-grade, for all six benchmarks; counters for questions in play, audit run, labels, GPT-5.6-Sol score; excluded squares stay faded | Own tab (live ingredient) | 12 | built | Appendix B and C counts; arrangement illustrative, counts exact |
| P-re_grading_six_physics_benchmarks.2 | **Protocol simulator**: a benchmark built from rates (defects, accuracy, false rejection) plus the three the paper never measured (false acceptance, defective-accepted, reviewer mislabel); the paper's protocol against the truth | Follow the audit tab | 12 | built | presets from Table 2 by construction; expected counts formula in the tab |
| P-re_grading_six_physics_benchmarks.3 | **Defect floor**: measured error against true model error with defect and grader rates, the model's share of errors, the floor; presets land on each audit run's rejection rate by construction | Reading, §5 | 11 | built | E = d + (1 - d)(e + (1 - e)g) |
| P-re_grading_six_physics_benchmarks.4 | Figure 1 rebuilt as before/after dumbbells by model and metric, with Wilson whiskers on pass@4 and question counts | Reading, Results | 10 | built | Table 1 |
| P-re_grading_six_physics_benchmarks.5 | Predict, then Figure 2 rebuilt (label shares for all six, pooled row) | Reading, Results | 10 | built | Table 2, Appendix B.2 |
| P-re_grading_six_physics_benchmarks.6 | Predict, then **two graders run on the paper's cases** (exact string against numeric spot check, in-page expression evaluator), including the limit-and-sign case a spot check cannot settle and a wrong key it cannot tell from a wrong model | Reading, Results | 10 | built | Figure 3, Appendix D |
| P-re_grading_six_physics_benchmarks.7 | Case gallery of the 11 worked examples with label chips | Reading | 8 | built | Figures 3 to 6, Appendices D and E |
| P-re_grading_six_physics_benchmarks.8 | **By-construction check**: (accepted + grader errors) / kept against the reported pass@4 for GPT-5.6-Sol | Tables tab | 10 | built | Appendix B.3, Table 1 |
| P-re_grading_six_physics_benchmarks.9 | **Removal against re-grading**: score from dropping excluded questions only (upper bound) against the reported corrected score, per model | Tables tab | 10 | built | Table 1 counts; UGPhysics exceeds 100%, shown as the assumption failing |
| P-re_grading_six_physics_benchmarks.10 | **Scott's pi bounded by enumeration** from raw agreement, Table 2 finals and Table 4 pairs (reviewer label shares unprinted) | Tables tab, How much to believe | 9 | built | recompute.py |
| P-re_grading_six_physics_benchmarks.11 | Integer check of all 70 Table 1 percentages, Artificial Analysis cross-check (113 of 350) | Tables tab | 8 | built | recompute.py |
| P-re_grading_six_physics_benchmarks.12 | Artificial Analysis CritPt leaderboard as a ceiling chart (top ten within 108 to 113 of 350) | none | 6 | runner-up: one sentence carries it; the leaderboard is a moving page | aa_critpt_20261003.json |
| P-re_grading_six_physics_benchmarks.13 | Kitaev 3x2 ground-state energy computed live under both conventions | none | 5 | rejected: would need an exact diagonalisation of a 12-spin model in the page and the reference answer is private; the factor of four is stated by the paper | |
| P-re_grading_six_physics_benchmarks.14 | Monte Carlo bootstrap of corrected scores from per-question grades | none | 4 | rejected: no per-question data released; Wilson intervals from counts used instead | |

What the methodology lacked: an "audit paper" kind. Its live ingredient is the audit protocol itself, and the most useful visual is the one that simulates what the protocol cannot observe.
