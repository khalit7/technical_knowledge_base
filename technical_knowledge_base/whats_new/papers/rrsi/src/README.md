# RRSI: page source

`sh build.sh` writes `../index.html`, the whole body of the Notion row page (https://app.notion.com/p/3e95c17b0d0d81dbb1a5e660ed019c8a, a row of the Papers database; its properties Paper, Takeaway, Topics and Year stay in Notion). The page has no child pages, databases or video. Built from `.claude/skills/explainer-page/page-kinds/paper.md`, starting from the HarnessDev page's copy of the reference pieces (`05z_errbox.js.html` is identical to the reference's; `11_js_ui.js` is the reference's with autoplay removed, and the tab script is the skill template `99_js_tabs.js` since the 2026-10-26 light pass).

## Tabs

| Tab | id | What it holds |
|---|---|---|
| The paper | `t-read` | Card (the Takeaway as scoped on 2026-10-26, with the old wording in its note), the core sentence and hero figure with You need and New terms, Problem with a predict-then-reveal toy (the same candidate stream through "keep the best score" and RRSI's selection rules, animated), Idea (analogy table, loop diagram), Method (Eq. 4 budget chart, the four selection rules with Eq. 17 and the weights from the code), Setup, Results (Figures 3 and 1(a) rebuilt), Ablations and cost (predict on Table 2, Figure 4(a) rebuilt), How much to believe, What it takes to use this, Why it matters, Connections. |
| Replay the released runs | `t-run` | The live ingredient: all four released evolution runs (regularized-rsi.com) stepped round by round, recorded decisions against "keep the best score"; Algorithm 2 ported from `rrsi/selection.py` re-judging every recorded candidate with sliders; the four runs side by side; the Harvey LAB held-out record against Table 1. |
| The paper's tables and figures, rebuilt | `t-tables` | Tables 1 to 6 (Table 6 against the records), budgets of every round, noise bars, all 53 checks. |
| Further reading | `t-more` | Generated from `paper.json`. |

## Departures from papers.md (and why)

- **Live ingredient is a replay of the authors' own run records, not a toy model.** An agent-harness paper (the trace-replay row of papers.md), and the authors released every round of four runs plus the selection code, so the real decisions can be replayed and re-judged; the rule port reproduces 37 of 37 coding and 31 of 32 Harvey LAB decisions.
- **A small illustrative toy in the Reading tab** (behind the first predict question) for the noise-chasing argument, which no released record can show because the truth is unknown there. It does not reproduce the paper's transfer advantage, and it says so; it was not tuned until it did (`check_sim.mjs` checks the calibration and that statement).
- **No Then and now.** A September 2026 result; "What it takes to use this" covers adoption.
- **Reading tab is long (about 23 minutes plus 6 in closed details after the 2026-10-26 light pass; 26 before it, against the old 6).** The old page was written from the abstract; this one owns the method's appendix rules, the released records and an evidence section that changes the reading (records disagree with three printed numbers; the headline run predates the method as described).

## Files

- `save_live.py`: copies the Notion fetch verbatim from the session transcript into `live.md`. `mk_coverage.py` writes `coverage.json` (30 items, this paper's own, verified against the built page).
- `extract_paper.py`: arXiv HTML v2 to `inputs/paper_v2.txt`, `inputs/tables_v2.txt`, `inputs/anchors.txt`. `decode_figs.py`: Figures 1 and 4 from the vector PDFs of the arXiv e-print to `inputs/figs.json` (run with `uv run --with pymupdf`).
- `mk_runs.py`: the released run records (`regularized-rsi.com/data/evolution.js`, 1.25 MB, not kept) to the compact `inputs/runs.json` the page ships (96 KB).
- `mk_tables.py`: `tables.json`. `recompute.py`: 53 checks, noise estimates, the rule replay, token spend, toy defaults, to `inputs/recompute.json`.
- `mk_paper.py`, `paper.json`: card, Further reading, `window.PAPER`, `window.RUNS`.
- `check_sim.mjs` (from `src/`, after the build): the toy's calibration and its 400-seed averages. `check_page.mjs` (from the repo root): every control in both themes and widths, both animations stepped for every run and mode.

## Checks (3 October 2026)

`checkpage.sh` fail=0 (emdash 0, errbox 1, clipped 0); `check_page.mjs` 0 problems; `check_sim.mjs` PASS; `recompute.py` 53 checks, 40 reproduce, 13 do not (each shown on the page); `mk_coverage.py` 30 of 30.

## The 2026-10-26 light pass (teaching contract)

What changed and why:
- **Top**: the core sentence, then a hero redrawn as static SVG (`mk_hero.py` writes `parts/03a_hero.svg.html` from `tables.json`): the loop of Figure 2 and Algorithm 2 with what RRSI adds marked in the accent colour, over Table 2's trade on the agentic workspace (evolve 89.4 / 92.8 / 90.5, out-of-distribution average 39.7 / 40.3 / 43.6, policy tokens 1.56 / 3.80 / 2.42M for H0, unregularised, RRSI). The paper is under arXiv's non-exclusive licence, so no paper figure is embedded; nothing physical to photograph. Then "You need" (Topic: agentic-harnesses, self-improving harnesses on Harnesses for training, Eval statistics) and the new terms.
- **Owned elsewhere, a sentence kept and linked**: the general definition of a harness (Topic: agentic-harnesses); keep-the-best on a noisy score in general (Harnesses for training, section 6). Links added, content kept: binomial standard errors (Eval statistics), judge biases (LLM-as-judge).
- **Closed** (`details.more`): how the page was built; the toy's calibration; what the critic did in the released records (an open sentence keeps the one outright rejection); the old-summary note on the pruner; the eight-benchmark table (an open sentence names the suites and graders); Table 6's four decisions; protocol arithmetic and smaller slips; the detailed bullets of What it takes to use this (one open paragraph).
- **No volatile block**: nothing on the page is dated follow-up news.
- **No autoplay**: `makeAnim` patched as on Dream-RSI (waits on step 1 until the reader presses play or steps); `90_js_tabs.js` replaced by the skill template `99_js_tabs.js` (storage key `rrsi-tab`), keeping the `data-to` scroll target. `check_page.mjs` now fails if either animation draws a frame before a click (with the predict reveals open) and opens every closed block.
- **Takeaway scoped** (`paper.json`, so the card; `live.md`'s property line; `mk_coverage.py`): "+14.1 in distribution, +4.7 out of distribution, 30% fewer tokens, the first evidence" became Table 2's trade (43.6 against 39.7 and 40.3; 36% fewer tokens than unregularised, still 55% more than H0), all six held-out splits up by 1.8 to 4.7, single runs within about one standard error, and the +14.1 placed as an evolve-set gain with a secondary policy from an earlier procedure. The old wording is quoted in `takeaway_note`. The Notion property needs the same edit.
- `extract_paper.py` now writes `--` for em-dashes and redacts emails (the saved extracts had neither). Header: "Reading: 23 min, plus 6 in closed details." from `reading.json`.

## Length judgement
| | Before (audit 2026-10-23) | After |
|---|---|---|
| The paper, core | 25.4 min (5,850 words) | 23.1 min (5,324) |
| The paper, closed | 0.5 min (104) | 5.5 min (1,265) |
| Replay tab | 3.9 min (907), 2 visuals | 3.9 min (898), 2 visuals |
| Tables; Further reading | 11.3; 3.3 min | unchanged |
| Visuals in Reading (audit) | 5 | 6 (the hero added) |

Why about 23 minutes is right: the top (about 300 words) went in and about 1,150 words of provenance, calibration, benchmark detail, per-decision examples, protocol arithmetic and adoption detail closed. What stays open is the problem, the seven rules in the paper's order with their equations, the results and ablations with their numbers, and an evidence section whose every point changes the reading (single runs, gains within noise, records that disagree with three printed numbers, runs that do not follow the method as written, kept edits inside their noise band). Shorter would mean closing evidence the verdict rests on.

## Knowledge ledger (`ledger.json`, labelled by `label_ledger.py`)
297 units: core 248, depth 45, owned 2, volatile 0, fat 2 (a sentence-splitter fragment and the old autoplay note). 287 drafted by `ledger.py init` from the page before the pass; 10 added. `ledger.py check`: problems 0.

## Checks (26 October 2026)
`checkpage.sh`: tabs 4, about 277 KB, fail=0, emdash 0, errbox 1, clipped 0. `check_page.mjs`: 1,228 actions, 0 problems (no frame before a click). `check_sim.mjs` PASS. `mk_coverage.py` 30 of 30.
