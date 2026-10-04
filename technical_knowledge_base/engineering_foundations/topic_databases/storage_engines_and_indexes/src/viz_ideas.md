# Visualisation ideas: Storage engines and indexes

Methodology followed: html_utils/interactive-html-ideas.md section 2. Score = teaches (0 to 3) + real data (0 to 2) + not already on the root or a sibling (0 to 2) + fits on a phone (0 to 1).

## Built
| # | Idea | Score | Placement | Data | Why it earns its place |
|---|---|---|---|---|---|
| 1 | One insert, two engines: B-tree page split (before) against LSM memtable, flush, compaction (after) | 8 | Reading s6, animation with toggle, counters, caption per step | illustrative, 4 keys per page | The suggested before/after: the same key through both engines; shows where each pays (random page writes now against rewrites later) |
| 2 | B-tree and LSM lab: insert ascending, random or hot keys into both; splits, checkpoints, page images, flushes, compactions; write, space, read amplification side by side | 8 | Tab | model with Postgres split rule (90% rightmost) and checkpoints; LSM leveled and tiered | Lets the reader reproduce the measured lessons (random keys: about 70% fill and more page writes; tiered: fewer rewrites, more runs) |
| 3 | Inside real pages: heap page 0 to scale, slot table, tuple header decoded; update with and without HOT; B-tree path to chat 42000 with every entry | 8 | Tab | pageinspect on PostgreSQL 16.2 | Real structures instead of drawings; the root had to label its tree "as drawn" because pageinspect was missing |
| 4 | Clock sweep animation, 8 buffers | 6 | Reading s2 | illustrative request list, real rule (cap 5) | The eviction rule is easy to state and hard to picture |
| 5 | Page 0 drawn to scale (header, line pointers, free, tuples) | 6 | Reading s1 | measured page_header | Shows the two-ended layout at a glance |
| 6 | WAL bars: one insert with and without page images; 1,000 random updates with images on, off, compressed, repeated | 7 | Reading s3 | pg_walinspect | The surprising 50x is the lesson |
| 7 | Commit-rate bars: synchronous_commit on and off, 1 and 32 clients, real flushes | 6 | Reading s3 | pgbench | Group commit and the cost of the flush in one picture |
| 8 | Fan-out calculator (rows, key type) with measured depth table | 7 | Reading s5 | formula reproduces measured 367 keys per leaf and levels at every size, independently | "Why 4 levels for a billion" answered by the reader |
| 9 | Bloom filter calculator | 5 | Reading s6 | formula; RocksDB measured FP rate beside it | Connects bits per key to wasted reads |
| 10 | Measured tables: depth, splits, UUID keys, write cost bars, RocksDB amplification, Postgres amplification, BRIN | 7 | Reading s5, s7, s9, s11 | m3, m4, m5 | Replace the old page's unsourced numbers |
| 11 | Real crash log with the recovery steps | 6 | Reading s4 | kill -9 on a real server | Recovery shown, not described |

## Rejected
- Rebuilding the root's sequential scan against index animation, index-only scan, VACUUM and cold/warm cases: linked to the root's Query plans tab instead.
- A latency "ladder" chart: the system design page's Numbers to know tab owns it; a table with corrections suffices.
- An LSM read-path animation separate from the lab: the lab's lookup buttons show runs probed with and without bloom filters.
- A GIN/GiST/SP-GiST internals animation: each would need its own data; a comparison table with when-not-to-use is enough at this depth, and full-text and vector indexes belong to Search and vector databases.
- A B-tree concurrency (Lehman and Yao right-link) animation: valuable but specialised; described in prose with the README link.

## What the methodology lacked
Nothing for scoring; a note that measurement scripts should save after each section (one long run lost its last step and was recovered from printed output).
