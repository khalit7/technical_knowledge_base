# Distributed systems fundamentals: source

Child page of Topic: swe-and-system-design (page prefix `dsf`, storage key `dsf-tab`). Built 2026-10-04; rebuilt 2026-10-24 to the teaching contract (editing and two new visuals, no new runs).

## Build and checks
`sh build.sh` (the skill template) writes `../index.html` from `parts/`: `01_head`, `10_header` (title, subtitle with the measured reading time, tab bar), Reading `20_read_a` to `20_read_l` plus `20_read_z`, `39_tab_more`, then every `*.js` part in its own script, `99_js_tabs.js` last.

- `python3 recompute.py && node check_recompute.mjs`: ring, clocks and history verdicts in JS against Python; the measured table against `inputs/replication_local.json`.
- `node check_raft.mjs`: fuzzes the Raft model (300 runs, safety after every event, liveness after healing).
- `node check_page.mjs`: clicks every control at 390 dark and 920 light; `node shot_el.mjs <w> <dark|light> t-read <id>` for element screenshots.
- `python3 ../../../../../html_utils/ledger.py check <page>` from the repo root: the knowledge ledger.
- Measurement (unchanged): `measure_replication.py` (real Postgres 16.2 primary and streaming replica via the pgserver wheel, about a minute) writes `inputs/replication_local.json`.
- Older provenance kept: `live.md` (the old Notion page, verbatim), `coverage.json`, `handoff_queues.md`, `handoff_reliability.md`.

## Reading parts (2026-10-24)
| Part | Section | Visual |
|---|---|---|
| `20_read_a` | Styles, nav, the idea in one screen: core sentence, hero, running example, "You need", problem-technique table, the invariant habit, new terms, who owns the neighbours | hero `22_js_hero.js` (new, static annotated diagram) |
| `20_read_b` | 1. Why it is hard: four reasons to leave one machine, partial failure, timeouts, partitions, pauses, clocks; closed: fallacies, failure models, Brewer 2017, Cloudflare leap second | `22_js_net.js` (four silences) |
| `20_read_c` | 2. Time and order: happened-before, Lamport, vector, HLC, TrueTime; closed: CockroachDB offsets, ClockBound | `27_js_clocks.js` |
| `20_read_d` | 3. Replication: leader and followers, sync or async (measured table), lag anomalies, failover, multi-leader, leaderless; closed: what does not transfer, the LSN wait, Patroni | `23_js_repl.js` (stepper, no longer plays on a mode switch) |
| `20_read_e` | 4. Quorums; closed: Cassandra levels, read repair, anti-entropy | `24_js_quorum.js` |
| `20_read_f` | 5. Consistency models as a ladder, with the history checker inline; linearisable is not serialisable; correction box | `32_js_hist.js` (moved from the Consistency lab tab; verdicts drawn as ladder rungs with Jepsen's availability per rung) |
| `20_read_g` | 6. CAP read correctly, PACELC | `28_js_cap.js` (new, four-mode toggle: stale answer, refusal, copy in flight, synchronous +69 ms) |
| `20_read_h` | 7. Consensus and Raft step by step, with the five-server cluster inline; closed: election timings, the etcd 0.4.1 stale-read bug, how the simulation is checked | `31_js_raft_model.js`, `31_js_raft_ui.js` (moved from the Raft lab tab) |
| `20_read_i` | 8. Leases and fencing tokens, Jepsen and AWS evidence, correction box | `26_js_fence.js` (no longer plays on a mode switch) |
| `20_read_j` | 9. Idempotency and exactly-once as an end-to-end property (new section): at-most-once and at-least-once, the end-to-end argument quoted from Saltzer, Reed and Clark (1984), the recipe, Kafka's limit, jetcd | `29_js_idem.js` (new stepper: blind retry, dedupe in the middle, key at the end) |
| `20_read_k` | 10. Partitioning: range or hash, consistent hashing, hot keys, rebalancing, shard key; closed: secondary indexes, routing | `25_js_ring.js` |
| `20_read_l` | 11. Transactions across machines (2PC, Spanner, dual writes, links to owners); 12. what real systems choose (closed table) and Jepsen (closed table) | |

`21_js_rd_common.js` and `99_js_tabs.js` are the skill templates (never autoplay; storage key `dsf-tab`).

## What changed and why (2026-10-24)
- **Top**: the core sentence, a hero figure (shards, leaders and followers, a stale read, an etcd group, numbered to the four jobs), "You need", new terms. The 50-entry glossary and the old reading-time line were deleted as fat: every term is defined where it first appears.
- **Two lab tabs moved inline.** Each explained one mechanism, so the Raft cluster now sits in section 7 and the history checker in section 5, beside the claims they prove. Tabs left: Reading and Further reading.
- **The consistency ladder is drawn**: the checker's verdicts are rungs from linearisable to eventual, each with its availability under partition (Jepsen's model pages, checked 2026-10-24).
- **New visuals**: the hero, the CAP and PACELC toggle (the CAP proof as a picture; the old viz_ideas rejection is reversed because CAP is core and had no picture), and the idempotency stepper.
- **New section 9** on idempotency and exactly-once as an end-to-end property, which OWNERS assigns here; Kafka's mechanics stay with Queues, retries with Reliability engineering, the HTTP key with Building a backend API.
- **Owned elsewhere now**: isolation levels and write skew (Transactions and concurrency), Long Fork's cause (Scaling a database), the standby query gotcha (Running Postgres in production), the database families table (Topic: databases). The old Transactions section became "Transactions across machines".
- **Order follows the ownership list**: why it is hard, time and order, replication, quorums, consistency, CAP, consensus, leases, exactly-once, partitioning, then cross-machine transactions and reference tables.
- **Depth closed**: fallacies, failure models, incident details, Postgres specifics, Cassandra levels, election timings, simulation notes, real-systems and Jepsen tables.
- **Deleted as fat**: the glossary, the common-mistakes list (each item restated a core section), navigation and transition sentences, tab cross-links.
- No autoplay: the template controller, and the replication and fencing steppers no longer start on a mode switch; a scroll-through at normal and reduced motion leaves every scrubber at 0 and the Raft clock at 0 ms.
- SVG labels raised to at least 11 px (clocks, Raft, histories, fence, replication). Prose uses British spelling (linearisable, serialisable); quotations keep their source spelling.
- No real image: the page is about mechanisms, and no photo or source figure would teach more than the diagrams (step 4 of the brief).

## Length judgement
| | Before (2026-10-23 audit) | After (2026-10-24) |
|---|---|---|
| Reading, core (230 words a minute, `html_utils/audit_pages.mjs`) | 49.1 min (11,291 words) | 40.3 min (9,262 words) |
| Reading, closed details | 2.2 min | 9.7 min |
| Other tabs, core (Raft lab, Consistency lab) | 2.9 min | 0 (moved inline) |
| Visuals drawn in Reading | 7 | 10 |

Why about 40 minutes is right: the page owns ten mechanisms, taught from zero (partial failure, logical clocks, three replication styles, quorums, the consistency ladder, CAP and PACELC, Raft, fencing, end-to-end idempotency, partitioning), each with its numbers and its picture, and it absorbed both lab tabs plus a new section. About a tenth of the core words are widget captions and counters. What made it long before (glossary, mistakes list, incident and product detail, reference tables) is deleted as fat or closed.

## Knowledge ledger (`ledger.json`; `ledger.py check`: problems 0)
563 units: core 376, depth 69, owned 9, fat 109. 552 were drafted by `ledger.py init` from the old page; 11 were added by hand (script-rendered presets and steppers, and the new content). Keys were found by matching word n-grams of each unit against the rebuilt page, then reviewed by hand; fat units carry a `note`.
