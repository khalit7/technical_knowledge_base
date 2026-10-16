# Launching distributed training: source of the page

Build: `sh build.sh` (writes `../index.html`; `scripts/ld_links.py` expands `{{text|L:<id>}}` links from `out/lines.json`).
Prefix for ids, classes and containers: `ld`. Tabs: `t-read`, `t-ldrz` (Rendezvous lab), `t-ldhang` (Hang triage), `t-ldenv` (Launcher variables), `t-more`. Storage key `ld-tab`.

## Parts
`01_head.html`, `05z_errbox.js.html`, `21_js_rd_common.js`, `99_js_tabs.js`: copied from the root (`mi-tab` renamed). `20_read_a..f, z`: Reading. `22_js_ld_data.js`: generated. `23_js_ld_rd.js`: Reading visuals (launch chain, store before/after animation, interface explorer, timeout ladder). `30_*` Rendezvous lab, `31_*` Hang triage, `32_*` Launcher variables, `39_tab_more.html`.

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
4. `sh build.sh`; `python3 check/ld_check_data.py`; from the repo root `sh html_utils/checkpage.sh <folder>` and `node <folder>/src/check/ld_check.mjs <folder>/index.html <shots dir>`.

## Departures from the method
A child page with three lab tabs; the root's Launch lab already owns start-up timings, environment dumps and broken launches, so this page reuses them (linked, stage medians recomputed from its `launch_times.json`, environment values from its `env.json`) and goes into the agent, the rendezvous state machine, the workers' store, NCCL's bootstrap and hang diagnosis. NCCL is described from source and documentation (no GPUs).
