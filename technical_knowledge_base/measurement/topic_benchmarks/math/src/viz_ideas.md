# Visualisation ideas: Math benchmarks (child of Topic: benchmarks)

Central question: what does a math benchmark score mean once the protocol (sampling rule, runs, interval), the version and the answer key are known? Existing visuals checked first: the parent's Benchmark atlas, Saturation timeline (GSM8K, MATH, AIME 2025/2026, FrontierMath), Same model, many numbers (o1 on AIME 2024, error-bar calculator) and the Reading tab's binomial widget; the physics re-grading paper page (audit funnel). None of those use per-sample data.

Scores: quantity the reader moves (0-2), reproduces a published figure (x2), computable from public data (x2), shows what a sentence cannot, corrects a misconception, measures the central question, absent elsewhere; minus build cost.

| # | Idea | What it shows, what the reader does | Score | Data and sources | Placement | Status |
|---|---|---|---|---|---|---|
| M1 | **One AIME problem, four real samples, three rules (before/after by rule)** | AIME 2025 I problem 15 with the real answers of nine models (GPT-4o to GPT-5.2), revealed, graded, then scored as pass@1, maj@4 (exact, ties split) and pass@4; then the whole exam under all three rules | 2+2+2+2+2+2+2 = 14 | MathArena/aime_2025_outputs (CC BY-NC-SA 4.0); exam totals reproduce MathArena's table for pass@1 independently | Reading, Contests | built |
| M2 | **Sample lab** | All 15,213 released answers for AIME 2025, AIME 2026, HMMT Feb 2026: scores by rule for any model, k = 1 to 4; answer grid; answer distribution per problem; all models with three kinds of interval; exact paired permutation test between any two | 2+2+2+2+2+2+1 = 13 | Same datasets; pass@1 reproduces 120 of 122 table rows exactly; the ± rule reproduces all 123 | Own tab | built |
| M3 | **GSM-Symbolic, one question perturbed (before/after)** | Original GSM8K item, its template, three real instances, M1, P1, P2 and NoOp, with a chosen model's Table 1 accuracy bars, the 50-set spread and binomial chance at 100 items | 2+1+2+2+2+1+2 = 12 | arXiv 2410.05229v2 Figures 1, 5, 7 and Table 1; apple/GSM-Symbolic instances (verbatim, CC BY-NC-ND) | Reading, GSM8K | built |
| M4 | **FrontierMath tier ladder filling by model release date** | Four tiers with Epoch's descriptions, access and holdout, and the best Epoch v2 score on Tiers 1-3 and Tier 4 as the date advances; counts of problems left | 1+1+2+2+2+2+1 = 11 | Epoch about page, v2 changelog, January 2025 statement; Epoch v2 series via the parent's saturation.json | Reading, FrontierMath | built |
| M5 | **95% half-width by item count for the math sets** | At 80% or at today's top: AIME ±14.3 against GSM8K ±2.2 | 1+0+2+1+1+2+1 = 8 | 1.96·√(p(1−p)/n) | Reading, Error bars | built |
| M6 | MathArena interval rule | Not a chart: the ± reproduced as 1.96·√(p(1−p)/answers) on all 123 rows, against clustered and binomial-on-problems intervals | finding | recompute.py | Reading text and Sample lab | built |
| M7 | Run a small open model on GSM-Symbolic offline | Would add real per-instance answers, but the paper's Table 1 already covers 25 models and the CPU budget is better spent on M2 | rejected | | | rejected |
| M8 | Re-draw the saturation curves for GSM8K, MATH, AIME, FrontierMath | The parent's Saturation timeline owns them | rejected | | | rejected |
| M9 | IMO score chart | Too few points and graded three different ways; a table with the grader stated is clearer | rejected | | | rejected |
| M10 | Omni-MATH judge disagreement demo | No released per-item judge outputs to show; the board is dormant | rejected | | | rejected |

What the methodology lacked: a rule for intervals when a protocol has several runs per item (answers versus problems as the unit); this page reports all three and says which question each answers.
