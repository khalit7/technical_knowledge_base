# Source: Analytics: columnar engines, DuckDB and the lakehouse

`sh build.sh` writes `../index.html` from `parts/` (same scheme as the root and siblings: 01_head, 10_header, 20_read_*.html, 3x_tab_*.html, every *.js in its own script, 99_js_tabs.js last). `python3 build_data.py` turns `inputs/*.json` into `parts/22_js_data.js`; `python3 recompute.py` writes `recompute_out.json`; `node src/check_page.mjs` (from the repo root) clicks every control at 390 dark and 920 light and compares the page's numbers with recompute_out.json.

Shape: `.claude/skills/explainer-page/page-kinds/topic-child.md` (a child page), rebuilt 2026-10-24 to the teaching contract (below). Page prefix `an`, storage key `an-tab`. Tabs: Reading, Parquet lab, Further reading. `coverage.json` lists what this page took over from the root at first build; `ledger.json` is the knowledge ledger of the 2026-10-24 rebuild.

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

## Parts (2026-10-24)
- Reading: `20_read_a` (styles, nav, the idea in one screen: core sentence, hero, you need, new terms, summary table, which system when), `20_read_b` (1 OLTP and OLAP) to `20_read_l` (11 ML), `20_read_m` (12 the dated table of versions, prices and vendor news, closed), `20_read_z`. JS: `21_js_rd_common.js` (the skill template; since 2026-11-06 animations play once in view), `22_js_data.js` (generated), `23_js_rd_charts.js` (bars, bill calculator, HTTP ranges), `25_js_prune.js` (pruning before/after; a mode switch no longer plays), `26_js_rd_pq.js` (row group 0 table), `27_js_rd_figs.js` (encodings on real values, row against vector toggle, late materialisation bars, ClickHouse granules, storage apart from compute, the commit race stepper, ETL against ELT, the ASOF timeline), `45_js_bytes.js` (byte map, moved from its tab), `46_js_ice.js` (Iceberg and Delta explorer, moved from its tab, starts at step 1).
- Parquet lab: `34_tab_lab.html`, `41_js_lab.js` (kept as a tab: a workbench used by sections 3, 4 and 5).
- Further reading: `39_tab_more.html`.
- Checks: `node src/check_page.mjs` (from the repo root) fails if the pruning or commit stepper moves before the reader acts, steps both to the end, clicks every control at 390 px dark and 920 px light, and compares the page's numbers with `recompute_out.json`.

## The 2026-10-24 rebuild: what changed and why
- **Top**: core idea in one sentence; a hero drawn to scale from the real file (82 row groups by 7 column chunks, area is bytes, the one-day query's footer and two chunks highlighted: 1,197,073 of 534,416,678 bytes); "You need"; new terms (the old glossary, moved up); the summary table; "which system, when" (the old one-paragraph version merged with section 12's path, which was a restatement).
- **Tabs removed**: Inside a Parquet file (its byte map, detail panel and role decoding now sit in section 5; Thrift notes and the chunk table closed) and Iceberg, step by step (the explorer replaces the static mini tree in section 9 and now starts at step 1). Each explained one mechanism.
- **New visuals** (all hand-built SVG, static or reader-paced): encodings on real values (section 2, replaces six text cards); row at a time against a vector at a time (section 4, 10,000,000 against 4,883 calls, derived); late materialisation bars (64 MB needed against 50 MB read; 404 MB against 390 MB); ClickHouse granules toggle (1/1221 against 1221/1221); storage apart from compute; the optimistic-concurrency commit race stepper (illustrative snapshot numbers); ETL against ELT; the ASOF timeline for chat 13 with the leak counts. The sort-order bars moved from section 5 to section 3, beside the claim.
- **Real image**: Figure 1 of the Lakehouse paper (CIDR 2021, CC BY 3.0) in section 9, `img/lakehouse_fig1.webp`, credited in `img/CREDITS.md`.
- **No autoplay**: template `21_js_rd_common.js` and `99_js_tabs.js`; the pruning card no longer plays on a mode switch.
- **Volatile facts in one dated table** (section 12, closed): versions, prices, the DuckLabs and AWS deal, catalogs, dbt and Fivetran, new file formats.
- **Closed depth**: how the engines were measured, MonetDB/X100 lineage, the Tigani and Coiled evidence, ClickHouse extra defaults and the async_insert correction, vendor naming of warehouse pieces, the five lake gaps, Delta extras, Iceberg format versions, the dbt model.
- **Deleted as fat**: the common-mistakes block (every entry restated a section, the one new number, 0.5 to 10 seconds of Postgres per query, moved into section 1), the glossary (now New terms), the section 5 bullets that repeated the encoding figure, wind-ups and pointers to removed tabs. SVG labels raised to 11 px.
- **Links**: Storage and loading at scale (training shards and loaders), ML platforms and workflows (feature stores, which OWNERS.md gives it).

## Length judgement
| | Before (audit 2026-10-23) | After (2026-10-24) |
|---|---|---|
| Reading, core | 44.3 min | 42.7 min |
| Reading, closed details | 1.2 min | 8.2 min |
| Other tabs | lab 2.3, bytes 2.9, Iceberg 1.3, further reading 2.9 | lab 2.3, further reading 2.9 |
| Visuals drawn in Reading (audit, SVG only) | 3 | 12 (plus 8 HTML bar charts) |

Why about 43 minutes: the core now carries the two tabs that explained the Parquet file and table-format commits (4.2 minutes before), and eight new figures with their captions, while 7 minutes of provenance, vendor detail and restatement went into closed blocks or were cut. The page owns twelve mechanisms (OLTP against OLAP, column chunks, encodings, zone maps and sort order, vectorised execution, late materialisation, the Parquet file, DuckDB, MergeTree, warehouse billing, table formats with concurrency, partitioning and compaction), each with a measurement on the same 10 million messages; about a quarter of the core words are figure captions and measured numbers. Core plus tabs fell from 50.8 to 45.0 minutes.

## Knowledge ledger (`ledger.json`, `python3 html_utils/ledger.py check`: problems 0)
456 units: core 381, depth 25, volatile 20 (in the dated table on this page), fat 30 (each with a `note`). Keys were proposed automatically (the longest number or phrase of each unit found in the rebuilt page, preferring rare ones) and 22 set by hand. Labels follow where the key now sits: inside a closed block is depth, in the dated table volatile.

2026-10-26 (final follow-up sweep): section 11's shard advice links Storage and loading at scale (sections 7 and 11), which owns shard sizing and mid-epoch resume; the one line stays here as the analytics view.

## The 2026-11-06 pass: split layout, four 3D stages (renderer v2), explained and autoplaying animations
- **Templates**: `02_split.html` (added to `build.sh` after `01_head.html`), `21_js_rd_common.js`, `99_js_tabs.js` (key `an-tab`) and `05z_errbox.js.html` from the skill; the renderer `25_js_s3.js` copied unchanged as `29_js_s3.js` (after the data and the 2D figure scripts, before the scenes `30` to `33`). The eased-step CSS (`rd-fwd`, `rd-new`, `rd-fade`) added to `01_head.html` outside the `kb-look` block.
- **Split layout** (Reading): top (Fig. 1 beside the core sentence, its five steps, You need and terms; the summary table and "which system, when" full width); 1 (engine bars); 2 twice (the encodings figure, whose four-item explanation moved to the left; the encoding bars); 3 twice (the pruning animation beside two step lists, one per mode; sort-order bars); 4 three times (Fig. 2; the vectorised-sum bars; the late materialisation bars); 5 (byte map); 6 (HTTP ranges); 7 (Fig. 3); 8 twice (storage apart from compute; the bill calculator); 9 four times (the Lakehouse paper figure; Fig. 4; the commit race beside its step list; small files); 10 (ETL against ELT); 11 (the ASOF timeline and bars). Full width: the code blocks, the row group 0 table, the dated table, callouts, Delta and Hudi prose. Parquet lab: notes left, controls and table right; the scatter with its query buttons right.
- **Four 3D stages**, one scene each, every number from `window.D`:
  - Fig. 1 (`30_js_sc_hero.js`, 5 steps): the real 534 MB file (`D.full`): 82 row-group slices by 7 column chunks, depth to scale from the footer (`created_at`, `chat_id`, `tokens` per row group, the rest from row group 0), the footer, DuckDB; the query names two columns, reads the footer, min/max leaves row group 42, two chunks flow to the reader (1,197,073 bytes). Replaces the 2D hero (`24_js_rd_hero.js`, deleted); its caption became the step list.
  - Fig. 2 (`31_js_sc_vec.js`, 5 steps): `tokens` in memory, Scan and Aggregate, the per-call overhead as a glass plate; one value per call (10,000,000 calls) against slabs of 2,048 values (4,883 calls, derived), then late materialisation (filter on `chat_id`, 7 positions, `tokens` fetched there only). Replaces the row-against-vector toggle figure (`vdCard`).
  - Fig. 3 (`32_js_sc_ch.js`, 5 steps): `D.ch`: ten 47.6 MiB parts, the merge into `all_1_10_2` (476.35 MiB), 1,221 granules and the sparse index as a glass wall, binary search to 1/1221 and the time filter's 1221/1221. Replaces the granule toggle figure (`grCard`).
  - Fig. 4 (`33_js_sc_ice.js`, 9 Iceberg steps or 5 Delta steps, a toggle swaps the list): every file `D.ice` and `D.delta` recorded, in lanes by kind and left to right by commit; the catalog pointer, dots following the current snapshot down to its live data files, superseded files faded, time travel along snapshot 1's branch. The step table became the Iceberg step list; the old click-to-decode explorer (`46_js_ice.js`) is kept in a closed block under it ("Open every file the two tables wrote, decoded"), redrawn when opened.
- **2D animations, now explained and autoplaying**: the pruning animation (`25_js_prune.js`) went from 12 frames (batches of 10 row groups) to 5 explained steps (query, footer, row groups 0 to 40, 41 to 81, done), with one step list per mode (`sx-pr-on`, `sx-pr-off`, swapped by `reset(n,list)`); its caption is gone, the stat tiles stay. The commit race (`occCard`) has its five captions as `sx-occ`.
- **Kept 2D, and why**: engine, encoding, sort-order, vectorised-sum, late materialisation, HTTP-range and small-files charts (numbers on an axis, several on log scales); the encodings figure (values mapped to their stored form, flat); the byte map (a 1D file layout with clickable regions); storage apart from compute and ETL against ELT (block diagrams without depth); the commit race (a short protocol on illustrative versions; a stage would add nothing the stepper lacks); the ASOF timeline (a timeline); the bill calculator (a calculator).
- **Checks**: `check_stages.mjs` new (from RAG in production: autoplay in view for the four stages and the two 2D animations, step lists one item per step, flows stop off screen, nothing moves under reduced motion, split columns at 1400 px); `check_page.mjs`'s never-autoplay assertion inverted (the pruning and commit animations must play once in view), the `vdCard`, `grCard` and hero shots removed, and the explorer's details block opened before its files are clicked.

## Length judgement, 2026-11-06
| | Before (audit 2026-11-06) | After |
|---|---|---|
| Reading core | 9,956 words, 43.3 min | 10,844 words, 47.1 min (header 47) |
| Reading in closed blocks | 1,961 words, 8.5 min | 2,103 words, 9.1 min (the explorer moved into one) |
| Parquet lab | 528 | 528 |
| Further reading | 665 | 665 |
| Visuals inline in Reading (audit count) | 12 | 13 (four stages; the hero, row-against-vector and granule figures replaced) |

The core grew by about four minutes, all of it step lists: Fig. 1's five steps carry the old hero caption, Fig. 2's five and Fig. 3's five carry the captions of the two toggle figures they replace plus the binary-search and late-materialisation steps, Fig. 4's lists replace the seven-row step table and add the Delta replay, and the pruning and commit lists carry their old captions. About 330 of the added words are the two alternative lists (pruning without statistics, Delta) that a reader sees only after pressing the toggle, so the reading path grew by about two and a half minutes. Nothing was cut: every list carries ledger units the prose around it does not.

## Ledger, 2026-11-06
458 units: core 382, depth 25, volatile 21, fat 30; `python3 html_utils/ledger.py check` problems 0. Five keys re-pointed to the new wording (units 267, 270, 271, 410, 411: the step table became the Iceberg step list); no unit relabelled.
