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

## 2026-10-24 rebuild to the teaching contract
| Idea | Kind | Placement | Data | Status |
|---|---|---|---|---|
| Hero: three ways to grow (one machine, copies, split) with where one request goes | static annotated diagram | top | schematic | built (`27_js_rd_hero.js`) |
| Connections against max_connections as app pods grow, direct against PgBouncer | slider plus toggle | section 2, rung 3 | arithmetic from Running Postgres in production section 7 (SQLAlchemy 5 + 10, max_connections 100 minus 3); pool of 20 illustrative | built (`28_js_rd_pool.js`) |
| Read-your-writes under three routes (naive, sticky primary, wait for LSN) | stepper, before/after | section 3 | LSNs illustrative; 1,993 of 2,000 and 0.105 ms from Distributed systems fundamentals | built (`29_js_rd_ryw.js`) |
| Functional split before/after, the cut transaction | static toggle | section 5 | schematic, the root's credit-and-reply transaction | built (`30_js_rd_split.js`) |
| Shard-key lab | lab | moved from its own tab into section 7 | unchanged | moved |
| Crossing shards, measured (login, join, transaction pairs) | bars | section 8 | `inputs/citus.json` | built (`32_js_rd_cross.js`) |
| Instagram id bits to scale | static | section 8 | 41/13/10 bits | built (HTML) |
| Ranges on three nodes through the kill sequence | static toggle | section 11 | real ranges 88 to 91 and events from `inputs/crdb.json` | built (`33_js_rd_ranges.js`) |
| Commit floor by placement, to scale | bars | section 11 | CloudPing medians already on the page | built (HTML) |
| Multi-region patterns: a Singapore user's read and write | static toggle | section 12 | CloudPing 218 ms; CockroachDB docs quotes | built (`34_js_rd_geo.js`) |
| Real photos (servers, data centre) | image | | | rejected: nothing physical teaches here; every mechanism is drawn better |
| Spanner paper figure | image | | | rejected: TrueTime is one depth paragraph; the paper's licence for reuse is unclear |

## 2026-11-06: split layout and 3D stages (renderer v2)
| Visual | Kind | Where | Data | Status |
|---|---|---|---|---|
| Fig. 1, three ways to grow (one box, primary and replicas with the log streaming, four shards behind a router, keyed against scatter) | 3D stage, 4 steps | top | schematic | built (`41_js_sc_hero.js`), replaces the three 2D hero drawings (`27_js_rd_hero.js`, deleted) |
| Fig. 2, read-your-writes under three routes, logs as rows of records on each server's roof | 3D stage, 5 steps x 3 lists | section 3 | 1,993 of 2,000 and 0.105 ms (Distributed systems fundamentals); log positions illustrative | built (`42_js_sc_ryw.js`), replaces the 2D stepper (`29_js_rd_ryw.js`) |
| Fig. 3, one node against 32 shards: index lookup, full scan, keyed to one shard, scatter to all, keyed spread against scatter | 3D stage, 6 steps | section 6 | `SC.citus` placement, shard sizes, medians | built (`43_js_sc_fan.js`), replaces the 2D before/after animation with four caption sets (`25_js_fan.js`) |
| Fig. 4, two-phase commit across two workers | 3D stage, 6 steps | section 8 | `SC.citus.tx` | built (`44_js_sc_2pc.js`), new: the mechanism had only a bar pair |
| Fig. 5, a live rebalance from 3 to 4 workers | 3D stage, 5 steps | section 9 | `SC.citus.rebalance`, shard sizes | built (`45_js_sc_rebal.js`), new; replaces the five stat tiles the steps now carry |
| Fig. 6, four ranges on three nodes through the kill sequence, Raft flows | 3D stage, 6 steps | section 11 | `SC.crdb` ranges, events, per-second counts | built (`46_js_sc_rg.js`), replaces the 2D toggle (`33_js_rd_ranges.js`) |
| Kept 2D | | | | pool slider, partition boxes, retention tiles and planning bars, functional split toggle, shard-key lab, crossing-shards bars, id bits, resharding bars, the CockroachDB per-second strip, commit floor bars, multi-region toggle: numbers on an axis, flat maps or parameter widgets |
| Multi-region as a 3D globe or three region plinths | 3D | section 12 | | rejected: three routes on a flat map read at a glance; depth would add nothing |
