# ReAct: page source

`sh build.sh` writes `../index.html`, the whole body of the Notion row page (https://app.notion.com/p/3c65c17b0d0d816b9a24c28de8f08ea8, a row of the Papers database; its properties Paper, Takeaway, Topics and Year stay in Notion). The row page has no child pages, databases or video. Built from `.claude/skills/explainer-page/page-kinds/paper.md` with the reference folder's shared pieces.

## Tabs

| Tab | id | What it holds |
|---|---|---|
| The paper | `t-read` | (split layout and one 3D stage since 2026-11-13) Headline card and verdict (from `paper.json`), the core sentence, the hero (`14_js_hero.js`), "You need" and new terms, then Problem, Idea (the A ∪ L equation and Figure 1's question run four ways as the 3D stage `31_js_sc_fig1.js`), the knowledge-task setup, their results (Table 1 bars, Table 2 splits, predict question on ReAct against CoT), fine-tuning (Figure 3 rebuilt, predict question), decision-making (ALFWorld and WebShop, predict question on the worst ReAct prompt), How much of this to believe, Why it matters (beyond the paper), Connections. |
| Replay the traces | `t-run` | (a widget since 2026-11-13: no autoplay, opens on the last step) The live ingredient: six of the paper's episodes (Figure 1 both panels, Figure 4, Figure 5, Table 10, Appendix D.1), each under every method the paper ran on it, stepped turn by turn with a to-scale context bar, counters (thoughts, actions, observations, model and environment words, context size including the exemplars) and the harness line that runs. |
| The paper's tables and figures, rebuilt | `t-tables` | Table 1 with gaps, standard errors and z; the three-source conflict (Table 1, Table 5, the code README); Figure 2 rebuilt from its SVG paths with the figure-against-table check; Table 2 with the Appendix E.1 example for each mode and the arithmetic check; Figure 3 rebuilt; Table 3; Table 4. |
| Then and now | `t-then` | One step of the Apple Remote episode in six wire formats, 2022 prompt text to 2025 interleaved thinking and the harness loop, with what replaced each part of the recipe. |
| Further reading | `t-more` | Generated from `paper.json`. |

## Departures from papers.md, and why

- **Live ingredient: a trace replay, not a toy model.** ReAct is a prompting method on a closed 540B model, so there is nothing to train at toy scale that would test its claim. papers.md's "agent or method on top of a model" row fits: the paper's own published trajectories, replayed method against method. No new trajectories are generated or invented; observations are truncated where the paper truncates them.
- **No "What it takes to use this".** The method is now the default agent loop; "Then and now" covers what replaced each piece, and the Reading tab says so.
- **Figures rebuilt from vector paths.** Figures 2 and 3 print no numbers. The arXiv HTML ships them as SVG, so `recompute.py` reads the line vertices and bar tops and converts them with the figure's own gridlines and printed ticks (about 0.01 point). That is not reading curves by eye; it surfaced the FEVER CoT and CoT-SC discrepancies with Table 1.
- **Reading length.** 18 minutes against the old page's 10: the paper page owns the details (setup, every result) and adds the evidence section; the four properties of §2 and the decision-task setup were condensed to keep it there.

## Files

- `build.sh`: runs `recompute.py`, `mk_traces.py` and `mk_paper.py`, assembles `parts/` (each JS part in its own `<script>`, tab wiring last via the template `99_js_tabs.js`, storage key `react-tab`, `#jsErr` box first), expands the link macros (see the reference folder's README), fails on an unexpanded macro or an em-dash, fills in the header's reading time from `reading.json`.
- `paper.json`, `tables.json` (Tables 1 to 5 and the README table, printed precision), `mk_paper.py` (as in the RAG folder: card with verdict, Further reading, data).
- `recompute.py`: Figures 2 and 3 from `inputs/fig*.svg`; figure against Table 1 checks; Table 2 sums and the count-consistency search; binomial standard errors (HotpotQA and FEVER with n = 500 labelled as an assumption); headline gaps; Table 3 row means; exemplar word counts from Appendix C. Writes `inputs/recompute.json`.
- `mk_traces.py`: writes `parts/20_traces.js`. Figures 1, 4 and 5 are images, so their text is transcribed in the script by hand (with the paper's highlights as markup); Table 10, Appendix D.1 and the Appendix E.1 examples are cut from `inputs/paper_v3.txt` by the script.
- `save_live.py`: copied the Notion fetch verbatim from the session transcript into `live.md`. `extract_paper.py`: the arXiv HTML (v3, and v1 for comparison) to `inputs/paper_v*.txt` and `inputs/table_*.txt`.
- `inputs/`: paper text (v1 and v3; the experiment numbers are identical, v3 adds Appendix A.1 on GPT-3 and footnotes 2, 3 and 7), the three figure SVGs, `repo_README.md`, `repo_hotpotqa_loop.txt` and `repo_wikienv.txt` (the released code, MIT), `later_extracts.txt` (the lines quoted from later work), `recompute.json`.
- `check_stages.mjs` (2026-11-13, from the repo root): the layout and motion rules at 1400 and 920 px light and 390 px dark, reduced motion, the stage's step list, the Then and now list, the replay staying a widget, and the numbers the stage's list states against `window.R1FIG`.
- `check_page.mjs` (from the repo root with node): every control, both themes and three widths, each replay episode and mode stepped end to end, text at least 11 px, no NaN, no sideways scroll; mid-animation screenshots to `../.shots/x-*.png`.
- `mk_coverage.py`: writes `coverage.json` (every fact of `live.md` and where the HTML carries it) and verifies each against the built page.

## Checks (3 October 2026)

`sh html_utils/checkpage.sh <folder>`: fail=0, emdash 0, errbox 1, clipped 0, 5 tabs, about 167 KB. `node src/check_page.mjs`: 880 actions, 0 problems. `mk_coverage.py`: 59 of 59 items verified.

## The 2026-10-25 light pass (teaching contract)

What changed and why:
- **Top**: the core sentence; a hand-built static hero (`14_js_hero.js`): the loop on the left, and on the right the four prompts as a 2 × 2 (thoughts by actions) with each one's answer to Figure 1's question and its Table 1 HotpotQA EM, so the first picture already says ReAct's wins are not on HotpotQA. Then "You need" (few-shot prompting and CoT; owners of the loop today and of agentic retrieval) and the new terms.
- **Real image**: the paper is CC BY 4.0, so Figure 1's ALFWorld panel (cropped, `img/`, `img/CREDITS.md`) now sits beside the ALFWorld setup to show sparse thoughts; the top half of Figure 1 is already the replay in Idea.
- **Visuals inline**: the Table 1 bars, the Figure 3 bars and the ALFWorld bars left their predict reveals; each sits in its own card right after its question, and the reveal keeps the short answer.
- **No autoplay**: `makeAnim` in `11_js_ui.js` replaced by the patched copy (as on CLIP and Constitutional AI), so the Figure 1 replay, the trace replay and Then and now wait on their first step; `90_js_tabs.js` replaced by the template `99_js_tabs.js` (storage key `react-tab`). `check_page.mjs` now fails if `rp`, `tr` or `th` moves before a click, and opens every closed block.
- **Owned elsewhere, linked with this paper's sentence kept**: the loop as harnesses build it (Agentic harnesses root, Building a harness), iterative retrieval compared (Agentic retrieval), failure taxonomies (Agent and trajectory evaluation), standard errors in general (Eval statistics).
- **Closed**: the four claimed properties; what the hand-written thoughts do; footnote 3; fine-tuning hyperparameters; the ALFWorld prompt construction and the excluded GPT-2 baseline; WebShop in full; the five numeric inconsistencies (the core keeps a one-line summary).
- **Volatile**: LangChain, AutoGPT, OpenHands, Claude Code, the OpenAI Agents SDK, Building effective agents, function calling (June 2023), Toolformer, o3 and Claude 4's interleaved thinking moved into one dated closed block ("sources read 3 October 2026"); Why it matters keeps the durable claims in a paragraph each.
- Header: "Reading: 19 min, plus 3 in closed details.", read by `build.sh` from `reading.json`.

## Length judgement
| | Before (audit 2026-10-23) | After |
|---|---|---|
| The paper, core | 19.1 min (4,398 words) | 19.4 min (4,473) |
| The paper, closed | 0 | 3.0 min (686) |
| Replay the traces | 2.7 min | unchanged |
| Tables and figures, rebuilt | 4.7 min | unchanged |
| Then and now | 1.9 min | unchanged |

Why about 19 minutes is right: the added top (core sentence, hero caption, terms and owner links, about 1.5 minutes) was paid for by closing provenance, setup detail and the dated adoption list. What stays open is the paper's argument in order with every result and its number: the method and the prompts-by-deletion design, Table 1 and the failure analysis of Table 2, the fine-tuning flip, ALFWorld, WebShop, the ReAct-IM ablation, human editing, GPT-3, and the evidence section this page owns. Cutting further would drop results, not repetition.

## Knowledge ledger (`ledger.json`, labelled by `label_ledger.py`)
294 units: core 262, depth 14, owned 5, volatile 11, fat 2. 285 drafted by `ledger.py init` from the page before the pass; 9 added (core sentence, hero, new terms, Figure 1 panel, five owner links). Fat: the old reading-time line and the old animation-manners line. `ledger.py check`: problems 0.

## Checks (25 October 2026)
`checkpage.sh`: tabs 5, fail=0, emdash 0, errbox 1, clipped 0. `check_page.mjs`: 880 actions, 0 problems (including no movement before a click and every closed block opened). `mk_coverage.py`: 59 of 59 (the reading-time item's keys updated; the Figure 3 reveal keeps "becomes the best of the four").

## The 2026-11-13 layout rollout (split layout, renderer v2 stage, autoplay)

What changed and why:
- **Split layout** (template `02_split.html`, unchanged, after `01_css.html`; one page style after the `kb-look` block clears a predict box below the margin label). The paper: the core sentence, You need and New terms beside the hero; Problem and Idea share the 3D stage (its step list in Idea); Knowledge results beside the Table 1 bars and the Table 2 splits (now a card of their own, "Hallucination causes over half of CoT's failures and none of ReAct's"); Fine-tuning beside Figure 3; Decision-making beside the paper's Figure 1 panel (2) and the ALFWorld bars. The card, the nav, the knowledge-task setup, How much to believe, Why it matters and Connections stay full width (no visual). Replay tab: the notes left, the replay right. Tables tab: Table 1, Table 2 and Table 3 stay full width (tables); Figures 2 and 3 and Table 4's bars split with heading and notes left. Then and now: the intro and a six-item step list left, the animation right; the table full width.
- **One 3D stage** (template `25_js_s3.js`, renderer v2, unchanged): `31_js_sc_fig1.js`, Figure 1's question run four ways. Lanes front to back (Standard, CoT, Act, ReAct), each entry of the trajectory a block coloured by role (thought, action, observation) whose height grows with its words as printed, standing on a glass tray that is the context and grows as entries are appended; the prompt's exemplars as a stack at the start of each lane (114, 308, 515, 938 words); the Wikipedia API behind the lanes as a separate object with one tile per page reached (Apple Remote, similar titles, Front Row (software), derived from the actions and observations). Flows carry each action into its tile and each observation back. Eight steps: the four prompts; Standard; CoT; Act (its seven entries in one stretch); ReAct in three stretches (long-replay rule); then the words each lane's model wrote (up) against the words the environment returned (down) on plinths: 1/0, 39/0, 8/24, 90/53. Camera moves in close on each lane. Data: the page's own transcription of Figure 1 (`window.TRACES`, `mk_traces.py`) and the Appendix C.1 word counts; nothing illustrative. It replaces the 2D Figure 1 replay (`rp`) of Idea; that episode stays in the Replay tab with its counters and harness code.
- **Kept 2D**: the hero (a loop diagram and a 2 by 2, structure that reads flat), Table 1 and ALFWorld bars and Table 2 splits (numbers on one axis), Figure 3 bars, Figures 2 (curves) and every table, the replay (a reading tool for text), Then and now (wire formats are text).
- **Motion**: `makeAnim` in `11_js_ui.js` is the Emergence World copy (plays once half in view, pauses off screen, stops on any control or at the end, never under reduced motion, `data-playing`, a list item click plays its step once), plus `auto:false` for a widget. The trace replay (six episodes, up to 20 steps) is a widget under the long-replay rule: no autoplay, no step list, it opens and resets on the episode's last step, and its per-step caption stays live under it. Then and now's six captions moved from `25_js_then.js` into the static list `sx-th`. `99_js_tabs.js` (key `react-tab`, a `data-to` target's closed block opens) and `05z_errbox.js.html` recopied from the templates. `check_page.mjs` now expects Then and now to play when scrolled into view (it used to forbid it), the replay to stay still, and runs at 1400 px too. `build.sh` finds the repository's Python by walking up to the nearest `.venv` instead of asking git.

## Length judgement (2026-11-13)
| | Before | After |
|---|---|---|
| The paper, core | 19.6 min (4,505 words) | 21.0 min |
| The paper, closed | 3.0 min (686) | 3.0 min |
| Replay the traces | 2.7 min | 3.1 min |
| Tables and figures | 4.7 min | 4.7 min |
| Then and now | 1.9 min | 3.2 min |
| Visuals in The paper (audit) | 3 | 4 |

The growth is the step lists: the stage's eight steps and Then and now's six generations were captions drawn by script one at a time (invisible to the word count) and are now static text beside their visuals. Nothing was cut. Header: "Reading: 21 min, plus 3 in closed details." (`reading.json`).

Ledger: 310 units (core 278, depth 14, owned 5, volatile 11, fat 2); seven re-keyed where a sentence was reworded or split from its controls (27, 28, 29, 30, 31, 256, 260) and sixteen added for the two step lists and the widget sentence. `ledger.py check` problems 0. `mk_coverage.py` 59 of 59; the generated parts are byte-identical.

## Checks (13 November 2026)
`checkpage.sh`: tabs 5, about 227 KB, fail=0, emdash 0, errbox 1, clipped 0. `check_page.mjs`: 1,158 actions, 0 problems. `check_stages.mjs`: 9 stage and animation checks over three widths, 0 problems. `verify_layout.mjs`: problems 0.
