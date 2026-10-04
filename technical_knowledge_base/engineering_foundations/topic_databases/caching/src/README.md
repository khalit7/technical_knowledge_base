# Source of the page

`sh build.sh` writes `../index.html` from `parts/` (HTML parts in name order, each JS part in its own `<script>`, the tab wiring last; `{{text|url}}` links expand, `n:<id>` to Notion). `python3 build_data.py` regenerates `parts/22_js_data.js` (`window.CA`) from `inputs/*.json`.

## Parts
- `01_head.html`, `05z_errbox.js.html`, `21_js_rd_common.js`, `99_js_tabs.js`: copied from the sibling NoSQL in practice (the root's look and the step-animation controller `RD.anim`).
- `10_header.html`: title and tabs (Reading, Cache lab, Threshold lab, Further reading).
- `20_read_a.html` (styles) to `20_read_j.html`: the Reading tab. `b` nav, one screen, section 1; `c` layers; `d` invalidation and consistency; `e` Redis eviction; `f` cost-weighted hit ratio and Redis or Memcached; `g` Postgres and HTTP; `h` KV cache and prompt caching; `i` semantic caching; `j` choosing, mistakes, glossary, footer.
- `23` skew charts, `24` layer ladder, `25` the race animation (before/after), `26` fills `<span class="nv" data-n="path">` from `window.CA`, `27` eviction chart, findings and the cost-weighted table (also `window.CAEV`, used by the lab), `28` Postgres tables, `29` KV calculator, price table, break-even calculator, semantic curves, `32` glossary.
- `31_tab_lab.html`, `31_js_lab.js`: Cache lab. `33_tab_sem.html`, `33_js_sem.js`: Threshold lab. `39_tab_more.html`: Further reading.

## Measurements (all real, 5 October 2026, Apple M1 Pro, 16 GB, macOS)
Everything runs from a scratch directory, never inside the repo. Setup: Redis 8.8.0 from conda-forge (`micromamba create -p env -c conda-forge redis-server=8.8.0`, as in `../../nosql_in_practice/src/README.md`); PostgreSQL 16.2 = the pgserver wheel's `pginstall` copied with contrib `pg_buffercache` and `pg_prewarm` built against it (`make USE_PGXS=1 PG_CONFIG=<copy>/bin/pg_config install`, as in `../../storage_engines_and_indexes/src/README.md`) into `pg16/`; the data directory is an APFS clone (`cp -c -R`) of the root's 10-million-message chat database (`../../src/plan/gen.py`) into `pgdata/`. Downloads into the scratch directory (not committed): `pv.gz` and `pv_06.gz` to `pv_11.gz` (Wikimedia pageviews of 2026-09-15, hours 12 and 06 to 11), `qqp_val.parquet` (GLUE QQP validation), `paws_test.parquet` (PAWS labeled_final test).

Each script: `CA_SCRATCH=$PWD CA_REDIS=<path to redis-server> uv run --no-project --python 3.12 --with numpy --with redis --with 'psycopg[binary]' python <this folder>/measure/<script>` (add `--with pandas --with pyarrow --with torch --with sentence-transformers` for `m_sem.py`). `measure/common.py` checks every port is free before starting a server (other agents run servers on this machine; ports in use are refused).
- `m_skew.py` (1 min): skew of the 12:00 hour, Zipf fit, and the request traces (real hour, Zipf 0.7, 0.9, 1.1). `inputs/skew.json`. `m_skew6.py` (3 min): six hours, hour-to-hour overlap and the drifting trace. `inputs/skew6.json`.
- `m_evict.py`: Redis cache-aside replays, 2,000,000 requests per run. Run per workload (`only=wiki`, `only=wiki6h`, ...; about 5 minutes each alone) and `extras` (maxmemory-samples 10, volatile-lru; about 3 minutes); the recorded run did all workloads in one invocation (about 40 minutes, sharing the CPU with the embedding job). `inputs/evict.json`.
- `m_sim.py` (about 2 minutes): exact LRU, FIFO, LFU, OPT and GreedyDual on the same traces. `inputs/sim.json`.
- `m_pg.py` (about 6 minutes; steps `costs mv memo warm`): miss costs, materialised view, Memoize, restart and pg_prewarm with `track_io_timing`. `inputs/pg.json`.
- `m_race.py` (about 2 minutes): the write/fill race, 400 trials per strategy. `inputs/race.json`.
- `m_sem.py` (about 4 minutes, torch threads 2): semantic cache threshold sweep. `inputs/sem.json`.
- `m_layers.py` (seconds): in-process and page-cache latencies. `inputs/layers.json`.
- `inputs/prices.json` and `inputs/kv.json` are hand-entered from the documents saved in `inputs/docs/` (read 2026-10-05) and `inputs/cfg/` (Hugging Face config.json files).
- `check_ui.mjs` (run from the repo root) clicks every control at 390 dark and 920 light and writes `page_numbers.json`; then `python3 recompute.py` checks 42 page numbers against the inputs and writes `recompute_out.json`.

## Notes and departures
- The child method's shape fits (one screen, mechanisms in order, production, mistakes); the page is long (about 45 minutes) because it owns the depth on invalidation, Redis eviction and the LLM caches, while the patterns, stampedes and CDNs stay on Capacity planning and performance and are linked.
- The Wikipedia traces have no ordering inside an hour (hourly counts only), so they carry real skew and slow drift but no bursts; the page says so where the LRU/LFU comparison is drawn.
- The race's stale shares depend on the forced timings; the page reports them as such and draws its conclusion from the zeros.
- Redis's memory limit includes per-key overhead, so runs hold about 2% fewer keys than the nominal size; the simulations use the nominal size.
- Memoize only appeared with hash and merge joins disabled: the planner preferred a slower hash join. The page shows all three plans and says why it forced them.
- Size about 265 KB.
