# Launching distributed training: source of the page

Build: `sh build.sh` (writes `../index.html`; `scripts/ld_links.py` expands `{{text|L:<id>}}` links from `out/lines.json`).
Prefix for ids, classes and containers: `ld`. Tabs (since 2026-10-24): `t-read`, `t-ldenv` (Launcher variables), `t-more`. Storage key `ld-tab`.

## Parts
`01_head.html`, `05z_errbox.js.html`: copied from the root. `21_js_rd_common.js`, `99_js_tabs.js`: the explainer-page skill templates (never autoplay; storage key `ld-tab`). `10_header.html`: title, subtitle with the reading time, tab bar, opening of `t-read`. `20_read_a` (styles, nav, the idea in one screen, section 1) to `20_read_f` (section 11, closed depth), `20_read_z` (footer). `22_js_ld_data.js`: generated. `23_js_ld_rd.js`: chain explorer, agent log, store before/after, interface explorer, timeout ladder, recorded text blocks. `24_js_ld_rz.js`: the rendezvous replay (section 4; was the Rendezvous lab tab). `25_js_ld_hang.js`: hang triage (section 8; was the Hang triage tab). `26_js_ld_figs.js`: hero, the agent's loop, the NCCL start-up stepper. `32_*`: Launcher variables. `39_tab_more.html`.

## Runs (16 October 2026, Apple M1 Pro, Docker Desktop VM, shared machine; image mi-train:1, torch 2.14.1+cpu)
The image's train.py predates the root's fsync change; nothing shown here depends on it. No shared cluster was used for training runs: every run was in its own capped container (`--memory 2g --cpus 2`, names `ld-*`, `--rm`); one tiny pod on kind under the kind lock (`scripts/ld-shm-pod.yaml`, deleted).

| Run | Script | What |
|---|---|---|
| rz/elastic, elastic_share, static | `scripts/ld_rdzv.sh` (+ `ld_torchrun.py`, `ld_wrap.py`) | 3 torchrun agents, C late at 45 s, C killed after 40 steps at world 3; c10d with the store not shared, c10d with the default, static |
| rz/share_a, share_b, noshare | same, `share`/`noshare` | 2 agents, rank 1 exits 13 at step 30, `--max-restarts=1`; a probe counts the workers' store keys |
| hang/<case>_<OFF/DETAIL> | `scripts/ld_hang.sh` + `ld_hang.py` | 4 ranks, one injected bug each; py-spy at 25 s (container with CAP_SYS_PTRACE), in-process watchdog (faulthandler + flight recorder) |
| detail/ | `scripts/ld_detail.py` | TORCH_DISTRIBUTED_DEBUG=DETAIL isolated: bare all-reduce, shape mismatch, DDP (also natively on macOS) |
| net/ | `scripts/ld_ifaces.py`, docker `df /dev/shm`, kind pod | interface lists (bridge and host network), /dev/shm and memlock |

`rz/share_a/share_hang_pyspy.txt`: the py-spy sidecar (`docker run --pid=container:ld-rz --cap-add SYS_PTRACE`) against the hung rank 0.

## Rebuild
1. Evidence in the scratchpad (`mi/ld/ev`), or reuse `runs/` (scrubbed copies; pass `runs` as the evidence dir).
2. `python3 scripts/ld_lines.py <scratch>/mi > out/lines.json` (needs the sparse clones: pytorch v2.14.1, NCCL v2.30.7-1 with `src/os`, Slurm, Trainer, JobSet; DeepSpeed 0.19.7 sdist and Accelerate 1.15.0 wheel in `mi/ld/dl/x`; Ray from the host venv).
3. `python3 scripts/ld_make_data.py <evidence>` writes `out/data.json`, `parts/22_js_ld_data.js` and `runs/`.
4. `sh build.sh`; `python3 check/ld_check_data.py`; from the repo root `sh html_utils/checkpage.sh <folder>`, `node <folder>/src/check/ld_check.mjs <folder>/index.html <shots dir>`, `node <folder>/src/check/ld_views.mjs <folder>/index.html <shots dir>` (screenshots of each figure) and `python3 html_utils/ledger.py check <folder>`.

## The 2026-10-24 rebuild to the teaching contract (editing only, no new runs)
- **Top**: the core idea in one sentence, a new static hero (two nodes, the agents, the c10d store, four ranks and the communicator, the six links numbered with their default timeouts), "You need" and new terms.
- **Labs moved inline**: the Rendezvous lab became section 4's before/after replay (c10d against static on the same arrivals and kill, the shared-store mode kept for section 5), its event log a closed block, its takeaways one paragraph; the Hang triage tab became section 8's visual, with the fixes and the pattern written in static text. Only Launcher variables stays a tab (an explorer across eight launchers, used by sections 2 and 3).
- **New visuals**: the agent's loop (static annotated diagram with the restart run's times read from the data) and NCCL's start-up as an eight-step stepper over the static list (the 2026-10-16 rejection of an NCCL animation stood for an animation; a stepper over the source order, labelled illustrative and not a run, is honest).
- **No autoplay**: template `21_js_rd_common.js`; mode switches in the store and rendezvous visuals no longer start playing. Checked under normal motion: every scrubber stays at step 0.
- **Into closed blocks**: the NCCL variable table, the hang-tools table, the py-spy sidecar output, torchfrtrace on gloo, the agent log, the error lookup (was "Common mistakes") and interview rehearsal.
- **Ownership**: the flight recorder and the collective-order rule are linked to Distributed PyTorch section 11 (was "its flight-recorder lab"); the parallelism forms and Slurm stay linked.
- **Images**: none. The page is about software start-up; no physical object teaches here, and real logs and stacks are already shown verbatim.

## Length judgement
| | Before (2026-10-23 audit) | After (2026-10-24) |
|---|---|---|
| Reading, core (230 words a minute, `html_utils/audit_pages.mjs`) | 29.0 min | 29.5 min |
| Reading, closed details | 4.5 min | 13.0 min |
| Other tabs, core | Rendezvous lab 7.0 + Hang triage 2.4 + Launcher variables 2.6 = 12.0 min | Launcher variables 2.6 min |
| Core total, excluding Further reading | 41.0 min | 32.1 min |
| Visuals drawn in Reading | 2 | 6 (plus the interface explorer and hang triage, which draw no SVG) |

Why about 30 minutes is right: the Reading tab now carries what two lab tabs used to (9.4 minutes of them), and still lost 9 minutes of core overall. Each of its eleven sections owns one link or one failure mode this page is the owner of (launchers, the agent, rendezvous, the workers' store, NCCL's start-up and interface choice, timeouts, hangs, containers, bring-up); about a fifth of the core words are captions, logs and stacks of the visuals, which are the evidence. What is optional (reference tables, the error lookup, interviews, tool tables) is closed, which is why the closed time grew.

## Knowledge ledger (`ledger.json`, `python3 html_utils/ledger.py check`: problems 0)
319 units: core 234, depth 58, fat 27, owned 0, volatile 0. 307 were drafted by `ledger.py init` from the 2026-10-19 page; 12 were added by hand for script-rendered visuals (keys written into static captions). Fat units carry a `note`: wind-ups, the old tab bar and nav, pointers to the removed tabs, and four mistake or interview entries that restated a core section.

## Departures from the method
A child page (since 2026-10-24 with one tool tab; it had three lab tabs); the root's Launch lab already owns start-up timings, environment dumps and broken launches, so this page reuses them (linked, stage medians recomputed from its `launch_times.json`, environment values from its `env.json`) and goes into the agent, the rendezvous state machine, the workers' store, NCCL's bootstrap and hang diagnosis. NCCL is described from source and documentation (no GPUs).

2026-10-24 topic close: section 9's network-namespace row links Kubernetes for ML section 5 (Multus, SR-IOV); its Further reading entry for Kubernetes names section 5. The flight-recorder pointer already linked Distributed PyTorch section 11.
