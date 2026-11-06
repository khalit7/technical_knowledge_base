# Source of the page

`sh build.sh` writes `../index.html` from `parts/` (HTML parts in name order, each JS part in its own `<script>`, the tab wiring last; `{{text|url}}` links expand, `n:<id>` to Notion). `python3 build_data.py` regenerates `parts/22_js_data.js` from `inputs/*.json`.

## Parts (rebuilt 2026-10-24)
- `01_head.html` (the root's look, plus the eased-step CSS since 2026-11-06), `02_split.html` (split layout, skill template), `05z_errbox.js.html`, `21_js_rd_common.js` and `99_js_tabs.js` (storage key `nq-tab`): the explainer-page skill templates; since 2026-11-06 animations play once in view.
- `10_header.html`: title, subtitle with "Reading: 48 min, plus 16 in closed details.", tabs (Reading, Further reading).
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

## The 2026-11-06 pass: split layout, five 3D stages (renderer v2), explained and autoplaying animations
- **Templates**: `02_split.html` (in `build.sh` after `01_head.html`; `.w` now closed), `21_js_rd_common.js`, `99_js_tabs.js` (key `nq-tab`), `05z_errbox.js.html`; the renderer `25_js_s3.js` copied unchanged as `45_js_s3.js` (after the data and 2D scripts, before the scenes `50` to `54`). `20_read_a.html` keeps the stage bar on one line (the page's own `.an-ctl` wraps).
- **Split layout** (Reading): top (Fig. 1 beside the core sentence and its step list; the six family cards, You need, terms and habits full width); 2 (the latest-50 animation beside its four step lists); 3 three times (leaderboard chart, rate-limit chart, Fig. 2); 4 twice (single-table lab beside the key design, its two panes stacked in the column; hot-partition calculator); 5 (embedded against referenced); 6 twice (Fig. 3; quorum calculator); 7 twice (Fig. 4; cardinality calculator); 8 twice (Fig. 5; the k-hop chart and table). Full width: section 1, tables, code, persistence, streams, the measured tables, Choosing and Depth.
- **Five 3D stages**, one scene each:
  - Fig. 1 (`50_js_sc_hero.js`, 7 steps): the six families side by side, then one per step with the camera in close: Redis keys and structures (GET median from `NQ.redis.get_us`), DynamoDB partitions and the `CHAT#7` item collection, a chat document with nested fields and referenced messages, a Cassandra ring with token and three replicas, daily chunks with retention, a graph with the measured shortest path (`NQ.graph.neo4j.shortest`). Shapes illustrative and labelled so. Replaces the six small SVG drawings (`35_js_rd_hero.js`, deleted); the family cards stay as text.
  - Fig. 2 (`51_js_sc_fo.js`, 5 steps): the measured failover (`NQ.redis.replication`): one slab per 1,000 acknowledged 10 KB writes, flows for writes, OKs and copies, the 53 that slipped through, 4,947 lost. Replaces the 2D stepper (`37_js_rd_fo.js`, deleted).
  - Fig. 3 (`52_js_sc_wp.js`, 6 steps): a write at QUORUM on a six-node ring, RF 3, C down: coordinator, token, commit log and memtable on A and B, acks, the hint for C, flush to an SSTable (`commitlog_sync` from `NQ.wide.cass_defaults`). Layout illustrative. Replaces `40_js_rd_wp.js` (deleted).
  - Fig. 4 (`53_js_sc_ts.js`, 6 steps): one big table against 30 daily partitions with every measured cost from `NQ.ts.pg` (last hour, raw chart, rollup to scale, DROP, DELETE). Replaces the three-way toggle (`41_js_rd_tsd.js`, deleted); its captions became the step list.
  - Fig. 5 (`54_js_sc_graph.js`, 5 steps): new. A traversal from user 24204 with the measured within-k-hop counts (`NQ.graph.neo4j.counts`, sample 0): 27 friends as dots, 891 as dots (one per 10), 29,933 and 99,898 as floor area to scale on the 100,000-user disc, then the measured shortest path. Positions illustrative.
- **2D animation, now explained and autoplaying**: section 2's latest-50 animation keeps its four modes; its per-step captions became four step lists (`sx-lat-*`, filled from the same data at load, swapped by `reset(n,list)`), the caption box is gone.
- **Kept 2D, and why**: the latest-50 page strip (a 1D file layout with lit pages, four measured modes), leaderboard rank cost, rate-limit race, embedded against referenced (numbers to scale on an axis), the k-hop timing chart (log axis); the lab, the hot-partition, quorum and cardinality calculators (widgets the reader drives). No DynamoDB-only stage: Fig. 1's DynamoDB step and the lab carry the partition picture.
- **Text**: card titles of the replaced figures became step-list items or intro sentences (the time-series one opens section 7's list, ledger unit 411); SVG labels under 11 px in the latest-50 figure raised to 11.
- **Checks**: `check_stages.mjs` new (from the analytics sibling: autoplay in view for the five stages and the latest-50 animation in all four modes, one list item per step, flows stop off screen, nothing moves under reduced motion, splits are two columns at 1400 px); `check_ui.mjs` no longer steps the removed steppers and toggle (it ran them under reduced motion, which is still how it runs).

## Length judgement, 2026-11-06
| | Before (audit 2026-11-06) | After |
|---|---|---|
| Reading core | 9,629 words, 41.9 min | 11,003 words, 47.8 min (header 48) |
| Reading in closed blocks | 3,679 words, 16.0 min | 3,679 words, 16.0 min |
| Further reading | 753 | 753 |
| Visuals inline (audit count, SVG only) | 14 | 10 (five stages are canvases; the six hero drawings, failover, write path and time-series SVGs replaced) |

The core grew by about six minutes, all of it step lists: Fig. 1's seven steps (new: the hero had only drawings), Fig. 5's five (new), and the lists of Figs. 2 to 4 and the latest-50 animation, which carry the captions that used to show one at a time inside each card. The step lists hold about 1,340 words; about 510 of them are the latest-50 captions in four lists, of which a reader sees one at a time (about 390 hidden words are counted). Nothing was cut.

## Ledger, 2026-11-06
411 units: core 325, depth 57, volatile 8, fat 21; `python3 html_utils/ledger.py check` problems 0. Unit 411's key now sits in section 7's intro sentence; unit 370's key follows the Further reading tab's quoted time for Analytics (47 minutes; that line was already changed in the working tree before this pass).
