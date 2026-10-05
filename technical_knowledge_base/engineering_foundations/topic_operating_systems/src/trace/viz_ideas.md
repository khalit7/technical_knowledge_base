# Syscall tracer: visual ideas, built and rejected

Central question: what does one training job ask of the kernel, where do those requests come from, and what do they cost?

## Built
1. Phase chart (log scale, stacked by kind, per start method) with a predict-then-reveal: import storms are 94% of the fork run's 58,263 calls. Scores high: corrects the belief that training dominates the syscall bill.
2. Trace explorer: canvas lanes per process and per process's threads; density columns for every call, one-by-one marks where kept, hatched import-storm blocks with summaries; zoom by phase, filter, kind toggles, click for a dictionary entry (what it asks, OS idea with OSTEP chapter, who called it here, man page). Jump buttons to the fork, the dataset mmap, write/fsync/rename and the SIGTERM (the OS simulators tab links here for these).
3. Start-method animation (fork, spawn, forkserver) to scale in system calls from `iter(dl)` to the first batch, with untraced medians, plus an epochs table that shows forkserver with an explicit preload (0.70 s once, then 0.035 s) and the CPython source reason the default `__main__` preload does nothing.
4. Buffered against unbuffered writes: 4,096 squares, flush groups of 16 (4,096-byte buffer from st_blksize), 256 against 4,096 write(2) calls, untraced 1.51 ms against 5.79 ms, about 1.1 us per extra call.
5. Checkpoint three ways with "a crash now" verdict per real call (naive O_TRUNC destroys the old file first; safe write-fsync-rename-fsync never leaves a torn ckpt.pt), timings on overlay and tmpfs.
6. SIGTERM path from the trace, exposing delivery to a non-main thread and the one-step-late handler; DataLoader worker handlers quoted from source.
7. Language to kernel: five languages' whole-program syscall counts and real gdb call stacks from the user's line to glibc's wrapper.

## Rejected
- Raw time axis as the main view: strace inflates times about 100x; counts and order are kept, costs come from untraced runs.
- Embedding all 289,000 raw calls: about 10 MB; storms are summarised and spawn/forkserver keep detail only where they differ.
- ltrace library-call view: no arm64 package in Debian 12; gdb stacks replace it. strace -k: not compiled into this strace.
- eBPF/perf per-syscall latency histograms: belong to the Debug lab; the tracer is about what is asked, not latency.
