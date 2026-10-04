# Benchmark atlas (t-atlas): visual ideas, built and rejected

The question this tab answers: across every benchmark the old page listed, which ones still tell frontier models apart, why (or why not), and what protects each from leaking into training data. Scored with the Methodology in `html_utils/interactive-html-ideas.md` section 2 (0 to 2 each: parameter the reader controls, reproduces a stated figure, computable from public data, shows what a sentence cannot, corrects a misconception, measures the central question, absent elsewhere; build cost subtracted; +1 for step-by-step animation against the method it replaced).

## Built

| # | Idea | Score | Placement | Data |
|---|---|---|---|---|
| A1 | **The grid**: 94 rows (benchmarks and benchmark versions), sortable, filterable by status, family, defence, grading, owner, corrections, text search; detail panel per row with every source, the old page's status cell verbatim and the correction | 12 | tab, top | `rows_*.py`, `rows_fix.py`, Epoch hub CSVs and the Topic: llms grid copied by script (`EP(...)`, `GRID(...)`), arXiv API |
| A2 | **Corrections list**: every old-page claim that changed, with the source that changed it (66 at build time) | 11 | collapsible box above the grid | `corr` fields |
| A3 | **Side by side** (2 or 3 rows) with differing fields shaded, presets for the cases where splicing is the trap (three OSWorld versions, Terminal-Bench versions, SWE-bench lineage, three answers to contamination, knowledge ladder, FrontierMath tiers) and a "do not put these on one axis" warning when the rows are related versions | 10 | below the grid | same |
| A4 | **Family x status map**: one chip per benchmark in its family row and status column, dimmed by the grid's filters | 9 | own section | same |
| A5 | **Contamination defence lanes**: one lane per defence, dots at the first-release year coloured by status, contamination outlined; stat tiles with share active and median year per lane, which shows the age confound openly | 10 | own section | same |
| A6 | **One training cutoff, five test sets (animation)**: a cutoff sweeps from Jan 2021 to Oct 2025 across GSM8K (1,319 test items, public Oct 2021), SWE-bench Verified (500 issues placed at their real GitHub creation dates, 2013 to 2023), LiveCodeBench release_v6 (1,055 problems by release window), FrontierMath Tiers 1-3 (private) and Real-SWE (licensed). Counters: items scored, share public before the cutoff, 95% error bar at 50% (1.96 x sqrt(0.25 / n)). Toggle "before and after" shows only static against refreshed. Play, pause, step, scrub, speed; animates only on screen in the visible tab; starts paused under reduced motion | 12 (incl. animation point) | own section | `inputs/anim_inputs.json` (Hugging Face datasets-server created_at; LiveCodeBench README) |

What A6 teaches that a sentence cannot: a static set built from public artifacts (SWE-bench) was exposed before the benchmark existed, and a rolling set never scores a seen item but pays in item count, so its error bar widens and it runs dry when no release is newer than the cutoff.

## Rejected

| Idea | Why |
|---|---|
| Frontier score against time, per benchmark | Owned by the Saturation timeline tab (t-sat); this tab gives one dated reading per row and the row ids it can reuse (`data/atlas.json`). |
| One axis of "frontier score" across benchmarks | Units differ (%, Elo, RHAE, minutes, mean reward); the rule is never to put different kinds of figure on one axis. |
| Models x benchmarks heatmap | Topic: llms, Benchmarks tab already has it; linked instead. |
| Same model under different harnesses | Owned by the "Same model, many numbers" tab (t-same). |
| Treemap of families by item count | Item counts are not comparable (tasks, questions, environments, generated on demand); it would rank by size, which says nothing about usefulness. |
| Contamination animation with an invented "exposure probability" curve | Would be a modelled quantity with nothing to check it against; the animation shows only "public before the cutoff", which is a date comparison. |

## What the methodology lacked here
A data tab whose rows are themselves measuring instruments needs two rules the method did not have: the status of each row must carry its own evidence (a dated reading with harness and split, or a stated absence from current cards), and a row whose evidence is only a lab figure must say so in the grid, not only in the detail.
