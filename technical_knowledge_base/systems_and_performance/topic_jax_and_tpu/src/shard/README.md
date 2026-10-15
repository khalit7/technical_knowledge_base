# Sharding lab (tab `t-shard`, parts `34_*`, prefix `sh`)

Built 2026-10-15. Everything ran on Apple M1 Pro (CPU only), jax 0.11.2, with 8 simulated devices
(`XLA_FLAGS=--xla_force_host_platform_device_count=8`), low priority. HLO, collectives, shapes,
`memory_analysis()` and losses are deterministic; timings are not representative of any accelerator.

## Scripts (run from this folder with the shared venv; `JX_SCRATCH` set)

```sh
X="XLA_FLAGS=--xla_force_host_platform_device_count=8 JAX_PLATFORMS=cpu OMP_NUM_THREADS=4"
env $X nice -n 15 $JX_SCRATCH/venv/bin/python -I -B sh_strategies.py   # about 4 min; SH_STEPS=3 for a quick run
env $X nice -n 15 $JX_SCRATCH/venv/bin/python -I -B sh_playground.py   # 108 compilations, about 1 min
env $X nice -n 15 $JX_SCRATCH/venv/bin/python -I -B sh_collectives.py
env $X nice -n 15 $JX_SCRATCH/venv/bin/python -I -B sh_explicit.py
python3 sh_data.py          # builds ../parts/34_js_sh_0data.js and out/rd_collectives.json
sh ../build.sh
python3 -I -B check_tab.py  # page embeds the data; prose numbers match; privacy
node check_tab.mjs ../../index.html <screenshot folder>   # every control, 390 dark and 920 light
```

| file | what |
|---|---|
| `sh_common.py` | HLO collective parser (kind, bytes, replica-group size incl. Shardy's `mesh[...] {axes}` form, phase from op_name), ring-cost rule, path scrubbing |
| `sh_strategies.py` | the running example's full train step under 7 layouts (one device, DP, FSDP weights-only, FSDP with activation constraints, DP x TP, FSDP x TP, sequence-sharded); collectives, memory, 20-step losses; same layouts recompiled with GSPMD |
| `sh_playground.py` | y = x @ W (embedded batch 0 times blocks.0.mlp.fc1.w), 6 x 6 specs x 3 output modes on a 2 x 4 Auto mesh |
| `sh_collectives.py` | shard_map collectives, a hand-written ring all-reduce with ppermute, in_specs mismatch on Auto vs Explicit meshes, all_gather out_specs check, pmap |
| `sh_explicit.py` | make_mesh vs Mesh default axis types, jax.typeof, x @ W under Explicit axes, reshard, visualize_array_sharding |
| `out/strategies.json` | full per-collective records (200 KB; not embedded; the page embeds the grouped form) |
| `out/rd_collectives.json` | compact per-strategy table for the Reading tab (TODO rd-todo-coll) |
| `out/playground.json`, `out/collectives.json`, `out/explicit.json` | the other runs |

The full optimised HLO of each layout (1 to 2 MB each, paths scrubbed) stays outside the repo in `$JX_SCRATCH/shard/`.
XLA pipeline files read: `xla/service/cpu/cpu_compiler.cc` (sha256 427ef515...) and `xla/service/gpu/gpu_compiler.cc`
(sha256 06ed1295...) at openxla/xla 91888df6ce85102c30220e41d952065925e10886, fetched 2026-10-15 under the download lock into
`$JX_SCRATCH/src/xla_files/`.

## Departures and caveats
- The CPU pipeline has no `ReduceScatterCreator` or `AllReduceReassociate` (GPU has both, `gpu_compiler.cc:1334, 1099`), so FSDP
  reduces gradients with all-reduce + slice and TP all-reduces q/k/v input gradients separately. The tab says so and derives what
  reduce-scatter would send.
- "Sent per device" is a ring-cost model applied to the HLO shapes (derived), not a measurement.
- FSDP rule: split each parameter's first dimension divisible by the axis size (tok_emb's 65 rows are not, so its columns are split).
