# Rust page, Part 2: Speeding up Python (part key `rb`)

Tabs `t-rb-read` (Reading), `t-rb-ladder` (Optimisation ladder), `t-rb-cross` (Crossing the boundary), all under `data-part="p2"`.

## How it is built
- `tpl/` holds the templates; `python3 gen.py` expands them into `../parts/` (files `12_tabs_rb.html` and `40`-`44_*`), inlining real code and recorded outputs:
  `[[rs:ANCHOR]]` (a region of `ext/src/lib.rs`), `[[file:PATH@a-b]]`, `[[out:NAME|label]]`, `[[predict:PATH|NAME]]`, and `[[data]]` in `40_js_rb_0data.js` (every JSON result plus the root's benchmark numbers from `../../../src/bench/results/`).
  Edit `tpl/`, never `../parts/40*`/`41*`-`44*` directly. Then `sh ../build.sh`.
- Numbers in the prose are filled at load time from `window.RB` (`data-rbv`, `data-rbr`, `data-rbdiff` attributes), so a re-run of the measurements updates the text. Paths into `phases` use `/` because phase names contain dots.

## Folders
- `ext/`: the extension crate `tokrs` (PyO3 0.29.3, numpy 0.29.0, rayon 1.12.0, serde_json), `tokrs.pyi` (hand-written stub), `tests/test_tokrs.py` (pytest, uses the root's committed `rosetta/data/chat.jsonl`).
- `code/`: the Python scripts whose outputs the page shows (`c1`-`c13`, `ladder.py`, `phases.py`), `alts/` (Cython, Numba, mypyc versions of the token loop), `gilused/` (a module that opts out of free-threading), `send_err/` (a deliberately non-compiling crate for the `Ungil` error).
- `outputs/`: every displayed output and measurement. `versions.txt`: toolchain versions, machine and load.
- `run_all.sh`: reproduces all of it (about 10 minutes; toolchains in the session scratchpad `pl/`, see the script header). The 200,000-line input is regenerated from the root's `rosetta/data/gen_chat.py --lines 200000 --seed 7` (same sha256 as the root's benchmark).
- `check_ui.mjs`: puppeteer check of every control of this part at 390 px dark and 920 px light.
- `coverage.json`: facts carried from the old "Rust: zero to expert" page (PyO3 parts) and the Python pages, with where they live now. `viz_ideas.md`: visualisations chosen and rejected.

## Notes and departures
- Measurements were taken while other agents were building pages on the same laptop (load average 10 to 18 on 10 cores); medians of 7 with min and max are shown, and the page says to read the second digit as noise. The abi3 cost comparison was the noisiest; the page shows it with that caveat.
- `tokrs` was not published to PyPI; the page shows the generated CI workflow and says what would publish it.
- The root's `src/bench/ext_rust` uses the deprecated `pyo3/extension-module` feature; this part notes it (harmless) rather than editing the root.
