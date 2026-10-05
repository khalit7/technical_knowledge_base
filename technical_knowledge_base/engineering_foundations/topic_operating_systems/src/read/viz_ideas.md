# Reading tab (rd-): visual ideas, built and rejected

Central question: what does the operating system do for one training job, and what does each step cost?
Every visual uses the running job (src/trace/job/train.py) or a measurement from kb-os-lab:1 (src/read/code/, run_all.sh).

## Built
| # | Visual | Where | Data | Why |
|---|---|---|---|---|
| R1 | One read() crossing into the kernel and back, against a function call (step animation, two modes) + bars of measured costs | s1 | syscall_cost.c: function 1.3 ns, vDSO 24 ns, getppid 281 ns, read 316 ns, pread 4 KiB 607 ns | Required (a). The ratio (about 200x) explains buffering and the vDSO |
| R2 | The job's real address space before and after the DataLoader forks: RSS split (Private/Shared, Dirty/Clean) per process, mapping kinds, RSS against PSS, /dev/shm batches (6 steps) | s2 | maps_job.py wraps train.py's phase() and saves /proc/pid/maps, smaps_rollup, status | Required (b). Shows CoW sharing (226 MiB private became 215 MiB shared), 815 MiB RSS vs 345 MiB PSS |
| R3 | One real address (train.bin's first byte) through the MMU: TLB hit, 4-level walk, 2 MiB huge page (three modes) | s4 | address from maps; index split computed | Required (c) |
| R4 | Pointer-chase curves: packed vs spread over 4 KiB pages vs spread over THP | s4 | tlb.c; 33.6 vs 5.7 vs 8.4 ns at 4,096 lines | Measured TLB-miss cost (c); sim tab's tlb.c quoted as an independent second measurement |
| R5 | Fault table: cold/warm file, private/shared anonymous memory | s4 | faults.py (getrusage) | Minor vs major, fault-around (129 faults for 2,056 pages), readahead |
| R6 | A checkpoint's journey: naive torch.save vs write/fsync/rename/fsync-dir, with "if the machine crashed now" per step and real Dirty counters | s7 | write_journey.py: 64 MiB, Dirty +65,532 kB after write, ~0 after fsync | Required (d) |
| R7 | Verbatim outputs: malloc brk vs mmap strace, counter race, futex count, asyncio epoll strace, container view (ns, cgroup files, caps, seccomp, overlay), cpu.max and cpu_count mismatch, vm sysctls | s3, s5, s6, s8 | run_all.sh | Each proves one sentence of the prose |

Numbers measured by other tabs and quoted (embedded verbatim through RD_DATA.sim): context switch 1.33 us, nice 0 vs 5 share, CoW pages for a list vs NumPy, race losses, TLB 7.6 vs 1.1 ns (src/sim/real/out); first-batch medians per start method (src/trace/raw/timing_first_batch.txt, checked by check_embed.py).

## Rejected
- Scheduler Gantt, page-replacement and crash-consistency simulators in the Reading: owned by the OS simulators tab; linked instead.
- A syscall timeline of the job: owned by the Syscall tracer tab.
- A failure catalogue: owned by the Debug lab (section 10 keeps only a symptom table).
- Drawing the address space to scale by address: 48-bit space with a few dense islands; a log-scaled list of mapping kinds plus RSS bars teaches more.
- perf TLB-miss counters: not permitted in this VM ("No permission to enable dTLB-load-misses event"); attribution by experiment design instead, said on the page.
- A GPU-side animation of one CUDA call: nothing can be measured here (no GPU); kept as a sourced numbered list.
- A NUMA measurement: numactl reports no nodes in this VM; taught from set_mempolicy(2).

## What the methodology lacked
A rule for numbers measured inside a laptop VM: state the VM, prefer ratios, and show run-to-run spread where it is large (cross-CPU wake-up 51 to 222 us between runs).

## Checks
- `sh run_all.sh [name]` re-records out/ (containers os-rd-*); `python3 make_data.py` writes parts/22_js_rd_data.js.
- `python3 code/check_embed.py`: RD_DATA equals out/, every number in the prose recomputed, no private patterns.
- `node read/check_read.mjs` (from the repo root, see its header): every control at 390 dark and 920 light, card screenshots in .shots/rd/.
