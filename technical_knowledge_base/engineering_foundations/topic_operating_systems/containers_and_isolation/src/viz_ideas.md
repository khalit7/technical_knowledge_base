# Visual ideas: containers and isolation

Method: `.claude/skills/explainer-page/visuals/choosing.md`. What the text needs: (1) that a container is the same process with restrictions added one by one; (2) why PID 1 and the namespace kill rule lose checkpoints; (3) the difference between a wall and a brake on memory; (4) the cost of each namespace; (5) how a pod spec becomes cgroup files.

## Built
| Idea | Score (teach, data, unique) | Where | Data |
|---|---|---|---|
| **Build a container stepper**: one real run of a 170-line C runtime, the process's whole view printed after each of 10 steps, diff against the previous step or step 0 (before/after) | 5, 5, 5 | Reading s0 (was a tab until 2026-10-24) | `raw/minictr.txt` |
| **docker stop, seven ways** (before/after animation of one stop event: the trap and three fixes), process boxes with SIGTERM/SIGKILL, measured times, exit codes and the job's own log | 5, 5, 4 | Reading s2 | `raw/stop_matrix.txt` |
| **One 300 MiB allocation under memory.max, memory.high, memory.high with swap**: bars of memory.current per 10 MiB step, swapped part stacked, slow steps labelled | 5, 5, 5 | Reading s5 | `raw/cgroup.txt` |
| Namespace creation cost, log-scale bars | 3, 5, 4 | Reading s1 | `raw/cost.txt` |
| Freezer: loop iterations per 0.5 s with the frozen gap | 2, 5, 3 | Reading s4 | `raw/cgroup.txt` |
| Capability matrix (8 operations x 4 containers), seccomp probe (12 calls x 3 profiles, differences highlighted), io_uring per-UID table | 4, 5, 4 | Reading s6, s7 | `raw/caps.txt`, `raw/seccomp.txt`, `raw/uring.txt` |
| **Pod to cgroup calculator** with presets, both shares-to-weight maps | 4, 4 (formulas from source), 5 | Reading s12 (was a tab until 2026-10-24) | Kubernetes v1.34.0, runc, opencontainers/cgroups; checked by `recompute.py` |

## Added 2026-10-24 (teaching-contract rebuild), chosen by the kind of concept
| Idea | Kind | Where | Data |
|---|---|---|---|
| Hero: one container as processes with SEE, USE, HAVE and DO restrictions above the one shared kernel, a second container beside it | static annotated diagram (structure) | the top | none (structure) |
| nsproxy pointers before and after the build, real inode numbers | static diagram (structure) | s1 | `raw/minictr.txt` steps 0 and 8 |
| overlayfs: merged, upper and two image layers for three files; copy-up, second write, whiteout, new file | stepper (process); reverses the 2026-10-05 rejection of an overlay animation: the stepper is learner-paced and carries the measured times | s3 | `raw/image.txt` |
| no-internal-processes rule, before and after | before/after, static | s4 | `raw/cgroup.txt` |
| uid_map: what root inside is on the host, five rows | static diagram | s6 | `raw/userns.txt` |
| Three gates on one system call (seccomp, capability check, permissions and LSM), four measured calls | static matrix diagram | s7 | `raw/seccomp.txt`, `raw/caps.txt`, `raw/userns.txt` |
| Runtime chain: dockerd or kubelet, containerd, one shim per container, runc transient, the process | static diagram (structure) | s9 | `raw/runtime.txt` for the real chain |
| Container, gVisor, microVM: what untrusted code talks to, the boundary layer in each | static comparison | s10 | gVisor and Firecracker documentation |
| GPU container: what comes from the image and what from the host | static diagram | s11 | NVIDIA Container Toolkit and CDI documentation |

Real images: none. The page is about kernel mechanisms, not physical objects; the candidates (the Firecracker design document's host-integration figure, gVisor's architecture figure, both Apache-2.0 in their repositories) draw the same structure as section 10's diagram less legibly at phone width and in the page's colours, so the hand-built diagram was kept.

## Rejected
- A namespace "onion" diagram (concentric rings per namespace): pretty but static; the stepper shows the same thing with real values.
- An animated overlayfs lookup through layers: the whiteout and copy-up are better shown by the real upper-layer listing and the 626 ms measurement.
- A seccomp BPF interpreter stepping through the 9 instructions per call: small teaching gain over the annotated listing; would duplicate the root's Syscall tracer style.
- Running gVisor or Firecracker: needs privileges and nested virtualization; taught from their documentation.
- A PSI chart: this kernel has no PSI (`CONFIG_PSI is not set`).

## What the methodology lacked
Nothing new; as on the sibling pages, "measured here" replaced "real data from a model" and a toy that adds the missing published cell became "the same input under each setting".
