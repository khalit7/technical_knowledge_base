# Toolchain atlas (tab t-tools)

Parts: `parts/33_tab_tools.html` (markup and scoped CSS), `parts/33_js_0data.js` (generated data), `parts/33_js_atlas.js` (helpers, view switch, grid, cell detail, compare), `parts/33_js_walk.js` (walkthrough replay), `parts/33_js_time.js` (timeline, corrections). Element ids start with `ta-`.

## Data
- `build_data.py` writes `atlas.json` and `../parts/33_js_0data.js`. Run `python3 build_data.py` after editing any of:
  - `meta.py`: languages, the 15 jobs, notes, the standards and releases timeline (every item has a URL).
  - `cells_a.py`, `cells_b.py`, `cells_c.py`: one cell per job and language. A tool's version is a key (`pypi:ruff`, `crate:pyo3`, `npm:typescript`, `gh:owner/repo`, or `x:` for `versions_extra.json`) resolved from the fetched registry records, or an explicit `{version, date, url}` for facts with no registry (compilers, CPython, Node lines).
  - `walks.py`: walkthroughs and the "seen it run" outputs, cut by command from the transcripts in `walk/`.
  - `corrections.md`: the old-page claims checked; parsed into the page.
- `research/fetch_versions.py`, `fetch_timeline.py` (registries and release feeds; run on 2026-10-05, outputs `versions_raw.json`, `timeline_raw.json`), `fetch_pages.py` (saves official pages as text for reading; the pages themselves are not committed). `versions_extra.json` holds the few records fetched afterwards (black, conda, pixi, uv-build, clang-format, clang-tidy, cibuildwheel, samply, emsdk, rust-analyzer).

## Walkthroughs (real runs, 2026-10-05)
`walk/walk_py.sh`, `walk_cpp.sh`, `walk_rs.sh`, `walk_ts.sh` + `walk_ts_fix.sh`, `walk_extra.sh` (Bun init; ty, mypy and pyright on one bug), `walk_miri.sh` (borrow checker, raw pointer, Miri), `walk_pyo3.sh` (maturin + PyO3), `uaf.cpp` and `overflow.cpp` (sanitizers). They source a scratch `env.sh` that pointed RUSTUP_HOME, CARGO_HOME, uv's Python, cache and tool folders, and npm's cache into a scratch folder, and use `rec.sh` to record `$ command`, output and exit code. The recorded transcripts are `walk/*.txt`, with scratch paths shown as `~/demo` or `~/pl` and the git author in `pyproject.toml` replaced by `you@example.com`.

Versions used: uv 0.12.23, CPython 3.14.8, Apple clang 14.0.0 (and Command Line Tools' Apple clang 17.0.0 for the ASan retry), CMake 4.4.4, Ninja 1.13.2, clang-format 23.1.2, rustup 1.29.1, Rust 1.99.0, nightly rustc 1.101.0-nightly (2026-10-04) with Miri, maturin 1.15.0, PyO3 0.29, Node 22.22.2, npm 10.9.7, TypeScript 7.0.2, Vitest 5.0.3, Bun 1.4.2, ty 0.0.84, mypy 2.4.0, pyright 1.1.414.

Limitation measured: AddressSanitizer did not run on this Mac (macOS 27) with either Apple clang; UBSan did. No ASan output is shown.

## Checks
`node ta_check.mjs` (kept in the session scratchpad) clicks every cell, chip, select, walkthrough step, timeline mark and verdict filter at 390 px dark and 920 px light and fails on errors, NaN, undefined, sideways scroll or overflow.

## Departures from the topic method
None in shape: this is a "data tab that compares everything" (Part A). The walkthrough replay is the tab's before/after animation (empty folder to working project, per command).
