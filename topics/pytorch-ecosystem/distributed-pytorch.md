# Distributed PyTorch: DDP, FSDP2, DTensor, and friends

⏱ 9 min read · +4h 5m resources

Last verified: 2026-08-24 (PyTorch 2.13; FSDP1 deprecated since 2.11).

### Best resources

- [FSDP2 tutorial](https://docs.pytorch.org/tutorials/intermediate/FSDP_tutorial.html) (30 min): the official getting-started, now FSDP2-first and marks FSDP1 deprecated.
- [fully_shard API docs](https://docs.pytorch.org/docs/stable/distributed.fsdp.fully_shard.html) (25 min): the authoritative FSDP2 reference, including the FSDP1 vs FSDP2 design comparison.
- [torchtitan repo + technical report (arXiv 2410.06511)](https://github.com/pytorch/torchtitan) (repo, ~1h for the entry path; the report 45 min): the reference composition of FSDP2 + TP + PP + CP + compile; read `docs/composability.md`.
- [DDP paper (VLDB 2020, arXiv 2006.15704)](https://arxiv.org/abs/2006.15704) (45 min): still the best description of bucket/overlap internals.
- [DTensor docs](https://docs.pytorch.org/docs/stable/distributed.tensor.html) (25 min) and [Device Mesh recipe](https://docs.pytorch.org/tutorials/recipes/distributed_device_mesh.html) (15 min).

### DDP internals

`DistributedDataParallel` replicates the model per rank and all-reduces gradients.

- **Buckets**: at construction, parameters are grouped into buckets (default
  `bucket_cap_mb=25`) in reverse registration order (approximating backward execution

  order). A `Reducer` registers an autograd hook per parameter; when every grad in a

  bucket is ready, an async NCCL all-reduce launches for that bucket, overlapping

  communication with the rest of backward. First iteration also rebuilds buckets in

  the true grad-ready order.

- Readiness bookkeeping is why unused parameters hang DDP: the bucket never fills. Fix
  with `find_unused_parameters=True` (costly: extra graph traversal + sentinel

  autograd pass) or restructure the model.

- `static_graph=True`: promises the autograd graph is identical every iteration, enabling
  unused-param handling without the per-step search and allowing hook reordering.

- `no_sync()` context: skip all-reduce for gradient accumulation micro-steps; only the
  last micro-step communicates.

- Comm hooks (`register_comm_hook`) customize the reduction: fp16/bf16 compression,
  PowerSGD, or fusing into compiled autograd. Gradient division by world size happens in

  the hook path (pre-divide vs post-divide depending on dtype to avoid overflow).

- With torch.compile, **DDPOptimizer** splits the Dynamo graph at bucket boundaries so
  compiled backward still overlaps comm.

### FSDP1 vs FSDP2

FSDP1 (`FullyShardedDataParallel` wrapper class) is deprecated since 2.11. FSDP2 is the

`fully_shard` API; not backward compatible. Differences that matter:

|  | FSDP1 | FSDP2 |
| --- | --- | --- |
| Sharding unit | `FlatParameter`: flatten + concat a wrapped module's params, chunk the flat buffer | **Per-parameter**: each param chunked on dim 0 (`torch.chunk(dim=0)`) |
| Representation | Flat buffer, params are views | Each param is a **DTensor** sharded over the mesh |
| API | Wrapper module, auto-wrap policies | In-place: `fully_shard(module)` per block, module class unchanged |
| Frozen params | Whole flat group must share requires_grad | Mixed frozen/trainable fine (LoRA-friendly) |
| State dict | All-gather needed for full SD | **Sharded state dicts are communication-free** (DTensor knows its placement); DCP-native |
| Mixed dtype per param | No | Yes (`MixedPrecisionPolicy` per fully_shard call) |
| Memory | `recordStream` issues, less deterministic | Deterministic freeing, ~equal or lower peak, ~same or better throughput |

Mechanics are the same ZeRO-3 idea: params live sharded; at layer forward, all-gather

the block's params, run, free; in backward, all-gather again, compute grads,

reduce-scatter grads to shards. Prefetching (`set_modules_to_forward_prefetch`, implicit

backward prefetch) overlaps the all-gathers. Apply `fully_shard` bottom-up per

transformer block, then once on the root; the root holds params of anything not covered.

Optimizer states are built on the sharded DTensor params, so any `torch.optim` optimizer

works unchanged (this replaces FSDP1's special-cased optim state dict handling).

### DeviceMesh, HSDP, DTensor

- **DeviceMesh**: an n-D array of ranks with named dims, e.g.
  `init_device_mesh("cuda", (8, 8), mesh_dim_names=("dp", "tp"))`. Slicing

  (`mesh["dp"]`) yields sub-meshes/process groups; all parallelism APIs take a mesh

  instead of raw process groups.

- **HSDP** (hybrid sharding): 2-D mesh `("replicate", "shard")`; FSDP-shard within a node
  (or replica group), DDP-replicate across them. Grad reduction is reduce-scatter within

  the shard dim + all-reduce across the replicate dim. Cuts cross-node all-gather traffic

  and gives fault-domain isolation; `fully_shard(model, mesh=mesh_2d)`.

- **DTensor**: a tensor plus a mesh plus per-dim **placements**: `Shard(d)`,
  `Replicate()`, `Partial()` (pending reduction). The sharding propagator computes

  output placements per op and inserts redistributions (all-gather, reduce-scatter,

  all-to-all) as needed. DTensor is the substrate under FSDP2, TP, and distributed

  checkpointing, which is what makes them composable. 2.11 added differentiable

  collectives, so autograd flows through explicit redistributions.

### Tensor / sequence / context / pipeline parallelism

- **TP**: `parallelize_module(model, tp_mesh, {"attn.wq": ColwiseParallel(), ...})`
  annotates modules with parallel styles; DTensor handles the collectives. Megatron-style

  pairing: colwise then rowwise so the all-reduce happens once per block.

- **Sequence parallel**: shards LayerNorm/dropout activations along sequence dim between
  TP regions (`SequenceParallel()` style), swapping all-reduce for all-gather +

  reduce-scatter of activations.

- **Context parallel**: shards the sequence dim inside attention itself (ring-style),
  for long context; torchtitan exposes it as `context_parallel_degree`.

- **Pipeline**: `torch.distributed.pipelining`: split via `pipeline()` on an exported
  graph or manual `PipelineStage`s, then a schedule (`ScheduleGPipe`, `Schedule1F1B`,

  `ScheduleInterleaved1F1B`, ZBV zero-bubble variants) drives microbatches.

- **torchtitan** is the working reference for composing all of the above n-D (mesh dims
  `pp` x `dp_replicate` x `dp_shard` x `cp` x `tp`) plus torch.compile, float8, and

  distributed checkpointing (DCP with asynchronous saves).

### torchrun and elasticity

`torchrun --nproc-per-node 8 --nnodes 4 --rdzv-backend c10d --rdzv-endpoint host:29400

[train.py](http://train.py/)`: spawns one process per GPU, sets `RANK/LOCAL_RANK/WORLD_SIZE/MASTER_*`,

handles rendezvous. Elastic mode (`--nnodes 2:4 --max-restarts 3`) re-rendezvouses the

survivors after failures; your script must checkpoint/resume since restarts re-exec from

scratch. Store-based barrier and c10d TCPStore back the rendezvous. For larger fleets,

`torchft` adds per-step fault tolerance (replica groups that survive rank loss without

full restart) and Monarch (meta-pytorch) explores single-controller cluster programming.

### NCCL essentials and debugging

- One process per GPU, one communicator per process group; collectives must be called in
  identical order on all ranks (mismatch = deadlock).

- **Timeouts**: watchdog aborts after `timeout` (default 10 min) on a stuck collective.
  Typical causes: rank divergence (uneven data exhausting one rank's loader, conditional

  collectives), OOM on one rank, network. `TORCH_NCCL_ASYNC_ERROR_HANDLING=1` (default)

  turns hangs into aborts.

- First-line diagnostics: `NCCL_DEBUG=INFO` (ring/tree/transport selection, versions),
  `NCCL_DEBUG_SUBSYS=INIT,NET` to narrow, `TORCH_DISTRIBUTED_DEBUG=DETAIL` (wraps

  collectives with shape/order checking).

- **Flight recorder**: `TORCH_NCCL_TRACE_BUFFER_SIZE=2000` records recent collectives per
  rank; on watchdog timeout it dumps (`TORCH_NCCL_DUMP_ON_TIMEOUT=1`), and the analyzer

  script pinpoints which rank fell behind and on which collective. This is the modern way

  to debug multi-node hangs.

- Perf knobs worth knowing: `NCCL_IB_HCA`/`NCCL_SOCKET_IFNAME` (pick the right NICs),
  `NCCL_NVLS_ENABLE` (NVLink SHARP), `NCCL_P2P_DISABLE=1` only for debugging,

  `NCCL_ALGO=Tree|Ring` when auto-selection misfires. Symmetric memory (2.9+) exposes

  NVLink-domain windows for custom fused comm kernels; vLLM and TEP kernels beat NCCL at

  small messages with it.

Cross-refs: ZeRO and parallelism theory in [Distributed Training](../llm-training-and-post-training/distributed-training.md); compile interactions in [torch.compile: Dynamo, AOTAutograd, Inductor](torch-compile.md); framework-level wrappers (accelerate, Axolotl) in [The layer above core: HF stack and training frameworks](hf-and-training-frameworks.md).
