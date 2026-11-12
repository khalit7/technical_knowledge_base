# Sharding and scale: how this page is built

Child page of Topic: jax-and-tpu (prefix `ss`, storage key `jx-ss-tab`). One level deeper than the root's Sharding lab: propagation
algorithms (GSPMD and Shardy, measured against each other), Explicit mode on the running example, every strategy at two model sizes,
context, pipeline and expert parallelism written with `shard_map`, cost formulas checked against compiled byte counts, a mesh designer
for TPU slices, and a real two-process run.

## Running the evidence (CPU only, shared venv; see the root's `src/data/README.md`)

```sh
export JX_SCRATCH=<the shared jax-and-tpu setup folder>
cd src/runs
X="XLA_FLAGS=--xla_force_host_platform_device_count=8 JAX_PLATFORMS=cpu OMP_NUM_THREADS=4"
env XLA_FLAGS="--xla_force_host_platform_device_count=8 --xla_dump_to=$JX_SCRATCH/ss/prop_dump --xla_dump_hlo_pass_re=shardy-xla|sharding-propagation" \
    JAX_PLATFORMS=cpu nice -n 15 $JX_SCRATCH/venv/bin/python -I -B ss_prop.py      # out/prop.json (about 1 min)
env $X nice -n 15 $JX_SCRATCH/venv/bin/python -I -B ss_explicit.py                 # out/explicit.json
env $X nice -n 15 $JX_SCRATCH/venv/bin/python -I -B ss_scale.py                    # out/scale.json (5 to 10 min)
python3 -I -B ss_formulas.py                                                       # out/formula_check.json
env $X nice -n 15 $JX_SCRATCH/venv/bin/python -I -B ss_cp.py                       # out/cp.json
env $X nice -n 15 $JX_SCRATCH/venv/bin/python -I -B ss_pipe.py                     # out/pipe.json
env $X nice -n 15 $JX_SCRATCH/venv/bin/python -I -B ss_moe.py                      # out/moe.json
$JX_SCRATCH/venv/bin/python -I -B ss_multi.py                                      # out/multi.json (starts 2 processes x 4 devices)
env $X nice -n 15 $JX_SCRATCH/venv/bin/python -I -B ss_debug.py                    # out/debug.json
python3 -I -B ss_mesh.py                                                           # out/mesh_ref.json (Mesh designer reference)
JX_SCRATCH=$JX_SCRATCH python3 -I -B ss_source.py                                  # out/source.json (file:line by pattern)
python3 -I -B ss_data.py                                                           # parts/22_js_ss_data.js
cd .. && sh build.sh
python3 -I -B check_data.py         # embedded data == out/*.json, prose numbers == data, privacy
node check_mesh.mjs                 # Mesh designer JS == ss_mesh.py
node check_page.mjs ../index.html <screenshot dir>   # every control, 390 dark and 920 light
node check_stages.mjs [shots dir]   # 3D stages and animations: autoplay on view, steps, step lists, reduced motion, split at 1400 px
```

| file | what |
|---|---|
| `runs/ss_common.py` | paths; imports the root lab's `sh_common.py` (collective parser, ring cost, scrub) and the running example |
| `runs/ss_hlo.py` | HLO reader: instructions with sharding and source line (resolves the `StackFrames` table of newer dumps), both sharding notations converted to `P(...)` |
| `runs/ss_prop.py` | one block fwd+bwd, 5 annotation cases, Shardy vs GSPMD, shardings after propagation; whole-step collectives by source line for 3 root-lab layouts |
| `runs/ss_explicit.py` | the running example's loss+grad on an Explicit mesh: DP, FSDP, TP; naive, intermediate and fixed versions with their real errors |
| `runs/ss_scale.py`, `runs/ss_formulas.py` | 7 layouts at 0.83M and 25.4M parameters (collectives, memory, losses); textbook byte predictions against them |
| `runs/ss_cp.py` | context parallelism: propagation, all-gather and ring attention, checked against one device; 8,192-token memory |
| `runs/ss_pipe.py` | GPipe and circular pipelines with `shard_map` + `ppermute`, gradients through the loop, the contiguous-microbatch mistake |
| `runs/ss_moe.py` | 8-expert MoE layer, expert parallel with `all_to_all` and with GShard-style propagation, top-1/2 and three capacity factors |
| `runs/ss_multi.py` | 2 processes x 4 devices with `jax.distributed` (gloo), per-host loading, 20 DP steps; the mismatched-weights error |
| `runs/ss_debug.py` | visualize/inspect_array_sharding, typeof, the "Involuntary full rematerialization" warning |
| `runs/ss_mesh.py` | reference arithmetic of the Mesh designer |
| `runs/ss_source.py` | every quoted file:line, located by pattern in the pinned clones |
| `out/*.json` | small recorded results (all embedded through `ss_data.py`; `prop.json` is trimmed to the page's needs there) |

Large outputs stay in `$JX_SCRATCH/ss/` (HLO dumps after propagation, multi-process logs, the GSPMD paper PDF and its text).

## Departures from the child-page method
- No `src/live.md`: the old Notion text was already saved verbatim by the root's Reading agent (`../../src/read/old/sharding.md`); corrections are in `coverage.md`.
- Pipeline, MoE, propagation and multi-process were tabs until 2026-10-23; each explains one mechanism, so they are now Reading sections 8, 9, 3 and 12, with their tables and code in closed blocks.
- The Mesh designer overlaps in purpose with Distributed Training's Layout calculator (GPU clusters); this one is TPU slices, JAX mesh axes and the torus placement rule, with its byte formulas checked against compiled programs.

## The 2026-10-23 rebuild to the teaching contract (editing only, no new runs)
Parts now: `10_header` (tabs Reading, Mesh designer, Further reading), `20_read_a` (styles, nav, core sentence, hero, you need, new terms, strategies in one screen) to `20_read_i` (closed depth: three design questions, old-page corrections), `26_js_ss_read0.js` (new: hero mesh, PartitionSpec widget, shard_map diagram), `31`/`33`/`34`/`35_js_*` (the old tab visuals, now drawn in Reading), `32_*` (Mesh designer), `39_tab_more.html`. `21_js_rd_common.js` and `99_js_tabs.js` are the skill templates (storage key `jx-ss-tab`); `SSU.anim` in `23_js_ss_util.js` no longer starts on first view, so nothing moves before the reader presses play or steps (checked with normal motion: all five steppers stay on step 0).

What changed and why:
- **Top**: one core sentence (you lay out a few arrays; someone lays out the rest; communication is what the layouts force) and a new static hero: the annotation code, the 2 x 4 mesh with each device's block of fc1 (the measured (64, 128) shards), and the three deciders (Auto, Explicit, Manual) feeding the partitioner's collectives. "You need" and ten new terms. The old "three ideas" box and reading-time line were folded into the hero and header.
- **This page now owns Mesh and PartitionSpec** (OWNERS row for JAX sharding): new section 1 with a one-variable widget (six specs on the same weight; per-device shape, copies, bytes; derived, with `P('data', 'model')` matching the measured shard shape) and the jit / `with_sharding_constraint` entry points. New section 5 on `shard_map` itself: a static diagram (split by in_specs, per-device body, psum, out_specs) and the table of collectives as JAX calls with their HLO ops and file:line, linking Interconnects for algorithms on the wire.
- **Tabs that explained one mechanism moved inline**: the propagation stepper and per-line bars (section 3; the 94-group table is a closed block), the pipeline tick stepper (8), the MoE dispatch stepper (9), the two-process stepper (12, now stacked at phone width). The Mesh designer stays a tab (a calculator used across the page); its copy of the formula check table was removed (section 10 owns it).
- **Into closed blocks**: GSPMD and Shardy rules in their authors' words (the core now has a side-by-side table), notation and dump method, Megatron sequence parallelism, the alpha-beta model and cost calculator (Interconnects owns collective algorithms), pipeline and MoE tables and code, the multi-process code and per-process table, single controller, launching, FSDP2's counterpart.
- **Links to owners**: Distributed Training sections 3 to 8 for the forms (4 from strategies, 8 from context parallelism), Interconnects for collective algorithms and ICI, TPU programming and performance for the physical torus.
- **Deleted as fat**: the Mistakes section (every entry is now shown where it happens: the ladder, sections 2, 6, 8, 12; ledger units 326 to 335 record where), five interview answers that restated sections, signposts to removed tabs.
- **Fixed**: SVG labels under 11 px in the moved visuals (raised to 10.5 to 11); the two-process diagram's titles clipped at 390 px.
- **No images**: this page is about software layout; the hardware photos belong to TPU programming and performance and TPUs and other accelerators.

## Length judgement
| | Before (audit 2026-10-23) | After |
|---|---|---|
| Reading, core (230 words a minute, `html_utils/audit_pages.mjs`) | 30.3 min | 37.9 min |
| Reading, closed details | 5.9 min | 27.9 min |
| Other tabs, core | prop 15.5 + mesh 3.7 + pipe 5.8 + moe 4.1 + multi 3.2 + more 3.2 = 35.5 min | mesh 3.0 + more 2.8 = 5.8 min |
| Core total | 65.8 min | 43.7 min |
| Visuals drawn in Reading | 3 | 10 |

Why 38 minutes is right: the page now carries, inline, everything that used to sit in five tabs, plus two sections it newly owns (Mesh and PartitionSpec, shard_map); the core total fell by 22 minutes. About 1,100 of the core words are inside visuals (the propagation stepper's 94 operation cards, step captions, counters, the strategies table), not prose. Every core ledger unit is needed to predict or control the collectives a layout produces; derivations, full tables, code and quotes are closed.

## Knowledge ledger (`ledger.json`, `python3 html_utils/ledger.py check`: problems 0)
343 units: core 242, depth 78, fat 23 (no owned or volatile units). 325 drafted by `ledger.py init` from the old page; 18 added by hand (the ten removed mistakes and eight script-rendered tables and visuals), each with a key in static text. Fat units carry a `note`; units labelled or keyed by hand carry `manual`.

2026-10-26 (final follow-up sweep): the v5p 4x4x4 create_device_mesh placement in section 11 now cites its owner, TPU programming and performance section 7 and its Slice planner, instead of the root's TPU and Pallas lab.

## The 2026-11 rollout: split layout, four 3D stages, explained and autoplaying animations (2026-11-12)

Briefs `rebuild-page.md` and `layout-rollout.md`. Templates copied unchanged: `02_split.html` (in `build.sh` after `01_head.html`), `25_js_s3.js` (renderer v2), `21_js_rd_common.js`, `99_js_tabs.js` (key `jx-ss-tab`), `05z_errbox.js.html`. `build.sh` now writes the em-dash it looks for as bytes. No new runs: every scene draws from `SS` (`out/*.json` via `runs/ss_data.py`, unchanged).

| Tab | Section | Layout | Visual | Step list |
|---|---|---|---|---|
| Reading | The idea | split | **3D** `stg-hero` Fig. 1: 2 x 4 mesh, w `P('data', 'model')` and x `P('data', None)` as glass plates cut into the blocks each device holds, the all-gather over `data`, the per-device y | yes, 5 |
| Reading | Measured note, new terms, strategies in one screen | full width | table | no |
| Reading | 1 Mesh, specs | split | PartitionSpec widget (2D, six specs) | no (widget) |
| Reading | 2 Who decides | full width | table, `typeof` output | no |
| Reading | 3 Propagation | split | **3D** `stg-prop` Fig. 3: Megatron's MLP, shardings and the all-reduce from the recorded dump (`prop.json`, case `tp`, Shardy) | yes, 5 |
| Reading | 3 rules, closed blocks | full width | table | no |
| Reading | 3 measured differences | split | per-line bars, Shardy against GSPMD (2D) | no |
| Reading | 3 replay the whole block | split | 94-operation replay, a widget (`auto:false`, opens on its last frame) | no (widget, more than 12 frames) |
| Reading | 4 Explicit | full width | the error ladder (code and tables) | no |
| Reading | 5 shard_map | split | **3D** `stg-smap` Fig. 5: split by in_specs, one device from inside, psum, out_specs | yes, 5 |
| Reading | 5 collectives table | full width | table | no |
| Reading | 6 Strategies | split | bytes or memory bars (2D) | no |
| Reading | 7 Context | split | ring against all-gather grid (`RD.anim`) | yes, 9 (ring) and 3 (all-gather) |
| Reading | 8 Pipeline | split | tick-by-tick schedule (`RD.anim`) | yes, one item per tick, written from the chosen run (6 to 12) |
| Reading | 9 Experts | split | routing matrix, dispatch and combine (`RD.anim`) | yes, 5, written from the chosen run |
| Reading | 10 Costs, 11 Choosing, 13 Debugging, Depth | full width | tables | no |
| Reading | 12 Many hosts | split | **3D** `stg-multi` Fig. 12: two hosts x 4 devices against one process, from `multi.json` | yes, 6 and 6 |
| Mesh designer | | split | notes and formulas left, controls and bars right | no (calculator) |
| Further reading | | unchanged | | |

What changed and why:
- **The hero became Fig. 1**, a 3D stage: a mesh of devices is spatial, and seeing each block of w and x travel to the device that holds it, then the pairs along `data` swap blocks, is the page's core sentence in one picture. The annotation code and the three deciders stay in the left column under the step list. The all-gather in step 4 is not a separate run: it is what the measured FSDP x tensor step of section 6 compiled (28 of 29 forward all-gathers in groups of 2), and the list says so.
- **Fig. 3 is new**: section 3 had the 94-operation replay but no picture of the mechanism. The stage follows Shardy through the MLP of the recorded `tp` case: x and the two Megatron weights annotated, fc1's matmul rule giving h `P(data, -, model)`, GELU passing it through, fc2's partial sums, and the all-reduce the partitioner inserts (2 forward, 2,097,152 bytes, the only forward collectives of the block). The 94-operation replay stays, as a widget the reader drives (long-replay rule, case b): it opens on its last frame and never plays by itself.
- **Fig. 5 replaced the static shard_map diagram**, **Fig. 12 the 2D two-process stepper** (its six captions, and the one-process mode's six, are now the two step lists; the mode buttons swap the list and replay).
- **Every 2D animation is `RD.anim` with a step list** (context parallelism, pipeline, MoE); `SSU.anim` is now a thin wrapper over it. The per-step captions (`ss-cp-cap`, `pi-cap`, `mo-cap`) were removed: their text is in the lists. The pipeline and MoE lists are written by script from the chosen run's recorded schedule or routing, because their numbers change with the run.
- **Mesh designer**: notes, presets and formulas on the left, the calculator on the right.
- **Kept 2D** (see `viz_ideas.md`): PartitionSpec widget, all bar charts, the context-parallel grid, the pipeline Gantt, the MoE matrix, the replay widget.
- **No real images**: the page is about software layout; TPU hardware photos belong to the hardware topic's pages.
- **Checks**: `check_data.py` gained claims for every number in the new step lists; `check_stages.mjs` (new, adapted from JAX LLM codebases) checks autoplay, step counts, list lengths, reduced motion, flows stopping off screen and the split at 1400 px. The old `check_page.mjs` still clicks every control.

### Length judgement (2026-11-12)
| | Before (audit 2026-11-12, before this pass) | After |
|---|---|---|
| Reading, core (230 words a minute, `html_utils/audit_pages.mjs`) | 38.1 min (8,769 words) | 45.7 min (10,504 words) |
| Reading, closed details | 26.1 min | 26.1 min |
| Other tabs | Mesh designer 3.0, Further reading 2.9 | unchanged |
| Visuals in Reading (audit count: svg, canvas, img) | 9 | 10 (four 3D canvases replace the static hero mesh, the shard_map diagram and the two-process stepper, and add Fig. 3) |

The rise is mostly measurement, not new prose: the step explanations of the context-parallel, pipeline and MoE animations used to be one script-written caption at a time (the audit counted only the one on screen), and are now step lists counted in full, including the lists of modes not shown (all-gather context parallelism, the one-process run). New words beyond those: the step lists of Fig. 1, 3 and 5 (Fig. 3 is a mechanism the page described only in a table before) and the paragraph introducing the replay widget. Nothing was cut that the ledger holds; the hero's old captions became Fig. 1's list.

### Knowledge ledger
343 units: core 242, depth 72, fat 23, owned 6 (Interconnects and scaling); `ledger.py check` problems 0, and the root's ledger (two units owned here: "for each dimension of an array, which mesh", "visualize_array_sharding") problems 0. Keys updated for reworded units 227, 231, 232 (the replay widget's paragraph) and 296 (the multi-host mode buttons).
