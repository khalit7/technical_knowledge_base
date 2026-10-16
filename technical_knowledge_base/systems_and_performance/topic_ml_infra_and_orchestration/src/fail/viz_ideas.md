# Failure lab: visual ideas

Central question: when a piece of a training job dies, what does each scheduler do, how long does it take, and what does it cost in goodput?

## Built
| # | Idea | Placement | Why |
|---|---|---|---|
| 1 | Llama 3 Table 5 bars, every row or the paper's categories, misprinted row flagged, table-check box | s1 | the one published failure table, checked (30.1% printed for 35.3%) |
| 2 | Failure matrix (failure x system, 12 recorded runs) with an animated timeline replayed from each run's log lines, square-root time axis | s2 | the tab's core: same failure, three schedulers; before/after between policies |
| 3 | Progress against wall-clock, with and without checkpoints, animated (real Slurm runs) | s3 | before/after on the same input, measured |
| 4 | Bit-for-bit tables: seven resumed runs, and the three-run experiment isolating DDP bucket rebuild | s4 | turned an unexpected last-bit difference into an explanation |
| 5 | Straggler lanes, animated, toggling 0/50/200 ms (measured step times; illustrative split) plus probe bars | s6 | shows "the slow rank waits least" |
| 6 | Elastic run: step against time with a world-size band, no spare against spare | s8 | measured shrink (44 s) vs spare (18 s) |
| 7 | Goodput calculator: exact formula curve, Young, Daly and optimum marked, measured recovery presets, seeded simulation check, replay table against measured runs | s9 | new input R from this lab; checked against simulation and measured runs |
| 8 | Predict-then-reveal drills (requeue time, root-cause rank) | s2, s5 | |

## Rejected
- Re-deriving Young/Daly and a Monte Carlo of intervals at length: owned by the hardware reliability page (linked).
- MTBF-versus-cluster-size calculator: the Reading tab has one (linked).
- Mapping each Table 5 cause to "crash / node / hang": the paper does not say how each surfaced; it would be invented.
- Hang and poison-step runs on Kubernetes and Ray: the timeout and the retry counting are not scheduler-specific; noted in the matrix instead of spending runs.
