# Visualisation ideas: Distributed systems fundamentals

Ranked by teaching value (T, 1 to 5), data reality (D: real, derived or illustrative) and cost (C, 1 cheap to 5 expensive).

| Idea | Placement | T | D | C | Status | Notes |
|---|---|---|---|---|---|---|
| Raft lab: five-server simulation, guided 10-step tour (election, commit, leader crash, re-election, restart and catch-up, split with leader on the minority side, heal and overwrite, loss of majority) and free mode (crash, restart, split off, write, next event) | Tab "Raft lab" | 5 | real algorithm (paper's Figure 2), simulated time | 5 | built | Model separate from UI; fuzz-tested by check_raft.mjs (300 runs, safety invariants after every event, liveness after heal). Reduced motion: tour steps jump to their end state |
| Replication lag before/after: the same write "hello" read back four ways (stale read; read-your-writes wait; reads going backwards; sticky replica) | Reading, Replication | 5 | illustrative positions, measured rates beside | 2 | built | DeepSeek-style step animation with counters |
| Real Postgres primary + streaming replica measured: async / sync on / remote_apply / async + LSN wait, 2,000 writes each | Reading, table | 5 | real (measure_replication.py, ~1 min) | 2 | built | Key finding: sync `on` still let 1 of 2,000 reads be stale; async missed 99.65% even on loopback |
| Fencing token before/after on the same GC pause (Ana's credits) | Reading, Leases | 5 | illustrative amounts, Kleppmann's tokens | 2 | built | |
| Consistency lab: seven histories, brute-force linearizable and sequential checker, editable reads | Tab "Consistency lab"; two histories inline in Reading | 5 | computed | 3 | built | Causal/RYW/eventual verdicts hand-written for presets, shown as "?" after edits |
| hash mod N vs consistent hashing on 10,000 real keys, adding one machine, vnode slider | Reading, Partitioning | 4 | computed (FNV-1a + fmix32) | 2 | built | Plain FNV-1a clumped vnode tokens (busiest machine x1.86 at 64 vnodes); finalizer added and said on the page |
| Quorum N/R/W widget with worst-case read | Reading, Quorums | 4 | computed | 1 | built | |
| Lamport vs vector clocks on one diagram, tap two events | Reading, Clocks | 4 | computed | 2 | built | |
| Four silences (request lost, crash, slow, reply lost) | Reading, What goes wrong | 4 | conceptual | 1 | built | |
| Local etcd cluster: kill the leader, measure re-election | - | 4 | real | 3 | rejected for now | Would need a 20 MB binary download; the Raft paper's own measurements are quoted instead. Good follow-up |
| Partition simulator for CAP (two halves, a write, a read) | - | 3 | conceptual | 2 | rejected | The Raft lab's split step shows the same choice with a real algorithm |
| Replication lag with injected network delay (tc/netem) | - | 3 | real | 3 | rejected | macOS has no netem; loopback result already makes the point |
| Jepsen findings timeline chart | - | 2 | real | 1 | rejected | A dated table reads better than a chart for ten findings |

What the methodology lacked: a rule for validating a simulator (here: fuzz the model for the algorithm's own published invariants, and say the simplifications on the page).
