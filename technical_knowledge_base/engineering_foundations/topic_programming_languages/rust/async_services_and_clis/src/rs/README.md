# rs: the recorded sources of this page

Copied with `cp -R` from the Rust page's `src/rs/` (Part 3, left unchanged there) on 2026-10-26, then trimmed for this page.
`tpl/20_read_*.html` are the Reading templates; `python3 src/rs/gen.py` expands them into `../parts/` (inlining code from `code/`, recordings from `out/`, benchmark numbers from `bench/results/`) and writes `../parts/22_js_rs_0data.js` (the tokio trace, both benchmark experiments, the CLI sessions); then `sh src/build.sh`.

- `code/tok/`: the cargo project (library + `tokcount` CLI + `tokserve` axum service, examples, tests, Dockerfiles). `code/errs/`: compile-error cases. `code/cmp/`: the Python and Node comparison programs (their recordings stay in `out/` but are no longer shown). `code/py/app.py`: the FastAPI twin.
- `run_all.sh [cli|async|errs|svc|test|pkg|cross|bench]`: reproduces every displayed output into `out/` (bench into `bench/results/`). `code/env.sh` points to the session toolchains (override with `PL=`). It walks up to `topic_programming_languages` for the root's shared `src/rosetta/` data (read-only) and runs the Python concurrency child's `src/pa/code/a2_trace.py` and `a3_fanout.py` for the comparison recordings.
- `bench/bench.py`: Experiment A (closed and open loop, 4 configs, 3 rounds) and B (blocking the runtime). B needs `DATA_BIG` = the root's generator with `--lines 20000 --seed 7` (3,871,866 bytes, sha256 294f68ac...5c631).
- Checks: `python3 src/rs/check_outputs.py` (the page embeds every referenced recording, the trace and every benchmark run); `node src/check_controls.mjs` replaced the old `check_ui.mjs` (which drove the language page's two-level tabs).
- `sources.md`: facts checked 2026-10-05; `coverage.json`: the old Notion page's facts (kept as copied); `versions.txt`.

Not done: the Docker images were not built (daemon not running); image sizes are registry base sizes plus measured binaries.
