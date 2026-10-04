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
