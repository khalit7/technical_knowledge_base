# SoL-Pi: page source

`sh build.sh` writes `../index.html`, the whole body of the Notion row page (https://app.notion.com/p/3e25c17b0d0d81a0bb77f16cbc898bb5, a row of the Papers database; its properties Paper, Takeaway, Topics and Year stay in Notion). The page has no child pages, databases or video. Built from `html_utils/methods/papers.md`, starting from the Dream-RSI page's copy of the reference pieces (`build.sh`, `mk_paper.py`, `11_js_ui.js`, `10_js_common.js`, `check_page.mjs`, `mk_coverage.py` with its item list replaced by this paper's, the CSS).

## Tabs

| Tab | id | What it holds |
|---|---|---|
| The paper | `t-read` | Card (takeaway, three headline numbers, verdict), Problem, Idea (loop diagram), The search (152 directions, families, orchestration, 535 environments, humans' role), the four mechanisms (predict question: cache writes), EdgeBench (cost against score, both models), Tokens vs dollars (predict question with the token and dollar decomposition at recovered Opus 5 prices; predict question on the hourly figure with the derivation table), Terminal-Bench 4, IMO 2026 and the swarm, each mechanism (Table 4, Figures 6 and 7), Action Fusion's lineage (Figure 8), How much to believe, What it takes to use this, Why it matters, Connections. |
| Replay a session | `t-run` | The live ingredient: one illustrative session replayed under Pi and each mechanism with the released constants, as a step animation over plan steps (prompt size of every request, cache read against cache write, Pi's profile dashed for comparison, counters), a totals table beside the paper's measured changes, and an explorer of Online Context Compact's gate (the released `decideCompaction`, ported). |
| The paper's tables and figures, rebuilt | `t-tables` | Tables 1, 2, 4 (model toggle, printed values or change against Pi, sort), Table 3 and the swarm, Figures 6 and 7 from the PDF's printed labels, Figure 8, and all 45 checks of `recompute.py` with a filter. |
| Further reading | `t-more` | Generated from `paper.json`. |

## Departures from papers.md (and why)

- **Live ingredient is a simulator of the mechanisms, not a trace replay.** papers.md suggests a trace replay for agent and harness papers, but no trajectories are released. The mechanisms themselves are released code with small, explicit rules, so the tab runs those rules (and the compaction gate, ported line for line and checked identical to the TypeScript on 50,000 random inputs by `check_occ.mjs`) on one generated session, labelled illustrative. It shows what each mechanism does to the per-request prompt and the cache, and one effect the paper does not discuss: with a 200K window, Pi's own emergency compaction already removes old large results, so ObservationPack or the reducer alone can save little or cost more.
- **Prices recovered from the table rather than looked up.** The Opus 5 dollar column fits $5 / $0.50 / $6.25 / $25 per million (input, cache read, cache write, output) with residuals under $3, so the simulator and the Reading tab's decomposition use those. The GPT-5.6 Sol column fits no fixed price list; the page says so and does not price GPT-5.6 Sol.
- **Figures from the PDF's printed labels.** The arXiv HTML has no images for Figures 5 to 8; `decode_figs.py` reads the printed bar and point labels from the PDF (no curve reading) and asserts their layout.
- **No Then and now.** A 2026 harness paper; "What it takes to use this" covers adoption.
- **Reading tab is long (about 24 minutes against the old 5).** The old page was an abstract-level summary; this one owns the method, the search, the four mechanisms with the code's constants and an evidence section that changes the reading (parity, held-out set, hourly derivation, Terminal-Bench 4).
- **Only arXiv v1 exists**, so one anchor set (`inputs/anchors_v1.txt`); `build.sh` fails on any anchor not in it.

## Files

- `save_live.py`: copied the Notion fetch verbatim from the agent transcript into `live.md`.
- `extract_paper.py`: arXiv HTML v1 to `inputs/paper_v1.txt`, `tables_v1.txt`, `anchors_v1.txt`.
- `decode_figs.py`: printed labels of Figures 6, 7 and 8 from the PDF to `inputs/figs.json` (needs `uv run --with pymupdf` and the PDF in scratch space; the PDF is not kept).
- `fetch_extracts.py`: short verbatim extracts of the blog, the README, the EdgeBench README and a summary of the Z.ai post to `inputs/extracts.txt`.
- `inputs/economics.ts`: the released Online Context Compact gate (MIT), copied 3 October 2026, used by `check_occ.mjs`.
- `mk_tables.py`: `tables.json` (Tables 1 to 4, Table 3, swarm, figure labels), each number asserted against the extracted table text.
- `recompute.py`: 45 checks to `inputs/recompute.json` (38 reproduce, 1 within rounding, 2 do not, 4 added numbers; categories paper, blog, derived, added).
- `check_occ.mjs`: the page's port (`parts/14_js_occ.js`) against the original TypeScript, to `inputs/check_occ.json` (run by `build.sh`; needs Node 22 with `--experimental-strip-types`).
- `parts/15_js_sim.js`: the session simulator (plain JS, also loadable by Node).
- `mk_paper.py`, `paper.json`: card, Further reading, `window.PAPER`.
- `mk_coverage.py` writes `coverage.json` (35 items, this paper's own, verified against the built page).
- `check_page.mjs` (run from the repo root with node): every control in both themes and widths, the animation stepped in every mode, text at least 11 px.

## Checks (3 October 2026)

`checkpage.sh` fail=0 (emdash 0, errbox 1, clipped 0); `check_page.mjs` 0 problems; `check_occ.mjs` PASS (50,000 of 50,000 identical); `recompute.py` 38 reproduce, 1 within rounding, 2 do not; `mk_coverage.py` 35 of 35.
