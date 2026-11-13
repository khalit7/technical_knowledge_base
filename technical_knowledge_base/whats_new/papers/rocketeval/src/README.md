# RocketEval: page source

`sh build.sh` writes `../index.html`, the whole body of the Notion row page (https://app.notion.com/p/3cd5c17b0d0d81ffa8e5f8fa5a5806c8, a row of the Papers database; its properties Paper, Takeaway, Topics and Year stay in Notion). The row page has no child pages, databases or video. Built from `.claude/skills/explainer-page/page-kinds/paper.md` with the reference folder's shared pieces (`01_css`, `05z_errbox`, `10_js_common`, `11_js_ui`, `99_js_tabs` (the skill template since 2026-10-25), `check_page.mjs`, `build.sh`), and `mk_paper.py` from the DeepSeekMath page (it has the verdict line).

## Tabs

| Tab | id | What it holds |
|---|---|---|
| The paper | `t-read` | (split layout and two 3D stages since 2026-11-13) Card with verdict; the core sentence beside the hero stage (`31_js_sc_hero.js`; a static SVG `14_js_hero.js` before), its step list, the three outcomes, You need and New terms; Problem; Diagnosis (Table 1 predict question, the 70.3% circularity; Figures 4 and 5 beside the uncertainty and position-bias text); Method (the grading stage `32_js_sc_grade.js`: one released grading through RocketEval and, by a toggle, through the CoT judge, replacing the 2D before/after `13_js_anim.js`; checklist creation; Eq. 1; replay of four real gradings beside its text; scatter of 1,000 released gradings beside its text; Eq. 2 to 4 with alpha as normalised entropy, alpha predict widget and histogram over 1,015 queries); Results (dumbbell explorer for Tables 2 and 3 beside ranking and single verdicts, discordant-pairs predict question, cost calculator beside its text, ablations, checklist analysis); How much to believe; What it takes to use this; Why it matters; Connections; Note to self (Khalid's callout verbatim, commentary updated with sources). |
| Re-rank the leaderboard | `t-run` | (split since 2026-11-13: notes left, controls and charts right) Live ingredient: GPT-4o's released WildBench grades of the 12 test models; reproduces Table 3's GPT-4o row; bootstrap over queries, per-response noise and per-model bias with presets calibrated to the released small-judge gradings; bump chart, 200-draw histogram, 66-pair grid. |
| The paper's tables, rebuilt | `t-tables` | Tables 1 to 8 (sortable; deltas; Kendall as discordant pairs; Table 4 printed against recomputed), Figures 4 and 5 as numbers, 22 claims checked. |
| Further reading | `t-more` | Generated from `paper.json`. |

## Departures from papers.md, and why

- **Live ingredient: a re-analysis of the authors' released grades**, not a toy model or a trace replay alone. RocketEval is a method on top of models that cannot run in a sandboxed page, and its claim is statistical (a ranking correlation), so the honest live test is to rerun the ranking from the released data and let the reader resample and add noise. The grading replay in the Reading tab is the trace-replay part, from released gradings only.
- **The noisy judges are labelled illustrative**: GPT-4o's grade plus Gaussian noise, with sigma calibrated so single-response correlation matches what the released small-judge gradings measure (0.47, 0.41, 0.29). Real judges' errors are not independent; the per-model bias slider shows why that matters.
- **No "Then and now"**: a 2025 method paper; "What it takes to use this" covers adoption.
- **Instance-level agreement could only be checked on a subset**: gradings are released for 3 of MT-Bench's 6 human-judged models; the subset result is shown as such, not as a reproduction of Table 2.
- **Reading length**: see the light pass below.

## Light pass to the teaching contract (2026-10-25)

- **Top**: the idea in one sentence, a hero figure (three stages, three outcomes; a static SVG at the measured width, redrawn from Figure 2 because the paper is CC BY-NC-SA, so no image of it is copied and `img/` is not needed), You need (LLM-as-judge, Human preference and arenas) and New terms.
- **Owned elsewhere, now linked** (one sentence on what this paper did kept here): judge modes and fine-tuned judges and position bias in general (LLM-as-judge), MT-Bench and WildBench as boards and Bradley-Terry Elo (Human preference and arenas), prefix caching (Batching, KV cache and scheduling), ranking uncertainty (Eval statistics).
- **Moved into closed blocks**: the checklist-creation prompt, Eq. 2 sum against mean, the α derivation, Table 6 and Figures 10 and 11, the two overstated §4.1 sentences, the abstract's cost ratios, the checklist verbs and Figures 14 to 17, the internal slips and prices, the five "does not establish" limits, and Claude's commentary under the Note to self (Khalid's callout stays open, verbatim). Runtime log-probability support (Ollama, OpenAI) is one dated block "Since the paper".
- **Removed as fat** (3 units): the "three kinds" wind-up, the old reading-time line, the animation-manners line. The Figure 1 legend discrepancy now lives once, under the internal slips.
- **Never autoplays**: `makeAnim` waits on step 1 until the reader presses play or steps; `check_page.mjs` scrolls the animation into view and fails on any frame drawn before a click, and opens every closed block.
- **Takeaway softened** (card, `paper.json`, `live.md`): "5-10" scoped to the released 3 to 25; "killing positional bias" and "preserving calibration" dropped (independence moves agreement 1.5 points in Table 7; calibration is not measured); 0.965 against 0.979 scoped to one ranking of 12 well-separated models, one discordant pair, no error bars.
- **Length judgement**: Reading core 28 min before, 24 after, plus 7 in closed details (`audit_pages.mjs`, 230 words a minute; header from `reading.json`). The rest is core: this page owns the paper's evidence judgement (the 70.3% circularity, the one-pair margins, the released-data reruns), which no other page carries, and the light pass keeps the paper-specific visuals. Other tabs unchanged (Re-rank 2 min, Tables 8, Further reading 3).
- **Ledger** (`src/ledger.json`, labelled by `label_ledger.py`): 296 units; core 233, depth 54, owned 5, volatile 1, fat 3; `ledger.py check` problems 0.
- Author emails in `inputs/paper_v1.txt` are redacted, and `extract_paper.py` now redacts them on extraction.

## Files

- `save_live.py` (Notion fetch from the session transcript into `live.md`), `extract_paper.py` (arXiv HTML v1 to `inputs/paper_v1.txt`, tables to `inputs/table_*.txt`), `mk_tables.py` (`tables.json`; Table 4 transcribed in the script).
- `decode_figs.py`: Figures 4 and 5 from the vector PDFs of the arXiv source (`inputs/fig4_fig5.json`).
- `fetch_data.sh` then `mk_data.py <cache>`: downloads the released data (about 120 MB, not committed: GPT-4o WildBench grades of 22 models, checklists, three small-judge gradings, MT-Bench gradings, lmsys MT-Bench human votes through `uv run --with pandas`, FastChat GPT-4 single grades) and reduces it to `inputs/released.json` (66 KB, committed).
- `recompute.py`: every derived number (Table 4 cost model and the 70B mismatch, discordant pairs, the GPT-4o rerun, token counts, soft/hard correlations, checklist lengths, alpha, Table 2/3/7 claim checks, figure checks) to `inputs/recompute.json`.
- `check_page.mjs`: every control at 1400 px light, 920 px light and 390 px dark, the Table 3 reproduction, the noisy-judge preset. `check_stages.mjs` (2026-11-13): the stages, the splits, reduced motion and the step lists' numbers. `mk_coverage.py`: `coverage.json`.

## Checks (3 October 2026; rerun 25 October 2026 after the light pass: checkpage fail=0, emdash 0, errbox 1, clipped 0; check_page.mjs problems 0; mk_coverage 61 of 61)

`checkpage.sh`: fail=0, emdash 0, errbox 1, clipped 0, 4 tabs, about 233 KB. `check_page.mjs`: 180 actions, 0 problems. `mk_coverage.py`: 61 of 61.

## The 2026-11-13 layout rollout (split layout, renderer v2 stages, autoplay)

What changed and why:
- **Split layout** (template `02_split.html`, unchanged, after `01_css.html`; a small rule in `01_css.html` puts the margin labels on their own line in a split's left column and styles the outcome list `.oc`). The paper: the top (core sentence, step list, outcomes, You need, New terms) beside the hero stage; the Diagnosis's uncertainty and position-bias text beside Figures 4 and 5; the Method's intro, mode toggle, step lists, checklist creation and checklist grading beside the grading stage; the replay's text beside the replay card; the scatter's text beside its card; ranking and single verdicts (with the pairs predict question) beside the results explorer; cost beside the calculator. Problem, the Diagnosis's first two parts (Table 1 is a predict reveal, in the text column), Score prediction (the alpha widget is a predict reveal), Ablations, How much to believe, Using it, Why it matters, Connections and Note to self stay full width: no visual of their own. Re-rank the leaderboard: three splits (notes left; controls, bump chart, histogram and pair grid right). Tables and Further reading unchanged (tables full width).
- **Two 3D stages** (template `25_js_s3.js`, renderer v2, unchanged; build lists both after the page's data and chart parts):
  - `31_js_sc_hero.js`, the hero (four steps, `sx-hero`): queries as rows (8 of WildBench's 1,024 drawn) and runs as columns (6 drawn); GPT-4o writes one checklist plate per query with flows from it; the small judge fills every cell with flows along each row from its plate; then the usual way, GPT-4o in every cell; then 1,000 runs as two towers to scale ($3,400 against $27.7, 0.8%). Data: `PAPER.rc.cost` (Table 4 recomputed: checklists $2.865, GPT-4o $3.40 a run, Gemma-2-2B 248 s at $0.36 an hour); `window.RKHERO` exposes what the scene uses. The grid size is illustrative and labelled so. Replaces the static three-box SVG, whose stage boxes became the steps and whose outcome strip became the `.oc` list.
  - `32_js_sc_grade.js`, the grading stage (five steps per mode, `sx-re` and `sx-cot`, swapped by `#gradeM`, which resets and replays): RocketEval: GPT-4o writes seven glass tiles; one 3,402-token prefix slab (to scale in depth) shared by seven lanes; dots run down each lane, never across, to one Yes/No token; the Qwen2.5-3B judge's released probabilities as bars on white plinths with the hard reading as outlines (camera moves in close); the bars stream into the score 3.4 beside GPT-4o's 8. CoT: the prefix as one lane, the 232-token analysis appended (to scale), zoomed into a chain of seven judgments with arcs from every earlier one (dots stream into the 7th) and Figure 5's flip rates for Qwen2-1.5B as bars; three sampled digits (illustrative, labelled) and the one integer kept. Data: `REL.samples[1]` (the released grading), Table 5's mean prompt, the mean CoT output of GPT-4o's released gradings, `REL.fig.pos` (decoded Figure 5); `window.RKGRADE`. Replaces the 2D before/after (`13_js_anim.js` and `makeAnim` in `11_js_ui.js`, both removed); its per-step captions and counters are the two step lists now, so no caption box repeats them.
- **Kept 2D**: Table 1 (a predict reveal, bars of three settings), Figures 4 and 5 (a bar chart against item position, flat reads best), the replay (item text with bars; the text is the point), the scatter (1,000 points against GPT-4o's grade), the alpha widget and histogram, the results dumbbells (numbers on an axis), the discordant-pairs grid, the cost calculator (log-log lines), the Re-rank tools (bump chart, histogram, pair grid) and every table. No 2D animation remains, so the long-replay rule does not apply (the stages have four and five steps).
- `99_js_tabs.js` and `05z_errbox.js.html` recopied from the templates (storage key `rocketeval-tab`; the old copy's extra that opened a closed block after a `data-to` target was dropped: no link here has a target).
- `build.sh` finds the repository root five levels up instead of asking git.
- `check_page.mjs` runs at 1400 px too and no longer asserts that nothing moves before a click; `check_stages.mjs` (new) checks both stages in both modes (autoplay once in view, one list item per step, last step, stops off screen and on a reader control, list click jumps, the toggle replays), the splits at 1400 px, reduced motion, and every number the static step lists state against `RKHERO`, `RKGRADE`, `REL` and `PAPER.rc`.
- `label_ledger.py`: keys never contain a reading-time figure; units 50 and 51 re-pointed (the animation's intro sentence and mode toggle became the stage's); units 199 and 204 re-keyed so no key spells the reader's name; the Further reading keys of the 2026-11-13 sweep pinned (`KEYS_FR`); three units added for the stage step lists.

## Length judgement (2026-11-13)
| | Before | After |
|---|---|---|
| The paper, core | 24.3 min (5,597 words) | 27.7 min (6,379) |
| The paper, closed | 6.9 min (1,579) | 6.9 min (1,579) |
| Re-rank; Tables; Further reading | 2.3; 8.4; 3.0 min | unchanged |

The growth is the stage step lists (about 780 words net, lists of 213, 298 and 233 words; the CoT list is counted although a reader sees one mode at a time). They carry what the hero SVG and the animation drew as script text, which the audit never counted: the hero's stage boxes and outcomes, and the ten per-step captions and counters of the before/after. Nothing was removed as fat. Header: "Reading: 28 min, plus 7 in closed details." from `reading.json`.

Ledger: 299 units (core 236, depth 54, owned 5, volatile 1, fat 3); `ledger.py check` problems 0. `mk_coverage.py` 61 of 61.
