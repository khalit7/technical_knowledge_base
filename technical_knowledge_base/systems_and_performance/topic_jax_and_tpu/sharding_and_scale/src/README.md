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
