# Visualisation ideas: Scaling a database

Scores are 1 to 5 on teaching value / data reality / cost to build; built ones first.

| Idea | Score | Placement | Data | Status |
|---|---|---|---|---|
| Scaling ladder, clickable rungs (what it fixes, cost, when enough) | 5/4/5 | Reading, one screen | sourced facts from sections 2 to 11 | built |
| Before/after fan-out animation: a user's chat list and a "mentioning X" search on one Postgres against Citus sharded by user (servers, shards, rows, measured time per step) | 5/5/3 | Reading section 6 | Citus 14.2 on the root's 10M-message data, measured (`inputs/citus.json`) | built; the main animation |
| Which partitions a query reads: 3 queries x 3 layouts (one table, monthly range, hash by chat), highlighted partitions and EXPLAIN numbers | 5/5/4 | Reading section 4 | real EXPLAIN (ANALYZE, BUFFERS), `inputs/part.json` | built |
| Retention: DELETE a month against DROP a partition (time, WAL MB) | 4/5/5 | Reading section 4 | measured | built (stat tiles) |
| Planning time against partition count (12 to 3,000) | 4/5/5 | Reading section 4 | measured on empty tables | built (bars) |
| Shard-key comparison table at 8 shards | 5/5/5 | Reading section 7 | counted on real data (`inputs/lab_data.json`) | built |
| Shard-key lab: 5 keys x 2 to 16 shards x stored/last-week load, giant-tenant slider (illustrative), 9 access patterns single-shard or scatter | 5/5/4 | own tab | counted on real data | built |
| Resharding 3 to 4: rows moved under mod N, consistent hashing, 48 logical shards | 5/5/5 | Reading section 9 | counted on real data; ring re-derived independently in recompute.py | built (bars) |
| Citus rebalance with writes running (time, shard groups, MB, writes and latency) | 4/5/4 | Reading section 9 | measured | built (stat tiles) |
| CockroachDB node-kill timeline (inserts per second; kill node 3, kill node 2, restarts) | 5/5/4 | Reading section 11 | measured (`inputs/crdb.json`) | built |
| Commit latency floor by replica placement | 4/4/5 | Reading section 11 | CloudPing medians, formula shown | built as a table |
| Interactive cross-region latency calculator | 3/2/3 | | only some region pairs sourced | rejected: an incomplete RTT matrix would need invented pairs |
| Consistent hashing ring animation | 4/5/3 | | | rejected: Distributed systems fundamentals already has it; linked |
| Replica lag / read-your-writes animation and measurement | 4/5/3 | | | rejected: measured on Distributed systems fundamentals (anomalies) and Running Postgres in production (lag); linked |
| Price chart of instance sizes | 2/4/4 | | | rejected: a 3-row table carries it (Khalid removed price-history tabs elsewhere) |
| Application-level router across 3 local Postgres servers | 3/5/3 | | | not built: Citus built from source cheaply, so the real system replaced the hand-made one; the logical-shard and ring routers are counted on the data instead |

What the methodology lacked: guidance for systems measured on one laptop where the "network" is loopback; this page states it at the top and beside each latency, and adds a fair baseline (Postgres with a real SSD flush) where the systems flush differently.
