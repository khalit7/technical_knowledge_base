# Source of the page

`sh build.sh` writes `../index.html` from `parts/` (HTML parts in name order, each JS part in its own `<script>`, the tab wiring last; `{{text|url}}` links expand, `n:<id>` to Notion). `python3 build_data.py` regenerates `parts/22_js_data.js` (`window.CA`) from `inputs/*.json`.

## Parts
- `01_head.html`, `05z_errbox.js.html`, `21_js_rd_common.js`, `99_js_tabs.js`: copied from the sibling NoSQL in practice (the root's look and the step-animation controller `RD.anim`).
- `10_header.html`: title, subtitle with the reading time, tabs (Reading, Cache lab, Further reading).
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

Overlap fix (19 October 2026): section 10 no longer teaches the KV cache and prefix caching from zero (the KV calculator was removed, with its checks in `check_ui.mjs` and `recompute.py`; `kv.json` stays in the data but is unused); it points to Topic: inference-and-serving section 2 and Batching, KV cache and scheduling section 3. Section 11 keeps the price table (rules columns dropped), the break-even formula and calculator, and points to Context engineering section 2 for the provider rules. Section 12 links RAG in production for semantic caching in retrieval.

## The 2026-10-24 rebuild to the teaching contract

**What changed and why.**
- **Top**: the core sentence, a static hero (`30_js_rd_hero.js`: every copy one chat request can hit, web lane and LLM lane, hit time and who keeps each correct), "You need", eight new terms. The one-screen table and the "what other pages own" note moved into a closed reference block; the five habits were folded into Choosing.
- **New owned content** (OWNERS: this page now owns the patterns, hit-rate arithmetic, TTLs and jitter, stampedes, local against distributed, CDN caching at the system level), absorbed from Capacity planning and performance's Caching strategy section with its sources: the five patterns with a new toggle diagram (`30_js_rd_pat.js`) and the cache-aside code; hit-rate arithmetic with a new one-slider figure (`30_js_rd_hit.js`, measured Redis GET and usage-aggregate costs, the root's illustrative 1,000 against 600 reads a second); TTL choice and jitter with a new slider (`30_js_rd_stamp.js`, derived peak = N / (300 j)); stampedes with a four-mode toggle (the capacity page's `model.py` `stampede` ported line by line plus a serve-stale mode; 60, 1, 1, 1 queries checked by `recompute.py`), the single-flight code and the defences' quotes in a closed block; Gutter; CDNs and `s-maxage`.
- **Absorbed from ML system design's closed caches block**: OpenAI's "above 15 requests per minute" overflow routing, `prompt_cache_key`, "Caches are not shared across organizations" (all checked against `inputs/docs/oai.txt`), LiteLLM's `redis-semantic` with `similarity_threshold: 0.8`, the GPT Semantic Cache study's "exceeding 97%". Stale citations of ML system design "section 9" now read sections 6 and 7.
- **Threshold lab tab moved into section 12** (it explains one mechanism): `33_js_sem.js` now renders in Reading; the costs and the 10,000-entry view are closed blocks inside the card. The duplicate curves chart of section 12 was removed. The Cache lab stays a tab (it serves sections 5 and 6).
- **Moved to closed blocks**: the ladder table, the pattern table and code, the lease and versioned-key code, remote markers, the Redis policy menu and the approximation details, the script-written eviction findings (a static summary with the same numbers stays in core and is checked against them), Redis against Memcached, the dashboard list, prewarm's table, the materialised view's "when not", Memoize, the dated price table and break-even calculator (volatile; redrawn on opening), published semantic-cache measurements with the old-page correction, the production list, the glossary.
- **No autoplay**: `21_js_rd_common.js` and `99_js_tabs.js` are the skill templates (storage key `ca-tab`); the race no longer starts on a mode switch (checked: still on step 0 after 4 s in view with normal motion).
- **Static numbers**: `prefill.py` (run by `build.sh`) writes every `<span class="nv">` number into the HTML at build time with the same formats as `26_js_fill.js`; `recompute.py` checks that the static and run-time numbers agree (70 spans), so the ledger check sees them.
- **No real images**: the page is about mechanisms; no physical object here is one a photo would teach (the brief's image step), and the Facebook paper's figures are not openly licensed.

## Length judgement
| | Before (audit 2026-10-23) | After (2026-10-24) |
|---|---|---|
| Reading, core (230 words a minute) | 50 min (11,462 words) | 40 min (9,268 words) |
| Reading, closed details | 2 min | 22 min |
| Threshold lab tab | 2.3 min | moved into Reading |
| Cache lab | 1.6 min | 1.6 min |
| Further reading | 5.1 min | 5.4 min |
| Visuals drawn in Reading | 6 | 11 |

40 minutes is right because the page now owns about a dozen concepts that other pages defer to (patterns, invalidation and the race, consistency windows, eviction, hit-rate arithmetic and miss cost, TTLs, jitter and stampedes, CDN policy, Postgres result caching, and the three LLM caches), five of them newly absorbed from Capacity planning (about 1,700 words of core); the core keeps each mechanism with its picture and its measured evidence, and provenance, code, menus and dated prices sit in closed blocks.

**Ledger** (`src/ledger.json`, `python3 html_utils/ledger.py check` prints problems 0): 426 units: core 319, depth 93, volatile 1 (the dated price table, kept here in a dated closed block), fat 13 (wind-ups, the old reading-time line and tab bar, section previews, the lab's try-line). 20 units added by hand for script-rendered tables and absorbed content.

**Checks**: `checkpage.sh` fail=0, emdash 0, errbox 1, clipped 0; `node src/check_ui.mjs` (repo root) 1,716 actions, 0 problems; `python3 src/recompute.py` 71 checks, 0 failed.
