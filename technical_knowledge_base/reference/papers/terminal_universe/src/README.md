# Terminal-Universe: page source

`sh build.sh` writes `../index.html`, the whole body of the Notion row page (https://app.notion.com/p/3d45c17b0d0d814abc07fde424e09a31, a row of the Papers database; its properties Paper, Takeaway, Topics and Year stay in Notion). The page has no child pages, databases or video. Built from `html_utils/methods/papers.md`, starting from the Demystifying Agent Skills page's copy of the reference pieces.

## Tabs

| Tab | id | What it holds |
|---|---|---|
| The paper | `t-read` | Headline card (from `paper.json`, with the database Takeaway verbatim plus its two corrections), Problem, Idea (the imitate against rebuild-and-re-solve animation on a real trace), Step 1 rebuild (Table 13 bars, the funnel), Step 2 re-query (four mechanisms, the RSA pair, the multi-round session stepper, Figure 3), Step 3 verify, Data, Results (Table 3 dot chart), Ablations (three predict-then-reveal questions), How much to believe, What it takes to use this, Why it matters, Connections. |
| Replay a real trajectory | `t-run` | The live ingredient: Stage 1 replay run in the browser on five real LFM2-Terminal rows, earliest-version rule against replay-to-the-end, recovered files, statistics over 640 sampled rows. |
| The paper's tables and figures, rebuilt | `t-tables` | Table 3 with same-base and measured-only filters, Tables 4 to 11 switcher, the noise chart, sources (Tables 12, 14, 2), Tables 13, 19, 17, 1, Figures 5 and 6 from their labels, every number checked, corrections to the old page. |
| Further reading | `t-more` | Generated from `paper.json`. |

## Departures from papers.md (and why)

- **No toy model, no Then and now.** The paper is an agent-data pipeline; there is no layer to train and it is too recent for a "then and now". The live ingredient is the agent row's trace replay, but of the paper's own Stage 1: we re-implemented the stated replay rule and run it on real rows of the paper's largest source corpus, so the reader watches the mechanism itself, not an illustration.
- **The replay's mapping from shell commands to reads and writes is ours.** The paper's replay framework is unreleased and LFM2-Terminal traces have no Read/Write/Edit tools. The mapping is stated on the page and in `replay.py`; its output is compared with Table 13 (median files reproduces; lines and seed pass rate are lower).
- **The animation's completion step uses the paper's terminal-pool medians** (2 to 13 files), labelled, because no completed workspace of any trace is published.
- **Reading is long (about 23 minutes)** because the paper has many ablations and the evidence section needs their noise; it sits within the range of the other paper pages.

## Files

- `build.sh`: runs `recompute.py`, `check_replay.mjs` (fails the build if the in-page replay disagrees with `replay.py` on a shipped trace), `mk_paper.py`, assembles `parts/`, expands the link macros, fails on an em-dash or unexpanded macro.
- `extract_paper.py`: arXiv HTML v1 to `inputs/paper_v1.txt`, `tables_v1.txt`, `anchors.txt`.
- `decode_figs.py`: printed labels of Figures 3, 5, 6 and the pipeline figure from the e-print's vector PDFs into `inputs/figures.json` (needs `uv run --with pymupdf`; the e-print is not kept).
- `tables.json`: Tables 1 to 14, 17, 19 transcribed with printed precision; `recompute.py` checks every number against the extracted text.
- `recompute.py`: every derived number, the checks table and the noise table, into `inputs/recompute.json`.
- `fetch_sample.py`: 640 rows of LFM2-Terminal-SFT-Processed at seeded random offsets (about 35 MB, kept out of the repo).
- `replay.py <sample dir>`: Stage 1 replay; writes `inputs/replay_stats.json`, `inputs/replay_expected.json` and `parts/21_traces.js` (the five shipped traces, outputs cut at 30 lines with the cut counted).
- `check_replay.mjs [sample dir]`: the JS port (`parts/22_js_replay.js`) against `replay.py`, on the shipped traces and, with the sample dir, on all 640 (`inputs/check_replay.json`: 14,824 commands, 0 mismatches).
- `mk_paper.py`, `paper.json`: card, Further reading, `window.PAPER`.
- `save_live.py`: copied the Notion fetch verbatim from the session transcript into `live.md`. `mk_coverage.py` writes `coverage.json` (32 items from `live.md`, verified against the built page).
- `check_page.mjs` (run from the repo root with node): every control in both themes and widths, both animations stepped (the replay for every trace and both rules), 11 px text, NaN, errors, sideways scroll.
- `inputs/README.md`: where every input came from.

## To rebuild from scratch

```
python3 fetch_sample.py <dir> && python3 replay.py <dir> && node check_replay.mjs <dir>
sh build.sh && python3 mk_coverage.py
sh ../../../../../html_utils/checkpage.sh ..     # from src/; or from the repo root with the page folder
```
