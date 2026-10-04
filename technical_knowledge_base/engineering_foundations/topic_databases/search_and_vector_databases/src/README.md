# Search and vector databases: source

`sh build.sh` runs `build_data.py` (inputs to `parts/22_js_data.js` and `facts.json`) and writes `../index.html` from `parts/` (same scheme as the root Topic: databases and the sibling pages: `01_head`, `10_header`, `20_read_*.html` for the Reading tab, `3x_tab_*.html` one per tab, every `*.js` in its own `<script>`, `99_js_tabs.js` last). Links are written `{{text|url}}` (`n:<notion id>` or `#t-<tab>`); measured numbers in the prose are written `@@key@@` and filled from `facts.json`, so prose and data cannot disagree.

## Parts
- Reading: `20_read_a` (one screen, section 1) to `20_read_g` (operations, production, mistakes, numbers, glossary). JS: `21_js_common.js` (animation controller, copied from the root), `22_js_data.js` (generated), `22b_js_bm25.js` (BM25 and RRF arithmetic), `23_js_toy.js` (the 2D toy: real HNSW build and search, k-means IVF, filters), `24_js_rd_inv.js` (inverted index animation), `25_js_rd_bm25.js` (BM25 calculator and RRF widget), `26_js_rd_tables.js` (measured tables, ts_debug, glossary), `31_js_rd_ann.js` (one query four ways), `32_js_rd_filt.js` (filtered search animation).
- ANN lab: `34_tab_ann.html`, `41_js_ann.js`. Retrievers side by side: `35_tab_side.html`, `45_js_side.js`. Further reading: `39_tab_more.html`.

## Data and checks
- `measure/`: `svpg.py` (server and client helpers), `embed.py`, `m1_ann.py`, `m2_fts.py`, `m3_tiny.py`. Outputs in `inputs/`: `embed_log.json`, `m1_ann.json` (load, exact, HNSW m 8/16/32 curves, IVFFlat 523 and 2,000 lists, halfvec and binary indexes, filters at 1% and 10%, build memory, inserts, VACUUM and REINDEX), `m2_fts.json` (tsvector and GIN, five retrievers plus SQL RRF scored on Quora and SciFact, sample questions, ts_debug, phrase and trigram demos), `m3_tiny.json` (six questions with lexemes and cosines, LIKE against GIN).
- `python3 recompute.py` recomputes BM25, idf and RRF for the worked example and the derived facts from the inputs, checks every fact appears in `../index.html`, and writes `recompute_out.json`; `check_page.mjs` (run from the repo root) clicks every control at 390 px dark and 920 px light and compares the page's JavaScript with it.
- `coverage.json`: the inherited ANN facts and root mentions, where each is carried, corrections. `viz_ideas.md`: visuals built and rejected.

## Reproduce
All from a scratch folder; nothing installed system-wide; each step under 15 minutes on an M1 Pro.
1. PostgreSQL 18.6 built from source into `$SV_PG` (the storage sibling's step 2), then pgvector 0.8.7 and pg_trgm with PGXS: `make PG_CONFIG=$SV_PG/bin/pg_config PG_SYSROOT=$(xcrun --show-sdk-path) && make ... install` in the pgvector source and in `contrib/pg_trgm` (with `USE_PGXS=1`).
2. BEIR Quora and SciFact zips from `https://public.ukp.informatik.tu-darmstadt.de/thakur/BEIR/datasets/`, unzipped under one folder.
3. `SV_WORK=<scratch>/work uv run --no-project --python 3.12 --with sentence-transformers --with numpy python measure/embed.py <beir folder> scifact,quora` (about 2.5 minutes on the M1 GPU through MPS).
4. `SV_PG=... SV_WORK=... uv run --no-project --python 3.12 --with 'psycopg[binary]' --with pgvector --with numpy python measure/m1_ann.py`, then `m2_fts.py`, then `m3_tiny.py` (add `--with sentence-transformers`). Each stage saves as it goes; rerunning skips finished stages unless `FORCE=1`.

## Departures from the method
Two tabs: the ANN lab (measured curves and a calculator) and Retrievers side by side (a gallery of real labelled questions) answer different questions. The toy animations use two dimensions so a graph can be drawn; they are labelled illustrative and every real number sits beside them. No dedicated vector database was run locally; the page says the only head-to-head numbers are vendor-run.
