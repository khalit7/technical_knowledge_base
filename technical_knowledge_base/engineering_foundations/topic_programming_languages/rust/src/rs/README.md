# Rust page, Part 3 (rs): Services and CLIs

Owner files: `parts/13_tabs_rs.html`, `parts/5*_rs*` (50 Reading split a..z, 51 Async replay, 52 Service benchmark, 53 CLI replay, 54 data, 55..59 JS).
`tpl/*.html` are the templates; `python3 src/rs/gen.py` writes the parts (and `54_js_rs_data.js`), then `sh src/build.sh`.

- `code/tok/`: the cargo project (library + `tokcount` CLI + `tokserve` axum service, examples, tests, Dockerfiles). `code/errs/`: compile-error cases. `code/cmp/`: Python and Node comparisons. `code/py/app.py`: the FastAPI twin.
- `run_all.sh [cli|async|errs|svc|test|pkg|cross|bench]`: reproduces every displayed output into `out/` (bench into `bench/results/`). `code/env.sh` points to the session toolchains (override with `PL=`).
- `bench/bench.py`: Experiment A (closed and open loop, 4 configs, 3 rounds) and B (blocking the runtime). Experiment B needs `DATA_BIG` = the root's generator with `--lines 20000 --seed 7` (3,871,866 bytes, sha256 294f68ac...5c631).
- Checks: `node src/rs/check_ui.mjs` (every control at 390 dark and 920 light), `python3 src/rs/check_outputs.py` (page embeds the recordings).
- `sources.md`: facts checked 2026-10-05; `coverage.json`: old-page facts carried; `versions.txt`.

Not done: the Docker images were not built (daemon not running); image sizes are registry base sizes plus measured binaries.
