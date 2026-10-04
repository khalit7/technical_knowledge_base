# Visualisation ideas: NoSQL in practice

Scored 1 to 5 on teaching value (T), faithfulness to real data (F), cost (C, 5 = cheap). Built ones first.

| Idea | T | F | C | Placement | Data | Notes |
|---|---|---|---|---|---|---|
| "Latest 50 messages" across four layouts: no index, B-tree index, CLUSTER, Cassandra partition; strip of the table's pages drawn to scale with the pages read lit, counters, captions per step | 5 | 5 | 3 | Reading section 2 (the before/after animation) | `m_wide.py`: EXPLAIN (ANALYZE, BUFFERS) of all three Postgres runs, ctid block numbers of the 50 rows, Cassandra trace | The suggested animation. Real block positions show why an index alone still reads 49 pages and CLUSTER reads 1. |
| DynamoDB single-table lab: access patterns left, key choices right, each pattern scored GetItem / Query / GSI / extra work / Scan with items read and read units; item table as stored; hot-partition and cost calculator | 5 | 4 | 2 | Tab | `m_ddb.py` counts and capacities; AWS prices dated 2026-10-04 | Rules encoded from the docs; item counts from the measured load. Provisioned cost assumes a 3x peak (labelled). |
| Rate-limit race: allowed requests, naive read-decide-write (188) against the Lua bucket (20) against the limit | 4 | 5 | 5 | Reading 3 | `m_redis.py` | Bars; the measurement is the visual. |
| Quorum calculator on a token ring: RF, write and read levels, replicas down; success and overlap | 4 | 5 (arithmetic) | 4 | Reading 6 | formula from Cassandra docs | Ring is illustrative. |
| Tombstone table: 0, 5,000, 101,000 deleted, with the trace lines and the failure | 4 | 5 | 5 | Reading 6 | `m_wide.py` | Real trace text. |
| Cardinality calculator: series, samples a day, disk a day | 3 | 4 | 5 | Reading 7 | Prometheus docs (1-2 bytes per sample) | No memory-per-series figure shown: not documented as a constant. |
| k-hop timing chart (log scale) for four engines with counts | 4 | 5 | 4 | Reading 8 | `m_graph.py` | Honest result: Postgres fastest to 3 hops. |

Rejected or not built:
- An animated token bucket refilling over time: pretty, but the race result teaches the important point (atomicity) and the bucket is three lines of arithmetic.
- An LSM compaction animation for Cassandra: owned by the Storage engines and indexes sibling (B-tree and LSM lab); linked instead.
- A replication-lag animation for Redis failover: the measured counts (4,947 of 5,000 lost) say it more plainly; replication theory lives on Distributed systems fundamentals.
- A real three-node Cassandra cluster to measure quorum reads: needs loopback aliases (sudo) or containers; the arithmetic is exact and the ring is labelled illustrative.
- A MongoDB document-growth animation: the 16 MB failure and the append timings in a table were enough.

What the methodology lacked for this page: guidance for comparing timings across systems measured at different points (server time, client round trip, in process). Rule used: say which, and compare counts where the timings are not comparable.
