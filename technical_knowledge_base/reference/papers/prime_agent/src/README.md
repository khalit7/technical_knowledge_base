# Prime Agent: page source

`sh build.sh` writes `../index.html`, the whole body of the Notion row page (https://app.notion.com/p/3cd5c17b0d0d81579a02f0431f24c6cb, a row of the Papers database; its properties Paper, Takeaway, Topics and Year stay in Notion). The page has no child pages, databases or video. Built from `html_utils/methods/papers.md`, starting from the HarnessDev page's copy of the reference pieces (`build.sh`, `mk_paper.py`, `svgparse.py`, `check_page.mjs`, the CSS and `10_js_common.js`, `11_js_ui.js`, `90_js_tabs.js`).

## Tabs

| Tab | id | What it holds |
|---|---|---|
| The paper | `t-read` | Card, Problem, Idea (clickable state hierarchy; blocking tool call against `rlm()` animation), Method, Results 1 to 5 (Figure 5 rebuilt, three predict-then-reveal questions, Factorio replay), How much to believe, What it takes to use this, Why it matters, Connections. |
| Rescore the ARC-AGI-3 run | `t-run` | The live ingredient: RHAE recomputed from the released median run's scorecard and ten community scorecards, rule controls, level grid, game-by-game replay, ranking. |
| The paper's tables and figures, rebuilt | `t-tables` | Table 1 (paper and blog versions), Figure 5 as numbers, Figures 6, 7, 8, 10 rebuilt, 45 checks. |
| Further reading | `t-more` | Generated from `paper.json`. |

## Departures from papers.md (and why)

- **Live ingredient is a rescoring of the one released trace, not a toy or a turn-by-turn replay.** An agent-harness paper with no released episodes; its one public artifact is the ARC-AGI-3 scorecard, whose per-level data reproduce the printed score exactly and let the reader test the scoring rule and compare with every public-set card on the same games.
- **The Idea animation is illustrative** (labelled): the paper gives no counts for orchestration, so it is built only from §2.2 to §2.4 and Appendix B.
- **No Then and now.** A 2026 result; "What it takes to use this" covers adoption.
- **Reading tab is long (about 27 minutes against the old 6).** The old page was written from the abstract; this one owns the method, every result, the blog and scorecard evidence, and an evidence section that changes the reading of the headline.

## Files

- `save_live.py`: copied the Notion fetch verbatim from the session transcript into `live.md`. `mk_coverage.py` writes `coverage.json` (38 items, this paper's own, verified against the built page).
- `extract_paper.py`: arXiv HTML v1 to `inputs/`. `decode_figs.py` (with `svgparse.py`): Figures 5, 7, 9, 10 to `inputs/figs.json`.
- `mk_tables.py`: `tables.json` (Table 1 checked against the extracted HTML and parsed from the blog, Figures 6 and 8 labels, decoded figures, compact scorecards, asserting every card shares the 25 games and baselines).
- `recompute.py`: RHAE for every card, every derived number and 31 checks, to `inputs/recompute.json`.
- `mk_paper.py`, `paper.json`: card, Further reading, `window.PAPER`.
- `check_page.mjs` (run from the repo root with node): every control in both themes and widths, the three animations stepped.

## Checks (3 October 2026)

`checkpage.sh` fail=0 (emdash 0, errbox 1, clipped 0); `check_page.mjs` 0 problems; `recompute.py` 31 of 31 (plus 14 figure checks); `mk_coverage.py` 38 of 38.
