# Distributed lab: visual ideas, built and rejected

Central question: what does each PyTorch distributed API actually send, hold and cost for one training step, and how do you check it?

## Built
1. **DDP against FSDP2, the same step, animated** (13/14). Two rank lanes, real collective issue times and sizes (flight recorder), bars to scale with bytes, a playhead, rank 0's memory from the memory-profiler timeline aligned at the phase boundaries, counters (time, collectives, payload, memory now and peak). Third mode: FSDP2 without resharding. Before/after on the same input.
2. **DTensor placement explorer** (13). Mesh x source x target placements over all 288 recorded pairs; local values per rank (derived in the page, checked against all 990 recorded rank-pairs), collectives as DTensor requested them and as gloo ran them, refusals shown with their message. Summary table for the 1-D mesh.
3. **DDP bucket strip and timeline** (12). Parameters in gradient-ready order, width by bytes, coloured by bucket; step 0 (one bucket), rebuilt buckets, and 1 MiB buckets; ticks for gradients becoming final, diamonds for all-reduces; caption computes the exposed wait.
4. **Memory per rank bars** (11). Weights, AdamW state, DDP buckets, step peak; tiny model and 8-block variant; 2 and 4 ranks; reshard on and off.
5. **Bytes per step table** (10). Recorded payloads with the ring model applied, NCCL-like and gloo; reproduces the Distributed Training page's 1.5x FSDP/DDP ratio from recorded collectives (by construction of the ring model, independently of the page's formula inputs).
6. **Pipeline schedule animation** (10). GPipe against 1F1B from the recorded action order, unit clock labelled illustrative, in-flight counter, measured peak per rank.
7. **DCP chunk map** (8). Saved chunks per file against the 2-rank load shards for any tensor, file table.
8. **Hang evidence** (9). Four recorded failure modes with error text and side-by-side flight-recorder tables, mismatching rows highlighted.
9. Collectives primer (5 verbs on toy values, cost per rank), FSDP2 shard table, TP MLP diagram with recorded stats, two predict-then-reveal questions.

## Rejected
- Per-collective durations: gloo does not record start and completion in the flight recorder; issue times only.
- A wire-level byte counter: no per-process network accounting on macOS; payload plus a stated cost model instead.
- Context parallel: needs SDPA backends and CUDA-only paths in 2.14 for the ring attention; not run, described on Distributed Training.
- Expert parallel: the running example is dense.
- Timing-based scaling charts: CPU and loopback numbers say nothing about NVLink; one small section with load averages instead.
- Memory from summing op self-memory (first attempt): misplaced AdamW's frees and missed FSDP2's resize_(0) frees; replaced by the memory profiler timeline.

## What the methodology lacked
A rule for measurement tools that lie quietly: when two recorders disagree (op self-memory against the memory profiler), check each against an independent count (tensor-by-tensor persistent bytes) and say which one the page uses and why.
