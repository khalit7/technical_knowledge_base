# Reading tab: visual ideas (built and rejected)

The question the topic keeps returning to: how much of the GPU time you pay for turns into training, and which piece of infrastructure decides it (the queue, the launch, failures, storage, meters).

## Built (Reading)
| # | Visual | What it shows | Data | Score notes |
|---|---|---|---|---|
| R1 | Life of one job (clickable stack) | The whole topic as six stages of one job, each linking its section | none | The "one screen" device of the JAX and training roots |
| R2 | Cluster anatomy schematic | Login, controller, storage, nodes with 8 GPUs and an NVLink switch, one NIC per GPU to the scale-out fabric, the front-end network | Structure from Llama 3 section 3.3.1 and the interconnects page | Picture before detail; drawn at measured width (2 nodes on phones) |
| R3 | FIFO against EASY backfill, animated Gantt | The same 8-job queue on 8 nodes; makespan 17 to 15, utilisation 71% to 81%, mean wait 8.25 to 3.5, B's start unchanged | Illustrative workload; simulator in JS and recompute.py agree | Before/after on the same input; to be paired with the Scheduling lab's real Slurm schedule (TODO) |
| R4 | Rendezvous step by step, all ranks against one missing | 4 ranks on 2 nodes meeting at the TCPStore; the barrier; the process group; the hang and timeout | Order of events from torch; timeouts from torch 2.14.1 (30 min gloo installed, 10 min NCCL ProcessGroupNCCL.hpp:159, 600 s join_timeout dynamic_rendezvous.py:1405) | Before/after; the 511-of-512 predict question builds on it |
| R5 | Same run through the same two failures, with and without checkpoints | Progress against wall-clock; goodput 53% against 78% | Illustrative inputs; recompute.py | Before/after on the same failures |
| R6 | MTBF and Young calculator | Job MTBF from Llama 3's rate scaled by 1/N, Young interval, expected loss | Llama 3 Table 5 count; Young 1974 | Reproduces nothing published (derived); the design-interview tool |
| R7 | Three predict-then-reveal questions | Inflated time limit and backfill; 511 ranks at init; 100% GPU utilisation | squeue reason codes, nvidia-smi and DCGM docs | Belief elicitation |
| R8 | Same job three ways (tabs) | sbatch, JobSet, Ray Train for the running example, each with its scheduler's own record and rank 0's environment | setup's real files and scrubbed runs, filled by make_code.py | Ends on the bit-for-bit loss agreement across the three |

## Rejected
- Gang-scheduling deadlock animation in Reading: the Scheduling lab builds it on real kind output; Reading quotes OpenAI's account and links it.
- Fairshare calculator in Reading: Scheduling lab's.
- Checkpoint-time calculator by tier: Storage lab's; Reading keeps two derived sizes (70B, 405B) in prose.
- Utilisation waterfall chart: Cost lab's; Reading gives the three losses as a numbered list.
- A third backfill mode with padded time limits: with uniform padding every limit scales together and this workload gives the identical schedule (checked in recompute.py), so it would teach nothing; the effect is taught by the predict question instead.
- A "who uses what" chart with shares: no census exists; a dated evidence table instead.
