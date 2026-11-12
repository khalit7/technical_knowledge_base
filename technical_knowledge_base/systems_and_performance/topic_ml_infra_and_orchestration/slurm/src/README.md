# src of "Slurm from zero: allocation, gang scheduling, fairshare and preemption"

Child page 2 of Topic: ml-infra-and-orchestration. Prefix `sl`. Built 2026-10-16.

Rebuild: `python3 scripts/make_data.py && sh build.sh` (from this folder; `make_data.py` also reads the root's `src/fail` and `src/data`, so the 2026-10-24 rebuild ran `build.sh` only, data unchanged). Checks: `python3 scripts/recompute.py`, `python3 scripts/check_data.py`, `node scripts/check_ui.mjs <absolute repo root> ../index.html <shots dir>`, from the repo root `node <page folder>/src/check/check_stages.mjs [shots dir]` (a few minutes), from the repo root `sh html_utils/checkpage.sh <page folder>` and `python3 html_utils/ledger.py check <page folder>`.

| Path | What |
|---|---|
| `parts/` | page parts: `02_split.html`, `21_js_rd_common.js`, `25_js_s3.js` and `99_js_tabs.js` (skill templates, unchanged; storage key `sl-tab`; animations and stages play once in view since 2026-11-12), `20_read_a` (styles, the idea in one screen) to `20_read_h` (section 13 and closed depth), `20_read_z`; `22_js_sl_read.js` (source quotes, exhibits, predict boxes, job states), `23_js_sl_read2.js` (steps animation in stretches, dependency Gantt), `24_js_sl_life.js` (lifecycle animation in eight stages), `25_js_sl_prio.js` (priority calculator), `26_js_sl_vis.js` (stranded GPUs, limits, requeue timeline, maintenance window), 3D scenes `40_js_sc_geo.js` (a node: 4 GPU cubes, 4 CPU tiles), `41_js_sc_hero.js`, `42_js_sc_bf.js`, `43_js_sc_fs.js`; `32_*` Why pending?, `39_tab_more.html`; `15_js_sl_data.js` is generated |
| `check/check_stages.mjs` | the 2026-11-06 rollout checks (below) |
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

2026-10-24 topic close: section 2's job states note that under torchrun Slurm records torchrun's exit code 1, linking Launching distributed training section 3; Further reading training-root time 27 to 22.

2026-10-26 (final follow-up sweep): Further reading adds SSH (section 13, cluster workflows) for getting to the login node.

## 2026-10-26 ownership sweep
This page owns Slurm on Kubernetes (Khalid's decision). The closed block in section 12 absorbed the root Tool map's Slinky and SUNK facts (open-sourcing date, slurm-bridge, SUNK accounting and scope, which to pick); the root keeps one merged row linking here.

## The 2026-11-06 rollout (split layout, 3D stages v2), done 2026-11-12
Briefs `rebuild-page.md` and `layout-rollout.md`. Templates copied unchanged: `02_split.html` (in `build.sh` after `01_head.html`), `25_js_s3.js` (renderer v2), `21_js_rd_common.js` and `99_js_tabs.js` (key `sl-tab`). No new runs; no change to `make_data.py`, `sl_data.json` or `recompute.py`: every scene draws from `window.SL`.

| Tab | Section | Layout | Visual | Step list |
|---|---|---|---|---|
| Reading | The idea in one screen | split | **3D** `stg-hero` (job 79's log) | yes, 6 |
| Reading | You need, terms, what "measured" means | full width | none | no |
| Reading | 1 Daemons | full width | table | no |
| Reading | 2 Life of a job | split | 2D lifecycle animation, busy and idle as modes | yes, 8 + 8 |
| Reading | 3 Resources | split | 2D stranded-GPUs toggle (static figure) | no |
| Reading | 4 Steps | split | 2D steps animation, without and with `--exact` as modes | yes, 3 + 2 |
| Reading | 5 Limits | split | 2D where limits live (static) | no |
| Reading | 6 Two loops | split | **3D** `stg-bf` (illustrative queue) | yes, 7 |
| Reading | 7 Priority | split | **3D** `stg-fs` (sprio and sshare) | yes, 5 |
| Reading | 7 Priority: formula and calculator | split | 2D calculator (widget) | no |
| Reading | 8 Preemption | split | 2D job 128 timeline (static) | no |
| Reading | 9 Arrays | split | 2D dependency Gantt (static) | no |
| Reading | 10 Reservations | split | 2D maintenance window (static) | no |
| Reading | 11 Accounting, 12 Containers, 13 Training job, Depth | full width | none (a listing in 13) | no |
| Why pending? | decoder | split: notes left, the decoder right | tool | no |
| Further reading | | full width | links | no |

**Stages and their data.** `41_js_sc_hero.js`: `SL.busy.events`, grouped into six stretches (the blocker 78 on every GPU, sbatch, backfill's plan, the allocation of c1 and c2 together, the steps, the record); every time and number in `sx-hero` is recomputed from the events by the check. `42_js_sc_bf.js`: the seven frames of the old 2D stepper (illustrative, labelled), the floor being nodes by time and each job a block of its nodes by its time limit, the queue in front with the same footprints. `43_js_sc_fs.js`: `SL.snaps` (eleven `sprio -l` rows at each time, `squeue` for users, `sshare -a -l` for team EffectvUsage, RawUsage and each user's FairShare factor). `40_js_sc_geo.js`: the node as `slurm.conf` declares it (4 CPUs, `gpu:4`); positions and sizes illustrative.

**Kept 2D** and why: the lifecycle and steps animations are timelines whose message is time to scale (now grouped into explained stretches: the long-replay rule); the stranded-GPUs toggle is two end states on eight squares; where limits live is a labelled map; job 128, the dependencies and the maintenance window are timelines; the calculator and the decoder are widgets. Not built: a preemption stage (this page's runs have none; the root's Scheduling lab owns the measured one).

**Changed text.** The hero's caption became its step list; the lifecycle's eight-item list became the busy step list and an idle list was added (its numbers were only in the table); the backfill captions (script-drawn before) are now the static step list; the priority predict answer was shortened to point at the fairshare steps, which now carry its numbers; the steps animation's per-second captions became three and two stretch items (the paragraph that restated them was folded in). Per-step captions under the animations were removed where a list explains them (`sl-lf-cap`, `sl-st-cap`, `sl-bf-cap`); the lifecycle keeps the raw log lines of the current stage as evidence. **Correction:** job 95 at 05:38:58 was "second to last"; it was last of the eleven jobs with a priority (only the two held jobs, at 0, sat below it in `squeue`); the check recomputes this. Section 4 said "section 14" for the training job; it is section 13.

**Checks**: `check/check_stages.mjs` at 1400 px light, 920 px light and 390 px dark: the three stages and two 2D animations play once in view, step to the end with one list item per step, stop redrawing off screen and never move under reduced motion; mode buttons swap the list and replay; 11 Reading splits and the Why pending? split are two columns at 1400 px and one below 1100 px; canvas labels do not overlap or leave the card; every time, count and priority in the hero, lifecycle, steps and fairshare lists equals `window.SL`, and the backfill list equals the scene's own states. `scripts/check_ui.mjs` lost its never-autoplay assertion (now in `check_stages.mjs`, inverted) and the screenshots of removed cards; `scripts/check_data.py` unchanged and passing.

**Length judgement.** Reading core 31.4 min before (7,232 words, `audit_pages.mjs`), 34.9 min after (8,024); closed details 16.2 before and after; Why pending? 1.7 and Further reading 2.0 unchanged. The added words are the step lists that explain the three stages and two animations, as the rollout requires, plus the idle lifecycle and `--exact` lists, which are hidden until their mode is chosen but counted by the audit; script-drawn captions they replaced were not counted before. Nothing the ledger holds was cut.

**Ledger**: 391 units unchanged (core 251, depth 62, fat 78); keys of units 175 (the nice penalty, now the fairshare stage's red glass) and 340 (the decoder now on the right) reworded. `ledger.py check` problems 0 here and on the root (the root's keys on this page, such as "gang scheduling comes free" and "fits no gap", are kept).
