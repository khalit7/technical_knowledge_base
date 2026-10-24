# Source of the containers and isolation page

`sh build.sh` writes `../index.html` from `parts/` (same assembly as the sibling pages). `python3 check_embed.py` (after the build) confirms the page embeds exactly what `gen_data.py` derives from `raw/`, that the numbers written in the prose are present, runs `recompute.py`, and checks that nothing private is in the page or `src/`. `python3 recompute.py` recomputes every derived number and checks the Pod to cgroup tab's JavaScript against a Python port of the Kubernetes v1.34.0 and runc formulas (`recompute.txt`). `node src/check_ui.mjs <outdir>` (from the repo root) clicks every control at 390 dark and 920 light and checks that no animation moves before the reader acts; its last output is `check_ui.txt`. `python3 html_utils/ledger.py check <page>` checks the knowledge ledger (`ledger.json`).

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

## Parts (after the 2026-10-24 rebuild)
`01_head.html` and `05z_errbox.js.html` are copied from the sibling storage page (which copied the root's); `21_js_rd_common.js` and `99_js_tabs.js` are the explainer-page skill templates (storage key `os-cont-tab`; nothing animates before the reader presses play or steps). `29_js_drill.js` runs the predict-then-reveal drills. Reading: `20_read.html` (CSS, nav), `20_read_a` (the idea: core sentence, hero, you need, owned elsewhere, new terms, closed "In one screen" and measurement blocks; section 0, the build stepper), `20_read_b` (1), `20_read_c` (2), `20_read_d` (3), `20_read_e` (4), `20_read_f` (5), `20_read_g` (6), `20_read_h` (7, 8), `20_read_i` (9, 10, 11), `20_read_j` (12 with the Pod to cgroup calculator; closed symptom table and interview rehearsal), `20_read_z`. JS: `22_js_data.js` (generated), `23_js_rd_ns.js` (namespace costs; the docker stop stepper), `24_js_rd_cg.js` (overlay outputs, freezer chart, the memory-limit stepper, oom.group table), `25_js_rd_sec.js` (capabilities, user namespaces, seccomp, io_uring, runtime chain), `26_js_rd_figs.js` (the static figures: hero, nsproxy, cgroup rule, uid_map, the three gates, runtimes, sandboxes, GPU; and the overlayfs stepper), `27_js_rd_build.js` (section 0, was `31_js_build.js`), `28_js_rd_pod.js` (section 12 calculator, was `32_js_pod.js`; `recompute.py` reads it). Tab: `39_tab_more.html`.

## The 2026-10-24 rebuild: what changed and why
Rebuilt to the teaching contract (`.claude/skills/explainer-page/teaching/teaching-contract.md`), editing only, no new runs.
- **Top**: the core idea in one sentence (a container is processes on the shared kernel with four restrictions, and so not a security boundary like a VM), a static hero diagram, "You need", "Owned elsewhere" (virtual memory, scheduling, virtualization, Kubernetes for ML, agent security), and new terms. "Eight things to remember", the measurement setup and the OSTEP map are closed blocks.
- **Tabs whose content explains the page's mechanisms moved into Reading**: Build a container became section 0 (the concrete instance before the mechanisms), Pod to cgroup became section 12's visual. Only Further reading remains as a tab. No other page linked either tab (checked by grep).
- **A visual beside every core mechanism**, chosen by kind: nsproxy pointers (s1, static, real inode numbers), overlayfs stepper (s3, measured times), no-internal-processes before/after (s4), uid_map (s6), the three gates on one call (s7, four measured calls), the runtime chain (s9), container against gVisor against microVM (s10), the GPU container (s11). The existing stop and memory steppers got a title saying what to notice and no longer start on a mode switch.
- **Depth closed**: nsproxy fields and the three system calls, mount propagation and chroot against pivot_root, the raw overlay and docker history outputs, the cgroup session, the PSI block, the memory.high source, the five capability sets, the user-namespace session, the nine-instruction filter listing, the clone3 trick, the io_uring kernel history, the ps chain, the device-cgroup measurement and CDI commands, the calculator's sources, the symptom table and the interview rehearsal.
- **Compacted**: the "Commands that show it" boxes became one "Check it" line per section; the process-group variants box became a closed block (the stepper title now carries its conclusion).
- **Deleted as fat** (8 ledger units): the old tab bar, the section-pattern sentence, a drill-question fragment, and the pointers to and Further reading entries for the removed tabs.
- **Further reading**: sibling and neighbour times updated from their built headers (Processes 44, Scheduling 35, Virtual memory 35, Concurrency 34, ml-infra root 26, agentic-harnesses root 21, Fault tolerance 35, Distributed Training 27); the networking link now names its real target (Networking foundations, 41 min); Kubernetes for ML and Agent security added. Storage (42), Virtualization (51) and the root (50) keep their old times: their headers do not yet give one.

## Length judgement
| | Before (2026-10-23 audit) | After (2026-10-24) |
|---|---|---|
| Reading, core (230 words a minute, `html_utils/audit_pages.mjs`) | 48.8 min | 44.8 min |
| Reading, closed details | 2.5 min | 13.7 min |
| Other tabs, core | Build a container 2.3 + Pod to cgroup 1.2 + Further reading 2.9 | Further reading 2.8 |
| Core total, excluding Further reading | 52.3 min | 44.8 min |
| Visuals drawn as SVG in Reading (audit count) | 2 | 11 (plus the HTML bar chart, the build and stop steppers, and five measured tables the audit does not count) |

Why 45 minutes is right: the page owns twelve mechanisms (namespaces, PID 1 and the stop path, mounts and overlayfs and images, cgroups v2, memory limits, capabilities and user namespaces, seccomp, LSMs, runtimes, sandboxes, GPU containers, Kubernetes resources as cgroup files), each measured on a real kernel or derived from pinned source, and absorbed two tabs (3.5 minutes) into the Reading flow. About a fifth of the core words are the captions, tables and counters of the measured visuals, and each section keeps its "when it bites in ML" box, which is the reason this page exists for its reader. What made the old page long without teaching more (kernel provenance, raw outputs, per-call detail, a recap, mistakes and interview answers that restate sections) is now closed. The core could go lower only by dropping measured results the ledger marks as core.

## Knowledge ledger (`ledger.json`, `python3 html_utils/ledger.py check`: problems 0)
416 units: core 335, depth 73, fat 8. 399 were drafted from the old page by `ledger.py init`; keys were matched automatically to the longest phrase of five to nine words of each sentence found on the rebuilt page (core when found outside closed blocks, depth inside), then 15 were keyed or labelled by hand. 17 were added by hand (section "added 2026-10-24"): eight script-rendered tables and steppers, and the nine new figures. Fat units carry a `note`.

## Departures from the child-page method
No `live.md` or `coverage.json`: the page is new, with no old text. Measurements replace the "real data" of the training pages. PSI, AppArmor and SELinux are absent from this kernel; gVisor, Firecracker, Kata, GPU containers and Kubernetes itself are taught from documentation and source and tagged "not run here". Since 2026-10-24 the page has a single Reading tab plus Further reading: the two lab tabs each explained mechanisms the Reading sections teach, so they sit beside those sections. The stop experiment uses a stand-in job whose checkpoint takes 1 s (the root's real job checkpoints in milliseconds), said on the page.

## Findings worth passing on
- On cgroup v2, Kubernetes v1.34 sets `memory.oom.group=1` on every container by default, so a DataLoader worker OOM kills the main process too (measured here with oom.group 1 vs 0).
- `memory.high` without swap stalled a growing process indefinitely with no OOM and no error (17.3 s for one 10 MiB step, then no progress); with swap it finished in 0.3 s.
- tini's process-group mode and dumb-init do not fix the shell-in-between trap: the shell still dies, the init exits, and the namespace's SIGKILL beats Python's handler.
- On Linux 5.10 root in this VM could create no io_uring ring at all under the default 64 KiB memlock limit: UID 0's locked_vm budget, shared across containers and probably consumed by runc's per-container BPF device programs, was already used.

## Topic close (2026-10-24)
Further reading times and titles were brought in line with each page's header and the rebuilt root (Reading: 24 min, plus 7 in closed details); references to the root's retired sections and simulators were reworded.
