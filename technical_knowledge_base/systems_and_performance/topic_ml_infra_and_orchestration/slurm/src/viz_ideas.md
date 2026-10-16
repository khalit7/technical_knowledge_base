# Visual ideas: built and rejected

The question the page keeps returning to: **why is my job (not) running, and what decided it?** Every visual is one real run of Slurm read at the level of its own logs and numbers.

## Built
| Visual | Where | Why | Data |
|---|---|---|---|
| Job lifecycle timeline, busy cluster against idle (before/after on the same job) | Job lifecycle tab | every state transition is a real log line; shows that only the queue differs and that Slurm's own overhead is milliseconds | slurmctld/slurmd logs at debug + Backfill flag, prolog/epilog lines, rank logs |
| Four steps without and with --exact (before/after animation) | Reading 4 | the most common step surprise, measured; includes the -c implies --exact subtlety | sacct of jobs 129, 126, 130 |
| Same queue 51 s later: stacked priority bars, two snapshots | Reading 7 | fairshare flip with nothing else changing | sprio -l, sshare at two times |
| Multifactor calculator with all 22 measured rows | Priority calculator tab | reproduces sprio exactly, including a truncation case | sprio -n, scontrol show job; recompute.py |
| Pending-reason decoder over all 218 reasons, limit-name grammar | Why pending? tab | reasons are the main debugging interface; 170 of 218 are limits that follow one grammar | job_state_reason.c, gallery run |
| Arrays and dependencies Gantt | Reading 9 | eligibility vs start for chains, throttles, singleton, never-satisfied | sacct |
| Clickable cluster map, job-state chips, predict-then-reveal boxes | Reading | orientation | setup |

## Rejected
- Rebuilding FIFO vs backfill, the Fair Tree calculator and the preemption Gantt: the root's Scheduling lab has them on the same cluster; linked.
- A trace replay (Parallel Workloads Archive) through the backfill simulator: large download, the root's simulator already shows the shapes.
- Running pyxis/enroot or Apptainer: the nodes are containers; nesting shows nothing a GPU node does (described instead).
- Slinky on the kind cluster: needs Slurm 25.11+ images and memory the topic budget does not have; described.
- A topology/tree experiment: no switches to model.
- A sreport utilisation chart: rollups are hourly and were empty for the session (shown as a finding instead).

## What the methodology lacked
Nothing structural. Useful additions: record the controller log at debug level with the Backfill flag for exactly the window of a run (line count before, tail after); and recompute in the program's own arithmetic order when a value is truncated.
