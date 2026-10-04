# src: Production eval engineering

Build: `sh build.sh` writes `../index.html` (parts in `parts/`, data injected from `inputs/gate_data.json` as `window.PE`).

| File | What it is |
|---|---|
| `live.md` | The old Notion page, verbatim (saved by `save_live.py` from the session transcript, fetched 2026-10-04) |
| `coverage.json`, `mk_coverage.py` | Every old fact and where it is now, or which sibling owns it (55 facts: 37 here, 18 moved) |
| `handoff_statistics.md`, `handoff_human_eval.md` | The old statistics and gold-label sections verbatim, with corrections, for Eval statistics and Human evaluation and annotation |
| `make_data.py` | Builds `inputs/gate_data.json` from LMSYS's released MT-Bench files (URLs in the docstring; raw files not committed). `uv run --with tiktoken python3 make_data.py RAW` |
| `recompute.py`, `recompute.json` | Independent recomputation (scipy t quantiles) of every number the JS shows; `uv run --with scipy python3 recompute.py` |
| `check_core.mjs` | Runs `parts/21_js_common.js` in node and compares with `recompute.json` (51 checks) |
| `check_page.mjs` | Puppeteer: every control at 390 px dark and 920 px light, animation steps in both modes, screenshots to `../.shots/` |
| `inputs/` | `gate_data.json` (38 KB), 2023 price extracts, `writeups/` (21 team write-ups) and `methods/` (29 primary-source extracts), all fetched 2026-10-04 |
| `viz_ideas.md` | Visual ideas built and rejected |

Shape: Part B of `html_utils/methods/topic_pages.md` (Reading in the pipeline's own order, one tab per standalone visual, Further reading). One departure: a Case file tab of dated team write-ups, because the subject's evidence is mostly practitioner reports rather than papers, and placing them on the promotion path shows which stage caught or missed each problem.

Parts: `20_read_a` (one screen), `20_read_b` (animation section), `20_read_c` (golden sets, gates in CI), `20_read_d` (budgets, online, shadow, A/B, monitoring, eval-driven development), `20_read_e` (moved, mistakes); `21_js_common.js` (decoding, paired statistics, gate rule), `22_js_gate_anim.js`, `23_js_frontier.js`; `31_*` Gate designer; `32_*` Case file; `39_tab_more.html`; `99_js_tabs.js` last.
