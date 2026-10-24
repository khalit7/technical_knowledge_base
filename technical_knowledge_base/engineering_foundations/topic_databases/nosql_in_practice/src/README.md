# Source of the page

`sh build.sh` writes `../index.html` from `parts/` (HTML parts in name order, each JS part in its own `<script>`, the tab wiring last; `{{text|url}}` links expand, `n:<id>` to Notion). `python3 build_data.py` regenerates `parts/22_js_data.js` from `inputs/*.json`.

## Parts (rebuilt 2026-10-24)
- `01_head.html`, `05z_errbox.js.html`: the root's look. `21_js_rd_common.js` and `99_js_tabs.js`: the explainer-page skill templates (never autoplay; storage key `nq-tab`).
- `10_header.html`: title, subtitle with "Reading: 42 min, plus 16 in closed details.", tabs (Reading, Further reading).
- `20_read_a.html` (styles, section nav), `b` (the idea: core sentence, hero, You need, new terms, habits; section 1), `c` section 2, `d` Redis, `e` DynamoDB (with the single-table lab and hot-partition calculator inline, their CSS scoped under `#rd-lab`), `f` documents, `g` wide-column, `h` time series, `i` graph, `j` choosing and the closed Depth blocks (production settings, mistakes, embedded engines, the dated versions/licences/prices table, glossary), footer.
- `22_js_data.js`: generated (`window.NQ`), do not edit. `23` the section 2 before/after animation; `24` Redis tables; `25` DynamoDB; `26` prose numbers (`.nv` spans); `27` documents; `28` wide-column (quorum calculator, tombstones); `29` time series (cardinality); `30` graph; `31_js_lab.js` the single-table lab (now drawn with the Reading tab); `32` glossary.
- New visuals: `35_js_rd_hero.js` (hero, six small static drawings), `36_js_rd_lb.js` (rank cost against rank, measured), `37_js_rd_fo.js` (Redis failover stepper, measured), `38_js_rd_docfig.js` (embedded against referenced, to scale, and the 16 MiB ruler), `40_js_rd_wp.js` (Cassandra write path stepper, illustrative layout, documented rules), `41_js_rd_tsd.js` (time-series toggle: last hour, 30-day chart, retention).
- `39_tab_more.html`: Further reading.

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
- `recompute.py`: 44 checks that every number in the prose and every JS-filled number match the inputs (and assertions behind the claims: identical graph counts, Postgres fastest up to 3 hops, the RCU formula reproduces DynamoDB Local's 1.5 units). Run after `node check_ui.mjs` (from the repo root), which clicks every control at 390 dark and 920 light (including every step of the three steppers and checks that none moves on its own) and writes `page_numbers.json`.

## Notes and departures
- TimescaleDB has no conda-forge build for this machine, so its two ideas (time chunks, rollups) are measured with native Postgres partitioning and a rollup table and the extension is described from the root atlas.
- Timings from different systems are measured differently (Postgres: server execution time; Redis, MongoDB, Cassandra, Neo4j: client round trip over loopback; Kuzu, DuckDB: in process). The page says which and compares counts (pages, rows, items) where timings are not comparable.
- DynamoDB Local runs the API, not the service: counts and capacity units are real, latency and throttling are not measured. It charged 8 write units for a transaction the documented rules price at 6; the page shows both.
- The Cassandra load statistics are not in `wide.json`: the final run reused the node loaded by an earlier run that stopped at a driver API error after loading (`cassq`).
- The plain-row insert's write-ahead log volume came out at about 8.5 KB per insert even averaged over 200 inserts (unexplained), so the page compares log volume only between the two jsonb document sizes.
- Size about 208 KB.

## The 2026-10-24 rebuild to the teaching contract: what changed and why
- **Top**: the core idea in one sentence ("every family stores together what one planned question reads ... a question you did not plan becomes a scan"), a hero of six cards (one small drawing per family with the part one planned question reads highlighted, then cheap, hard and when Postgres still does it), You need (root, Distributed systems fundamentals, Storage engines, Caching, Search, GraphRAG), seven new terms. The old one-screen table became the hero cards (same content); the old ownership paragraph became You need.
- **Single-table lab tab removed**: it explains one mechanism (DynamoDB key design), so it now sits inline in section 4 beside the claim it proves, and its hot-partition calculator sits under the hot-partition paragraph. The cost formula note is a closed block inside the calculator.
- **New visuals, each beside its claim**: leaderboard rank cost (static chart, measured), Redis failover (stepper on the measured run), embedded against referenced documents (drawn to scale, measured), Cassandra write path at QUORUM with a down replica (stepper; adds hinted handoff from the Cassandra 5.0 hints page, `max_hint_window` 3 h, checked 2026-10-24), time-series chunks (toggle over the measured numbers). Every card has a title saying what to notice and a predict prompt before it where intuition fails.
- **No autoplay**: template controller; the section 2 mode switch no longer starts playing.
- **Closed depth**: redis-benchmark numbers and Redis 8 extras, the Lua script and limiter algorithms (rate-limit algorithms are Reliability engineering's), the stream run, DynamoDB limits, writes and the 8-against-6 write-unit discrepancy (kept in an Unconfirmed box), the measured access-pattern table, MongoDB indexes, aggregation, the transfer and read-concern caveat, both shapes in numbers, LWT and Accord, compaction strategies, ScyllaDB and Bigtable, the dedicated time-series systems, production settings, mistakes (only those with a measured cost; the rest were restatements), RocksDB and LMDB, glossary.
- **Volatile**: versions, licences (Redis, Valkey, MongoDB SSPL, ScyllaDB, Neo4j, Kuzu archived) and DynamoDB prices moved into one dated table in Depth.
- **Section "Choosing"** now opens with a table: the measured problem, the Postgres-first answer, the store it justifies.

## Length judgement
| | Before (audit 2026-10-23) | After (2026-10-24) |
|---|---|---|
| Reading, core (230 words a minute) | 51.5 min | 41.9 min |
| Reading, closed details | 3.8 min | 16.0 min |
| Single-table lab tab | 4.1 min | moved into Reading |
| Further reading | 3.4 min | 3.2 min |
| Visuals counted in Reading (audit) | 3 | 12 |

Why about 42 minutes: the page owns six families (Redis, DynamoDB, documents, wide-column, time series, graph) plus the choice against Postgres with jsonb, each with a measured result on a real server and the picture that carries it; about a quarter of the core words are the hero cards, figure captions and the inline lab (which used to be a separate 4-minute tab). What is reference, provenance or an edge case is closed.

## Knowledge ledger (`ledger.json`, `python3 html_utils/ledger.py check`: problems 0)
411 units: core 328, depth 57, volatile 8, fat 18. 400 drafted by `ledger.py init`; 11 added by hand for script-drawn tables and the new visuals (their keys sit in static captions and titles). Keys were proposed automatically (the longest phrase of each unit found in the rebuilt page, numbers first) and the generic or failing ones were set by hand; fat units carry a `note`. Volatile units stay on this page, in the dated table, as the brief asked.
