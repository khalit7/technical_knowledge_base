# Coverage of the old Notion pages (Topic: jax-and-tpu root and its four old children)

The old pages are saved verbatim in `old/` (fetched read-only 2026-10-15). Khalid: "don't trust the current content", so every claim was checked. Verdicts: **verified** (true as of 2026-10-15, with source), **corrected** (wrong or stale; the correction is on the page), **moved** (true, but belongs to a child page or another topic: carried there, linked from the root), **dropped** (with why). "Where" names the Reading section (R0 to R12, see `README.md`) or another owner.

Sources checked live on 2026-10-15 unless dated otherwise: JAX changelog (docs.jax.dev/en/latest/changelog.html), PyPI JSON for every package, Flax docs landing page, Haiku/Tunix/levanter/MaxText READMEs on GitHub main, the Gemini 1 report (arXiv 2312.11805 §3), Apple's AFM report (arXiv 2407.21075 §3.3), the Grok-1 README, the Hardware topic's TPU page (verified specs, dated there).

## Root page

| # | Old claim | Verdict | Source and correction | Where |
|---|---|---|---|---|
| 1 | Video: "narrated 7-minute explainer" | kept as is | Leave on the Notion page; Khalid decides (it describes the old text). | not in HTML |
| 2 | "6 min read + 9h 15m resources" | replaced | New reading time measured on the new tab. | R0 |
| 3 | JAX = functional array programming compiled through XLA; NN libraries on top; TPU hardware it targets | verified | docs.jax.dev | R1 |
| 4 | Framed as a PyTorch-to-JAX translation track; goal: port a small PyTorch LM to Flax NNX and train on TPU | verified as framing; goal kept | The running example is exactly this port (on CPU). Training on a real TPU is described, not done here (no TPU access on this machine). | R0, R11 |
| 5 | Taxonomy: JAX core (jit, grad, vmap, shard_map; pmap = legacy wrapper) | verified, sharpened | JAX 0.8.0 (2025-10-15): pmap reimplemented over jit + shard_map, "in maintenance mode"; 0.10.0 (2026-04-16) removed the old C++ pmap entirely. | R2, R5 |
| 6 | XLA compiler with GSPMD auto-sharding | verified, updated | GSPMD paper (arXiv 2105.04663); since JAX 0.7.0 propagation is done by Shardy by default (changelog; Shardy migration guide: it "will be the only partitioner in JAX") | R3, R5 |
| 7 | Pallas kernels, Mosaic TPU backend | verified | Pallas docs | R6 |
| 8 | TPU v5e / v5p / v6e Trillium / v7 Ironwood | verified (names) | Hardware topic TPU page; Cloud names v5e, v5p, v6e, TPU7x | R6 |
| 9 | Flax NNX (recommended) | verified with wording | Flax docs: "new users are encouraged to use Flax NNX"; "Flax NNX is an evolution of the previous Flax Linen API". | R4 |
| 10 | Flax Linen (maintained) | verified with wording | Flax docs: Linen "is not going to be deprecated in the near future as most of Flax users still rely on this API". MaxText migrated from Linen to NNX (README news 2026-06-29). | R4 |
| 11 | Equinox | verified | equinox 0.13.8 (2026-05-05, PyPI) | R4 |
| 12 | Haiku legacy, DeepMind moved to Flax | corrected wording | Haiku README: "As of July 2023 Google DeepMind recommends that new projects adopt Flax instead of Haiku"; maintenance mode (bug fixes and JAX compatibility, no new features); still released (dm-haiku 0.0.17, 2026-07-27). "Legacy" is fair; "moved" overstates (DeepMind still uses it internally per the README). | R4 |
| 13 | optax: optimisers as gradient transformations; clipping, EMA, accumulation, masks, Lion, Muon as links in a chain | verified (Muon: in optax.contrib; checked by Training lab) | optax 0.2.8 (2026-03-20). TODO-T: confirm `optax.contrib.muon` exists at the pinned version. | R4 |
| 14 | orbax: async distributed checkpointing; makes checkpointing a pod slice practical | verified | orbax docs; orbax-checkpoint 0.12.7 (2026-10-06) | R4 |
| 15 | grain: deterministic checkpointable data loading; preempted run resumes mid-epoch | verified | grain docs; grain 0.2.18 (2026-06-17); resume shown by the Training lab | R4 |
| 16 | GSPMD acronym, inserts collectives where two annotations disagree; Mesh + NamedSharding; DP/FSDP/TP are just PartitionSpecs; shard_map escape hatch | verified | GSPMD paper; JAX sharded-computation tutorial; Sharding lab compiles each | R5 |
| 17 | MXU systolic array 128x128, or 256x256 on some generations | verified | 256x256 on v6e (scaling book; Hardware TPU page notes the v6e clock does not reconcile) | R6 |
| 18 | HBM staged through software-managed VMEM | verified | scaling book ch. 2 | R6 |
| 19 | ICI: each chip wired to neighbours in a 2D or 3D torus, no switches in the path; ring collectives cheap, distant point-to-point multi-hop | verified, one nuance | v4 and later 3D pods add optical circuit switches between 4x4x4 cubes (TPU v4 paper), so "no switches" holds for the electrical links inside a cube, not the whole pod. Linked to the Hardware page. | R6 |
| 20 | A pod = hundreds to thousands of chips one job treats as a single machine | verified | v5p 8,960; Ironwood 9,216 (Hardware TPU page) | R6 |
| 21 | Pallas = Triton analogue for TPU and GPU, lowering through Mosaic | verified, completed | On GPU Pallas lowers through Triton or Mosaic GPU (Pallas docs) | R6 |
| 22 | MaxText: Google's pure-JAX LLM pretraining stack; the reference for good sharded JAX | verified | MaxText README: "a high performance, highly scalable, open-source LLM library and reference implementation", pure Python/JAX, TPUs and GPUs; now also post-training via Tunix (README news 2025-10-10) | R7 |
| 23 | Tunix: post-training (SFT, preference tuning, distillation, RL trainers PPO, GRPO, GSPO) | verified, list updated | Tunix README (2026-10-15): SFT (full and PEFT), DPO, ORPO; RL: PPO, GRPO, GSPO-Token, DAPO, Dr.GRPO; agentic multi-turn RL; a `tunix/distillation` package exists in the repo. Status "V2 Release", "under active development". | R7 |
| 24 | PPO, GRPO, GSPO definitions (actor-critic with clipped ratio; group-normalised rewards without a value network; sequence-level ratio stabilising long MoE generations) | moved | Owned by Topic: rl (RL for LLMs, 3c65c17b0d0d818c9bcff7177325fe56) and the Alignment page; the root names them and links. | R7 link |
| 25 | big_vision: ViT lineage in Linen; cleanest older functional style | verified, dated | big_vision last push 2025-05-19 (GitHub API, 2026-10-15): not archived, but quiet. | R7 |
| 26 | levanter: Stanford, built on Equinox, bitwise-reproducible training resuming identically after preemption | verified, updated | README: built "with JAX, Equinox, and Haliax"; "bitwise deterministic ... even in the face of preemption and resumption" (on TPU; changing host count breaks it); "Levanter has been merged into Marin" (November 2025); development in marin-community/marin `lib/levanter/`. | R7 |
| 27 | Learning path steps 1 to 6 (tutorials, NNX MLP then tiny transformer, port and match loss curves on CPU, shard with data then FSDP, real TPU via Colab, Kaggle, TRC; read MaxText decoder and Tunix GRPO trainer) | kept as the order of the page, steps 3 and 4 done here | The labs do steps 2 to 4 on CPU with 8 simulated devices; step 5 is described (Further reading). | R0, R11, Further reading |
| 28 | Deep-dives table (4 pages) | replaced | Eight children now; each section's Go deeper note and the child grid | R12 |
| 29 | How to Scale Your Model (~3h 30m for ch. 1-5 and 10; ~6h full; DeepMind 2025; still canonical) | verified | jax-ml.github.io/scaling-book (Austin et al., Google DeepMind, 2025) | Further reading |
| 30 | JAX docs tutorials (~2h), Flax NNX docs (~1h 30m), MaxText (~1h 30m), Tunix (~45 min) | verified links | | Further reading |
| 31 | Cross-links: TPU hardware page, Distributed Training, CUDA topic | verified ids | pages.json | Further reading, R5, R6 |

## JAX core child (old)

| # | Old claim | Verdict | Source and correction | Where |
|---|---|---|---|---|
| 32 | "Current as of JAX 0.11.2; minimum Python 3.11" | corrected | jax 0.11.2 (2026-09-17) requires Python >= 3.12: 0.11.0 (2026-07-16) dropped 3.11 (changelog; PyPI requires_python). | R2 |
| 33 | JAX = numpy + composable transformations; trace a pure function into a jaxpr then rewrite or compile with XLA | verified | Transforms lab shows real jaxprs | R2 |
| 34 | PyTorch is define-by-run; JAX traces once with abstract tracers (shape + dtype); torch.compile moved PyTorch toward this | verified | torch_compile child of Topic: pytorch-ecosystem | R2, R3 |
| 35 | Purity: no hidden param.grad / optimizer.state; state threaded explicitly | verified | | R2 |
| 36 | print inside jit prints tracers once at trace time; use jax.debug.print | verified, measured | Transforms lab | R2, Mistakes |
| 37 | Arrays immutable; x.at[0].set(1.0), .add, .multiply, .min, .max; under jit XLA makes these in place | verified (in place when the input buffer can be reused, e.g. donated or an intermediate) | Compiler lab: donation | R2 |
| 38 | Python side effects happen at trace time only: "it worked once then stopped updating" | verified, measured | Transforms lab | Mistakes |
| 39 | PRNG keys: jax.random.key(0), split, never reuse; nnx.Rngs | verified | | R2 |
| 40 | jit compiles one executable per (shape, dtype, static args); static_argnums; no data-dependent shapes; pad and mask | verified, measured | Transforms lab recompile counts | R2 |
| 41 | Python control flow on traced values raises TracerBoolConversionError; lax.cond, select/where, scan, while_loop (not reverse-differentiable), fori_loop | verified | JAX docs (control flow) | R2 |
| 42 | Recompilation is the silent perf killer; jax_log_compiles; bucket shapes | verified, measured | | R2, Mistakes |
| 43 | Async dispatch; block_until_ready; first call includes compile time | verified | | Mistakes |
| 44 | donate_argnums: otherwise two copies of the model | verified, measured by Compiler lab | | R3, Mistakes |
| 45 | grad is source-to-source, not tape-based | corrected wording | JAX differentiates by tracing the function into a jaxpr and transforming it (JVP then transposition), a trace-based transformation rather than a recorded tape of a run; "source-to-source" is loose (it does not read Python source). | R2 |
| 46 | value_and_grad, argnums, has_aux; grads mirror params; no zero_grad | verified | | R2 |
| 47 | stop_gradient = detach; jax.checkpoint (remat) | verified | | R2, R3 |
| 48 | vmap: in_axes/out_axes; per-example grads vmap(grad(f)); torch.vmap is a port of the idea | verified | torch.func docs credit JAX | R2 |
| 49 | Pytrees: tree.map, leaves, flatten; replaces parameters() and state_dict() | verified | | R2 |
| 50 | Footgun 8: out-of-bounds indexing clamps on read, drops on write under jit | verified | JAX "Sharp bits" | Mistakes |
| 51 | Footgun 9: default float32; on TPU default matmul precision uses bf16 passes; precision= / jax.default_matmul_precision | verified | JAX docs (default precision on TPU) | Mistakes |
| 52 | Footgun 10: weak typing promotion differs from NumPy | verified | JAX type promotion docs | moved to jax_core child |
| 53 | Resources (Thinking in JAX, tutorials, jit docs, Common gotchas, Autodidax, scaling book ch. 10) | verified links | | Further reading |

## Training stack child (old)

| # | Old claim | Verdict | Source | Where |
|---|---|---|---|---|
| 54 | NNX recommended; Linen maintained, not deprecated; interop via flax.nnx.bridge | verified | Flax docs | R4 |
| 55 | Library table (NNX, Linen, Equinox, Haiku: status, model, feel) | verified, statuses updated | as rows 9 to 12 | R4 table |
| 56 | NNX code block, nnx.Param, nnx.Variable, nnx.Rngs, split/merge, lifted transforms | verified by the Training lab against flax 0.12.10 | | R4 (short), training_stack child |
| 57 | nnx.Optimizer(model, tx, wrt=nnx.Param); optimizer.update(model, grads) | to be confirmed by the Training lab at the pinned flax | TODO-T | R4 |
| 58 | optax init/update pure pair; apply_updates; chain; schedules are functions; MultiSteps; masks; EMA, SAM, Lion, Muon | verified (Muon TODO-T) | optax docs | R4 |
| 59 | Train loop line by line vs PyTorch | moved | pytorch_to_jax child and Training lab's translation table | R4 link |
| 60 | No .train()/.eval() global mode; NNX model.eval() | verified | Flax NNX docs | moved to training_stack child |
| 61 | Metrics pulled to host every step force a sync | verified | | Mistakes |
| 62 | orbax StandardCheckpointer, eval_shape restore, CheckpointManager; per-host shard saving | verified | orbax docs | R4 (short) |
| 63 | grain MapDataset.source().shuffle(seed).map().batch() | verified | grain docs | R4 |
| 64 | Resources (NNX basics, transforms guide, Linen-to-NNX, optax, orbax, JAX AI stack) | verified links | | Further reading |

## Sharding child (old)

| # | Old claim | Verdict | Source | Where |
|---|---|---|---|---|
| 65 | "pmap is legacy (since JAX 0.8-0.10 it is a wrapper over jit + shard_map)" | verified, dated | 0.8.0 (2025-10-15) default switched; 0.10.0 (2026-04-16) old implementation removed | R5 |
| 66 | jax.experimental.shard moved to jax.sharding | verified | 0.7.0 (2025-07-22) | moved to sharding child |
| 67 | Sharding is a type annotation, parallelism is compilation | verified | | R5 |
| 68 | make_mesh, NamedSharding, PartitionSpec, device_put, with_sharding_constraint, visualize_array_sharding | verified | Sharding lab | R5 |
| 69 | DP/FSDP/TP table with what XLA inserts | verified by compiling (Sharding lab) | | R5 |
| 70 | Optimiser state inherits the param sharding; ZeRO-1 "falls out for free" | corrected nuance | Under jit with sharded params, optax state created inside jit follows propagation; it is not automatic if created outside jit on one device. TODO-S: Sharding lab to confirm. | R5 |
| 71 | Pipeline parallelism is the last resort on TPU | verified as the scaling book's position | scaling book ch. 5 | R5 |
| 72 | `from jax.shard_map import shard_map` | corrected | The public API is `jax.shard_map` (0.8.0 deprecated `jax.experimental.shard_map.shard_map`). | R5 |
| 73 | shard_map out of experimental since JAX 0.8 | verified | changelog 0.8.0 | R5 |
| 74 | psum, pmean, all_gather, psum_scatter, ppermute | verified | | R5 |
| 75 | xmap and pjit dead; pjit merged into jit | verified | 0.8.0 deprecated `jax.experimental.pjit.pjit` in favour of `jax.jit`; xmap deprecated in 0.4.26 (2024-04-03) and deleted in 0.4.31 (2024-07-29): "xmap has been deleted. Please use shard_map() as the replacement." | R5 |
| 76 | Explicit sharding mode (sharding in types, jax.typeof) | verified exists | 0.11.2 removed shard_alike "Use explicit sharding mode instead"; `jax.set_mesh` since 0.7.1; `with mesh:` deprecated in 0.10.1 | R5 |
| 77 | Multi-host: jax.distributed.initialize, process_index, make_array_from_process_local_data; collectives over ICI | verified | not run here (one machine) | R5 |
| 78 | A TPU pod slice = N hosts, each usually 4 chips | verified | Cloud TPU docs; Hardware page | R6 |
| 79 | MaxText logical_axis_rules | verified | MaxText configs | R7 |

## TPU and Pallas child (old)

| # | Old claim | Verdict | Source | Where |
|---|---|---|---|---|
| 80 | 1 to 2 TensorCores per chip vs ~100+ SMs | verified | Hardware TPU page | R6 |
| 81 | MXU 128x128 systolic; pad to multiples of 128; (8, 128) tiles | verified | scaling book | R6 |
| 82 | VMEM "tens of MB (128 MB on newer chips)" | TPU lab owns | TODO-P: per-generation VMEM from the TPU lab's FACTS | R6 |
| 83 | HBM v5e 16 GB, v5p 95 GB, v6e 32 GB, v7 192 GB | verified | Hardware TPU page (v5p 95 GiB, Ironwood 192 GiB) | R6 |
| 84 | Generations table: v4 2021 275 TF 32 GB 4096 chips; v5e 197 TF 16 GB 256; v5p 459 TF 95 GB 8960; v6e 4.7x v5e 32 GB 256; v7 GA Apr 2026, >4x v6e, 192 GB, FP8, 9216 | corrected two cells | v4 deployed 2020 (announced May 2021); v6e 918 TF bf16 (4.7x v5e matches 918/197 = 4.66); Ironwood "GA Apr 2026" unconfirmed: Google's 2025-11-06 post said GA "in the coming weeks" (Hardware TPU page). ">4x Trillium per chip" is Google's headline; bf16 peak is 2,307/918 = 2.5x, fp8 4,614/918 = 5.0x (Trillium has no fp8 speed-up), so the 4x is not a bf16 peak ratio. | R6 |
| 85 | Two tracks e and p; HBM per chip 6x with Ironwood | verified | 192/32 = 6 vs v6e | R6 |
| 86 | ICI 2D torus (v5e/v6e), 3D (v4/v5p/v7); OCS reconfigures around failures | verified | Hardware TPU page | R6 |
| 87 | Slice names count TensorCores on some gens (v5p-128 = 64 chips), chips on others | verified | Cloud TPU docs | moved to tpu child |
| 88 | Hosts own 4 chips (8 for some v5e configs) | verified | | moved to tpu child |
| 89 | Beyond a pod: data parallel over DCN, MaxText multislice | verified | | R5 |
| 90 | Pallas code, BlockSpec, grid, Mosaic, double buffering, (8,128), dimension_semantics, custom VJP needed | verified; code replaced by the TPU lab's run kernel | | R6 |
| 91 | "For most training work you never write one: XLA fusion + stock attention kernel competitive" | kept as opinion, labelled | | R6 |
| 92 | Colab: single v5e chip free/Pro | TPU lab owns | TODO-P | Further reading |
| 93 | Kaggle: free v5e-8, "roughly 20 h/month", ~9 h sessions | corrected (unconfirmed) | Kaggle does not publish the number on a readable page; third-party guides give 20 h per **week**, 9 h per session; the v5e-8 replacing v3-8 is third-party only. Marked unconfirmed. | Further reading |
| 94 | TRC ~30 days free, v2-8/v3-8 up to v4/v5e | TPU lab owns | TODO-P | Further reading |
| 95 | Practical loop: develop on CPU, smoke-test on Colab, train on Kaggle/TRC, profile with XProf | kept | | R11 |

## Added beyond the old pages (the old pages had none of these)
Who uses JAX (Gemini report §3: JAX and Pathways, TPUv4 and v5e; Apple AFM §3.3: AXLearn on JAX, 8,192 TPUv4 and 2,048 TPUv5p; Grok-1 released with JAX code); an honest JAX vs PyTorch comparison; the compiler pipeline; the running example; common mistakes with real errors; interview questions.
