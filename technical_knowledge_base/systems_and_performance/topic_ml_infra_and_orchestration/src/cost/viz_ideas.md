# Cost lab: visual ideas

Question the tab keeps returning to: of every GPU-hour paid, how much trains the model, and where does the rest go?

## Built
1. **One allocation, phase bar** (measured, every system): the allocation from the scheduler's own accounting, coloured by rank 0's log (start, startup, first step, steps, checkpoints, tail). Shows fixed costs and the storage choice in one bar.
2. **Before/after animation, 200 vs 2,000 steps on kind** (same JobSet, same scale, the other run ghosted below): step through the allocation as it is spent, counters for GPU-seconds and training share. Startup amortisation seen, not described.
3. **Queue view through the cost lens** (Scheduling lab's records): Slurm FIFO vs backfill Gantt plus GPUs-busy area, the kind deadlock (12 of 12 held, 0 steps), Kueue's fragmentation (8 of 12), Ray placement groups pending.
4. **Failures priced** (Failure lab's Slurm runs): GPU-seconds held per run as timelines with gaps, clickable captions; straggler runs compared with each other.
5. **Price table** (published, dated, by kind: on-demand, reserved, spot) with the not-like-for-like notes.
6. **Run-cost calculator** with residual against the Llama 3.1 405B model card (31.65M vs 30.84M GPU-hours, +2.6%, partly by construction) and capacity planning.
7. **Utilisation waterfall**, before/after toggle animated, two presets: measured on the Mac (FIFO + 200 steps -> backfill + 2,000 steps), published at scale (Gemini 1.0 goodput 85% -> 97%, MFU assumption).
8. **"100% util" drill**: 132-SM grid over a 20-slice window for three cases with nvidia-smi and DCGM readings from their definitions; predict-then-reveal on a hung job.

## Rejected
- Goodput vs checkpoint interval curve: owned by the Failure lab (linked).
- MFU calculator, FLOP ledger, deadline planner as its own tab: owned by Performance math (linked; same peaks used).
- Price history chart: a pattern Khalid removed from other pages; one dated snapshot is enough.
- AWS spot prices: the public feed is stale (2024-05-13).
- Measured GPU metrics: no GPU on this machine; the drill is labelled derived.
- Rerunning Slurm and Ray for fresh accounting: the lead asked for recorded data; Slurm and Ray records already existed.
