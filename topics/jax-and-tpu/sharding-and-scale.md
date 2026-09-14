# Sharding and scale: GSPMD, Mesh, shard_map

⏱ 8 min read · +3h 50m resources

## Best resources

- [How to Scale Your Model, ch. 3 (sharded matmuls) and ch. 5 (transformer parallelism)](https://jax-ml.github.io/scaling-book/sharding/) (~1h 20m):
  the canonical treatment; verified current (2025 book, still the reference in 2026).
- [JAX: Introduction to parallel programming](https://docs.jax.dev/en/latest/sharded-computation.html) (~45 min):
  the official tutorial covering automatic sharding, explicit sharding, and shard_map.
- [shard_map guide](https://docs.jax.dev/en/latest/notebooks/shard_map.html) (~35 min): per-device
  SPMD programming with collectives.
- [Distributed arrays and automatic parallelization](https://docs.jax.dev/en/latest/notebooks/Distributed_arrays_and_automatic_parallelization.html) (~40 min):
  Mesh/NamedSharding mechanics.
- [MaxText sharding config](https://github.com/AI-Hypercomputer/maxtext) (repo, ~30 min for the config and axis rules): grep for
  `logical_axis_rules`; production example of everything below.

*Verified 2026-08-24. `pmap` is legacy (since JAX 0.8-0.10 it is a wrapper over
jit + shard_map); `jax.experimental.shard` APIs moved to `jax.sharding`.*

## The core idea: sharding is a type annotation, parallelism is compilation

In PyTorch you pick a parallelism *implementation* (DDP wrapper, FSDP wrapper, Megatron
layers) and it owns the communication. In JAX you write the *single-program* math once,
annotate how arrays are laid out over a device mesh, and XLA's **GSPMD** partitioner
inserts the all-gathers/reduce-scatters/all-reduces for you. DP, FSDP, and TP are not
different codepaths; they are different `PartitionSpec`s on the same jitted function.

```python
from jax.sharding import Mesh, NamedSharding, PartitionSpec as P
import numpy as np, jax

mesh = jax.make_mesh((8, 4), ('data', 'model'))   # 32 devices as 8x4 grid
repl  = NamedSharding(mesh, P())                   # replicated
batch_sh = NamedSharding(mesh, P('data', None))    # rows split over 'data'
w_tp     = NamedSharding(mesh, P(None, 'model'))   # cols split over 'model'

x = jax.device_put(x, batch_sh)
```

- **Mesh**: the physical devices arranged as a named logical grid. Axis names
  (`'data'`, `'model'`, `'fsdp'`, ...) are your vocabulary for everything else.
- **PartitionSpec**: per array dimension, which mesh axis shards it (`None` =
  replicated along that dim). `P('data', None)` on a `[B, D]` batch = classic DP split.
- **NamedSharding** = Mesh + PartitionSpec; attached to arrays via `device_put`, to
  functions via `jit(f, in_shardings=..., out_shardings=...)`, and inside functions via
  `jax.lax.with_sharding_constraint(x, sharding)` (the tool for steering GSPMD on
  intermediates, heavily used in MaxText).
- `jax.debug.visualize_array_sharding(x)` prints the layout; use it constantly while
  learning.

Inside `jit`, computation follows data: if inputs are sharded, XLA runs SPMD across all
devices and inserts collectives where specs conflict. Often you only annotate inputs and
a few constraints and let the compiler propagate the rest.

## The three parallelism styles as specs

For a transformer with params `W: [D, F]`, batch `x: [B, S, D]`, mesh axes
`('data', 'model')`:

| Strategy | Batch spec | Param spec | What XLA inserts | PyTorch analogue |
|---|---|---|---|---|
| Data parallel | `P('data', None, None)` | `P(None, None)` (replicated) | all-reduce on grads | DDP |
| FSDP / ZeRO-3 style | `P('data', None, None)` | `P('data', None)` (params sharded over the *data* axis) | all-gather params before use, reduce-scatter grads | FSDP2 |
| Tensor parallel | `P('data', None, None)` | `P(None, 'model')` then `P('model', None)` on the down-proj | all-reduce on activations per block | Megatron TP |

Mapping to your FSDP experience: FSDP's "shard params, all-gather just-in-time,
reduce-scatter grads" is exactly what GSPMD derives when params are sharded along the
data axis; there is no wrapper class, no `FullyShardedDataParallel(module)`, no wrapping
policy. Optimiser state inherits the param sharding automatically because it is a pytree
with the same structure (ZeRO-1 falls out for free). Mixed strategies = 3D+ meshes
(`('data', 'fsdp', 'model')`) with specs like `P(('data', 'fsdp'), None, None)` for the
batch. Pipeline parallelism exists (via shard_map stages) but on TPUs' fast ICI it is
usually the last resort, not the first (see scaling book ch. 5).

## shard_map: manual SPMD when you want control

`jax.shard_map` (out of experimental since JAX 0.8) is the per-device escape hatch: the
function body sees the **local shard**, and you write collectives explicitly, like a
CUDA-rank-view program:

```python
from jax.shard_map import shard_map   # jax.experimental.shard_map in older code

@partial(shard_map, mesh=mesh, in_specs=P('data'), out_specs=P('data'))
def step(local_batch):                       # shape [B/8, ...] here
    g = local_grads(local_batch)
    g = jax.lax.pmean(g, axis_name='data')   # explicit all-reduce
    return g
```

Collectives: `psum`, `pmean`, `all_gather`, `psum_scatter`, `ppermute` (ring
communication, used for hand-rolled overlap tricks and pipelining). Use GSPMD-style jit
by default; reach for shard_map when the compiler schedules communication badly, for
custom collective patterns, or wrapping Pallas kernels. This replaces `pmap`: pmap only
handled one device axis per host cleanly and is now in maintenance mode, implemented on
top of jit + shard_map anyway. Recognise `xmap` and `pjit` in old code: both are dead
(`pjit` merged into plain `jit`).

There is also a newer "explicit sharding" mode (sharding-in-types: shardings appear in
`jax.typeof(x)` and are checked at trace time) sitting between auto GSPMD and shard_map;
know it exists when reading fresh code.

## Multi-host basics

A TPU pod slice = N hosts, each with (usually) 4 local chips. JAX runs the same
script on every host (launched by `gcloud ... tpu-vm ssh --worker=all`, GKE, or Ray):

- `jax.distributed.initialize()` first (auto-configured on Cloud TPU).
- `jax.devices()` = all chips in the slice (global); `jax.local_devices()` = this
  host's. `jax.process_index()` is the rank analogue.
- The Mesh spans all global devices; a jitted function on globally-sharded arrays runs
  one logical program over the whole slice. Collectives ride the inter-chip ICI without
  touching host networking.
- Each host feeds only its local shard of the batch:
  `jax.make_array_from_process_local_data(sharding, local_np_batch)` assembles the
  global array; grain handles the per-host split for you.
- Checkpointing: orbax saves/restores per-host shards directly (see
  [flax-and-optax.md](flax-and-optax.md)).

Contrast with torchrun: no `init_process_group`, no explicit rank-conditional code
except around I/O (log/save on `process_index() == 0`).

## Practical path for the LM port

1. Single host, 8 devices: add a `('data',)` mesh, `device_put` the batch with
   `P('data')`, keep params replicated; loss curve must not change.
2. Switch params/opt-state to `P('data', ...)` on the largest matrices: FSDP-style, watch
   HBM drop via `jax.profiler` memory view.
3. Add a `'model'` axis and TP-shard the MLP as an exercise; compare step time.
4. Read MaxText's `logical_axis_rules`: named logical axes (`'embed'`, `'mlp'`,
   `'heads'`) mapped to mesh axes in config, which is how real codebases keep specs out
   of model code.

Cross-links: concept-level DP/TP/PP/ZeRO taxonomy in
[../llm-training-and-post-training/distributed-training.md](../llm-training-and-post-training/distributed-training.md);
interconnect hardware in [../hardware/tpus.md](../hardware/tpus.md); TPU specifics next
in [tpu-architecture-and-pallas.md](tpu-architecture-and-pallas.md).
