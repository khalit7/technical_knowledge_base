# Source of SQL and data modelling

Child of Topic: databases. `sh build.sh` writes `../index.html`. The page reuses the root's in-page engine (`../../src/parts/31_js_sql_a_engine.js`, sql.js 1.14.2 with its WebAssembly inlined) and the root's chat dataset (`../../src/sql/data.json`), adding one column, `messages.parent_id`.

Shape: Reading (14 sections, each standalone, with 38 runnable boxes and 5 animations or interactive visuals), Exercises lab, ALTER TABLE measured, Further reading. Follows Part B of `html_utils/methods/topic_pages.md`; departs only in that most "visuals" are live queries, because the subject is a language.

## Files
- `parts/`: page parts; `31_js_run.js` is a copy of the root's loader and runner with a fix (write statements starting with a comment reported 0 changed rows); `32_js_data.js` is generated.
- `examples.py`: every Reading example (SQLite text, Postgres text where different). `ex/exercises.py`, `ex/check.py`: the lab.
- `pg/`: PostgreSQL 16.2 measurements (pgserver wheel): `run_examples.py`, `measure_alter.py`, `measure_queue.py`, `measure_keys.py`, `measure_n1.py` (+ `delay_proxy.py`), `alembic_demo.py`; helpers in `pgc.py`. Outputs in `inputs/`.
- `gen_js.py` builds the data part; `recompute.py` checks 54 claims independently and writes `recompute_out.json`; `check_page.mjs` clicks every control at 390 dark and 920 light, grades all 28 solutions in the page and compares the page's JavaScript with recompute; `shot_cards.mjs` screenshots each visual.

## Reproduce (from a scratch directory; never `uv run` inside the repo without --no-project)
```
UV="uv run --no-project --python 3.12 --with pgserver --with psycopg[binary] --with sqlalchemy>=2"
$UV python <src>/pg/measure_alter.py      # builds the 2M-row table (database bench), about 3 min
$UV python <src>/pg/measure_queue.py      # needs bench
$UV python <src>/pg/run_examples.py
$UV --with alembic python <src>/pg/alembic_demo.py
$UV python <src>/pg/measure_n1.py
$UV python <src>/pg/measure_keys.py       # about 15 min (10M rows x 3 key types)
python3 ex/check.py && python3 gen_js.py && sh build.sh && python3 recompute.py && node check_page.mjs
```
Data directory: `SQLM_DATA` (default `./sqlm_pgdata`), several GB, outside the repo.
