# WSM: page source

`sh build.sh` writes `../index.html`, the whole body of the Notion row page (https://app.notion.com/p/3c75c17b0d0d8105b452d2c1bc1d087a, a row of the Papers database; its properties Paper, Takeaway, Topics and Year stay in Notion). The page has no child pages, databases or video. Built from the paper-page method (`html_utils/methods/papers.md`) and the reference folder `attention_is_all_you_need_transformer/src/` (with `mk_paper.py` and `check_page.mjs` taken from `deepseekmath/src/`, which add the verdict line and the live-run check).

## Tabs

| Tab | id | What it holds |
|---|---|---|
| The paper | `t-read` | Headline card with verdict; Problem (schedules chart, planned against extended); Idea (Eq. 1 to 5, Theorem 3.1, the merge-weight calculator reproducing Figure 2, two predict questions, the convex/concave correction); Method (Algorithm 1, offline and online, storage); Why averaging works (river-valley animation, WSD against WSM on the same noise); Results (setup, Figure 3 rebuilt with a matched-token toggle, SFT, MoE balance); What matters (predict question with the duration chart, ablations, Figure 5a rebuilt); How much of this to believe; What it takes to use this; Why it matters; Connections. |
| Merge instead of decay: train it | `t-run` | The toy experiment: eight precomputed seeds and a live run in the browser (Figure 3, Figure 4 and Table 4 analogues, the equivalence test, what reproduces). |
| The paper's tables and figures, rebuilt | `t-tables` | Tables 1 to 9 with every derived number recomputed, Figures 4 and 5 rebuilt, Table 7 against Figure 10's labels, the parameter recount, and all 90 checks. |
| Further reading | `t-more` | Generated from `paper.json`. |

**Departures from `papers.md`, and why.** No "Then and now" tab: a 2025 result paper whose method has not been superseded; adoption and prior art fit in "Why it matters". The tables tab also rebuilds figures, because this paper's evidence is mostly in figures (Figures 3, 4, 5) and its tables are the best points of those curves; the matched-token restatement needs the curves. The live ingredient is a training-recipe toy trained live (as the Switch Transformers and DPO pages do) rather than shipped weights: the whole experiment takes about 2.4 s per seed in the browser. The Reading tab is about 17 minutes against the old page's 8: the page owns every detail of the paper and adds the required evidence and use sections.

## Files

- `build.sh`: runs `recompute.py` and `mk_paper.py`, assembles `parts/`, expands the link macros, fails on an em-dash or an unexpanded macro.
- `paper.json`: metadata, headline numbers, verdict, resources, KB links (`code` is null: none released). `tables.json`: Tables 1 to 9 as printed, written by `mk_tables.py` from `inputs/table_*.txt`.
- `extract_paper.py`: the arXiv HTML (v2) to `inputs/paper_v2.txt` and the tables. `extract_figs.py`: exact marker positions from the vector figures in the arXiv source (`figs/main.pdf`, `window.pdf`, `constant.pdf`, `decay_merge.pdf`, `merge_decay.pdf`), mapped through each panel's own gridlines and tick labels, plus Figure 10's printed labels, to `inputs/figs.json`; needs `uv run --with pymupdf` and the e-print unpacked in a temp folder (PDFs are not kept).
- `recompute.py`: Figure 2 from Theorem 3.1 (40 of 40), Table 1 and 2 improvements, Table 7 to Tables 1 and 3, Table 8/9 group averages, Table 2 from the groups, Figure 3 and 4 best points (at the paper's points and at 400B), Figure 5 comparisons, Table 4 consistency, the Ling-mini parameter recount from `inputs/ling_mini_2_0_config.json`, storage. Writes `inputs/recompute.json`; 83 of 90 checks pass and the 7 that fail are findings on the page.
- `mk_paper.py`: card, Further reading, `parts/_gen_data.js` (`window.PAPER`, including the figure points).
- Toy: `parts/22_js_toy.js` is the engine (runs in the page and in node). `toy_sweep.mjs` runs eight seeds (about 20 s) and writes `model/toy_results.json`, `model/toy_summary.json` and `parts/_gen_toydata.js`. `check_engine.mjs` then `uv run --with torch python check_engine.py` replays 60 Adam steps in PyTorch from the engine's own weights and batches (`model/check_engine.json`: losses within 7e-16, weights within 1.2e-16, a merge within 1.2e-16; PASS).
- `check_page.mjs` (run from the repo root with node): every control in light 920 and dark 390, the animation stepped in both modes, the default live run reproducing the stored seed, text at least 11 px, no NaN or errors. `mk_coverage.py`: 49 facts of `live.md`, all verified in the built page. `save_live.py` copied the Notion fetch verbatim from the session transcript.
- `inputs/external_extracts.txt`: the lines quoted from the Ling 2.0 report, Hägele et al., DeepSeek-V3 and Llama 3, and the code search.

## Checks (3 October 2026)

`checkpage.sh`: fail=0, emdash 0, errbox 1, clipped 0. `check_page.mjs`: 0 problems. `check_engine.py`: PASS. `mk_coverage.py`: 49 of 49.
