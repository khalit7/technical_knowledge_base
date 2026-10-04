# Source: Analytics: columnar engines, DuckDB and the lakehouse

`sh build.sh` writes `../index.html` from `parts/` (same scheme as the root and siblings: 01_head, 10_header, 20_read_*.html, 3x_tab_*.html, every *.js in its own script, 99_js_tabs.js last). `python3 build_data.py` turns `inputs/*.json` into `parts/22_js_data.js`; `python3 recompute.py` writes `recompute_out.json`; `node src/check_page.mjs` (from the repo root) clicks every control at 390 dark and 920 light and compares the page's numbers with recompute_out.json.

Shape: Part B of `html_utils/methods/topic_pages.md` (a child page): in one screen, then the mechanisms in order (columns, encodings, skipping, execution, the Parquet file), then the systems (DuckDB, ClickHouse, warehouses, lakehouse), then pipelines, ML and pro practice. Three standalone tabs (Parquet lab, Inside a Parquet file, Iceberg step by step). New page, so no `live.md`; `coverage.json` lists what this page owns from the root and its notes.

## Measurements (`measure/`, all run 2026-10-04 on an Apple M1 Pro, 16 GB, shared with other jobs; each under 20 minutes)
Run from a scratch directory outside the repo with `AN_DATA=<dir>`; Postgres uses `AN_PORT` (default 54373) and refuses a port already in use.
1. `gen_chat.py`: the root's generator (copied unchanged but for port, data dir and log path): 100k users, 1M chats, 10M messages in PostgreSQL 16.2 (pgserver). About 2 minutes.
2. `export.py`: the same rows into DuckDB (`chat.duckdb`) and SQLite (`chat.sqlite`). Checks case 6 totals equal the root's.
3. `parquet_lab.py`: 36 Parquet files, 4 queries each, bytes counted with `countfs.py`. About 2 minutes.
4. `encodings.py`: each column alone with each encoding and codec (pyarrow). About 3 minutes.
5. `anatomy.py` (+ `thrift_compact.py`, `countfs.py`): the tiny file decoded byte by byte, the 10M file's footer, counted reads.
6. `engines.py`: DuckDB, Postgres, SQLite on six queries. About 15 minutes (SQLite dominates).
7. `vec_ooc.py`: Python loop, numpy, DuckDB one thread; out-of-core sort under 300 MB.
8. `remote_small.py`: DuckDB httpfs against a local Range-logging HTTP server; small files and compaction.
9. `iceberg_walk.py`, `delta_walk.py`: real lakehouse tables, every file decoded.
10. `clickhouse_mt.py`: chDB 3.7.2 (ClickHouse 25.8): parts, merge, EXPLAIN indexes, a materialised view.
11. `ml_asof.py`: naive against ASOF join for a plan feature (plan history illustrative).

`inputs/research.json`: 92 dated claims from primary sources (prices, versions, specs), fetched 2026-10-04.
