# Visualisation ideas: Concurrency

| Idea | Score (teach / data / novelty, 1-5) | Placement | Status |
|---|---|---|---|
| One contended lock through four designs (spin, wake on every unlock, futex, spin-then-futex), 3 threads on 2 CPUs, timeline to scale, measured syscall and wake-up costs, toggle same-CPU and cross-CPU wake-up | 5 / 4 / 5 | Reading s4, before/after animation | built |
| Interleaving lab: you are the scheduler for glibc's futex mutex, a check-then-sleep lock (lost wake-up), its futex fix, producer/consumer with if and while; shortest bad schedule replay; exhaustive schedule counts checked against Python | 5 / 5 / 5 | tab | built |
| Event loop lab: 8 connections, 4 arrivals, through thread-per-connection, select, poll, epoll, io_uring with counters (syscalls, kernel checks, user scans, wake-ups); scale-up calculator from the measured curve | 5 / 4 / 4 | tab | built |
| Seven locks in four scenarios, wall and CPU time per acquisition, median and range | 4 / 5 / 4 | Reading s3 chart | built |
| select / poll / epoll cost against descriptors watched (log-log, measured) | 4 / 5 / 3 | Reading s9 chart | built |
| GIL wake-up delay next to busy Python threads, switch interval 5 and 0.5 ms | 4 / 5 / 4 | Reading s8 chart | built |
| Training job's threads by torch thread count (gdb + py-spy + strace) | 4 / 5 / 5 | Reading s10, selectable recorded output | built |
| One process, three threads (shared vs per-thread state) | 3 / 2 / 2 | Reading s1 static SVG | built |
| Lost update stepper, deadlock ABBA stepper | 4 / 3 / 1 | link to the root's OS simulators | rejected here: the root owns them |
| Memory-order message-passing litmus test | 4 / 4 / 1 | link to the C++ page Part 2 | rejected here: the C++ page measured it on this chip; Peterson's lock covers the OS angle |
| Free-threaded Python scaling | 3 / 4 / 1 | link to the Python page | rejected here: the Python page owns it |
| Futex hash-table picture with buckets and keys | 3 / 2 / 3 | | rejected: the prose plus the Interleaving lab's wait queues teach it; a static picture added little |
| io_uring ring animation as its own tab | 3 / 3 / 3 | | folded into the Event loop lab's io_uring mode |

What the methodology lacked: guidance for timings on a shared VM. Medians of several runs with the raw spread shown, and a statement of which numbers are VM-specific (cross-CPU wake-ups), stood in for it.
