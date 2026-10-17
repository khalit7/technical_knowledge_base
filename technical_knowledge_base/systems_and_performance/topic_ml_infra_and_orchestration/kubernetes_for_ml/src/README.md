# Kubernetes for ML page: sources, scripts and runs

Built 2026-10-16. Shape: `.claude/skills/explainer-page/page-kinds/topic-child.md` (child page), organised by the path of a job through Kubernetes (control loop, Jobs, scheduler, devices, placement, gangs, Kueue, JobSet, operators, storage). Departures: no old page to cover (`coverage.md`); the parent's Scheduling and Failure labs own the Kueue deadlock fix, borrowing, reclaim and node failures, so they are linked, not rebuilt.

## Rebuild
```
cd src
python3 -I recompute.py                      # out/scores.json, out/cases.json (stdlib only)
uv run --no-project --with pyyaml python -I make_data.py   # out/data.json, parts/22_js_km_data.js
sh build.sh                                  # ../index.html
python3 -I check/check_embed.py              # embedded data == out/data.json, prose numbers, privacy
node check/check_ui.mjs <page folder>        # from the repo root: every control, 390 dark and 920 light
```

## Files
| Path | What |
|---|---|
| `build.sh`, `parts/` | page parts (copied scaffold from the root and cluster_anatomy; storage key `km-tab`; prefix `km`) |
| `k8s/` | every manifest and generator that ran: `train-indexed-job.sh`, `train-jobset.sh`, `gpu-pod.sh`, `spread-pod.sh`, `gang-pod.sh`, `gang-podgroup.sh`, `kueue-job.sh`, `e4a-per-index.yaml`, `e4b-success-policy.yaml`, `e5-priority.yaml`, `e7-device-plugin.yaml`, `e8-dra*.yaml`, `e9-*.yaml`, `e10-kueue.yaml`, `e12-trainjob.yaml`, `km-sched-config.yaml` |
| `scripts/` | `km_watch.py` (namespace watcher, one JSON line per change), `km_lib.sh`, run drivers `km_e2.sh`, `km_e3.sh`, `km_e5.sh`, `km_e6.sh`, `km_e78.sh`, `km_e10.sh`, `km_e11.sh`, `km_e12.sh`, `km_evict.py`, the control-plane switches `km_sched_reconf.sh` and `km_gang_reconf.sh`, and `km_save_runs.py` (scrubs raw output into `runs/` with the root's `src/data/scrub.py`) |
| `runs/` | scrubbed evidence of every run (watch streams, events, objects, logs, scheduler logs); `runs/logs/` rank logs of km-e1 and km-e3b; `runs/e11_failed_webhook/` the first gang attempt that hit Kueue's webhook outage |
| `recompute.py` | the scheduler's NodeResourcesFit and BalancedAllocation scores ported from v1.37.0 and checked against the logged scores |
| `make_data.py` | runs -> `window.KM` |
| `check/` | `check_ui.mjs`, `check_embed.py`, `cards.mjs` (card screenshots) |
| `facts.md` | verified facts with sources (also appended to the topic's shared FACTS file under `km`) |
| `viz_ideas.md` | visuals built and rejected |

## Runs (all on kind `mi-kind`, namespace `km`, under the shared kind lock, 16 Oct 2026, 06:05 to 07:15 UTC)
e1 the running example as Indexed Job + Service; e2a-e2d2 crash and eviction under Job failure rules; e3a-e3c the running example as JobSet, eviction and crash under the JobSet failure policy; e4a/e4b backoffLimitPerIndex and successPolicy; e5a priority and preemption; e5b topology spread with a tainted block; e6 spread against bin-packing scores (scheduler reconfigured); e7 sample device plugin; e8 DRA with a hand-written ResourceSlice; e9 local-path PVC pinning; e10a Kueue flavors; e10b Kueue TAS; e11 native gang scheduling (API server and scheduler reconfigured); e12 Kubeflow Trainer v2.3.0 installed, one TrainJob, uninstalled.

## Changes made to the shared cluster, all restored
- kube-scheduler static pod: `--config` with two profiles and `--vmodule=schedule_one=10` (e6, e5), then the original manifest (checked identical).
- kube-apiserver and kube-scheduler: `--feature-gates=GenericWorkload=true`, `--runtime-config=scheduling.k8s.io/v1beta1=true` (e11), then the originals (checked identical). The API server restart restarted Kueue's controller; while it was down all pod creations failed (webhook), recorded.
- worker3: device plugin image loaded and removed; its leftover `example.com/resource` capacity cleared by a kubelet restart at cleanup. Node labels `km.example.com/tas` and the taint `km.example.com/reserved` added and removed. Kubeflow Trainer CRDs, controller and webhooks installed and removed (the control plane went from 1.04 to 1.35 GiB over the install and uninstall, and was at 1.11 GiB at 07:20 UTC).
- Kind node containers run privileged by design (kind's requirement); nothing else here was privileged.
