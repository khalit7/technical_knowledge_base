# Coverage of the old root page (Topic: databases)

Source: `live.md`, fetched read only 2026-10-04 (page last edited 2026-09-23). Old page: 28 minutes of dense taxonomy, a 12-row comparison table, a quick chooser, an ML section and a learned-planner section, plus a 7-minute video and two child pages.

New root: a from-zero teaching Reading tab (about 27 minutes, eight sections following the chat product's data from a file to a fleet), three data tabs (SQL playground `t-sql`, Query plans `t-plan`, Database atlas `t-atlas`) and Further reading `t-more`. Most taxonomy detail moved to the **Database atlas** tab (families, products, comparison table, chooser, dated claims in `atlas/claims.json`) and to future children (notes in `for_children/`). Corrections are marked **corrected**; claims nobody could source are marked **unconfirmed** and are not stated as fact on the page.

Abbreviations: R = Reading section (R1..R8, R-one = "in one screen", R-pro, R-gloss), A = Database atlas tab, QP = Query plans tab, SQL = SQL playground, FR = Further reading, FC = `for_children/`.

## Page furniture
| Old fact | Where now |
|---|---|
| `<video>` "Topic: databases: three stacked choices, and the trade every engine made" (7 min, derived from the old page) | Stays on the Notion page untouched; it describes the old page, so ask Khalid whether to keep, remake or delete it |
| `<page>` tags for the two children | Stay on the Notion page; FR lists them as old versions to be rebuilt |
| "28 min read, +62h 20m resources" | Replaced: R says about 27 minutes; FR times each resource |

## Opening
| Old fact | Where now |
|---|---|
| Postgres is the correct default for almost everything | R-one key box, R7 table, R-pro 1 |
| Parquet on object storage queried by DuckDB or ClickHouse is the analytics layer | R5 (measured), R-one fleet picture |
| Redis is the correct cache | R6 key-value card and cache animation |
| Everything else is an escape hatch taken once a measured workload proves the default wrong | R6 title and intro; R-one key box |
| A database is three stacked choices: data model, storage engine, distribution story | Taught in order without the label: data model R1 to R2, storage engine R4 to R5, distribution R6 (distributed SQL), R7 (sharding) and the SWE child Distributed systems fundamentals; A organises products by these layers |
| Most categories are the top layer plus one specialised index; a vector database is an ANN index sold separately | R6 intro ("a data model plus a storage layout tuned for one access pattern") and R8 (pgvector first); A |
| Andrew Ng's 2026 page (mention 3cd5c17b0d0d81b99dd3d1eb12ed5fe0): data management is hard to change later; "the AI doesn't know what it doesn't know" | Dropped as a citation: that page (AI Engineering Skills Map) is marked TO DELETE and its content folded into the SWE root, which FR links. The idea (a database is hard to change later) is R7's opening. The quote itself was not re-verified |
| Mermaid taxonomy (5 groups, 14 leaves, storage engine layer) | A (families and products); R6 cards (nine families) |

## The map (7 min)
| Old fact | Where now |
|---|---|
| OLTP defined | R5 (dfn OLTP) |
| Postgres and MySQL: normalised tables, SQL, constraints, ACID (defined), B-tree row store | R1 (tables, keys), R2 (SQL, constraints, normalisation), R3 (ACID), R4 (pages, B-tree) |
| One node handles low tens of thousands of TPS and several TB | **corrected** in A (claim pg_tps): measured 1,045 / 5,759 / 9,212 tps at 1/8/32 clients without a real flush, 148 / 715 / 2,133 with one (PG 16.2, M1 Pro); R4 and R7 quote 148 and 2,133 |
| Postgres as extension platform: JSONB, pgvector, TimescaleDB, PostGIS, full-text | R6 cards (jsonb, full-text, pgvector); A for TimescaleDB and PostGIS |
| Column stores buy one to two orders of magnitude on aggregate scans and cost cheap point updates | R5: **verified** for this workload (94x fewer bytes measured on 1M rows; QP: 87x at 10M, about 50x faster); cost box covers updates |
| ClickHouse self-hosted, BigQuery and Snowflake managed separated storage, DuckDB in-process | R5 "Where it runs" |
| Lakehouse: Parquet on S3 plus Iceberg, Delta Lake, Hudi; schema evolution, snapshot isolation, time travel via atomic metadata swap; many engines read the same bytes | R5 (dfn lakehouse, one sentence); detail in A; FC analytics storage |
| Redis and Valkey: in-memory data structures, microsecond operations, optional weak durability | R6 key-value card (persistence docs; async replication can lose acknowledged writes); A claim redis verified |
| DynamoDB: single-digit ms at unbounded scale, per request pricing, access paths designed into keys | R6 card (grows without limit if every access names its key); A claim ddb **corrected** (multi-item transactions up to 100 items since 2018; latency is AWS's claim) |
| etcd: Raft-replicated coordination store (Kubernetes) | A (claim etcd verified) |
| MongoDB; JSONB with GIN covers most document workloads | R6 document card (jsonb docs); GIN detail FC storage engines |
| Wide-column: partition key plus clustering columns, table per query, LSM, leaderless quorums, near-linear write scaling, multi-region | R6 wide-column card (Cassandra data-modelling docs); LSM and quorums A and FC |
| Vector: ANN defined; pgvector; Qdrant filtered traversal; Milvus; Weaviate; LanceDB; Vespa; Turbopuffer | R6 vector card and R8; products in A (qdrant verified; Turbopuffer **corrected**: warm 14 ms median, cold 874 ms, cost advantage is the vendor's claim) |
| Vector search is an index type: recall tuned not guaranteed, index build expensive, filtered search is where implementations differ | R8 (recall, filtering after the index scan in pgvector, iterative scans 0.8.0) |
| Graph: Neo4j, Memgraph; index-free adjacency; wins for variable depth; recursive CTE for fixed hops | R6 graph card; index-free adjacency in A |
| Time-series: Prometheus single node plus remote storage (VictoriaMetrics, Thanos, Mimir, Cortex), TimescaleDB hypertables, InfluxDB v3 on Parquet and DataFusion, ClickHouse often beats a dedicated TSDB | R6 time-series card (ClickHouse often does the same job); A (prom verified, thanos **corrected**, influx verified) |
| Search: Elasticsearch and OpenSearch, BM25 (defined), facets, dense vectors, near-real-time, eventually consistent, reindexing routine | R6 search card (BM25 default per Elastic docs; derived copy; about a second of delay) |
| Embedded: SQLite most deployed, DuckDB, RocksDB and LMDB; zero network hop; one writer | R6 embedded card (sqlite.org: over a trillion databases; one writer at a time); RocksDB and LMDB in A |
| Distributed SQL: CockroachDB, TiDB, YugabyteDB, Spanner with Raft or Paxos; Vitess sharded MySQL (YouTube, Slack); latency floor, expensive cross-shard transactions | R6 card; Vitess and Spanner in A (both verified) |

## Cross-cutting axes
| Old fact | Where now |
|---|---|
| OLTP against OLAP decides row or column store; analytics off the primary | R5, R-pro 4 |
| Row store point lookup one page; column store compresses (run-length, dictionary, delta); columnar updates rewrite blocks | R5 (role column 254,530 to 862 bytes measured; cost box) |
| B-tree against LSM-tree; read and write amplification | A (engines); FC storage engines (amplification numbers unconfirmed, see read/children_notes.md) |
| Normalise for correctness, denormalise for reads; the cost is the update anomaly | R2 (update anomaly, normalisation, denormalisation) |
| Index: redundant ordered copy; slows writes, burdens the planner; cardinality, selectivity, composite order, covering, sargability | R4 (index, cost box); QP (real plans); FC storage engines and planner |
| Read committed allows non-repeatable reads, lost updates, write skew; RR/SI stops most but not write skew; serializable costs retries; SELECT FOR UPDATE; name the anomaly | R3, **verified** against the Postgres docs table and measured (lost update reproduced under read committed; FOR UPDATE and serializable prevent it); A claim pg_iso verified |
| Replication and partitioning orthogonal; shard key hard to reverse | R7 (one-way doors); SWE Distributed systems fundamentals |
| CAP and PACELC; Spanner commit wait against TrueTime | Linked: SWE root and Distributed systems fundamentals own it; Spanner verified in A |
| Data lifecycle: retention, archival, deletion, erasure, residency, audit | R7 (last paragraph) |
| Categories converging: Postgres absorbs neighbours; specialists move to shared substrate; feature store is two databases | R6 intro, R8 feature stores; A |

## How to choose and the comparison table
| Old fact | Where now |
|---|---|
| Five questions in order (access patterns, invariants, write volume and shape, how much you know, what the team can operate) | R7 (all five, applied to the chat product in a table) |
| One-way doors: shard key and partition key | R7 |
| Comparison table: 12 types by systems, data model, consistency and scaling, reach for it when, avoid when | A (the atlas owns the full comparison); R6 cards carry "forced by / costs" per family |
| Document "avoid when": schema chaos, denormalise-everything collapses | R6 document card ("no schema becomes many schemas") |
| Vector "avoid when": under about 10M vectors pgvector wins | **unconfirmed** (no published measurement; A claim pgv_10m); R8 says so and tells the reader to measure |

## The ML and LLM angle
| Old fact | Where now |
|---|---|
| Postgres plus pgvector is the default for RAG: metadata, tenancy, permissions, provenance, delete path; one transaction, backup, failover | R8 |
| HNSW defined; pgvector serves millions at single-digit ms | R8 defines HNSW (paper); the latency claim is **unconfirmed** and not stated |
| Postgres full-text gives the lexical half of hybrid retrieval | R6 search card (Postgres full-text enough for modest volumes); hybrid retrieval in Topic: rag-and-retrieval (linked) |
| Dedicated vector DB when past about 100M vectors, filtered search, per-tenant isolation, strict p99 under 10 ms, independent rebuilds, quantisation and disk indexes | R8 (condensed: outgrowing one server, filtered search, independent scaling); thresholds **unconfirmed**; per-tenant and quantisation detail FC vector search |
| 1536-d float32 about 6 KB; 100M about 600 GB; scalar or binary quantisation first, Matryoshka second | R8: **verified and refined** (6,144 bytes of floats, 6,152 in pgvector; 100M about 615 GB; halfvec halves it); Matryoshka FC |
| Feature stores: offline columnar store, online key-value store, same transformation, Feast and Tecton | R8 (Feast docs quoted) |
| DuckDB first for analytics: Parquet, CSV, JSON, Iceberg, Delta in place, local or S3, tens of GB on a laptop, beats Spark on time to answer, zero-copy Arrow with pandas and Polars | R5 and R8 (in place, laptop scale, measured); format list and Arrow FC analytics storage |
| AWS bought DuckLabs (Amsterdam) in August 2026; DuckDB stays MIT under the DuckDB Foundation; Mühleisen and Raasveldt continue to lead | R8: **verified** (announcement 2026-08-26: DuckLabs joins AWS as a subsidiary; MIT; Foundation stewardship); closing 2026-08-31 per A; "continue to lead" **unconfirmed** (not in the announcement), not stated |
| Rest of the ML data path: Parquet layout matters more than engine; Kafka as event backbone; Redis for semantic cache, rate limits, job state; ClickHouse for token and cost analytics; Postgres for everything else including the eval registry | R-one fleet picture and R7 table (Postgres, Redis, column store); Kafka linked via Queues, streams and async work; Parquet layout FC analytics storage; semantic cache FC caching |

## Learned query plans
| Old fact | Where now |
|---|---|
| Rohan Bansal, Empero's Qwen 3.8 4B distillation, Sep 16 2026 | R8, verified |
| 695 points on Hacker News | **unconfirmed**, dropped |
| "First result in this KB where an LM beats a mature optimiser" | Dropped (editorial) |
| 113 JOB queries, about 13.6k CEB training queries | R8, verified (13,646); **corrected**: JOB was watched during development, so not held out |
| 1.81x geometric mean, best of three rollouts | R8, **corrected**: best of three rollouts of up to 5 candidates each (up to 15); the model's own pick gave 1.40x with 7 regressions; the model writes pg_hint_plan hints |
| 44.7% latency reduction; zero regressions with best of three | R8, verified (zero only for best-of selection) |
| Base model failed 72% of the time | **corrected**: untrained model produced no plan for 99 of 113 queries (88%) |
| Why it works: cardinality estimates wrong on correlated predicates | R4 (planner goes wrong with correlated columns); QP demonstrates it (estimate 129 against 7,411 actual, fixed with CREATE STATISTICS) |
| Economics: only for repeated analytic queries, never transactional traffic | R8 |
| Measurement discipline: four Postgres containers, shared_buffers 2 GB, best-of reported explicitly, cache warming | R8 (warm until hit and read counts stable within 2%, verified); containers and shared_buffers in read/children_notes.md |
| Training recipe on the training topic | R8 go-deeper and FR link Topic: llm-training-and-post-training |
| Write-up link (30 min) | R8 and FR |

## Quick chooser, deep dives, related, resources
| Old fact | Where now |
|---|---|
| Quick chooser (14 bullets) | A (chooser); R7 applies the method to the chat product |
| Deep dives table (two children with contents and times) | FR "Child pages of this topic (old versions, to be rebuilt)" with times; contents checked in read/children_notes.md |
| Related topics: swe-and-system-design, rag-and-retrieval, ml-infra-and-orchestration, data-curation-and-datasets | FR (all four, plus the training topic and seven SWE child pages) |
| DDIA 2nd ed., Kleppmann and Riccomini, O'Reilly, March 2026 (~15h) | FR path step 4, verified |
| Database Internals, Petrov, O'Reilly 2019 (~9h 25m) | FR path step 6, verified |
| CMU 15-445 (Andy Pavlo), ~30h | FR path step 5, **corrected**: Fall 2026 is taught by Jignesh Patel (videos on CMU Panopto); Pavlo's Fall 2025 lectures are public on YouTube |
| Use The Index, Luke (~4h) | FR path step 2, verified |
| Jepsen analyses (~3h) | FR path step 7 (plus the consistency map and the 2025 RDS analysis) |
| Just Use Postgres for Everything (Schmidt, ~10 min) | FR papers and sources, link checked (HTTP 200) |
| Kreps, "The Log" (LinkedIn 2013, ~45 min) | FR path step 8, **corrected link**: the old URL (with "-abstraction") never resolved and the real LinkedIn URL returned 404 on 2026-10-04; linked to the Internet Archive copy of 2026-06-12 |

## Counts
About 95 distinct facts in the old root: about 60 carried in the Reading (R1 to R8), about 25 carried by the Database atlas (products, comparison table, chooser, per-product claims) and linked from R6 and R7, 4 linked to the SWE pages that own them (CAP, PACELC, replication detail, Kafka), the rest moved to `for_children/`. Corrected: 9 (write TPS, DynamoDB transactions, Turbopuffer, Thanos, QORL best-of and held-out, QORL base-model 72%, CMU instructor, Kreps link, vector bytes refined). Unconfirmed and not stated: 6 (pgvector single-digit ms at millions, 10M and 100M thresholds, Hacker News points, "continue to lead", Ng quote, first-in-KB editorial).
