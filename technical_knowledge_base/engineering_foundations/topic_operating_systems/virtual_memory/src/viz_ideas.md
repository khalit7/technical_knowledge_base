# Visualisation ideas: Virtual memory

What the text needs to be understood: how one address becomes a physical one; what a fault does and costs per case; the before/after of huge pages; why RSS misleads; what a container does at its memory limit; how the OOM killer chooses.

| Idea | Score (teach / data / cost) | Placement | Status |
|---|---|---|---|
| Fault-path stepper: one access through the arm64 5.10 path, 7 cases (anon write, zero page, cached file with fault-around, uncached file, copy-on-write, swap-in, SIGSEGV), measured cost per case | 5 / 5 / 3 | Reading s4 | built |
| Same 64 MiB buffer, 4 KiB pages vs THP: faults, time, resident, TLB entries, sparse bloat, fork, page tables, all measured (canvas, before/after toggle) | 5 / 5 / 3 | Reading s8 | built (the page's before/after animation) |
| Address translator: any address on 5 configurations, presets from the job's real maps; page-table and TLB-reach calculator, reproduces measured VmPTE | 4 / 5 / 2 | tab | built |
| Memory replay: four measured cgroup runs replayed (stacked anon/file/shmem, swap line, limit, events) | 5 / 5 / 3 | tab | built |
| oom_badness calculator reproducing the kernel's oom_score exactly | 4 / 5 / 1 | Memory replay tab | built |
| RSS/PSS/USS stacked bars of the job's 3 processes | 4 / 5 / 1 | Reading s13 | built |
| Bars: fork cost, CoW pages by Python case, random-row read cost and amplification, shootdown cost, address-space map | 3 / 5 / 1 | Reading | built |
| Predict-then-reveal drills (6) | 4 / - / 1 | Reading | built |
| TLB miss curve | - | - | rejected: the root page owns it (section 4 and OS simulators); linked |
| Page-replacement simulator (LRU, clock) | - | - | rejected: the root's OS simulators tab has it with OSTEP's homework |
| Copy-on-write page-by-page animation | - | - | rejected: the root's OS simulators tab animates it; this page measures the Python GC variant instead |
| memory.high throttling replay | 4 / 0 / - | - | not built: cannot set memory.high in an unprivileged Docker 20.10 container; taught from source |
| NUMA placement animation | 3 / 0 / - | - | rejected: no NUMA here, so it would be illustrative only |

What the methodology lacked: guidance for measured-replay visuals (a time series recorded once and replayed with the step controller); used RD.anim with one step per sample.
