# Flattening Every Memory Peak in Long-Context MoE Training: page source

`sh build.sh` writes `../index.html`, the whole body of the Notion row page (https://app.notion.com/p/3e95c17b0d0d8148a1f3d412918234fc, a row of the Papers database listed as "Bounding the memory bottlenecks of large mixture-of-experts training"; its properties Paper, Takeaway, Topics and Year stay in Notion). The row has no child pages, databases or video. Built on the paper-page method (`html_utils/methods/papers.md`) from the Attention Is All You Need reference pieces (via the ZeRO page's copies).

## Tabs

| Tab | id | What it holds |
|---|---|---|
| The paper | `t-read` | Headline card; "This row, corrected"; Problem; The four live sets (Table 1, "Which peak runs out first?" calculator); PipelinedLLEP (Eq. 1, chunk-membership predict with the in-browser replay against Table 8); Ring-DTP (three-scalar predict with a live fold); SCO (predict with Table 3 bars); OffloadStreamAdamW; Composition (Eq. 6); Results (Figures 6 and 7 from printed labels); Related work and limits; How much of this to believe; What it takes to use this; Why it matters; Connections. |
| Run the four schedules | `t-run` | The live ingredient: four before/after animations, one per operator (`dsx`, `rgx`, `scx`, `osx`). |
| The paper's tables, rebuilt | `t-tables` | Figure 2 from Table 6; token budget and latency-mode details (Figure 8, Table 7, B.5); ten tables, sortable, Table 8 with the replay's columns; 57 checks with verdicts; every printed label of Figures 6 and 7. |
| Further reading | `t-more` | Generated from `paper.json`. |

**Departures from papers.md.**
- The live ingredient is the systems kind, but four of them, because the paper is four operators on four different live sets; one animation would have covered one quarter of it. Two compute for real (the dispatch replay on the paper's own routing profiles through LLEP's released plan, which reproduces Table 8 exactly; Ring-DTP's exact loss on real numbers); two are timelines built from measured sizes and times, and the optimizer one is labelled illustrative because bucket times are not printed.
- No trained toy: the operators change no arithmetic, so a toy trained with and without them would be identical by construction.
- No Then and now tab: a September 2026 paper with no code; "What it takes to use this" covers adoption.
- Figures 6 and 7 are PNGs whose baseline curves print no values; only printed labels are used (`inputs/fig_labels.txt`), never points read off a curve.
- The card's title is the arXiv title; a line under it gives the database's different title.
- The Reading tab is about 23 minutes against the old row's 3: the old row was a three-paragraph summary of a newsletter abstract, and this page owns four mechanisms and the evidence for each. Token-budget and latency-mode details moved to the tables tab to keep it there.

## Files

- `build.sh`: runs `mk_tables.py`, `sim_dispatch.py`, `recompute.py`, `mk_paper.py`, assembles `parts/`, expands the link macros, fails on an unexpanded macro or an em-dash, prints reading time and size.
- `paper.json`: metadata, headline numbers, resources, connected KB papers and topics, verdict. `mk_paper.py`: card, Further reading, `window.PAPER` (adds a `code.label` and a `notion_title` line to the reference version, and maps appendix anchors `A2.T8` to table names).
- `mk_tables.py`: `tables.json` (Tables 2, 3 + 12, 4 + 14, 6 to 11, 13), every cell verified against `inputs/table_*.txt`.
- `sim_dispatch.py`: the dispatch replay (B.2 routing profiles, a port of `compute_llep_lpt_plan` and `llep_lpt_plan_to_compute_ranks` from github.com/SalesforceAIResearch/LeastLoadedEP, chunk membership, send ratios) at capacity factors 1.0 and 1.1; writes `inputs/sim_dispatch.json`. `parts/12b_js_route.js` is the same algorithm in the page, checked to give identical ratios.
- `recompute.py`: 57 checks (40 reproduce, 13 derived, 4 do not reproduce); writes `inputs/recompute.json`.
- `save_live.py` copied the Notion fetch verbatim into `live.md`; `extract_paper.py` turned the arXiv HTML v1 into `inputs/paper_v1.txt` and `inputs/table_*.txt`. `inputs/` also holds the gpt-oss-20b config, a Kimi K2 config extract, related abstracts (LLEP, MoP, Cut Cross-Entropy, ZeRO-Offload), `fig_labels.txt` and `other_sources.txt` (H200 specs, DeepSeek-V3 context extension, code search).
- `check_page.mjs` (from the repo root with node): every control in light 920 and dark 390, all four animations stepped through every mode (and every dispatch profile), text at least 11 px, no NaN or errors, no sideways scroll, element shots of every inline chart into `../.shots/`. Launches Chrome with `headless: 'shell'`.
- `mk_coverage.py`: writes and verifies `coverage.json` against `live.md` (18 of 18).

## Parts

HTML: `00_top`, `01_css` (ZeRO page CSS plus a few additions), `02_header`, `03a` to `03d_paper`, `04_run`, `05_tables`, generated `_gen_card`, `_gen_more`. JS: `10_js_common`, `_gen_data`, `11_js_ui` (reference, unchanged), `12_js_model` (the four live sets as formulas), `12b_js_route` (dispatch replay), `13_js_read`, `14_js_dsx`, `15_js_rgx` (`window.__ringCheck()` returns the max loss difference against dense), `16_js_scx`, `17_js_osx` (`window.__osaCheck()` returns the three stream totals), `18_js_tables`, `90_js_tabs`.

## Checks (3 October 2026)

`sh html_utils/checkpage.sh <folder>`: fail=0, emdash 0, errbox 1, clipped 0, 4 tabs, about 171 KB. `node .../src/check_page.mjs`: 0 problems over 668 actions. `__ringCheck()`: 0 and 8.9e-16. `mk_coverage.py`: 18 of 18.
