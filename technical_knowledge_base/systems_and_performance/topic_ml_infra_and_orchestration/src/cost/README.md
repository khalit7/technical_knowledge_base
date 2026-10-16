# Cost lab (tab `t-cost`, parts `35_*`, prefix `co`)

What the time and money of a training run go on, from a paid GPU-hour down to useful FLOPs. Built 2026-10-16. Mostly recorded data from the other labs, read through the cost lens; one new measurement (three JobSets on kind).

| file | what |
|---|---|
| `scripts/co_k8s.sh` | the running example as a JobSet through Kueue (2 pods x 2 ranks, 4 fake GPUs), recording Kueue's Workload conditions, events and rank logs. Run three times under the kind lock: `co-k200`, `co-k2000`, `co-k200b` (200, 2,000, 200 steps) |
| `runs/k8s/` | those three runs, scrubbed (`../data/scrub.py`); `workload.json` keeps only the Workload's pod sets, conditions and admission |
| `co_measure.py` | every measured number on the tab, from `../data/runs/`, `runs/`, `../sched/` (w1 sacct, sc_data.json), `../fail/runs/` and `inputs/` -> `out/co_data.json` |
| `make_data_js.py` | `out/co_data.json` -> `../parts/35_js_co_0data.js` |
| `recompute.py` | the run-cost calculator in Python -> `out/recompute.json` |
| `check_data.mjs` | the page embeds exactly `out/co_data.json`, the calculator equals `recompute.py`, prose numbers match data |
| `check_ui.mjs` | every control at 390 px dark and 920 px light: no errors, NaN, undefined, sideways scroll |
| `inputs/` | prices and metric lists read 2026-10-16: AWS EC2 on-demand price data (publication 2026-10-15, GPU rows only), Azure retail prices API for ND96isr H100 v5 East US, Lambda pricing page text, dcgm-exporter `etc/default-counters.csv` at commit fafd151 (2026-09-18) |
| `facts.md`, `viz_ideas.md` | verified facts; visuals built and rejected |

Rebuild: `python3 co_measure.py && python3 make_data_js.py && python3 recompute.py && sh ../build.sh`.

Departures: Slurm and Ray were not rerun (the lead asked for recorded data; and Slurm was in use). Ray's setup run kept no allocation record, so its bar runs from the driver's "Connected" line to rank 0's end. The Kubernetes Scheduling-lab run (k2) showed about 2 minutes between the last step and Kueue's "finished"; its recorded events do not say why, so the page states the gap without a cause.
