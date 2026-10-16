# Storage lab: visual ideas

Central question: how long does training stand still to save itself, and what does it take to make that short?

| # | Idea | Score /14 | Data | Placement | Status |
|---|---|---|---|---|---|
| 1 | Same 60 steps without, with sync and with async checkpoints, animated timelines (play/step/scrub/speed, counters), three targets | 13 | measured step times (`train_*`, `slow_*`) | section 4 | built (before/after on the same input) |
| 2 | Checkpoint-time calculator: size, shard, sharded pipe, consolidated vs sharded vs async, overhead per interval, Lustre capacity for a target time, S3 retention cost | 12 | derived; tier numbers sourced (Llama 3, AWS, NVIDIA) | section 5 | built; defaults land on 5.67 TB, 346 MB/GPU (inside Llama 3's 1 MB to 4 GB), 2.8 s |
| 3 | Five write layouts, one lane per rank (gather / write / wait), slow folder vs volume | 11 | measured (`slow_*`) | section 3 | built: the burst before/after sharding; honest about one shared pipe |
| 4 | Six storage stand-ins, three sizes, write/read, log bars + predict-then-reveal | 11 | measured (`run_tiers.sh`), plus the clusters' recorded writes | section 1 | built |
| 5 | Checkpoint anatomy stacked bar (weights, moments, pickle, zip) | 9 | `ckpt_anatomy.py` | section 2 | built; sums to 1,386,049 exactly |
| 6 | Small files vs big files table, prefetch per-step wait bars | 9 | measured (`data_read.py`) | section 6 | built; formats and loaders left to Storage and loading |
| 7 | Real restore errors (truncated, missing shard, wrong shape) and reshard 4 to 2/3/1 | 8 | `errors.py`, `reshard.jsonl` | section 7 | built |
| 8 | Storage-tier table, published and vendor, prices dated | 8 | AWS, NVIDIA, Micron, Llama 3, OLMo 2 | section 1 | built |

Rejected: a burst animation drawn from invented bandwidths (the measured layouts and the calculator cover it with real or derived numbers); measuring sharded speedup with several nodes (one Mac is one pipe: said instead, and computed in the calculator); a long multi-node checkpoint run on the Slurm or kind clusters (their /shared targets are the same Docker volume and host folder already measured; the recorded runs give their write times for free); a DeepSeek 3FS preset (only read throughput published).

What the methodology lacked: a rule for "the laptop cannot show the mechanism" cases. Used here: measure the part that does reproduce (bytes on a shared pipe, gather cost, async stop), say plainly what cannot (parallel links), and hand the rest to a labelled calculation.
