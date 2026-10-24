# Source of the virtualization and GPU driver stack page

`sh build.sh` writes `../index.html` from `parts/` (the sibling pages' assembly). `python3 check_embed.py` (after the build) confirms the page embeds exactly what `gen_data.py` derives from `raw/`, that every `data-k` number in the prose matches the data at its displayed precision, that hand-written numbers agree with the data, and that no private path or token is in the page or `src/`. `python3 recompute.py` recomputes every derived number (ratios, the IPI round trip, the exit budget of a wake-up, the two-dimensional walk lengths, the ioctl decoding, virtio ratios and Little's law) into `recompute.txt` and asserts the embedded derived numbers agree. `node src/check_ui.mjs <outdir>` (from the repo root) confirms no animation moves before the reader acts, clicks every control at 390 dark and 920 light (including the trace explorer and MIG lab, now in the Reading tab), runs the version checker over all 792 combinations and screenshots each animation. `python3 html_utils/ledger.py check <page>` checks the knowledge ledger (`ledger.json`).

## Measurements
`sh run_all.sh` re-runs everything (about 6 minutes). Linux runs on Docker Desktop 4.11.1's VM (QEMU 5.2.0 with Hypervisor.framework, Linux 5.10.104-linuxkit arm64, 5 vCPUs), containers `os-virt-*`, never privileged, `--rm`. Images: the shared `kb-os-lab:1`, and `kb-os-virt:1` (`image/Dockerfile`: the CUDA topic's `kb-gpu-lab:1`, CUDA 13.4.2, plus strace). macOS runs are labelled contrasts: the VM process's arguments, and a tiny VM of our own on Hypervisor.framework (needs the `com.apple.security.hypervisor` entitlement, ad-hoc signed with `exp/ent.plist`; built into `$TMPDIR`, never into the repo).

| Script (`exp/`) | Raw (`raw/`) | What |
|---|---|---|
| `vmid.sh` | `vmid.txt` | what the guest sees: PCI and virtio devices, /proc/interrupts, clocksource, cpuidle, steal, kernel config, no /dev/kvm, no IOMMU (the vpnkit token removed) |
| `ipi.c`, `ipi.sh` | `ipi.txt` | pipe hand-offs same CPU, cross-CPU idle and busy, cache-line spin, membarrier with 0, 1 and 3 spinning peers; IPI counts per operation from /proc/interrupts |
| `virtio.sh` | `virtio.txt` | fio 4 KiB random O_DIRECT reads at queue depth 1 and 32; virtio-blk interrupts per request |
| `cuda/rt_probe.cu`, `cuda/drv_probe.c`, `cuda/run.sh` | `cuda.txt` | libraries, ldd, fatbin contents, PTX; the runtime and driver API with no driver, the stub, the real 615.71.09 user-mode driver without a module (strace, LD_DEBUG), CPU-only PyTorch |
| `cuda/run_dev.sh` | `cuda_dev.txt` | the same with `--device-cgroup-rule 'c 195:* rwm'`: ENXIO, /proc/devices |
| `host_qemu.sh` (macOS) | `host_qemu.txt` | the hypervisor process: arguments (disk, fifo, MAC, token removed), QEMU version |
| `hvf_exits.c` (macOS) | `hvf_macos.txt` | VM exit round trips (hvc, MMIO, wfi), forced exit of a running vCPU, native pipe hand-off, waking an idle thread from pselect |

`inputs/sources.txt`: every kernel, QEMU, NVIDIA driver and PyTorch source line the page cites, with file, line and tag.

## Parts
`01_head.html`, `29_js_drill.js`, `05z_errbox.js.html` are copied from the storage sibling (which copied the root's); `21_js_rd_common.js` and `99_js_tabs.js` are the explainer-page skill templates (never autoplay; tab key `os-virt-tab`). Reading: `20_read.html` (CSS, nav), `20_read_a` (the idea: core sentence, hero, you need, new terms, the one-screen table, provenance) to `20_read_k` (section 11 and the closed Depth section), `20_read_z`. JS: `22_js_rd_data.js` (generated), `23_js_rd_fill.js` (recorded outputs into the page), `24_js_rd_walk.js` (2D page walk), `25_js_rd_wake.js` (cross-CPU wake-up), `26_js_rd_vq.js` (virtqueue), `27_js_rd_fc.js` (first CUDA call), `28_js_rd_vc.js` (version checker), `30_js_rd_figs.js` (the static SVG figures, drawn at measured width), `32_js_cuda.js` (trace explorer, closed block in section 9), `33_js_share.js` (MIG placement lab, section 8). Tabs: Reading and `39_tab_more.html`.

## Departures from the child-page method
No `live.md` or `coverage.json`: the page is new, with no old text. There is no GPU and no nested virtualization here, so KVM, VFIO, the IOMMU, MIG, MPS, vGPU and the kernel driver are taught from source and documentation and tagged "not run here"; everything that can run without a GPU (the CUDA runtime and the real user-mode driver, fatbins, the hypervisor underneath this VM) was run.

## Findings worth passing on
- The cross-CPU wake-up cost the scheduling and concurrency pages measured is the hypervisor: this VM's interrupt controller is a GICv2 emulated in QEMU (every IPI send, acknowledge and end is a VM exit), and an idle target vCPU is a host thread asleep in pselect; waking an idle host thread on the Mac took about 29 µs, the size of the idle cross-CPU hand-off (25 µs here). Same-CPU hand-offs and spinning are unaffected.
- The root's "routine launches need no system call ... not verified from a primary source" can now be narrowed: the doorbell submission path is verified in the open driver (UVM's channel code, the VOLTA_USERMODE_A class); that the closed libcuda uses it for launches remains inferred.
- With no kernel module, libcuda 615.71.09 running as root deletes whatever is at /dev/nvidiactl and mknods 195:255 itself, retries the open eight times and sends an NV_ESC_RM_CONTROL ioctl to fd -1.

## The 2026-10-24 rebuild to the teaching contract
What changed and why:
- **Top**: the core idea in one sentence ("the hot path never asks permission: guest code runs on the CPU and a launch is stores plus a doorbell; you pay only at boundaries") and a hero figure of both stacks with the direct paths and the crossings; "You need" and new terms; the one-screen table kept as the map. The old lead, the "Six things to remember" list (each item restated a section) and the method statement were cut as fat.
- **Visuals inline beside their claims**: seven new static SVG figures (`30_js_rd_figs.js`): the hero, VMs against containers (section 1, a concept this page owns), a VM exit against a system call (section 2), the IOMMU (section 7), time slicing / MPS / MIG (section 8), GSP off against on (section 9, before/after), and what a GPU container takes from its image and from the host with the error for each missing piece (section 10). The audit counted 0 visuals before because the steppers draw HTML, not SVG; the four steppers stay as they were, now paused until the reader acts (no autoplay on scroll or on a mode switch).
- **Tabs folded into the flow**: the Sharing a GPU tab (MIG placement lab) explained one mechanism, so it now sits in section 8; the One CUDA call tab (trace explorer) is the evidence for section 9 and is a closed block there. Only Reading and Further reading remain.
- **Ownership gaps filled**: GSP firmware (where the resource manager runs, version coupling with libcuda and nvidia.ko, how to check), the NVIDIA container toolkit at the driver level (section 10, linking Containers and isolation for the mechanism), VMs against containers, and one compact dated table of version facts (volatile).
- **Moved to closed blocks (depth, nothing lost)**: the KVM monitor code and exit-handler table, QEMU's command line and the guest's device listings, source anchors for the wake-up path, the per-piece wake-up costs, virtio and VFIO source detail, the sharing table's sources, the compatibility sources and the image's declared requirements, the layer table, case 3 line by line with the ioctl decoding, the fatbin, unified memory and HMM detail, GPUDirect / persistence / Xid / visibility sources, the eight beliefs and the interview rehearsal.
- **Linked instead of re-taught**: binary compatibility and the compute cache to The compiler stack; managed-memory use and prefetch to GPU memory hierarchy and Streams; CDI and the device cgroup mechanism to Containers and isolation; MIG scheduling to Kubernetes for ML.

## Length judgement
| | Before (audit 2026-10-23) | After (2026-10-24) |
|---|---|---|
| Reading, core (230 words a minute) | 52.9 min | 40.6 min |
| Reading, closed details | 3.0 min | 26.4 min |
| Other tabs, core | One CUDA call 3.0, Sharing a GPU 1.8, Further reading 3.9 | Further reading 3.8 |
| Visuals drawn (svg/canvas/img) in Reading | 0 | 12 |

Why about 41 minutes is right: the page owns two stacks (virtualization: VMs and containers, hypervisor types, exits, nested paging, interrupts, virtio, the IOMMU and passthrough; the GPU driver: the layers, GSP, channels and doorbells, version compatibility, the container toolkit at the driver level, sharing schemes, GPU memory from the OS side), eleven sections each with a measured or sourced number and a picture. About a quarter of the core words are table cells, stepper captions and the hidden answers of the six predict-then-reveal drills. What made the old page long (source anchors, recorded listings, code, line-by-line traces, interview answers) is now closed and optional, which is why the closed time grew.

## Knowledge ledger (`ledger.json`; `python3 html_utils/ledger.py check`: problems 0)
460 units: core 312, depth 132, fat 12, volatile 4. 443 were drafted from the old page by `ledger.py init` and keyed by a script that found each unit's longest distinctive phrase in the rebuilt page (core if it appears outside closed blocks); 17 were added by hand for the new figures and for script-rendered steppers, lab and checker (their keys are in static captions). Fat units carry a note (wind-ups, the old caption and tab pointers, the "six things" restatement). Volatile: the dated version facts (minimum drivers, CUDA 13.4 with branch 615, cuda-compat-13-4 targets, the toolkit no longer bundling the driver), kept here in one compact dated table as the brief asks.
