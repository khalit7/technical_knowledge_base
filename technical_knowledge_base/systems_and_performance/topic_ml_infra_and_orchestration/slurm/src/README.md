# src of "Slurm from zero: allocation, gang scheduling, fairshare and preemption"

Child page 2 of Topic: ml-infra-and-orchestration. Prefix `sl`. Built 2026-10-16.

Rebuild: `python3 scripts/make_data.py && sh build.sh` (from this folder). Checks: `python3 scripts/recompute.py`, `python3 scripts/check_data.py`, `node scripts/check_ui.mjs <repo root> ../index.html <shots dir>`, and from the repo root `sh html_utils/checkpage.sh <page folder>`.

| Path | What |
|---|---|
| `parts/` | page parts: `20_read_*.html` Reading, `31_*` Job lifecycle, `32_*` Why pending?, `33_*` Priority calculator, `39_tab_more.html`; `15_js_sl_data.js` is generated |
| `scripts/sl_runs.sh` | every run on the shared Slurm cluster, by phase (arch setup life steps gallery deps het resv acct restore, then life_idle steps2 sig steps3 munge_t); `setup` applies `sl_slurm.conf` and creates QOS sl-high, sl-small and a GPU limit on carol; `restore` deletes them and puts back the root's `src/data/slurm/slurm.conf` |
| `scripts/sl_slurm.conf` | the variant config used during the runs: priority weights for every factor, `AccountingStorageEnforce=associations,limits,qos`, prolog and epilog, `batch` PriorityJobFactor 2, extra partition `sllow` |
| `scripts/*.sbatch`, `prolog.sh`, `epilog.sh` | the job scripts that ran |
| `scripts/make_data.py` | runs/ + inputs/ -> `sl_data.json` and `parts/15_js_sl_data.js` |
| `scripts/recompute.py` | recomputes the 22 sprio rows (all reproduce) -> `recompute.json` |
| `scripts/extract_reasons.py`, `scripts/quote_source.py` | source extracts at slurm-24-11-5-1, located by pattern -> `inputs/` |
| `scripts/check_data.py`, `scripts/check_ui.mjs` | embedded data and prose numbers; every control at 390 dark and 920 light |
| `runs/raw1`, `raw2`, `raw3` | scrubbed raw outputs of the three run batches (16 Oct 2026, 05:36-05:46 UTC) |
| `facts.md` | verified facts (also appended to the topic's scratch FACTS.md under sl) |

Runs were made under the slurm lock, in three batches; the cluster's configuration, QOS, limits and reservations were restored after each (`runs/raw*/restored.txt`). Source quoted at slurm-24-11-5-1 (commit e4788bed70462dc5e14b1b170d271d7495a0f334) from the shared sparse clone.

Departures from the child-page method: none structural. Notion is disconnected, so no `live.md`; see `coverage.md`.
