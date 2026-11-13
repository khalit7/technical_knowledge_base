# GPT-3 (Language Models are Few-Shot Learners): page source

`sh build.sh` writes `../index.html`, the whole body of the Notion row page (https://app.notion.com/p/3c65c17b0d0d8193ac92c7648cfaca12, a row of the Papers database; its properties Paper, Takeaway, Topics and Year stay in Notion). No child pages, databases or video. Built with `.claude/skills/explainer-page/page-kinds/paper.md`, starting from the reference folder's pieces (via `../t5/src/`, which copies them).

## Tabs

| Tab | id | What it holds |
|---|---|---|
| The paper | `t-read` | Headline card from `paper.json` (Takeaway, three headline numbers, verdict), the core idea in one sentence beside the hero, Fig. 1 (a 3D stage: the eight sizes to scale with zero- and few-shot accuracy and the gap), You need and New terms, then Problem, In-context learning (Fig. 2, a 3D stage: Figure 2.1's task in context against fine-tuning, in real GPT-3 tokens, two modes with their step lists), Model, Data (mix to scale), Training and compute (Figure 2.2 rebuilt), Evaluation, The scaling pattern (Figure 1.3 recomputed from Table H.1, gap marked at both ends), Task by task (brief), Synthetic tasks, Contamination, Limitations (broader impacts in a closed block), How much of this to believe, Why it matters (beyond the paper, sourced, with a tokens-per-parameter chart), Connections. Two predict-then-reveal questions: 3-digit addition at 175B, scores on clean subsets. Eight closed details blocks. |
| Refit the scaling curves | `t-run` | The live ingredient: any row of Table H.1 against model size in three settings, a line fitted on the smallest n models predicting 175B, the residual strip for all 41 accuracy tasks, and Figure 3.1's printed loss law as a slider. |
| The paper's tables, rebuilt | `t-tables` | Table H.1 explorer; the full task-by-task results; synthetic tasks in detail; parameter recount (Table 2.1 against D.1); Common Crawl filtering (Appendix A); the training recipe (Appendix B); Table 2.2 epochs recomputed; Table D.1 compute recomputed; Table C.1 with Figure 4.2 rebuilt and the second draw of examples; the six flagged contamination groups; Tables 3.11 and 3.12 with intervals; broader impacts in detail; checks on the paper's own numbers. |
| Further reading | `t-more` | Generated from `paper.json`. |

## Departures from papers.md, and why

- **The live ingredient is a refit, not a toy.** GPT-3 has no new mechanism (the architecture is GPT-2's) and its evidence is a results table of 63 evaluations × 8 sizes × 3 settings. The papers.md row for empirical papers fits: the tab replots Table H.1 and asks whether the seven smaller models predicted 175B. The paper fits no task curves, so the line (straight in log parameters) is labelled as the page's, not the paper's.
- **The before/after is a usage pattern, not a layer**: in-context against fine-tuning on the same input (Figure 2.1), the paper's central idea; since 2026-11-13 it is the 3D stage Fig. 2.
- **No "Then and now" tab and no "What it takes to use this".** The model's fate is short (Chinchilla's re-sizing, InstructGPT, closed weights, `davinci` shut down) and sits in Why it matters with one chart; nobody can adopt GPT-3 itself any more (weights never released, the API models retired).
- **Detail moved to the tables tab to keep Reading shorter.** The Reading tab is still 19 minutes against the old page's 10, because the paper is 75 pages and the page owns all of it; the full task-by-task account, the synthetic-task detail, Appendices A and B, the contamination case list and the broader-impacts numbers sit beside their tables, each linked from a one-paragraph summary in Reading.

## Files

- `build.sh`, `mk_paper.py` (where_label extended for Table 2.1, Table H.1 and Appendix names; URLs in resource notes become links), `save_live.py`, `extract_paper.py`, `parts/01_css.html`, `05z_errbox.js.html`, `10_js_common.js`, `11_js_ui.js` (its `makeAnim` removed on 2026-11-13, unused since Fig. 2 became a stage): from the reference folder via T5; `99_js_tabs.js` is the explainer-page template (storage key `gpt3-tab`, plus `data-to` scrolling that opens a closed block).
- `paper.json`, `tables.json` (19 tables cell by cell from the arXiv HTML v4, by `mk_tables.py`), `parse_h1.py` (Table H.1 raw rows to `inputs/table_h1_raw.json`).
- `recompute.py`: parameter recount, 6ND compute, data-mix epochs, Chinchilla interpolation, Table H.1 structured with categories and nominal chance, the Figure 1.3 aggregate and gap, the fit-on-smaller-models residuals, Table C.1 recomputed, the second draw, binomial standard errors, every text-against-table check and the arithmetic checks quoted in the text. Writes `inputs/recompute.json`.
- `count_tokens.py` (needs `uv run --with tiktoken`): the Figure 2.1 prompt in r50k_base tokens, `inputs/fig21_tokens.json`.
- `check_released_data.py`: the released arithmetic sets against §3.9.1, `inputs/released_data_checks.json`.
- `mk_coverage.py`: `coverage.json`, 80 items from `live.md`, all verified against the built page.
- `check_page.mjs` (node, from the repo root): every control in light 920 and dark 390, text at least 11 px. `check_stages.mjs`: the 3D stages and the split layout (2026-11-13).
- `inputs/`: `paper_v4.txt` and `table_*.txt` (arXiv v4 extracts), `table_h1_raw.json`, `later_extracts.txt` (quotes from Chinchilla, InstructGPT, Zhao, Min, Olsson, Schaeffer, Wei, PaLM, Gopher, LLaMA, Llama 3, the OpenAI API post via the Wayback Machine, OpenAI's deprecations page, the NeurIPS 2020 awards page, the arXiv history), `openai_gpt3_repo_README.md`.

## What reproduces and what does not

- **Parameters**: all eight sizes recount within 0.32% of Table D.1 from Table 2.1's shapes, except 13B, which needs d_model = 5,120 (40 heads × 128; printed 5,140). XL's 24 heads × 128 = 3,072 is not its d_model of 2,048 (the count does not depend on it).
- **Compute**: every Table D.1 row reproduces from multiplier × parameters × tokens; 175B is 3.14 × 10²³ FLOPs, 3,637 PF-days; 9.5 times T5-11B.
- **Data mix**: Common Crawl and Books2 epochs reproduce; WebText2 (3.47 against 2.9), Books1 (2.0 against 1.9) and Wikipedia (3.0 against 3.4) do not; weights sum to 101%.
- **Aggregate**: 41 accuracy rows in Table H.1 against the stated 42; the gap widens monotonically from 1.8 to 14.8 points (Figure 1.3's shape; its values are not printed).
- **Table C.1 relative differences**: recompute within 0.6 points except QuAC, DROP and Reversed Words.
- **SuperGLUE averages** (71.8, 69.0, 89.0), translation averages, PTB, LAMBADA, TriviaQA, ARC and StoryCloze gaps, arithmetic overlap: reproduce.
- **Prose against tables**: 16 disagreements, listed in the tables tab and `recompute.py`.

## Light pass, 2026-10-24 (teaching contract)

- **Top**: the core sentence, the hero figure and New terms (in-context learning, zero/one/few-shot, demonstration). The paper's arXiv licence is the non-exclusive default, not CC BY, so its figures are redrawn, not embedded; no photo would teach anything here.
- **Moved into closed `<details>`** (nothing deleted but fat): the three reasons in the paper's words, the 13B and XL shape mismatches, the training recipe, every scoring rule, the N-gram flagging rule, "shared with deep learning" plus broader impacts, three smaller trust points, and one dated block for the API launch and the `davinci` shutdowns (volatile).
- **Owned elsewhere**: why compute is 6 FLOPs per parameter per token now links to Pretraining (OWNERS.md); the paper's own sentence on applying it stays. New one-line links: quality classifiers (Common Crawl filter), decontamination (N-gram rules), Pretraining (compute-optimal allocation).
- **No autoplay**: `makeAnim` waits on step 1 (the IntersectionObserver no longer starts it and a mode switch pauses); `check_page.mjs` now fails if `#ft` draws a frame before play is pressed or on a mode switch. Header: "Reading: 18 min, plus 3 in closed details." from `reading.json` (written by hand from `html_utils/audit_pages.mjs`).
- **Length**: core 19 min before (4,382 words), 18 after (4,209) plus 3 in closed details, although the top section is new. The rest is the paper's own argument and numbers, which this page owns (a 75-page paper, 63 evaluations), so it stays; the tables tab (20 min) and the refit tab (3 min) are tools used across the page and are unchanged.
- **Ledger** (`ledger.json`, labelled by `label_ledger.py`): 297 units, core 185, depth 106 (85 of them the tables tab), owned 1, volatile 2, fat 3; `python3 html_utils/ledger.py check` problems 0.

## Checks (2 October 2026)

`sh html_utils/checkpage.sh <folder>`: tabs 4, 207.5 KB, emdash 0, errbox 1, clipped 0, fail=0. `check_page.mjs`: 468 actions, 0 problems. `mk_coverage.py`: 80 of 80 verified. Em-dashes appear only in the verbatim source extracts under `inputs/` (the paper's own text), as in the other paper folders.

Rechecked 2026-10-24 after the light pass: `checkpage.sh` tabs 4, 213.0 KB, emdash 0, errbox 1, clipped 0, fail=0; `check_page.mjs` 464 actions, 0 problems (including the no-autoplay check); `mk_coverage.py` 80 of 80.

## 2026-10-26: in-context learning owned by Test-time compute and reasoning
Khalid's decision: in-context learning and the few-shot protocol are owned by Test-time compute and reasoning (section 10). This page keeps its own results and method (the scaling of few minus zero, Figure 2.1 before/after, task by task) and now links there from New terms, "Why call it learning" and Connections.

## The 2026-11-13 layout rollout (split layout, renderer v2 stages, autoplay)

What changed and why:
- **Split layout** (template `02_split.html`, unchanged, after `01_css.html`). The paper tab: the top (core sentence, Fig. 1's step list, You need, New terms) beside the hero stage; In-context learning beside Fig. 2; Data beside the mix bar; Training and compute beside Figure 2.2 rebuilt; The scaling pattern beside the Figure 1.3 curve (moved there from the top, with its caption unchanged); Why it matters beside the tokens-per-parameter chart. Full width (no visual, or a predict widget whose chart opens inside it): Problem, Model, Evaluation, Task by task, Synthetic tasks, Contamination, Limitations, How much to believe, Connections. Refit the scaling curves: three splits (notes left, the refit card, the residual strip and the loss-law slider right). Tables tab: Table C.1's Figure 4.2 rebuilt sits beside its caption; the rest stays full width (tables, and the Tables 3.11 and 3.12 chart, which has no prose to sit beside).
- **Two 3D stages** (template `25_js_s3.js`, renderer v2, unchanged):
  - `31_js_sc_hero.js`, Fig. 1 (replaces the 2D hero curve at the top): the eight models as stacks, height their layers and width and depth their d_model from Table 2.1 (`RC.params`; 13B at its printed 5,140), so volume is to scale with 12 x layers x d_model squared; in front of each, on a white plinth, the mean zero-shot and few-shot accuracy over the 41 accuracy rows of Table H.1 (`RC.agg`), then the gap (`RC.agg_gap`, 1.8 to 14.8) highlighted. Five steps; the camera moves in close on the seven smaller models in step 2; flows in step 4 carry demonstrations into every model (schematic, the same for every size). On a phone four of the eight sizes are labelled.
  - `32_js_sc_icl.js`, Fig. 2 (replaces the 2D before/after `#ft` and its controller): the 2,048-token window as a 64 by 32 tray of slots to scale, Figure 2.1's prompt as token blocks with the counts of `inputs/fig21_tokens.json` (7, 10, 11, 11, 3; answer 2), the model's 96 layers as 8 glass plates (illustrative, said under the list), a training-set pile. In-context mode: demonstrations stream into the tray, the context streams up through the frozen plates and " fromage" comes out. Fine-tuning mode: each example streams into the model and a gradient streams down, the plates change colour; thousands of examples; a second 175B copy; the query through the copy. Two seven-step lists (`sx-icl-icl`, `sx-icl-ft`), toggled by `#iclM`; the camera moves in close on the first row of the tray after step 1.
- **Kept 2D**: the Figure 1.3 curve (accuracy against log size), the data-mix share bar, the Figure 2.2 and tokens-per-parameter log bars, the arithmetic and contamination reveals, the refit, residual strip and loss law (the tab's tools), the tables tab.
- **Motion**: both stages play once half in view and stop for good on a reader control (template). `99_js_tabs.js` and `05z_errbox.js.html` recopied from the templates (storage key `gpt3-tab`; no `data-to` target sits in a closed block, so the old block-opening line is not needed). `check_page.mjs` no longer asserts never-autoplay; `check_stages.mjs` asserts autoplay, one list item per step in each mode, flows stopping off screen, reduced motion, two columns at 1400 px, and 23 step-list numbers against `RC` and the token counts.

## Length judgement (2026-11-13)
| | Before | After |
|---|---|---|
| The paper, core | 18.8 min (4,330 words) | 21.9 min (5,040) |
| The paper, closed | 2.7 min (623) | unchanged |
| Refit; tables; Further reading | 3.1; 19.7; 2.4 min | unchanged |
| Visuals in Reading (audit) | 5 | 6 (two stages; the hero curve kept beside The scaling pattern; the 2D before/after replaced) |

The growth is the step lists: Fig. 1's five steps (about 1.3 minutes; the old hero caption stays with the curve) and Fig. 2's two lists, whose text was drawn by script before and invisible to the audit (the fine-tuning list, about 1 minute of the count, is hidden until chosen). Nothing was cut. Header: "Reading: 22 min, plus 3 in closed details." Ledger unchanged: 297 units (core 185, depth 106, owned 1, volatile 2, fat 3), problems 0.
