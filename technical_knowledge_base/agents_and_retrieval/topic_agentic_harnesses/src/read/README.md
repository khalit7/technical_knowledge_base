# Reading and Further reading tabs: notes

Owner files: `parts/20_read.html` (opens the t-read wrapper, CSS, nav, section 0), `parts/20_read_a.html` to `20_read_h.html` (sections 1 to 10, mistakes, interview questions), `parts/20_read_z.html` (footer, closes the wrapper), `parts/22_js_rd_data.js` (generated), `parts/23_js_rd_main.js`, `parts/39_tab_more.html`, and this folder.

## Pipeline
- `old/`: the old root and its five children, saved verbatim by script from the Notion fetch (read only).
- `extract_read.py`: builds `parts/22_js_rd_data.js` (window.AHREAD) from redacted recordings already in the repo: `trace/recordings/std_haiku_1` (the replay), `std_haiku_*` and `std_sonnet_*` (spread), `loop/recordings/s0_haiku` (one call), `s5_sonnet` and `cc_sonnet_fair` (harness vs Claude Code), `loop/gate_cases.json` (gate). No new model runs (0 of the 5 allowed claude invocations used).
- `check_read.py`: regenerates the data and proves the page embeds it; checks every hand-written measured number in the Reading parts against the recordings; scans for em-dashes and private strings.
- `coverage.md`: every old claim marked verified, corrected, unconfirmed or moved.
- `viz_ideas.md`: visuals built and rejected.

## Departures from the brief
- No recordings of its own: the Loop and Trace labs' recordings already cover the running example, and the budget override asked to build from them.
- Section 6 (products) is five questions rather than a list of products, because no product fact on the old pages was verified here; the Harness atlas owns dated product facts.
