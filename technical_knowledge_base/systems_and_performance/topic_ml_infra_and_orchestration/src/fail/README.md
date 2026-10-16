# Failure lab (tab t-fail, prefix fl) of Topic: ml-infra-and-orchestration

Built 2026-10-16. Parts: `src/parts/33_tab_fail_[a-d].html`, `src/parts/33_js_fl_*.js` (`33_js_fl_0data.js` is generated).

Rebuild the data: `python3 scripts/fl_recompute.py && python3 scripts/fl_make_data.py`, then `sh ../build.sh`.

| Path | What |
|---|---|
| `scripts/fl_wrap.py` | runs the running example's `train.py` unchanged, adding `--crash-once` (crash knob fires on the first attempt only), `FL_PROBE=1` (per-rank backward timing), `FL_NOREBUILD=1` (DDP bucket rebuild off) |
| `scripts/fl_train.sbatch` | `src/data/slurm/train.sbatch` plus `MAXR` (torchrun `--max-restarts`) and `FL_NOSHARE=1` (`TORCH_DISABLE_SHARE_RDZV_TCP_STORE=1`) |
| `scripts/fl-jobset.yaml`, `fl_k8s.py` | the running example's JobSet with `failurePolicy.maxRestarts` and the wrapper |
| `scripts/fl_ray.py` | `src/data/ray/ray_train.py` with `--crash-once` |
| `scripts/fl_elastic.sh`, `fl_spare.sh` | elastic torchrun in one container: shrink and grow; hot spare |
| `scripts/fl_healthcheck.sh` | Slurm HealthCheckProgram that drains its node |
| `scripts/fl_save_runs.sh` | copies raw evidence from scratch into `runs/`, scrubbed with `src/data/scrub.py` |
| `scripts/fl_recompute.py` | Table 5 checks, rates, goodput headline numbers, replay of measured runs -> `fl_recompute.json` |
| `scripts/fl_make_data.py` | logs -> `fl_data.json` and `parts/33_js_fl_0data.js` |
| `runs/` | scrubbed logs of every run (names as on the page: fl-crash, fl-node, fl-k3, fl-r3, el3, exact, ...) |
| `inputs/` | text extracts of Llama 3 sec. 3.3.4 and Table 5, OPT sec. 2.5, Gemini 1.0 sec. 3 |

Clusters: Slurm's `slurm.conf` was changed for the health-check test only (HealthCheckProgram, interval 10 s) and restored from `src/data/slurm/slurm.conf`; node c2 (Slurm) was killed and restarted, mi-kind-worker2 was paused, tainted out-of-service, untainted and unpaused, mi-ray-w2 was killed and restarted; Ray was started and stopped by this lab.

Departure from the topic method: a lab tab, not a comparison; it links the reliability page and Training Infrastructure instead of repeating Young/Daly and the run-side costs.

## Root fix pass (2026-10-16)
Added to the tab: Ray Train v2 restoring an older checkpoint (step 50 although step 100 was on disk, 3 of 3 runs; report_handler.py in Ray 2.59.0, method at line 40, early return at line 63; from the Ray child); the Launch lab's confirmation that torchrun's "Root Cause" names a waiting rank; the flight recorder recording gloo collectives in torch 2.14.1 (Launch lab); the two NCCL messages at v2.14.1 (ProcessGroupNCCL.cpp 735-739, 1954; heartbeat 480 s, line 1775); a Go deeper line. The tab has no check script of its own: it was clicked at 390 dark and 920 light by a scratch script (76 controls, no errors, NaN or sideways scroll).
