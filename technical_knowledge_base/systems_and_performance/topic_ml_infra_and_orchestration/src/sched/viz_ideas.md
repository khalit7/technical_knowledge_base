# Scheduling lab: visual ideas (built and rejected)

The question the lab keeps returning to: **who gets the GPUs next, and what does each rule cost in idle GPUs and waiting time?** Every visual makes one rule's effect measurable on the same small workloads, recorded on real schedulers.

## Built
| Visual | Why it earns its place | Data |
|---|---|---|
| Same queue, FIFO vs backfill, as a stepped Gantt animation (before/after) with the simulator's plan as dashed outlines | The core mechanism; the Reading tab simulates this queue, the lab shows Slurm doing it and where Slurm departs from the simple model | `runs/slurm/w1_*.sacct`, `alloc.log` (GPU indices) |
| Simulator vs Slurm start-time table | Says exactly where a 40-line model is right and wrong | sim.py, sacct |
| Policy switcher at scale (FIFO / EASY / conservative; cluster size, load, limit padding) with busy-GPU line | Shows what 8 jobs cannot: troughs under FIFO, EASY vs conservative, load above 1 | simulated, labelled; JS == Python checked |
| Fairshare run Gantt (heavy team vs light team) + Fair Tree calculator whose defaults are the measured usage | Turns S/U and ranks into an ordering the reader can predict | `w2.sacct`, `w2.snap` (sshare, sprio) |
| Preemption Gantt (requeued victim drawn dashed) | One picture of what REQUEUE costs | `w3.sacct -D`, slurmctld log |
| Gang deadlock animation on kind, toggled against Kueue (before/after on the same three JobSets) | The partial-allocation deadlock is the classic Kubernetes training failure; seeing pods Running yet idle is the lesson | kubectl pods/events snapshots, pod logs |
| Borrow and reclaim timeline (Kueue cohort) | Quota lending and preemption by reclaim, with the real event text | k3 events |
| Ray placement-group table (PACK, SPREAD, STRICT_*; gang) | Placement strategies and atomic reservation, measured | `ray_pg.jsonl` |

## Rejected
- Topology-aware placement run (Slurm topology/tree, Kueue TAS): the lab cluster has no switches, so any result would be staged; explained with docs instead.
- Volcano run: not installed (memory budget); described.
- Per-second scheduling latency charts: laptop timings, little to learn.
- A "real trace" replay (e.g. Parallel Workloads Archive): large download, and the illustrative generator already shows the shapes; a child page (Slurm) could do it.

## What the methodology lacked
Nothing structural; the useful addition was "record GPU indices while jobs run" (sacct alone loses which GPUs a job held).
