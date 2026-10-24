# Source: Query planning and performance

Child page #4 of Topic: databases. Built 2026-10-04. `sh build.sh` writes `../index.html`.

## Layout (rebuilt 2026-10-24 to the teaching contract)
- `parts/`: 01_head (shared CSS, from the root), 10_header (title, subtitle with the measured reading time, tabs: Reading, Plan reading lab, Further reading), `20_read_a` (styles, nav, the idea in one screen: core sentence, hero, you need, new terms, closed one-screen table; section 1) to `20_read_i` (sections 10, 11, in production, the closed learned-optimizers block), `20_read_z` (closes the tab).
- JS: `21_js_rd_common.js` and `99_js_tabs.js` are the explainer-page skill templates (never autoplay; storage key `qpp-tab`); `22_js_cm_model.js` (cost formulas, pure; was 30_js_cm_model.js); `22_js_data.js` (generated, `window.QPD`); `22_js_rd_figs.js` (`window.QPG`: SVG text, boxes, arrows, horizontal bars at the measured width); `23_js_rd_a.js` (MCV and histogram, target table, extended-statistics table, the misestimate dumbbell, GEQO chart, log lines, N+1 and batching bars, spill bars, parallel curve, generic-plan sequence); `23_js_rd_cm_ui.js` (the cost calculator, now inline in section 2; was the Cost model tab's 31_js_cm_ui.js); `24_js_rd_wf.js` (the workflow stepper, section 7); `25_js_rd_figs2.js` (hero, join algorithms, bottom-up plan walk, pagination, connections); `32_tab_lab.html`, `32_js_lab.js` (Plan reading lab); `39_tab_more.html`.
- `build_data.py`: inputs/*.json to parts/22_js_data.js. `import_inputs.py`: copies the three measurements this page now owns from the pages that recorded them (joins from the root's `src/plan/inputs/c4.json`, pagination from Building a backend API's `src/inputs/pagination_pg.json`, connections from Running Postgres in production's `src/inputs/connections.json`) into `inputs/joins.json`, `inputs/pagination.json`, `inputs/pooling.json`; run once, outputs committed.
- `costfm.py`, `check_costfm.py`: Python transcription of PostgreSQL 16.2's cost formulas; `recompute.py` checks Python and the page's JavaScript against EXPLAIN (150/150) and every prose number against the built page, including the copied join, pagination and connection numbers.
- `test_page.mjs`: clicks every control at 390 dark and 920 light, checks that neither stepper moves before the reader acts (also after a mode switch), screenshots the figures (run from html_utils/).
- `lab/`: measurement scripts; `inputs/`: their outputs. `ledger.json`: the knowledge ledger. `coverage.json`: the 2026-10-04 migration coverage (historical).

## Measurements (how to reproduce)
The database is an APFS clone of the root's generated data directory (src/plan/gen.py: 100k users, 1M chats, 10M messages), run on port 54361 so the root's copy is untouched. The pgserver wheel's PostgreSQL 16.2 binaries are copied to `$QPP_ROOT/pginstall` (plus its `.dylibs` to `$QPP_ROOT/.dylibs`) and four contrib/extension modules built against them with PGXS: pg_stat_statements, auto_explain, pageinspect (from the 16.2 source tarball) and pg_hint_plan REL16_1_6_1 (`make USE_PGXS=1 PG_CONFIG=... PG_SYSROOT=$(xcrun --show-sdk-path)`).
Run each script from the scratchpad with `QPP_ROOT=<dir> python3 lab/<script>.py` (app.py needs `uv run --no-project --python 3.12 --with 'psycopg[binary]'`):
1. `cost_model.py` (seq/index/bitmap costs and times; run before anything re-analyzes the tables), 2. `stats.py`, 3. `engine.py` (spills, parallel, timing, GEQO; its GEQO part runs a database-wide ANALYZE), 4. `generic.py` (creates usage_events), 5. `workload.py` (pgbench replay, creates then drops chats_title), 6. `app.py`, 7. `lab_plans.py`. Total under 15 minutes.
Machine: Apple M1 Pro, 16 GB, shared with other work, so timings are best of three and vary between runs.

## Departures from the method
Child-page shape. One tab beyond Reading: the Plan reading lab is practice used by sections 4, 6, 8 and 10. The Cost model tab became the inline figure of section 2 (it explains one mechanism). The root's Query plans cases are linked, except case 4 (join algorithms), whose measurements this page now owns and draws.

## The 2026-10-24 rebuild to the teaching contract
Editing only; no new runs. Every figure and number comes from recordings already in `inputs/`, or from the three pages that recorded them (copied by `import_inputs.py`, sources named under each figure).
- **Top**: the core idea in one sentence; a hero (the title search's prediction path, SQL to statistics to row estimate to cost to executor, against EXPLAIN ANALYZE's 100 estimated and 1 actual, drawn at the measured width, vertical on a phone); "You need"; eight new terms. The old one-screen table is a closed reference block; the glossary is gone (new-terms list and inline definitions).
- **Visuals added inline**: the misestimate dumbbell (section 4, replaces a script table), the three join algorithms each against its forced alternative (section 5, newly owned), a bottom-up stepper through a real plan with the fix (section 6), offset against keyset pagination by depth (section 8, newly owned), pgbench with and without a new connection per transaction (section 8, newly owned). N+1, batching and spill bars became SVG at the measured width.
- **Moved into Reading**: the Cost model calculator (section 2), with rows wanted as the one primary control and a prediction prompt; the other settings, the per-path arithmetic, the measured table, the self-check and the inputs in closed blocks.
- **Moved to closed blocks**: the cost-constants table, the statistics-target table, the JOIN-syntax and exhaustive-search subtleties, other EXPLAIN options, the node reference table, JIT, the pinning tools, learned optimizers with the QORL correction.
- **Deleted as fat**: reading-time and glossary meta, wind-ups and signposts, the problem/how/cost/when box of section 5 (restated the prose), the common-mistakes list (each restated a section; the points it alone made, plain EXPLAIN cannot show a misestimate, enable_* is a diagnostic switch, folklore settings, small development databases, N+1 is invisible in the code, are now in sections 5, 6, 8, 9 and In production).
- **No autoplay**: the template `21_js_rd_common.js`; the workflow's mode switch no longer starts playing. `test_page.mjs` checks both steppers stay on step 0.
- **No real images**: a mechanism page with nothing physical to show; diagrams and real EXPLAIN output carry it.

## Length judgement
| | Before (2026-10-23 audit) | After (2026-10-24) |
|---|---|---|
| Reading, core (230 words a minute, `html_utils/audit_pages.mjs`) | 44 min | 40 min |
| Reading, closed details | 4 min | 10 min |
| Cost model tab | 3.5 min | (now inside Reading) |
| Plan reading lab, Further reading | 1 + 3.5 min | 1 + 3.5 min |
| Visuals drawn in Reading (svg, canvas, img at least 120 x 80 px, as audit_pages.mjs counts them) | 2 | 8 |

Why 40 minutes is right: the page owns the whole of query performance (planner, cost model reproduced to the cent, statistics, four causes of misestimates, three join algorithms and join-order search, reading EXPLAIN, the find-explain-fix-verify routine on a replayed workload, ranked fixes with N+1, batching, pagination and connections measured, settings with spills and parallelism measured, prepared statements and a measured generic-plan regression, regressions and pinning), and nearly every remaining ledger unit is a measured number or a mechanism step. The old 44 minutes plus the 3.5-minute tab became 40 while absorbing three subjects (joins, pagination, connections) and the bottom-up stepper; what was cut is restatement (mistakes, glossary, the section-5 box, signposts), and reference material moved into closed blocks. Cutting further would remove measured results that are this page's evidence.

## Knowledge ledger (`ledger.json`; `python3 html_utils/ledger.py check`: problems 0)
419 units: core 373, depth 31, fat 15. 404 drafted by `ledger.py init` from the old page; 15 added by hand for script-drawn figures (hero, dumbbell, joins, GEQO, stepper, workflow, pagination, connections, N+1, spill and parallel, generic plan, MCV), each keyed on its static caption. Fat units carry a `note`.
