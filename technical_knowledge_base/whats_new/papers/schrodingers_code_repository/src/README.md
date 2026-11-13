# Schrödinger's Code Repository (SchrodingerRepo): page source

`sh build.sh` writes `../index.html`, the whole body of the Notion row page (https://app.notion.com/p/3e95c17b0d0d81e8b0e0e99acbeb9713, a row of the Papers database; its properties Paper, Takeaway, Topics and Year stay in Notion). The page has no child pages, databases or video. Built from `.claude/skills/explainer-page/page-kinds/paper.md`, starting from the MOLE page's copy of the reference pieces.

## Tabs

| Tab | id | What it holds |
|---|---|---|
| The paper | `t-read` | (split layout and two 3D stages since 2026-11-13) Headline card (the Takeaway as scoped on 2026-10-26, the old wording in its note); the core sentence and hero figure with You need and New terms; a closed provenance block (the old "6 to 14 points" is the paper's own 6.0 to 14.4); Problem with Figure 1 redrawn and judged; Idea with a 3D stage of how a view is drawn per run; the four levels with a panel applying Figure 4's renamings to the real issue; what the released code does differently; Setup; RQ1 (Table I chart with intervals, predict question), RQ2 (Figure 3, predict question), RQ3 (the 0.75 that is 0.55), RQ4 (predict question revealing a live power calculator); the case study as a 3D stage in both views; How much to believe; What it takes to use this; Why it matters; Connections. |
| Transform a repository | `t-run` | (split since 2026-11-13) The live ingredient: the released Level 2 (tokenise, seeded token mapping, case-preserving rebuild, whole-word replacement) and Level 3 (definition-time dependency graph, random topological order) ported to JavaScript with CPython's Mersenne Twister, run on the real Django code of the case study; a step animation for each level (explained by step lists, plays by itself once in view), a seed slider, a Figure 4 preset, a search box comparing both views, the full renaming table, and what Levels 1 and 4 would do. |
| The paper's tables and figures, rebuilt | `t-tables` | Table I printed or recomputed, the interval and McNemar table, every printed change recomputed (108, two wrong), Tables II and III, Figures 1 and 3 as tables. |
| Further reading | `t-more` | Generated from `paper.json`. |

## Departures from papers.md (and why)

- **The live ingredient is the paper's own transformation code, not a trace replay or a toy.** papers.md suggests a trace replay for agent papers, but no trajectory is released and the paper's contribution is the instrument, so the page runs the instrument: the released Level 2 and Level 3 code, ported line by line, on the real repository of the case study, checked against copies of the released Python for ten seeds. The candidate words are the only illustrative input (the released lexicon is LLM-generated and unpublished); the Figure 4 preset reproduces the renamings the paper prints, including its `Character_unitField` quirk.
- **The before/after stage is the case study** (a 2D animation until 2026-11-13), the same issue walked in the familiar and the renamed view, drawn from Figure 4 and §V-E; the paper gives only the action totals (37 and 217), so the animation does not invent per-step counts.
- **A power calculator instead of a resampling of results**: no per-instance results are released, so the page quantifies what the printed counts allow (unpaired intervals, McNemar limits, RQ4's power).
- **No Then and now** (a 2026 evaluation paper).
- **Reading tab about 20 minutes (plus 3 in closed details since the 2026-10-26 light pass)** against the old page's 5: the page owns every detail of the paper, and the code-versus-text findings and the RQ4 power argument needed their own space.

## Files

- `save_live.py`: copied the Notion fetch verbatim from the session transcript into `live.md`. `mk_coverage.py` writes `coverage.json` (22 items from `live.md`, all verified against the built page; four corrections listed).
- `extract_paper.py`: arXiv HTML v1 to `inputs/paper_v1.txt`, `tables_v1.txt`, `anchors.txt`. `mk_tables.py`: `tables.json` (Tables I to III parsed from the extraction, Figures 1 and 3 from printed labels). `recompute.py`: every printed change recomputed, Pass@1 granularity, unpaired intervals and McNemar limits, RQ4 power, Figure 1 and 3 shares, ratios; writes `inputs/recompute.json`.
- `schro_ref.py`: verbatim copies of the released `tokenize_identifier`, `create_token_mapping`, `reconstruct_identifier`, `_build_run_specs` and `_random_topological_order` (one stated change: integer seeds for the retries instead of string seeds hashed with SHA-512). `extract_targets.py`: runs the released extractor on a Django checkout (`uv run --with rich python extract_targets.py <Schrodinger-Repo> <django>`). `mk_excerpt.py`: `inputs/excerpt.json`. `mk_repo_data.py`: `parts/20_repo_data.js` (excerpt, targets, lexicon, Level 3 specs, Python reference results for seeds 1 to 10).
- `parts/21_js_port.js`: the JavaScript port (PyRandom, SR). `check_page.mjs` (from the repo root with node): the port against the Python reference (mappings, both orders, texts, Figure 4 preset), every control in both themes and widths, both animations stepped in both modes, 11 px text, NaN, errors, sideways scroll.
- `viz_ideas.md`: visualisations chosen and rejected, with scores.

## Checks (3 October 2026)

`sh html_utils/checkpage.sh <folder>`: see the latest run in the builder's report (fail=0, emdash 0, errbox 1, clipped 0). `node .../src/check_page.mjs`: 0 problems, JS port identical to the released Python for seeds 1 to 10. `mk_coverage.py`: 22 of 22.

## The 2026-10-26 light pass (teaching contract)

What changed and why:
- **Top**: the core sentence, then a hero redrawn as static SVG (`mk_hero.py` writes `parts/03a_hero.svg.html` from `tables.json`): the familiar and the seeded view of the Django case (paths and names as Figure 4 and §III-C print them) with the translator mapping commands back, over Table I's Pass@1 and actions per task, baseline against the full setting, for the four models (Gemini marked as the 300-instance subset). The paper is under arXiv's non-exclusive licence, so no paper figure is embedded; nothing physical to photograph. Then "You need" (Coding benchmarks, Eval statistics) and the new terms.
- **Owned elsewhere, a sentence kept and linked**: how SWE-bench and Verified were built, and the calendar-refreshed sets (Coding benchmarks); power and minimum detectable effect in general (Eval statistics; the RQ4 calculation and calculator stay here).
- **Closed** (`details.more`): the provenance box on "6 to 14 points"; the four code-against-text differences with file names and defaults (an open paragraph keeps all four in one sentence each); the detailed bullets of What it takes to use this (one open paragraph).
- **No volatile block**: nothing on the page is dated follow-up news. The Transform tab stays a tab: it is a tool the Reading tab links to from the levels, the case study and the evidence.
- **No autoplay**: `makeAnim` patched as on RRSI and Dream-RSI (waits on step 1 until the reader presses play or steps); `90_js_tabs.js` replaced by the skill template `99_js_tabs.js` (storage key `schro-tab`), keeping the `data-to` scroll target. `check_page.mjs` now fails if either animation draws a frame before a click and opens every closed block. `details.more` wraps long code words (a path overflowed by 1 px at 390 px).
- **Takeaway scoped** (`paper.json`, so the card; `live.md`'s property line): "consistently degrades ... on SWE-bench Verified and SWE-QA" became the measured ranges (Pass@1 6.0 to 11.2 on 500 tasks, 14.4 on Gemini's 300; actions 1.6 to 2.2 times, input tokens 2.4 to 3.5 times; Level 2 the costliest single level; over 80% of extra actions on finding code; SWE-QA 4.64 and 0.55) and the two limits (memorised against meaningful names not separated; an underpowered fresh-task control). The old wording is quoted in `takeaway_note`. The Notion property needs the same edit.
- `inputs/paper_v1.txt`: three author emails replaced with `[email removed]` and two em-dashes written as `--`; `extract_paper.py` now does both. Header: "Reading: 20 min, plus 3 in closed details." from `reading.json`.

## Length judgement
| | Before (audit 2026-10-23) | After |
|---|---|---|
| The paper, core | 20.2 min (4,649 words) | 19.5 min (4,487) |
| The paper, closed | 0 | 3.3 min (759) |
| Transform tab; Tables; Further reading | 4.4; 5.1; 2.8 min | unchanged |
| Visuals in Reading (audit) | 5 | 6 (the hero added) |

Why about 20 minutes is right: the top (about 330 words) went in and about 760 words of provenance, code-file detail and adoption detail closed. What stays open is the instrument (the four levels and the translator), the four research questions with their numbers and predict questions, the case study, and an evidence section whose every point changes the reading (names meaningful as well as familiar, an underpowered control, a leakage-selected subset at the top of the range, wrong printed changes, code that differs from the text). Shorter would mean closing evidence the verdict rests on.

## Knowledge ledger (`ledger.json`, labelled by `label_ledger.py`)
250 units: core 218, depth 30, owned 2, volatile 0, fat 0. 241 drafted by `ledger.py init` from the page before the pass; 9 added. Nothing was deleted. `ledger.py check`: problems 0.

## Checks (26 October 2026)
`checkpage.sh`: tabs 4, about 222 KB, fail=0, emdash 0, errbox 1, clipped 0. `check_page.mjs`: 200 actions, 0 problems (JS port identical to the released Python for 10 seeds; no frame before a click). `mk_coverage.py`: 22 of 22.

## The 2026-11-13 layout rollout (split layout, renderer v2 stages, autoplay)

What changed and why:
- **Split layout** (template `02_split.html`, unchanged, after `01_css.html`). The paper: the top (core sentence, You need, New terms) beside the hero; Problem beside Figure 1; Idea beside its new stage; The four levels beside the level panel; RQ1 beside the Table I chart; RQ2 beside Figure 3; the case study beside its new stage. The provenance block, What the code does differently, Setup, RQ3 (no visual), RQ4 (its only visual is the power calculator inside a predict reveal), How much to believe, Use it, Why it matters and Connections stay full width. Transform a repository: the intro and the two step lists left, the Level 2 / Level 3 card right (sticky); the search notes left, the search card right; the renaming table and Levels 1 and 4 full width. Tables and Further reading unchanged (tables stay full width). Section anchors unchanged.
- **Two 3D stages** (template `25_js_s3.js`, renderer v2, unchanged; one scene each):
  - `31_js_sc_idea.js`, Idea (six steps, `sx-idea`), replacing the 2D command-flow diagram: four real files of `django__django-11999` (base.py, query.py, fields/__init__.py, tests.py) in the real container; a seed draws the view in front of a glass translator, its labels Figure 4's renamings applied by the ported release; a command flows back (`render_.*_label` runs as `get_.*_display`) and the output forward (Figure 4's strings); the camera moves in on the real `fields/__init__.py` as its 35 top-level definitions (heights: their line counts, 2,284 lines) reordered by the released algorithm with seed 1 (34 of 35 move, `Field` from 4th to 8th) with the gold patch's hunk (8 lines from line 763, read from `gold_patch`) marked as Level 4's region; the recovered patch flows to the task's real tests (1 Fail-to-Pass, 30 Pass-to-Pass; `mk_excerpt.py` now copies `PASS_TO_PASS` into the excerpt). Its old caption sentences became steps 1, 4 and 5.
  - `32_js_sc_case.js`, the case study (five and six steps, `sx-cs-orig` and `sx-cs-map`, swapped by the `csM` view toggle, which replays), replacing the 2D `makeAnim` animation `cs`: the 17 tree entries as file blocks on directory floor patches, lit per step as §V-E names them, reads flowing to the agent, the patch flowing back into the field file at the last step, and the paper's 37 and 217 actions as two bars to scale (this view's grows at the end; the other stands faint beside it). The old step captions and per-step command text became the two step lists; the old counters were dropped (the lists carry the totals).
- **Kept 2D**: the hero (before and after numbers for four models on two scales, plus the two views as text; nothing spatial a stage would add), Figure 1 and Figure 3 (shares on a bar), the Table I chart (bars with intervals), the power calculator (a widget inside a predict reveal), the level panel (text in five states), the Level 2 / Level 3 animation (its content is code and token lists, which read only as text; Level 3 is a one-dimensional reordering with arcs) and every table.
- **Motion**: `makeAnim` (11_js_ui.js) now has the rules of `RD.anim`: plays by itself once half in view, pauses off screen, stops for good on a reader control or its last step, never under reduced motion, a step list per mode (`sx-tp-l2`, `sx-tp-l3`, its step count), `data-playing` while it plays; a mode switch replays. Its caption row (`tpStep`, `tpCap`) was removed: the lists carry those texts. `99_js_tabs.js` and `05z_errbox.js.html` recopied from the templates (key `schro-tab`). `build.sh` now finds the repository root by walking up to `html_utils` (no git call).
- `check_stages.mjs` (new): the layout and motion rules at 1400 and 920 px light and 390 px dark, reduced motion, list clicks, both case views, the 2D animation in both modes, and every number the static step lists state against `window.SCHRO_IDEA` and `window.SCHRO_CS`. `check_page.mjs` now asserts every stage and the animation play when scrolled into view (it used to fail on any frame before a click).
- Ledger: seven keys re-pointed (36, 37, 39, 121, 122 whose wording or controls moved; 105 and 219, whose keys held a number followed by "min" or a resource's reading time); recorded in `label_ledger.py` `KEYS`. Four units added for the two stages, their provenance line and the Transform step lists.

## Length judgement (2026-11-13)
| | Before (audit, pre-pass) | After |
|---|---|---|
| The paper, core | 19.5 min (4,487 words) | 22.6 min (5,202) |
| The paper, closed | 3.3 min (759) | 3.3 min (759) |
| Transform a repository | 4.4 min (1,022) | 6.2 min (1,419) |
| Tables; Further reading | 5.1; 2.8 min | 5.1; 2.8 min |
| Visuals in Reading (audit) | 6 | 6 (flow diagram and case animation replaced by stages) |

The growth is the step lists: the case animation's eleven captions and the Transform animation's ten were drawn by script and so were invisible to the audit; they are now static text beside their visuals. The Idea stage's six steps are new explanation of a mechanism that had one diagram and one caption. Nothing was cut; the length stays right for the reason given in the light pass. Header: "Reading: 23 min, plus 3 in closed details." from `reading.json`.

Ledger: 254 units (core 222, depth 30, owned 2, volatile 0, fat 0); `ledger.py check` problems 0.

## Checks (13 November 2026)
`checkpage.sh` fail=0, emdash 0, errbox 1, clipped 0; `check_page.mjs` 0 problems (JS port identical to the released Python for 10 seeds); `check_stages.mjs` 0 problems; `html_utils/verify_layout.mjs` 0 problems.
