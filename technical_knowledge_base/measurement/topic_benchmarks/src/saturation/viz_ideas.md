# Saturation timeline: visual ideas (built and rejected)

Question the tab answers: how long does a benchmark take to go from launch to (near) saturation, and is that time now weeks?

Scores 0 to 2 per the Methodology (quantity the reader moves; reproduces a published figure; computable from public data, counted double; shows what a sentence cannot; corrects a misconception; measures the central question; absent elsewhere), minus build cost.

| # | Idea | Score | Placement | Status |
|---|---|---|---|---|
| 1 | Small multiples: every benchmark's best score over time, one step line per series (version, harness, runner), human line, threshold line, launch line, first crossing ringed; toggle own dates against days since launch on a shared log scale | 12 | Tab, first | built |
| 2 | One-benchmark chart with chips: same encoding at full width, marker shape by who measured it (independent, leaderboard, benchmark authors, lab hollow), tap a point for date, model, series, version, harness, runner, note, source; all points as a table | 12 | Tab | built |
| 3 | Ranked durations, log scale: launch to threshold, settings for 80/90%, human or 100% ceiling, above chance, drop lab points; open and replaced shown as dashed bars; flags when the crossing is lab-reported, on a later version or on a special harness | 13 | Tab | built |
| 4 | Duration against launch date (scatter, censored as hollow triangles) plus era table with medians and the open list | 11 | Tab | built |
| 5 | Replay animation, before/after on the same data: calendar time against "aligned at launch" (every benchmark's clock starts at its own launch; weekly frames for the first 10 weeks, then monthly); bars as share of ceiling with 80/90 ticks; counters; caption lists the crossings of the frame; play, pause, step, scrub, speed; only runs on screen and in the visible tab; paused at start, no bar transitions under reduced motion | 11 | Tab | built |
| 6 | Terminal-Bench-Science claim check: every reading of Opus 5, Fable 5.1 and Astra by who measured it, with model-public and figure-published dates | 10 | Tab | built |
| 7 | Successor table: versions per family with launch-day frontier and time until the next version | 9 | Tab | built |
| 8 | Fitted exponential trend of time to saturation | 3 | none | rejected: 23 points, heavy censoring and selection; a fit would claim more than the data holds (the era table and caveats say what can be said) |
| 9 | Kaplan-Meier survival curve of "unsaturated" benchmarks | 6 | none | rejected for now: correct for censoring but hard to read for this audience; the open benchmarks are listed by name instead |
| 10 | One combined line per benchmark (max over versions) | 2 | none | rejected: splices versions; only the replay uses the best listed reading, labelled as such |
| 11 | MMLU against Terminal-Bench-Science, animated | n/a | Reading tab | owned by the Reading tab; not repeated |
| 12 | Current models on fixed benchmarks | n/a | Topic: llms, Benchmarks tab | linked, not repeated |

## Data decisions
- Records only per series; launch-day point always kept. Dates: model release (Epoch's convention) for tracker runs, paper or results date otherwise; tracker run dates kept in the point details.
- Version breaks: ImageNet 2010, 2011 and 2012+ test sets; GLUE paper v1, the 2018 leaderboard and the leaderboard after the QNLI re-release; MATH full set, MATH-500 and Level 5; FrontierMath 2025-02-28 and v2; OSWorld original and Verified (100 steps); SWE-bench Verified 500 (OpenAI) and 484 (Epoch); ARC models against refinement systems; ARC-AGI-3 standard against Provider Adapter harness; Terminal-Bench 2.0 Terminus 2 against any agent; TB 3.0 and 4.0 and Science 0.1 as separate benchmarks.
- Left out: Kaggle ARC systems (unusable dates in the leaderboard file), vendor figures only visible in images (Claude 3.5 Sonnet HumanEval, Claude 3 GSM8K), MMLU-Pro and SWE-bench Pro (no long dated independent record in the hub), AIME 2024 (MathArena did not run it at the time).

## What the methodology lacked here
- A rule for censored durations (benchmarks not yet saturated, or replaced first). Used: show them as lower bounds, keep them out of medians, list them by name, and say the medians overstate speed.
- A rule for the date of a point when a tracker evaluates a model months after release. Used: model release date, run date in details.
