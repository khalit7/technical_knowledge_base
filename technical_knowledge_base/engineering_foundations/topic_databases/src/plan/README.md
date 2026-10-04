# Query plans tab: measurements

Real plans for the chat product's data, measured on 2026-10-04 on an Apple M1 Pro laptop (16 GB, macOS 27.0.1), PostgreSQL 16.2 from the pgserver wheel (defaults plus track_io_timing; JIT not available), DuckDB 1.5.6.

Run order from a scratch directory outside the repo (the data directory is about 4 GB; set QP_DATA to it):
1. `gen.py`: 100k users, 1M chats, 10M messages, deterministic, about 2.5 minutes.
2. `measure.py case7_before case7_after case1 case2 case3 case4 case5 case6_pg case8 sizes` (case 7 first: it needs the never-vacuumed table). Case 8 writes and reads a 20 GB file to flush the OS cache.
3. `duck.py`: copies messages into DuckDB and Parquet, case 6's column-store side.
4. `python3 build_data.py` writes `../parts/32_js_qp_data.js`; `python3 recompute.py` prints every derived number; `test_tab.mjs` clicks every control (run from html_utils/).

Each script: `QP_DATA=$PWD/pgdata uv run --no-project --python 3.12 --with pgserver --with duckdb python <script>`.

The measured database was first built with `users.timezone` added by an UPDATE, then rewritten with `VACUUM FULL` (`measure.py compact_users`) before cases 1, 3, 4 and 5 were measured; gen.py now inserts it directly, which gives the same table.
