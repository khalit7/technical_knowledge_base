# Visual ideas for the Ray child page (2026-10-16)

Central question: what does Ray do with your program's tasks, objects and workers, and what survives when part of the cluster fails?

## Built
| Idea | Where | Score notes | Data |
|---|---|---|---|
| Eight 0.5 s tasks, submitted together vs ray.get in a loop (before/after on the same input, animated) | Reading, Tasks | corrects the most common Ray mistake; real start/end per task | `runs/core/tasks.jsonl` |
| Cluster map with idle memory per container | Reading, in one screen | the reader's picture of what runs where | `mem.txt`, `ray_status.txt` |
| Object locations stepper (inline vs store, copy on get, ray.put on the driver's node, 16 MB pull) | Reading, Objects | real `get_object_locations` output | `objects.jsonl` |
| Spill chart: read-back time per object, spilled vs in memory | Reading, Spilling | shows spilling as slower, not failing; Ray's own counters | `spill.jsonl`, `spill_memory.txt` |
| Head process memory bars | Reading, Architecture | corrects "the GCS is what uses memory": the dashboard is | `ps_mi-ray-head.txt` |
| Fault-tolerance table (11 rows, all measured) | Reading, Fault tolerance | defaults from source, outcomes from runs | `fault.jsonl`, `lineage.*` |
| Life of a task (big vs small result toggle), owner's table updating | Ownership lab | from the design, labelled; ties ownership to messages | Ownership paper, whitepaper |
| Node-loss replay: six items, six fates, GCS log timeline | Ownership lab | the lab's centrepiece; before/after per item | `lineage*.txt/jsonl`, `lineage_gcs.txt` |
| Ray Data block Gantt, three plans (fused, unfused, staged) | Ray Data pipeline | before/after on the same input; first-batch time | `data_*.log`, `ds.stats()` |
| Train failure replay with "what you might expect" (illustrative) toggle | Train failure replay | shows the unregistered checkpoint finding | `runs/train/run1..3` |

## Rejected
- Placement-group strategies animation: the root's Scheduling lab owns it (linked, its numbers quoted).
- Launch timeline for Ray Train: the root's Launch lab owns it.
- A Ray Tune sweep: repeats task and actor mechanics; Tune described only.
- KubeRay on kind: about 3 GB more containers on a machine near its budget; described from docs.
- GCS fault tolerance with Redis: needs a head restart and Redis for a result the docs state; described.
- Object transfer bandwidth chart: a laptop's Docker bridge says nothing about a 400 Gb/s fabric; only the first-vs-second read ratio is shown.
- Pass-by-value vs ray.put timing: within noise at this size (two passes disagreed in sign); mechanism stated without a number.
- A Ray Data backpressure demo: the dataset (1 MB) is too small to fill an 80 MB store; described from the docs.

## What the methodology lacked
Nothing to reproduce from a published table here; the reproducible things are defaults in source, so each default is quoted with file and line and located by script (`scripts/ry_quotes.py`). Timing races (the checkpoint registration) need repeats: three runs, all the same.
