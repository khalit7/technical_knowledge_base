# Coverage of the old page "Distributed PyTorch: DDP, FSDP2, DTensor, and friends"

Old text: `../../src/read/old/distributed_pytorch.md` (fetched 2026-09-22 by the parent page's Reading agent). Treated as unverified notes; each claim is verified (with the run or source that verifies it), corrected, unconfirmed, or moved. R = Reading section of this page; P = the parent page (its coverage.md already settled some).

| Old claim | Status | Where now |
|---|---|---|
| "Last verified 2026-09-22 (PyTorch 2.13; FSDP1 deprecated since 2.11)" | **corrected**: FSDP1 runs at 2.14.1 and printed no deprecation warning here (`fsdpm_fsdp1.json`); no formal deprecation notice in the 2.14 docs (parent, Ecosystem map) | R4 table |
| Resources: FSDP2 tutorial, fully_shard docs, torchtitan + report, DDP paper, DTensor docs, DeviceMesh recipe | carried, links checked 2026-10-13 (HTTP 200) | Further reading |
| FSDP2 tutorial "marks FSDP1 deprecated" | not repeated (the tutorial's wording was not re-read); the status is stated from runs and the parent's docs check | Further reading |
| DDP buckets: `bucket_cap_mb=25`, reverse registration order, rebuilt in first iteration | verified with the parent's correction (first iteration is one bucket; 25 MiB and a 1 MiB first bucket from step 1); here: with `find_unused_parameters=True` the caps apply from step 0 (`unused.json`) | R3, P lab |
| Reducer registers a hook per parameter; when a bucket is ready an async all-reduce launches | verified (recorded issue order in the lab; reducer description) | R3 |
| Unused parameters hang DDP: the bucket never fills | verified, sharpened: the run did not hang but failed at step 1 with "Expected to have finished reduction in the prior iteration", and step 0 issued no collective at all | R3 table |
| `find_unused_parameters=True` costly: extra graph traversal + sentinel pass | verified in part: a 216-byte used-parameter bitmap all-reduce per step recorded; the traversal is from the docs/old text, cost not timed here | R3 |
| `static_graph=True` handles unused params without per-step search, allows hook reordering | verified in behaviour (bitmap only in step 0, rebuild after step 1); "hook reordering" not checked, dropped | R3 |
| `no_sync()` skips all-reduce for accumulation micro-steps | verified: 4 collectives instead of 10, gradients equal to 6e-8 | R3 |
| Comm hooks: fp16/bf16 compression, PowerSGD, fusing into compiled autograd | fp16 and PowerSGD measured; **bf16 refused on gloo** (CUDA/NCCL only, error recorded); "fusing into compiled autograd" unconfirmed, dropped | R3, hook tab |
| Division by world size in the hook path (pre-divide vs post-divide by dtype to avoid overflow) | partly verified: `allreduce_hook` and `fp16_compress_hook` divide before the all-reduce (default_hooks.py L26, L71); the "depending on dtype" part not found, dropped | R3 |
| With torch.compile, DDPOptimizer splits graphs at bucket boundaries | verified by the torch_compile child (2/4/13 graphs); linked | R3 |
| FSDP1 vs FSDP2 table: FlatParameter vs per-parameter DTensor | verified (FlatParameter shapes 13,952 and 394,880 per rank; DTensor Shard(0) per parameter) | R4 table |
| Wrapper vs in-place API | verified (class becomes FSDPGPT / FSDPBlock) | R4 |
| Frozen params: FSDP1 needs uniform requires_grad; FSDP2 fine | verified for FSDP1 with use_orig_params=False (ValueError recorded) and FSDP2 (accepted) | R4 table |
| State dict: FSDP1 needs all-gather; FSDP2 sharded state dicts communication-free, DCP-native | FSDP2 part verified (0 collectives; full state dict 53 all-gathers); FSDP1 part restated as "needs state-dict configuration" (not run) | R4 |
| Mixed dtype per param via MixedPrecisionPolicy per fully_shard call | verified as policy behaviour (bf16 gathers, fp32 reductions recorded); per-call mixing not separately run | R4 |
| Memory: FSDP1 recordStream issues; FSDP2 deterministic freeing, equal or lower peak, same or better throughput | unconfirmed (GPU-only claims), dropped | none |
| fully_shard bottom-up per block then root; prefetching (`set_modules_to_forward_prefetch`, implicit backward prefetch) | verified (parent lab) and explicit prefetch run here (issue order recorded) | R4 |
| Optimizer states built on sharded DTensor params; any torch.optim works | verified (AdamW on DTensors in every FSDP run; state bytes per rank recorded) | R4, mesh tab |
| DeviceMesh: n-D array, named dims, slicing gives sub-meshes, APIs take a mesh | verified (2x2 and 2x2x2 meshes, groups recorded) | R1, mesh tab |
| HSDP: 2-D mesh (replicate, shard); reduce-scatter in shard dim + all-reduce in replicate dim; cuts cross-node all-gather traffic | verified (19 collectives by group recorded); "fault-domain isolation" not checked, dropped | R4, mesh tab |
| DTensor placements; sharding propagator inserts redistributions (all-gather, reduce-scatter, all-to-all) | verified for 28 op cases; at 2.14.1 the all-to-all case is an all-gather + local chunk (parent lab) | R5 |
| 2.11 added differentiable collectives | unconfirmed (not checked against release notes); dropped | none |
| TP: parallelize_module + Colwise/Rowwise; one all-reduce per block | **corrected**: one all-reduce per attention and one per MLP in forward (2 per block), plus the same in backward; with three separate Colwise on q, k, v the backward has 3 per attention (24 vs 16 measured) | R6 |
| Sequence parallel: LayerNorm/dropout sharded on sequence, all-reduce swapped for all-gather + reduce-scatter | verified (18 AG + 16 RS recorded) | R6 |
| Context parallel: ring-style, torchtitan `context_parallel_degree` | ring verified at the attention level with the CPU kernel; the public API fails on CPU; torchtitan option name not re-checked, described as "CP" | R7 |
| Pipeline: `pipeline()` on an exported graph or manual stages; GPipe, 1F1B, Interleaved1F1B, ZBV | manual stages used; all seven schedules at 2.14.1 run (adds LoopedBFS, InterleavedZeroBubble, DualPipeV); tracer-based `pipeline()` not run | R8, pipe tab |
| torchtitan composes FSDP2+TP+PP+CP+compile+float8+DCP async; mesh pp x dp_replicate x dp_shard x cp x tp | verified from torchtitan 0.3.0 source (mesh order, application order, async DCP group); float8 not checked here (making_training_fast child) | R10 |
| torchrun flags, `--rdzv-backend c10d`, elastic `--nnodes 2:4 --max-restarts 3`, restarts re-exec from scratch, script must checkpoint | restart behaviour verified (`elastic.json`); multi-node flags not run (one machine) | R1 |
| TCPStore and store-based barrier back the rendezvous | verified (store chain PrefixStore, PrefixStore, TCPStore) | R1 |
| torchft per-step fault tolerance; Monarch | status on the parent's Ecosystem map; linked | R1 |
| One process per GPU, one communicator per group; identical order of collectives or deadlock | verified on gloo four ways (parent lab, PowerSGD, async_save, from_local) | R11 |
| Default timeout 10 min; causes (divergence, uneven loaders, OOM, network) | timeouts verified by the parent; uneven inputs reproduced and fixed with Join here | R3, R11 |
| `TORCH_NCCL_ASYNC_ERROR_HANDLING=1` default turns hangs into aborts | verified that torchrun sets it to 1 (recorded env); NCCL behaviour not run | R11 |
| `NCCL_DEBUG=INFO`, `NCCL_DEBUG_SUBSYS`, `TORCH_DISTRIBUTED_DEBUG=DETAIL` | DETAIL measured by the parent; NCCL variables by link to NVIDIA docs (not run, no NCCL) | R11 |
| Flight recorder `TORCH_NCCL_TRACE_BUFFER_SIZE`, dump on timeout, analyser pinpoints the rank | **corrected** by the parent (TORCH_FR_BUFFER_SIZE at 2.14.1); analyser run here: crashes on gloo dumps, works once the group table is filled | R11 |
| NCCL perf knobs (`NCCL_IB_HCA`, `NCCL_SOCKET_IFNAME`, `NCCL_NVLS_ENABLE`, `NCCL_P2P_DISABLE`, `NCCL_ALGO`); symmetric memory 2.9+ | moved by link to Streams, CUDA graphs and multi-GPU and NVIDIA's env var docs; not repeated | R11 links |
| Cross-refs to parallelism theory, compile page, framework wrappers | carried | throughout, Further reading |
