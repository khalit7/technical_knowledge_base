# Visualisation ideas: Concurrency

| Idea | Score (teach / data / novelty, 1-5) | Placement | Status |
|---|---|---|---|
| One contended lock through four designs (spin, wake on every unlock, futex, spin-then-futex), 3 threads on 2 CPUs, timeline to scale, measured syscall and wake-up costs, toggle same-CPU and cross-CPU wake-up | 5 / 4 / 5 | Reading s4, before/after animation | built (no autoplay since 2026-10-24) |
| Interleaving lab: you are the scheduler for glibc's futex mutex, a check-then-sleep lock (lost wake-up), its futex fix, producer/consumer with if and while; shortest bad schedule replay; exhaustive schedule counts checked against Python | 5 / 5 / 5 | tab; moved into Reading s4 on 2026-10-24 | built |
| Event loop lab: 8 connections, 4 arrivals, through thread-per-connection, select, poll, epoll, io_uring with counters (syscalls, kernel checks, user scans, wake-ups); scale-up calculator from the measured curve | 5 / 4 / 4 | tab; moved into Reading s8 on 2026-10-24 | built |
| Seven locks in four scenarios, wall and CPU time per acquisition, median and range | 4 / 5 / 4 | Reading s3 chart | built |
| select / poll / epoll cost against descriptors watched (log-log, measured) | 4 / 5 / 3 | Reading s9 chart | built |
| GIL wake-up delay next to busy Python threads, switch interval 5 and 0.5 ms | 4 / 5 / 4 | Reading s8 chart | built |
| Training job's threads by torch thread count (gdb + py-spy + strace) | 4 / 5 / 5 | Reading s10, selectable recorded output | built |
| One process, three threads (shared vs per-thread state) | 3 / 2 / 2 | Reading s1 static SVG | built |
| Lost update stepper, deadlock ABBA stepper | 4 / 3 / 1 | link to the root's OS simulators | rejected 2026-10-05 (the root owned them); built 2026-10-24 as a stepper and a static cycle, since this page now owns races and deadlock |
| Memory-order message-passing litmus test | 4 / 4 / 1 | link to C++: the machine underneath, section 8 | rejected here: the C++ page measured it on this chip; Peterson's lock covers the OS angle |
| Free-threaded Python scaling | 3 / 4 / 1 | link to Python: concurrency, asyncio and the GIL | rejected as a run (the Python page owns the measurement); built 2026-10-24 as a GIL against free-threaded before/after with the Python page's totals |
| Futex hash-table picture with buckets and keys | 3 / 2 / 3 | | rejected: the prose plus the Interleaving lab's wait queues teach it; a static picture added little |
| io_uring ring animation as its own tab | 3 / 3 / 3 | | folded into the Event loop lab's io_uring mode |

What the methodology lacked: guidance for timings on a shared VM. Medians of several runs with the raw spread shown, and a statement of which numbers are VM-specific (cross-CPU wake-ups), stood in for it.

## Added in the 2026-10-24 rebuild
| Idea | Placement | Status |
|---|---|---|
| Hero: the two kernel queues every wait ends in (futex wait queue, epoll ready list), measured costs on the figure | top | built |
| Choosing tree (I/O or CPU, Python or native) with three cost cards | Reading s9 | built |
| Thread picture at the measured width (was a fixed 640 px SVG) | Reading s1 | rebuilt |
| Photo or paper figure | | rejected: a mechanism page; nothing physical to show |

## 2026-11-07: split layout and 3D stages (renderer v2)
| Idea | Placement | Status |
|---|---|---|
| Hero as a 3D stage: user space as a glass plate above the kernel floor; contended threads drop into the futex queue and rise when woken; one event loop, eight sockets, the interest list and the ready list; measured costs on the figure | top, Fig. 1 | built (replaces the 2D hero) |
| Two threads as lanes in time with the counter between them: plain lost update, with a mutex (T2 asleep on the futex), atomic fetch-and-add | s2, Fig. 2 | built (replaces the 2D stepper) |
| glibc's 0/1/2 word and the kernel's hash-bucket queue, three threads, compare under the bucket lock | s4, Fig. 3 | built (the futex hash-table picture rejected in October now earns its place as motion: threads parking and waking) |
| The recorded deadlock.py as a cycle: locks on the plate, each sleeper under the lock it waits for, py-spy lines from the recording, then --ordered | s6, Fig. 4 | built (replaces the static wait-for cycle) |
| Eight connections through four designs in 3D (thread per connection, select / poll merged, epoll, io_uring rings straddling the plate), counters on the figure | s8, Fig. 5 | built (replaces the 2D animation; select and poll had identical frames, so one mode) |
| Four lock designs on one timeline | s4 | kept 2D: a timeline reads best flat; now a widget that opens on the finished run (one frame per kernel event, more than 12 per design, too many for explained steps) |
| Lock costs, GIL delay, readiness cost against N, free-threaded before/after, choosing tree, thread picture | s1, s3, s7, s8, s9 | kept 2D: bars, a log-log curve, a timeline, a tree and a structure diagram read best flat |
