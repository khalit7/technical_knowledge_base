# Tool map: visual ideas

## Built
- **Same jobs, 2023 vs 2026 (before/after animation).** Twelve job slots; each step applies one dated, sourced change (15 changes: HyperPod, Slinky, Run:ai to NVIDIA then KAI, Determined stalls, Airflow 3, W&B to CoreWeave, Trainer v2, DRA GA, Ray to the PyTorch Foundation, MinIO maintenance then archive, SchedMD to NVIDIA, Neptune shut down). Play, step, scrub, 2023/2026 jump; pauses off screen, no autoplay under reduced motion. Chosen because the 2024 to 2026 story of ML infrastructure is turnover of owners and APIs per job, and a fixed slot shows that.
- **Filterable, sortable tool table** (61 tools in 9 layers) with a detail panel: status with evidence, owner and owner changes, latest release, last commit, licence, use/avoid, verdict labelled as judgement, sources.
- **Picker:** 10 jobs x 4 situations (own cluster, company Kubernetes, rented cloud, one machine) giving a stack, a situation note and tools to avoid.
- **Lineage and owners chart:** lifespans coloured by status, documented (solid) and inferred (dashed) hand-overs, diamonds for ownership changes. Narrow layout puts labels above bars.
- **Versions in the labs:** what the topic's labs ran against the latest releases.

## Rejected
- Stars or download counts as a health bar: popularity is not maintenance status.
- A Slurm vs Kubernetes vs Ray feature matrix: the Reading tab and Scheduling lab own that comparison.
- A commit-frequency heatmap: commits mislead (MinIO and Neptune had activity months before ending).
- Market-share charts of schedulers: no independent, dated data found that is not a vendor claim.
