# Distributed systems fundamentals: source

Child page of Topic: swe-and-system-design (page prefix `dsf`, storage key `dsf-tab`). Built 2026-10-04; rebuilt 2026-10-24 to the teaching contract (editing and two new visuals, no new runs).

## Build and checks
`sh build.sh` (the skill template) writes `../index.html` from `parts/`: `01_head`, `10_header` (title, subtitle with the measured reading time, tab bar), Reading `20_read_a` to `20_read_l` plus `20_read_z`, `39_tab_more`, then every `*.js` part in its own script, `99_js_tabs.js` last.

- `python3 recompute.py && node check_recompute.mjs`: ring, clocks and history verdicts in JS against Python; the measured table against `inputs/replication_local.json`.
- `node check_raft.mjs`: fuzzes the Raft model (300 runs, safety after every event, liveness after healing).
- `node check_page.mjs`: clicks every control at 390 dark and 920 light; `node check_stages.mjs` (see 2026-11-07); `node shot_el.mjs <w> <dark|light> t-read <id>` for element screenshots.
- `python3 ../../../../../html_utils/ledger.py check <page>` from the repo root: the knowledge ledger.
- Measurement (unchanged): `measure_replication.py` (real Postgres 16.2 primary and streaming replica via the pgserver wheel, about a minute) writes `inputs/replication_local.json`.
- Older provenance kept: `live.md` (the old Notion page, verbatim), `coverage.json`, `handoff_queues.md`, `handoff_reliability.md`.

## 2026-11-07: split layout, four 3D stages, explained and autoplaying animations (the 2026-11-06 rollout)
- **Templates** `02_split.html`, `25_js_s3.js` (renderer v2, as `33_js_s3.js`), `21_js_rd_common.js` and `99_js_tabs.js` (key `dsf-tab`) copied unchanged; `build.sh` cats `02_split.html` after `01_head.html`. The page's `#t-read .an-ctl` rules no longer reach the stage bars (`:not(.stg-bar)`). `22_js_hero.js` and `26_js_fence.js` were removed.
- **Four stages** (`35_js_sc_kit.js` holds the shared machine, log-stack, tag, timer and cross pieces), each with an `ol.sx` step list on the left and no per-step caption:
  - Fig. 1 `stg-hero` (5 steps, `36_js_sc_hero.js`) replaces the 2D hero; its numbered list became the steps. Illustrative layout.
  - Fig. 2 `stg-q` (5 steps, `37_js_sc_quorum.js`, new): Dynamo's (3,2,2), Cassandra ONE / ONE and QUORUM with 5 copies, drawn as the widget draws them (the read takes the worst R); `window.DSF_QSTEPS`. The slider widget moved into its own split, "Try any N, R and W".
  - Fig. 3 `stg-raft` (8 steps, `38_js_sc_raft.js`) replaces the 2D guided tour: `34_js_raft_trace.js` runs the page's own model (seed 11) through eight stretches and records every state and message; each step plays its stretch (the long-replay rule, case a), messages as dots, logs as slabs coloured by term, timers as draining columns, heartbeats flowing at rest. The step list's numbers (S1 times out first at 227 ms, a four-way split vote in term 1, S3 leads term 2 at 444 ms, S2 wins term 3 224 ms after the crash, entries 7 and 8 never commit, terms climb from 4 to 11) are `DSF_RTRACE.facts`, checked by `check_stages.mjs`; `check_raft.mjs` checks the trace's safety too. The free mode stays as a widget beside "Break it yourself" (it never plays by itself).
  - Fig. 4 `stg-fence` (two modes, 5 steps each, `39_js_sc_fence.js`) replaces the 2D fencing timeline; the mode chips swap the step list (`sx-fence-0`, `sx-fence-1`).
- **2D animations with step lists**: the replication-lag stepper (`sx-repl-0` to `-3`) and the idempotency stepper (`sx-idem-0` to `-2`); their script-written captions became the list items, the counters stay.
- **Model fix**: the Raft model's event line "heard no leader for N ms" printed the new random timeout instead of the one that had just run out; it now prints the elapsed one (the random sequence is unchanged, so every run is the same).
- **Splits**: the idea (Fig. 1), 1 partial failure (the four silences), 2 (clocks widget), 3 (measured table; then the lag stepper), 4 (Fig. 2; then the slider widget), 5 (history checker), 6 (CAP toggle), 7 (Fig. 3; then the free-mode widget), 8 (Fig. 4), 9 (the idempotency stepper), 10 (the ring widget). Full width: the problem table, habit, new terms, owners note, partitions-pauses-clocks, failover, multi-leader, leaderless, linearisable against serialisable, PACELC, why consensus, hot keys, 11, 12 and every closed block.
- **Checks**: `node <page>/src/check_stages.mjs [shot dir]` from the repo root (new): at 1400 light, 920 light and 390 dark the four stages and two animations play when scrolled into view, reach their last step in every mode with one list item per step, stop redrawing off screen and never move under reduced motion; the Raft widget never moves by itself; splits are two columns at 1400 only; the step lists' numbers match the trace, the quorum settings, the fencing amounts and the measured table.
- **Phones**: under 520 px Fig. 1 and Fig. 4 look along their long axis so the scene fills the tall card, and side labels hide (the steps name the parts).
- **Ledger** (problems 0): 563 units, core 376, depth 69, owned 9, fat 109 (unchanged counts); units 302, 478, 479, 480 and 554 re-keyed to the stage's step list and the free-mode text.
- **Length**: Reading core 40.3 to 49.4 min (9,260 to 11,358 words), closed 9.7 to 9.8, Further reading 3.9 unchanged. The growth is the step lists (2,178 words), which carry what the script-drawn captions of the tour, the fencing, replication and idempotency steppers said (the audit did not count those); 833 of those words sit in modes not on screen, so one mode per figure reads in about 46 minutes. Nothing knowledge-bearing was cut.

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

(2026-10-24 state; superseded by the 2026-11-07 section above.)

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

2026-10-26 (final follow-up sweep): the history checker's result line reads "Linearisable order" (British spelling, as the verdict table already did); quoted sources keep "linearizable".
