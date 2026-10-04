# LLM-as-judge: visualisation ideas

Central question: how do you build, debias, calibrate and choose a judge, and what is the evidence for each default?

Scores 0 to 2 on: reader control moves the quantity; reproduces a published figure; public real inputs; shows what a sentence cannot; corrects a misconception; measures the central question; absent from the parent and siblings.

## Built

| # | Idea | Score | Data and formulas | Placement |
|---|---|---|---|---|
| V1 | **Raw judge rate against the gold-slice correction** (before/after animation; DeepSeek MLA pattern). One model's MT-Bench comparisons as squares; steps: judge labels everything, the naive report, draw a seeded gold slice, humans label it (TP/FN/FP/TN), sensitivity and specificity, Rogan-Gladen corrected rate with Lee et al.'s eq. 8 interval, reveal the truth. "Before" runs judge, report, truth; "After" the full path. Model and slice size selectable; counters; play/pause/step/scrub/speed; paused under reduced motion | 13 | `inputs/mtbench_votes.json` (released human votes and GPT-4 verdicts); estimator and interval from arXiv 2511.21140 eqs. 7 to 12; seeded mulberry32 draw mirrored in `recompute.py` | Reading, Calibration |
| V2 | **Protocol lab**: GPT-4 run five ways (one order each way, both orders in two runs, pointwise 1 to 10) against 3,355 human votes; filters (pairs, voters, turn, ties, leave out GPT-4 pairs); agreement bar with the human-human tick and chance tick, kappa, tie rate; confusion matrix; length preference of judge and humans; dumbbells of win rates (list level) with Spearman; Table 5 reproduction box | 13 | same data; Zheng et al.'s agreement definition; Cohen's kappa over 3 or 2 outcomes | Tab |
| V3 | **Calibration lab**: model, judge, slice size 20 to 400, seeded redraws; raw, corrected and labels-alone intervals against the truth; 200 redraws (coverage, spread); interval width against slice size, corrected against labels alone | 12 | same; Wilson interval for labels alone | Tab |
| V4 | **CALM robustness grid**: 6 judges by 9 injected biases, sortable, a toggle subtracting the judge's own consistency, tap for the definition and what the number means | 9 | CALM Table 4, extracted by `extract_calm.py` to `inputs/calm_table4.tsv` | Reading, Biases |
| V5 | Tables: one-screen decisions, four modes, bias catalogue with measured sizes and mitigation costs, null-model results, fine-tuned judges own vs independent, meta-evaluations | 7 | papers, atlas readings | Reading |

Defaults that reproduce published figures: Zheng et al. Table 5 (GPT-4 pair vs experts and expert vs expert, both turns, S1 and S2): every vote count exact, every percentage rounds to the paper's, independently from the released files. Not reproduced: Table 5's pointwise row (60%, 1,280 votes), because the released single-grading file is a later run grading Vicuna v1.3. Lee et al.'s own Arena numbers are not reproduced (their GPT-4.1-mini judgments are not in our data); the page runs their estimator on MT-Bench instead and finds, like them on Arena, that the labels alone give narrower intervals for a GPT-4-era judge.

## Rejected

| Idea | Why not |
|---|---|
| Rebuilding position, length and own-family bias charts | The parent's Judge bias lab owns them (Arena-Hard pair, AlpacaEval padding, per-study panels); linked. |
| A judge grid or meta-eval chart | The parent's Judge atlas owns all 26 rows with dated readings; linked; this page quotes readings in tables. |
| Checklist (RocketEval) animation | The RocketEval paper page already has a before/after on released gradings and a re-ranking lab; linked. |
| A jury simulator (PoLL vs RoPoLL with a corrupted juror) | No released per-juror judgments on shared items were found; a simulation with invented juror behaviour would be illustrative only and the RoPoLL numbers are on its own corruption setups. Text instead. |
| Calling a judge offline to test mitigations (CoT, reference, rubric) on MT-Bench | No API calls in this build; the released GPT-4 runs already give one-order, both-order and pointwise verdicts, which is what the protocol lab varies. |
| Length-controlled rate inside the protocol lab | Would require fitting AlpacaEval's GLM to MT-Bench, a method its authors never applied there; the lab reports the raw length preference of judge and humans instead and links the LC discussion. |
| Kappa animation | The parent's Calibration section has the worked example; linked. |

## What the methodology lacked for this page

A rule for two released runs of the same judge that disagree (the leaderboard run and the run released with the votes differ on 15.6% of shared comparisons). Handled by showing both as separate protocols and saying so, rather than choosing one.
