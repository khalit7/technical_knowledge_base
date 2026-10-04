# Judge atlas (t-judges): visualisation ideas

The tab's question: which judge can I trust for my task, and what evidence says so? A judge is an instrument; the atlas lists the instruments and the calibration tests that rate them, and shows each reading with the metric, who ran it and when.

Scores are 0 to 2 on the Methodology questions (reader control, reproduces a published figure, public inputs, shows what a sentence cannot, corrects a misconception, measures the central question, absent elsewhere).

## Built

| # | Idea | Score | Data | Placement |
|---|---|---|---|---|
| J1 | **Sortable, filterable grid of 13 judges and methods and 13 tests and studies** (kind, mode, headline reading with its metric named and its kind badge, weights, cost, date, source, status), after the benchmarks root's atlas (`topic_benchmarks/src/parts/32_*`) | 12 | `judges.json` from `mk_judges.py`; every reading checked against `inputs/` by `recompute.py` | Tab, top |
| J2 | **Headline = best independent reading; the best self-reported or vendor-run one shown beside it, flagged** (PoLL, RocketEval and Agent-as-a-Judge have no independent reading on a shared metric and say so) | 11 | `PREF` in `mk_judges.py` | Grid and detail |
| J3 | **Sorting the reading column sorts by metric first, then value**, so two metrics never interleave (checked by `check_judges.mjs`) | 10 | | Grid |
| J4 | **Detail panel: every reading, one list per metric, the row ranked among all readings on that metric** (judges) or every judge measured on it (tests); chance level and direction per metric | 12 | | Tab |
| J5 | **Side by side for 2 or 3 rows, with presets**: fields shaded where they differ; then one line per metric shared by at least two rows; metrics only one row has are listed, never lined up; "no metric in common" stated | 11 | | Tab |
| J6 | **One metric at a time**: dot chart by publication date (JudgeBench accuracy 2024 to 2025, with vendor submissions hollow) or ranked (a single study's snapshot, such as Norman et al.'s 21 kappas); chance line; tap a dot for the reading and a jump to its row | 10 | readings with 4 or more points on one metric | Tab, bottom |
| J7 | **Corrections box**: three claims of the old LLM-as-judge page, each with its source (JudgeBench "about 64%", the rule-of-thumb ordering, inter-annotator "75-85%") | 9 | | Tab, top |

## Rejected

| Idea | Why not |
|---|---|
| One "judge quality" score per row, or a radar across meta-evaluations | Would put different metrics on one axis; Norman et al. show ranks move by up to 14 places between meta-evaluations, so any composite hides the main finding |
| Converting JudgeBench accuracy into kappa (or agreement into kappa) to merge series | The protocols differ (both orders combined vs one judgment per item); a conversion would be an invented number |
| Cost per judgment column in dollars for every judge | Sources publish cost in incompatible units (per 1,000 benchmark runs, per million tokens, hours of human time, GPU minutes); kept as quoted text with its source, never converted |
| Chart of JudgeBench by date including Norman et al.'s 2026 kappas | Different metric and protocol; they get their own ranked chart |
| Bias-by-bias bars from EvalBiasBench or CALM | Owned by the Judge bias lab tab; the atlas keeps EvalBiasBench's total only |
| Preference leaderboards (Arena, AlpacaEval, Arena-Hard, WildBench) as rows | Owned by Human preference and arenas; linked |
| Reading values off the RewardBench 2 or JudgeBench leaderboards' web pages | Only files and paper tables are used; the JudgeBench leaderboard's vendor CSV is read as a file and flagged vendor-run |

## What the Methodology lacked here

A rule for readings whose "who ran it" is mixed: a third party running a competitor's judge in its own paper (Prometheus 2 running Auto-J, PoLL running GPT-4) is independent of that judge but not neutral. Recorded as independent with a note naming who ran it.
