# Reading tab: numbers and outputs still to fill from the labs

Each item is a dashed red "TODO" box on the page (class rd-todo). Replace the box with the sentence or output, keep the label (measured on Apple M1 Pro, Docker Desktop VM / native, shared machine, for timings), and check the number against the lab's recorded data.

| Section | Part file | From | What |
|---|---|---|---|
| 2 Getting machines | 20_read_a.html | Scheduling lab | The same 8-job queue (A to H, sizes and runtimes in recompute.py) run on the Slurm containers under FIFO and backfill: start and end per job from sacct; say whether the real schedule matches the simulator's. If the lab used a different workload, add its real before/after instead and keep the simulator as illustrative. |
| 4 Launch | 20_read_c.html | Launch lab | Real error message and measured time to error when one rank never arrives, per system (Slurm, kind, Ray). |
| 4 Launch | 20_read_c.html | Launch lab | Repeated submit-to-first-step times per system, split by stage (queue, image pull, container start, rendezvous, init, first step). One-run figures from the setup (Slurm queue 1 s; init 2.4 s Slurm, 3.9 s Kubernetes) are already in the text: replace or confirm them. |
| 5 Failures | 20_read_d.html | Failure lab | DONE 2026-10-16 (Failure lab filled it): rank/container/pod killed mid-run on each system, detection time, checkpoint resumed from, steps lost, loss continuity. |
| 6 Storage | 20_read_e.html | Storage lab | Running example's checkpoint size and write time to local disk, a container volume and MinIO; sync against async step-time impact. |
| 7 Cost | 20_read_e.html | Cost lab | Running example's scheduling efficiency on the three local systems from their accounting. |
| Mistakes | 20_read_f.html | Scheduling lab | kubectl get pods output showing the partial-allocation deadlock on kind (scrubbed). |
| Mistakes | 20_read_f.html | Launch lab | Real error text and time to error for a wrong MASTER_ADDR. |
| Mistakes | 20_read_f.html | Failure lab | DONE 2026-10-16 (Failure lab filled it): measured loss continuity after resume, bit-exact or not, and why. |
