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
- Pipeline and MoE are tabs rather than Reading sections because the strategies' theory lives on Distributed Training; here the tabs show the JAX implementations, which need room.
- The Mesh designer overlaps in purpose with Distributed Training's Layout calculator (GPU clusters); this one is TPU slices, JAX mesh axes and the torus placement rule, with its byte formulas checked against compiled programs.
