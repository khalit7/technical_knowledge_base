# Cut from the root's Failure lab and Storage lab (2026-10-19)

The overlap fix shrank both lab tabs to root depth: the Failure lab keeps the definitions, the twelve-run Slurm / Kubernetes / Ray matrix (its one interactive) and a one-table summary of every other measured result; the Storage lab keeps the tiers compared, a one-table summary and the checkpoint-time calculator. The parts below are the tabs as they were, verbatim, kept as input for the children (never deleted). Data and scripts stay in `../fail/` and `../io/`; `33_js_fl_0data.js` and `34_js_io_0data.js` still embed the full recorded data.

## fail_lab_cut/ (old sections 1 and 3 to 10)
What the children do not yet hold, by suggested owner:
- Fault tolerance at scale: the with/without-checkpoint progress chart (runs fl-base, fl-crash, fl-nockpt); the bit-for-bit experiment tables (three extra runs isolating DDP's bucket rebuild); the hang log and the "Root Cause names a victim" predict; the straggler step-time animation and backward-time probe; the drain, cordon and out-of-service transcripts and the `HealthCheckProgram` script; the elastic shrink/grow and hot-spare animation with the rendezvous source excerpts; the goodput calculator (exact Daly formula, seeded simulation, measured-run accounting); the OPT-175B per-GPU comparison; mistakes and interview questions.
- Launching distributed training already has the rendezvous-store mechanism; the Slurm, Kubernetes and Ray children cite the drain, out-of-service and Ray restore results, now kept as one-line rows in the root's table.

## storage_lab_cut/ (old sections 1 stand-ins, 2 to 4, 6 to 10)
What Storage and data movement does not yet hold: the six-tier stand-in measurement chart (1.39 MB, 38.6 MB, 304 MB; write and read); the checkpoint anatomy bar and scale table; the burst (five write layouts per rank) and DCP's dedup source excerpt; the async animation and the async_save process-group trap (Fault tolerance at scale cites it); the small-files and prefetch charts; the restore-error gallery; mistakes, interview questions and the method section.
