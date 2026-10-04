# Case files tab (t-cases)

33 published architectures and outages, each mapped to the building blocks of the Reading spine.

- `inputs/extracts_*.json`: per case, the source, URL, published and event dates, access date, and short verbatim quotes. `inputs/verify_log.txt`: the last word-for-word check.
- `annot_a.py`, `annot_b.py`, `annot_c.py`: the cards in plain words (system, what happened, what changed, lesson, numbers, terms).
- `build_cases.py`: joins the two into `cases.json` and `../parts/33_js_cases_0data.js` (do not edit that file by hand). Fails if a quoted number is not in a quote of its case.
- `verify_extracts.py <folder>`: checks every quote against the downloaded source texts (kept in scratch, not committed; re-download from the URLs to re-run).
- `recompute.py`: derived numbers and the flagship animation's model; writes `recompute_out.json`.
- `check_cases.mjs`: puppeteer run over every control at 390 px dark and 920 px light, and JS model against `recompute_out.json`.

To add a case: add its extract, verify it, add its card to an `annot_*.py`, run `python3 build_cases.py`, then `sh ../build.sh`.
Parts owned by this tab: `parts/33_tab_cases.html`, `parts/33_js_cases_0data.js`, `parts/33_js_cases_anim.js`, `parts/33_js_cases_main.js`.
