# Visual ideas: Cluster anatomy

Central question: where does a training job's traffic sit on the cluster's staircase of levels (memory, NVLink, NIC, pod, cluster), and what limits each level (ports, watts, bytes)?

Existing visuals elsewhere, not rebuilt: the Collective simulator and Fabric explorer (link loads under rails, ToR, rail-only, oversubscription) on Interconnects and scaling; the Checkpoint simulator and Gigawatt planner on Power, cooling and reliability; the root's Scheduling lab (topology-aware placement on the toy clusters) and Storage lab (tiers measured).

## Built
| # | Visual | Placement | Score (quantity / reproduces / computable / beyond prose) | Notes |
|---|---|---|---|---|
| 1 | Levels ladder of Llama 3's cluster (log bandwidth per GPU at each distance) | Reading s0 | 1/2/2/2 | the one-screen summary; rows link to sections |
| 2 | DGX H100 schematic, clickable parts | Reading s1 | 0/1/2/2 | parts from the user guide; wiring labelled schematic |
| 3 | One job's life: a stepper over login node, controller, registry, two nodes, leaf and storage on the four networks (replaced the "which network" chips, 2026-10-24) | Reading s3 | 0/1/2/2 | nine steps cover the nine traffic kinds the chips had |
| 4 | Packed against spread: the same 16-rank ring on a small Llama-3-shaped cluster, 5 steps, counters (edges per level, switch traversals, bandwidth-term time) | Reading s4 | 2/1/2/2 | the before/after animation; 37.5 ms both on idle, 262.5 ms spread on a busy 1:7 top layer |
| 5 | Storage tier table and designs table (sortable, log bars) | Reading s5, s7 | data tables | |
| 6 | Cluster explorer: four designs, drill-down drawing of each level's composition, per-level bandwidth bars, side-by-side table | own tab | 1/2/2/2 | shows when counts do not multiply out (4 SU = 1,016 not 1,024; FF2 2 zones 9,600 vs 10,000) |
| 7 | Message path: two routes animated together hop by hop through GPU, PCIe switch, NIC, leaf, spine, core; slowest hop, latency, 1 GB time; oversubscription control | Reading s4 (moved from its own tab 2026-10-24) | 2/1/2/2 | before/after on the same message (inside a node vs across pods); PXN route |
| 8 | Sizing calculator: GPUs to nodes, leaf/spine/core switches, cables, racks, MW, storage GB/s; presets with residuals | own tab | 2/2/2/2 | reproduces SuperPOD 4-SU (32 leaf, 16 spine, 1,024 leaf-spine cables) and Fire-Flyer 2's 800-port zone (40 leaf, 20 spine) independently; SuperPOD 3-SU spines differ (16 published, 12 computed), shown |

## Rejected
- Rack floor-plan drawing to scale: no public floor plans with dimensions; would be illustrative.
- Measured bandwidth staircase on the toy cluster: no NVLink, PCIe tree or RDMA here; the one hop measured (bridge RTT 79 us) is shown as a contrast only.
- Switch power and optics cost in the calculator: no consistent public source per switch model; left out and said so.
- Rebuilding fat-tree link loads: owned by the Fabric explorer on Interconnects and scaling.
- A failure blast-radius animation per level: belongs to Fault tolerance at scale and the power page.

## What the methodology lacked
A rule for schematic drawings of hardware whose wiring is not published (the DGX H100 guide lists parts, not the PCIe wiring): labelled schematic, plus the command that shows the real wiring.

## Photos (2026-10-24)
HGX B200 board (s1), GB200 NVL72 rack (s2), CERN data hall (s4), DGX-1 plus storage demo rack (s5); sources and licences in `../img/CREDITS.md`. Rejected: the InfiniBand cabling photo (already on Interconnects and scaling, where cabling is taught); DGX Spark photos (a desktop, not a cluster node). No openly licensed DGX H100 photo was found.
