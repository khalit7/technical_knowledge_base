# Visualisation ideas: Scheduling and CPU time

What the text needs to be understood: what a switch costs and why; how CFS turns weights into shares (vruntime); how EEVDF changes latency for the same input; what a quota does to threads over time; what a program inside a container believes about its CPUs; which thread and worker counts to use.

| Idea | Score (teach / data / cost) | Placement | Status |
|---|---|---|---|
| Same three threads (two busy, one waking loader) under CFS 5.10, EEVDF 6.12 and EEVDF with a 0.1 ms slice: Gantt to scale, vruntime line with V and deadlines, captions per scheduling event, counters (CPU, waits, preemptions); simulator identical to a Python reference (7/7) | 5 / 4 (model from source) / 3 | Reading s5 | built (the page's before/after animation) |
| Fair-share stepper: up to five editable threads (nice, periodic, custom slice), CPU-count factor, both schedulers, summary of shares and waits | 5 / 4 / 2 | tab | built |
| Throttle replay: measured gaps of 1, 2 or 5 spinning threads under cpu.max, 100 ms per step, 100 ms against 10 ms period, cpu.stat beside | 5 / 5 / 2 | Reading s9 | built (measured before/after) |
| CPU budget lab: measured heat map threads x workers per quota, 4 metrics, every repeat on click | 5 / 5 / 2 | tab | built |
| vruntime and CPU time of nice 0, nice 5 and a sleeper read live from /proc/PID/sched | 5 / 5 / 1 | Reading s4 | built |
| Context-switch and cross-CPU costs, log bars with ranges; cache-pollution rounds table | 4 / 5 / 1 | Reading s2 | built |
| Wake-up delay by policy (p50 to p99 bars) | 4 / 5 / 1 | Reading s6 | built |
| Load average with D-state tasks against the kernel's fixed-point formula | 4 / 5 / 1 | Reading s10 | built |
| What programs see (cpu_count, affinity, torch threads) per docker flag set; shares to weight conversion table; noisy-neighbour bars | 4 / 5 / 1 | Reading s7, s9 | built |
| The running job's threads with waits; worker pid churn drill | 4 / 5 / 1 | Reading s1 | built |
| Predict-then-reveal drills (7) | 4 / - / 1 | Reading, budget tab | built |
| FIFO/SJF/STCF/RR/MLFQ simulator | - | - | rejected: the root's OS simulators tab owns it, checked against OSTEP; linked |
| Lottery against stride animation | 2 / 3 / 2 | - | rejected: a worked stride sequence in the text is enough; CFS is the point |
| Multi-CPU load-balancing animation | 3 / 1 / 3 | - | rejected: perf sched and tracepoints are not available unprivileged here; it would be illustrative only |
| perf sched latency histogram | 4 / 0 / - | - | not built: perf_event access needs CAP_SYS_ADMIN here (Docker 20.10 does not know CAP_PERFMON) |
| NUMA placement animation | 3 / 0 / - | - | rejected: one NUMA node here |

What the methodology lacked: guidance for simulators that stand in for a kernel the lab cannot run (a model checked line by line against source, a second implementation as reference, the model label on every output), and for timing on a shared machine (record the machine's load beside each run, repeat, show ranges).
