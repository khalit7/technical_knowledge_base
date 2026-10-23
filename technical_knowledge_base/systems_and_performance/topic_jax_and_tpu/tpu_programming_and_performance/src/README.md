# TPU programming and performance: how this page is built

Child page of Topic: jax-and-tpu (prefix `tq`, storage key `tq-tab`). One level deeper than the root's TPU and Pallas lab
(`../../src/tpu/`, whose `out/specs.json` and `out/roofline.json` this page reuses): published specs extended with low-precision
peaks, DCN, hosts, largest slices and prices; rooflines for a 7B layer and for decode with a KV cache; XLA's TPU tiling;
matmul precision emulated pass by pass; rematerialisation policies measured; every Cloud slice shape run through JAX's own
mesh placement; MaxText's published MFU table recomputed with its own FLOP counter; cost per token.

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
