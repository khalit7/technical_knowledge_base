# Visual ideas: containers and isolation

Method: html_utils/interactive-html-ideas.md section 2. What the text needs: (1) that a container is the same process with restrictions added one by one; (2) why PID 1 and the namespace kill rule lose checkpoints; (3) the difference between a wall and a brake on memory; (4) the cost of each namespace; (5) how a pod spec becomes cgroup files.

## Built
| Idea | Score (teach, data, unique) | Where | Data |
|---|---|---|---|
| **Build a container stepper**: one real run of a 170-line C runtime, the process's whole view printed after each of 10 steps, diff against the previous step or step 0 (before/after) | 5, 5, 5 | tab | `raw/minictr.txt` |
| **docker stop, seven ways** (before/after animation of one stop event: the trap and three fixes), process boxes with SIGTERM/SIGKILL, measured times, exit codes and the job's own log | 5, 5, 4 | Reading s2 | `raw/stop_matrix.txt` |
| **One 300 MiB allocation under memory.max, memory.high, memory.high with swap**: bars of memory.current per 10 MiB step, swapped part stacked, slow steps labelled | 5, 5, 5 | Reading s5 | `raw/cgroup.txt` |
| Namespace creation cost, log-scale bars | 3, 5, 4 | Reading s1 | `raw/cost.txt` |
| Freezer: loop iterations per 0.5 s with the frozen gap | 2, 5, 3 | Reading s4 | `raw/cgroup.txt` |
| Capability matrix (8 operations x 4 containers), seccomp probe (12 calls x 3 profiles, differences highlighted), io_uring per-UID table | 4, 5, 4 | Reading s6, s7 | `raw/caps.txt`, `raw/seccomp.txt`, `raw/uring.txt` |
| **Pod to cgroup calculator** with presets, both shares-to-weight maps | 4, 4 (formulas from source), 5 | tab | Kubernetes v1.34.0, runc, opencontainers/cgroups; checked by `recompute.py` |

## Rejected
- A namespace "onion" diagram (concentric rings per namespace): pretty but static; the stepper shows the same thing with real values.
- An animated overlayfs lookup through layers: the whiteout and copy-up are better shown by the real upper-layer listing and the 626 ms measurement.
- A seccomp BPF interpreter stepping through the 9 instructions per call: small teaching gain over the annotated listing; would duplicate the root's Syscall tracer style.
- Running gVisor or Firecracker: needs privileges and nested virtualization; taught from their documentation.
- A PSI chart: this kernel has no PSI (`CONFIG_PSI is not set`).

## What the methodology lacked
Nothing new; as on the sibling pages, "measured here" replaced "real data from a model" and a toy that adds the missing published cell became "the same input under each setting".
