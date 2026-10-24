# Visual ideas: fault tolerance child page

Central question: for each kind of failure, how long until someone notices, which recovery design removes which part of the lost time, and how do you catch the failures that raise no error?

## Built
| # | Idea | Placement | Why | Data |
|---|---|---|---|---|
| 1 | Eleven failure tables on one scheme (stacked bars, our mapping), share of failures or of GPU time; click for every row as printed with arithmetic checks | Failure taxonomies tab | answers "across all reports, what fails"; units shown, misprints flagged (Llama 3 row, ByteRobust text vs table, Meta 2026 "18 minutes") | `inputs/tax.json` from `tax_*.txt` |
| 2 | Llama 3 (2024) against Meta's 32K-GPU job (2026), toggle | Reading 2 | before/after on the same unit and company: HBM now leads | same |
| 3 | Predict-then-reveal: Acme script errors by jobs vs GPU time | Reading 2 | corrects "most failures are hardware" / "most are user code" | Acme Table 3 |
| 4 | Time until someone notices, by failure shape: defaults / lab measured / tuned published | Reading 4 | the cost of each shape is detection time; shows the "never" rows | source defaults, root runs, ByteRobust Table 3 |
| 5 | One failure under two designs on one clock, animated (play, step, scrub, speed), components to scale | Recovery designs tab | before/after on the same input; job size and failure-rate controls | `inputs/rec.json` |
| 6 | Time lost per failure, every design, stacked by component | Recovery designs tab | which component dominates where | same |
| 7 | Goodput against job size, one line per design, with the Meta reproduction box | Recovery designs tab | crossover in scale; defaults reproduce Kokolis et al. Observation 10 independently (0.891 at 2,048; 0.922 at 12,000 with 10 s writes) | model of the root's Failure lab |
| 8 | Bit flip: four replicas animated (local gradient, all-reduce, update, checksum), loss difference chart, detector table for six flips | Reading 7 | measured: before vs after the all-reduce decides which detector works; replay names the chip | `runs/sdc_*`, `grad_*`, `w_*`, `rp_*` |
| 9 | Straggler Gantt animation (compute vs wait per rank, per step), three runs | Straggler replay tab | measured: the slow rank waits least | `runs/strag_*` |
| 10 | Detector bench (five rules, median/max, window, threshold) with truth vs flags and a scoring table | Straggler replay tab | relative score at NVRx's 0.75 finds the culprit in 4 steps with no false alarm; wait-ranking never does | same |
| 11 | Goodput accounting bars of three measured runs | Reading 9 | names every lost second on real runs | root `fl_recompute.json` |

## Rejected
- A one-day timeline of a 16k-GPU run under several designs: built on Training Infrastructure ("one day four ways"); linked.
- Young/Daly derivation and Monte Carlo: owned by the hardware reliability page.
- Llama 3 Table 5 bars by itself: the root's Failure lab and the Llama 3 paper page have it.
- New failure runs on the clusters: the root lab's twelve cover crash, node loss, hang, poison step, elastic and spares; nothing new would be learned for the cost.
- Async vs sync checkpoint pause on the tiny job: the root's Storage lab measured it (77.9 ms vs 1.81 s); repeating it adds nothing.
- Pooling all tables into one percentage: units differ (interruptions, jobs, incidents, Xid messages); shown side by side instead.
- A just-in-time checkpoint row in the comparator: its evaluation numbers could not be read (paper not accessible); described in prose only.

## What the methodology lacked
A rule for cross-report taxonomies: keep each report's rows verbatim, make the mapping explicit and labelled as ours, never pool across counting units, and offer the GPU-time weighting where printed.
- 2026-10-19: built from the root Failure lab (moved here): with/without-checkpoint progress, bit-for-bit tables, Slurm straggler pacing and probe, elastic shrink/grow and spare, goodput against the interval. Rejected: a second copy of Table 5 and of the measured-run accounting (already on this page).
- 2026-10-24 (teaching-contract rebuild): built the hero (one failure at 16,384 GPUs, defaults against the best stacked design, same model as section 5) and a static annotated diagram of four checkpoint strategies by what they stop training for (section 4, new; this page owns checkpointing strategies). Moved inline: the one-failure animation, time-lost bars and goodput-against-size curve (from Recovery designs), the straggler replay and detector bench (from Straggler replay). Removed: the Slurm straggler animation (illustrative compute/wait split; the replay measures it) and the goodput-against-interval calculator (the reliability page's section 6 owns the interval curve). Rejected: redrawing the measured sync/async animation (Storage and data movement, section 7, has it; linked).
