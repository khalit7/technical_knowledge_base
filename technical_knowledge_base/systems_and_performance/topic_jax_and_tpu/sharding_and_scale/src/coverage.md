# Coverage of the old Notion page "Sharding and scale: GSPMD, Mesh, shard_map"

Source: the root's `src/read/old/sharding.md` (fetched 2026-09-22). Every claim: where the page carries it now, corrected, or dropped.

| Old claim | Status | Where now / correction |
|---|---|---|
| Best resources: scaling book ch. 3 and 5, JAX parallel tutorial, shard_map guide, distributed arrays notebook, MaxText config | kept, re-timed, re-checked 2026-10-15 | Further reading (the distributed arrays notebook now redirects to the parallel guide) |
| "pmap is legacy (since JAX 0.8-0.10 a wrapper over jit + shard_map)" | corrected | maintenance mode since 0.8.0, always jit(shard_map) since 0.10.0 (Reading, Old page) |
| "jax.experimental.shard APIs moved to jax.sharding" | corrected | jax.experimental.shard does not exist in 0.11.2 (ModuleNotFoundError); API is jax.sharding.auto_axes / explicit_axes / get_abstract_mesh, jax.reshard, jax.set_mesh, jax.typeof |
| Sharding is a type annotation, parallelism is compilation; one jitted function, different PartitionSpecs | kept, deepened | Reading: In one screen, Who decides, Propagation |
| `jax.make_mesh((8, 4), ...)`, NamedSharding, device_put example | corrected | make_mesh now gives Explicit axes; the example needs axis_types for Auto behaviour (Reading, Mistakes) |
| Mesh, PartitionSpec, NamedSharding definitions; with_sharding_constraint; visualize_array_sharding | kept | root Sharding lab owns definitions; Debugging table here with real output |
| "Inside jit computation follows data ... annotate inputs and a few constraints" | kept, qualified | Propagation: measured where it goes wrong without constraints |
| Strategy table: DP all-reduce; FSDP all-gather + reduce-scatter; TP all-reduce per block | kept, corrected for CPU | Strategies, measured; FSDP gathers once per step here; CPU shows all-reduce + slice |
| "FSDP2 analogue; no wrapper class; optimiser state inherits sharding; ZeRO-1 falls out for free" | corrected | optimizer state is sharded only if given shardings or left to propagation; ZeRO-1 needs its own annotation (MaxText shard_optimizer_over_data) |
| Mixed strategies as 3-D meshes, P(('data','fsdp'), None, None) | kept, run | HSDP layout with P(('replica','fsdp'), None) measured |
| "Pipeline exists via shard_map stages, last resort on TPU" | kept, sharpened, built | Pipeline tab; MaxText vmap + shard_map design; scaling book quote |
| shard_map out of experimental since 0.8; `from jax.shard_map import shard_map` | corrected | use jax.shard_map; the import path shown was wrong |
| Collectives list psum, pmean, all_gather, psum_scatter, ppermute | kept | Reading (CP, Pipeline, MoE use them); root lab owns the list |
| "pmap only handled one device axis per host cleanly" | dropped | unsourced |
| xmap and pjit dead, pjit merged into jit | kept, precise | xmap deleted 0.4.31; jax.experimental.pjit.pjit deprecated 0.8.0 (still imports in 0.11.2) |
| Explicit sharding mode exists | kept, built out | Reading: Explicit mode on the whole running example |
| Multi-host: N hosts each with (usually) 4 chips | dropped | not checked against a primary source |
| jax.distributed.initialize auto-configured on Cloud TPU; jax.devices global, local_devices; process_index as rank | kept, verified, run | Many hosts section, Many processes tab (2 processes run here) |
| make_array_from_process_local_data; grain splits per host | kept; grain part linked | Many processes tab; grain on the training stack page |
| orbax per-host shards | linked | training stack page |
| Contrast with torchrun; rank-conditional code only around I/O | kept with the JAX docs' deadlock warning | Many processes tab |
| Practical path for the LM port (DP, then FSDP, then TP, read MaxText logical_axis_rules) | kept as the page's spine | Strategies measured at two sizes; Choosing a mesh (logical_axis_rules quoted) |
| Cross-links to Distributed Training, TPU hardware page, TPU child | kept | Further reading and inline |
