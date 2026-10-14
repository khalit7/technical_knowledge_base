# RAG in production: source

Child page of Topic: rag-and-retrieval. `sh build.sh` writes `../index.html` from `parts/`; numbers in the prose are written `@@key@@` and filled from `facts.json`, which `build_data.py` makes from `data/` (measured here) and `inputs/` (published prices, the constructed corpus), together with `parts/22_prd_data.js` (the data the page's JavaScript reads).

## Parts
- `01_head.html` (shared CSS, copied from the root), `10_header.html` (title, tabs), `20_read_a` to `20_read_f.html` and `20_read_z.html` (Reading tab), `24_prd_rd.js` (Reading widgets: predict, freshness calculator, backfill animation, purge table, end-to-end table, charts).
- Tabs: `31_tab_lat.html` + `31_prd_lat.js` (Latency waterfall), `32_tab_cost.html` + `32_prd_cost.js` (Cost calculator), `33_tab_acl.html` + `33_prd_acl.js` (Access lab), `34_tab_cache.html` + `34_prd_cache.js` (Cache lab), `39_tab_more.html` (Further reading).
- `05z_errbox.js.html`, `21_js_rd_common.js`, `99_js_tabs.js` copied from the root (storage key `prd-tab`). Ids and classes carry the prefixes `prd-`, `pla-`, `pco-`, `pac-`, `prc-`.

## How to rerun
```sh
export RAG_SCRATCH=<the shared rag setup folder>
P="$RAG_SCRATCH/venv/bin/python -I -B"
cd scripts
# deterministic, no lock (pgvector in Docker: docker run -d --rm --name prd-pg -e POSTGRES_PASSWORD=prdlocal -p 127.0.0.1:8380:5432 pgvector/pgvector:pg17)
$P cache_scifact.py; $P backfill.py; $P encode_noprefix.py; $P monitor.py
$P acl_pg.py; $P purge_pg.py; $P acl_llm.py retrieve; $P pip_gen_summary.py
# generator and timing runs: hold the bench lock ($RAG_SCRATCH/../inf/lock.sh acquire bench prd)
$P acl_llm.py generate; $P ttft.py; $P e2e_latency.py
cd ..; python3 build_data.py; sh build.sh; python3 check_data.py
node check_page.mjs ../index.html <screenshot folder>
```
Large intermediates (retrieval contexts, the no-prefix query vectors, llama-server logs) go to `$RAG_SCRATCH/prd/`.

## Inputs
- `inputs/prices.json`: list prices read on 2026-10-14 from the vendors' pages (URLs per row).
- `inputs/acl_corpus.json`: a constructed corpus (fictional company) for the prompt-rule and planted-instruction tests.
- The running example (root `src/data/`), the setup's precomputed embeddings, and the original SciFact release downloaded by the root's Pipeline lab (`$RAG_SCRATCH/pipe/scifact_orig/`, for the SUPPORT / CONTRADICT labels).
- Facts read from siblings: `../../vector_indexes/src/facts.json` (tombstone work), the root's Pipeline lab generator records (`pip_gen_summary.py`).

## Departures from the child-page method
No old page existed, so there is no `live.md` or `coverage.json` (see `coverage.md`). Operational failures have no published figure to reproduce; the waterfall's defaults reproduce this page's own end-to-end run and the cost calculator's defaults the Reading's worked example. See `viz_ideas.md`.
