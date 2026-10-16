# Scheduling lab (tab `t-sched`, parts `31_*`, prefix `sc`)

How jobs get machines, measured on the topic's three local clusters (see `../data/README.md`) on 2026-10-16.

| Folder | What |
|---|---|
| `scripts/slurm_runs.sh` | The Slurm runs: w1 (the Reading tab's eight-job queue on 8 fake GPUs, `sched/builtin` then `sched/backfill`), w2 (fairshare), w3 (preemption). Switches `SchedulerType` for w1 and always restores `../data/slurm/slurm.conf`. |
| `k8s/` | `jobset.sh` (the running example as a JobSet, 2 pods x 4 fake GPUs; `gated` or `kueue`), `team-job.sh`, `sc-queues.yaml` (LocalQueue sc-lq on mi-cq; ClusterQueues sc-cq-a/b in cohort sc-cohort), `k8s_runs.sh` (k1 deadlock without gang, k2 the same through Kueue, k3 borrowing and reclaim). |
| `ray/ray_pg.py` | Placement groups: PACK, SPREAD, STRICT_PACK, STRICT_SPREAD, and gang reservation. |
| `scripts/sim.py` | The batch-scheduler simulator (FIFO, EASY, conservative); `check_sim.mjs` checks the page's JS port against it. |
| `scripts/make_data.py`, `scripts/parse_k8s_ray.py` | Build `parts/31_js_sc_0data.js` from `runs/`. |
| `scripts/check_data.mjs`, `scripts/check_ui.mjs` | Data embedded exactly; every control clicked at 390 px dark and 920 px light. |
| `runs/` | Scrubbed raw outputs (sacct, squeue/sprio/sshare snapshots, kubectl pods/events/workloads, pod logs, Ray JSON lines). |
| `out/` | Simulator outputs. |

Sources quoted on the page: Slurm at tag `slurm-24-11-5-1` (commit e4788bed70462dc5e14b1b170d271d7495a0f334), Kueue at `v0.20.2` (commit 296ec3db567abbe36b65a63695710e3d3f3d0bdb), sparse shallow clones.

Lessons recorded on the page: Slurm's backfill reservations block whole nodes (so it backfills less than a GPU-pool model predicts); `--gpus=N --cpus-per-gpu=1` can take all CPUs of a node and strand GPUs.
