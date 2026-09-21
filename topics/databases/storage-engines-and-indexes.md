# Storage engines, indexes, and the physics of a query

⏱ 21 min read · +18h 10m resources

Last updated: 2026-08-31

### Best resources (1 min)

- [Database Internals](https://www.databass.dev/) (book, ~9h 25m) (Alex Petrov, O'Reilly 2019): Part I is the clearest published walk through B-tree mechanics, page layout, and LSM compaction. Start here
- [Designing Data-Intensive Applications, 2nd ed.](https://dataintensive.net/) (~1h 30m for ch. 4; ~15h for the book) (Kleppmann and Riccomini, O'Reilly, March 2026): chapter 4, Storage and Retrieval, for the same material at a higher altitude and with better judgement about when each engine wins
- [Designing Access Methods: The RUM Conjecture](https://stratos.seas.harvard.edu/publications/designing-access-methods-rum-conjecture) (~30 min) (Athanassoulis et al., EDBT 2016): the six-page paper that names the read, update, memory triangle every engine sits inside
- [LSM-based Storage Techniques: A Survey](https://arxiv.org/abs/1812.07527) (90 min) (Luo and Carey, VLDB Journal 2020): the reference on compaction strategies, bloom filters, and amplification analysis
- [Use The Index, Luke](https://use-the-index-luke.com/) (~4h) (Markus Winand): practical indexing. Composite ordering, sargability, covering indexes, and reading an EXPLAIN output like an adult
- [Efficient and robust approximate nearest neighbor search using HNSW](https://arxiv.org/abs/1603.09320) (45 min) (Malkov and Yashunin, 2016): the paper behind nearly every vector index in production
- [ANN-Benchmarks](https://ann-benchmarks.com/) (~20 min): the standing recall-versus-QPS comparison across ANN libraries. Look at the Pareto curves, not vendor blog numbers
- [Interactive latency numbers](https://colin-scott.github.io/personal_website/research/interactive_latency.html) (~10 min) (Colin Scott's version of Jeff Dean's list): the numbers below, with a slider for hardware year

### The one idea underneath everything (2 min)

An access method cannot be simultaneously optimal at reading, at updating, and at memory footprint. That is the **RUM conjecture**: improving two of read overhead, update overhead, and memory or space overhead makes the third worse. B-trees buy cheap reads with expensive random updates. LSM-trees buy cheap sequential updates with read amplification and background compaction work. Adding an index buys read speed with space and write cost. Compression buys space with CPU. Every storage decision you make is a point on that triangle, and the useful engineering question is never "which is faster" but "which corner am I allowed to give up".

The three amplification factors are how you measure the corners:

- **Write amplification**: bytes written to the device per byte of logical data. B-tree: rewrite a whole page (typically 8 KB) for a single row, plus the WAL record, plus full-page writes after a checkpoint, so easily 10x to 40x. LSM-tree with levelled compaction: each level rewrites data once, roughly 10x to 30x for the classic size ratio of 10; with tiered compaction, far less write amplification but worse read and space amplification.
- **Read amplification**: pages read per logical read. B-tree: the tree height, so 3 to 4 page reads for a large table plus one heap fetch, mostly cached. LSM-tree: potentially one lookup per level, cut down by bloom filters (about 10 bits per key gives roughly a 1 percent false positive rate) and by block indexes held in memory.
- **Space amplification**: bytes on disk per byte of logical data. B-tree: fragmentation and half-full pages, so roughly 1.3x. LSM levelled: about 1.1x. LSM tiered: up to 2x or more because obsolete versions linger until compaction catches up.

### B-tree vs LSM-tree (4 min)

**B+ tree.** A balanced tree of fixed-size pages, updated in place, with all values in the leaves and leaves linked for range scans. Height is roughly log base (fanout) of N, and with a fanout in the hundreds a billion-row table is 4 levels deep. Interior nodes stay hot in the buffer pool, so a point lookup is usually one physical read. Range scans follow leaf sibling pointers, which is why B-trees are natural for ORDER BY and BETWEEN. The pain is random writes: a workload that updates rows in random key order dirties pages all over the disk, and a page split under concurrency needs careful latching. Postgres, MySQL InnoDB, SQL Server, SQLite are all here.

One Postgres-specific consequence worth holding: Postgres uses MVCC with heap tuples, so an UPDATE writes a new tuple version and every index on the table must be updated too, unless the update is HOT (heap-only tuple: no indexed column changed and the new version fits on the same page). This is why wide tables with many indexes update slowly, why table bloat is a real operational concern, and why autovacuum tuning is a production skill rather than a curiosity.

**LSM-tree.** Writes go into an in-memory sorted structure (the memtable) plus a WAL append, which makes every write sequential and fast. When the memtable fills it is flushed as an immutable sorted file (SSTable). Background compaction merges files, discarding overwritten and deleted keys. Reads check the memtable, then the files, guarded by bloom filters and block indexes. Deletes are tombstones, which is why a delete-heavy workload can get slower before it gets faster and why range scans over a tombstone-rich key range are a known Cassandra footgun.

Compaction strategy is the real knob. **Levelled** keeps one sorted run per level, giving low space and read amplification and high write amplification: the right default for read-heavy workloads (RocksDB default, Cassandra LCS). **Tiered** (size-tiered) merges files of similar size, giving low write amplification and worse read and space amplification: the right choice for write-heavy ingestion. The choice is a RUM decision made explicit. Compaction also competes with foreground traffic for IO and CPU, so LSM systems fail in a characteristic way: throughput is fine until compaction falls behind, then read latency degrades and disk fills, which is a metastable failure mode you must alert on.

**Choosing.** B-tree for transactional workloads with reads and updates mixed and predictable latency required. LSM for write-heavy ingestion, for good compression (immutable sorted files compress well), and for cheap flash write budgets. Analytical column stores are LSM-shaped for the same reason: ClickHouse MergeTree is exactly this pattern applied to columnar parts.

### Page cache, fsync, and the WAL (3 min)

Every durable database is fighting the same fact: a write is not durable until it reaches stable storage, and reaching stable storage is 10,000 times slower than reaching memory.

- **Buffer pool and page cache.** The database reads and writes fixed-size pages through a cache. Postgres uses a modest shared_buffers plus the OS page cache; MySQL InnoDB uses a large buffer pool and mostly bypasses the OS cache; ClickHouse leans on the page cache. Cache hit ratio is the single most predictive number for OLTP latency, and the moment your working set exceeds RAM your p99 changes character rather than degrading smoothly.
- **fsync is the durability primitive.** `write()` only moves bytes into the page cache; `fsync()` forces them to the device and does not return until the device says so. On enterprise SSDs with power-loss-protected caches this is tens of microseconds, on consumer hardware or network storage a millisecond or more. Committing a transaction costs at least one fsync, which is why single-row commit rate is bounded by fsync latency, why group commit exists (batch many transactions into one fsync), and why `synchronous_commit = off` in Postgres buys enormous throughput in exchange for losing a small window of committed transactions on crash. Also worth knowing: fsync error handling is historically unsafe (the "fsyncgate" problem), which is why Postgres now panics on fsync failure rather than pretending it can retry.
- **The WAL.** Write-ahead logging: append the intended change to a sequential log and fsync that, before touching the data pages. Recovery replays the log from the last checkpoint. This turns random durable writes into sequential ones, and it is the same mechanism that powers replication (ship the log to followers), point-in-time recovery (replay the log to a timestamp), and change data capture (parse the log into an event stream, as Debezium does). Checkpointing flushes dirty pages so the log can be trimmed, which is why you see periodic IO spikes and why checkpoint tuning smooths tail latency. Redo log, journal, oplog, binlog, commitlog: same idea, different vendors.

### Index families (2 min)

- **B-tree**: ordered, supports equality, range, prefix, sorting, and covering (index-only) scans. The default and usually the right one. Composite indexes must be ordered equality columns first, then the range column, because the index is only usable up to the first range predicate.
- **Hash**: equality only, no ordering, slightly smaller and faster for point lookups. Rarely worth choosing over a B-tree in Postgres. Also the internal mechanism for hash joins and hash aggregates.
- **GIN** (generalised inverted index): maps each contained element to the list of rows containing it. This is what makes Postgres good at full-text search, JSONB containment, and array membership. Fast to search, slow to update, which is what the pending-list mechanism is compensating for.
- **GiST and SP-GiST**: a framework for indexing data with no total order, using a balanced tree over user-defined predicates. Geometry and ranges (PostGIS, exclusion constraints), and historically the ANN index in early pgvector.
- **Inverted index (Lucene family)**: term to posting list, plus term frequencies and positions for BM25 scoring and phrase queries. Segments are immutable and merged in the background, which is LSM logic under a different name.
- **Bitmap**: one bitmap per distinct value, combined with bitwise AND and OR. Excellent for low-cardinality columns in analytical stores. Postgres does not persist bitmap indexes but builds bitmaps on the fly for bitmap heap scans, which is why combining two mediocre indexes can still be fast.
- **Skipping and zone maps**: not indexes exactly, but the reason column stores are fast. Store min and max per block, then skip blocks that cannot match. ClickHouse's sparse primary key, Parquet row-group statistics, and Snowflake's micro-partition pruning are all this idea. Sort order at write time therefore matters more than any index you add later.

### ANN indexes for vector search (4 min)

Exact nearest neighbour over high-dimensional vectors is a brute-force scan, so every practical system trades recall for speed. Recall at k is the fraction of true neighbours returned, and it is a dial: quote latency and recall together, never latency alone.

- **Flat (brute force)**: exact, no build time, latency linear in corpus size. Genuinely correct below roughly 100k vectors, and the baseline you should measure recall against.
- **HNSW**: a multi-layer navigable small-world graph. Search descends from a sparse top layer to the dense bottom layer, greedily following edges. Excellent recall-versus-latency, and the default in pgvector, Qdrant, Weaviate, Milvus, Lucene, and Elasticsearch. Costs: the graph lives in RAM (roughly the vectors plus M times 8 to 12 bytes per node for edges, so a 1536-dimension float32 corpus needs about 6 KB per vector plus overhead), build is slow and single-pass-ish, and deletes are soft until a rebuild. Knobs: M (edges per node, higher means better recall and more memory), ef_construction (build effort), ef_search (query effort, the runtime recall dial).
- **IVF (inverted file)**: k-means the corpus into lists, then search only the nprobe closest lists. Build is fast, memory is small, and the recall dial is nprobe. The weakness is the boundary problem, since a true neighbour in an unprobed cluster is simply lost, and quality decays as the corpus drifts away from the centroids it was trained on. IVF needs a training step, which surprises people.
- **IVF-PQ**: IVF plus product quantisation, which splits each vector into subvectors and replaces each with a codebook id. Compression of 16x to 64x is normal, so a billion vectors fit in RAM, at the cost of a lossy distance estimate that usually needs a rerank pass over the original vectors. This is the classic FAISS billion-scale recipe. Scalar quantisation to int8 (4x) and binary quantisation (32x) with a rerank are the cheaper modern alternatives and are usually the first thing to try.
- **DiskANN (Vamana)**: a graph index designed so the graph lives on SSD and only a compressed representation stays in RAM, which cuts memory cost by roughly an order of magnitude for a few extra milliseconds of latency. This is what makes billion-scale on one node affordable, and it is the design behind Azure's vector search, Milvus's disk index, and pgvectorscale.
- **ScaNN**: Google's anisotropic vector quantisation, which optimises the quantiser for inner-product ranking loss rather than reconstruction loss. The best QPS-versus-recall numbers on several ANN-Benchmarks tracks, and available in Postgres via pgvector's competitor extensions and in Vertex AI.
The thing that actually breaks in production is **filtered search**. "Nearest neighbours where tenant_id equals X and created_at is recent" is not what an ANN graph indexes. Pre-filtering then brute-forcing is correct but slow when the filter is loose; post-filtering the top-k is fast but returns nothing when the filter is selective. Good implementations do filtered traversal with the predicate evaluated during graph search, or maintain per-tenant indexes. Evaluate a vector store on this, not on unfiltered QPS.

### Query planning, and why the planner picks a bad plan (3 min)

A planner turns SQL into a physical plan by estimating the cost of alternatives from table statistics. Three access paths (sequential scan, index scan, index-only scan or bitmap scan), three join algorithms (nested loop, hash join, merge join), and a costing model over estimated row counts. It picks the cheapest estimated plan, which is not always the cheapest plan.

Why it goes wrong, in rough order of how often you will hit it:

1. **Stale or insufficient statistics.** The planner thinks a table has 1000 rows because ANALYZE has not run since the bulk load. Fix: ANALYZE, and raise `default_statistics_target` for skewed columns.
2. **Correlated predicates.** The planner assumes independence, so `WHERE country = 'UK' AND city = 'London'` gets an estimate that multiplies two selectivities and lands orders of magnitude too low, which turns a hash join into a nested loop over millions of rows. Fix in Postgres: extended statistics (`CREATE STATISTICS`).
3. **Non-sargable predicates.** Wrapping the indexed column in a function or a type cast (`WHERE lower(email) = ...`, `WHERE created_at::date = ...`) makes the index unusable. Fix: an expression index, or rewrite the predicate to leave the column bare.
4. **Parameter sniffing and generic plans.** A prepared statement plans once for a typical parameter, then reuses that plan for an atypical one. A plan that suits `status = 'pending'` (rare) is a disaster for `status = 'done'` (most rows).
5. **Cardinality estimation through joins and aggregates.** Errors compound multiplicatively up the plan tree; a three-join query with a 10x error at the bottom is a 1000x error at the top. This is the known fundamental weakness of cost-based optimisation, not a bug you can configure away.
6. **Cost constants that do not match the hardware.** Postgres defaults assume spinning disks. On NVMe, `random_page_cost` of 4 is wrong and pushes the planner towards sequential scans; 1.1 is the common setting.
How to work: read `EXPLAIN (ANALYZE, BUFFERS)` and compare estimated rows against actual rows at every node. The lowest node where they diverge badly is the problem. Buffers tells you whether you were reading from cache or disk. Everything else is downstream of that one comparison.

### Latency numbers to have memorised (2 min)

| Operation | Order of magnitude | Why it matters |
| --- | --- | --- |
| L1 cache reference | 1 ns | The unit everything else is measured in |
| Main memory reference | 100 ns | A buffer pool hit; roughly 100x a cache hit |
| Read 1 MB sequentially from memory | 50 us | Why vectorised columnar execution beats row-at-a-time |
| NVMe SSD random read, 4 KB | 50 to 100 us | A B-tree page miss. Roughly 1000x a memory hit |
| fsync on enterprise SSD | 0.1 to 1 ms | The floor on commit rate per connection; the reason group commit exists |
| Read 1 MB sequentially from NVMe | 200 to 500 us | Why a scan of a well-laid-out column beats scattered index lookups |
| Round trip within the same datacentre | 0.5 to 1 ms | The floor on any network database call, before the query runs |
| Redis GET, same AZ | 0.2 to 1 ms | Dominated by the network hop, not by Redis |
| Postgres indexed single-row read, warm | 0.5 to 2 ms | Your OLTP unit of work. If you see 50 ms, you are doing N+1 or missing an index |
| HNSW ANN query, 1M vectors, in memory | 1 to 5 ms | Retrieval is not your RAG bottleneck; the LLM call is |
| Cross-region round trip | 50 to 150 ms | Why synchronous cross-region commits are a product decision, not a config flag |
| S3 GET first byte | 20 to 100 ms | Why lakehouse queries prefetch aggressively and hate small files |
| LLM time to first token | 200 ms to 2 s | The number that makes every database latency above it a rounding error |

The useful habit is arithmetic rather than recall: before optimising, multiply the number of operations by the cost of one and check whether the answer is anywhere near your measured latency. If it is not, you are optimising the wrong layer, and the gap is usually a round trip you did not count or a cache you assumed was warm.
