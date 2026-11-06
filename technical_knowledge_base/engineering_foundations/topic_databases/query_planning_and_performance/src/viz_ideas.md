# Visualisation ideas: Query planning and performance (2026-10-04)

Scores: teaching value (T), real data (D), not done elsewhere (N), each 1 to 3.

## Built
| Idea | Where | T | D | N | Notes |
|---|---|---|---|---|---|
| Slow-query workflow animation, two modes (sort by total time / fix the noticed report) | Reading s7 | 3 | 3 | 3 | Real pgbench replay, pg_stat_statements before and after, real log lines and plans. Before/after = the method it replaces (hunch), whose gain ceiling is derived (2.4%). |
| Cost model calculator | Tab | 3 | 3 | 3 | Formulas transcribed from costsize.c and selfuncs.c; 150/150 EXPLAIN figures reproduced; JS checked against Python at 200 random settings. Measured times per forced path. |
| Plan reading lab, 8 real plans, click a line then choose a fix | Tab | 3 | 3 | 3 | Wrong clicks get a hint generated from the line. Reveal plans after the fix where measured. |
| Generic-plan sequence, toggle auto / force_custom / hinted | Reading s10 | 3 | 3 | 3 | Log-scale bars per call; best of three identical sessions. |
| MCV list against truth; histogram bucket strip | Reading s3 | 2 | 3 | 3 | Equi-depth buckets drawn to scale. |
| Statistics target table; extended statistics estimate grid | Reading s3 | 3 | 3 | 3 | Coloured by factor from truth. |
| Misestimate table (5 causes, factor off) | Reading s4 | 2 | 3 | 2 | |
| GEQO planning time chart | Reading s5 | 3 | 3 | 3 | Log scale, DP vs GEQO at 2..16 tables. |
| work_mem spill bars (sort, hash join, hash agg) | Reading s9 | 2 | 3 | 3 | |
| Parallel workers curve with perfect-scaling line | Reading s9 | 2 | 3 | 3 | |
| N+1 and batching bars | Reading s8 | 2 | 3 | 3 | Log scale for batching. |

## Rejected
- Rebuilding the root's eight Query plans cases (seq vs index, composite order, joins, cold vs warm): owned by the root tab; linked.
- Join-order search tree animation (DP subsets lighting up): attractive but illustrative only; the measured planning-time chart says the same with real numbers.
- JIT on/off measurement: the pgserver build has no LLVM (pg_jit_available() false); described from docs instead.
- Simulated network latency for N+1: macOS has no cheap tc netem; used the SWE topic's sourced 2 ms zone RTT arithmetic instead.
- Learned-optimizer results chart: numbers come from different benchmarks and selection rules; a dated table is more honest.

## What the methodology lacked
- A rule for noisy shared machines: here every timing is best of three, and page counts are presented as the stable measure; worth adding to the methodology.

## 2026-10-24 rebuild to the teaching contract
| Idea | Where | Kind | Notes |
|---|---|---|---|
| Hero: the title search's prediction path against EXPLAIN ANALYZE (100 estimated, 1 actual) | Top | Static annotated diagram | Horizontal at 700 px and wider, vertical on a phone. Real numbers from the workload's plan. |
| Misestimate dumbbell, five causes, log scale | Section 4 | Static chart | Replaces the script table; values from stats.json, lab_plans and generic.json. |
| Three join algorithms, each against its forced alternative | Section 5 | Static bars per algorithm | Data from the root's Query plans case 4 (c4.json), copied by import_inputs.py; the root's tab can now link here. |
| Bottom-up walk through a real plan, then the fix | Section 6 | Stepper (no tweening, never autoplays) | lab_plans corr_before / corr_after; compact rendering on narrow screens, said on the card. |
| Offset against keyset pagination by depth | Section 8 | Static log chart | Building a backend API's recording (pagination_pg.json). The 1M-deep offset row has 102 buffers against 17,544 at 500k, unexplained in the recording; the chart shows times only. |
| pgbench with and without a new connection per transaction, direct and through PgBouncer | Section 8 | Static bars | Running Postgres in production's recording (connections.json). |
| Cost model calculator moved inline | Section 2 | One slider plus closed settings | Was the Cost model tab. |

Rejected in this pass: a throughput-against-active-connections curve (no measurement exists on this machine, and an illustrative curve would teach a shape we cannot source; the wiki rule is quoted instead); photographs (a mechanism page, nothing physical to show); schematic drawings of the three join algorithms (the measured bars plus one sentence each carry it).

## 2026-11-06 rollout: split layout and 3D stages
| Idea | Where | Kind | Notes |
|---|---|---|---|
| Fig. 1: the title search predicted and run (pg_stats plate, the predicted tenth, the full walk with the one match rising, estimated against actual bars, the title B-tree) | Top | 3D stage, 5 steps | Replaces the 2D hero; numbers parsed from the workload's two plans. |
| Fig. 2: Seq Scan, Index Scan and Bitmap Heap Scan on the same 20,000 users, then messages with correlation 1.00 | Section 2 | 3D stage, 5 steps, new | Pages, costs and times from the cost-model recordings; tile positions illustrative and labelled so. |
| Fig. 3: the London-users plan as a tree, estimated against actual bars at every node, rows flowing up, then the fix | Section 6 | 3D stage, 7 steps | Replaces the 2D bottom-up stepper; the plan text stays beside it, marked per step. |
| The workflow | Section 7 | 2D animation with two step lists | Tables and plans read best flat. |

Rejected in this pass: 3D join algorithms (two measured bars per algorithm say it; a drawing of a hash table or a zipper would be illustrative only); a 3D join-order search tree (rejected before for the same reason); 3D for the curves (calculator, GEQO, pagination, parallel, spills, generic plans: numbers on log axes read best flat).
