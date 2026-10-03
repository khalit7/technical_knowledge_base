# RRSI: page source

`sh build.sh` writes `../index.html`, the whole body of the Notion row page (https://app.notion.com/p/3e95c17b0d0d81dbb1a5e660ed019c8a, a row of the Papers database; its properties Paper, Takeaway, Topics and Year stay in Notion). The page has no child pages, databases or video. Built from `html_utils/methods/papers.md`, starting from the HarnessDev page's copy of the reference pieces (`11_js_ui.js`, `05z_errbox.js.html` and `90_js_tabs.js` are identical to the reference's).

## Tabs

| Tab | id | What it holds |
|---|---|---|
| The paper | `t-read` | Card (the Takeaway verbatim, with a correction note), Problem with a predict-then-reveal toy (the same candidate stream through "keep the best score" and RRSI's selection rules, animated), Idea (analogy table, loop diagram), Method (Eq. 4 budget chart, the four selection rules with Eq. 17 and the weights from the code), Setup, Results (Figures 3 and 1(a) rebuilt), Ablations and cost (predict on Table 2, Figure 4(a) rebuilt), How much to believe, What it takes to use this, Why it matters, Connections. |
| Replay the released runs | `t-run` | The live ingredient: all four released evolution runs (regularized-rsi.com) stepped round by round, recorded decisions against "keep the best score"; Algorithm 2 ported from `rrsi/selection.py` re-judging every recorded candidate with sliders; the four runs side by side; the Harvey LAB held-out record against Table 1. |
| The paper's tables and figures, rebuilt | `t-tables` | Tables 1 to 6 (Table 6 against the records), budgets of every round, noise bars, all 53 checks. |
| Further reading | `t-more` | Generated from `paper.json`. |

## Departures from papers.md (and why)

- **Live ingredient is a replay of the authors' own run records, not a toy model.** An agent-harness paper (the trace-replay row of papers.md), and the authors released every round of four runs plus the selection code, so the real decisions can be replayed and re-judged; the rule port reproduces 37 of 37 coding and 31 of 32 Harvey LAB decisions.
- **A small illustrative toy in the Reading tab** (behind the first predict question) for the noise-chasing argument, which no released record can show because the truth is unknown there. It does not reproduce the paper's transfer advantage, and it says so; it was not tuned until it did (`check_sim.mjs` checks the calibration and that statement).
- **No Then and now.** A September 2026 result; "What it takes to use this" covers adoption.
- **Reading tab is long (about 26 minutes against the old 6).** The old page was written from the abstract; this one owns the method's appendix rules, the released records and an evidence section that changes the reading (records disagree with three printed numbers; the headline run predates the method as described).

## Files

- `save_live.py`: copies the Notion fetch verbatim from the session transcript into `live.md`. `mk_coverage.py` writes `coverage.json` (30 items, this paper's own, verified against the built page).
- `extract_paper.py`: arXiv HTML v2 to `inputs/paper_v2.txt`, `inputs/tables_v2.txt`, `inputs/anchors.txt`. `decode_figs.py`: Figures 1 and 4 from the vector PDFs of the arXiv e-print to `inputs/figs.json` (run with `uv run --with pymupdf`).
- `mk_runs.py`: the released run records (`regularized-rsi.com/data/evolution.js`, 1.25 MB, not kept) to the compact `inputs/runs.json` the page ships (96 KB).
- `mk_tables.py`: `tables.json`. `recompute.py`: 53 checks, noise estimates, the rule replay, token spend, toy defaults, to `inputs/recompute.json`.
- `mk_paper.py`, `paper.json`: card, Further reading, `window.PAPER`, `window.RUNS`.
- `check_sim.mjs` (from `src/`, after the build): the toy's calibration and its 400-seed averages. `check_page.mjs` (from the repo root): every control in both themes and widths, both animations stepped for every run and mode.

## Checks (3 October 2026)

`checkpage.sh` fail=0 (emdash 0, errbox 1, clipped 0); `check_page.mjs` 0 problems; `check_sim.mjs` PASS; `recompute.py` 53 checks, 40 reproduce, 13 do not (each shown on the page); `mk_coverage.py` 30 of 30.
