# Topic: ml-infra-and-orchestration, root page source

Root of the topic (storage key `mi-tab`). Built 2026-10-16 by tab agents (`read/`, `sched/`, `launch/`, `fail/`, `io/`, `cost/`, `map/`, each with its own README; the shared clusters and the running example are `data/`). Rebuilt on 2026-10-24 at the topic close, after its nine children were rebuilt to the teaching contract (`.claude/skills/explainer-page/teaching/teaching-contract.md`), with the method of `.claude/skills/explainer-page/orchestration/briefs/rebuild-page.md`. Editing only, no new runs. Examples followed: the hardware and JAX roots.

## Build and check
- `python3 read/make_code.py` (fills the three job specs in `parts/20_read_b.html` from `data/`), then `sh build.sh` writes `../index.html`. Children read `fail/fl_data.json`, `io/out/io_data.json`, `data/` and `sched/runs/`: keep those paths.
- `sh html_utils/checkpage.sh <this page>`: tabs 8, emdash 0, errbox 1, clipped 0, fail=0 (2026-10-24). `python3 html_utils/ledger.py check <this page>`: problems 0.
- Page checks, all clean on 2026-10-24 (node from the repo root): `node src/read/check_read.mjs index.html src/read/out/expected.json` (rewritten: the Reading tab's derived numbers and the MTBF bars against `recompute.py`), `node src/read/check_ui.mjs index.html <shots>`, `node src/sched/scripts/check_ui.mjs`, `check_data.mjs`, `check_sim.mjs`, `node src/launch/check_launch.mjs index.html <shots>`, `python3 src/launch/check_data.py`, `node src/io/check_ui.mjs`, `python3 src/io/check_data.py`, `node src/cost/check_ui.mjs`, `node src/cost/check_data.mjs`, `node src/map/check_tab.mjs index.html <shots>`, `python3 src/map/validate.py`.
- Nothing moves before the reader acts: `parts/21_js_rd_common.js` and `99_js_tabs.js` are the skill templates; the six lab controllers (`31_js_sc_1core`, `32_js_la_1core`, `33_js_fl_1core`, `34_js_io_1core`, `35_js_co_1core`, `36_js_tm_2more`) no longer start playing when scrolled into view.

## Tabs
| Tab | Decision on 2026-10-24, and why |
|---|---|
| Reading `t-read` | Rewritten as a map (below). Section numbers 1 to 9 kept for the same subjects, because children cite them; section 10 is the child cards. |
| Scheduling lab `t-sched` | Kept: one workload through the scheduling ideas on all three systems, which no child can do. Section 7's Ray placement-group card **retired** to one paragraph with the measured result (key "0.68 s") and a link to Ray's Scheduling section, which draws the same placements; the cross-system placement table stays. Its old pointers to the Reading tab's backfill animation and to the Slurm and Kubernetes pages' removed tabs fixed. |
| Launch lab `t-launch` | Kept (Launching distributed training reuses its timings, environment dumps and broken launches). The NCCL variable table (section 6) **retired** to a sentence and a link: Launching section 6 carries the same table. |
| Failure lab `t-fail` | Kept (twelve failures on three systems; Fault tolerance reuses them). Section numbers of Fault tolerance in its words and results tables updated to that page's rebuilt order; removed tab names (Recovery designs, Straggler replay, Checkpoint simulator, Train failure replay) replaced by sections. |
| Storage lab `t-io` | Kept; links to Storage sections 2 and 4 (not the removed Striping lab and Metadata storm) and to Fault tolerance section 4 for asynchronous checkpoints. |
| Cost lab `t-cost` | Kept; the "GPU utilisation 100%" drill (`35_js_co_4util.js`, three cases on 132 SMs) **retired** to one paragraph: Observability and cost sections 1 and 2 own what each counter counts. Links Observability section 10's cost chart. |
| Tool map `t-map` | Kept: the dated atlas a root owns. One note names where each family's mechanisms live (Slinky and SUNK: Slurm section 12, the owner; trackers and HyperPod: ML platforms sections 5, 6 and 10); HyperPod's verdict names ML platforms section 10 (`map/atlas_tools.py`, regenerated). |
| Further reading `t-more` | Child cards with current descriptions and header times; neighbour times set to their headers, dropped where the target has no header. |

Retired parts are in `retired/parts/`: the old Reading parts, `22_js_rd_cluster.js` (network schematic: Cluster anatomy section 3 owns which traffic rides which network), `23_js_rd_bf.js` (simulated FIFO against backfill: Slurm section 6 owns the stepper; the measured run stays here), `24_js_rd_rz.js` (rendezvous animation: Launching section 4), `25_js_rd_ck.js` (illustrative checkpoint timeline and MTBF calculator: Fault tolerance sections 4, 5 and 9 and Power section 6), `35_js_co_4util.js`. Their numbers stay in `read/out/expected.json`.

## What changed in the Reading tab
- **Top**: the core idea in one sentence (a job that moves only when every piece is present, so four duties: machines at once, start and connect, restart together, meter); a static hero, the life of one job in five rows, each with what happens, who does it on Slurm, Kubernetes and Ray, the section, the owning child and the lab; "You need"; 16 new terms in a closed block; the running example; the labels.
- **Kept as the root's own** (definitions and comparisons across children): the cluster's parts with two photos (1); the seven scheduling ideas defined once, with a new static before/after of the measured gang deadlock against Kueue on the same 12 GPUs, and the measured backfill run (2); Slurm, Kubernetes and Ray in one table, the bit-for-bit result, the three job files in a closed block, who runs what in a closed block (3); a new three-system table of who starts the processes, how they find rank 0, submit to first step and what a missing node does, with the stage medians closed (4); the failure rate and the 1/N law as bars, the defences defined, a new three-system table of what a crash and a lost machine did (5); tiers, the two kinds of I/O, checkpoint arithmetic, the measured four-tier bars, a photo, operators' storage closed (6); the three losses with the 36% bar and the three schedulers' measured efficiency (7); platforms (8); choosing, four cross-child mistakes and five interview answers closed (9); child cards (10).
- **Moved to the owners, one sentence and a link left**: control nodes (Cluster anatomy section 3), backfill's mechanism and the time-limit predict (Slurm section 6), Kubernetes scoring and webhook details, rendezvous step by step and hang triage (Launching sections 4 and 8), Meta's 2026 table and the 18-against-50-minutes check (Fault tolerance section 1), the interval calculator (Power section 6), the utilisation predict (Observability sections 1 and 2), mistakes and interview answers owned by one child.
- **Photos** (credits under each and in `../img/CREDITS.md`, copied from Cluster anatomy): the HGX B200 board and a data hall (section 1), a DGX-1 rack with its shared storage box (section 6).

## Length judgement
| Tab | Before (230 words a minute, `html_utils/audit_pages.mjs`) | After |
|---|---|---|
| Reading | 35.4 + 6.4 | 25.5 + 10.4 |
| Scheduling lab | 33.1 + 2.7 | 32.3 + 2.7 |
| Launch lab | 26.3 + 3.0 | 25.5 + 3.0 |
| Failure lab | 9.7 | 9.9 |
| Storage lab | 8.3 | 8.4 |
| Cost lab | 16.1 + 2.1 | 15.3 + 2.1 |
| Tool map | 13.2 + 1.5 | 13.5 + 1.5 |
| Further reading | 5.1 | 5.4 |

Why about 26 minutes: the topic is taught from zero, so the root holds the vocabulary every child assumes (node, rank, allocation, the seven scheduling ideas, launcher, rendezvous, process group, MTBF, checkpoint, drain and cordon, goodput, MFU) and the comparisons only a root can make: three systems in one table, then the same job's launch, failures, checkpoint writes and scheduling efficiency measured on all three (about a third of the core words are those tables, the hero and captions). Each section ends in a link instead of a mechanism; shorter would drop a definition or a cross-system measurement no child carries. Closed time grew because the job files, the stage medians, operators' storage, the dated evidence and the cross-child mistakes moved into blocks instead of being cut. The labs stay long because they are the measurements the children cite.

## Knowledge ledger (`ledger.json`)
1,041 units drafted by `ledger.py init` from the page before the rebuild: core 778, depth 183, owned 50 (Slurm 12, Launching 11, Fault tolerance 10, Observability and cost 10, Ray 3, Cluster anatomy 2, Kubernetes for ML 2), fat 30 (each with a `note`: wind-ups, run-in headings, old child-card times and tab lists, captions and instructions of the retired simulators), volatile 0 (the dated acquisitions and shutdowns stay in the Tool map, the root's atlas). Keys were found by script (the longest phrase of six or more words, or four with a number, on the rebuilt root, then on a child) and the residue labelled by hand (`"manual": true`).

## The topic close (2026-10-24): other pages of the topic
Every child's Further reading quotes the root as "26 min, plus 10" (child ledgers re-keyed). The children's own stale references (removed tab names, sibling section numbers and times, the follow-ups of the close) were fixed in the same pass; each child's `src/README.md` has a dated line.

## 2026-10-26 ownership sweep
Slurm from zero owns Slurm on Kubernetes. The Tool map merges the Slinky and SUNK rows into one row "Slurm on Kubernetes (Slinky, SUNK)" (id slinky; 60 tools now) whose first source links Slurm from zero section 12; the 2023 slot, picker and lineage point at it. validate.py and check_tab.mjs pass.
