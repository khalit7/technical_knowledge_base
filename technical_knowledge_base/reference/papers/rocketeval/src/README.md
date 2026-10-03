# RocketEval: page source

`sh build.sh` writes `../index.html`, the whole body of the Notion row page (https://app.notion.com/p/3cd5c17b0d0d81ffa8e5f8fa5a5806c8, a row of the Papers database; its properties Paper, Takeaway, Topics and Year stay in Notion). The row page has no child pages, databases or video. Built from `html_utils/methods/papers.md` with the reference folder's shared pieces (`01_css`, `05z_errbox`, `10_js_common`, `11_js_ui`, `90_js_tabs`, `check_page.mjs`, `build.sh`), and `mk_paper.py` from the DeepSeekMath page (it has the verdict line).

## Tabs

| Tab | id | What it holds |
|---|---|---|
| The paper | `t-read` | Card with verdict; Problem; Diagnosis (Table 1 predict question, the 70.3% circularity, Figures 4 and 5 rebuilt from the vector PDFs); Method (before/after animation RocketEval vs the CoT judge on one released grading; checklist creation; Eq. 1; replay of four real gradings by two small judges with soft/hard toggle; scatter of 1,000 released gradings against GPT-4o; Eq. 2 to 4 with alpha as normalised entropy, alpha predict widget and histogram over 1,015 queries); Results (dumbbell explorer for Tables 2 and 3, discordant-pairs predict question, cost calculator with batch/standard prices, ablations, checklist analysis); How much to believe; What it takes to use this; Why it matters (with the old page's "does not establish" list, corrected); Connections; Note to self (Khalid's callout verbatim, commentary updated with sources). |
| Re-rank the leaderboard | `t-run` | Live ingredient: GPT-4o's released WildBench grades of the 12 test models; reproduces Table 3's GPT-4o row; bootstrap over queries, per-response noise and per-model bias with presets calibrated to the released small-judge gradings; bump chart, 200-draw histogram, 66-pair grid. |
| The paper's tables, rebuilt | `t-tables` | Tables 1 to 8 (sortable; deltas; Kendall as discordant pairs; Table 4 printed against recomputed), Figures 4 and 5 as numbers, 22 claims checked. |
| Further reading | `t-more` | Generated from `paper.json`. |

## Departures from papers.md, and why

- **Live ingredient: a re-analysis of the authors' released grades**, not a toy model or a trace replay alone. RocketEval is a method on top of models that cannot run in a sandboxed page, and its claim is statistical (a ranking correlation), so the honest live test is to rerun the ranking from the released data and let the reader resample and add noise. The grading replay in the Reading tab is the trace-replay part, from released gradings only.
- **The noisy judges are labelled illustrative**: GPT-4o's grade plus Gaussian noise, with sigma calibrated so single-response correlation matches what the released small-judge gradings measure (0.47, 0.41, 0.29). Real judges' errors are not independent; the per-model bias slider shows why that matters.
- **No "Then and now"**: a 2025 method paper; "What it takes to use this" covers adoption.
- **Instance-level agreement could only be checked on a subset**: gradings are released for 3 of MT-Bench's 6 human-judged models; the subset result is shown as such, not as a reproduction of Table 2.
- **Reading length** about 27 minutes by the build's count (it includes predict reveals, captions and the Note to self commentary) against the old page's 14: the page owns the paper's evidence judgement and the re-analysis.

## Files

- `save_live.py` (Notion fetch from the session transcript into `live.md`), `extract_paper.py` (arXiv HTML v1 to `inputs/paper_v1.txt`, tables to `inputs/table_*.txt`), `mk_tables.py` (`tables.json`; Table 4 transcribed in the script).
- `decode_figs.py`: Figures 4 and 5 from the vector PDFs of the arXiv source (`inputs/fig4_fig5.json`).
- `fetch_data.sh` then `mk_data.py <cache>`: downloads the released data (about 120 MB, not committed: GPT-4o WildBench grades of 22 models, checklists, three small-judge gradings, MT-Bench gradings, lmsys MT-Bench human votes through `uv run --with pandas`, FastChat GPT-4 single grades) and reduces it to `inputs/released.json` (66 KB, committed).
- `recompute.py`: every derived number (Table 4 cost model and the 70B mismatch, discordant pairs, the GPT-4o rerun, token counts, soft/hard correlations, checklist lengths, alpha, Table 2/3/7 claim checks, figure checks) to `inputs/recompute.json`.
- `check_page.mjs`: every control in both themes and widths, the Table 3 reproduction, the noisy-judge preset, the animation stepped. `mk_coverage.py`: `coverage.json`.

## Checks (3 October 2026)

`checkpage.sh`: fail=0, emdash 0, errbox 1, clipped 0, 4 tabs, about 233 KB. `check_page.mjs`: 180 actions, 0 problems. `mk_coverage.py`: 61 of 61.
