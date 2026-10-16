# Launch lab (tab `t-launch`, parts `parts/32_*`, ids and classes prefixed `la-`)

How a multi-node job starts and finds its peers, measured with the running example (src/data/) on the three local
clusters on 2026-10-16 (Apple M1 Pro, Docker Desktop VM, shared machine).

## What ran
| Run | System | What | Script |
|---|---|---|---|
| la-t1..t5 | Slurm, Kubernetes (JobSet + Kueue), Ray Train | timing runs, 20 steps, no checkpoints; probes time every stage from submit to step 1 | `la.sbatch` + `la_slurm.sh`; `la-jobset.yaml` + `la_k8s.sh`; `la_ray_train.py` + `la_ray.sh` |
| la-miss | all three | one node (pod, Ray worker) never arrives | `LA_POD1='sleep 100000;'`; Ray `--workers 5` on 4 slots |
| la-badaddr | Kubernetes | MASTER_ADDR = pod 0's short host name | `la_k8s.sh ... la-badaddr-node-0-0` |
| la-typo | Slurm | rendezvous host that does not exist (c9) | `LA_EP=c9:29500` |
| la-local2, la-local | Slurm | MASTER_ADDR=localhost; la-local also collided with la-miss on port 29500 (kept as the port-collision case) | `LA_EP=localhost:29500` |
| la-ws | Slurm | srun without torchrun, WORLD_SIZE=4 for 3 tasks | `la_ws.sbatch` |
| la-stall | Kubernetes | rank 3 stalls after step 1; py-spy from the node, flight recorder dumps | `la_k8s_stall.sh` |

Probes (`la_probe.py`, `la_torchrun.py`, the Ray `worker_process_setup_hook`) only record timestamps; train.py is unchanged.

## Rebuild
1. Evidence (scratch, not in the repo; scrubbed copies of the small files in `raw_scrubbed/evidence/`).
2. `python3 scripts/la_collect.py <ev>` (runs `la_analyze.py`), `la_rz.py <ev>`, `la_hangs.py <ev>`, `la_extra.py <ev>`, then `la_make_data.py` writes `parts/32_js_la_0data.js`.
3. Checks: `python3 check_data.py` (embedded data equals out/, prose numbers match, privacy); from the repo root `node .../src/launch/check_launch.mjs <index.html> <shots dir>` (every control, 390 dark and 920 light).

## Findings worth keeping
- torchrun's static rendezvous waits 900 s, not the 600 s in static_tcp_rendezvous.py: launcher/api.py lines 125-130 fills in 900.
- c10d rendezvous took about 1 s because the dynamic backend polls with a 1 s delay (dynamic_rendezvous.py line 685); static took 0.03 s.
- With c10d, workers see a random MASTER_PORT (node 0's agent starts a second store; dynamic_rendezvous.py 1209-1217).
- A typo'd host failed after 162 s although the message says 60000 ms.
- Ray Train's worker-group start timeout (60 s) is retried forever: the job never fails on its own.
- `sbatch --export=ALL,VAR=x` crashed slurmd in these unprivileged containers ("fatal: clone: Operation not permitted"); variables are passed through sbatch's environment instead.
- Image pull is not in the timings: the image was preloaded on every node.

Departures from the method: this is a root-page lab tab (Part A data tab), deeper than a root Reading section because it is optional depth; the child page "Launching distributed training" will own the rest.
