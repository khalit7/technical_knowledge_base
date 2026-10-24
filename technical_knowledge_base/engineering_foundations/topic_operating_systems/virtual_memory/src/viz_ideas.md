# Visualisation ideas: Virtual memory

What the text needs to be understood: how one address becomes a physical one; what a fault does and costs per case; the before/after of huge pages; why RSS misleads; what a container does at its memory limit; how the OOM killer chooses.

| Idea | Score (teach / data / cost) | Placement | Status |
|---|---|---|---|
| Fault-path stepper: one access through the arm64 5.10 path, 7 cases (anon write, zero page, cached file with fault-around, uncached file, copy-on-write, swap-in, SIGSEGV), measured cost per case | 5 / 5 / 3 | Reading s4 | built |
| Same 64 MiB buffer, 4 KiB pages vs THP: faults, time, resident, TLB entries, sparse bloat, fork, page tables, all measured (canvas, before/after toggle) | 5 / 5 / 3 | Reading s8 | built (the page's before/after animation) |
| Address translator: any address on 5 configurations, presets from the job's real maps; page-table and TLB-reach calculator, reproduces measured VmPTE | 4 / 5 / 2 | tab | built |
| Memory replay: four measured cgroup runs replayed (stacked anon/file/shmem, swap line, limit, events) | 5 / 5 / 3 | Reading s12 (moved from its own tab 2026-10-24) | built |
| oom_badness calculator reproducing the kernel's oom_score exactly | 4 / 5 / 1 | Reading s12, closed block (moved 2026-10-24) | built |
| RSS/PSS/USS stacked bars of the job's 3 processes | 4 / 5 / 1 | Reading s13 | built |
| Bars: fork cost, CoW pages by Python case, random-row read cost and amplification, shootdown cost, address-space map | 3 / 5 / 1 | Reading | built |
| Predict-then-reveal drills (6) | 4 / - / 1 | Reading | built |
| TLB miss curve | - | - | rejected: the root page owns it (section 4 and OS simulators); linked |
| Page-replacement simulator (LRU, clock) | - | - | rejected: the root's OS simulators tab has it with OSTEP's homework |
| Copy-on-write page-by-page animation | - | - | rejected 2026-10-05 (root's simulator); reversed 2026-10-24: this page owns copy-on-write, so it now has the stepper (below) |
| memory.high throttling replay | 4 / 0 / - | - | not built: cannot set memory.high in an unprivileged Docker 20.10 container; taught from source |
| NUMA placement animation | 3 / 0 / - | - | rejected: no NUMA here, so it would be illustrative only |

What the methodology lacked: guidance for measured-replay visuals (a time series recorded once and replayed with the step controller); used RD.anim with one step per sample.

## Added in the 2026-10-24 rebuild (teaching contract)
| Idea | Kind | Placement | Status |
|---|---|---|---|
| Hero: one process, virtual ranges through the TLB and page tables onto page cache, anonymous frames and the zero page, swap and files below, the cgroup charge around RAM | static annotated diagram | top | built (`28_js_rd_hero.js`) |
| Four-level walk of the dataset address, one memory read per level, then the TLB fill | stepper | Reading s2 | built (`28_js_rd_walk.js`); indices computed, frame numbers illustrative |
| fork and copy-on-write, four pages, parent and child tables, shared and copied frames, the gc.collect step | stepper | Reading s7 | built (`28_js_rd_cow.js`) |
| min / low / high watermarks to scale, who reclaims in each band | static diagram | Reading s6 | built (`28_js_rd_misc.js`) |
| Pageable against pinned host-to-GPU copy | before/after static diagram | Reading s9 | built (`28_js_rd_misc.js`); from documentation, not run here |
| Commit accounting: RAM, CommitLimit, Committed_AS before and after one mmap(64 GiB), RSS | bars | Reading s10 | built (`28_js_rd_misc.js`) |
| Real photo (a DRAM module, a TLB die shot) | real image | - | rejected: the page is about mechanisms, not an object the reader has not seen; hardware memory is Memory technology's |
| Unified memory page-migration stepper | stepper | - | rejected: the virtualization sibling (section 11) owns the driver's side and the CUDA memory hierarchy page owns the programmer's; linked |
