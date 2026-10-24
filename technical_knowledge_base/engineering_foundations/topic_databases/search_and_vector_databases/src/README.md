# Search and vector databases: source

`sh build.sh` runs `build_data.py` (inputs to `parts/22_js_data.js`, which also carries `SV.facts`, and `facts.json`) and writes `../index.html` from `parts/` (`01_head`, `10_header`, `20_read_*.html` for the Reading tab, `3x_tab_*.html` one per tab, every `*.js` in its own `<script>`, `99_js_tabs.js` last). Links are written `{{text|url}}` (`n:<notion id>` or `#t-<tab>`); measured numbers in the prose are written `@@key@@` and filled from `facts.json`, so prose, figures and data cannot disagree. The header's reading time is set by hand from `html_utils/audit_pages.mjs` (230 words a minute).

## Tabs and parts (rebuilt 2026-10-24 to the teaching contract)
| Tab | Parts | What |
|---|---|---|
| Reading `t-read` | `20_read_a` (styles, nav, the idea in one screen: core sentence, hero, you need, new terms, running example; section 1) to `20_read_g` (sections 12, 13 and the closed Reference block). JS: `21_js_rd_common.js` (skill template, never autoplays), `22_js_data.js` (generated), `22b_js_bm25.js` (BM25 and RRF arithmetic), `22c_js_fig.js` (FG: wrapped SVG text, boxes, arrows, bar charts), `23_js_rd_figs.js` (hero, analysis, LIKE bars, write-path stepper, filter bars, hybrid bars, storage tiers, rebuild), `24_js_rd_inv.js` (inverted index stepper), `25_js_rd_bm25.js` (BM25 sliders), `26_js_rd_tables.js` (measured tables, ts_debug, glossary), `27_js_rd_ann.js` (recall-latency chart and memory calculator, moved from the ANN lab tab) | sections 1 to 13 core, depth in closed blocks |
| Retrievers side by side `t-side` | `35_tab_side.html`, `45_js_side.js` | real labelled questions answered five ways; used across sections 4, 8 and 11 |
| Further reading `t-more` | `39_tab_more.html` | |

## Data and checks
- `measure/`: `svpg.py`, `embed.py`, `m1_ann.py`, `m2_fts.py`, `m3_tiny.py`. Outputs in `inputs/`: `embed_log.json`, `m1_ann.json`, `m2_fts.json`, `m3_tiny.json` (unchanged by the rebuild; no new runs).
- `python3 recompute.py`: BM25, idf and RRF for the worked example and the derived facts, re-derived from `inputs/`; checks every fact appears in `../index.html`; writes `recompute_out.json`.
- `node <this folder>/check_page.mjs` (from the repo root): clicks every control at 390 px dark and 920 px light, steps both steppers to the end, checks that neither moves by itself, that every figure is drawn, and compares the page's JavaScript with `recompute_out.json`.
- `ledger.json`: the knowledge ledger (`python3 html_utils/ledger.py check <page>`). `coverage.json`: the inherited ANN facts from the old storage page. `viz_ideas.md`: visuals built and rejected.

## Reproduce
All from a scratch folder; nothing installed system-wide; each step under 15 minutes on an M1 Pro.
1. PostgreSQL 18.6 built from source into `$SV_PG` (the storage sibling's step 2), then pgvector 0.8.7 and pg_trgm with PGXS: `make PG_CONFIG=$SV_PG/bin/pg_config PG_SYSROOT=$(xcrun --show-sdk-path) && make ... install` in the pgvector source and in `contrib/pg_trgm` (with `USE_PGXS=1`).
2. BEIR Quora and SciFact zips from `https://public.ukp.informatik.tu-darmstadt.de/thakur/BEIR/datasets/`, unzipped under one folder.
3. `SV_WORK=<scratch>/work uv run --no-project --python 3.12 --with sentence-transformers --with numpy python measure/embed.py <beir folder> scifact,quora` (about 2.5 minutes on the M1 GPU through MPS).
4. `SV_PG=... SV_WORK=... uv run --no-project --python 3.12 --with 'psycopg[binary]' --with pgvector --with numpy python measure/m1_ann.py`, then `m2_fts.py`, then `m3_tiny.py` (add `--with sentence-transformers`). Each stage saves as it goes; rerunning skips finished stages unless `FORCE=1`.

## Ownership
This page owns search and vector databases as products: full-text search in Postgres (tsvector, GIN) and in Lucene engines (analysis, inverted index, BM25 as configured, segments, refresh, reindexing), hybrid search inside one database (pgvector plus full-text, RRF in SQL), vector stores compared by design (pgvector, Qdrant, Weaviate, Milvus, Turbopuffer: storage, filtering, multi-tenancy, cost), when Postgres is enough, and operating a search index. ANN internals are Vector indexes from the inside's (3f85c17b0d0d81f29707c130b2ebcfb1: IVF section 3, quantisation 4, IVF-PQ 5, HNSW 6, filtered ANN 9); fusion and BM25's knobs are The retrieval pipeline's (3c65c17b0d0d819899fde889e1e8b782: sections 4 and 2); SPLADE is Rerankers and late interaction's (3f85c17b0d0d813fba53fc883f8a2c8f, section 10).

## The 2026-10-24 rebuild: what changed and why
- **Top**: the core idea in one sentence, a hero diagram (one question through both shortcuts and the SQL fusion, with the measured numbers), "You need", new terms. The old one-screen table is a closed reference block.
- **Every core idea has its visual inline**, chosen by kind: analysis (static diagram from the real `ts_debug`), the inverted index (existing stepper, now paused until the reader acts), LIKE against GIN (bars), BM25 (existing sliders and saturation curve), the Lucene write path (new stepper: buffer, translog, refresh, segments, delete marks, merge, flush), recall against latency (the ANN lab chart, moved inline), filters and hybrid (bars from the measured data), where each vector store keeps its data (new structure diagram), will the index fit (the memory calculator, moved inline), and the zero-downtime rebuild (new diagram shared by Elasticsearch reindexing and pgvector re-embedding).
- **The ANN lab tab was removed**: its chart explains one mechanism (section 8) and its calculator one decision (section 12). Retrievers side by side stays as a tab: a dataset view used across sections.
- **Merged**: old sections 8 to 10 (exact kNN, pgvector's indexes, measured) into one section 8; production practice into section 13. **Closed**: postings compression and GIN internals, lemmatisation and the full `ts_debug`, BM25 provenance and Lucene's departures, the lighter engines and licences, knob table, measured tables, corrections from the old storage page, mistakes, numbers, glossary.
- **New owned content**: the vector-store design table gained multi-tenancy and "what you pay for" columns, sourced from Qdrant, Weaviate, Milvus and Turbopuffer docs (checked 2026-10-24); versions and licences of every product are one dated table (closed).
- **Stale links fixed**: Vector indexes' removed labs (HNSW, IVF-PQ, Filter) are now named as its inline sections 6, 5 and 9; its quantisation reference is sections 4 and 5; The retrieval pipeline's "section 4 and Fusion lab" is now section 4; reading times in Further reading updated (Vector indexes 34 min, retrieval pipeline 42, siblings as of 2026-10-24).
- **No autoplay**: `21_js_rd_common.js` is the skill template, `99_js_tabs.js` the template with key `sv-tab`, and the inverted-index stepper no longer plays on a mode switch.
- **Deleted as fat** (15 units, each with a note in the ledger): wind-ups, run-in headings, pointers to the removed tab.

## Length judgement
| | Before (audit 2026-10-23) | After (2026-10-24) |
|---|---|---|
| Reading, core (230 words a minute) | 41 min (9,483 words) | 27 min (6,228 words) |
| Reading, closed details | 1 min (298 words) | 14 min (3,191 words) |
| Other tabs, core | ANN lab 2 + side 3 = 5 min (Further reading 3.5 apart) | side 3 min |
| Visuals drawn in Reading | 1 (plus the inverted-index stepper, HTML) | 10 (plus the stepper and the calculator) |

Why 27 minutes is right: the page covers two complete search stacks (lexical and vector), their fusion, the choice between Postgres and five dedicated stores, and how to run an index, each with a measured number, a picture and the SQL a reader would deploy. Every core unit in the ledger is needed for one of those decisions; about a fifth of the core words are figure captions and stepper text. What made the old page long (tables restating the charts, provenance, the old page's corrections, per-product notes, mistakes, numbers, glossary) is now closed and optional, which is why the closed time grew from 1 to 14 minutes.

## Knowledge ledger (`ledger.json`, `python3 html_utils/ledger.py check`: problems 0)
380 units: core 284, depth 66, volatile 15 (product versions and dates, kept in the one dated table of section 12), fat 15. 360 were drafted from the old page by `ledger.py init`; 20 were added by hand for script-drawn figures and tables and for the new design facts (multi-tenancy per store, storage tiers, the rebuild pattern).

## Departures from the page-kind shape, and why
- No dedicated vector database was run locally; the design comparison is from vendor documentation and says so, and the only head-to-head numbers are vendor-run.
- No real images: nothing physical to show on a mechanism page.
