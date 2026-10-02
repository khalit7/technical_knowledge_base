# GPT-3 (Language Models are Few-Shot Learners): page source

`sh build.sh` writes `../index.html`, the whole body of the Notion row page (https://app.notion.com/p/3c65c17b0d0d8193ac92c7648cfaca12, a row of the Papers database; its properties Paper, Takeaway, Topics and Year stay in Notion). No child pages, databases or video. Built with `html_utils/methods/papers.md`, starting from the reference folder's pieces (via `../t5/src/`, which copies them).

## Tabs

| Tab | id | What it holds |
|---|---|---|
| The paper | `t-read` | Headline card from `paper.json` (Takeaway, three headline numbers, verdict), then Problem, In-context learning (animated against fine-tuning on Figure 2.1's own task, in real GPT-3 tokens), Model, Data (mix to scale), Training and compute (Figure 2.2 rebuilt), Evaluation, The scaling pattern, Task by task (brief), Synthetic tasks, Contamination, Limitations, Broader impacts, How much of this to believe, Why it matters (beyond the paper, sourced, with a tokens-per-parameter chart), Connections. Three predict-then-reveal questions: the few-minus-zero gap at 175B, 3-digit addition at 175B, scores on clean subsets. |
| Refit the scaling curves | `t-run` | The live ingredient: any row of Table H.1 against model size in three settings, a line fitted on the smallest n models predicting 175B, the residual strip for all 41 accuracy tasks, and Figure 3.1's printed loss law as a slider. |
| The paper's tables, rebuilt | `t-tables` | Table H.1 explorer; the full task-by-task results; synthetic tasks in detail; parameter recount (Table 2.1 against D.1); Common Crawl filtering (Appendix A); the training recipe (Appendix B); Table 2.2 epochs recomputed; Table D.1 compute recomputed; Table C.1 with Figure 4.2 rebuilt and the second draw of examples; the six flagged contamination groups; Tables 3.11 and 3.12 with intervals; broader impacts in detail; checks on the paper's own numbers. |
| Further reading | `t-more` | Generated from `paper.json`. |

## Departures from papers.md, and why

- **The live ingredient is a refit, not a toy.** GPT-3 has no new mechanism (the architecture is GPT-2's) and its evidence is a results table of 63 evaluations × 8 sizes × 3 settings. The papers.md row for empirical papers fits: the tab replots Table H.1 and asks whether the seven smaller models predicted 175B. The paper fits no task curves, so the line (straight in log parameters) is labelled as the page's, not the paper's.
- **The before/after animation is a usage pattern, not a layer**: in-context against fine-tuning on the same input (Figure 2.1), the paper's central idea.
- **No "Then and now" tab and no "What it takes to use this".** The model's fate is short (Chinchilla's re-sizing, InstructGPT, closed weights, `davinci` shut down) and sits in Why it matters with one chart; nobody can adopt GPT-3 itself any more (weights never released, the API models retired).
- **Detail moved to the tables tab to keep Reading shorter.** The Reading tab is still 19 minutes against the old page's 10, because the paper is 75 pages and the page owns all of it; the full task-by-task account, the synthetic-task detail, Appendices A and B, the contamination case list and the broader-impacts numbers sit beside their tables, each linked from a one-paragraph summary in Reading.

## Files

- `build.sh`, `mk_paper.py` (where_label extended for Table 2.1, Table H.1 and Appendix names; URLs in resource notes become links), `save_live.py`, `extract_paper.py`, `parts/01_css.html`, `05z_errbox.js.html`, `10_js_common.js`, `11_js_ui.js`, `90_js_tabs.js`: from the reference folder via T5.
- `paper.json`, `tables.json` (19 tables cell by cell from the arXiv HTML v4, by `mk_tables.py`), `parse_h1.py` (Table H.1 raw rows to `inputs/table_h1_raw.json`).
- `recompute.py`: parameter recount, 6ND compute, data-mix epochs, Chinchilla interpolation, Table H.1 structured with categories and nominal chance, the Figure 1.3 aggregate and gap, the fit-on-smaller-models residuals, Table C.1 recomputed, the second draw, binomial standard errors, every text-against-table check and the arithmetic checks quoted in the text. Writes `inputs/recompute.json`.
- `count_tokens.py` (needs `uv run --with tiktoken`): the Figure 2.1 prompt in r50k_base tokens, `inputs/fig21_tokens.json`.
- `check_released_data.py`: the released arithmetic sets against §3.9.1, `inputs/released_data_checks.json`.
- `mk_coverage.py`: `coverage.json`, 80 items from `live.md`, all verified against the built page.
- `check_page.mjs` (node, from the repo root): every control in light 920 and dark 390, the animation stepped, text at least 11 px.
- `inputs/`: `paper_v4.txt` and `table_*.txt` (arXiv v4 extracts), `table_h1_raw.json`, `later_extracts.txt` (quotes from Chinchilla, InstructGPT, Zhao, Min, Olsson, Schaeffer, Wei, PaLM, Gopher, LLaMA, Llama 3, the OpenAI API post via the Wayback Machine, OpenAI's deprecations page, the NeurIPS 2020 awards page, the arXiv history), `openai_gpt3_repo_README.md`.

## What reproduces and what does not

- **Parameters**: all eight sizes recount within 0.32% of Table D.1 from Table 2.1's shapes, except 13B, which needs d_model = 5,120 (40 heads × 128; printed 5,140). XL's 24 heads × 128 = 3,072 is not its d_model of 2,048 (the count does not depend on it).
- **Compute**: every Table D.1 row reproduces from multiplier × parameters × tokens; 175B is 3.14 × 10²³ FLOPs, 3,637 PF-days; 9.5 times T5-11B.
- **Data mix**: Common Crawl and Books2 epochs reproduce; WebText2 (3.47 against 2.9), Books1 (2.0 against 1.9) and Wikipedia (3.0 against 3.4) do not; weights sum to 101%.
- **Aggregate**: 41 accuracy rows in Table H.1 against the stated 42; the gap widens monotonically from 1.8 to 14.8 points (Figure 1.3's shape; its values are not printed).
- **Table C.1 relative differences**: recompute within 0.6 points except QuAC, DROP and Reversed Words.
- **SuperGLUE averages** (71.8, 69.0, 89.0), translation averages, PTB, LAMBADA, TriviaQA, ARC and StoryCloze gaps, arithmetic overlap: reproduce.
- **Prose against tables**: 16 disagreements, listed in the tables tab and `recompute.py`.

## Checks (2 October 2026)

`sh html_utils/checkpage.sh <folder>`: tabs 4, 207.5 KB, emdash 0, errbox 1, clipped 0, fail=0. `check_page.mjs`: 468 actions, 0 problems. `mk_coverage.py`: 80 of 80 verified. Em-dashes appear only in the verbatim source extracts under `inputs/` (the paper's own text), as in the other paper folders.
