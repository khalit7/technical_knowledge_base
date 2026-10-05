# OS simulators tab: visual ideas, built and rejected (2026-10-05)

Question the tab serves: "what does the mechanism actually do, step by step, and does a real kernel agree?"
Scores 0 to 2 on: parameter the reader moves; reproduces a published figure (counts double); computable from public
data or a real run (counts double); shows what a sentence cannot; corrects a misconception; animation of a before/after.

## Built
| # | Idea | Score | Reproduces / checked against | Placement |
|---|---|---|---|---|
| S1 | Gantt animation of one job mix under two policies at once (policy plus "compare with"), per-tick captions naming preemptions | 11 | OSTEP Fig. 7.4 (SJF 103.3) and 7.5 (STCF 50) on the first preset; scheduler.py and mlfq.py on 70 random mixes | sec. 1 |
| S2 | Every policy on the same mix: turnaround and response bars | 8 | same | sec. 1 |
| S3 | CFS vruntime lines under the Gantt | 8 | Linux v5.10 fair.c rules (slice, START_DEBIT, sleeper placement) | sec. 1 |
| S4 | Real: nice 0 against nice 5 and 10 on one pinned CPU, formula against kernel | 10 | 75.35% predicted, 75.38% measured; 90.30% against 90.36% | sec. 1 |
| S5 | Real: context-switch cost by pipe ping-pong (lmbench method) | 6 | 1.28 to 1.35 us per switch | sec. 1 |
| S6 | Address translation step by step: bits, PTE, PA; two-level walk over OSTEP's own `-s 1` memory with its answers shown | 10 | paging-linear-translate.py (240 VAs), paging-multilevel-translate.py (300 VAs) | sec. 2a |
| S7 | TLB on an array walk, row against column order, cells coloured by page, hit/miss dots, live TLB contents | 10 | OSTEP Fig. 19.2 (70%) | sec. 2b |
| S8 | Real: ns per access against pages touched, 4 KiB against 2 MiB pages (huge pages as the control that isolates translation from cache footprint) | 11 | measured; first attempt without staggered offsets measured L1 set conflicts, without huge pages the cache footprint confounded it | sec. 2b |
| S9 | Page replacement table animation, all four policies' hits, faults by frame count with Belady cells in red | 10 | OSTEP Fig. 22.1 (OPT 6/11), Belady 9 then 10; paging-policy.py FIFO/LRU/OPT on 40 strings | sec. 2c |
| S10 | Copy-on-write page grid: fork, then the child's reads copying object pages; list against numpy | 11 | real fork: 7,880 pages measured against 7,814 modelled | sec. 3 |
| S11 | x86.py race instruction by instruction, two code columns, critical section marked, "you are the scheduler" mode; final count by interrupt interval | 11 | x86.py on 120 settings | sec. 4 |
| S12 | Real race on 2 CPUs and 1 CPU, mutex and atomic, with the real arm64 asm of count = count + 1 | 10 | measured | sec. 4 |
| S13 | Deadlock as a holds/waits graph you step; exhaustive count of schedules (2 of 6 deadlock; 0 with lock order); real /proc view of the hung threads | 9 | measured | sec. 4 |
| S14 | Crash consistency: each crash point of five protocols, disk before and after recovery, summary table | 9 | OSTEP 42.1's six cases | sec. 5 |
| S15 | Predict-then-reveal drills (5) | 6 | | each section |

## Rejected
- Lottery and stride scheduling simulators (OSTEP 9.1 to 9.6): CFS covers proportional share on a real kernel; would lengthen the tab without a real counterpart.
- Multi-CPU scheduling and load balancing: the VM's 5 vCPUs share a laptop with other experiments; a simulator without a trustworthy real run teaches little.
- Segmentation and free-space (malloc) simulators: belong to the allocator child page.
- A real crash-consistency run: cannot control the device write cache inside Docker Desktop's VM (said on the page); the Debug lab owns the application-level torn checkpoint.
- EEVDF simulator: Linux 6.6+ cannot be run here, so no real check; the Reading describes it from sources.
- perf-counter TLB misses: `<not supported>` in this VM; replaced by the huge-page control.
- Reproducing Python's Mersenne Twister to match x86.py's random interrupts: fixed intervals are matched exactly instead; random mode uses the page's seeded generator.

## What the methodology lacked
A rule for "simulators of textbook algorithms": the published figures to reproduce are the textbook's own worked examples and its homework simulators' answers, which makes them exact tests rather than approximations. Also: when timing stands in for a hardware counter, design a control that holds everything but the mechanism fixed (huge pages here).
