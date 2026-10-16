# Reading and Further reading tabs: notes and scripts

Parts: `../parts/20_read.html` (styles, nav, section 0), `20_read_a.html` to `20_read_f.html` (sections 1 to 9, mistakes, interview, child pages), `20_read_z.html` (closes the tab), `22_js_rd_cluster.js` (anatomy schematic), `23_js_rd_bf.js` (FIFO against backfill), `24_js_rd_rz.js` (rendezvous), `25_js_rd_ck.js` (checkpoint timeline, MTBF calculator), `26_js_rd_misc.js` (predict questions, spec switcher, reading time), `39_tab_more.html` (Further reading).

- `make_code.py`: fills the three job specs and their outputs in `20_read_b.html` from `../data/` (the setup's real files and scrubbed runs). Rerun after `../data` changes.
- `recompute.py` -> `out/expected.json`: every simulated or derived number (backfill schedules, Llama 3 MTBF scaling, Young intervals, checkpoint sizes, the checkpoint timeline).
- `check_read.mjs`: the page's numbers equal `expected.json`, prose spans included, and the reading time matches the word count. `check_ui.mjs`: every control at 390 px dark and 920 px light, no errors, NaN, undefined or sideways scroll. Run both from the repo root: `node <script> <index.html> [expected.json | shots dir]`.
- `sources.md`: every external fact with its source and date. `inputs/openai_k8s_7500_extract.txt`: the quoted passages of OpenAI's 2021 post.
- `todo.md`: numbers still to come from the labs. `coverage.md`: what to do when Notion is back. `viz_ideas.md`: visuals built and rejected.
