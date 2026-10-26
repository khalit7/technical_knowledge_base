# `rb`: sources and measurements of "Rust: speeding up Python with PyO3 and maturin"

Copied with `cp -R` on 2026-10-26 from the Rust language page's `src/rb/` (Part 2 there, left unchanged). The page has one Reading tab (`t-read`) and Further reading (`t-more`, hand-written in `../parts/39_tab_more.html`).

## How it is built
- `tpl/` holds the templates; `python3 gen.py` expands them into `../parts/` (files `20_read_a.html` to `20_read_h.html` and `40`-`44_*.js`), inlining real code and recorded outputs:
  `[[rs:ANCHOR]]` (a region of `ext/src/lib.rs`), `[[file:PATH@a-b]]`, `[[out:NAME|label]]`, `[[predict:PATH|NAME]]`, and `[[data]]` in `40_js_rb_0data.js` (every JSON result plus the root's benchmark numbers from `topic_programming_languages/src/bench/results/`, found by walking up from this folder).
  Edit `tpl/`, never the generated `../parts/20_read_*` or `../parts/40*`-`44*` directly. Then `sh ../build.sh`.
- Numbers in the prose are filled at load time from `window.RB` (`data-rbv`, `data-rbr`, `data-rbdiff` attributes), so a re-run of the measurements updates the text. Paths into `phases` use `/` because phase names contain dots.

## Folders
- `ext/`: the extension crate `tokrs` (PyO3 0.29.3, numpy 0.29.0, rayon 1.12.0, serde_json), `tokrs.pyi` (hand-written stub), `tests/test_tokrs.py` (pytest, uses the root's committed `rosetta/data/chat.jsonl`).
- `code/`: the Python scripts whose outputs the page shows (`c1`-`c13`, `ladder.py`, `phases.py`), `alts/` (Cython, Numba, mypyc versions of the token loop), `gilused/` (a module that opts out of free-threading), `send_err/` (a deliberately non-compiling crate for the `Ungil` error).
- `outputs/`: every displayed output and measurement. `versions.txt`: toolchain versions, machine and load.
- `run_all.sh`: reproduces all of it (about 10 minutes; toolchains in the session scratchpad `pl/`, see the script header). The 200,000-line input is regenerated from the root's `rosetta/data/gen_chat.py --lines 200000 --seed 7` (same sha256 as the root's benchmark).
- `check_ui.mjs`: puppeteer check of every control on the page at 390 px dark (reduced motion) and 920 px light, and that nothing autoplays; `OUT=<dir>` saves element screenshots. `check_outputs.py`: the page embeds exactly the recorded outputs and data.
- `coverage.json`: facts carried from the old "Rust: zero to expert" page (PyO3 parts) and the Python pages, with where they lived on the language page (section numbers still match this page up to 12; old 13 "who ships" is now a closed block in 13, old 14 is 13, old 15 and 16 were folded into the sections and Further reading). Visualisations: `../viz_ideas.md`.

## Notes and departures
- Measurements were taken while other agents were building pages on the same laptop (load average 10 to 18 on 10 cores); medians of 7 with min and max are shown, and the page says to read the second digit as noise. The abi3 cost comparison was the noisiest; the page shows it with that caveat.
- `tokrs` was not published to PyPI; the page shows the generated CI workflow and says what would publish it.
- The root's `src/bench/ext_rust` uses the deprecated `pyo3/extension-module` feature; this part notes it (harmless) rather than editing the root.
