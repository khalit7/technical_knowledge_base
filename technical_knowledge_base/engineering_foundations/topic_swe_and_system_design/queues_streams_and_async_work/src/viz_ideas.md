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
