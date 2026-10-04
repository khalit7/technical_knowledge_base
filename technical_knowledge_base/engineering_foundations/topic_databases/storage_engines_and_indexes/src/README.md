# Storage engines and indexes: source

`sh build.sh` writes `../index.html` from `parts/` (same scheme as the root Topic: databases: `01_head`, `10_header`, `20_read_*.html` for the Reading tab, `3x_tab_*.html` one per tab, every `*.js` in its own `<script>`, `99_js_tabs.js` last). Links are written `{{text|url}}` (`n:<notion id>` or `#t-<tab>`).

## Parts
- Reading: `20_read_a` (one screen) to `20_read_j` (production, mistakes, numbers, glossary); JS: `21_js_common.js` (copied from the root: animation controller), `22_js_data.js` (generated, measured data as `window.SE`), `23_js_rd_page.js` (page drawn to scale, WAL and commit bars, crash log), `24_js_rd_clock.js` (clock sweep animation), `25_js_rd_tables.js` (fan-out and bloom calculators, every measured table and note, glossary), `26_js_rd_insert.js` (one insert, B-tree split against LSM memtable, flush, compaction).
- B-tree and LSM lab: `34_tab_lab.html`, `19_js_lab_model.js` (the two engine models, pure logic), `41_js_lab.js`.
- Inside real pages: `35_tab_page.html`, `45_js_page.js`.
- Further reading: `39_tab_more.html`.

## Data and checks
- `measure/`: the measurement scripts (see "Reproduce"). Outputs in `inputs/`: `m1_pages.json` (pageinspect, buffer cache, crash recovery), `m2_wal.json` (WAL records, full-page images, commit rates), `m3_indexes.json` (write cost of 0 to 6 indexes, B-tree depth, splits, dedup, index kinds, BRIN), `m4_pg18.json` (skip scan 16 against 18, bigint against UUID v4 and v7 keys), `m5_lsm.json` (RocksDB write, space and read amplification).
- `python3 build_data.py` writes `parts/22_js_data.js`; `python3 recompute.py` recomputes every derived number from the inputs, checks the prose states them, and writes `recompute_out.json`; `check_page.mjs` (run from `html_utils/`) clicks every control at 390 px dark and 920 px light and compares the page's JavaScript with `recompute_out.json`.
- `coverage.json`: every fact of the old page (`live.md`) with where it is carried, which sibling owns it, and corrections. `handoff_planner.md`, `handoff_vector.md`: the old page's planner and ANN material, verbatim with corrections, for the siblings that own them.
- `viz_ideas.md`: visuals built and rejected.

## Reproduce
Everything runs from a scratch folder, nothing installed system-wide; each script takes under 15 minutes on an M1 Pro.
1. PostgreSQL 16.2: copy the pgserver wheel's `pgserver/pginstall` (and `pgserver/.dylibs` next to its parent, as the binaries expect `../../.dylibs`) to a scratch folder; download `postgresql-16.2.tar.bz2` and build `contrib/{pageinspect,pg_walinspect,pgstattuple,pg_visibility,pg_buffercache,pg_freespacemap}` with `make USE_PGXS=1 PG_CONFIG=<copy>/bin/pg_config PG_SYSROOT=$(xcrun --show-sdk-path) install`.
2. PostgreSQL 18.6: `./configure --prefix=<scratch>/pg18 --without-readline --without-icu --without-zlib && make -j8 && make install`, plus the same contrib modules.
3. `export SE_PG16=<copy> SE_PG18=<scratch>/pg18 SE_DATA=<scratch>/data`, then `python3 measure/m1_pages.py`, `m2_wal.py`, `m3_indexes.py`, `m4_pg18.py`; RocksDB: `uv run --no-project --python 3.12 --with rocksdict python measure/m5_lsm.py`.
4. The 1M-message table is the root's (`../../src/read/measure_read.py`, same SQL and seed), so page and index counts match the root's Reading tab.

`m3_indexes.json` note: the first full run stopped at its last step (a BRIN page number); its printed results for the write cost, depth, splits and index kinds were kept, and the script, since split into sections that save as they go, was rerun for `extra brin`.

## Departures from the method
The Reading tab is long (it owns the depth); two tabs instead of one because the lab (a simulator) and the real-page walkthrough (pageinspect data) serve different questions. Sizes over 300 KB are not expected.
