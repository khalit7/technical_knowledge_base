# Visualisation ideas: Queues, streams and async work

Central question: how often does handed-off work actually happen (zero, once, twice) when machines crash, and how do you make it exactly once in effect?

## Built (ranked; score out of 14 on the Methodology's seven questions)

| # | Idea | Placement | Score | Data and formulas | Notes |
|---|---|---|---|---|---|
| Q1 | **Order 42: dual write vs outbox, animated** (commit then publish; publish then commit; outbox with relay crash and consumer dedup), counters for orders, events, lost, phantom, receipts | Reading, s-dual | 13 | Crash points are those injected in `lab/pg_lab.py`; captions quote measured counts | The before/after animation Khalid asked for; three modes because swapping the order of the writes only swaps the failure |
| Q2 | **Measured on a real Postgres**: at-most-once, at-least-once, idempotent receiver, short visibility timeout (bars of lost / duplicate / caught, 3 runs each); outbox table (lost, phantom, duplicates, batch 10 vs 1); SKIP LOCKED vs FOR UPDATE throughput by workers | Reading, s-meas, s-dual, s-jobs | 13 | `lab/pg_lab.py`, `lab/pg_lab_batch1.py` -> `inputs/lab_*.json` -> `gen_lab_js.py`; expected duplicates N p/(1-p) = 52.6 vs 50.3 measured | Real processes, transactions, row locks and lease redelivery; only the crash is injected (os._exit) |
| Q3 | **Queue lab** tab: arrivals (rate, burst, backlog), workers, work time, visibility timeout, crash rate, restart, poison fraction, max receives (DLQ), queue bound, idempotent toggle; depth, oldest age, completions over time; stats; live Little's law check | Own tab | 12 | Seeded discrete-event model (`22_js_qsim.js`), mirrored in `recompute.py` and checked exactly by `check_sim.mjs`; the two "Lab run" presets reproduce the measured duplicates independently (20-seed means 53.0 and 21.5 vs 50.3 and 22.3) | Presets teach overload, bursts, bounded queues, crashes, short leases, poison with and without DLQ |
| Q4 | **Keys to partitions to consumers**: real Kafka murmur2 partitioner (reproduces 6 UtilsTest vectors), partition and consumer sliders, idle consumers, hot partition note | Reading, s-kafka | 10 | murmur2 port checked in node and Python | Shows per-key order, the partition cap on group parallelism, and why changing partition counts moves keys |
| Q5 | **Saga: success, failure with compensation, and 2PC** toggle | Reading, s-saga | 6 | microservices.io, Garcia-Molina and Salem 1987, Gray and Lamport | Static step cards; cheap, and makes compensation concrete |

## Considered and rejected
- A real Kafka run (KRaft in a container) to measure EOS overhead: needs a JVM and a container runtime, not cheap on this laptop; used Confluent's published 3% / 20% (2017) and the 2020 benchmark instead, dated.
- An animated Kafka transaction protocol (coordinator, markers, LSO): six numbered steps read better; an animation would be decoration without a measurable quantity.
- A per-library comparison chart (Celery vs RQ vs Arq vs Dramatiq throughput): no comparable published numbers; a table of delivery defaults teaches more.
- Rebuilding the root's Step 3 queue animation or the Scale simulator: linked instead.
- Retry storm or backoff visual: owned and measured by Reliability engineering; linked.

## What the methodology lacked
A rule for experiments with injected faults: say exactly which part is injected (the crash, by os._exit at a named line) and which is real (locks, leases, redelivery, transactions), and give the expected count from a formula next to the measured one.

## Added in the 2026-10-24 rebuild (teaching contract)

| # | Idea | Placement | Kind | Notes |
|---|---|---|---|---|
| Q6 | **Hero: three places handed-off work goes wrong** (hand-off, ack, rate) on one producer-to-effect chain | Reading, top | static annotated diagram | The whiteboard picture the page elaborates; numbered badges match the three fixes |
| Q7 | **Queue against log**: deleted on ack and competing workers, against a retained log with three readers at their own offsets | Reading, s-kinds | static diagram | Replaces two prose boxes |
| Q8 | **What a Kafka transaction covers**: output topic and `__consumer_offsets` inside, e-mail and Postgres outside | Reading, s-eos | static diagram | The scope claim made visible; the protocol steps went to a closed block |
| Q9 | **Visibility timeout toggle**: 30 s for a 45 s job (duplicate), heartbeat (one run), 300 s with a crash (late) | Reading, s-vt | toggle-compare of end states | Times illustrative; the measured "too short" run is cited beside it |
| Q10 | **Backlog drain slider**: capacity as a multiple of the arrival rate, one-hour outage; drain = 60 / (k - 1) min | Reading, s-bp | one slider, prediction prompt | Default 2x lands on Yanacek's "double the capacity for another hour" (from the formula, independently of his number); the line is also the age of the oldest message for FIFO |
| Q11 | **Nightly batch LLM job stepper**: 7 steps, each with its failure and the key that makes a rerun harmless | Reading, s-batch | stepper (RD.anim, no autoplay) | The page's worked example (OWNERS: batch LLM jobs); counts illustrative, provider terms sourced |

Moved: the measured redelivery chart now sits beside the at-most-once / at-least-once code (it was a separate "Measured" section). Removed autoplay: the outbox animation no longer starts on a mode switch, and `21_js_rd_common.js` is the skill template.
Kept as a tab: the Queue lab, because it is a tool used across the page (redelivery, timeouts, DLQ, backpressure, Little's law), not the explanation of one mechanism.
Rejected: a photo or real figure. Nothing physical teaches here, and a vendor console screenshot (an SQS age-of-oldest-message graph) has no clear reuse licence.
