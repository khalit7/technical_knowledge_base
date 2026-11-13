# NeoHorse-1: page source

`sh build.sh` writes `../index.html`, the whole body of the Notion row page (https://app.notion.com/p/3db5c17b0d0d81e3b105e033a359ad24, a row of the Papers database; its properties Paper, Takeaway, Topics and Year stay in Notion). The page has no child pages, databases or video. Built from `.claude/skills/explainer-page/page-kinds/paper.md`, starting from the HarnessDev page's copy of the reference pieces (`build.sh`, `mk_paper.py`, `check_page.mjs`, `svgparse.py`, the CSS and `10_js_common.js`, `11_js_ui.js`, `90_js_tabs.js`).

## Tabs

| Tab | id | What it holds |
|---|---|---|
| The paper | `t-read` | (split layout and one 3D stage since 2026-11-13) Card with verdict (softened Takeaway); the core sentence, hero figure (the recipe's five parts and which the paper isolates), You need and New terms; Problem; Idea (the loop against curate-once, a 3D stage); Data from the routing harness (granularities, loss-mask widget, quality gates, Scene/Goal/Outcome); Routing signals and allocation; Training (Eq. 1, Eq. 2 widget, Eq. 3 with a predict question and live KL demo); Results (gains chart with error bars, predict question on 4B against base 9B, item-count error table); Traces (§5.1 and Appendix B); Data experiments (predict question with Figure 7 decoded against the base); How much to believe; What it takes to use this; Why it matters; Connections. |
| Schedule the curriculum | `t-run` | (split since 2026-11-13: step lists left, controls and card right) The live ingredient: the three-stage routing curriculum animated against shuffled SFT, with traffic, router-confidence and reserve controls; the coarsened OPD loss lab. |
| The paper's tables and figures, rebuilt | `t-tables` | Tables 1 and 2 (track, scores or minus base, sort); Table 3 with the base, Figure 7's decoded runs and the released model added; benchmark sizes read from the scores; all 45 checks. |
| Further reading | `t-more` | Generated from `paper.json`. |

## Departures from papers.md (and why)

- **No toy model, no trace replay.** A training-recipe paper on private traffic with no code, data or released traces; a toy curriculum experiment would show whatever its design decides, not what happens at 4B. The live ingredient instead runs the method's two specified mechanisms on illustrative inputs (the Eq. 2 three-stage schedule, the Eq. 3 coarsened KL), and the page says next to it that it cannot show whether the ordering helps, because the paper never tests that.
- **The quantitative work is on the paper's own numbers:** benchmark sizes recovered from score granularity give the error bars the paper omits, and Figure 7 decoded from its vector SVG shows Table 3's harness run is one of its points and puts the base model beside the data experiments.
- **No Then and now.** A September 2026 result; "What it takes to use this" covers adoption.
- **Reading tab is long (about 27 minutes against the old 5).** The old page was written from the abstract; this one owns the method's details (gates, routing fields, both losses), the appendix cases and an evidence section that changes the reading.

## Light pass to the teaching contract (2026-10-25)

- **Top**: the idea in one sentence (the router already judges difficulty, so its records order and select the post-training data; +5.93 and +3.44 macro points; no part isolated, loop run once); a hero figure (`15_js_hero.js`: the five parts in order, each marked compared or not isolated, the whole recipe's measured gains from `recompute.json`, the next round dashed; the Table 3 numbers are left out so the data-experiments prediction stays open); You need (Gateways and routing, the loss mask on Alignment, Distillation and small language models); New terms.
- **Owned elsewhere, now linked** (what this paper did kept here): why on-policy distillation beats training on recorded text (Distillation and small language models; Eq. 3's coarsening, reverse KL and staging stay here), the loss mask (Alignment; agent-trajectory masks on Harnesses for training), routing by difficulty (Gateways and routing), binomial standard errors (Eval statistics).
- **Moved into closed blocks**: where the page came from (the corrections stay visible); the five components as the paper words them (one sentence plus the hero carry them); every structural check (the three outcomes stay); how the six verdicts are reached and stored; annotation-noise controls; why tiers are versioned; gradients and Eq. 4; what each benchmark tests; every baseline and sampling setting (runs per benchmark stay); Appendix B's three cases. The same week's Dwarkesh data-efficiency decomposition moved to one dated block "Since the paper".
- **Never autoplays**: `makeAnim` waits on its first frame until the reader acts (both `lp` and `cu`, and after a mode switch); the loop caption no longer says it starts by itself; `check_page.mjs` uses DOM clicks for tabs, scrolls each animation into view and fails on any frame drawn before a click, checks the hero is drawn, and opens every closed block. Tabs from the skill template (`99_js_tabs.js`, key `nh-tab`, with `data-to` scrolling).
- **No real image**: nothing physical to show; the paper's figures are redrawn (Figures 2 and 4) or decoded (Figure 7).
- **Takeaway softened** (card, `paper.json`, `live.md`): the old line said evaluation feedback "feeds back into the training mixture" (described, never measured), credited the gains to the method with no ablation, and gave "closing 89% of the macro gap to the base 9B" without saying the 4B beats the base 9B on only 5 of 10 benchmarks. The new line says allocation is designed, the parts are not isolated, the loop ran once, and the +6.26 over public data is mostly the public-data run falling 4.99 points below the base. The Notion property still carries the old line (with "11 benchmarks").
- **Length judgement**: Reading core 28 min before (6,470 words) and 26 after (5,968), plus 5 in closed details (1,180 words, from 0; `audit_pages.mjs`, 230 words a minute; header from `reading.json`). The top added about 2 minutes; the moves and owner links took out about 4. What stays is core: the method as the paper states it (three granularities, gates, three routing fields, Eq. 1 to 3), the results with their noise check, the data experiments and an evidence section that changes the reading, none of which another page carries. Other tabs unchanged (Schedule 2, Tables 7, Further reading 4).
- **Ledger** (`ledger.json`, labelled by `label_ledger.py`): 301 units; core 251, depth 40, owned 5, volatile 2, fat 3; `ledger.py check` problems 0.
- **Source extracts**: em-dashes in `inputs/paper_v1.txt` (15) and `inputs/github_readme.md` (1) replaced with `--`; no author emails were present. `extract_paper.py` now does both on extraction; `tables.json` and `recompute.json` are byte-identical after the change.

## Files

- `build.sh`: runs `mk_tables.py`, `recompute.py`, `mk_paper.py`, assembles `parts/`, expands the link macros, fails on an em-dash or unexpanded macro.
- `save_live.py`: copied the Notion fetch verbatim from the session transcript into `live.md`.
- `extract_paper.py`: arXiv HTML v1 to `inputs/paper_v1.txt`, `inputs/tables_v1.txt`, `inputs/anchors.txt`.
- `decode_figs.py` (with `svgparse.py`): Figure 7's six runs and Figure 1's labels from the vector SVGs to `inputs/figs.json`.
- `fetch_release.py`: dated release facts (GitHub, Hugging Face models and paper upvotes) to `inputs/release.json`. `inputs/github_readme.md` and `inputs/hf_card_4b.md` are the README and model card as fetched on 2026-10-03.
- `mk_tables.py`: `tables.json` (Tables 1 to 3, asserted against the extract; Figure 7).
- `recompute.py`: 45 checks and every derived number, to `inputs/recompute.json`.
- `mk_paper.py`, `paper.json`: card, Further reading, `window.PAPER`.
- `mk_coverage.py` writes `coverage.json` (35 items, this paper's own, verified against the built page).
- `check_page.mjs` (run from the repo root with node): every control at 1400 and 920 px light and 390 px dark, the curriculum animation stepped; since 2026-11-13 it asserts that the curriculum animation and the loop stage play once scrolled into view (it used to forbid it).
- `check_stages.mjs` (2026-11-13, from the repo root): the layout and motion rules at three widths, reduced motion, both step lists of the loop stage, the curriculum animation's lists for every ordering and mix, and the numbers the stage's lists state against `window.NHLOOP` (and that its illustrative inputs are the Schedule tab's defaults).
- `parts/31_js_sc_loop.js` (2026-11-13): the 3D scene on the template renderer `parts/25_js_s3.js`; `parts/14_js_run.js` now exposes the curriculum engine as `cuPool()` so the scene draws the same pool.

## Checks (3 October 2026; rerun 25 October 2026)

`checkpage.sh` fail=0 (emdash 0, errbox 1, clipped 0); `check_page.mjs` 0 problems (282 actions; nothing moves before a click); `recompute.py` 45 of 45; `mk_coverage.py` 35 of 35; `ledger.py check` problems 0.

## The 2026-11-13 layout rollout (split layout, renderer v2 stage, autoplay)

What changed and why:
- **Split layout** (template `02_split.html`, unchanged, after `01_css.html`). The paper: the top (core sentence, You need, New terms) beside the hero; Idea beside the loop stage (its toggle and two step lists in the left column); Three granularities beside the Figure 4 loss-mask card; the routing curriculum (Eq. 2 and the three stages) beside the Eq. 2 card; the start of Results (suite, baselines, what the paper reads) beside the gains chart. Problem, Quality gates (a table), Scene/Goal/Outcome (three text cards), Routing signals (a table), Supervision within a user turn and OPD (formulas, the predict question and its KL reveal), the error-bar table, Traces, Data experiments (the chart is inside a predict reveal), How much to believe, Use it, Why it matters and Connections stay full width. Schedule tab: the curriculum controls and card right (sticky), the step lists and the "what is the paper's" note left; the OPD lab split the same way; "What this cannot show" full width. Tables tab: unchanged, full width (tables). Further reading unchanged.
- **One 3D stage** (template `25_js_s3.js`, renderer v2, unchanged): `31_js_sc_loop.js`, Figure 2 redrawn, replacing the 2D loop animation (`makeAnim` `lp`, nine steps). Seven steps for the loop (`sx-loop`) and four for curate-once (`sx-once`), swapped by the toggle with `S3.stage(...).list`. Stations on a U: front row the harness (traffic, router as a glass plate, tier towers C0 to C3, the three routing fields, the dedupe and structural gates as glass, the three outcome bins, six verdict tiles), back row training (three stage trays, the OPD bins between student and teacher, the evaluation plinths), the dashed return closing the loop. Flows carry turns from router to tiers (density by the pool's tier counts), tiers to the record, records through the gates, the mixture into the current stage, student and teacher to their bins, the student to evaluation, and allocation back to the mixture. Data: the evaluation bars are real (NeoHorse-1 minus its base on Tables 1 and 2, `recompute.json`); the pool (120 turns, 39, 36, 29, 16 by tier; stage means 0.46, 1.19, 2.15, shuffled 1.24, 1.23, 1.32; 8 held back) and the token distributions (K = 4: tail 0.169 against 0.570; KL 0.349 of 0.522) are the page's own illustrative engines at the Schedule tab's defaults, labelled so under the stage. The old animation's captions became the step lists and its counters went into their text.
- **Kept 2D**: the hero (a verdict on which parts are tested, read best flat), the loss mask (a token sequence), the Eq. 2 widget and the gains chart (values on one axis), the KL reveal and the OPD lab (bars against one axis, driven by a slider), the curriculum animation (three controls, ends on a training curve; its 3D counterpart is the stage's step 4), Figure 7 against the base (log axis), every table.
- **Curriculum animation**: `makeAnim` (`11_js_ui.js`) replaced by the JIT-Agent copy (plays once half in view, pauses off screen, stops for good on any control or at the end, never under reduced motion, `data-playing`, one `ol.sx` per ordering, a click on a list item plays that step once). The caption box (`cuStep`, `cuCap`) went; its texts are the static step lists `sx-cu-soft`, `sx-cu-hard`, `sx-cu-shuf` (seven, seven and four steps, within the long-replay limit; the Train step is one stretch of 120 examples).
- `99_js_tabs.js` and `05z_errbox.js.html` recopied from the templates (storage key `nh-tab`), keeping one page line: a `data-to` target inside a closed block opens it.

## Length judgement (2026-11-13)
| | Before (audit, pre-pass) | After |
|---|---|---|
| The paper, core | 25.6 min (5,878 words) | 28.1 min (6,471) |
| The paper, closed | 5.1 min (1,180) | 5.1 min (1,180) |
| Schedule tab | 2.3 min (527) | 3.7 min (860; the three step lists replace the script-drawn caption box) |
| Tables; Further reading | 7.4; 4.1 min | unchanged |

The growth is the two stage step lists (about 600 words) that replace the 2D loop animation's script-drawn captions and counters (invisible to the word count before) and state the stage's numbers, plus the curriculum captions now written out as lists. Nothing was cut; every result and evidence point stays open as before. Header: "Reading: 28 min, plus 5 in closed details." from `reading.json`.

Ledger: 304 units (core 254, depth 40, owned 5, volatile 2, fat 3); unit 25 re-keyed by hand ("the animation runs one round of each", the sentence now continues) and three units added for the step lists. `ledger.py check` problems 0. `mk_coverage.py` 35 of 35; `recompute.py` 45 of 45.
