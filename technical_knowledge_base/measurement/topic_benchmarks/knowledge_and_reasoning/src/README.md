# Source of the Knowledge and reasoning benchmarks page

`sh build.sh` writes `../index.html` (same fail-safe build as the parent root: one `<script>` per JS part, `#jsErr` box, `{{text|url}}` links).

Shape: child page per `.claude/skills/explainer-page/page-kinds/topic-child.md`, rebuilt 2026-10-24 to the teaching contract (below). Tabs: Reading (`t-read`), Grade it yourself (`t-grade`, a dataset view used across the page), Further reading (`t-more`). Root tabs (atlas, saturation, same model) are linked by name, not rebuilt.

Parts: `10_header.html` (page CSS, title, subtitle with reading time, tab bar), `20_read_a` (nav, the idea in one screen: core sentence, hero, you need, terms; one-screen table with the dated readings in a closed block; four graders), `20_read_b` (MMLU, defect map, MMLU-Pro, multilingual), `20_read_c` (GPQA, HLE, tools chart), `20_read_d` (Fix the key: re-grade widget, physics re-grade, the residual rule), `20_read_e` (SimpleQA with the guessing slider; retired sets table with closed detail), `20_read_f` (ARC-AGI 1, 2, 3: exact-match animation, solver in a closed block, RHAE calculator, harness chart), `20_read_g` (AA-Briefcase, how to read a score, what to use, closed mistakes; closes the tab). JS: `11_js_data.js` (generated), `21_js_common.js` (`window.KU`: helpers; no step controller since 2026-11-09), `22_js_read.js` (tools, ARC-AGI-3, SimpleQA), `23_js_rd_hero.js` (hero, physics bar), `25_js_s3.js` (template renderer v2), `31_js_grade.js`, `32_js_key.js` (defect map), `33_js_arc.js` (solver, RHAE), `35_js_sc_gr.js`, `36_js_sc_key.js`, `37_js_sc_arc.js` (the three 3D stages), `99_js_tabs.js` (skill template, key `kr-tab`). CSS: `02_split.html` (template, cat after `01_head.html`).

## The 2026-10-24 rebuild: what changed and why
- **Top**: the core idea in one sentence (an exam built to defeat its year's models, read through a protocol and capped by its key, replaced once the frontier reaches the ceiling) and a new static hero (best score at or near launch against the best dated reading, with human references, for eight benchmarks; data `HERO` in `tables.py`), "You need" and new terms.
- **Lab tabs moved inline** (each explained one mechanism): the Fix the key re-grade animation is now its own Reading section after HLE, with the physics re-grade; the MMLU defect map sits beside the MMLU-Redux claim; the ARC exact-match animation sits in ARC-AGI-1's format, the RHAE calculator in ARC-AGI-3's scoring, and the solver in a closed block. The Fix the key and ARC-AGI lab tabs are gone; Grade it yourself stays (it spans six benchmarks).
- **New visuals**: the hero; four static grader diagrams (regex miss, log-likelihood argmax, judge, 8 of 9 cells scoring 0); the physics re-grade split (143 / 95 / 12) with HLE-Physics and CritPt before and after (`PHYS` in `tables.py`). Visual titles now say what to notice.
- **Volatile scores** (per-section "scores today", trajectories, per-lab ARC-AGI-3 rows) moved into one closed "Dated readings in full" block under the one-screen table, whose last column is the compact dated table.
- **Depth into closed blocks**: construction details (MMLU sources and splits, MMLU-Pro filtering, the three multilingual sets, GPQA pay, HLE prizes and private sets, ARC search years, ARC-AGI-2 calibration and prize rules, ARC-AGI-3 game sets, the 67-cent conditions), the 6.49% against 7.0% weighting, contamination evidence on MMLU (the parent owns contamination), every correction to the old page (each now a closed "Correction" block in place), BIG-Bench, the AI2 trio and SimpleBench (a core table keeps what each measured and the lesson it left), and the common mistakes (one line each).
- **No autoplay**: `KU.anim` no longer starts when scrolled into view; `check_ui.mjs` now also scrolls both animations into view with normal motion and fails if either moves by itself. `99_js_tabs.js` is the skill template.
- **Deleted as fat** (19 ledger units): the old tab bar and nav, wind-ups ("This page takes each benchmark in turn"), pointers to the removed tabs, restated headings, the mistakes' restatements.
- Header subtitle in the standard form; "Reading" links inside script text use `{{...|#t-read}}`.

## Length judgement
| | Before (audit 2026-10-23) | After (2026-10-24) |
|---|---|---|
| Reading, core (230 words a minute, `html_utils/audit_pages.mjs`) | 32.8 min | 26.6 min |
| Reading, closed details | 1.1 min | 14.8 min |
| Other tabs | 9.9 min (Grade 2.4, Fix the key 2.2, ARC-AGI lab 2.1, Further reading 3.2) | 5.6 min (Grade 2.4, Further reading 3.2) |
| Visuals inline in Reading (audit count of SVG) | 2 | 10 |

Core reading for the old Reading plus the two lab tabs was about 37 minutes; it is now 26.6, with nothing lost (ledger). This length is right for this page because it owns twelve benchmarks, and for each the core keeps exactly what is needed to read its score: what it measures, how it is graded, what its key gets wrong (with the number), and its status. What remains long is ARC-AGI (about 6 minutes: three different benchmarks, two inline widgets and the harness chart) and MMLU (about 4: the family's reference case for key errors). Construction provenance, corrections, dated scores and per-lab detail are one click away in closed blocks.

## Ledger
`ledger.json`: 346 units from the pre-rebuild page; core 215, depth 93, volatile 19 (in the dated readings block), fat 19, owned 0. `python3 ../../../../html_utils/ledger.py check` reports problems 0. Keys were drafted from each unit's numbers and names and checked by hand; units drawn by script carry keys written into captions.

## Files
- `live.md`: old Notion page verbatim (fetched; no child pages, databases, video or embed).
- `fetch_redux.py` (MMLU-Redux 2.0, needs pyarrow), `fetch_arc.py` (ARC tasks), `fetch_items.py` (HF samples), `save_excerpts.py` (text windows of every primary source into `inputs/excerpts/`).
- `tables.py`: transcribed published tables (MMLU-Redux T2, HLE-Verified T2, SimpleQA T3, MMLU-Pro T3, HLE tools pairs, HLE-Diamond) and the hero's and physics bar's published values (HERO, PHYS).
- `recompute.py`: 54 checks and every derived number into `inputs/recompute.json`. `mk_data.py`: `parts/11_js_data.js` (`window.KR`).
- `mk_coverage.py` -> `coverage.json` (109 facts of live.md: 90 carried, 18 corrected, 1 superseded; each located in the built HTML).
- `check_ui.mjs`: every control at 390 dark and 920 light (702 actions), plus value checks (SimpleQA F, toy grader, ARC rules, solver, RHAE presets) and the no-autoplay check. `shots.mjs`: screenshots of each visual into `../.shots/parts/`.
- `ledger.json`: the knowledge ledger (teaching contract).
- `viz_ideas.md`: ranked ideas.

Rebuild: `python3 recompute.py && python3 mk_data.py /path/to/redux_cache && sh build.sh && python3 mk_coverage.py` (mk_data works without the cache via `inputs/redux_seq.json`).

## 2026-11-09: split layout, three 3D stages, explained and autoplaying step lists (the 2026-11-06 rollout)
- **Templates** `02_split.html`, `25_js_s3.js` (renderer v2) and `99_js_tabs.js` (key `kr-tab`) copied unchanged; `build.sh` cats `02_split.html` after `01_head.html` (its em-dash check already writes the character as bytes). The page's `.an-ctl` rules no longer reach the stage bars (`:not(.stg-bar)`). `KU.anim` (never autoplayed) is gone: no 2D step animation is left.
- **Three stages**, each with an `ol.sx` step list on the left and no per-step caption; scenes publish what they compute in `window.KRS`, which `check_stages.mjs` compares with the step lists after recomputing it from `window.KR`:
  - Fig. 1 `stg-gr` (6 steps, `35_js_sc_gr.js`) replaces the four static grader diagrams and the four-bullet list: four stations, each a glass plate between the model's output and the verdict, with flows; the camera moves in on one station per step. Items are the page's own: ARC-Challenge Mercury_7175875 (key C), SimpleQA's paper example (Michio Sugeno), and Rule B's real output for task 007bbfb7's first demonstration (67 of 81 cells, computed). Answer texts and option probabilities are labelled illustrative.
  - Fig. 2 `stg-key` (2 modes of 5 steps, `36_js_sc_key.js`) replaces the 2D squares-and-bars re-grade: the 100 sampled questions of a subject as a cube field coloured by MMLU-Redux 2.0's labels, the flawed ones lifted out, ten HELM models as rows re-sorting (Table 2); HLE-Verified as three stacks to scale (668, 1,143, 689) and seven models (Table 2). Subject chips rewrite the numbers in the MMLU step list (static text holds virology's); the counts per step stay as a live readout under the list.
  - Fig. 3 `stg-arc` (2 rules of 6 steps, `37_js_sc_arc.js`) replaces the 10-frame 2D build: the input on a plinth, one row of blocks per step with flows from the deciding cell, the real output uncovered, wrong cells lifted in red. Rule chips swap the two lists; pair chips replay.
- **Splits**: the idea (text beside the 2D hero), the graders (Fig. 1), MMLU (beside the defect map, capped at 52vh in the right column), GPQA (beside the funnel), HLE tools (beside the tools chart), Fix the key (Fig. 2), the physics re-grade and the residual rule (beside the physics bar), SimpleQA (beside the guessing widget), ARC-AGI-1 format (Fig. 3), ARC-AGI-3 scoring (beside the RHAE calculator) and the harness (beside the harness chart). Full width: the one-screen table, MMLU-Pro (its table), multilingual, HLE construction and audits, the retired-sets table, ARC intro, sets and ARC-AGI-2, AA-Briefcase, Read a score, the solver (a reader tool in a closed block) and the Grade it yourself tab (a reader tool).
- **Kept 2D**: the hero (one value on a percent axis per benchmark), the defect map, funnel, tools dumbbells, physics bar, harness chart, the SimpleQA and RHAE widgets and every table.
- **Checks**: `check_stages.mjs` (new, adapted from Coding benchmarks); `check_ui.mjs`: the re-grade and ARC loops now drive the chips and step lists, and the no-autoplay check is inverted (each stage plays once in view).
- **Ledger**: 346 units, problems 0; six keys moved to text that now carries the unit (step lists), two duplicated sentences cut (their units are in the step lists).
- **Length** (`audit_pages.mjs`, 230 wpm): Reading core 26.7 to 29.6 min (6,130 to 6,814 words), closed 14.9 unchanged, Grade 2.4 and Further reading 3.2 unchanged; visuals counted 10 to 7 (four small grader SVGs and two 2D animations became three stages). The growth is the step lists, which carry what the script captions said (text the audit did not count) plus the explanation of each stage; about 1.4 minutes of it are the HLE and Rule B lists, hidden until their chip is chosen.
