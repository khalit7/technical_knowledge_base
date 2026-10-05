# Visualisation ideas: Processes and the system-call API

The question the page keeps returning to: **what does the kernel do when a training job creates, rewires, signals and stops its processes, and what does each choice cost or break?** A visual earns a place when it shows that with real runs.

Scores: computable from real data (0-3, counts double in spirit), reproduces or measures a figure (0-3), shows what a sentence cannot (0-2), corrects a misconception (0-2), step animation / before-after (0-2), minus build cost.

## Built

| # | Page | Idea | What it shows, and what the reader does | Why it helps | Data and sources | Placement | Score |
|---|---|---|---|---|---|---|---|
| PROC.1 | Processes and syscalls | **One os.read(), step by step** (open fd / closed fd / under strace) | Layers Python, CPython, glibc, CPU, kernel entry, sys_read, strace lit in turn; registers x0, x1, x2, x8 change; counters for mode switches, tracer stops and strace's own calls | The system-call mechanism as a before/after on one call: the error path (negative return, errno, OSError) and the strace path (two stops, 10 tracer calls per call, measured) | glibc 2.36 disassembly (gdb), Linux v6.12 entry functions with lines, strace-of-strace counts (runs/out/strace_meta.txt) | Reading 2 | 3+2+2+1+2 = 10 |
| PROC.2 | Processes and syscalls | Annotated real disassembly of glibc read() | gdb output with the single-threaded check, mov x8 #63, svc, the -4096 compare and the errno store highlighted | The "door" is four instructions you can read; explains errno and cancellation points | runs/out/c_runs.txt | Reading 2 | 9 |
| PROC.3 | Processes and syscalls | Cost ladder, log scale | function call to strace-traced call, root's and this page's measurements | Puts 1.3 ns, 24 ns, 270 ns and 124 µs on one axis | root syscall_cost.txt; sysc.c | Reading 2 | 8 |
| PROC.4 | Processes and syscalls | **Process creation cost against parent size** | fork, fork+exec, vfork, posix_spawn at 0 to 1,024 MiB, median and p10-p90, VmPTE per size | fork scales with page tables (17.1 ms at 1 GiB), vfork and posix_spawn stay flat; corrects "fork copies memory" | spawn_cost.c (41 runs per point) | Reading 3 | 3+3+2+2+0 = 10 |
| PROC.5 | Processes and syscalls | Python spawn table with the huge-page finding | os.fork, subprocess, mp fork/spawn/forkserver from a torch process, with and without 1 GiB NumPy, with THP on and off | NumPy's huge pages make fork of 1 GiB as cheap as none (5.96 ms against 22.5 ms without) | py_spawn.py | Reading 3 | 9 |
| PROC.6 | Processes and syscalls | Real /proc of the running job (ps, status, fd tables, limits, /dev/shm) | Main process and a worker side by side | Every abstraction (tgid, threads, masks, inherited pipes, fds passed through a socket) visible in one real snapshot | in_container_proc.sh | Reading 1, 7, 8 | 9 |
| PROC.7 | Processes and syscalls | Signal-mask decoder with the job's real masks | hex to signal names; explanations for the main process's and worker's SigIgn/SigCgt | Shows SIGINT ignored by a background job, torch's worker handlers, the DataLoader's SIGCHLD | proc_snapshot.txt | Reading 6 | 8 |
| PROC.8 | Processes and syscalls | **One SIGTERM, three endings** (animated lanes) | runtime, kernel, main thread, workers; handler in Python / handler stuck in a 1.2 s C++ call / PID 1 is sh -c | Before/after of graceful shutdown with measured times and exit codes | Shutdown lab v1, v2; handler_latency.py | Reading 6 | 2+3+2+2+2 = 11 |
| PROC.9 | Processes and syscalls | Handler latency table | ms from kill() to the Python handler for five kinds of main-thread work | Python handlers wait for C calls: 0.2 ms against 1.2 s | handler_latency.py | Reading 6 | 9 |
| PROC.10 | Processes and syscalls | **Leaked write end, before and after O_CLOEXEC** (descriptor tables animated) | three-table picture per step (fd tables, open file descriptions with refs and offsets, objects), write ends counter, measured EOF time | The EOF rule and close-on-exec as one before/after on the same program; real timings 2.011 s vs 0.015 s | cloexec.c; FDSIM model | Reading 7 | 2+3+2+2+2 = 11 |
| PROC.11 | Processes and syscalls | Process lab: descriptor stepper with presets and your own script | shell pipeline, both orders of 2>&1, leak/fix, shared offset | Lets the reader run the calls; the 2>&1 order mistake shown, not told | FDSIM | Own tab | 9 |
| PROC.12 | Processes and syscalls | Process lab: process-tree simulator, Linux vs OSTEP rules | fork/exit/wait actions, zombies, subreaper, PID 1 that reaps; "check against fork.py" | Corrects OSTEP fork.py's default (all descendants to the root) with Linux's real rule (measured reparent run); 36 of 36 recorded fork.py trees reproduced | inputs/ostep_fork_cases.json; reparent.c | Own tab | 10 |
| PROC.13 | Processes and syscalls | **Shutdown lab**: ten real start-up variants x 3 runs | table, stop-time dot chart with the 10 s SIGKILL line, per-run process tree and log | Found two non-obvious failures: tini + shell kills Python in 0.3 s with no checkpoint; torchrun's killpg crashes the trainer through its DataLoader workers; and the fix | run_shutdown.sh | Own tab | 3+3+2+2+0 = 10 |
| PROC.14 | Processes and syscalls | Predict-then-reveal drills (strace epoch, fork 1 GiB, stdio twice, signal coalescing, torchrun checkpoint, tini, zombies) | Answer, then see the measured result | Belief elicitation on the page's most counter-intuitive results | runs/out | Reading, labs | 8 |

## Rejected
| Idea | Why |
|---|---|
| Copy-on-write page-by-page animation after fork | The root's OS simulators tab has it, and the virtual-memory child owns it; linked |
| fork vs spawn vs forkserver time-to-first-batch chart | The root measured and charted it (Syscall tracer); quoted instead |
| Syscall explorer over the job's strace | The root's Syscall tracer tab is exactly that |
| A scheduler/state-machine animation of R/S/D/Z | The scheduling child owns run states over time; a table here suffices |
| GPU-side signal latency (handler blocked in cudaSynchronize or NCCL) | No GPU here; stated from the measured CPU analogue and labelled not run |
| Live x86-64 disassembly | Machine is arm64; x86-64 conventions given from syscall(2) and kernel source |

## What the methodology lacked for this page
A rule for experiments whose instrument changes the result: the first exec-survival run exec'd /bin/sh, and dash's own startup (clearing the mask, installing handlers) hid what execve keeps. The page now says so, and the rerun uses a program that changes nothing. Proposed rule: when measuring inherited state, observe it from a process that does not touch that state.
