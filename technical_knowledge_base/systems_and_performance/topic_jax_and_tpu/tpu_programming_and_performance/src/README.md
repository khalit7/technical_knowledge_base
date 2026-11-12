# TPU programming and performance: how this page is built

Child page of Topic: jax-and-tpu (prefix `tq`, storage key `tq-tab`). One level deeper than the root's TPU and Pallas lab
(`../../src/tpu/`, whose `out/specs.json` and `out/roofline.json` this page reuses): published specs extended with low-precision
peaks, DCN, hosts, largest slices and prices; rooflines for a 7B layer and for decode with a KV cache; XLA's TPU tiling;
matmul precision emulated pass by pass; rematerialisation policies measured; every Cloud slice shape run through JAX's own
mesh placement; MaxText's published MFU table recomputed with its own FLOP counter; cost per token.

Templates copied unchanged on 2026-11-12: `02_split.html`, `05z_errbox.js.html`, `21_js_rd_common.js`, `25_js_s3.js` (renderer v2), `99_js_tabs.js` (storage key `tq-tab`). `check_stages.mjs` is the rollout check (below).

## Running the evidence (CPU only, shared venv; see the root's `src/data/README.md`)

```sh
export JX_SCRATCH=<the shared jax-and-tpu setup folder>
cd src
python3 -I -B runs/tq_specs.py                                                          # out/gens.json (asserts every number against inputs/)
JAX_PLATFORMS=cpu nice -n 15 $JX_SCRATCH/venv/bin/python -I -B runs/tq_precision.py     # out/precision.json (about 1 min)
JAX_PLATFORMS=cpu OMP_NUM_THREADS=4 nice -n 15 $JX_SCRATCH/venv/bin/python -I -B runs/tq_remat.py   # out/remat.json (compile only, about 10 s)
JAX_PLATFORMS=cpu nice -n 15 $JX_SCRATCH/venv/bin/python -I -B runs/tq_slices.py        # out/slices.json (mock devices, under a second)
JAX_PLATFORMS=cpu nice -n 15 $JX_SCRATCH/venv/bin/python -I -B runs/tq_errors.py        # out/errors.json (real error messages)
python3 -I -B runs/tq_mfu.py                                                            # out/mfu.json (reads MaxText configs in the pinned clone)
python3 -I -B runs/tq_source.py                                                         # out/source.json (file:line located by pattern)
$JX_SCRATCH/venv/bin/python -I -B runs/tq_recompute.py                                  # out/recompute.json (needs ml_dtypes)
python3 -I -B build_data.py                                                             # parts/22_js_tq_data.js
sh build.sh
python3 check_data.py                       # embedded data == out/*.json, 25 prose numbers == data, file:line refs, privacy
NPM_CONFIG_USERCONFIG=<empty file> node check_page.mjs ../index.html <screenshot dir>   # every control, 390 dark and 920 light; JS formulas == recompute.json
```

## Inputs (`inputs/`, all fetched 2026-10-15)
- `cloud_tpu_pages_extract.txt`: the v4, v5e, v5p, v6e and TPU7x Cloud pages (tables flattened), last updated 2026-10-13.
- `cloud_tpu_pricing_extract.txt`: the first rows of cloud.google.com/tpu/pricing (per chip-hour).
- `scaling_book_extracts.txt`: lines of the scaling book's tpus, roofline, inference, profiling and applied-training chapters.
- `maxtext_mfu_extract.txt`: MaxText's tiering table and performance-metrics notes at 1a95d1e5.
- `lambda_pricing_extract.txt`: Lambda's on-demand GPU prices (H100, B200).

## Departures from the child-page method
None of substance. The four labs the brief named are the four tabs. Shapes of the chip itself, Pallas and collective
bytes stay on their owners' pages (Hardware topic's TPU page, Pallas kernels, Sharding and scale) and are linked.

## The 2026-10-23 rebuild to the teaching contract
Editing only, no new runs. This page owns TPUs as a programming target (the TensorCore with MXU, VPU and scalar unit; HBM and VMEM; ICI, slices and the mesh from the program's view; what makes TPU code fast; profiling; the generations as targets).
- **Top**: the core idea in one sentence; a new hero figure (`25_js_rd_hero.js`), a static annotated diagram of one chip as the program meets it (host and PCIe, TensorCore with scalar unit and SMEM, VPU with an 8 x 128 register, MXUs, VMEM, HBM, ICI, DCN) with a generation switch and peak, bandwidth, ridge and VMEM counters, all from `window.TQ`; "You need"; new terms. The old "In one screen" table is a closed summary block.
- **Real images** (`img/`, credited in `img/CREDITS.md`): the TPU v4 package with four HBM stacks and the 4-chip board (section 1), eight of 64 racks of a 4,096-chip v4 pod (section 7); all CC BY 4.0 figures of Jouppi et al., ISCA 2023 (arXiv:2304.01433).
- **Tabs that explained one mechanism moved inline**: the Tiles and padding tab's tiling stepper and MXU padding card are now section 4 (`26_js_rd_tile.js`); the MFU calculator tab's your-run calculator is section 9, its published-runs table and FLOP breakdown a closed block (`27_js_rd_mfu.js`). The Roofline lab and Slice planner stay as tabs: each is a tool used across several sections.
- **New visual**: section 7's chip, host, slice, multislice diagram on v5p with bandwidth per chip at each level.
- **Concrete, then picture, then formula** in section 3 (the 7B matmul at batch 1 and 4,096, the walk, then the rule and table). Section 10 (cost) folded into section 9.
- **Closed depth**: the parts table with GPU equivalents, source disagreements, the ICI width threshold, int8 and fp8 peaks and the TF32 error, MaxText's named remat policies, slice names and twisted tori, the published-runs and cost tables, the TPU7x device-count error, free access, two design questions, what changed from the old page.
- **Deleted as fat** (31 ledger units, each with a note): wind-ups and headings, pointers to removed tabs, mistakes and interview answers that restated a section (the float32-activations and CPU-precision mistakes were folded into sections 6 and 5).
- `21_js_rd_common.js` and `99_js_tabs.js` are the skill templates (storage key `tq-tab`): no animation moves before the reader acts (checked with normal motion: every scrubber stays at 0 after scrolling each card into view).

## Length judgement
| | Before (2026-10-15 build) | After (2026-10-23) |
|---|---|---|
| Reading, core (230 words a minute, `html_utils/audit_pages.mjs`) | 33.0 min | 26.8 min |
| Reading, closed details | 6.2 min | 12.8 min |
| Other tabs, core | Roofline 2.3 + Tiles 1.9 + Slice 2.5 + MFU 1.9 = 8.6 min (plus Further reading 3.3) | Roofline 2.3 + Slice 2.5 = 4.8 min (plus Further reading 3.0) |
| Core total, excluding Further reading | 41.6 min | 31.6 min |
| Visuals drawn in Reading | 4 | 13 (3 photos) |

Why about 27 minutes is right: the Reading tab now carries nine core mechanisms (the chip, the generations, rooflines with decode, tiling and MXU padding, matmul precision, memory and remat, slices and the mesh, profiling, MFU counting) plus the two moved tab visuals, each with its numbers and picture; roughly a quarter of the core words are table cells, step captions and counters of the visuals. Everything that is reference (per-item tables, provenance, access, rehearsal) is closed.

## Knowledge ledger (`ledger.json`, `python3 html_utils/ledger.py check`: problems 0)
299 units: core 217, depth 51, fat 31. 286 were drafted from the old page by `ledger.py init`; 13 were added by hand for script-rendered tables and the new or moved visuals.

## The 2026-11 rollout: split layout, three 3D stages, explained and autoplaying animations (2026-11-12)
Briefs `rebuild-page.md` and `layout-rollout.md`. `build.sh` includes `02_split.html` after `01_head.html` and writes the em-dash it looks for as bytes. No new runs: every scene draws from `window.TQ` (gens.json and recompute.json via `build_data.py`, unchanged) through the page's own formulas in `23_js_tq_util.js`.

| Tab | Section | Layout | Visual | Step list |
|---|---|---|---|---|
| Reading | The idea | split | **3D** `stg-chip` Fig. 1, one chip per generation | yes, 6 |
| Reading | You need, new terms, what is real, seven decisions | full width | none, table (closed) | no |
| Reading | 1 The chip | split | 2 photos (v4 package, v4 board) | no |
| Reading | 2 Generations | full width | sortable table, predict | no |
| Reading | 3 Rooflines | split | 2D roofline walk (`RD.anim`, 8 steps) | yes, 8 |
| Reading | 3 Critical batch, attention, decode bound | full width | table, formula | no |
| Reading | 4 Tiles in memory | split | 2D tiling stepper (`RD.anim`, 6 steps, typed shapes) | yes, 6 |
| Reading | 4 The rule in the MXU | split | **3D** `stg-mxu` Fig. 2, a weight on the MXU | yes, 6 |
| Reading | 4 Try your own shape, tables | full width | widget (m, k, n), tables (closed) | no |
| Reading | 5 Precision | split | 2D bf16 passes (`RD.anim`, 7 steps, typed numbers) | yes, 7 |
| Reading | 5 Measured, cost, int8 | full width | table | no |
| Reading | 6 State per chip | full width | table | no |
| Reading | 6 Remat and offload | split | 2D scatter plus table | no |
| Reading | 7 Slices and the mesh | split | 2D level diagram, photo (v4 racks) | no |
| Reading | 7 Largest slice, names, twists | full width | none | no |
| Reading | 8 Profiling | split | **3D** `stg-prof` Fig. 3, a predicted profile | yes, 5 |
| Reading | 8 Views table | full width | table | no |
| Reading | 9 MFU | split | 2D bars (published against recomputed) | no |
| Reading | 9 Your run, cost, tables | full width | calculator, tables (closed) | no |
| Reading | Depth | full width | none | no |
| Roofline lab | | split | notes left; generation, workload, roofline, tables right | no |
| Slice planner | | split | notes and placement notes left; planner right | no |
| Further reading | | unchanged | | |

**Stages and their data.**
- Fig. 1 (`40_js_sc_chip.js`, replaces the static 2D hero in `25_js_rd_hero.js`, whose section 7 level diagram now lives in `28_js_rd_levels.js`): HBM as a gold glass floor, VMEM as a teal plate, the TensorCore's scalar unit with SMEM, the VPU with one 8 x 128 register drawn as 8 x 16, and the MXUs (4 of side 128 or 2 of side 256, gridded one cell per 32 x 32) from the chosen generation's row of `TQ.gens`; flows for HBM to VMEM, VMEM to the MXUs (weights and activations), VMEM to the VPU, the scalar unit's instructions, then host over PCIe, ICI and DCN. The generation chips refill the numbers in the step list (`data-tqg` spans) and the counters. Schematic, not to scale.
- Fig. 2 (`41_js_sc_mxu.js`): one MXU as a glass plate per side (one world unit per 32 cells), the weight as a blue slab, padding as grey; shapes and utilisations are `TQ.rc.mxu` (recompute.json; `U.mxuUtil` gives the same): output head 50.8% and 12.7%, q projection 25% on 256, head 32 25% and 6.25%, head 128 100% and 50%, Llama 2 7B MLP up 100%.
- Fig. 3 (`42_js_sc_prof.js`): the Roofline lab's 7B layer (same formulas as `layerOps` in `31_js_tq_roof.js`) on v5e as a predicted profile, labelled calculated: blocks end to end with width = max(FLOPs / peak, bytes / bandwidth); back lane MXU share of peak, front lane HBM share of bandwidth, flows from HBM to the MXUs denser where HBM is the limit. 11.2 ms at 4,096 tokens with the scores in HBM, 9.81 ms fused, 0.50 ms at 32 tokens per chip (the axis redrawn). `check_stages.mjs` compares these totals and Fig. 2's utilisation.
- Scenes export `window.TQ_SC` (what each draws, for checks) and `window.TQSTG` (the stage handles); `window.TQPH` gives every view a steeper camera on phones.

**Motion.** The three stages and the three 2D animations play once at least half in view, pause off screen, stop for good on a reader control or the last step, never move under reduced motion. The 2D animations' per-step captions (`tq-walk-cap`, `tq-t-cap`, `tq-split-cap`, script-drawn) became the step lists `sx-walk`, `sx-tile`, `sx-split`; the counters stay. Changing the tiling preset or shape redraws the current step instead of restarting.

**Kept 2D, and why.** The roofline walk and the Roofline lab are log-log axes; the remat menu is a scatter of bytes against FLOPs; the MFU comparison is bars; the generation, critical-batch, state, precision and cost tables are tables; the bf16 passes are a 3 x 3 grid of numbers the reader types; the tiling stepper is a memory layout read flat, with shapes the reader types; the level diagram is four boxes in a row. Not built: a torus or a systolic array (the Hardware topic's TPUs and other accelerators page owns both, as 3D stages), the HBM, VMEM and core pipeline of one kernel (Pallas kernels' Fig. 1), a roofline in 3D (the flat one says it all).

**Checks.** `check_stages.mjs` (new, adapted from Pallas kernels): at 1400 light, 920 light and 390 dark every stage and animation plays when scrolled into view, steps to its last step with one list item per step, no redraws off screen, every split is two columns at 1400 (both lab tabs too); Fig. 1 on v6e draws 2 MXUs of 256 and a ridge of 560.4; the scenes' numbers above; under reduced motion nothing moves; no errors, `undefined`, `Infinity` or sideways scroll. `check_data.py` and `check_page.mjs` unchanged and passing.

**Length.** Reading core 6,174 words (26.8 min) before, 7,601 (33.0 min) after; closed 2,939 (12.8) unchanged; Roofline lab 2.3 to 2.5 (one sentence pointing to section 8), Slice planner 2.5 and Further reading 3.2 unchanged. The growth is the six step lists: about 700 words are the three animations' captions, which were drawn by script one at a time and are now read as lists, and about 750 words explain the three new figures (one of them, the profile, gives section 8 its first visual). Visuals inline (audit count): 13 before, 15 after.

**Ledger** (`python3 html_utils/ledger.py check`: problems 0): 303 units, core 221, depth 51, fat 31. Added 300 to 303 for Fig. 2, Fig. 3 and the two lists that were script-drawn captions; unit 287 (the hero) rewritten for Fig. 1. The root's ledger still checks with problems 0.
