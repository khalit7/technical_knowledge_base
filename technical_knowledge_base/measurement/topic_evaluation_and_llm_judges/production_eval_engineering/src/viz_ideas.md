# Visualisation ideas (Production eval engineering)

Central question: does this change earn its way to users, and which stage of the pipeline would notice if it should not?

Scores 0 to 2 each: quantity moves with a control; defaults reproduce a published figure; inputs from public data; shows what a sentence cannot; corrects a misconception; measures the central question; can be a step-by-step before/after animation.

| # | Idea | Placement | Score | Status | Data |
|---|---|---|---|---|---|
| PE1 | **One model swap, two gates** (before/after animation): claude-v1 (champion) against claude-instant-v1 (challenger) on MT-Bench's 160 graded turns in 8 tagged slices, one square per turn; steps: golden set, champion graded, challenger graded (one judge failure crossed out), paired deltas, quality gate (aggregate threshold, or per-slice thresholds with paired 95% intervals), budget gate (2023 list prices, real answer lengths), decision; "after" mode ends in error analysis of the three largest writing drops with GPT-4's own rationale, and the promotion of a new tag. Counters: judge calls, judge cost from real token counts, pairs, worse/level/better, verdict | Reading, One swap, two gates | 13 | built | LMSYS MT-Bench released gpt-4_single.jsonl, question.jsonl, two answer files; tiktoken cl100k_base counts; Anthropic July 2023 price sheet; OpenAI pricing May 2023 (Wayback). Aggregate -0.03 passes; writing -0.95 (-1.51 to -0.39) fails; extraction -0.70 to review |
| PE2 | **Gate designer**: any champion and challenger among 34 models, aggregate and slice thresholds, confidence, significance and review toggles; per-slice bars and table; "Across all 1,122 swaps" counts what an aggregate gate ships (626 pass, 67 of them fail a slice at defaults), clickable | Own tab | 12 | built | same file, all 34 models (5,440 grades); paired t intervals with a Cornish-Fisher t quantile, checked against scipy by check_core.mjs |
| PE3 | **Leaderboard number reproduced with the judge failure averaged in**: 7.906 (FastChat rule) against the published 7.85; (sum - 1) / 160 = 7.850 exactly | Reading, callout under PE1 | 10 | built (text with live numbers) | leaderboard_table_20250804.csv; recompute.py |
| PE4 | **Cost-quality frontier** of four MT-Bench models at mid-2023 list prices, prompt-share slider moves the blended price; frontier recomputed (claude-instant-v1 joins it above about 91% prompt share, where its blended price drops below gpt-3.5-turbo's) | Reading, Cost and latency budgets | 9 | built | MT-Bench means; Anthropic and OpenAI 2023 prices (inputs/) |
| PE5 | **Case file**: 21 dated public write-ups placed on the promotion path, chips by stage, red where a stage missed, green where credited | Own tab | 9 | built | inputs/writeups/ extracts, fetched 2026-10-04 |
| PE6 | Golden set before and after promotion as its own animation (items moving from production failures into a v2 set) | none | 6 | folded into PE1's last step | No public data on real production failures with labels; a stand-alone version would be illustrative only |
| PE7 | Interleaving against A/B sensitivity simulator | none | 6 | rejected | The published figures (Netflix >100x, Airbnb 50x, Chapelle 17.8 to 379x) say it; a simulator would only reproduce assumed click models |
| PE8 | Minimum-detectable-effect calculator per slice | none | | rejected here | Belongs to Eval statistics (the root's sample-size calculator went there); the Gate designer shows the consequence on real data |
| PE9 | Temperature-0 nondeterminism demo | none | 5 | rejected | Thinking Machines' own figures are quoted; reproducing needs a GPU server under variable load |
| PE10 | SRM chi-square checker | none | 5 | rejected | Generic experimentation tooling; a sentence and the Fabijan source carry it |

Inspiration: the DeepSeek MLA explainer pattern (same input, old method then new); the root page's harness animation controller (Play, step, scrub, speed); MT-Bench's own category tags as slices.
What the methodology lacked: a rule for a published aggregate that silently includes an evaluation failure; handled by reproducing it exactly both ways and stating which matches.
