# Reading and Further reading tabs: notes and scripts

Parts (since the 2026-10-24 rebuild): `../parts/20_read.html` (styles, nav, the top: core idea, hero, terms, running example), `20_read_a.html` (sections 1 and 2, the gang figure), `20_read_b` (3, job specs filled by `make_code.py`), `20_read_c` (4), `20_read_d` (5), `20_read_e` (6 to 8), `20_read_f` (9, closed mistakes and interview, 10 child cards), `20_read_z.html`, `26_js_rd_misc.js` (spec switcher), `39_tab_more.html`. The simulators that used to live here are in `../retired/parts/`; `recompute.py` still produces their numbers in `out/expected.json`, and `check_read.mjs` now checks the static derived numbers against it.

- `make_code.py`: fills the three job specs and their outputs in `20_read_b.html` from `../data/` (the setup's real files and scrubbed runs). Rerun after `../data` changes.
- `recompute.py` -> `out/expected.json`: every simulated or derived number (backfill schedules, Llama 3 MTBF scaling, Young intervals, checkpoint sizes, the checkpoint timeline).
- `check_read.mjs`: the page's numbers equal `expected.json`, prose spans included, and the reading time matches the word count. `check_ui.mjs`: every control at 390 px dark and 920 px light, no errors, NaN, undefined or sideways scroll. Run both from the repo root: `node <script> <index.html> [expected.json | shots dir]`.
- `sources.md`: every external fact with its source and date. `inputs/openai_k8s_7500_extract.txt`: the quoted passages of OpenAI's 2021 post.
- `todo.md`: numbers still to come from the labs. `coverage.md`: what to do when Notion is back. `viz_ideas.md`: visuals built and rejected.
