# Source of the virtualization and GPU driver stack page

`sh build.sh` writes `../index.html` from `parts/` (the sibling pages' assembly). `python3 check_embed.py` (after the build) confirms the page embeds exactly what `gen_data.py` derives from `raw/`, that every `data-k` number in the prose matches the data at its displayed precision, that hand-written numbers agree with the data, and that no private path or token is in the page or `src/`. `python3 recompute.py` recomputes every derived number (ratios, the IPI round trip, the exit budget of a wake-up, the two-dimensional walk lengths, the ioctl decoding, virtio ratios and Little's law) into `recompute.txt` and asserts the embedded derived numbers agree. `node src/check_ui.mjs <outdir>` (from the repo root) clicks every control at 390 dark and 920 light, runs the version checker over all 792 combinations and screenshots each animation and tab.

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
`01_head.html`, `21_js_rd_common.js`, `29_js_drill.js`, `99_js_tabs.js`, `05z_errbox.js.html` are copied from the storage sibling (which copied the root's); the tab key is `os-virt-tab`. Reading: `20_read.html` (CSS, nav), `20_read_a` to `20_read_k`, `20_read_z`. JS: `22_js_rd_data.js` (generated), `23_js_rd_fill.js` (recorded outputs into the page), `24_js_rd_walk.js` (2D page walk), `25_js_rd_wake.js` (cross-CPU wake-up), `26_js_rd_vq.js` (virtqueue), `27_js_rd_fc.js` (first CUDA call), `28_js_rd_vc.js` (version checker), `32_js_cuda.js`, `33_js_share.js`. Tabs: `32_tab_cuda.html` (One CUDA call), `33_tab_share.html` (Sharing a GPU), `39_tab_more.html`.

## Departures from the child-page method
No `live.md` or `coverage.json`: the page is new, with no old text. There is no GPU and no nested virtualization here, so KVM, VFIO, the IOMMU, MIG, MPS, vGPU and the kernel driver are taught from source and documentation and tagged "not run here"; everything that can run without a GPU (the CUDA runtime and the real user-mode driver, fatbins, the hypervisor underneath this VM) was run.

## Findings worth passing on
- The cross-CPU wake-up cost the scheduling and concurrency pages measured is the hypervisor: this VM's interrupt controller is a GICv2 emulated in QEMU (every IPI send, acknowledge and end is a VM exit), and an idle target vCPU is a host thread asleep in pselect; waking an idle host thread on the Mac took about 29 µs, the size of the idle cross-CPU hand-off (25 µs here). Same-CPU hand-offs and spinning are unaffected.
- The root's "routine launches need no system call ... not verified from a primary source" can now be narrowed: the doorbell submission path is verified in the open driver (UVM's channel code, the VOLTA_USERMODE_A class); that the closed libcuda uses it for launches remains inferred.
- With no kernel module, libcuda 615.71.09 running as root deletes whatever is at /dev/nvidiactl and mknods 195:255 itself, retries the open eight times and sends an NV_ESC_RM_CONTROL ioctl to fd -1.
