# src of "Slurm from zero: allocation, gang scheduling, fairshare and preemption"

Child page 2 of Topic: ml-infra-and-orchestration. Prefix `sl`. Built 2026-10-16.

Rebuild: `python3 scripts/make_data.py && sh build.sh` (from this folder; `make_data.py` also reads the root's `src/fail` and `src/data`, so the 2026-10-24 rebuild ran `build.sh` only, data unchanged). Checks: `python3 scripts/recompute.py`, `python3 scripts/check_data.py`, `node scripts/check_ui.mjs <repo root> ../index.html <shots dir>`, from the repo root `sh html_utils/checkpage.sh <page folder>` and `python3 html_utils/ledger.py check <page folder>`.

| Path | What |
|---|---|
| `parts/` | page parts: `20_read_a` (styles, the idea in one screen) to `20_read_h` (section 13 and closed depth), `20_read_z`; JS `21_js_rd_common.js` and `99_js_tabs.js` (skill templates, storage key `sl-tab`, never autoplay), `22_js_sl_read.js` (source quotes, exhibits, predict boxes, job states), `23_js_sl_read2.js` (steps animation, priority snapshots, dependency Gantt), `24_js_sl_life.js` (lifecycle animation, from the old Job lifecycle tab), `25_js_sl_prio.js` (priority calculator, from the old tab), `26_js_sl_vis.js` (hero, stranded GPUs, limits, two-loop stepper, requeue timeline, maintenance window); `32_*` Why pending?, `39_tab_more.html`; `15_js_sl_data.js` is generated |
| `ledger.json` | knowledge ledger of the 2026-10-24 rebuild |
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

## The 2026-10-24 rebuild: what changed and why
Rebuilt to the teaching contract (`.claude/skills/explainer-page/teaching/teaching-contract.md`); editing and new figures only, no new runs.
- **Top**: the core idea in one sentence, a static hero (one job's path: `sbatch` into `slurmctld`'s queue, the two loops, job 79's allocation over c1 and c2 with steps `79.batch` and `79.0`, `slurmdbd` feeding fairshare), "You need", new terms. The four-ideas grid and the clickable cluster map were folded into the hero and its caption; the command table, cluster details, versions and what the root's labs show went into a closed reference block.
- **Tabs folded into Reading**: the Job lifecycle tab (busy against idle, every log line) is now section 2's visual, with its stage table; the Priority calculator is now inside section 7, the 22-row check table and the truncation case in a closed block. Both explained one mechanism. Why pending? stays a tab: it is a decoder used from sections 2, 5, 6, 9 and 10.
- **New inline visuals**, chosen by the kind of concept: stranded GPUs as a before/after toggle on the root Scheduling lab's measured allocation (section 3); where limits live, a static diagram of the three measured pending jobs (section 5); the main loop and backfill as a seven-frame stepper on an illustrative four-job queue (section 6, the mechanism had no visual; the root's lab keeps the measured FIFO-against-backfill Gantt); job 128's signal, requeue and 121 s hold as an annotated timeline (section 8); the maintenance window against three time limits (section 10).
- **No autoplay**: template `21_js_rd_common.js` and `99_js_tabs.js`; the steps and lifecycle animations no longer play on a mode switch. Checked under normal and reduced motion: every step control stays on step 0 until the reader acts.
- **Moved to closed blocks**: raw logs, `ps` and `slurmd -C` outputs, configless and reconfigure details, setup commands, submit-time refusals, source quotes, `sdiag`, the `--signal` script and outputs, the heterogeneous job, the reservation `squeue` outputs, `sacct -X`, the non-Pyxis container ways, Slurm on Kubernetes (Slinky, SUNK, HyperPod), the cgroup check and the design rehearsal.
- **Deleted as fat**: "The problem." wind-ups, restated headings, the common-mistakes list (each mistake restated a section; the two with new content became "Checks before blaming the cluster"), interview answers that restated a section (the design question and the Kubernetes gang answer stayed, closed), pointers to removed tabs.
- **Images**: none. The page is about software; its real objects (logs, command outputs, source lines) are shown verbatim, and no photo would teach a mechanism here.
- Further reading: Power, cooling and reliability time updated to 23 min; the tab list now names only Why pending?.

## Length judgement
| | Before (2026-10-23 audit) | After (2026-10-24) |
|---|---|---|
| Reading, core (230 words a minute, `html_utils/audit_pages.mjs`) | 41.2 min (9,470 words) | 31.4 min (7,211) |
| Reading, closed details | 5.0 min | 15.8 min |
| Other tabs, core | Job lifecycle 2.2 + Why pending? 1.7 + Priority calculator 3.8 + Further reading 2.0 = 9.7 min | Why pending? 1.7 + Further reading 1.9 = 3.6 min |
| Core total, excluding Further reading | 48.9 min | 33.1 min |
| Visuals drawn in Reading | 4 | 10 (plus the job-state chips) |

Why about 31 minutes is right: the page owns the whole of Slurm for ML (daemons, a job's life, resources and GRES, steps, three kinds of limits, two scheduler loops, multifactor priority, preemption and requeue, arrays and dependencies, reservations, accounting, containers, the multi-node job file), thirteen mechanisms that each need their measured evidence and a picture; 251 of the 310 non-fat ledger units are core. The cut came from wind-ups, restated mistakes and interview answers, and raw outputs now closed; the closed time grew because those outputs stay, as evidence, one click away.

## Knowledge ledger (`ledger.json`, `python3 html_utils/ledger.py check`: problems 0)
388 units: core 251, depth 59, fat 78. 379 were drafted from the old page by `ledger.py init`; 9 were added by hand for script-drawn visuals and the Why pending? decoder. Fat units carry a `note`. No unit is labelled owned: what other pages own (cgroups, launchers, Kubernetes, networks) the old page already only linked.
