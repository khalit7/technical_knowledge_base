# Source: Query planning and performance

Child page #4 of Topic: databases. Built 2026-10-04. `sh build.sh` writes `../index.html`.

## Layout
- `parts/`: 01_head (shared CSS, from the root), 10_header, 20_read_a..i + 20_read_z (Reading), 21_js_common (RD helpers from the root), 22_js_data.js (generated), 23/24 Reading visuals and the workflow animation, 30_js_cm_model.js (cost formulas, pure), 31 Cost model tab, 32 Plan reading lab, 39 Further reading, 99 tab wiring.
- `build_data.py`: inputs/*.json to parts/22_js_data.js.
- `costfm.py`, `check_costfm.py`: Python transcription of PostgreSQL 16.2's cost formulas; `recompute.py` checks Python and the page's JavaScript against EXPLAIN (150/150) and every prose number against the built page.
- `test_page.mjs`: clicks every control at 390 dark and 920 light (run from html_utils/).
- `lab/`: measurement scripts; `inputs/`: their outputs.

## Measurements (how to reproduce)
The database is an APFS clone of the root's generated data directory (src/plan/gen.py: 100k users, 1M chats, 10M messages), run on port 54361 so the root's copy is untouched. The pgserver wheel's PostgreSQL 16.2 binaries are copied to `$QPP_ROOT/pginstall` (plus its `.dylibs` to `$QPP_ROOT/.dylibs`) and four contrib/extension modules built against them with PGXS: pg_stat_statements, auto_explain, pageinspect (from the 16.2 source tarball) and pg_hint_plan REL16_1_6_1 (`make USE_PGXS=1 PG_CONFIG=... PG_SYSROOT=$(xcrun --show-sdk-path)`).
Run each script from the scratchpad with `QPP_ROOT=<dir> python3 lab/<script>.py` (app.py needs `uv run --no-project --python 3.12 --with 'psycopg[binary]'`):
1. `cost_model.py` (seq/index/bitmap costs and times; run before anything re-analyzes the tables), 2. `stats.py`, 3. `engine.py` (spills, parallel, timing, GEQO; its GEQO part runs a database-wide ANALYZE), 4. `generic.py` (creates usage_events), 5. `workload.py` (pgbench replay, creates then drops chats_title), 6. `app.py`, 7. `lab_plans.py`. Total under 15 minutes.
Machine: Apple M1 Pro, 16 GB, shared with other work, so timings are best of three and vary between runs.

## Departures from the method
Child-page shape (Part B). Two tabs instead of one because the cost calculator and the plan lab answer different questions (prices against reading). The root's Query plans cases are linked, not rebuilt.
