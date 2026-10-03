# NeoHorse-1: page source

`sh build.sh` writes `../index.html`, the whole body of the Notion row page (https://app.notion.com/p/3db5c17b0d0d81e3b105e033a359ad24, a row of the Papers database; its properties Paper, Takeaway, Topics and Year stay in Notion). The page has no child pages, databases or video. Built from `html_utils/methods/papers.md`, starting from the HarnessDev page's copy of the reference pieces (`build.sh`, `mk_paper.py`, `check_page.mjs`, `svgparse.py`, the CSS and `10_js_common.js`, `11_js_ui.js`, `90_js_tabs.js`).

## Tabs

| Tab | id | What it holds |
|---|---|---|
| The paper | `t-read` | Card with verdict; Problem; Idea (the loop against curate-once, animated); Data from the routing harness (granularities, loss-mask widget, quality gates, Scene/Goal/Outcome); Routing signals and allocation; Training (Eq. 1, Eq. 2 widget, Eq. 3 with a predict question and live KL demo); Results (gains chart with error bars, predict question on 4B against base 9B, item-count error table); Traces (§5.1 and Appendix B); Data experiments (predict question with Figure 7 decoded against the base); How much to believe; What it takes to use this; Why it matters; Connections. |
| Schedule the curriculum | `t-run` | The live ingredient: the three-stage routing curriculum animated against shuffled SFT, with traffic, router-confidence and reserve controls; the coarsened OPD loss lab. |
| The paper's tables and figures, rebuilt | `t-tables` | Tables 1 and 2 (track, scores or minus base, sort); Table 3 with the base, Figure 7's decoded runs and the released model added; benchmark sizes read from the scores; all 45 checks. |
| Further reading | `t-more` | Generated from `paper.json`. |

## Departures from papers.md (and why)

- **No toy model, no trace replay.** A training-recipe paper on private traffic with no code, data or released traces; a toy curriculum experiment would show whatever its design decides, not what happens at 4B. The live ingredient instead runs the method's two specified mechanisms on illustrative inputs (the Eq. 2 three-stage schedule, the Eq. 3 coarsened KL), and the page says next to it that it cannot show whether the ordering helps, because the paper never tests that.
- **The quantitative work is on the paper's own numbers:** benchmark sizes recovered from score granularity give the error bars the paper omits, and Figure 7 decoded from its vector SVG shows Table 3's harness run is one of its points and puts the base model beside the data experiments.
- **No Then and now.** A September 2026 result; "What it takes to use this" covers adoption.
- **Reading tab is long (about 27 minutes against the old 5).** The old page was written from the abstract; this one owns the method's details (gates, routing fields, both losses), the appendix cases and an evidence section that changes the reading.

## Files

- `build.sh`: runs `mk_tables.py`, `recompute.py`, `mk_paper.py`, assembles `parts/`, expands the link macros, fails on an em-dash or unexpanded macro.
- `save_live.py`: copied the Notion fetch verbatim from the session transcript into `live.md`.
- `extract_paper.py`: arXiv HTML v1 to `inputs/paper_v1.txt`, `inputs/tables_v1.txt`, `inputs/anchors.txt`.
- `decode_figs.py` (with `svgparse.py`): Figure 7's six runs and Figure 1's labels from the vector SVGs to `inputs/figs.json`.
- `fetch_release.py`: dated release facts (GitHub, Hugging Face models and paper upvotes) to `inputs/release.json`. `inputs/github_readme.md` and `inputs/hf_card_4b.md` are the README and model card as fetched on 2026-10-03.
- `mk_tables.py`: `tables.json` (Tables 1 to 3, asserted against the extract; Figure 7).
- `recompute.py`: 45 checks and every derived number, to `inputs/recompute.json`.
- `mk_paper.py`, `paper.json`: card, Further reading, `window.PAPER`.
- `mk_coverage.py` writes `coverage.json` (35 items, this paper's own, verified against the built page).
- `check_page.mjs` (run from the repo root with node): every control in both themes and widths, both animations stepped.

## Checks (3 October 2026)

`checkpage.sh` fail=0 (emdash 0, errbox 1, clipped 0); `check_page.mjs` 0 problems; `recompute.py` 45 of 45; `mk_coverage.py` 35 of 35.
