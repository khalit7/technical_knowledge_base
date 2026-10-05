# Visualisation ideas: Virtualization and the GPU driver stack

What the text needs to be understood: which layer runs when (guest, hypervisor, hardware; Python, runtime, user-mode driver, kernel driver, GPU); what a VM exit is and what it costs; why one memory access can need 24 reads; where the time of a cross-CPU wake-up goes in this VM; how virtio replaces exits with shared rings; what each GPU-sharing scheme isolates; what the CUDA stack does when there is no GPU; which driver and runtime combinations run.

Scores: teaching value (1 to 5) x data reality (1 to 3), minus clutter.

## Built
| Idea | Score | Placement | Data | Why it earns its place |
|---|---|---|---|---|
| One cross-CPU wake-up stepped through this VM (target idle, target busy) against bare hardware; exits and host wake-ups counted; measured totals as bars to scale | 5 x 3 | Reading s5, before/after animation | `raw/ipi.txt` (totals, IPI counts), `raw/hvf_macos.txt` (exit, kick, idle-thread wake); steps from irq-gic.c v5.10 and QEMU v6.2.0 hvf.c | Answers the sibling pages' open question with a path you can follow and pieces measured separately; per-step times are never invented, only the measured pieces are shown |
| Two-dimensional page walk: native 4 reads against 24 (and 19, 15 with huge pages), reference by reference with counters | 5 x 2 | Reading s4, before/after animation | structure of the walk; formula (g+1)(h+1)-1 | The 24 is unbelievable until you watch each guest level wait for a host walk |
| First CUDA call against a launch in the training loop: steps that enter the kernel against plain stores | 4 x 2 | Reading s9, before/after animation | open-gpu-kernel-modules 615.71.09 (ioctl escapes, UVM channel submission, usermode doorbell); libcuda's internal order simplified and labelled | Shows why launches need no system call, with what is verified and what is inferred stated |
| Virtqueue: four reads one at a time against posted together; kicks and interrupts counted | 4 x 2 | Reading s6, before/after animation | protocol from virtio_ring.h and virtio_ring.c v5.10; measured ratios in the table beside it | Makes "notifications are the cost, batching buys them back" concrete; labelled illustrative, the measured 1.0 and 0.112 interrupts per request sit next to it |
| One CUDA call tab: five no-GPU cases, every recorded trace line stepped with its meaning and source | 5 x 3 | own tab | `raw/cuda.txt`, `raw/cuda_dev.txt` (strace, LD_DEBUG, outputs) | The real evidence behind section 9; too long for the Reading tab |
| MIG placement lab on an A100 40GB with NVIDIA's published placements and the guide's example geometries, including the failing creation order | 4 x 3 | own tab (Sharing a GPU) | `nvidia-smi mig -lgipp` and `-lgi` outputs from the MIG user guide; the failing order's positions labelled illustrative | Placement rules and fragmentation are spatial; clicking teaches them faster than the table |
| Will it run? driver branch x CUDA version x GPU x code type x compat package | 4 x 3 | Reading s10, inline | NVIDIA CUDA Compatibility rules and Table 3 (forward compatibility matrix); checked over all 792 combinations by check_ui.mjs | The rules interact (minor version compat forbids PTX, forward compat needs data-centre GPUs and a matrix cell); a checker beats a paragraph |
| Two stacks side by side (virtualization layers, CUDA layers), clickable | 3 x 3 | Reading, in one screen | measured identity of this VM | Orientation for a long page |

## Rejected
| Idea | Why not |
|---|---|
| Exit-cost bar chart on its own | Four nearly equal numbers (0.83 to 0.92 µs); a table says it |
| GPU sharing simulator (two jobs, latency under time slicing, MPS, MIG) | Would need invented workloads and timings; the sourced comparison table plus the MIG lab teach the same without fabrication |
| Animated ioctl trace of a real GPU process | No GPU here and no citable public trace with exact calls; replaced by the first-call stepper built from the open interface and labelled |
| Shadow page tables animation | Historical; one paragraph and the OSTEP reference are enough next to the nested-walk animation |
| Steal-time chart | This hypervisor reports none (always 0), so there is nothing to plot |

What the methodology lacked for this page: guidance for a measurement that must be split across two machines (guest and host). Rule used: show totals measured where they happen, show host-side pieces measured separately and labelled as such, never apportion a total into invented per-step times.
