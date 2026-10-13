# Distributed PyTorch child: visual ideas, built and rejected

Central question: for each distributed API, what does every process hold and which collectives does it call, measured on the running example, and how do you check it on your own job?

Existing visuals not repeated (parent's Distributed lab tab): DDP against FSDP2 step animation, DDP bucket strip, DTensor redistribution explorer (all placement pairs), GPipe against 1F1B animation, DCP chunk map, hang evidence tables, collectives primer.

## Built (score: computable from data / reproduces a figure / shows what prose cannot / corrects a misconception / measures the central question, 0 to 2 each; +1 animation before/after)

| # | Idea | Placement | Score | Data |
|---|---|---|---|---|
| 1 | **TP against TP + sequence parallel, one block, animated** (same input, 2 ranks; lanes = each rank's tokens as 8 tiles; gold = Partial; chips for each module and collective; counters: collectives so far, tokens held, recorded per-step totals, saved activations) | Reading, section 6 | 2+1+2+2+2+1 = 10 | tp_tp1.json, tp_tpsp.json (recorded placements and local shapes at module boundaries) |
| 2 | **Pipeline schedule explorer**: all 7 schedules at m = 4 and 8 (2 ranks) and GPipe/1F1B on 4 ranks; measured timeline per rank from wrapped stage methods; ideal-clock replay of the recorded order (F 1, B 2, I 1, W 1) with dependencies; compare two schedules stacked; playhead with play/scrub and in-flight counter; table with spread of 5 repeats | Own tab | 2+2+2+1+2+1 = 10 | pps_*.json (bench lock); ideal clock reproduces (p-1)/(m+p-1) for GPipe/1F1B by construction |
| 3 | **Comm-hook bytes lab**: bytes, relative gradient error and loss per step for every DDP hook over 30 steps, 2 and 4 ranks; PowerSGD byte calculator (rank slider, min_compression_rate) | Own tab | 2+2+2+2+2 = 10 | hooks_w2/w4.json; calculator reproduces recorded bytes for rank 1, 4, 16 and fp16 independently from shapes and the source's rule |
| 4 | **Mesh explorer**: six real layouts (DDP 4, FSDP2 4, HSDP 2x2, reshard-to-2, FSDP x TP 2x2, PP x FSDP x TP 2x2x2); click a rank: its groups, its shards of 8 parameters, every collective by mesh dimension, memory, losses | Own tab | 2+1+2+1+2 = 8 | fsdpm_*.json, compose3d.json |
| 5 | Collective time against size, log-log, alpha + S/B fit per op, 2 and 4 ranks | Reading, section 2 | 2+0+2+1+1 = 6 | coll_time_w2/w4.json (bench lock) |
| 6 | FSDP2 prefetch timeline (implicit against explicit 2-ahead), issue times vs block forward/backward | Reading, section 4 | 2+0+2+1+1 = 6 | fsdpm_prefetch.json |
| 7 | Elastic restart timeline (two ranks, crash, restart gap, resumed steps) | Reading, section 1 | 2+0+1+1+1 = 5 | elastic.json, elastic_repeats.json |
| 8 | Tables generated from data: collective payloads, unused-parameter options, hooks, MixedPrecisionPolicy, FSDP1 vs FSDP2, DTensor propagation (28 cases), pipeline summary, 3-D composition per rank | Reading | n/a | inputs |
| 9 | Predict-then-reveal: fastest collective at 64 MiB; no_sync collective count; LayerNorm gradient under SP | Reading | n/a | inputs |

## Rejected
- Re-animating DDP against FSDP2 or GPipe against 1F1B: the lab tab owns them (linked).
- A wire-level byte counter: no per-process network accounting on macOS; flight-recorder payloads plus ring formulas instead (same as the lab).
- Scaling curves of step time over ranks: loopback gloo says nothing about NVLink; collective timing kept to one chart with load averages.
- Context parallel animation over the whole model: the running example derives positions from the local length, so CP could only be run at the attention level; prose with recorded numbers instead.
- Expert parallel / all_to_all dispatch: the model is dense; all_to_all shown only in the collective table.
- A torchtitan trainer run: done by the libraries child (linked); this page composes the APIs directly.

## What the methodology lacked
A rule for "measurements of failure": several findings here are crashes (PowerSGD order race, async_save on the default group, batched PowerSGD assertion, gloo 64 MiB all-gather abort, flaky elastic restarts). The page records each with its run, how often it happened, what fixed it, and says plainly when the cause was not isolated, rather than dropping the run or retrying until it passes.
