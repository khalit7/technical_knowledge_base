# Storage engines and indexes: source

`sh build.sh` writes `../index.html` from `parts/` (same scheme as the root Topic: databases: `01_head`, `10_header`, `20_read_*.html` for the Reading tab, `3x_tab_*.html` one per tab, every `*.js` in its own `<script>`, `99_js_tabs.js` last). Links are written `{{text|url}}` (`n:<notion id>` or `#t-<tab>`).

## Parts (rebuilt 2026-10-24 to the teaching contract; page prefix `se`, storage key `se-tab`)
- Reading: `20_read_a` (styles, nav, the idea in one screen: core sentence, hero, you need, new terms, summary table; section 1 pages), `20_read_b` (2 buffer pool, 3 WAL, 4 crash recovery), `20_read_c` (5 B-trees), `20_read_d` (6 LSM-trees, 7 RUM measured), `20_read_e` (8 heap or clustered, 9 index types, 10 index shapes), `20_read_f` (11 write cost, 12 column stores), `20_read_g` (closed depth: production settings, mistakes, numbers, glossary). JS: `21_js_rd_common.js` (the skill template: never autoplays), `22_js_data.js` (generated, `window.SE`), `23_js_rd_page.js` (WAL and commit bars), `24_js_rd_clock.js` (clock sweep stepper), `25_js_rd_tables.js` (fan-out and bloom calculators, measured tables, glossary), `26_js_rd_insert.js` (one insert, B-tree against LSM; a mode switch no longer starts playback), `27_js_rd_hero.js` (hero), `28_js_rd_figs.js` (crash recovery stepper, RUM triangle, heap against clustered, composite index order), `29_js_rd_real.js` (page 0 strip and slots, the HOT before/after, the B-tree path drawing and entries; moved from the old Inside real pages tab).
- B-tree and LSM lab: `34_tab_lab.html`, `19_js_lab_model.js`, `41_js_lab.js` (kept as a tab: a workbench used across sections 5, 6 and 7).
- Further reading: `39_tab_more.html`.

## Data and checks
- `measure/`: the measurement scripts (see "Reproduce"). Outputs in `inputs/`: `m1_pages.json` (pageinspect, buffer cache, crash recovery), `m2_wal.json` (WAL records, full-page images, commit rates), `m3_indexes.json` (write cost of 0 to 6 indexes, B-tree depth, splits, dedup, index kinds, BRIN), `m4_pg18.json` (skip scan 16 against 18, bigint against UUID v4 and v7 keys), `m5_lsm.json` (RocksDB write, space and read amplification).
- `python3 build_data.py` writes `parts/22_js_data.js`; `python3 recompute.py` recomputes every derived number from the inputs, checks the prose (including the static captions under script-drawn tables) states them, and writes `recompute_out.json`; `check_page.mjs` (run from the repo root) checks that no animation moves before the reader acts, clicks every control at 390 px dark and 920 px light and compares the page's JavaScript with `recompute_out.json`.
- `coverage.json`: every fact of the old page (`live.md`) with where it is carried, which sibling owns it, and corrections. `handoff_planner.md`, `handoff_vector.md`: the old page's planner and ANN material, verbatim with corrections, for the siblings that own them.
- `viz_ideas.md`: visuals built and rejected.

## Reproduce
Everything runs from a scratch folder, nothing installed system-wide; each script takes under 15 minutes on an M1 Pro.
1. PostgreSQL 16.2: copy the pgserver wheel's `pgserver/pginstall` (and `pgserver/.dylibs` next to its parent, as the binaries expect `../../.dylibs`) to a scratch folder; download `postgresql-16.2.tar.bz2` and build `contrib/{pageinspect,pg_walinspect,pgstattuple,pg_visibility,pg_buffercache,pg_freespacemap}` with `make USE_PGXS=1 PG_CONFIG=<copy>/bin/pg_config PG_SYSROOT=$(xcrun --show-sdk-path) install`.
2. PostgreSQL 18.6: `./configure --prefix=<scratch>/pg18 --without-readline --without-icu --without-zlib && make -j8 && make install`, plus the same contrib modules.
3. `export SE_PG16=<copy> SE_PG18=<scratch>/pg18 SE_DATA=<scratch>/data`, then `python3 measure/m1_pages.py`, `m2_wal.py`, `m3_indexes.py`, `m4_pg18.py`; RocksDB: `uv run --no-project --python 3.12 --with rocksdict python measure/m5_lsm.py`.
4. The 1M-message table is the root's (`../../src/read/measure_read.py`, same SQL and seed), so page and index counts match the root's Reading tab.

`m3_indexes.json` note: the first full run stopped at its last step (a BRIN page number); its printed results for the write cost, depth, splits and index kinds were kept, and the script, since split into sections that save as they go, was rerun for `extra brin`.

## The 2026-10-24 rebuild: what changed and why
- **Top**: core idea in one sentence, a static hero (one insert through a B-tree engine and an LSM engine: both log and flush to commit; the B-tree pays at checkpoints, the LSM in compaction), "You need" (root sections 1 to 4, the OS storage page), seven new terms, the summary table.
- **Inside real pages tab removed**: its three parts explain single mechanisms, so they moved inline: the page 0 strip and slot detail into section 1 (slot table closed), the HOT update as a before/after toggle beside the update paragraph, the B-tree path into section 5 as a new drawing (one tick per real entry, the followed entry highlighted, the 6 table pages among 19,235), entry lists closed.
- **New visuals**: hero; crash recovery stepper (WAL strip from the redo point, replay cursor, data pages, the printed log highlighted per step); RUM triangle (qualitative, from this page's measurements); heap against clustered diagram; composite index order toggle (24 illustrative entries, reads 3 against 12). Every figure has a title saying what to notice.
- **No autoplay**: template `21_js_rd_common.js` and `99_js_tabs.js`; the insert animation's mode switch no longer plays; `check_page.mjs` fails if a step slider moves on its own.
- **Static captions** now carry the key numbers of script-drawn tables (checked by `recompute.py`), so the ledger can find them.
- **Correction of this page's own prose**: section 4 quoted redo at 0/111CFE90 and the end at 0/119D8C78; the recorded log (`inputs/m1_pages.json`) says 0/111CFEA0 and 0/119D8C88, now used. Clock caption fixed for a zero-length sweep; "a Index Only Scan" grammar.
- **Closed depth**: Lehman and Yao, dedup, bottom-up deletion, skip scan, limits, measured depth table, TOAST and the free space map, HOT over time (sibling's measurement), InnoDB and io_method, the fsync PANIC story, WAL reuse, Luo and Carey's formulas, RocksDB method, Cassandra tombstone settings, bitmap scans, MergeTree, production settings, mistakes, numbers table, glossary.
- **Links**: SQL and data modelling section 7 for key-type measurements; Storage and file systems for the page cache and fsync; Vector indexes for HNSW and IVF.

## Length judgement
| | Before (audit 2026-10-23) | After (2026-10-24) |
|---|---|---|
| Reading, core | 50.5 min | 38.8 min |
| Reading, closed details | 1.2 min | 13.9 min |
| Other tabs (lab, real pages, further reading) | 9.2 min | 5.4 min (lab 1.9, further reading 3.5) |
| Visuals drawn in Reading (audit) | 2 | 8 |

Why about 39 minutes: the page owns twelve mechanisms (pages, buffer pool, WAL, recovery, B-trees, LSM-trees, amplification, heap against clustered, index types, shapes, write cost, column stores in summary), each with its measurement on a real engine; the walkthrough of real pages that was a separate 4-minute tab is now inside the core. About a fifth of the core words are figure captions and the script-drawn tables. Everything that is provenance, per-item reference or an edge case is closed.

## Knowledge ledger (`ledger.json`, `python3 html_utils/ledger.py check`: problems 0)
423 units: core 339, depth 72, fat 12. 396 drafted by `ledger.py init`, 27 added by hand for script-drawn tables and notes (their keys sit in static captions). Keys were first proposed automatically (the longest phrase of each unit, numbers first, found in the rebuilt page) and the 37 that failed or were generic were set by hand; fat units carry a `note`.

## Departures from the method
The lab stays a tab because it is a workbench used across sections 5 to 7. No real image: the page is about mechanisms, and no openly licensed photo or figure teaches more than the drawings.
