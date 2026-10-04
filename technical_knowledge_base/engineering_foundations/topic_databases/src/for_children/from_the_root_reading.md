# Material for the children of Topic: databases (from the Reading agent, 2026-10-04)

The new root teaches from zero in about 27 minutes and keeps only intuition plus one measured animation per idea. The old root's taxonomy detail lives in the Database atlas tab; what neither carries is listed here, per proposed child, with its status from `../read/children_notes.md` and `../coverage.md`. Each Reading section ends with a "child page coming" note that should link the child once it exists.

## SQL in depth (Reading section 2 says "a child page on SQL in depth is coming")
- Window functions, CTEs (including recursive CTEs for fixed-depth graph walks, from the old root's graph row), upserts, NULL semantics, dialect differences (Postgres, MySQL, SQLite).
- Normal forms 1NF to BCNF properly (Codd 1970 and 1971), with the chat schema as the example.
- Migrations in production (adding a column, backfills, locks taken by ALTER TABLE).

## Transactions and isolation (section 3)
- Full anomaly catalogue (Berenson et al. 1995; Adya), with the chat product: lost update (measured here), write skew (two doctors on call), phantoms, read-only anomalies.
- Postgres internals: snapshots, xmin/xmax, SSI predicate locks, serialization failures and retry loops; VACUUM, bloat, long transactions.
- Defaults that surprise (from the atlas): MySQL repeatable read weaker than its name (Jepsen MySQL 8.0.34, 2023-12-19); Jepsen RDS for PostgreSQL 17.4 Long Fork on multi-AZ clusters (2025-04-29); ClickHouse not fsyncing inserts by default; Redis async replication losing acknowledged writes.
- Measurement harness: `../read/measure_read.py` already runs two real psql sessions; extend it to write skew and to repeatable read.

## Storage engines, indexes and the planner (section 4; rebuilds the old child "Storage engines, indexes, and the physics of a query")
- B-tree against LSM-tree, RUM conjecture, read, write and space amplification (old numbers unconfirmed: measure them, e.g. RocksDB db_bench and pg_stat_wal), levelled against tiered compaction, tombstones, bloom filters (10 bits per key gives 0.82%, derived).
- HOT updates and index write cost; GIN (pending list), GiST, SP-GiST, BRIN, hash; composite index order, covering and index-only scans, sargability, expression indexes, partial indexes.
- WAL detail: full-page writes, checkpoints and their IO spikes, synchronous_commit, group commit (measured 148 to 2,133 tps with real flushes, `../atlas/inputs/pg_tps.json`), fsync failure handling.
- Planner: statistics, default_statistics_target, extended statistics (the Query plans tab measured 129 estimated against 7,411 actual rows, fixed with CREATE STATISTICS), generic plans, cost constants (random_page_cost default 4).
- B-tree depth: pageinspect is not in the pgserver wheel; to show real tree levels, install an extension-capable Postgres or compute from bt_metap elsewhere. The Reading's tree is labelled as drawn.
- The latency table, re-based on measurements (see children_notes.md "Latency table").

## Caching (rebuilds the old child "Caching: types, policies, and semantic caching")
- Layers, read and write strategies, eviction (Redis menu now includes allkeys-lrm and volatile-lrm, Redis 8.6), invalidation, stampede (single-flight, XFetch), hot keys, stale reads under replication, cost-weighted hit ratio.
- Corrections to carry: Facebook memcache PDF link (nsdi13-final170_update.pdf), Anthropic break-even is 1.28 total uses (a single read pays), not "1.3 reads".
- LLM caches (KV, prefix, provider prompt caching, semantic caching) overlap with the LLM serving pages; link rather than repeat, and re-check every price there.
- Reading section 6's animation (TTL against delete-on-write) is the root's whole treatment; the capacity-planning SWE child owns hit rates under load.

## Vector search (sections 6 and 8)
- ANN families: flat, HNSW (M, ef_construction, ef_search; pgvector defaults 16, 64, 40), IVF and IVF-PQ, DiskANN, ScaNN, quantisation (int8 4x, binary 32x, Matryoshka dimensions).
- Filtered search: pre-filter, post-filter, in-traversal (Qdrant), pgvector iterative scans since 0.8.0.
- When a dedicated store wins: the old 10M and 100M thresholds are unconfirmed; measure recall at k and latency on the chat corpus with pgvector against one dedicated store.
- Memory: 6,152 bytes per 1,536-d vector in pgvector; 100M about 615 GB before the index.

## Analytics storage (section 5)
- Parquet internals (row groups, column chunks, pages, encodings, statistics, sort order and why it matters more than indexes), zone maps and skipping.
- Lakehouse table formats (Iceberg, Delta Lake, Hudi): snapshots, time travel, small-file problem.
- DuckDB formats and Arrow interop (pandas, Polars zero-copy), DuckDB on S3 and Hugging Face datasets; ClickHouse MergeTree.
- Measured base: `../read/inputs/read_measure.json` (1M rows: 157.7 MB against 1.68 MB, 94x) and the Query plans tab (10M rows: 87x bytes, about 50x faster).

## ML data path (section 8)
- Feature stores in depth (point-in-time joins, training and serving skew), Feast's offline and online stores.
- The rest of the old root's one-liners: object storage and Parquet layout for training data, Kafka as the event backbone (link Queues, streams and async work), ClickHouse for token and cost analytics, Postgres as eval registry.
