# Launch lab: visualisation ideas (built and rejected)

Central question of the tab: what happens between "the scheduler gave me nodes" and "step 1 ran", how long each part takes on each system, and what each way of breaking it looks like (symptom, message, time to error).

Scores 0 to 2 on: moves with a parameter, reproduces a source, computable from real data, shows what a sentence cannot, corrects a misconception, measures the central question, absent elsewhere; animation point; build cost subtracted.

| # | Idea | Data | Placement | Score | Status |
|---|---|---|---|---|---|
| 1 | **Launch timeline, animated, same job on three schedulers** (time cursor sweeps the critical-path stages; single-system mode adds per-node and per-rank lanes showing the rendezvous wait) | probe timestamps of 5 runs per system (`out/launch_times.json`) | section 3 | 12 | built |
| 2 | **Rendezvous animation with real event times, before/after one node never arrives** (two stores, agents, workers; the missing-node mode jumps to the 600 s timeout and the real error) | Slurm timing run + Slurm missing-node run | section 4 | 12 | built. The Reading tab has a schematic rendezvous animation (order of events only); this one uses the measured times, the two-store detail (c10d store on 29500 then the workers' store on a random port) and the real error |
| 3 | **Environment explorer** (every launch variable of every rank on each system, who set it, what it means, rows that differ between ranks highlighted) | probe env dumps (scrubbed) | section 5 | 10 | built |
| 4 | **Broken launches on a log time axis** (time to first error per induced failure; real log; which timeout governs, with file:line) | failure runs (`out/hangs.json`) | section 7 | 11 | built |
| 5 | Stage bars of every run (variance made visible) | same as 1 | section 3 | 7 | built |
| 6 | Hang-diagnosis drills (predict the cause from a real log excerpt) | failure runs | section 7 | 8 | built |
| 7 | py-spy dump and flight-recorder dump of a real hung rank | stall run on kind | section 7 | 8 | built (text) |
| 8 | Rank picture (2 nodes x 2 ranks with their real env values) | Kubernetes probe | section 1 | 5 | built (static) |
| 9 | NCCL bootstrap animation (unique id, bootstrap ring, topology) | NCCL docs only, nothing runs here | none | 4 | rejected: cannot be measured on CPU; a drawing would be illustration without data; table of documented variables instead |
| 10 | Scaling extrapolation of rendezvous time to 1,000 nodes | no published per-stage measurements found that could be checked | none | 3 | rejected: would be invented numbers |
| 11 | Port and connection matrix of gloo's full mesh (ss output) | possible with `ss -tnp` in containers | none | 4 | rejected for now: teaches little beyond one sentence ("every pair connects") |
