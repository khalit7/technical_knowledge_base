# Visualisation ideas: Running Postgres in production (2026-10-04)

The question the page keeps returning to: **when something goes wrong at 3 a.m., what do you look at, what does it mean, and what would have prevented it?** So the visuals are real operations on real servers, replayed, not diagrams of ideal systems.

## Built (score out of 10: teaches more than text x uses real data x fits the question)

| # | Visual | Where | Score | Data | Why it earns its place |
|---|---|---|---|---|---|
| 1 | **Bad DELETE at 14:03: restore last night's dump vs point-in-time recovery to 14:02:59** (before/after animation, 8 steps, counters, play/pause/step/scrub/speed) | Reading 3 | 10 | `inputs/pitr.json` (real row counts, recovery log, measured restore times); clock times illustrative | The single most important operational idea (RPO), shown on one input with the old method and the new. Khalid's requested animation. |
| 2 | **Autovacuum replay**: 187 real seconds of `pg_stat_user_tables` on a churned table, HOT phase, non-HOT sawtooth, forgotten transaction, manual VACUUM (animated, scrubbable) | Reading 6 | 9 | `inputs/vacuum.json` | Before/after on the same table: healthy sawtooth vs blocked cleanup; also shows HOT pruning keeping dead tuples low without VACUUM (found by accident on the first run). |
| 3 | **Replication lag chart** with toggle: normal replay vs replay paused 10 s | Reading 4 | 8 | `inputs/replication.json` series (250 ms samples) | Separates write, flush and replay lag: the diagnostic the three columns exist for. |
| 4 | **Slot retention bars**: pg_wal size with a stopped replica, then with max_slot_wal_keep_size | Reading 4 | 8 | `replication.json` retention | The disk-full mechanism, and the fix, in one picture. |
| 5 | **Incident lab** tab: 10 alerts, each a sequence of real diagnosis outputs, what to notice, fix, prevention | Tab | 9 | every run | The brief's requested tab; turns the page into a runbook. |
| 6 | Real transcripts everywhere (`.tr` boxes filled from the JSON) and the **Lab notebook** tab with all 70 | Reading, tab | 8 | all runs | "Real commands and output" is the page's promise; one renderer keeps text and data from drifting. |
| 7 | Autovacuum threshold calculator (rows, scale factor, PG18 cap) | Reading 6 | 6 | formula from docs | Shows why defaults fail on billion-row tables. |
| 8 | Synchronous commit bars, connection cost bars, VACUUM vs VACUUM FULL bars, support-window timeline, managed cost tiles | Reading 4, 8, 6, 9, 12 | 5 to 6 | measured / docs / price lists | Small static comparisons; inline, no tab. |
| 9 | Production checklist tab (30 items, ticks in localStorage) | Tab | 6 | | Something to act on, not just read. |
| 10 | Server diagram (processes, shared buffers, data files, WAL, archive, replica) | Reading 1 | 5 | drawn | Everything later refers back to it. |

## Rejected
- **Pooling animation** (1,000 client dots squeezing into 20 server connections): the real SHOW POOLS output says it in one line; animation would be decoration.
- **Failover sequence animation** (Patroni leader lock, TTL, promotion): the theory belongs to Distributed systems fundamentals; here the real promote / split brain / pg_rewind transcripts teach more.
- **Price-history or managed-cost calculator tab**: Khalid removed price tabs elsewhere; prices are one dated table plus three derived tiles.
- **pg_repack measurement**: the extension is not in the pgserver build; stated, not measured.
- **Real 2-billion-XID wraparound**: impossible in 20 minutes; staged with pg_resetwal, said plainly.
- **Re-measuring ALTER TABLE locks**: the sibling SQL and data modelling page owns them; linked.

## What the methodology lacked for this page
Its examples are about recomputing published figures. An operations page's evidence is command output; the useful rule here was "every output shown is captured by a script and rendered from JSON, never pasted", plus labelling laptop-scale timings as orders of magnitude (macOS fsync does not flush the drive cache, so commit rates are high).

## 2026-10-24 rebuild to the teaching contract
Built (all inline in Reading, all drawn at the measured width, none moves before the reader acts):
- **Hero** (static annotated diagram, `27_js_rd_new.js`): clients, PgBouncer, one backend per connection, shared buffers, table files, WAL, archive and replica, with section numbers on the figure and the two pins (open transaction, inactive slot) in the page's highlight colour. Replaces the old section 1 server diagram.
- **work_mem calculator** (slider plus a direct/pooler toggle): worst-case memory = shared_buffers + backends x (sort + hash x 2.0) x work_mem against a 64 GB host (illustrative host; rule from the docs). Section 1 had no visual and the page now owns memory settings.
- **Replication pipeline** (static): one WAL record through sender, receiver, write, flush, replay with the three lags as brackets. Streaming replication had only a transcript.
- **Failover before/after stepper**: the same partition promoted by hand (split brain, real rows 2150968, real pg_rewind numbers) against Patroni's leader lock (from its docs, not run). The 2026-10-04 rejection of a failover animation is reversed: the before/after on one partition shows what the transcripts only listed, and the leader lock is drawn only as far as the operations need (Raft stays on Distributed systems fundamentals).
- **XID-age slider** with a zoom on the last 50 million: the four documented layers and this page's alert lines on one linear axis.
- **SET-leak stepper** (4 frames): transaction pooling's correctness bug, with the run's measured result in the caption.
- **Lock-queue diagram** parsed from the real `pg_stat_activity` snapshot (new section 8, safe schema changes).
Moved: every real transcript (22 boxes, about 2,700 words) into closed "Real run" blocks; the line each section relies on is quoted in the prose. Removed: the "What pages you" card grid (it restated the failure table, which is now at the top) and the Common mistakes section (each mistake restated a section; the one new fact, recovery_min_apply_delay, moved into section 2).
Rejected: a real photo (the page is about software; no physical object teaches here), a pooling animation of 1,000 dots (still decoration), a pg_wal/ checkpoint animation (Storage engines and indexes owns checkpoints as a mechanism; here the hero and the slot chart carry the operational point).
