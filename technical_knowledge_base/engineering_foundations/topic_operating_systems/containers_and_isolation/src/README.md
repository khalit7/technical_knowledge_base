# Source of the containers and isolation page

`sh build.sh` writes `../index.html` from `parts/` (same assembly as the sibling pages). `python3 check_embed.py` (after the build) confirms the page embeds exactly what `gen_data.py` derives from `raw/`, that the numbers written in the prose are present, runs `recompute.py`, and checks that nothing private is in the page or `src/`. `python3 recompute.py` recomputes every derived number and checks the Pod to cgroup tab's JavaScript against a Python port of the Kubernetes v1.34.0 and runc formulas (`recompute.txt`). `node src/check_ui.mjs <outdir>` (from the repo root) clicks every control at 390 dark and 920 light; its last output is `check_ui.txt`.

## Measurements
`sh run_all.sh` re-runs everything (about 6 minutes) on Docker Desktop's Linux VM (kernel 5.10.104, Docker 20.10.17, runc v1.1.2, cgroup v2) with the image `kb-os-cont:1` (`exp/Dockerfile`: the shared `kb-os-lab:1` plus busybox-static, tini 0.19, dumb-init 1.2.5, libcap tools). Containers are named `os-cont-*`, always `--rm`, never privileged. Extra rights, per experiment: `--cap-add SYS_ADMIN` (create namespaces; remount the container's own cgroup subtree read-write) for `minictr.sh`, `cost.sh`, `cgroup.sh`; `--security-opt seccomp=unconfined` where Docker 20.10's profile blocks the call taught (`pivot_root` in `minictr.sh`; `unshare(CLONE_NEWUSER)` as UID 1000 in `userns.sh`; the probe's baseline); `--pid host` once, for a read-only `ps` of the VM in `runtime.sh`; `--cap-add` of SYS_NICE, IPC_LOCK, SYS_RESOURCE in one `caps.sh` container.

| Script (`exp/`) | Raw (`raw/`) | What |
|---|---|---|
| `env.sh` | `env.txt` | Docker, runc, kernel config (no PSI, no AppArmor or SELinux), default limits |
| `minictr.c`, `minictr.sh`, `job.sh` | `minictr.txt` | a container built by hand in 10 steps, the process's view after each, a workload hitting pids.max and memory.max, the overlay's upper layer |
| `ns_cost.c`, `cost.sh` | `cost.txt` | unshare() per namespace kind (200 children each); whole unshare commands |
| `cgroup.sh`, `hog.py` | `cgroup.txt` | no-internal-processes EBUSY and delegation; memory.max vs memory.high vs memory.high with swap; memory.oom.group 0 and 1; io.max; cgroup.freeze |
| `stop_matrix.sh`, `stopjob.py`, `fwd.sh` | `stop_matrix.txt` | docker stop against seven ways of starting the job; dash and a single command |
| `caps.sh`, `caps_ops.py` | `caps.txt` | eight privileged operations in four containers |
| `userns.sh` | `userns.txt` | user namespace as UID 1000: uid_map, capabilities, what root inside can and cannot do; a time namespace |
| `seccomp.sh`, `seccomp_probe.c`, `seccomp_cost.c` | `seccomp.txt` | 12 calls under no filter, Docker 20.10's default, Docker 25's default.json; ns per getppid with and without filters |
| `uring.sh`, `uring_mem.c` | `uring.txt` | io_uring rings charged per UID across containers |
| `image.sh` | `image.txt` | docker history, overlay lowerdirs, copy-up of libtorch_cpu.so, docker diff |
| `runtime.sh` | `runtime.txt` | the containerd, shim, container process chain; docker run start times |

`inputs/`: Docker's seccomp profiles at v20.10.17 and v25.0.0, and `sources.txt` (every kernel, Kubernetes and runtime source line cited, with tag).

## Parts
`01_head.html`, `05z_errbox.js.html`, `21_js_rd_common.js`, `29_js_drill.js`, `99_js_tabs.js` are copied from the sibling storage page (which copied the root's). Reading: `20_read.html` (CSS, nav), `20_read_a` to `20_read_j`, `20_read_z`. JS: `22_js_data.js` (generated), `23_js_rd_ns.js` (namespace costs; the docker stop animation), `24_js_rd_cg.js` (overlay outputs, freezer chart, the memory-limit animation, oom.group table), `25_js_rd_sec.js` (capabilities, user namespaces, seccomp, io_uring, runtime chain), `31_js_build.js` (Build a container stepper), `32_js_pod.js` (Pod to cgroup). Tabs: `31_tab_build.html`, `32_tab_pod.html`, `39_tab_more.html`.

## Departures from the child-page method
No `live.md` or `coverage.json`: the page is new, with no old text. Measurements replace the "real data" of the training pages. PSI, AppArmor and SELinux are absent from this kernel; gVisor, Firecracker, Kata, GPU containers and Kubernetes itself are taught from documentation and source and tagged "not run here". The stop experiment uses a stand-in job whose checkpoint takes 1 s (the root's real job checkpoints in milliseconds), said on the page.

## Findings worth passing on
- On cgroup v2, Kubernetes v1.34 sets `memory.oom.group=1` on every container by default, so a DataLoader worker OOM kills the main process too (measured here with oom.group 1 vs 0).
- `memory.high` without swap stalled a growing process indefinitely with no OOM and no error (17.3 s for one 10 MiB step, then no progress); with swap it finished in 0.3 s.
- tini's process-group mode and dumb-init do not fix the shell-in-between trap: the shell still dies, the init exits, and the namespace's SIGKILL beats Python's handler.
- On Linux 5.10 root in this VM could create no io_uring ring at all under the default 64 KiB memlock limit: UID 0's locked_vm budget, shared across containers and probably consumed by runc's per-container BPF device programs, was already used.
