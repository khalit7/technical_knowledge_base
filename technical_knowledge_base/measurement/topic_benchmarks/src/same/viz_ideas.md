# Same model, many numbers: visual ideas

The question the tab answers: "a model's score on a benchmark is quoted; under which conditions, and how much would it move under others?"

## Built
| # | Idea | Why it earns its place | Score (of 10) |
|---|---|---|---|
| 1 | Case explorer: one row per reading on a shared 0 to 100 scale, colour by who ran it, hollow dot for a different metric, exact 95% whisker where the score is a share of known items; tap for every condition and source; tick two rows for a field-by-field diff with the differing fields highlighted | The core rule (never one series) made visible: rows are separate marks, never a line; the diff shows exactly which conditions separate two numbers | 9 |
| 2 | "Is this gap noise?" button from a two-row comparison into the calculator | Joins "what differs" to "does it matter" | 8 |
| 3 | Calculator: exact Clopper-Pearson and Wilson intervals, Fisher's exact test and Newcombe interval (unpaired), exact McNemar and paired Wald interval with a slider over the possible number of disagreeing items, the p-value curve over that range, and the smallest score B needs to clear noise; presets for 14 real benchmark sizes | Recomputes a published kind of figure exactly (checked against SciPy/statsmodels); the disagreement slider teaches why paired comparisons are sharper and why two scores alone cannot settle a paired test | 9 |
| 4 | Animation, one model one benchmark, one condition per step, earlier steps kept as numbered ticks (not joined), changed condition cards highlighted, flag when a published run changes several at once; three tracks (Astra on Terminal-Bench: version, harness and tester, effort, pass@k; Astra on ARC-AGI-3: effort and harness, each step clean; Opus 5 on SWE-bench Pro: version and tester, then split); before-and-after mode | Khalid's preferred before/after form; every step is a published reading with its source | 9 |

## Rejected
- A slope or line chart joining a model's readings: would present different conditions as one series (methodology rule).
- One combined chart of all twelve cases on one axis: mixes RHAE, partial credit, pass@k and accuracy.
- Binomial whiskers on RHAE, OSWorld partial credit, or rows with unknown item count: not proportions of items, or n unknown.
- Treating trials as items in the calculator (330 trials on 66 tasks): overstates precision; the note cites Anthropic's per-trial against per-task errors instead.
- A Hyper-tau-bench case (23.9% alone against 82.2% with an engineer): one pair only, and the Reading tab owns it.
- A DeepSeek-R1 AIME case (79.8 pass@1, 86.7 cons@64, AIME 2025 70.0 from the 0528 card with different settings): the o1 case shows the sampling point with a cleaner primary table; the R1 settings for the AIME 2025 column are unstated.
- MathArena runs: per-model pages unreachable.

## What the methodology lacked
A rule for "a published run changes several conditions at once" in a one-condition-at-a-time animation: shown as a step with a visible flag naming how many changed, never split into invented intermediate readings.
