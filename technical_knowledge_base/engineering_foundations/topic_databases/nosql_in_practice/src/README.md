# Source of the page

`sh build.sh` writes `../index.html` from `parts/` (HTML parts in name order, each JS part in its own `<script>`, the tab wiring last; `{{text|url}}` links expand, `n:<id>` to Notion). `python3 build_data.py` regenerates `parts/22_js_data.js` from `inputs/*.json`.

## Parts
- `01_head.html`, `05z_errbox.js.html`, `21_js_rd_common.js`, `99_js_tabs.js`: copied from the sibling Transactions and concurrency (the root's look and the step-animation controller `RD.anim`).
- `10_header.html`: title and tabs (Reading, Single-table lab, Further reading).
- `20_read_a.html` (styles, section nav) to `20_read_j.html` (choosing, mistakes, glossary, footer): the Reading tab. One screen and section 1 in `b`, section 2 in `c`, Redis `d`, DynamoDB `e`, documents `f`, wide-column `g`, time series `h`, graph and embedded engines `i`.
- `22_js_data.js`: generated (`window.NQ`), do not edit.
- `23_js_rd_lat.js`: the before/after animation of section 2 (four layouts, real plans and trace).
- `24` Redis, `25` DynamoDB, `27` documents, `28` wide-column (quorum calculator, tombstones), `29` time series (cardinality calculator), `30` graph: each section's tables and charts.
- `26_js_fill.js`: fills `<span class="nv" data-n="path">` in the prose from `window.NQ`, so prose numbers follow the measurements (a missing path shows in the error box).
- `31_tab_lab.html`, `31_js_lab.js`: the Single-table lab. `32_js_gloss.js`: glossary. `39_tab_more.html`: Further reading.

## Measurements (all real, 4 and 5 October 2026, Apple M1 Pro, 16 GB, macOS)
Everything runs from a scratch directory, never inside the repo; nothing is installed system-wide. Setup in the scratch directory:
```
micromamba create -p env -c conda-forge redis-server=8.8.0 mongodb=8.0.23 openjdk=17
micromamba create -p jdk25 -c conda-forge openjdk=25          # Neo4j 2026.x needs Java 21 or 25
curl https://dlcdn.apache.org/cassandra/5.0.9/apache-cassandra-5.0.9-bin.tar.gz | tar xz
curl https://d1ni2b6xgvw0s0.cloudfront.net/v2.x/dynamodb_local_latest.tar.gz | tar xz -C ddb      # DynamoDB Local 3.3.1
curl https://dist.neo4j.org/neo4j-community-2026.09.0-unix.tar.gz | tar xz
```
Each script: `NQ_SCRATCH=$PWD uv run --no-project --python 3.12 --with pgserver --with redis --with pymongo --with boto3 --with cassandra-driver --with duckdb --with 'psycopg[binary]' --with neo4j --with kuzu python <this folder>/measure/<script>`. `measure/common.py` picks a port for every server only after checking nothing listens there (other agents run servers on this machine; ports in use are refused).
- `m_redis.py` (about 4 min): GET latency, `redis-benchmark`, a 100,000-member leaderboard, the rate-limit race (16 processes, naive against the Lua token bucket shown on the page verbatim), three limiter algorithms, a stream with a crashed consumer, throughput under four persistence settings, a `kill -9` test for RDB and AOF, and failover after a paused replica (`repl` argument reruns only that). `inputs/redis.json`.
- `m_rank.py` (1 min): the same scores in Postgres; top 10 and ranks by count. `inputs/rank.json`.
- `m_wide.py` (pg 3 min; cass about 15 min with the 1M-row load): the root's 1M-message generator (same SQL and seed) plus 20 long chats; "latest 50" without index, with index, after CLUSTER; then the same rows in Cassandra 5.0.9 (2 GB heap, one node) with tracing, the refused query, and tombstones (0, 5,000 and 101,000 deleted). `cassq` reuses a loaded node. Writes the shared `wide_msgs.csv` that m_doc and m_ddb read. `inputs/wide.json`.
- `m_ddb.py` (2 min): single-table design on DynamoDB Local with chats 1 to 3,000; every access pattern with items read and capacity; the transaction, the duplicate email, the errors. `inputs/ddb.json`.
- `m_doc.py` (6 min): MongoDB 8.0.23 one-member replica set, referenced against embedded, appends, the 16 MB limit, aggregation, a transaction and a write conflict, validation; Postgres columns against jsonb (per message, per chat), GIN, appends with log bytes over 200 appends. `inputs/doc.json`.
- `m_ts.py` (5 min): 5,184,000 request rows; one table against daily partitions, rollup, BRIN, retention by DELETE and DROP; DuckDB on Parquet. `inputs/ts.json`.
- `m_graph.py` (8 min, Kuzu at 4 hops is most of it) and `m_graph_sp.py` (2 min): a 100,000-user Barabasi-Albert friends graph; k-hop counts on Postgres (recursive CTE and a join per hop), Neo4j 2026.09.0 and Kuzu 0.11.3; shortest path. `inputs/graph.json`.
- `recompute.py`: 44 checks that every number in the prose and every JS-filled number match the inputs (and assertions behind the claims: identical graph counts, Postgres fastest up to 3 hops, the RCU formula reproduces DynamoDB Local's 1.5 units). Run after `node check_ui.mjs` (from the repo root), which clicks every control at 390 dark and 920 light and writes `page_numbers.json`.

## Notes and departures
- TimescaleDB has no conda-forge build for this machine, so its two ideas (time chunks, rollups) are measured with native Postgres partitioning and a rollup table and the extension is described from the root atlas.
- Timings from different systems are measured differently (Postgres: server execution time; Redis, MongoDB, Cassandra, Neo4j: client round trip over loopback; Kuzu, DuckDB: in process). The page says which and compares counts (pages, rows, items) where timings are not comparable.
- DynamoDB Local runs the API, not the service: counts and capacity units are real, latency and throttling are not measured. It charged 8 write units for a transaction the documented rules price at 6; the page shows both.
- The Cassandra load statistics are not in `wide.json`: the final run reused the node loaded by an earlier run that stopped at a driver API error after loading (`cassq`).
- The plain-row insert's write-ahead log volume came out at about 8.5 KB per insert even averaged over 200 inserts (unexplained), so the page compares log volume only between the two jsonb document sizes.
- The child-page method suggests one before/after animation: section 2 is it (four layouts of the same request). The other mechanisms are shown as measured tables and two calculators (quorum, cardinality) rather than more animations.
- Size about 208 KB.
