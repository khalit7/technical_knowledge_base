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

## Added 2026-10-24 (teaching-contract rebuild)
| Visual | Where | Kind | Data |
|---|---|---|---|
| Hero: one job's path through queue, allocation and steps | top | static annotated diagram | job 79 as it ran |
| Stranded GPUs, two request forms | Reading 3 | before/after toggle | root Scheduling lab's `scontrol -d show job` (split of the task form illustrative) |
| Where limits live | Reading 5 | static annotated diagram | jobs 88, 92, 93 (squeue 05:38:07) |
| Main loop and backfill | Reading 6 | stepper, 7 frames | illustrative queue; rules from the source; step 6 mirrors job 79 |
| Signal, requeue, 121 s hold | Reading 8 | annotated timeline | job 128, `sacct -D` |
| Maintenance window against three limits | Reading 10 | static annotated diagram | `resv.txt`, `resv1.sacct` |
The Job lifecycle animation and the Priority calculator moved from their tabs into sections 2 and 7. The clickable cluster map was removed (the hero carries the structure; its notes are in the top's closed block).
Rejected: a photo (the subject is software; no real object teaches more than the logs shown), a measured backfill Gantt (the root's Scheduling lab owns the measured eight-job run).

## The 2026-11-06 rollout (done 2026-11-12): split layout and 3D stages (renderer v2)
| Visual | Where | Kind | Data |
|---|---|---|---|
| Hero: job 79 through the lab cluster (queue in front, nodes c1 to c3 with 4 GPUs and 4 CPUs each, slurmctld and slurmdbd behind) | top | **3D stage**, 6 steps, step list `sx-hero` | `SL.busy.events` (job 79's slurmctld, slurmd, prolog and epilog lines): submit time and InitPrio, backfill's plan and its count, the blocker's end, the allocation, the steps, the last epilog, gloss |
| Main loop and backfill | Reading 6 | **3D stage**, 7 steps, `sx-bf`: the floor is nodes by time; a job is a block of nodes by time limit, the queue in front shows the same footprints so a job is seen to fit a gap or not | illustrative, as the stepper it replaces; the rules are the source's |
| Fairshare reorders the queue in 51 s | Reading 7 | **3D stage**, 5 steps, `sx-fs`: one column per job (priority, fairshare block coloured by user), team usage meters behind, bob's job 81 charging teamb | `SL.snaps` (sprio -l and sshare -a -l at 05:38:07 and 05:38:58) |
| Job lifecycle, busy against idle | Reading 2 | 2D animation, now eight explained stages (`sx-lf-busy`, `sx-lf-idle`) instead of 21 and 15 log-line frames; each stage shows its raw log lines | unchanged |
| Four steps with and without --exact | Reading 4 | 2D animation, now 3 and 2 stretches (`sx-st-plain`, `sx-st-exact`) instead of 13 one-second frames | unchanged |
Replaced: the static 2D hero, the 2D backfill stepper and the 2D stacked priority bars (their 3D stages carry the same content; per-job factor sums are in the calculator). Kept 2D: stranded GPUs (a toggle of two end states on 8 squares), where limits live (a labelled map), job 128's requeue, the dependency Gantt and the maintenance window (timelines), the calculator (a widget), the pending-reason decoder (a tool).
Rejected for 3D: preemption (this page's own runs have no preemption; the root's Scheduling lab owns the measured one and draws it; job 128's requeue is a timeline); four steps on CPU slots (a good spatial fit, but the measured result is a time difference that the 2D Gantt shows directly; a candidate for later).

## Rejected
- Rebuilding FIFO vs backfill, the Fair Tree calculator and the preemption Gantt: the root's Scheduling lab has them on the same cluster; linked.
- A trace replay (Parallel Workloads Archive) through the backfill simulator: large download, the root's simulator already shows the shapes.
- Running pyxis/enroot or Apptainer: the nodes are containers; nesting shows nothing a GPU node does (described instead).
- Slinky on the kind cluster: needs Slurm 25.11+ images and memory the topic budget does not have; described.
- A topology/tree experiment: no switches to model.
- A sreport utilisation chart: rollups are hourly and were empty for the session (shown as a finding instead).

## What the methodology lacked
Nothing structural. Useful additions: record the controller log at debug level with the Backfill flag for exactly the window of a run (line count before, tail after); and recompute in the program's own arithmetic order when a value is truncated.
