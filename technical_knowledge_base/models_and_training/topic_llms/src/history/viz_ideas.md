# LLM release history: visualisation ideas

Question the page keeps returning to: **what did each lab ship, when, with which weights and how big, and in what order did the field's ideas spread?** The page is a data page (140 sourced rows, 24 labs, 2023-02-24 to 2026-09-30). The text to understand is small (what the table is, how it was compiled, how to read total / active sizes, the caveats); the table itself is the content.

Existing visuals to avoid repeating: the parent page Topic: llms (https://app.notion.com/p/3c65c17b0d0d812d9e00f6ec89965286) already has the **Release timeline** tab (T1): one lane per lab, a dot per release, filters for reasoning, MoE, hybrid attention, open and closed, labels for each lab's first, zoom to 2026, and total releases per quarter stacked open on closed underneath. Nothing here redraws lanes of dots.

Data: live page table (live.md, parsed to live_rows.json) joined row by row with ../../src/data/release_history.json for the kind tags. All 140 rows agree on date, model, lab, weights, licence, size, note and URL (parse_live.py); the one text difference is Aya Expanse's licence qualifier ("unverified" on the page, "not verified this session" in the JSON), now resolved (below). Every number below comes from recompute.py.

## Scoring (0 to 2 each; reproduces and computable count double; build cost subtracted; +1 for step-by-step animation)

| Rank | Idea | Moves with reader | Reproduces (x2) | Computable (x2) | Beyond a sentence | Corrects a misconception | Central question | New | Anim | Cost | Score | Placement |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | Searchable, sortable, filterable table (lab, year, open or closed, kind tags, text search) | 2 | 2 (x2=4: every row is the live row) | 2 (x2=4) | 2 | 0 | 2 | 1 | 0 | -1 | 14 | Reading, main content |
| 2 | Published size over time, open models: total and active on one log axis, running record line, trailing median of active, sparsity mode, time-lapse animation | 2 | 1 (x2=2: medians recomputed from the rows: median open total 46.7B in 2023 to 310B in 2026 while median active stays 12.9B to 32.5B) | 2 (x2=4) | 2 | 2 ("bigger model means more compute per token") | 2 | 2 (T3 was proposed, never built) | 1 | -1 | 16 | Own tab "Sizes" |
| 3 | Firsts per lab: adoption step curves (how many labs had shipped open weights, MoE, reasoning, multimodal, hybrid attention, by date) plus a lab-by-feature matrix of first dates | 2 | 1 (x2=2: reasoning spreads from 1 lab in Sep 2024 to 18 by Apr 2026) | 2 (x2=4) | 2 | 1 (the "first in this table" caveat made visible: OpenAI's first open weights here is gpt-oss, though GPT-2 came earlier) | 2 | 2 | 0 | -1 | 14 | Own tab "Firsts" |
| 4 | Releases per lab per quarter heatmap, open and closed split in each cell, row totals, median gap between releases | 2 | 1 (x2=2: row and column totals sum to 140) | 2 (x2=4) | 1 | 0 | 2 | 1 (timeline has totals per quarter, not per lab) | 0 | -1 | 11 | Own tab "Cadence" |
| 5 | Licence mix by year (permissive, permissive with conditions, the lab's own licence, non-commercial) | 1 | 1 (x2=2) | 2 (x2=4) | 1 | 1 ("open weights" is not one category) | 1 | 2 (T12 runner-up) | 0 | 0 | 12 | Reading, at "weights and licence" |
| 6 | Total against active bar for one MoE model, picker over the 56 MoE rows with both numbers | 1 | 1 (x2=2: 671 / 37 = 18.1x for DeepSeek-V3) | 2 (x2=4) | 1 | 1 | 1 | 1 | 0 | 0 | 11 | Reading, at "how to read sizes" |

Formulas: sparsity = total ÷ active (MoE rows with both numbers; dense rows have active = total, ratio 1). Median gap = median of day differences between a lab's consecutive rows (labs with at least 3 rows; month-only rows dated to the 15th, labelled). Adoption count at date t = number of labs whose earliest qualifying row is on or before t. Grok-1 active: 25% of 314B = 78.5B (derived from xAI's "25% of the weights active on a given token", https://x.ai/news/grok-os), plotted with a hollow marker.

## Inspiration
- Our World in Data, parameters in notable AI systems (Epoch data): https://ourworldindata.org/grapher/artificial-intelligence-parameter-count. Plots total parameters only; this page adds active parameters, which is the point for MoE.
- Epoch AI models database: https://epoch.ai/data/ai-models (graph and table views with filters, the pattern for the table).
- Epoch, open weights lag about 3 months: https://epoch.ai/data-insights/open-weights-vs-closed-weights-models (context only; capability, not release counts).
- LifeArchitect timeline: https://lifearchitect.ai/timeline/ (by-year list; the table here is the sourced, filterable version for these labs).

## Animation
No mechanism on this page replaced an earlier one, so there is no before/after animation of a method. The one process in steps is time itself: the Sizes chart plays quarter by quarter (15 quarters), new releases flashing in, with a caption per quarter generated from the rows (what entered, any new record) and running counters (open sized releases so far, largest total so far, trailing four-quarter median of active parameters, median sparsity). Play, pause, step, scrub, speed; animates only on screen in the visible tab; starts paused under reduced motion. It passes the test because the static chart shows the end state, while the time-lapse shows totals stepping up record by record while the active band stays put.

## Rejected
- Another lane timeline (duplicates T1 on the parent page).
- Releases per quarter total bars alone (T1 has them).
- Open against closed capability gap (T6): needs index scores, not in this table; belongs to Topic: llms.
- Training compute over time: no compute column; closed models disclose none.
- Context length over time: not a column; only some notes mention it, so it would be partial and unsourced per row.
- Family tree (T10): lineage is only in a few notes (Bonsai 2 from Qwen3.8 27B, Atria Dawn from GLM-5.2, Naive-N0.5 from MiMo-V2.5); too sparse.
- US against China split: the table has no country column; adding one is new data outside the page's scope.

## Corrections made against sources (each shown on the row)
- Aya Expanse: licence confirmed CC-BY-NC 4.0 on the model card (https://huggingface.co/CohereLabs/aya-expanse-32b); size filled as 32B (largest of 8B and 32B; the card states "32 billion parameters").
- GLM-4.7: size filled as 355 / 32 by construction: its config.json (https://huggingface.co/zai-org/GLM-4.7/raw/main/config.json) is identical in every size field to GLM-4.5's (https://huggingface.co/zai-org/GLM-4.5/raw/main/config.json), the 355B / 32B row.
- Gemma 4: size filled as 31B (largest, dense); the 26B MoE activates 3.8B (https://blog.google/innovation-and-ai/technology/developers-tools/gemma-4/), so the row's "26B-A4B" is Google's rounded name.
- GLM-5.3: size filled as 744 / 40 by construction: the model card says it "uses the same base model as GLM-5.2" (https://huggingface.co/zai-org/GLM-5.3); the Hub's tensor count reads 753B, shown beside it.
- Grok-1: active parameters derived as 78.5B (25% of 314B).

## What the methodology lacked for this page
It is written for pages that explain mechanisms. A data page needs rules it does not have: the table is the main visual and must keep every field of every row; tags that the compiler assigned (kind) must be labelled as the compiler's, not the labs'; "first" claims need the window caveat on every chart that derives a first; and a check that row counts in every aggregate sum back to the table (140).
