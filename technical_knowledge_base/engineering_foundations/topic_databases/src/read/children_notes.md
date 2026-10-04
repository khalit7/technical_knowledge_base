# Old child pages: facts checked (2026-10-04)

The two old written children of Topic: databases, fetched read only and saved verbatim in `children/`:
- `storage_engines_indexes_and_the_physics_of_a_query.md` (Notion 3cd5c17b0d0d8102bc1fd11b22606e1a, last edited 2026-09-22, 21 min)
- `caching_types_policies_and_semantic_caching.md` (Notion 3cd5c17b0d0d817ebd6ccadd4750c23a, last edited 2026-09-22, 32 min)

Neither is in pages.json; a new child structure is being proposed with the root, so these notes are input for whoever rebuilds them. Each fact is marked **verified** (checked against a primary source or a measurement this session), **corrected** (the source says otherwise; correction given), or **unconfirmed** (not checked this session, or no source found). "Measured" means `measure_read.py` / `probe_read.py` on this page (PG 16.2, M1 Pro) or the SWE root's `num_data.json`.

## Storage engines, indexes, and the physics of a query

### Best resources
| Claim | Status | Note |
|---|---|---|
| Database Internals, Alex Petrov, O'Reilly 2019; Part I storage engines | verified | databass.dev: Part I Storage Engines, Part II Distributed Systems, about 432 pages |
| DDIA 2nd ed., Kleppmann and Riccomini, O'Reilly, March 2026 | verified | martin.kleppmann.com. "Chapter 4, Storage and Retrieval" in the 2nd edition: unconfirmed (O'Reilly page returned 403) |
| RUM conjecture paper, Athanassoulis et al., EDBT 2016 | unconfirmed | not fetched |
| LSM survey, Luo and Carey, VLDB Journal 2020, arXiv 1812.07527 | unconfirmed | not fetched |
| Use The Index, Luke (Winand) | verified | free web edition; book "SQL Performance Explained" |
| HNSW paper, Malkov and Yashunin, arXiv 1603.09320 | verified | id resolves |
| ANN-Benchmarks; Colin Scott's interactive latency page | unconfirmed | not fetched |

### Mechanisms and numbers
| Claim | Status | Note |
|---|---|---|
| RUM conjecture: read, update, memory overhead; improving two worsens the third | unconfirmed | standard statement of the paper; check the paper |
| B-tree write amplification 10x to 40x; LSM levelled 10x to 30x | unconfirmed | no source given; needs a measurement or a cited figure |
| B-tree point lookup: 3 to 4 page reads plus a heap fetch | verified (measured) | chat lookup on 1M rows: 12 page touches of which 6 heap pages for 6 rows; index-only probe 7 touches |
| Bloom filter: about 10 bits per key gives about 1% false positives | verified (derived) | optimal k = 6.9: (1 - e^(-k/10))^k = 0.82%; "about 1%" is fair |
| Space amplification B-tree 1.3x, LSM levelled 1.1x, tiered 2x | unconfirmed | no source |
| Postgres pages 8 KB | verified | storage-page-layout docs ("usually 8 kB") |
| B+ tree height log_fanout(N); billion rows 4 levels at fanout in the hundreds | verified (derived) | 300^4 = 8.1e9 |
| HOT updates avoid index updates when no indexed column changes and the page has room | unconfirmed | standard Postgres behaviour; cite storage-hot docs when rebuilding |
| LSM: memtable + WAL, SSTables, compaction, tombstones | unconfirmed | standard; cite Luo and Carey |
| Levelled is the RocksDB default; Cassandra LCS | unconfirmed | |
| ClickHouse MergeTree is LSM-shaped | unconfirmed | |
| "Stable storage is 10,000 times slower than memory" | corrected | depends on hardware: RAM about 100 ns (70 ns measured by others on desktop DDR5); fsync on a power-loss-protected SSD 1.6 to 12.4 microseconds (16 to 120 times), consumer SSD about 3 ms (30,000 times), network disk 0.74 ms (SWE num_data) |
| shared_buffers modest plus OS page cache | verified | default 128 MB; 25% of RAM suggested starting point (runtime-config-resource) |
| InnoDB large buffer pool bypassing the OS cache; ClickHouse leans on page cache | unconfirmed | |
| fsync on enterprise SSD "tens of microseconds"; consumer "a millisecond or more" | corrected / verified | PLP SSD measured by others at 1.6 to 12.4 microseconds (single digits to about ten); consumer verified (0.9 to 3 ms) |
| Group commit: one fsync covers many transactions | verified | WAL docs: "one fsync of the WAL file may suffice to commit many transactions"; measured 148 tps at 1 client, 2,133 at 32 with real flush (atlas pg_tps.json) |
| synchronous_commit = off loses a window of commits on crash | unconfirmed | standard; cite wal-async-commit docs |
| fsyncgate; Postgres panics on fsync failure | unconfirmed | true since PG 12 (data_sync_retry) to my knowledge; cite the docs |
| WAL: log before data pages; REDO recovery; checkpoints | verified | wal-intro docs |
| Same mechanism behind replication, PITR, CDC (Debezium) | unconfirmed | standard |
| Index families: hash, GIN (pending list), GiST/SP-GiST, Lucene inverted, bitmap, zone maps | unconfirmed | except B-tree (btree docs) |
| "GiST ... historically the ANN index in early pgvector" | corrected | pgvector's README lists HNSW and IVFFlat only; its first index type was IVFFlat, not GiST. Remove |
| Composite index: equality columns first, then range | unconfirmed | Use The Index, Luke covers it; cite the chapter |
| Flat search correct below about 100k vectors | unconfirmed | rule of thumb |
| HNSW default in pgvector, Qdrant, Weaviate, Milvus, Lucene, Elasticsearch | unconfirmed | pgvector offers HNSW and IVFFlat (verified); "default" is not how pgvector works (you choose) |
| HNSW memory: vectors plus M x 8 to 12 bytes per node; 1536-d float32 about 6 KB | verified (derived) for 6 KB | 6,144 bytes of floats, 6,152 as pgvector stores it; edge overhead unconfirmed |
| HNSW knobs M, ef_construction, ef_search | verified | pgvector defaults m 16, ef_construction 64, hnsw.ef_search 40 |
| IVF needs training; boundary problem; IVF-PQ 16x to 64x; int8 4x, binary 32x | verified (derived) for int8 and binary ratios (32/8, 32/1); rest unconfirmed | |
| DiskANN behind Azure, Milvus disk index, pgvectorscale | unconfirmed | |
| ScaNN: anisotropic quantisation; "available in Postgres via pgvector's competitor extensions" | unconfirmed | likely AlloyDB's ScaNN extension; name it precisely |
| Filtered search: pre-filter slow, post-filter empty; filter during traversal | verified in part | pgvector README: filtering applied after the index scan; iterative scans since 0.8.0 |
| Planner failure modes 1 to 6 (stale stats, correlated predicates, non-sargable, generic plans, compounding errors, cost constants) | unconfirmed | standard; the Query plans tab demonstrates several on 10M rows (see src/plan) |
| random_page_cost default 4; 1.1 common on NVMe | unconfirmed | default 4.0 is in the docs; "1.1 common" is folklore |
| EXPLAIN (ANALYZE, BUFFERS): compare estimated and actual rows | verified | using-explain docs |
| Learned planner: 1.81x geomean, 44.7%, zero regressions, best of three | corrected | rohanbansal.com/qorl (2026-09-16): the model writes pg_hint_plan hints, not whole plans; 1.40x for the model's own pick with 7 regressions; 1.81x and 44.7% only when taking the best of three rollouts per query (up to 15 candidates, each executed), 0 regressions only in that setting; JOB (113 queries) was watched throughout development, so not held out; trained on 13,646 CEB queries; untrained model gave no plan for 99 of 113 (88%), not 72%; $1,200 (cross-checked with the Query plans agent) |

### Latency table (against measurements)
| Row | Old | Status |
|---|---|---|
| L1 1 ns; RAM 100 ns | verified (classic) | SWE num_data: L1 0.98 ns, RAM about 70 to 100 ns |
| Read 1 MB from memory 50 us | corrected | measured 18.3 us on M1 Pro, one thread (classic 250 us) |
| NVMe random read 50 to 100 us | verified | 102 us at queue depth 1 (consumer Crucial P3) |
| fsync enterprise SSD 0.1 to 1 ms | corrected | 1.6 to 12.4 us with power-loss protection; 0.74 ms on network block storage |
| Read 1 MB from NVMe 200 to 500 us | unconfirmed | |
| Same-DC round trip 0.5 to 1 ms | unconfirmed | see SWE Numbers to know |
| Redis GET 0.2 to 1 ms | corrected | Redis docs example p50 0.143 ms on loopback (vendor); network adds |
| Postgres indexed read 0.5 to 2 ms | corrected | 0.067 ms on loopback (SWE), 0.061 ms here for a 6-row chat lookup; production adds the network round trip |
| HNSW 1M vectors 1 to 5 ms | unconfirmed | |
| Cross-region 50 to 150 ms; S3 first byte 20 to 100 ms; LLM TTFT 200 ms to 2 s | unconfirmed | |

## Caching: types, policies, and semantic caching

| Claim | Status | Note |
|---|---|---|
| Resource links (AWS caching, Netflix EVCache, MDN, GPTCache, Builders' Library, Caffeine, ARC, XFetch, SGLang, vLLM, provider docs) | unconfirmed | not fetched, except: |
| Scaling Memcache at Facebook PDF `nsdi13-nishtala.pdf` | corrected | that URL returns 404; working PDF: https://www.usenix.org/system/files/conference/nsdi13/nsdi13-final170_update.pdf |
| Layer latencies table | unconfirmed | Redis row: docs example 0.143 ms p50 loopback |
| Database buffer pool "never stale", kept coherent through WAL and MVCC | verified in substance | MVCC docs |
| Cache-aside "roughly 90 percent of production caching" | unconfirmed | no source |
| Stale-set race in cache-aside; leases fix it | verified in substance | Facebook memcache paper (leases); not re-read in detail |
| Write-through, write-behind, write-around, refresh-ahead definitions | unconfirmed | standard |
| LRU, LFU, TinyLFU, FIFO (Belady's anomaly), ARC | unconfirmed | |
| Redis maxmemory-policy menu: noeviction, allkeys-lru, allkeys-lfu, allkeys-random, volatile-lru, -lfu, -random, -ttl | corrected (incomplete) | Redis docs (fetched 2026-10-04) also list `allkeys-lrm` and `volatile-lrm` (Redis 8.6, least recently modified). That noeviction is the default is not stated on that page: unconfirmed |
| Redis LRU and LFU are sampled approximations; maxmemory-samples 5; raise to 10 | verified | eviction docs |
| volatile-* with no TTLs behaves like noeviction | verified | eviction docs |
| allkeys-lru is the right default for a pure cache | verified | docs: "a good default option" |
| TTL, explicit, event-driven invalidation; delete beats update on write | unconfirmed | standard reasoning |
| Phil Karlton quote | unconfirmed | attribution is folklore |
| Stampede fixes: single-flight; XFetch formula | unconfirmed | formula matches Vattani et al. 2015 as commonly quoted |
| TTL jitter base x (1 + random(0, 0.2)) | unconfirmed | advice, not a fact |
| Stale reads under replication; delayed double delete | unconfirmed | |
| Cost-weighted hit ratio; 90% token hit at 0.1x saves 81% | verified (derived) | 0.9 x (1 - 0.1) = 0.81 |
| KV cache bytes per token formula; Llama-3-70B 320 KB per token, 128k context about 40 GB | verified (derived) | 2 x 80 x 8 x 128 x 2 = 327,680 B = 320 KiB; x 131,072 = 40 GiB |
| DeepSeek V4.1-Flash about 890 bytes per token | unconfirmed | belongs to the DeepSeek page; check there |
| 60 to 90% of input tokens are shared prefix on agentic workloads | unconfirmed | |
| RadixAttention, vLLM prefix caching mechanics; vLLM V1 on by default | unconfirmed | belongs to LLM serving pages |
| AWS benchmark via Portkey: 0.99 threshold 23.5% hits, 0.75 90.3%, accuracy 92.1 to 91.2 | unconfirmed | secondary citation of a secondary citation |
| Provider prompt-caching table (Anthropic multipliers 1.25x / 2x / 0.1x, minimum prefixes by model; OpenAI GPT-5.6 30 min TTL; Gemini storage prices) | unconfirmed | dated 2026-08-31 by the old page; prices move; belongs to the LLM serving or pricing pages, re-check there |
| Anthropic break-even "roughly 1.3 reads inside the TTL" | corrected | with write 1.25x and read 0.1x, n uses cost 1.25 + 0.1(n - 1) against n: break-even at n = 1.28 total uses, so one write plus a single read already pays (0.28 reads, not 1.3) |
| Gemini 0.1x read is derived, not quoted | unconfirmed | |

## What the Reading tab uses from the children
- Pages, buffer pool, WAL, fsync, group commit, B-tree, planner and EXPLAIN (section 4), checked against the Postgres docs and measured.
- Cache staleness (section 6 animation) and the stale-set race, citing the Facebook memcache paper with the corrected link.
- Everything else waits for the rebuilt children; see `../for_children/`.
