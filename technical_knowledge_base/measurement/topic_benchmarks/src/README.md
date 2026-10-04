Source of the interactive HTML on the Notion page "Topic: benchmarks".

Build: `sh build.sh` writes `../index.html` from `parts/`.

Shape (agreed with Khalid 2026-10-04): an intuitive root of about 15 to 20 minutes (the rule recorded in html_utils/methods/topic_pages.md Part A). The Reading tab combines both spines Khalid chose: how to read a benchmark number (lifecycle, then what a number leaves out: version, split, harness, sampling, answer key, contamination, index version, each with one real case) and the families in brief, each linking its child. "Benchmark methodology" is folded into the root. Tabs: Benchmark atlas (t-atlas), Saturation timeline (t-sat), Same model, many numbers (t-same), Further reading.

Part ownership (parallel build): `20_read*`, `2x_js_*`, `39_tab_more*` Reading and Further reading (ids `rd-`); `32_*` atlas (`at-`); `33_*` saturation (`sa-`); `34_*` same model (`sm-`). CSS scoped under each tab id.

## Reading tab and Further reading

About 19 minutes (4,340 words at 230 wpm), on Khalid's two spines (2026-10-04). Outline: one screen (three questions); the life of a benchmark (stages, then/now animation MMLU against Terminal-Bench-Science 0.1, replacement, aggregators); what a number leaves out (protocol tuple, then version, split, harness with who-ran-it, retrieval and cost, sampling with the error-bar widget, answer key, contamination, index version, subject); gaming; the ten families, each with a Go deeper note (three children exist, the rest "child page planned"); how to read the landscape; common mistakes. "Benchmark methodology" is folded in; its depth is kept in `for_children/methodology_depth.md`.

Files: `parts/20_read.html` (CSS, one screen, life), `20_read_b.html` (what a number leaves out, gaming), `20_read_c.html` (families), `20_read_d.html` (checklist, mistakes, closes the tab div); JS `21_js_rd_common.js` (animation controller, from Topic: rl), `22_js_rd_life.js`, `23_js_rd_err.js`; `39_tab_more.html`. Checks: `python3 read/recompute.py && node read/check_read.mjs` (numbers in the JS against recompute, every control at 390 dark and 920 light). Coverage: `coverage.md` (old root, `live.md`), `coverage_methodology.md` (`live_methodology.md`). Visual ideas: `read/viz_ideas.md`.
